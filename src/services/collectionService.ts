import { CoverType, Participant, PhotoCollection, PhotoSet, PicturePath, UserTag, Watermark } from "../types";
import { Schema } from "../../amplify/data/resource";
import { V6Client } from '@aws-amplify/api-graphql'
import { queryOptions } from '@tanstack/react-query'
import { downloadData, getUrl, remove, uploadData } from "aws-amplify/storage";
import { parsePathName } from "../utils";
import { getAllPaths } from "./photoPathService";
import { mapParticipant } from "./userService";

interface MapCollectionOptions {
  siTags?: boolean
  siSets?: boolean
  siPaths?: boolean
  unauthenticated?: boolean
  participantId?: string,
}
async function mapCollection(collectionResponse: Schema['PhotoCollection']['type'], options?: MapCollectionOptions): Promise<PhotoCollection> {
  const mappedSets: PhotoSet[] = []
  const mappedTags: UserTag[] = []
  if(!options || options.siSets){
    let setsResponse = await collectionResponse.sets({ authMode: options?.unauthenticated ? 'identityPool' : 'userPool' })
    let setData = setsResponse.data

    while(setsResponse.nextToken) {
      setsResponse = await collectionResponse.sets({ 
        nextToken: setsResponse.nextToken, 
        authMode: options?.unauthenticated ? 'identityPool' : 'userPool' 
      })
      setData.push(...setsResponse.data)
    }

    mappedSets.push(...await Promise.all(setData.map(async (set) => {
      let mappedPaths: PicturePath[] = []
      if(options?.siPaths) {
        let pathResponse = await set.paths({
          authMode: options?.unauthenticated ? 'identityPool' : 'userPool' 
        })
        let pathData = pathResponse.data

        while(pathResponse.nextToken) {
          pathResponse = await set.paths({ 
            nextToken: pathResponse.nextToken,
            authMode: options?.unauthenticated ? 'identityPool' : 'userPool'  
          })
          pathData.push(...pathResponse.data)
        }

        mappedPaths.push(...(await Promise.all(
          pathData.map(async (path) => {
            let favorite: string | undefined
            if(options?.participantId){
              favorite = (await path.favorites()).data.find((favorite) => favorite.participantId === options.participantId)?.id
            }
            return ({ ...path, favorites: favorite, url: '' })
          })))
        )
      }

      const mappedSet: PhotoSet = {
        ...set,
        watermarkPath: set.watermarkPath ?? undefined,
        paths: mappedPaths,
        items: set.items ?? 0
      }
      return mappedSet
    })))
  }

  if(!options || options.siTags){
    let tagResponse = await collectionResponse.tags()
    let tagData = tagResponse.data

    while(tagResponse.nextToken) {
      tagResponse = await collectionResponse.tags({ nextToken: tagResponse.nextToken })
      tagData.push(...tagResponse.data)
    }

    mappedTags.push(...(await Promise.all(tagData.map(async (collTag) => {
      let tag = await collTag.tag()
      if(!tag || !tag.data) return
      const mappedTag: UserTag = {
        ...tag.data,
        color: tag.data.color ?? undefined,
        notifications: undefined,
        //TODO: implement children
        children: [],
        participants: []
      }
      return mappedTag
    }))).filter((tag) => tag !== undefined))
  }
  
  const mappedCollection: PhotoCollection = {
    ...collectionResponse,
    coverPath: collectionResponse.coverPath ?? undefined,
    coverType: {
      textColor: collectionResponse.coverType?.textColor ?? undefined,
      bgColor: collectionResponse.coverType?.bgColor ?? undefined,
      placement: collectionResponse.coverType?.placement ?? undefined,
      textPlacement: collectionResponse.coverType?.textPlacement ?? undefined,
      date: collectionResponse.coverType?.date ?? undefined
    },
    publicCoverPath: collectionResponse.publicCoverPath ?? undefined,
    downloadable: collectionResponse.downloadable ?? false,
    watermarkPath: collectionResponse.watermarkPath ?? undefined,
    tags: mappedTags,
    sets: mappedSets,
    items: collectionResponse.items ?? 0,
    published: collectionResponse.published ?? false,
  }

  return mappedCollection
}

