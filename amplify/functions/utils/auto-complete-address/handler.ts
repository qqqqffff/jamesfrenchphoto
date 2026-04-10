import { Schema } from '../../../data/resource'
import { AutoCompleteAddressAPIResponse, AutoCompleteAddressResponse } from '../../../../src/types/backend-types'
import { GeoPlacesClient, AutocompleteCommand } from '@aws-sdk/client-geo-places'
import { env } from '$amplify/env/auto-complete-address'
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime'
import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/api'
import { DateTime } from 'luxon'
import { v4 } from 'uuid'
import https from 'node:https'

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)
Amplify.configure(resourceConfig, libraryOptions)

const dynamoClient = generateClient<Schema>()
const client = new GeoPlacesClient()

async function getLocationFromIP(ip?: string): Promise<{ long: number, lat: number } | null> {
  if(!ip || ip.startsWith('10.') || ip.startsWith('192.168.') || ip === '127.0.0.1') {
    return null
  }

  return new Promise(resolve => {
    https.get(`https://ip-api.com/json/${ip}?fields=lat,lon,status`, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          const parsedJson = JSON.parse(data)
          if(parsedJson.status === 'success') {
            resolve({ lat: parsedJson.lat, long: parsedJson.lon })
          }
          resolve(null)
        } catch {
          resolve(null)
        }
      })
    })
  })
}

// function haversineDistanceMiles(
//   lat1: number, lng1: number,
//   lat2: number, lng2: number
// ): number {
//   const R = 3958.8 // earth radius in miles
//   const dLat = ((lat2 - lat1) * Math.PI) / 180
//   const dLong = ((lng2 - lng1) * Math.PI) / 180

//   const a  =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos((lat1 * Math.PI) / 180) *
//     Math.cos((lat2 * Math.PI) / 180) *
//     Math.sin(dLong / 2) ** 2
  
//   return R * 2 * Math.asin(Math.sqrt(a))
// }

function getLatLongBoundingBox(lat: number, long: number, radius: number) {
  const milesPerDegreeLat = 69.0
  const milesPerDegreeLong = 69.0 * Math.cos((lat * Math.PI) / 180)

  const latDelta = radius / milesPerDegreeLat
  const longDelta = radius / milesPerDegreeLong

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLong: long + longDelta,
    maxLong: long + longDelta
  }
}

