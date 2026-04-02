import { Schema } from '../../../data/resource'
import { AutoCompleteAddressAPIResponse, AutoCompleteAddressResponse } from '../../../../src/types/backend-types'
import { GeoPlacesClient, AutocompleteCommand } from '@aws-sdk/client-geo-places'
import { env } from '$amplify/env/auto-complete-address'
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime'
import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/api'
import { DateTime } from 'luxon'
import { v4 } from 'uuid'

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)
Amplify.configure(resourceConfig, libraryOptions)

const dynamoClient = generateClient<Schema>()
const client = new GeoPlacesClient()

export const handler: Schema['AutoCompleteAddress']['functionHandler'] = async (event) => {
  console.log(event.request.headers['x-forwarded-for'])
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

  const similarAutoCompleteQueriesResponse = await dynamoClient.models.AutoCompleteAddressRequests.listAutoCompleteAddressRequestsByLocationInput({
    locationInput: event.arguments.locationLineOne
  }, {
    limit: 5
  })

  if(
    Math.min(...recentAutoCompleteQueriesResponse.data.map((data) => new Date(data.createdAt).getTime())) >= DateTime.now().minus({ minutes: 5 }).toMillis() &&
    recentAutoCompleteQueriesResponse.data.length >= 16
  ) {
    response.error = 'Maximum requests recieved'
    return response
  }
  if(similarAutoCompleteQueriesResponse.data.length > 0) {
    const autocompleteResponses = similarAutoCompleteQueriesResponse.data.reduce((prev, cur) => {
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

  //TODO: validation & previous queries responses & previous inputs return (limit 16 requests every 5 minutes)
  const request = new AutocompleteCommand({
    QueryText: event.arguments.locationLineOne,
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
    const suggestion = autocompleteResponse.ResultItems[0].Title
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