interface GetAllCollectionsOptions extends MapCollectionOptions{
    metric?: boolean,
    logging?: boolean
}
async function getAllPhotoCollections(client: V6Client<Schema>, options?: GetAllCollectionsOptions): Promise<PhotoCollection[]> {
    const start = new Date().getTime()

    let collectionResponse = await client.models.PhotoCollection.list()
    let collectionData = collectionResponse.data

    while(collectionResponse.nextToken) {
      collectionResponse = await client.models.PhotoCollection.list({ nextToken: collectionResponse.nextToken })
      collectionData.push(...collectionResponse.data)
    }

    const mappedCollections: PhotoCollection[] = await Promise.all(
      collectionData.map((collection) => {
        if(options?.logging) console.log(collection)
        return mapCollection(collection, options)
      })
    )
    const end = new Date().getTime()

    if(options?.metric) console.log(`GETALLPHOTOCOLLECTIONS:${new Date(end - start).getTime()}ms`)
    return mappedCollections
}

interface GetAllCollectionsFromUserTagIdOptions extends MapCollectionOptions {
  collectionsMemo?: PhotoCollection[]
}
export async function getAllCollectionsFromUserTagId(client: V6Client<Schema>, tagId?: string, options?: GetAllCollectionsFromUserTagIdOptions): Promise<PhotoCollection[]> {
  const collections: PhotoCollection[] = []

  if(!tagId) return collections

  let collectionsResponse = await client.models.CollectionTag.listCollectionTagByTagId({
    tagId: tagId
  })
  const collectionsData = collectionsResponse.data

  while(collectionsResponse.nextToken) {
    collectionsResponse = await client.models.CollectionTag.listCollectionTagByTagId(
      { tagId: tagId }, 
      { nextToken: collectionsResponse.nextToken }
    )
    collectionsData.push(...collectionsResponse.data)
  }

  collections.push(...(await Promise.all(
    collectionsData.map(async (collection) => {
      const foundCollection = options?.collectionsMemo?.find((mCol) => mCol.id === collection.collectionId)
      if(foundCollection) return foundCollection
      const collectionResponse = (await collection.collection()).data
      if(collectionResponse !== null) {
        return mapCollection(collectionResponse, options)
      }
    })
  )).filter((collection) => collection !== undefined))

  return collections
}

interface GetAllCollectionsFromUserTagIdsOptions extends GetAllCollectionsFromUserTagIdOptions { }
export async function getAllCollectionsFromUserTagIds(client: V6Client<Schema>, tagIds: string[], options?: GetAllCollectionsFromUserTagIdsOptions): Promise<PhotoCollection[]> {
    console.log('api call')

    const tempMemo: PhotoCollection[] = options?.collectionsMemo ?? []

    const collections: PhotoCollection[] = (await Promise.all(
      tagIds.map(async (tagId) => {
        let collectionTagsResponse = await client.models.CollectionTag.listCollectionTagByTagId({ tagId: tagId })
        let collectionTagsData = collectionTagsResponse.data

        while(collectionTagsResponse.nextToken) {
          collectionTagsResponse = await client.models.CollectionTag.listCollectionTagByTagId({ tagId: tagId }, { nextToken: collectionTagsResponse.nextToken })
          collectionTagsData.push(...collectionTagsResponse.data)
        }

        const mappedCollections: PhotoCollection[] = (await Promise.all(
          collectionTagsData.map(async (collectionTag) => {
            const foundCollection = tempMemo.find((mCol) => mCol.id === collectionTag.collectionId)
            if(foundCollection) return //no duplicates

            const collectionResponse = await collectionTag.collection()
            if (
              !collectionResponse.data || 
              !collectionResponse.data 
            ) return
            
            const collection = await mapCollection(collectionResponse.data, options)
            tempMemo.push(collection)

            return collection
          })
        )).filter((collection) => collection !== undefined)

        return mappedCollections
      }))
    ).reduce((prev, cur) => {
      cur.forEach((collection) => {
        if(prev.find((col) => col.id === collection.id) === undefined) {
          prev.push(collection)
        }
      })
      return prev
    }, [])
    
    return collections
}

