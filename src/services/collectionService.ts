import { Event, PhotoCollection, PicturePath, UserTag, Watermark } from "../types";
import { Schema } from "../../amplify/data/resource";
import { V6Client } from '@aws-amplify/api-graphql'
import { queryOptions } from '@tanstack/react-query'
import { generateClient } from "aws-amplify/api";
import { getUrl } from "aws-amplify/storage";

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