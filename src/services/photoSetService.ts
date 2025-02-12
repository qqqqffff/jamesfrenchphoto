import { generateClient } from 'aws-amplify/api'
import { v4 } from 'uuid'
import { Schema } from '../../amplify/data/resource'
import { PhotoCollection, PhotoSet, PicturePath } from '../types'
import { getUrl, remove, uploadData } from 'aws-amplify/storage'
import { V6Client } from '@aws-amplify/api-graphql'
import { queryOptions } from '@tanstack/react-query'
import { Dispatch, SetStateAction } from 'react'
import { UploadData } from '../components/modals/UploadImages/UploadToast'

const client = generateClient<Schema>()

interface GetAllPicturePathsByPhotoSetOptions {
    resolveUrls?: boolean,
    user?: string
} 
async function getAllPicturePathsByPhotoSet(client: V6Client<Schema>, setId?: string, options?: GetAllPicturePathsByPhotoSetOptions): Promise<PicturePath[] | null> {
    console.log('api call')
    if(!setId) return null
    const pathResponse = await client.models.PhotoPaths.listPhotoPathsBySetId({
        setId: setId
    })
    const mappedPaths: PicturePath[] = await Promise.all(pathResponse.data.map(async (path) => {
        let favorite: undefined | string
        if(options?.user){
            favorite = (await path.favorites()).data.find((favorite) => favorite.userEmail === options.user)?.id
        }
        const mappedPath: PicturePath = {
            ...path,
            url: options?.resolveUrls ? (await getUrl({
                path: path.path,
            })).url.toString() : '',
            favorite: favorite,
        }
        return mappedPath
    }))
    return mappedPaths
}


interface GetPhotoSetByIdOptions extends GetAllPicturePathsByPhotoSetOptions {
    user?: string,
}
async function getPhotoSetById(client: V6Client<Schema>, setId?: string, options?: GetPhotoSetByIdOptions): Promise<PhotoSet | null> {
    if(!setId) return null
    const setResponse = await client.models.PhotoSet.get({
        id: setId,
    })

    if(!setResponse || !setResponse.data) return null

    const pathsResponse = await setResponse.data.paths()
    const mappedPaths: PicturePath[] = (await Promise.all(pathsResponse.data.map(async (path) => {
        let favorite: undefined | string
        if(options?.user){
            favorite = (await path.favorites()).data.find((favorite) => favorite.userEmail === options.user)?.id
        }
        const mappedPath: PicturePath = {
            ...path,
            url: options?.resolveUrls ? (await getUrl({
                path: path.path,
            })).url.toString() : '',
            favorite: favorite
        }
        return mappedPath
    }))).sort((a, b) => a.order - b.order)
    
    return {
        ...setResponse.data,
        watermarkPath: setResponse.data.watermarkPath ?? undefined,
        paths: mappedPaths,
    }
}


export interface CreateSetParams {
    collection: PhotoCollection,
    name: string,
    options?: {
        logging: boolean
    }
}
export async function createSetMutation(params: CreateSetParams) {
    const response = await client.models.PhotoSet.create({
        collectionId: params.collection.id,
        name: params.name,
        order: params.collection.sets.length,
    })
    if(params.options?.logging) console.log(response)
    if(!response || !response.data) return
    const mappedSet: PhotoSet = {
        id: response.data.id,
        paths: [],
        order: params.collection.sets.length,
        name: params.collection.name,
        collectionId: params.collection.id
    }
    return mappedSet
}

export interface UpdateSetParams {
    set: PhotoSet,
    watermarkPath?: string,
    name: string,
    order: number,
    options?: {
        logging: boolean
    }
}
export async function updateSetMutation(params: UpdateSetParams) {
    const updatedSet = {...params.set}

    if(
        params.set.name !== params.name ||
        params.set.watermarkPath !== params.watermarkPath ||
        params.set.order !== params.order
    ) {
        const response = await client.models.PhotoSet.update({
            id: params.set.id,
            name: params.name,
            watermarkPath: params.watermarkPath ?? params.set.watermarkPath,
            order: params.order,
        })

        if(params.options?.logging) console.log(response)

        updatedSet.name = params.name
        updatedSet.watermarkPath = params.watermarkPath ?? params.set.watermarkPath
        updatedSet.order = params.order
    }

    return updatedSet
}

