import { PhotoCollection, PhotoSet, PicturePath, UserTag, Watermark } from "../types";
import { Schema } from "../../amplify/data/resource";
import { V6Client } from '@aws-amplify/api-graphql'
import { queryOptions } from '@tanstack/react-query'
import { generateClient } from "aws-amplify/api";
import { downloadData, getUrl, remove, uploadData } from "aws-amplify/storage";
import { parsePathName } from "../utils";
import { v4 } from 'uuid'

const client = generateClient<Schema>()

async function getAllPicturePathsByPhotoSet(client: V6Client<Schema>, setId?: string): Promise<PicturePath[] | null> {
    console.log('api call')
    if(!setId) return null
    const pathResponse = await client.models.PhotoPaths.listPhotoPathsBySetId({
        setId: setId
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

interface GetAllCollectionsOptions {
    siTags: boolean
    siSets: boolean
}
async function getAllPhotoCollections(client: V6Client<Schema>, options?: GetAllCollectionsOptions): Promise<PhotoCollection[]> {
    const mappedCollections: PhotoCollection[] = await Promise.all(
        (await client.models.PhotoCollection.list()).data.map(async (collection) => {
            const setsResponse = await collection.sets()
            const mappedSets: PhotoSet[] = []
            const mappedTags: UserTag[] = []
            if(!options || options.siSets){
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

async function getPath(path: string, id?: string): Promise<[string | undefined, string] | undefined> {
    return [id, (await getUrl({
        path: path
    })).url.toString()]
}

async function getCollectionById(collectionId: string): Promise<PhotoCollection | undefined> {
    const collection = await client.models.PhotoCollection.get({ id: collectionId })
    if(!collection || !collection.data) return
    const mappedCollection: PhotoCollection = {
        ...collection.data,
        watermarkPath: collection.data.watermarkPath ?? undefined,
        downloadable: collection.data.downloadable ?? false,
        coverPath: collection.data.coverPath ?? undefined,
        //TODO: implement me
        sets: [],
        tags: []
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
    const collectionResponse = await client.models.PhotoCollection.create({
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
        sets: []
    }

    return returnedCollection
}

export interface UploadImagesMutationParams {
    collectionId: string,
    set: PhotoSet,
    files: Map<string, File>
    progressStep: (progress: number) => void,
    options?: {
        logging: boolean
    }
}
export async function uploadImagesMutation(params: UploadImagesMutationParams){
    (await Promise.all(
        (await Promise.all(
            [...params.files.values()].map(async (file, index, arr) => {
                const result = await uploadData({
                    path: `photo-collections/${params.collectionId}/${params.set.id}/${v4()}_${file.name}`,
                    data: file,
                    options: {
                        onProgress: (event) => {
                            params.progressStep((index + (event.transferredBytes / file.size)) / (arr.length - 1))
                        }
                    }
                }).result
                if(params.options?.logging) console.log(result)
                return result.path
            })
        )).map(async (path, index) => {
            const response = await client.models.PhotoPaths.create({
                path: path,
                order: index + params.set.paths.length,
                setId: params.set.id,
            })
            if(params.options?.logging) console.log(response)
        })
    ))
}

export interface UpdateCollectionParams extends CreateCollectionParams {
    collection: PhotoCollection,
}
export async function updateCollectionMutation(params: UpdateCollectionParams) {
    let updatedCollection = {
        ...params.collection
    }

    // TODO: move this logic
    // const newPaths = Array.from((params.paths ?? new Map<string, File>()).entries())
    //         .filter((entry) => entry[0].includes('blob'))
    // const fileNamesMap = Array.from(params.paths?.values() ?? []).map((file) => {
    //     return file.name
    // })
    // const removedPaths = params.collection.paths
    //     .filter((path) => 
    //         fileNamesMap.find((fn) => fn === parsePathName(path.path)) === undefined)

    const newTags = params.tags.filter((tag) => 
        (params.collection.tags.find((colTag) => colTag.id === tag.id)) === undefined)

    const removedTags = params.collection.tags.filter((colTag) => 
        (params.tags.find((tag) => tag.id === colTag.id) === undefined))

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

    // updatedCollection.paths.push(...createPathsResponse)
    // updatedCollection.paths = updatedCollection.paths
    //     .filter((item) => removedPaths.find((path) => path.id === item.id) === undefined)
    //     .sort((a, b) => a.order - b.order)
    //     .map((path, index) => ({
    //         ...path,
    //         order: index
    //     }))

    // if(params.options?.logging) console.log(updatedCollection.paths)

    // const updatedPathsResponse = await Promise.all(updatedCollection.paths
    //     .filter((path) => createPathsResponse.find((createPath) => createPath.id === path.id) === undefined)
    //     .map(async (path) => {
    //         const response = await client.models.PhotoPaths.update({
    //             id: path.id,
    //             order: path.order,
    //         })
    //         return response
    //     })
    // )
    // if(params.options?.logging) console.log(updatedPathsResponse)

    // const removePathResponse = await Promise.all(removedPaths.map(async (path) => {
    //     const s3response = await remove({
    //         path: path.path
    //     })

    //     const dynamoResponse = await client.models.PhotoPaths.delete({
    //         id: path.id,
    //     })

    //     return {
    //         s3: s3response,
    //         dynamo: dynamoResponse,
    //     }
    // }))
    // if(params.options?.logging) console.log(removePathResponse)


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
        (params.cover !== null && params.collection.coverPath && params.cover !== parsePathName(params.collection.coverPath)) 
    ) {
        const response = await client.models.PhotoCollection.update({
            id: params.collection.id,
            // coverPath: coverPath?.path, TODO: fix
            downloadable: params.downloadable,
            name: params.name
        })
        if(params.options?.logging) console.log(response)

        updatedCollection.name = params.name
        updatedCollection.downloadable = params.downloadable
        // updatedCollection.coverPath = coverPath?.path TODO: fix
    }

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

export const getAllPicturePathsByPhotoSetQueryOptions = (setId?: string) => queryOptions({
    queryKey: ['photoPaths', client, setId],
    queryFn: () => getAllPicturePathsByPhotoSet(client, setId),
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

export const getPathQueryOptions = (path: string, id?: string) => queryOptions({
    queryKey: ['path', path, id],
    queryFn: () => getPath(path, id)
})

export const getCollectionByIdQueryOptions = (collectionId: string) => queryOptions({
    queryKey: ['photoCollection', client, collectionId],
    queryFn: () => getCollectionById(collectionId)
})

export const getAllPhotoCollectionsQueryOptions = (options?: GetAllCollectionsOptions) => queryOptions({
    queryKey: ['photoCollection', client, options],
    queryFn: () => getAllPhotoCollections(client, options)
})
