import { generateClient } from 'aws-amplify/api'
import { v4 } from 'uuid'
import { Schema } from '../../amplify/data/resource'
import { PhotoCollection, PhotoSet, PicturePath } from '../types'
import { getUrl, remove, uploadData } from 'aws-amplify/storage'
import { V6Client } from '@aws-amplify/api-graphql'
import { queryOptions } from '@tanstack/react-query'

const client = generateClient<Schema>()

interface GetAllPicturePathsByPhotoSetOptions {
    resolveUrls?: boolean
} 
async function getAllPicturePathsByPhotoSet(client: V6Client<Schema>, setId?: string, options?: GetAllPicturePathsByPhotoSetOptions): Promise<PicturePath[] | null> {
    console.log('api call')
    if(!setId) return null
    const pathResponse = await client.models.PhotoPaths.listPhotoPathsBySetId({
        setId: setId
    })
    const mappedPaths: PicturePath[] = await Promise.all(pathResponse.data.map(async (path) => {
        const mappedPath: PicturePath = {
            ...path,
            url: options?.resolveUrls ? (await getUrl({
                path: path.path,
            })).url.toString() : ''
        }
        return mappedPath
    }))
    return mappedPaths
}


interface GetPhotoSetByIdOptions extends GetAllPicturePathsByPhotoSetOptions {

}
async function getPhotoSetById(client: V6Client<Schema>, setId?: string, options?: GetPhotoSetByIdOptions): Promise<PhotoSet | null> {
    if(!setId) return null
    const setResponse = await client.models.PhotoSet.get({
        id: setId,
    })

    if(!setResponse || !setResponse.data) return null

    const pathsResponse = await setResponse.data.paths()
    const mappedPaths: PicturePath[] = (await Promise.all(pathsResponse.data.map(async (path) => {
        const mappedPath: PicturePath = {
            ...path,
            url: options?.resolveUrls ? (await getUrl({
                path: path.path,
            })).url.toString() : ''
        }
        return mappedPath
    }))).sort((a, b) => a.order - b.order)
    
    return {
        ...setResponse.data,
        coverText: undefined, //TODO: implement me
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
        coverPath: '',
        order: params.collection.sets.length,
    })
    if(params.options?.logging) console.log(response)
    if(!response || !response.data) return
    const mappedSet: PhotoSet = {
        id: response.data.id,
        coverPath: '',
        paths: [],
        order: params.collection.sets.length,
        name: params.collection.name,
    }
    return mappedSet
}

export interface UpdateSetParams {
    set: PhotoSet,
    coverPath: string,
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
        params.set.coverPath !== params.coverPath ||
        params.set.watermarkPath !== params.watermarkPath ||
        params.set.order !== params.order
    ) {
        const response = await client.models.PhotoSet.update({
            id: params.set.id,
            name: params.name,
            coverPath: params.coverPath,
            watermarkPath: params.watermarkPath ?? params.set.watermarkPath,
            order: params.order,
        })

        if(params.options?.logging) console.log(response)

        updatedSet.name = params.name
        updatedSet.coverPath = params.coverPath,
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
    collection: PhotoCollection,
    set: PhotoSet,
    files: Map<string, File>
    progressStep: (progress: number) => void,
    options?: {
        logging: boolean
    }
}
export async function uploadImagesMutation(params: UploadImagesMutationParams){
    console.log('api call')
    const totalUpload = [...params.files.values()].reduce((prev, cur) => prev + cur.size, 0)
    let currentUpload = 0
    console.log(totalUpload)
    const response = (await Promise.all(
        (await Promise.all(
            [...params.files.values()].map(async (file) => {
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
                            console.log(currentUpload, prevUploadAmount)
                            params.progressStep(currentUpload / totalUpload)
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
            if(!response || !response.data || response.errors !== undefined) return false
            return true
        })
    )).filter((item) => item).length

    const updateCollectionItemsResponse = await client.models.PhotoCollection.update({
        id: params.collection.id,
        items: response + params.collection.items
    })

    if(params.options?.logging) console.log(updateCollectionItemsResponse)
}

export interface DeleteImagesMutationParams {
    collection: PhotoCollection,
    picturePaths: PicturePath[],
    progress?: (paths: PicturePath[]) => void,
    options?: {
        logging: boolean,
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

export const getAllPicturePathsByPhotoSetQueryOptions = (setId?: string, options?: GetAllPicturePathsByPhotoSetOptions) => queryOptions({
    queryKey: ['photoPaths', client, setId, options],
    queryFn: () => getAllPicturePathsByPhotoSet(client, setId, options),
    gcTime: 1000 * 15 * 60 //15 minutes
})

export const getPhotoSetByIdQueryOptions = (setId?: string, options?: GetPhotoSetByIdOptions) => queryOptions({
    queryKey: ['photoSet', client, setId, options],
    queryFn: () => getPhotoSetById(client, setId, options),
})