//TODO: optimize me
export interface ReorderPathsParams{
    paths: PicturePath[],
    options?: {
        logging: boolean
    }
}
export async function reorderPathsMutation(params: ReorderPathsParams) {
    const updatedPathsResponse = await Promise.all(params.paths
        .map(async (path) => {
            const response = await client.models.PhotoPaths.update({
                id: path.id,
                order: path.order,
            })
            return response
        })
    )
    if(params.options?.logging) console.log(updatedPathsResponse)
}

export interface UploadImagesMutationParams {
    uploadId: string,
    collection: PhotoCollection,
    set: PhotoSet,
    files: Map<string, File>,
    updateUpload: Dispatch<SetStateAction<UploadData[]>>
    updatePaths: Dispatch<SetStateAction<PicturePath[]>>
    totalUpload: number,
    duplicates: Record<string, PicturePath>,
    options?: {
        logging?: boolean,
        preview?: boolean
    }
}
export async function uploadImagesMutation(params: UploadImagesMutationParams){
    console.log('api call')
    if(params.options?.preview){
        for(let i = 0; i < 50; i++){
            await new Promise(resolve => setTimeout(resolve, Math.random() * 250 + 250))
            params.updateUpload((prev) => {
                const temp: UploadData[] = [...prev].map((upload) => {
                    if(upload.id === params.uploadId){
                        return ({
                            ...upload,
                            progress: (i / 49)
                        })
                    } 
                    return upload
                })
                return temp
            })
        }
    
        params.updateUpload((prev) => {
            const temp: UploadData[] = [...prev].map((upload) => {
                if(upload.id === params.uploadId){
                    return ({
                        ...upload,
                        state: 'done'
                    })
                } 
                return upload
            })
            return temp
        })
        return
    }
    
    let currentUpload = 0
    
    const response = (await Promise.all(
        (await Promise.all(
            [...params.files.values()].map(async (file, index) => {
                if(params.duplicates[file.name]){
                    const result = await remove({
                        path: params.duplicates[file.name].path
                    })

                    if(params.options?.logging) console.log(result)
                }
                let prevUploadAmount = -1
                const result = await uploadData({
                    path: `photo-collections/${params.collection.id}/${params.set.id}/${v4()}_${file.name}`,
                    data: file,
                    options: {
                        onProgress: (event) => {
                            currentUpload += event.transferredBytes
                            if(prevUploadAmount !== -1){
                                currentUpload -= prevUploadAmount
                            }
                            prevUploadAmount = event.transferredBytes
                            if(params.options?.logging) console.log(currentUpload, prevUploadAmount)
                            params.updateUpload((prev) => {
                                const percent = currentUpload / params.totalUpload
                                const upload = prev.find((upload) => upload.id === params.uploadId)
                                if(percent !== upload?.progress){
                                    return prev.map((upload) => {
                                        if(upload.id === params.uploadId){
                                            return {
                                                ...upload,
                                                progress: percent
                                            }
                                        }
                                        return upload
                                    })
                                }
                                return prev
                            })
                        }
                    }
                }).result

                let mappedPath: PicturePath | undefined
                if(params.options?.logging) console.log(result)

                if(params.duplicates[file.name]){
                    const response = await client.models.PhotoPaths.update({
                        id: params.duplicates[file.name].id,
                        path: result.path,
                    })
                    if(params.options?.logging) console.log(response)
                    if(!response || !response.data || response.errors !== undefined) return false
                    mappedPath = {
                        ...response.data,
                        favorite: params.duplicates[file.name].favorite,
                        url: ''
                    }
                } else {
                    const response = await client.models.PhotoPaths.create({
                        path: result.path,
                        order: index + params.set.paths.length,
                        setId: params.set.id,
                    })
                    if(params.options?.logging) console.log(response)
                    if(!response || !response.data || response.errors !== undefined) return false
                    mappedPath = {
                        ...response.data,
                        url: ''
                    }
                }
                
                if(!mappedPath) return false

                params.updatePaths((prev) => {
                    return [...prev, mappedPath]
                })
                params.updateUpload((prev) => {
                    return prev.map((upload) => {
                        if(upload.id === params.uploadId){
                            return {
                                ...upload,
                                currentItems: upload.currentItems + 1
                            }
                        }
                        return upload
                    })
                })
                return true
            })
        ))
    )).filter((item) => item).length

    const updateCollectionItemsResponse = await client.models.PhotoCollection.update({
        id: params.collection.id,
        items: response + params.collection.items
    })

    params.updateUpload((prev) => {
        return prev.map((upload) => {
            if(upload.id === params.uploadId){
                return {
                    ...upload,
                    state: 'done'
                }
            }
            return upload
        })
    })

    if(params.options?.logging) console.log(updateCollectionItemsResponse)
}

