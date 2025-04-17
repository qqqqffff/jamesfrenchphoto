import { generateClient } from 'aws-amplify/api'
import { v4 } from 'uuid'
import { Schema } from '../../amplify/data/resource'
import { Favorite, PhotoCollection, PhotoSet, PicturePath, User } from '../types'
import { getUrl, remove, uploadData } from 'aws-amplify/storage'
import { V6Client } from '@aws-amplify/api-graphql'
import { queryOptions } from '@tanstack/react-query'
import { Dispatch, SetStateAction } from 'react'
import { UploadData } from '../components/modals/UploadImages/UploadToast'
import { getAuthUsers, getUserProfileByEmail } from './userService'
import { getCollectionById } from './collectionService'

const client = generateClient<Schema>()

interface GetPhotoSetByIdOptions { 
    resolveUrls?: boolean,
    user?: string,
    unauthenticated?: boolean
}
async function getPhotoSetById(client: V6Client<Schema>, setId?: string, options?: GetPhotoSetByIdOptions): Promise<PhotoSet | null> {
    if(!setId) return null
    const setResponse = await client.models.PhotoSet.get({
        id: setId,
    })

    if(!setResponse || !setResponse.data) return null

    let pathsResponse = await setResponse.data.paths()
    
    let responseData = pathsResponse.data
    while(pathsResponse.nextToken) {
        pathsResponse = await setResponse.data.paths({ nextToken: pathsResponse.nextToken })
        responseData.push(...pathsResponse.data)
    }

    const mappedPaths: PicturePath[] = (await Promise.all(responseData.map(async (path) => {
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
        items: setResponse.data.items ?? 0
    }
}


//TODO: make more effecient with memoization
interface GetFavoritesFromPhotoCollectionOptions {
    logging?: boolean
    metric?: boolean
}
async function getFavoritesFromPhotoCollection(client: V6Client<Schema>, collectionId: string, options?: GetFavoritesFromPhotoCollectionOptions): Promise<Map<User, Favorite[]>> {
    console.log('api call')
    const start = new Date().getTime()
    const favoriteMap = new Map<string, Favorite[]>()

    const collection = await getCollectionById(client, collectionId, { siSets: true, siPaths: true, siTags: false })
    if(!collection) return new Map<User, Favorite[]>()

    const response = await Promise.all(collection.sets.map(async (set) => {
        const pathsResponse = await Promise.all(set.paths.map(async (path) => {
            const pathResponse = (await client.models.PhotoPaths.get({ id: path.id })).data
            if(pathResponse !== null){
                let favoriteResponse = await pathResponse.favorites()
                let favoriteData = favoriteResponse.data

                while(favoriteResponse.nextToken) {
                    favoriteResponse = await pathResponse.favorites({ nextToken: favoriteResponse.nextToken })
                    favoriteData.push(...favoriteResponse.data)
                }

                const favorites = await Promise.all(favoriteData.map(async (favorite) => {
                    const mappedFavorite: Favorite = {
                        ...favorite,
                        createdAt: new Date(favorite.createdAt),
                        updatedAt: new Date(favorite.updatedAt),
                    }
                    const collectedFavorites = favoriteMap.get(mappedFavorite.userEmail) ?? []
                    favoriteMap.set(mappedFavorite.userEmail, [...collectedFavorites, mappedFavorite])
                    return mappedFavorite
                }))
                return favorites
            }
            return pathResponse
        }))
        return pathsResponse
    }))

    if(options?.logging) console.log(response)
    
    const returnMap = new Map<User, Favorite[]>()

    const authUsers = await getAuthUsers(client)

    const profileMapping = await Promise.all(Array.from(favoriteMap.entries()).map(async (entry) => {
        const foundProfile =  await getUserProfileByEmail(client, entry[0], { 
            siCollections: false, 
            siSets: false, 
            siTags: false, 
            siTimeslot: false, 
            siNotifications: false 
        })

        if(!foundProfile){
            returnMap.set({ 
                user: {
                    sittingNumber: -1,
                    email: entry[0],
                    userTags: [],
                    preferredContact: 'EMAIL',
                    participant: [],
                },
                data: authUsers?.find((data) => data.email === entry[0])
            }, entry[1])
        } else {
            returnMap.set({ 
                user: foundProfile,
                data: authUsers?.find((data) => data.email === entry[0])
            }, entry[1])
        }
        return foundProfile
    }))

    if(options?.logging) {
        console.log(returnMap)
        console.log(profileMapping)
    }
    
    const end = new Date().getTime()

    if(options?.metric) console.log(`GETFAVORITESFROMPHOTOCOLLECTION:${new Date(end - start).getTime()}ms`)
    if(options?.logging) console.log(response)

    return returnMap
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
        collectionId: params.collection.id,
        items: 0
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
    parentUpdateSet: Dispatch<SetStateAction<PhotoSet | undefined>>
    parentUpdateCollection: Dispatch<SetStateAction<PhotoCollection | undefined>>
    parentUpdateCollections: Dispatch<SetStateAction<PhotoCollection[]>>
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

                const tempSet: PhotoSet = {
                    ...params.set,
                    paths: [...params.set.paths, mappedPath],
                    items: params.set.items + 1
                }
                const tempCollection: PhotoCollection = { 
                    ...params.collection,
                    sets: params.collection.sets.map((set) => {
                        if(set.id === tempSet.id){
                            return tempSet
                        }
                        return set
                    })
                }
                params.updatePaths((prev) => {
                    return [...prev, mappedPath]
                })
                params.parentUpdateSet(tempSet)
                params.parentUpdateCollection(tempCollection)
                params.parentUpdateCollections((prev) => {
                    const temp = [...prev]

                    return temp.map((col) => {
                        if(col.id === tempCollection.id) return tempCollection
                        return col
                    })
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
    set: PhotoSet,
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
    
    const adjustColItemsResponse = await client.models.PhotoCollection.update({
        id: params.collection.id,
        items: params.collection.items - params.picturePaths.length
    })

    if(params.options?.logging) console.log(adjustColItemsResponse)

    const adjustSetItemsResponse = await client.models.PhotoSet.update({
        id: params.set.id,
        items: params.set.items - params.picturePaths.length
    })

    if(params.options?.logging) console.log(adjustSetItemsResponse)
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
        set: params.set,
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
export async function favoriteImageMutation(params: FavoriteImageMutationParams): Promise<[string, string] | undefined> {
    const response = await client.models.UserFavorites.create({
        pathId: params.pathId,
        userEmail: params.user
    })
    if(params.options?.logging) console.log(response)
    if(!response.data?.id) return undefined
    return [response.data.id, params.pathId]
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

export const getPhotoSetByIdQueryOptions = (setId?: string, options?: GetPhotoSetByIdOptions) => queryOptions({
    queryKey: ['photoSet', client, setId, options],
    queryFn: () => getPhotoSetById(client, setId, options),
})

export const getFavoritesFromPhotoCollectionQueryOptions = (collectionId: string, options?: GetFavoritesFromPhotoCollectionOptions) => queryOptions({
    queryKey: ['favorites', client, collectionId, options],
    queryFn: () => getFavoritesFromPhotoCollection(client, collectionId, options)
})