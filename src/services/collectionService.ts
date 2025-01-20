import { PhotoCollection, PhotoSet, PicturePath, UserTag, Watermark } from "../types";
import { Schema } from "../../amplify/data/resource";
import { V6Client } from '@aws-amplify/api-graphql'
import { queryOptions } from '@tanstack/react-query'
import { generateClient } from "aws-amplify/api";
import { downloadData, getUrl, remove } from "aws-amplify/storage";
import { parsePathName } from "../utils";

const client = generateClient<Schema>()

interface GetAllCollectionsOptions {
    siTags: boolean
    siSets: boolean
}
async function getAllPhotoCollections(client: V6Client<Schema>, options?: GetAllCollectionsOptions): Promise<PhotoCollection[]> {
    console.log('api call')
    const mappedCollections: PhotoCollection[] = await Promise.all(
        (await client.models.PhotoCollection.list()).data.map(async (collection) => {
            const mappedSets: PhotoSet[] = []
            const mappedTags: UserTag[] = []
            if(!options || options.siSets){
                const setsResponse = await collection.sets()
                mappedSets.push(...setsResponse.data.map((set) => {
                    const mappedSet: PhotoSet = {
                        ...set,
                        coverText: {
                            color: set.coverText?.color ?? undefined,
                            opacity: set.coverText?.opacity ?? undefined,
                            family: set.coverText?.family ?? undefined
                        },
                        watermarkPath: set.watermarkPath ?? undefined,
                        paths: [],
                    }
                    return mappedSet
                }))
            }

            if(!options || options.siTags){
                mappedTags.push(...(await Promise.all((await collection.tags()).data.map(async (collTag) => {
                    const tag = await collTag.tag()
                    if(!tag || !tag.data) return
                    const mappedTag: UserTag = {
                        ...tag.data,
                        color: tag.data.color ?? undefined,
                    }
                    return mappedTag
                }))).filter((tag) => tag !== undefined))
            }
            
            const mappedCollection: PhotoCollection = {
                ...collection,
                coverPath: collection.coverPath ?? undefined,
                downloadable: collection.downloadable ?? false,
                watermarkPath: collection.watermarkPath ?? undefined,
                tags: mappedTags,
                sets: mappedSets,
                items: collection.items ?? 0,
                published: collection.published ?? false,
            }

            return mappedCollection
        })
    )
    return mappedCollections
}

