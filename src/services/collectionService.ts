import { Event, PhotoCollection, PicturePath, UserTag, Watermark } from "../types";
import { Schema } from "../../amplify/data/resource";
import { V6Client } from '@aws-amplify/api-graphql'
import { queryOptions } from '@tanstack/react-query'
import { generateClient } from "aws-amplify/api";
import { downloadData, getUrl, remove, uploadData } from "aws-amplify/storage";
import { parsePathName } from "../utils";
import { v4 } from "uuid";

const client = generateClient<Schema>()

async function getAllEvents(client: V6Client<Schema>): Promise<Event[]> {
    console.log('api call')
    const returnedEvents = await client.models.Events.list()

    return (await Promise.all(returnedEvents.data.map(async (event) => {
        const collectionResponse = await event.collections()
        const mappedCollections = await Promise.all(collectionResponse.data.map(async (collection) => {
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
        }))
        
        const mappedEvent: Event = {
            ...event,
            collections: mappedCollections,
        }

        return mappedEvent
    }))).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
}

async function getAllPicturePathsFromCollectionId(client: V6Client<Schema>, collectionId?: string): Promise<PicturePath[] | null> {
    console.log('api call')
    if(!collectionId) return null
    const pathResponse = await client.models.PhotoPaths.listPhotoPathsByCollectionId({
        collectionId: collectionId
    })
    const mappedPaths: PicturePath[] = await Promise.all(pathResponse.data.map(async (path) => {
        const mappedPath: PicturePath = {
            ...path,
            url: (await getUrl({
                path: path.path,
            })).url.toString()
        }
        return mappedPath
    }))
    return mappedPaths
}

export async function getAllCollectionsFromUserTags(client: V6Client<Schema>, tags: UserTag[]): Promise<PhotoCollection[]> {
    console.log('api call')
    const collections: PhotoCollection[] = (await Promise.all(tags.map(async (tag) => {
        const collectionTagsResponse = await client.models.CollectionTag.listCollectionTagByTagId({
            tagId: tag.id
        })

        const mappedCollections: PhotoCollection[] = (await Promise.all(collectionTagsResponse.data.map(async (collectionTag) => {
            const collectionResponse = await collectionTag.collection()
            if(!collectionResponse.data || !collectionResponse.data) return
            const tags = (await Promise.all((await collectionResponse.data.tags()).data.map(async (collTag) => {
                const tag = await collTag.tag()
                if(!tag || !tag.data) return
                const mappedTag: UserTag = {
                    ...tag.data,
                    color: tag.data.color ?? undefined,
                }
                return mappedTag
            }))).filter((tag) => tag !== undefined)
    
            const mappedCollection: PhotoCollection = {
                ...collectionResponse.data,
                coverPath: collectionResponse.data.coverPath ?? undefined,
                downloadable: collectionResponse.data.downloadable ?? false,
                watermarkPath: collectionResponse.data.watermarkPath ?? undefined,
                tags: tags,
                //unnecessary
                paths: [],
            }
    
            return mappedCollection
        }))).filter((collection) => collection !== undefined)

        return mappedCollections
    }))).reduce((prev, cur) => {
        cur.forEach((collection) => {
            if(prev.find((col) => col.id === collection.id) === undefined) {
                prev.push(collection)
            }
        })
        return prev
    }, [])
    
    return collections
}

async function getAllWatermarkObjects(client: V6Client<Schema>): Promise<Watermark[]> {
    const watermarksResponse = await client.models.Watermark.list()
    return Promise.all(watermarksResponse
        .data.map(async (watermark) => {
            const url = (await getUrl({
                path: watermark.path
            })).url.toString()
            const mappedWatermark: Watermark = {
                url: url,
                path: watermark.path
            }
            return mappedWatermark
        }
    ))
}

