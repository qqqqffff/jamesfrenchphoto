import { PhotoCollection, PicturePath, UserTag, Watermark } from "../types";
import { Schema } from "../../amplify/data/resource";
import { V6Client } from '@aws-amplify/api-graphql'
import { queryOptions } from '@tanstack/react-query'
import { generateClient } from "aws-amplify/api";
import { downloadData, getUrl, uploadData } from "aws-amplify/storage";
import { parsePathName } from "../utils";
import { v4 } from "uuid";

const client = generateClient<Schema>()

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
    const newPaths = Array.from((params.paths ?? new Map<string, File>()).entries())
            .filter((entry) => entry[0].includes('blob'))

    const fileNamesMap = Array.from(params.paths?.values() ?? []).map((file) => {
        return file.name
    })
    const removedPaths = params.collection.paths
        .filter((path) => 
            fileNamesMap.find((fn) => fn === parsePathName(path.path)) === undefined)

    console.log(removedPaths, newPaths)
    
}

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