interface GetAllCollectionsFromUserTagsOptions {
    siTags: boolean
}
export async function getAllCollectionsFromUserTags(client: V6Client<Schema>, tags: UserTag[], options?: GetAllCollectionsFromUserTagsOptions): Promise<PhotoCollection[]> {
    console.log('api call')
    const collections: PhotoCollection[] = (await Promise.all(tags.map(async (tag) => {
        const collectionTagsResponse = await client.models.CollectionTag.listCollectionTagByTagId({
            tagId: tag.id
        })

        const mappedCollections: PhotoCollection[] = (await Promise.all(collectionTagsResponse.data.map(async (collectionTag) => {
            const collectionResponse = await collectionTag.collection()
            if(!collectionResponse.data || !collectionResponse.data) return
            const tags: UserTag[] = []
            
            if(!options || options.siTags){
                tags.push(...(await Promise.all((await collectionResponse.data.tags()).data.map(async (collTag) => {
                    const tag = await collTag.tag()
                    if(!tag || !tag.data) return
                    const mappedTag: UserTag = {
                        ...tag.data,
                        color: tag.data.color ?? undefined,
                    }
                    return mappedTag
                }))).filter((tag) => tag !== undefined))
            }
    
            const mappedCollection: PhotoCollection = {
                ...collectionResponse.data,
                coverPath: collectionResponse.data.coverPath ?? undefined,
                downloadable: collectionResponse.data.downloadable ?? false,
                watermarkPath: collectionResponse.data.watermarkPath ?? undefined,
                tags: tags,
                items: collectionResponse.data.items ?? 0,
                published: collectionResponse.data.published ?? false,
                //unnecessary
                sets: [], //TODO: implement me
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
    console.log('api call')
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
    console.log('api call')
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

async function getPath(path: string, id?: string): Promise<[string | undefined, string] | undefined> {
    console.log('api call')
    return [id, (await getUrl({
        path: path
    })).url.toString()]
}

interface GetPhotoCollectionByIdOptions {
    siTags: boolean,
    siSets: boolean,
}
async function getCollectionById(collectionId: string, options?: GetPhotoCollectionByIdOptions): Promise<PhotoCollection | undefined> {
    console.log('api call')
    const collection = await client.models.PhotoCollection.get({ id: collectionId })
    if(!collection || !collection.data) return
    const sets: PhotoSet[] = []
    if(!options || options.siSets){
        sets.push(...(await collection.data.sets()).data.map((set) => {
            const mappedSet: PhotoSet = {
                ...set,
                coverText: undefined, //TODO: implement me
                watermarkPath: set.watermarkPath ?? undefined,
                paths: [],
            }
            return mappedSet
        }))
    }
    const tags: UserTag[] = []
    if(!options || options.siTags){
        tags.push(...(await Promise.all((await collection.data.tags()).data.map(async (colTag) => {
            const tag = (await colTag.tag()).data
            if(!tag) return
            const mappedTag: UserTag = {
                ...tag,
                color: tag.color ?? undefined,
            }
            return mappedTag
        }))).filter((tag) => tag !== undefined))
    }
    const mappedCollection: PhotoCollection = {
        ...collection.data,
        watermarkPath: collection.data.watermarkPath ?? undefined,
        downloadable: collection.data.downloadable ?? false,
        coverPath: collection.data.coverPath ?? undefined,
        items: collection.data.items ?? 0,
        published: collection.data.published ?? false,
        sets: sets,
        tags: tags,
    }
    return mappedCollection
}

export interface CreateCollectionParams {
    name: string,
    tags:  UserTag[],
    cover: string | null,
    downloadable: boolean,
    options?: {
        logging: boolean
    },
    setProgress: (progress: number) => void
}
export async function createCollectionMutation(params: CreateCollectionParams) {
    console.log('api call')
    const collectionResponse = await client.models.PhotoCollection.create({
        name: params.name,
        downloadable: params.downloadable,
        items: 0
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

    let coverPath: string | undefined

    //TODO: move this logic
    // if(params.paths && params.paths.size > 0) {
    //     paths = (await Promise.all((await Promise.all(
    //         [...params.paths.values()].map(async (file, index, arr) => {
    //             const result = await uploadData({
    //                 path: `photo-collections/${params.eventId}/${collectionResponse.data!.id}/${v4()}_${file.name}`,
    //                 data: file,
    //             }).result
    //             if(params.options?.logging) console.log(result)

    //             params.setProgress((index + 1 / arr.length) * 100)
    //             //updating cover
    //             if(params.cover !== null && file.name === parsePathName(params.cover)){
    //                 const collectionUpdate = await client.models.PhotoCollection.update({
    //                     id: collectionResponse.data!.id,
    //                     coverPath: result.path
    //                 })
    //                 coverPath = result.path
    //                 if(params.options?.logging) console.log(collectionUpdate)
    //             }
    //             return result.path
    //         })
    //     )).map(async (path, index) => {
    //         const response = await client.models.PhotoPaths.create({
    //             path: path,
    //             order: index,
    //             collectionId: collectionResponse.data!.id
    //         })
    //         if(params.options?.logging) console.log(response)
    //         if(!response || !response.data) return
    //         const returnPath: PicturePath = {
    //             ...response.data,
    //             url: ''
    //         }
    //         return returnPath
    //     }))).filter((item) => item !== undefined)
    // }

    const returnedCollection: PhotoCollection = {
        ...collectionResponse.data,
        coverPath: coverPath,
        tags: params.tags,
        downloadable: params.downloadable,
        watermarkPath: undefined,
        sets: [],
        items: collectionResponse.data.items ?? 0,
        published: collectionResponse.data.published ?? false
    }

    return returnedCollection
}

export interface UpdateCollectionParams extends Partial<CreateCollectionParams> {
    collection: PhotoCollection,
    published: boolean,
    watermark?: Watermark | null,
}
export async function updateCollectionMutation(params: UpdateCollectionParams): Promise<PhotoCollection> {
    let updatedCollection = {
        ...params.collection
    }

    const newTags = (params.tags ?? []).filter((tag) => 
        (params.collection.tags.find((colTag) => colTag.id === tag.id)) === undefined)

    const removedTags = params.collection.tags.filter((colTag) => 
        ((params.tags ?? []).find((tag) => tag.id === colTag.id) === undefined))

    if(params.options?.logging) console.log(newTags, removedTags)
    // TODO: move this logic
    // const createPathsResponse = (await Promise.all((await Promise.all(newPaths.map(async (path, index, arr) => {
    //     const result = await uploadData({
    //         path: `photo-collections/${params.eventId}/${params.collection.id}/${v4()}_${path[1].name}`,
    //         data: path[1],
    //     }).result

    //     if(params.options?.logging) console.log(result)

    //     params.setProgress((index + 1 / arr.length) * 100)

    //     return result.path
    // }))).map(async (path, index) => {
    //     const offset = newPaths.length - removedPaths.length + params.collection.paths.length
    //     const response = await client.models.PhotoPaths.create({
    //         path: path,
    //         order: offset + index,
    //         collectionId: params.collection.id,
    //     })
    //     if(params.options?.logging) console.log(response)
    //     if(!response || !response.data) return
    //     const mappedPath: PicturePath = {
    //         ...response.data,
    //         url: '',
    //     }
    //     return mappedPath
    // }))).filter((item) => item !== undefined)


    updatedCollection.tags.push(...newTags)
    updatedCollection.tags = updatedCollection.tags
        .filter((tag) => removedTags.find((removedTag) => removedTag.id === tag.id) === undefined)

    const createTagResponse = await Promise.all(newTags.map(async (tag) => {
        const response = await client.models.CollectionTag.create({
            collectionId: params.collection.id,
            tagId: tag.id
        })
        return response
    }))
    if(params.options?.logging) console.log(createTagResponse)

    const removeTagsResponse = await Promise.all((await client.models.CollectionTag
        .listCollectionTagByCollectionId({
            collectionId: params.collection.id
        }))
        .data
        .filter((tag) => 
            (removedTags.find((removedTag) => removedTag.id == tag.tagId) !== undefined)
        )
        .map(async (collectionTag) => {
            const response = await client.models.CollectionTag.delete({
                id: collectionTag.id,
            })

            return response
        }))
    if(params.options?.logging) console.log(removeTagsResponse)
    
    if(params.name !== params.collection.name || 
        params.downloadable !== params.collection.downloadable ||
        (params.cover && parsePathName(params.cover) !== parsePathName(params.collection.coverPath ?? '')) ||
        params.published !== params.collection.published ||
        (params.watermark && parsePathName(params.watermark.path) !== parsePathName(params.collection.watermarkPath ?? ''))
    ) {
        const response = await client.models.PhotoCollection.update({
            id: params.collection.id,
            downloadable: params.downloadable,
            name: params.name,
            coverPath: params.cover ? parsePathName(params.cover) : null,
            published: params.published,
            watermarkPath: params.watermark?.path ? parsePathName(params.watermark.path) : null
        })
        if(params.options?.logging) console.log(response)

        updatedCollection.name = params.name ?? params.collection.name
        updatedCollection.downloadable = params.downloadable ?? params.collection.downloadable
        updatedCollection.coverPath = params.cover ? parsePathName(params.cover) : params.collection.coverPath
        updatedCollection.published = params.published ?? params.collection.published
        updatedCollection.watermarkPath = params.watermark?.path ?? params.collection.watermarkPath
    }

    if(params.options?.logging) console.log(updatedCollection)

    return updatedCollection
}

export interface DeleteCollectionParams {
    collection: PhotoCollection,
    options?: {
        logging: boolean
    }
}
export async function deleteCollectionMutation(params: DeleteCollectionParams) {
    const deletePathsResponse = await Promise.all(
        (await Promise.all(params.collection.sets
            .map(async (set) => {
                const response = await client.models.PhotoSet.delete({
                    id: set.id,
                })
                if(params.options?.logging) console.log(response)
                return set.paths
            }))
        )
        .reduce((prev, cur) => [...prev, ...(cur.filter((path) => prev.some((prePath) => prePath.id === path.id)))], [])
        .map(async (path) => {
            const s3response = await remove({
                path: path.path,
            })
            const dynamoResponse = await client.models.PhotoPaths.delete({
                id: path.id
            })
            return {
                s3: s3response,
                dynamo: dynamoResponse
            }
        })
    )
    if(params.options?.logging) console.log(deletePathsResponse)

    const response = await client.models.PhotoCollection.delete({
        id: params.collection.id
    })
    if(params.options?.logging) console.log(response)
}

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

export const getPathQueryOptions = (path: string, id?: string) => queryOptions({
    queryKey: ['path', path, id],
    queryFn: () => getPath(path, id)
})

export const getPhotoCollectionByIdQueryOptions = (collectionId: string, options?: GetPhotoCollectionByIdOptions) => queryOptions({
    queryKey: ['photoCollection', client, collectionId, options],
    queryFn: () => getCollectionById(collectionId, options)
})

export const getAllPhotoCollectionsQueryOptions = (options?: GetAllCollectionsOptions) => queryOptions({
    queryKey: ['photoCollection', client, options],
    queryFn: () => getAllPhotoCollections(client, options)
})