async function getPathsDataMapFromPaths(paths: PicturePath[]): Promise<Map<string,  {file: File, order: number}>>{
    const map = new Map<string,  {file: File, order: number}>()

    const mappedFiles: Record<string,  {file: File, order: number}> = Object.fromEntries((await Promise.all(paths.map(async (path) => {
        const file = await (await downloadData({
            path: path.path
        }).result).body.blob()
        return [
            path.url,
            {file: new File([file], parsePathName(path.path), { type: file.type }), order: path.order}
        ]
    }))).sort((a, b) => (a[1] as {file: File, order: number}).order - (b[1] as {file: File, order: number}).order))
    
    Object.entries(mappedFiles).forEach((entry) => {
        map.set(entry[0], entry[1])
    })
    
    return map
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

export interface CreateCollectionParams {
    eventId: string,
    name: string,
    tags:  UserTag[],
    cover: string | null,
    downloadable: boolean,
    paths?: Map<string, File>,
    options?: {
        logging: boolean
    },
    setProgress: (progress: number) => void
}
export async function createCollectionMutation(params: CreateCollectionParams) {
    const collectionResponse = await client.models.PhotoCollection.create({
        eventId: params.eventId,
        name: params.name,
        downloadable: params.downloadable,
    })
    if(params.options?.logging) console.log(collectionResponse)

    if(!collectionResponse || !collectionResponse.data) return null

    const taggingResponse = await Promise.all(params.tags.map(async (tag) => {
        const taggingResponse = await client.models.CollectionTag.create({
            collectionId: collectionResponse.data!.id,
            tagId: tag.id
        })
        return taggingResponse
    }))

    if(params.options?.logging) console.log(taggingResponse)

    let paths: PicturePath[] = []
    let coverPath: string | undefined

    if(params.paths && params.paths.size > 0) {
        paths = (await Promise.all((await Promise.all(
            [...params.paths.values()].map(async (file, index, arr) => {
                const result = await uploadData({
                    path: `photo-collections/${params.eventId}/${collectionResponse.data!.id}/${v4()}_${file.name}`,
                    data: file,
                }).result
                if(params.options?.logging) console.log(result)

                params.setProgress((index + 1 / arr.length) * 100)
                //updating cover
                if(params.cover !== null && file.name === params.cover){
                    const collectionUpdate = await client.models.PhotoCollection.update({
                        id: collectionResponse.data!.id,
                        coverPath: result.path
                    })
                    coverPath = result.path
                    if(params.options?.logging) console.log(collectionUpdate)
                }
                return result.path
            })
        )).map(async (path, index) => {
            const response = await client.models.PhotoPaths.create({
                path: path,
                order: index,
                collectionId: collectionResponse.data!.id
            })
            if(params.options?.logging) console.log(response)
            if(!response || !response.data) return
            const returnPath: PicturePath = {
                ...response.data,
                url: ''
            }
            return returnPath
        }))).filter((item) => item !== undefined)
    }

    const returnedCollection: PhotoCollection = {
        ...collectionResponse.data,
        paths: paths,
        coverPath: coverPath,
        tags: params.tags,
        downloadable: params.downloadable,
        watermarkPath: undefined,
    }

    return returnedCollection
}
export interface UpdateCollectionParams extends CreateCollectionParams {
    collection: PhotoCollection,
}
export async function updateCollectionMutation(params: UpdateCollectionParams) {
    //TODO:
    //find added
    //find removed
    //update name and cover
    //update order
}

export const getAllEventsQueryOptions = () => queryOptions({
    queryKey: ['events', client],
    queryFn: () => getAllEvents(client),
})

export const getAllPicturePathsQueryOptions = (collectionId?: string) => queryOptions({
    queryKey: ['photoPaths', client, collectionId],
    queryFn: () => getAllPicturePathsFromCollectionId(client, collectionId),
    gcTime: 1000 * 15 * 60 //15 minutes
})

export const collectionsFromUserTagIdQueryOptions = (tags: UserTag[]) => queryOptions({
    queryKey: ['photoCollection', client, tags],
    queryFn: () => getAllCollectionsFromUserTags(client, tags)
})

export const getAllWatermarkObjectsQueryOptions = () => queryOptions({
    queryKey: ['watermark', client],
    queryFn: () => getAllWatermarkObjects(client),
    gcTime: 1000 * 15 * 60 //15 minutes
})

export const getPathsDataMapFromPathsQueryOptions = (paths: PicturePath[]) => queryOptions({
    queryKey: ['photoPaths', paths],
    queryFn: () => getPathsDataMapFromPaths(paths),
    gcTime: 1000 * 15 * 60 //15 minutes
})