export interface DeleteImagesMutationParams {
    collection: PhotoCollection,
    picturePaths: PicturePath[],
    progress?: (paths: PicturePath[]) => void,
    options?: {
        logging?: boolean,
    }
}
export async function deleteImagesMutation(params: DeleteImagesMutationParams){
    const temp = [...params.picturePaths]
    const response = await Promise.all(params.picturePaths.map(async (path) => {
        const s3response = await remove({
            path: path.path
        })
        const pathsresponse = await client.models.PhotoPaths.delete({
            id: path.id,
        })
        temp.shift()
        if(params.progress) params.progress(temp)
        return [s3response, pathsresponse]
    }))
    if(params.options?.logging) console.log(response)
    
    const adjustItemsResponse = await client.models.PhotoCollection.update({
        id: params.collection.id,
        items: params.collection.items - params.picturePaths.length
    })

    if(params.options?.logging) console.log(adjustItemsResponse)
}

export interface DeleteSetMutationParams {
    collection: PhotoCollection
    set: PhotoSet
    options?: {
        logging?: boolean
    }
}
export async function deleteSetMutation(params: DeleteSetMutationParams){
    await deleteImagesMutation({
        collection: params.collection,
        picturePaths: params.set.paths,
        options: params.options,
    })

    const deleteSetResponse = await client.models.PhotoSet.delete({ id: params.set.id })

    if(params.options?.logging) console.log(deleteSetResponse)

    const setUpdatesResponses = await Promise.all(params.collection.sets
        .filter((set) => set.id !== params.set.id)
        .sort((a, b) => a.order - b.order)
        .map(async (set, index) => {
            const response = await client.models.PhotoSet.update({
                id: set.id,
                order: index
            })
            return response
        })
    )

    if(params.options?.logging) console.log(setUpdatesResponses)
}

export interface FavoriteImageMutationParams {
    pathId: string,
    user: string,
    options?: {
        logging?: boolean
    }
}
export async function favoriteImageMutation(params: FavoriteImageMutationParams) {
    const response = await client.models.UserFavorites.create({
        pathId: params.pathId,
        userEmail: params.user
    })
    if(params.options?.logging) console.log(response)
    return response.data?.id
}

export interface UnfavoriteImageMutationParams {
    id: string,
    options?: {
        logging?: boolean
    }
}
export async function unfavoriteImageMutation(params: UnfavoriteImageMutationParams){
    const response = await client.models.UserFavorites.delete({
        id: params.id,
    })
    if(params.options?.logging) console.log(response)
}

export const getAllPicturePathsByPhotoSetQueryOptions = (setId?: string, options?: GetAllPicturePathsByPhotoSetOptions) => queryOptions({
    queryKey: ['photoPaths', client, setId, options],
    queryFn: () => getAllPicturePathsByPhotoSet(client, setId, options),
    gcTime: 1000 * 15 * 60 //15 minutes
})

export const getPhotoSetByIdQueryOptions = (setId?: string, options?: GetPhotoSetByIdOptions) => queryOptions({
    queryKey: ['photoSet', client, setId, options],
    queryFn: () => getPhotoSetById(client, setId, options),
})