interface GetAllWatermarkObjectsOptions {
    resolveUrl?: boolean
}
async function getAllWatermarkObjects(client: V6Client<Schema>, options?: GetAllWatermarkObjectsOptions): Promise<Watermark[]> {
    console.log('api call')
    const watermarksResponse = await client.models.Watermark.list()
    return Promise.all(watermarksResponse
      .data.map(async (watermark) => {
        const url = options?.resolveUrl ? (
          (await getUrl({
            path: watermark.path
          })).url.toString() 
        ) : (
          ''
        )
        const mappedWatermark: Watermark = {
          id: watermark.id,
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

async function getPath(path?: string, id?: string): Promise<[string | undefined, string]> {
  // console.log('api call', path)
  if(!path) return [id, '']
  return [id, (await getUrl({
    path: path
  })).url.toString()]
}

interface GetPhotoCollectionByIdOptions extends MapCollectionOptions { }
export async function getCollectionById(client: V6Client<Schema>, collectionId?: string, options?: GetPhotoCollectionByIdOptions): Promise<PhotoCollection | null> {
  if(!collectionId) return null
  console.log('api call')
  const collection = await client.models.PhotoCollection.get({ id: collectionId }, { authMode: options?.unauthenticated ? 'identityPool' : 'userPool' })
  if(!collection || !collection.data) return null
  
  return mapCollection(collection.data, options)
}

interface GetAllCollectionParticipantsOptions {
    siTags?: boolean
}
async function getAllCollectionParticipants(client: V6Client<Schema>, collectionId: string, options?: GetAllCollectionParticipantsOptions): Promise<Participant[]> {
    const collectionResponse = await client.models.PhotoCollection.get({ id: collectionId })
    const participants: Participant[] = []
    if(collectionResponse.data) {
        let participantTagResponse = await collectionResponse.data.participants()
        const participantTagData = participantTagResponse.data

        while(participantTagResponse.nextToken) {
            participantTagResponse = await collectionResponse.data.participants({ nextToken: participantTagResponse.nextToken })
            participantTagData.push(...participantTagResponse.data)
        }


        participants.push(...(await Promise.all(participantTagData.map(async (tagResponse) => {
            const participant = await tagResponse.participant()
            if(participant.data) {
              const newParticipant = await mapParticipant(participant.data, {
                  siCollections: false,
                  siNotifications: false,
                  siTags: options?.siTags ? {
                      siChildren: false, 
                      siCollections: false,
                      siPackages: false,
                      siTimeslots: false
                  } : undefined,
                  siTimeslot: false,
              })
              return newParticipant
            }
        }))).filter((participant) => participant !== undefined))
    }
    return participants;
}

interface GetParticipantCollectionsOptions extends GetAllCollectionsFromUserTagIdOptions { }
async function getParticipantCollections(client: V6Client<Schema>, participantId?: string, options?: GetParticipantCollectionsOptions): Promise<PhotoCollection[]> {
  if(!participantId) return []

  const tempMemo: PhotoCollection[] = options?.collectionsMemo ?? []

  let collectionTagResponse = await client.models.ParticipantCollections.listParticipantCollectionsByParticipantId({ participantId: participantId })
  const collectionTagData = collectionTagResponse.data

  while(collectionTagResponse.nextToken) {
    collectionTagResponse = await client.models.ParticipantCollections.listParticipantCollectionsByParticipantId({ participantId: participantId }, { nextToken: collectionTagResponse.nextToken })
    collectionTagData.push(...collectionTagResponse.data)
  }

  const mappedCollections: PhotoCollection[] = (await Promise.all(collectionTagData.map(async (collectionTag) => {
    const foundCollection = tempMemo.find((col) => collectionTag.collectionId === col.id)
    if(foundCollection !== undefined) return foundCollection
    const collectionResponse = await collectionTag.collection()
    if(collectionResponse.data === null) return
    const mappedCollection = await mapCollection(collectionResponse.data, options)
    tempMemo.push(mappedCollection)
    return mappedCollection
  })))
    .filter((collection) => collection?.published)
    .filter((collection) => collection !== undefined)

  return mappedCollections
}

export interface CreateCollectionParams {
  collection: PhotoCollection
  options?: {
      logging: boolean
  },
}

export interface UpdateCollectionParams extends CreateCollectionParams {
    tags?: UserTag[],
    name: string,
    downloadable: boolean
    cover?: string
    published: boolean,
    watermark?: Watermark | null,
    items?: number,
    coverType?: CoverType
}

export interface PublishCollectionParams {
    collectionId: string,
    publishStatus: boolean,
    path: string,
    name: string,
    options?: {
        logging?: boolean
    }
}

export interface DeleteCollectionParams {
    collectionId: string,
    options?: {
        logging: boolean
    }
}

export interface DeleteCoverParams {
    cover?: string,
    collectionId: string,
    replacement?: boolean,
    options?: {
        logging: boolean,
    }
}

export interface UploadCoverParams {
    cover: File,
    collectionId: string,
    options?: {
        logging: boolean
    }
}

export interface ReorderSetsParams {
  collectionId: string,
  sets: PhotoSet[],
  options?: {
    logging: boolean
  }
}

export interface AddCollectionParticipantParams {
    participantIds: string[],
    collectionId: string,
    options?: {
        logging?: boolean
    }
}

export interface RemoveCollectionParticipantParams extends AddCollectionParticipantParams {}

export interface RepairPathsParams {
  collectionId: string,
  setId: string,
  options?: {
    logging?: boolean
  }
}

export interface RepairItemCountsParams {
  collection: PhotoCollection,
  refetchAllSets?: boolean,
  options?: {
    logging?: boolean
  }
}

export class CollectionService {
  private client: V6Client<Schema>

  constructor(client: V6Client<Schema>) {
    this.client = client
  }

  async createCollectionMutation(params: CreateCollectionParams) {
    const collectionResponse = await this.client.models.PhotoCollection.create({
      id: params.collection.id,
      name: params.collection.name,
      downloadable: params.collection.downloadable,
      items: 0
    })
    if(params.options?.logging) console.log(collectionResponse)
  }

  async updateCollectionMutation(params: UpdateCollectionParams) {
    const newTags = (params.tags ?? []).filter((tag) => 
      !params.collection.tags.some((colTag) => colTag.id === tag.id))

    const removedTags = params.collection.tags.filter((colTag) => 
      !(params.tags ?? []).some((tag) => tag.id === colTag.id))

    if(params.options?.logging) console.log(newTags, removedTags)

    const createTagResponse = await Promise.all(newTags.map(async (tag) => {
      const response = this.client.models.CollectionTag.create({
        collectionId: params.collection.id,
        tagId: tag.id
      })
      return response
    }))
    if(params.options?.logging) console.log(createTagResponse)

    let collectionTagsResponse = await this.client.models.CollectionTag.listCollectionTagByCollectionId({ 
      collectionId: params.collection.id 
    })
    let collectionTagsData = collectionTagsResponse.data

    while(collectionTagsResponse.nextToken) {
      collectionTagsResponse = await this.client.models.CollectionTag.listCollectionTagByCollectionId({ 
        collectionId: params.collection.id 
      }, { 
        nextToken: collectionTagsResponse.nextToken 
      })
      collectionTagsData.push(...collectionTagsResponse.data)
    }

    const removeTagsResponse = await Promise.all(
      collectionTagsData
      .map(async (colTag) => {
        if(removedTags.some((tag) => tag.id === colTag.tagId)) {
          const response = this.client.models.CollectionTag.delete({
            id: colTag.id
          })
          return response
        }
      })
    )
    if(params.options?.logging) console.log(removeTagsResponse)
    
    if(params.name !== params.collection.name || 
      params.downloadable !== params.collection.downloadable ||
      (params.cover && parsePathName(params.cover) !== parsePathName(params.collection.coverPath ?? '')) ||
      params.published !== params.collection.published ||
      (params.watermark && parsePathName(params.watermark.path) !== parsePathName(params.collection.watermarkPath ?? '')) ||
      ( 
        params.coverType?.bgColor !== params.collection.coverType?.bgColor ||
        params.coverType?.textColor !== params.collection.coverType?.textColor ||
        params.coverType?.placement !== params.collection.coverType?.placement ||
        params.coverType?.textPlacement !== params.collection.coverType?.textPlacement ||
        params.coverType?.date !== params.collection.coverType?.date
      )
    ) {
      const response = await this.client.models.PhotoCollection.update({
        id: params.collection.id,
        downloadable: params.downloadable,
        name: params.name,
        coverPath: params.cover === undefined ? undefined : 
            params.cover !== null ? parsePathName(params.cover) : null,
        published: params.published,
        watermarkPath: params.watermark?.path ? parsePathName(params.watermark.path) : null,
        items: params.items ? params.items : params.collection.items,
        coverType: {
        textColor: params.coverType ? params.coverType.textColor ?? null : params.collection.coverType?.textColor,
        bgColor: params.coverType ? params.coverType.bgColor ?? null : params.collection.coverType?.bgColor,
        placement: params.coverType ? params.coverType.placement ?? null : params.collection.coverType?.placement,
        textPlacement: params.coverType ? params.coverType.textPlacement ?? null : params.collection.coverType?.textPlacement,
        date: params.coverType ? params.coverType.date ?? null : params.collection.coverType?.date,
        }
      })
      if(params.options?.logging) console.log(response)
    }
  }

  async publishCollectionMutation(params: PublishCollectionParams): Promise<string | undefined> {
    try{
      if(params.publishStatus){
        const responsePublishPublic = await this.client.queries.AddPublicPhoto({
          path: params.path,
          type: 'cover',
          name: params.name
        })

        if(params.options?.logging) console.log(responsePublishPublic, responsePublishPublic.data)
        if(!responsePublishPublic.data) return

        const response = await this.client.models.PhotoCollection.update({
          id: params.collectionId,
          publicCoverPath: responsePublishPublic.data,
          published: true
        })

        if(params.options?.logging) console.log(response)

        return responsePublishPublic.data
      }
      else {
        const responsePublic = this.client.queries.DeletePublicPhoto({ path: params.path })

        if(params.options?.logging) console.log(responsePublic)
        
        const response = await this.client.models.PhotoCollection.update({
          id: params.collectionId,
          publicCoverPath: null,
          published: false
        })

        if(params.options?.logging) console.log(response)
      }
    } catch(err){
      console.error(err)
    }
  }

  //TODO: delete linkages -> participant collections -> favorites -> collection tags explore more
  async deleteCollectionMutation(params: DeleteCollectionParams) {
    const collection = await getCollectionById(this.client, params.collectionId, { siPaths: true, siSets: true })
    
    if(!collection) return

    if(collection.publicCoverPath) {
      const responsePublic = await this.client.queries.DeletePublicPhoto({ path: collection.publicCoverPath })
  
      if(params.options?.logging) console.log(responsePublic)
    }

    const deletePathsResponse = await Promise.all(
      (await Promise.all(collection.sets.map(async (set) => {
        const response = this.client.models.PhotoSet.delete({
          id: set.id,
        })
        if(params.options?.logging) console.log(response)
        return set.paths
      })))
      .reduce((prev, cur) => [...prev, ...(cur.filter((path) => prev.some((prePath) => prePath.id === path.id)))], [])
      .map(async (path) => {
        const s3response = remove({
          path: path.path,
        })
        const dynamoResponse = this.client.models.PhotoPaths.delete({
          id: path.id
        })
        return {
          s3: s3response,
          dynamo: dynamoResponse
        }
      })
    )
    if(params.options?.logging) console.log(deletePathsResponse)

    const response = await this.client.models.PhotoCollection.delete({
      id: params.collectionId
    })
    if(params.options?.logging) console.log(response)
  }

  async deleteCoverMutation(params: DeleteCoverParams){
    if(!params.cover) return
    const s3response = remove({
      path: params.cover,
    })

    if(params.options?.logging) console.log(s3response)

    if(!params.replacement){
      const dynamoResponse = await this.client.models.PhotoCollection.update({
        id: params.collectionId,
        coverPath: null,
      })
      if(params.options?.logging) console.log(dynamoResponse)
    }
  }

  async uploadCoverMutation(params: UploadCoverParams){
    const s3response = await uploadData({
        path: `photo-collections/covers/${params.collectionId}_${params.cover.name}`,
        data: params.cover,
    }).result
    
    const dynamoResponse = this.client.models.PhotoCollection.update({
        id: params.collectionId,
        coverPath: s3response.path,
    })

    if(params.options?.logging) console.log(s3response, dynamoResponse)
    
    return s3response.path
  }

  //TODO: make me more performant (less api calls)
  async reorderSetsMutation(params: ReorderSetsParams){
    const response = await Promise.all(params.sets.map(async (set) => {
      const dynamoResponse = await this.client.models.PhotoSet.update({
        id: set.id,
        order: set.order,
      })
      return dynamoResponse
    }))

    if(params.options?.logging) console.log(response)
  }

  //TODO: validate that the participants already do not have a existing collection
  async addCollectionParticipantMutation(params: AddCollectionParticipantParams) {
    const responses = await Promise.all(params.participantIds.map((id) => {
      return this.client.models.ParticipantCollections.create({
        participantId: id,
        collectionId: params.collectionId,
      })
    }))

    if(params.options?.logging) console.log(responses)
  }

  async removeCollectionParticipantMutation(params: RemoveCollectionParticipantParams) {
    let findTagsResponse = await this.client.models.ParticipantCollections
    .listParticipantCollectionsByCollectionId({ 
      collectionId: params.collectionId 
    })
    const findTagsData = findTagsResponse.data

    while(findTagsResponse.nextToken) {
      findTagsResponse = await this.client.models.ParticipantCollections
      .listParticipantCollectionsByCollectionId({ 
        collectionId: params.collectionId 
      }, { 
        nextToken: findTagsResponse.nextToken 
      })
      
      findTagsData.push(...findTagsResponse.data)
    }

    const responses = Promise.all(params.participantIds.map((id) => {
      const response = findTagsData.find((tag) => tag.participantId === id)

      if(params.options?.logging) console.log(response)

      if(response) {
        return this.client.models.ParticipantCollections.delete({ id: response.id })
      }
    }))

    if(params.options?.logging) console.log(responses)
  }

  async repairPathsMutation(params: RepairPathsParams) {
    const repairPathsResponse = await this.client.queries.RepairPaths({
      collection: params.collectionId,
      set: params.setId
    })

    if(params.options?.logging) console.log(repairPathsResponse)

    if(repairPathsResponse.data) {
      try {
        const returnResponse = JSON.parse(repairPathsResponse.data) as 
        {
          paths: PicturePath[],
          responses: {
            set: any,
            paths: any,
          }
        }

        if(params.options?.logging) console.log(returnResponse.responses)
        return returnResponse.paths
      } catch(err) {
        //TODO: better error handling
        if(params.options?.logging) console.log(err)
        return undefined
      }
    }
  }

  async repairItemCountMutation (params: RepairItemCountsParams): Promise<PhotoCollection | undefined> {
    const collectionResponse = params.refetchAllSets ?
      await getCollectionById(this.client, params.collection.id, {
        siPaths: false,
        siSets: true,
        siTags: false,
      }) : params.collection

    if(collectionResponse) {
      
      //TODO: potential for preformance increase
      const updatedSets: { 
        response: Schema['PhotoSet']['updateType'] | null, 
        set: PhotoSet 
      }[] = await Promise.all(collectionResponse.sets
        .map(async (set) => {
          const paths = await getAllPaths(this.client, set.id)

          const updateSetResponse = (await this.client.models.PhotoSet.update({
            id: set.id,
            items: paths.length
          })).data

          return ({
            response: updateSetResponse,
            set: {
              ...set,
              items: paths.length
            }
          })
        })
      )

      if(params.options?.logging) console.log(updatedSets.map((set) => set.response))

      const itemCount = updatedSets
        .map((set) => set.set)
        .reduce((prev, cur) => prev += cur.items, 0)

      const updateResponse = await this.client.models.PhotoCollection.update({
        id: collectionResponse.id,
        items: itemCount
      })

      if(params.options?.logging) console.log(updateResponse)

        //TODO: do a performative update to dipslay updated item count
      return {
        ...params.collection,
        sets: updatedSets.map((set) => set.set),
        items: itemCount
      }
    }
  }

  getAllCollectionsFromUserTagIdQueryOptions = (tagId?: string, options?: GetAllCollectionsFromUserTagIdsOptions) => queryOptions({
    queryKey: ['tag-PhotoCollection', tagId, options],
    queryFn: () => getAllCollectionsFromUserTagId(this.client, tagId, options)
  })

  getAllCollectionsFromUserTagIdsQueryOptions = (tags: string[], options?: GetAllCollectionsFromUserTagIdsOptions) => queryOptions({
    queryKey: ['photoCollection', tags, options],
    queryFn: () => getAllCollectionsFromUserTagIds(this.client, tags, options)
  })

  getAllWatermarkObjectsQueryOptions = (options?: GetAllWatermarkObjectsOptions) => queryOptions({
    queryKey: ['watermark', options],
    queryFn: () => getAllWatermarkObjects(this.client, options),
    gcTime: 1000 * 15 * 60 //15 minutes
  })

  getPathsDataMapFromPathsQueryOptions = (paths: PicturePath[]) => queryOptions({
    queryKey: ['photoPaths', paths],
    queryFn: () => getPathsDataMapFromPaths(paths),
    gcTime: 1000 * 15 * 60 //15 minutes
  })

  getPathQueryOptions = (path?: string, id?: string) => queryOptions({
    queryKey: ['path', path, id],
    queryFn: () => getPath(path, id)
  })

  getPhotoCollectionByIdQueryOptions = (collectionId?: string, options?: GetPhotoCollectionByIdOptions) => queryOptions({
    queryKey: ['photoCollection', collectionId, options],
    queryFn: () => getCollectionById(this.client, collectionId, options)
  })

  getAllPhotoCollectionsQueryOptions = (options?: GetAllCollectionsOptions) => queryOptions({
    queryKey: ['photoCollections', options],
    queryFn: () => getAllPhotoCollections(this.client, options)
  })

  getAllCollectionParticipantsQueryOptions = (collectionId: string, options?: GetAllCollectionParticipantsOptions) => queryOptions({
    queryKey: ['collectionParticipants', collectionId, options],
    queryFn: () => getAllCollectionParticipants(this.client, collectionId, options)
  })
  
  getParticipantCollectionsQueryOptions = (participantId?: string, options?: GetParticipantCollectionsOptions) => queryOptions({
    queryKey: ['participantCollections', participantId, options],
    queryFn: () => getParticipantCollections(this.client, participantId, options)
  })
}