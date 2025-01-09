import { Schema } from "../../amplify/data/resource";
import { V6Client } from '@aws-amplify/api-graphql'
import { generateClient } from "aws-amplify/api";
import { remove } from "aws-amplify/storage";
import { Event, PhotoCollection, UserTag } from "../types";
import { queryOptions } from "@tanstack/react-query";

const client = generateClient<Schema>()

interface GetAllEventOptions {
    siCollections: boolean
}
async function getAllEvents(client: V6Client<Schema>, params?: GetAllEventOptions): Promise<Event[]> {
    console.log('api call')
    const returnedEvents = await client.models.Events.list()

    return (await Promise.all(returnedEvents.data.map(async (event) => {
        const mappedCollections: PhotoCollection[] = []
        if(!params || params.siCollections){
            const collectionResponse = await event.collections()
            mappedCollections.push(...await Promise.all(collectionResponse.data.map(async (collection) => {
                const collectionTagsResponse = await collection.tags()
                const mappedTags: UserTag[] = (await Promise.all(collectionTagsResponse.data.map(async (collectionTag) => {
                    const tagResponse = await collectionTag.tag()
                    if(!tagResponse.data || !tagResponse.data.id) return
                    const mappedTag: UserTag = {
                        ...tagResponse.data,
                        color: tagResponse.data.color ?? undefined,

                    }
                    return mappedTag
                }))).filter((tag) => tag !== undefined)

                const mappedCollection: PhotoCollection = {
                    ...collection,
                    paths: [],
                    tags: mappedTags,
                    watermarkPath: collection.watermarkPath ?? undefined,
                    downloadable: collection.downloadable ?? false,
                    coverPath: collection.coverPath ?? undefined,
                }

                return mappedCollection
            })))
        }

        const mappedEvent: Event = {
            ...event,
            collections: mappedCollections,
        }

        return mappedEvent
    }))).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

interface DeleteEventMutationOptions {
    logging: boolean
}
export async function deleteEventMutation(eventId: string, options?: DeleteEventMutationOptions) {
    console.log('api call')
    const collectionsResponse = await client.models.PhotoCollection.
        listPhotoCollectionByEventId({eventId: eventId})
    const deleteCollectionResponse = await Promise.all(collectionsResponse.data.map(async (collection) => {
        const paths = await collection.imagePaths()
        const deletePathsResponses = await Promise.all(paths.data.map(async (path) => {
            const s3response = await remove({
                path: path.path,
            })
            const dynamoResponse = await client.models.PhotoPaths.delete({
                id: path.id,
            })
            return [s3response, dynamoResponse]
        }))
        const response = await client.models.PhotoCollection.delete({
            id: collection.id,
        })
        return [deletePathsResponses, response]
    }))
    const response = await client.models.Events.delete({
        id: eventId
    })

    if(options?.logging) {
        console.log(response, deleteCollectionResponse)
    }

    let mappedEvent: Event | undefined

    if(response.data)
        mappedEvent = {
        ...response.data,
        collections: collectionsResponse.data.map((data) => {
            const mappedCollection: PhotoCollection = {
                ...data,
                //unnecessary
                paths: [],
                coverPath: undefined,
                watermarkPath: undefined,
                tags: [],
                downloadable: false,
            }
            return mappedCollection
        })
    }
    return mappedEvent
}

export async function updateEventMutation(event: Event) {
    const response = await client.models.Events.update({
        id: event.id,
        name: event.name,
    })
    if(response && response.data) return event
    return null
}

export interface CreateEventParams {
    name: string,
}
export async function createEventMutation(params: CreateEventParams) {
    const response = await client.models.Events.create({
        name: params.name,
    })
    if(response && response.data) {
        const returnedEvent: Event = {
            ...response.data,
            collections: [],
        }
        return returnedEvent
    }
    return null
}

export const getAllEventsQueryOptions = (options?: GetAllEventOptions) => queryOptions({
    queryKey: ['events', client, options],
    queryFn: () => getAllEvents(client, options),
})