export const handler: Schema['AutoCompleteAddress']['functionHandler'] = async (event) => {
  const ip = event.request.headers['x-forwarded-for']?.split(',')[0]?.trim()
  const locationAPIResponse = await getLocationFromIP(ip)
  let response: AutoCompleteAddressAPIResponse = {
    status: 'Fail',
    error: 'Unexpected error'
  }
  if(!event.arguments.userEmail || !event.arguments.locationLineOne) {
    response.error = 'Missing user email or partial location'
    return response
  }

  const userProfileResponse = await dynamoClient.models.UserProfile.get({ email: event.arguments.userEmail.toLocaleLowerCase() })
  
  if(!userProfileResponse.data) {
    response.error = 'Invalid user email'
    return response
  }

  const recentAutoCompleteQueriesResponse = await dynamoClient.models.AutoCompleteAddressRequests.listAutoCompleteAddressRequestsByUserEmailAndCreatedAt({
    userEmail: event.arguments.userEmail.toLocaleLowerCase(),
  }, {
    limit: 16,
    sortDirection: 'DESC',
  })

  const boundingBox = locationAPIResponse ? getLatLongBoundingBox(locationAPIResponse.lat, locationAPIResponse.long, 50) : undefined
  let similarAutoCompleteQueriesResponse = await dynamoClient.models.AutoCompleteAddressRequests.listAutoCompleteAddressRequestsByLocationInput({
    locationInput: event.arguments.locationLineOne
  }, {
    filter: boundingBox ? {
      userLat: {
        between: [boundingBox.minLat, boundingBox.maxLat]
      },
      userLong: {
        between: [boundingBox.minLong, boundingBox.maxLong]
      }
    } : undefined
  })
  const similarAutoCompleteData = similarAutoCompleteQueriesResponse.data
  let requestCount = 1

  while(
    similarAutoCompleteQueriesResponse.nextToken && 
    similarAutoCompleteData.length < 5 && 
    requestCount < 10
  ) {
    similarAutoCompleteQueriesResponse = await dynamoClient.models.AutoCompleteAddressRequests.listAutoCompleteAddressRequestsByLocationInput({
      locationInput: event.arguments.locationLineOne
    }, {
      filter: boundingBox ? {
        userLat: {
          between: [boundingBox.minLat, boundingBox.maxLat]
        },
        userLong: {
          between: [boundingBox.minLong, boundingBox.maxLong]
        }
      } : undefined,
      nextToken: similarAutoCompleteQueriesResponse.nextToken
    })
    similarAutoCompleteData.push(...similarAutoCompleteQueriesResponse.data)
    requestCount++;
  }

  if(
    Math.min(...recentAutoCompleteQueriesResponse.data.map((data) => new Date(data.createdAt).getTime())) >= DateTime.now().minus({ minutes: 5 }).toMillis() &&
    recentAutoCompleteQueriesResponse.data.length >= 16
  ) {
    response.error = 'Maximum requests recieved'
    return response
  }
  if(similarAutoCompleteData.length > 0) {
    const autocompleteResponses = similarAutoCompleteData.reduce((prev, cur) => {
      try {
        const responses: AutoCompleteAddressResponse[] = JSON.parse(cur.result.toString())
        prev.push(...responses)
      } catch (error) {
        console.error(error)
      }
      return prev
    }, [] as AutoCompleteAddressResponse[])
    
    response = {
      status: 'Success',
      response: autocompleteResponses,
    }
    return response
  }

  const request = new AutocompleteCommand({
    QueryText: event.arguments.locationLineOne,
    BiasPosition: locationAPIResponse ? [locationAPIResponse.long, locationAPIResponse.lat] : undefined,
    Filter: {
      IncludeCountries: [
        "USA"
      ]
    }
  })
  
  const autocompleteResponse = await client.send(request)

  if(!autocompleteResponse.ResultItems || autocompleteResponse.ResultItems.length === 0) {
    response = { 
      status: 'Fail',
      error: 'Recieved invalid response or no results'
    }
    return response
  }

  const resultList: AutoCompleteAddressResponse[] = []
  
  for (let i = 0; i < autocompleteResponse.ResultItems.length; i++) {
    const suggestion = autocompleteResponse.ResultItems[i].Title
    if(!suggestion) continue
    //title returns the following parts in order: <country>, <state code (2digit)>, <zip>, <city>, <streetLineOne>
    //cleaned address parts
    const addressParts = suggestion.split(',').map((value, index) => index > 0 ? value.substring(1) : value)
    const result: AutoCompleteAddressResponse = {
      countryCode: addressParts?.[0],
      adminAreaOne: addressParts?.[1],
      postalCode: addressParts?.[2],
      adminAreaTwo: addressParts?.[3],
      addressLineOne: addressParts?.[4],
      fullText: suggestion
    }

    resultList.push(result)
  }

  //logging response
  const logResponse = await dynamoClient.models.AutoCompleteAddressRequests.create({
    id: v4(),
    locationInput: event.arguments.locationLineOne,
    userEmail: event.arguments.userEmail.toLocaleLowerCase(),
    result: resultList,
    userLat: locationAPIResponse?.lat,
    userLong: locationAPIResponse?.long,
    createdAt: new Date().toISOString()
  })

  if(!logResponse.data) {
    response.error = 'Failed to log auto complete response'
    return response
  }

  response = {
    status: 'Success',
    response: resultList,
  }

  return response
} 