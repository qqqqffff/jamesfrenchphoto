import { v4 } from 'uuid'
import { Schema } from '../../amplify/data/resource'
import { Favorite, Participant, PhotoCollection, PhotoSet, PicturePath } from '../types'
import { getUrl, remove, uploadData } from 'aws-amplify/storage'
import { V6Client } from '@aws-amplify/api-graphql'
import { queryOptions } from '@tanstack/react-query'
import { Dispatch, SetStateAction } from 'react'
import { UploadData } from '../components/modals/UploadImages/UploadToast'
import { getAllPaths } from './photoPathService'
import { parsePathName } from '../utils'

interface GetPhotoSetByIdOptions { 
  resolveUrls?: boolean,
  participantId?: string,
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
    if(options?.participantId){
      favorite = (await path.favorites()).data.find((favorite) => favorite.participantId === options.participantId)?.id
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


//TODO: use the user service for participant mapping
interface GetFavoritesFromPhotoCollectionOptions {
  logging?: boolean
  metric?: boolean
}
async function getFavoritesFromPhotoCollection(client: V6Client<Schema>, collection: PhotoCollection,  options?: GetFavoritesFromPhotoCollectionOptions): Promise<Map<Participant, Favorite[]>> {
  console.log('api call')
  const start = new Date().getTime()

  const participantMemo: Participant[] = []

  await Promise.all((await client.models.ParticipantCollections
    .listParticipantCollectionsByCollectionId({ collectionId: collection.id }))
    .data.map(async (colP) => {
      const participant = (await colP.participant()).data
      if(participant && !participantMemo.some((pMemo) => participant.id === pMemo.id)) {
        const mappedParticipant: Participant = {
          ...participant,
          middleName: participant.middleName ?? undefined,
          preferredName: participant.preferredName ?? undefined,
          email: participant.email ?? undefined,
          contact: participant.contact ?? false,
          //not necessary
          notifications: [],
          timeslot: [], 
          userTags: [],
          collections: []
        }
        participantMemo.push(mappedParticipant)
      }
    })
  )

  await Promise.all(collection.tags.map(async (tag) => {
    let participantTagResponse = await client.models.ParticipantUserTag
      .listParticipantUserTagByTagId({ tagId: tag.id })
    const participantTagData = participantTagResponse.data

    while(participantTagResponse.nextToken) {
      participantTagResponse = await client.models.ParticipantUserTag
        .listParticipantUserTagByTagId(
          { tagId: tag.id }, 
          { nextToken: participantTagResponse.nextToken }
        )
      participantTagData.push(...participantTagResponse.data)
    }

    await Promise.all(participantTagData.map(async (pTag) => {
      const participant = (await pTag.participant()).data
      if(participant && !participantMemo.some((pMemo) => pMemo.id === participant.id)) {
        const mappedParticipant: Participant = {
          ...participant,
          middleName: participant.middleName ?? undefined,
          preferredName: participant.preferredName ?? undefined,
          email: participant.email ?? undefined,
          contact: participant.contact ?? false,
          //not necessary
          notifications: [],
          timeslot: [], 
          userTags: [],
          collections: []
        }
        participantMemo.push(mappedParticipant)
      }
    }))
  }))

  console.log(await client.models.UserFavorites.list(), participantMemo)
  
  const returnMap = new Map<Participant, Favorite[]>()
  await Promise.all(participantMemo.map(async (participant) => {
    let favoriteResponse = await client.models.UserFavorites
      .listUserFavoritesByParticipantIdAndCollectionId({ 
        participantId: participant.id, 
        collectionId: {
          eq: collection.id
        }
      })
    
    const favoriteData = favoriteResponse.data

    while(favoriteResponse.nextToken) {
      favoriteResponse = await client.models.UserFavorites
        .listUserFavoritesByParticipantIdAndCollectionId({ 
          participantId: participant.id, 
          collectionId: {
            eq: collection.id
          }
        }, { nextToken: favoriteResponse.nextToken })

      favoriteData.push(...favoriteResponse.data)
    }

    const mappedFavorites: Favorite[] = favoriteData.map((favorite) => {
      const mappedFavorite: Favorite = {
        ...favorite,
        createdAt: new Date(favorite.createdAt),
        updatedAt: new Date(favorite.updatedAt),
      }
      return mappedFavorite
    })

    returnMap.set(participant, mappedFavorites)
  }))
  
  const end = new Date().getTime()

  if(options?.metric) console.log(`GETFAVORITESFROMPHOTOCOLLECTION:${new Date(end - start).getTime()}ms`)

  return returnMap
}


export interface CreateSetParams {
  photoSet: PhotoSet
  options?: {
    logging: boolean
  }
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

//TODO: optimize me
export interface ReorderPathsParams{
  paths: PicturePath[],
  fullRefetch?: {
    setId: string,
    order?: 'ASC' | 'DSC'
  },
  options?: {
    logging: boolean
  }
}

export interface UploadImagesMutationParams {
  uploadId: string,
  collection: PhotoCollection,
  set: PhotoSet,
  files: Map<string, { file: File, width: number, height: number }>,
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

export interface DeleteImagesMutationParams {
  collection: PhotoCollection,
  set: PhotoSet,
  picturePaths: PicturePath[],
  progress?: (paths: PicturePath[]) => void,
  options?: {
    logging?: boolean,
  }
}

export interface DeleteSetMutationParams {
  collection: PhotoCollection
  set: PhotoSet
  options?: {
    logging?: boolean
  }
}

export interface FavoriteImageMutationParams {
  collectionId: string,
  pathId: string,
  participantId: string,
  options?: {
    logging?: boolean
  }
}

export interface UnfavoriteImageMutationParams {
  id: string,
  options?: {
    logging?: boolean
  }
}

export class PhotoSetService {
  private client: V6Client<Schema>
  constructor(client: V6Client<Schema>) {
    this.client = client
  }

  async createSetMutation(params: CreateSetParams) {
    const response = await this.client.models.PhotoSet.create({
      id: params.photoSet.id,
      collectionId: params.photoSet.collectionId,
      name: params.photoSet.name,
      order: params.photoSet.order,
    })
    if(params.options?.logging) console.log(response)
  }

  async updateSetMutation(params: UpdateSetParams) {
    const updatedSet = {...params.set}

    if(
      params.set.name !== params.name ||
      params.set.watermarkPath !== params.watermarkPath ||
      params.set.order !== params.order
    ) {
      const response = await this.client.models.PhotoSet.update({
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

  async reorderPathsMutation(params: ReorderPathsParams) {
    let orderedPaths = params.fullRefetch ? (
      (await getAllPaths(this.client, params.fullRefetch.setId))
        .sort((a, b) => params.fullRefetch?.order === 'DSC' ? 
          parsePathName(b.path).localeCompare(parsePathName(a.path)) : 
          parsePathName(a.path).localeCompare(parsePathName(b.path))
        )
    ) : params.paths
    
    const updatedPathsResponse = await Promise.all(orderedPaths
      .map((path) => {
        const response = this.client.models.PhotoPaths.update({
          id: path.id,
          order: path.order,
        })
        return response
      })
    )
    if(params.options?.logging) console.log(updatedPathsResponse)
  }

  async uploadImagesMutation(params: UploadImagesMutationParams){
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
    const batchSize = 100
    const allFiles = [...params.files.values()]
    const batches = Math.ceil(allFiles.length / batchSize)
    let successfulItems = 0

    for(let batch = 0; batch < batches; batch++) {
      const startIndex = batch * batchSize
      const endIndex = Math.min(startIndex + batchSize, allFiles.length)
      const filesBatch = allFiles.slice(startIndex, endIndex)

      const response = (await Promise.all(filesBatch.map(async (file, index) => {
        const duplicate = params.duplicates[file.file.name]
        if(duplicate !== undefined){
          const result = await remove({
            path: duplicate.path
          })

          if(params.options?.logging) console.log(result)
        }
        let prevUploadAmount = -1

        let path: string | undefined
        let attempts = 0
        while(attempts < 5) {
          try {
            const result = uploadData({
              path: `photo-collections/${params.collection.id}/${params.set.id}/${v4()}_${file.file.name}`,
              data: file.file,
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
            })

            path = (await result.result).path
            break;
          } catch(err) {
            attempts += 1
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts))
          }
        }

        if(!path) return false
        let mappedPath: PicturePath | undefined
        if(params.options?.logging) console.log(path)

        if(duplicate !== undefined){
            const response = await this.client.models.PhotoPaths.update({
              id: duplicate.id,
              path: path,
              width: file.width,
              height: file.height
            })
            if(params.options?.logging) console.log(response)
            if(!response || !response.data || response.errors !== undefined) return false
            mappedPath = {
              ...response.data,
              favorite: duplicate.favorite,
              url: ''
            }
        } else {
          const response = await this.client.models.PhotoPaths.create({
            path: path,
            order: index + params.set.paths.length + (batch * batchSize),
            setId: params.set.id,
            width: file.width,
            height: file.height
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
        params.parentUpdateSet((prev) => prev?.id === params.set.id ? ({
          ...prev,
          paths: [...prev.paths, mappedPath],
          items: prev.items + (duplicate ? 0 : 1),
        }) : prev)
        params.parentUpdateCollection((prev) => prev?.id === params.collection.id ? ({
          ...prev,
          sets: prev.sets.map((set) => set.id === params.set.id ? ({
            ...set,
            paths: [...set.paths, mappedPath],
            items: set.items + (duplicate ? 0 : 1),
          }) : set),
          items: prev.items + (duplicate ? 0 : 1)
        }) : prev)
        params.parentUpdateCollections((prev) => prev.map((collection) => collection.id === params.collection.id ? ({
          ...collection,
          sets: collection.sets.map((set) => set.id === params.set.id ? ({
            ...set,
            paths: [...set.paths, mappedPath],
            items: set.items + (duplicate ? 0 : 1),
          }) : set),
          items: collection.items + (duplicate ? 0 : 1)
        }) : collection))
        params.updateUpload((prev) => {
          return prev.map((upload) => {
            if(upload.id === params.uploadId){
              return {
                ...upload,
                currentItems: upload.currentItems + 1,
                state: 'inprogress'
              }
            }
            return upload
          })
        })
        return !duplicate
      }))).filter((item) => item)

      successfulItems += response.length

      if(batch < batches - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    const updateSetItemsResponse = this.client.models.PhotoSet.update({
        id: params.set.id,
        items: params.set.items + successfulItems
    })

    const collectionAmount = params.collection.sets.reduce((prev, cur) => prev + cur.items, 0)
    
    const updateCollectionItemsResponse = this.client.models.PhotoCollection.update({
      id: params.collection.id,
      items: successfulItems + collectionAmount
    })

    params.parentUpdateCollection(prev => prev ? ({
      ...prev,
      items: successfulItems + collectionAmount,
      sets: prev.sets.map((set) => set.id === params.set.id ? ({
        ...set,
        items: set.items + successfulItems,
      }) : set)
    }) : prev)
    params.parentUpdateCollections(prev => prev.map((collection) => collection.id === params.collection.id ? ({
      ...collection,
      items: successfulItems + collectionAmount,
      sets: collection.sets.map((set) => set.id === params.set.id ? ({
        ...set,
        items: set.items + successfulItems,
      }) : set)
    }) : collection))
    params.parentUpdateSet(prev => prev ? ({
      ...prev,
      items: prev.items + successfulItems,
    }) : prev)
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
    if(params.options?.logging) console.log(updateSetItemsResponse)
  }

  async deleteImagesMutation(params: DeleteImagesMutationParams){
    const temp = [...params.picturePaths]
    const response = await Promise.all(params.picturePaths.map(async (path) => {
      //removing path from s3
      const s3response = remove({
        path: path.path
      })
      //deleting from dynamo
      const pathsresponse = await this.client.models.PhotoPaths.delete({
        id: path.id,
      })
      //removing favorites
      if(pathsresponse.data) {
        let favoritesResponse = await pathsresponse.data.favorites()
        const favoritesData = favoritesResponse.data

        while(favoritesResponse.nextToken) {
          favoritesResponse = await pathsresponse.data.favorites({ nextToken: favoritesResponse.nextToken })
          favoritesData.push(...favoritesResponse.data)
        }

        await Promise.all(favoritesData.map((favorite) => {
          return this.client.models.UserFavorites.delete({ id: favorite.id })
        }))
      }

      temp.shift()
      if(params.progress) params.progress(temp)
      return [s3response, pathsresponse]
    }))
    if(params.options?.logging) console.log(response)
    
    const adjustColItemsResponse = this.client.models.PhotoCollection.update({
      id: params.collection.id,
      items: params.collection.items - params.picturePaths.length
    })

    if(params.options?.logging) console.log(adjustColItemsResponse)

    const adjustSetItemsResponse = this.client.models.PhotoSet.update({
      id: params.set.id,
      items: params.set.items - params.picturePaths.length
    })

    if(params.options?.logging) console.log(adjustSetItemsResponse)
  }

  async deleteSetMutation(params: DeleteSetMutationParams){
    //need to get all paths first
    const paths = await getAllPaths(this.client, params.set.id)
    //delete all of the images in the set
    await this.deleteImagesMutation({
      collection: params.collection,
      set: params.set,
      picturePaths: paths,
      options: params.options,
    })

    //delete set
    const deleteSetResponse = this.client.models.PhotoSet.delete({ id: params.set.id })

    if(params.options?.logging) console.log(deleteSetResponse)

    //reorder set
    const setUpdatesResponses = Promise.all(params.collection.sets
      .filter((set) => set.id !== params.set.id)
      .sort((a, b) => a.order - b.order)
      .map(async (set, index) => {
        const response = this.client.models.PhotoSet.update({
          id: set.id,
          order: index
        })
        return response
      })
    )

    if(params.options?.logging) console.log(setUpdatesResponses)
  }

  async favoriteImageMutation(params: FavoriteImageMutationParams): Promise<[string, string] | undefined> {
    const response = await this.client.models.UserFavorites.create({
      pathId: params.pathId,
      participantId: params.participantId,
      collectionId: params.collectionId
    })
    if(params.options?.logging) console.log(response)
    if(!response.data?.id) return undefined
    return [response.data.id, params.pathId]
  }

  async unfavoriteImageMutation(params: UnfavoriteImageMutationParams){
    const response = this.client.models.UserFavorites.delete({
      id: params.id,
    })
    if(params.options?.logging) console.log(response)
  }

  getPhotoSetByIdQueryOptions = (setId?: string, options?: GetPhotoSetByIdOptions) => queryOptions({
    queryKey: ['photoSet', setId, options],
    queryFn: () => getPhotoSetById(this.client, setId, options),
  })

  getFavoritesFromPhotoCollectionQueryOptions = (collection: PhotoCollection, options?: GetFavoritesFromPhotoCollectionOptions) => queryOptions({
    queryKey: ['favorites', collection, options],
    queryFn: () => getFavoritesFromPhotoCollection(this.client, collection, options)
  })
}