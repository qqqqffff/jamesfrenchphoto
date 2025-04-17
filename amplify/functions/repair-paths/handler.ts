import { ListObjectsCommand, S3Client } from "@aws-sdk/client-s3";
import { Schema } from "../../data/resource";
import { env } from '$amplify/env/repair-paths'
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime'
import { Amplify } from 'aws-amplify'
import { generateClient} from 'aws-amplify/data'
import { PicturePath } from '../../../src/types'
import { getAllPaths } from '../../../src/services/photoPathService'

const client = new S3Client()
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)

Amplify.configure(resourceConfig, libraryOptions)

const dynamoClient = generateClient<Schema>()

export const handler: Schema['RepairPaths']['functionHandler'] = async (event) => {
  if(!event.arguments.collection || !event.arguments.set) return 'Collection and set are required'
  const bucket = process.env.BUCKET_NAME
  if(!bucket) return 'Bucket Name Missing'

  let objects = await client.send(new ListObjectsCommand({
    Bucket: bucket,
    Prefix: `photo-collections/${event.arguments.collection}/${event.arguments.set}`
  }))

  const contents = objects.Contents ?? []

  while(objects.NextMarker) {
    objects = await client.send(new ListObjectsCommand({
      Bucket: bucket,
      Prefix: `photo-collections/${event.arguments.collection}/${event.arguments.set}`,
      Marker: objects.NextMarker
    }))

    contents.push(...(objects.Contents ?? []))
  }

  if(contents.length === 0) return 'No items returned'

  const pictures: Map<string, string> = new Map()
  const existingPaths = await getAllPaths(dynamoClient, event.arguments.set)
  const existingPathsSet = new Set(existingPaths.map((path) => path.id))

  for(let i = 0; i < contents.length; i++) {
    const key = contents[i].Key
    if(!key) continue
    const pathId = key.substring(key.lastIndexOf('/') + 1, key.indexOf('_'))
    if(existingPathsSet.has(pathId)) continue

    pictures.set(
      pathId,
      key
    )
  }

  const mappedPaths = await Promise.all(Array.from(pictures.entries())
    .sort((a, b) => 
      a[1]
        .substring(a[1].indexOf('_') + 1)
        .localeCompare(
      b[1]
        .substring(b[1].indexOf('_') + 1)
    ))
    .map(async (entry, index) => {
      const response = await dynamoClient.models.PhotoPaths.create({
        id: entry[0],
        path: entry[1],
        order: index + existingPathsSet.size,
        setId: event.arguments.set,
      })

      const mappedPath: PicturePath = {
        id: entry[0],
        path: entry[1],
        order: index + existingPathsSet.size,
        setId: event.arguments.set,
        url: ''
      }

      return ({
        path: mappedPath,
        response: response
      })
    })
  )

  const returnPaths: PicturePath[] = [...existingPaths, ...mappedPaths.map((path) => path.path)]

  const setUpdateResponse = await dynamoClient.models.PhotoSet.update({
    id: event.arguments.set,
    items: returnPaths.length
  })

  return JSON.stringify({
    paths: returnPaths, 
    responses: {
      set: setUpdateResponse,
      paths: mappedPaths.map((path) => path.response)
    }
  })
}