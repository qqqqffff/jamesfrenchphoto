import { CoverType, Participant, PhotoCollection, PhotoSet, PicturePath, UserTag, Watermark } from "../types";
import { Schema } from "../../amplify/data/resource";
import { V6Client } from '@aws-amplify/api-graphql'
import { queryOptions } from '@tanstack/react-query'
import { generateClient } from "aws-amplify/api";
import { downloadData, getUrl, remove, uploadData } from "aws-amplify/storage";
import { parsePathName } from "../utils";
import { getAllPaths } from "./photoPathService";
import { mapParticipant } from "./userService";

const client = generateClient<Schema>()

interface GetAllCollectionsOptions {
    siTags?: boolean
    siSets?: boolean
    siPaths?: boolean,
    metric?: boolean,
    logging?: boolean
}
async function getAllPhotoCollections(client: V6Client<Schema>, options?: GetAllCollectionsOptions): Promise<PhotoCollection[]> {
    console.log('api call')
    const start = new Date().getTime()

    let collectionResponse = await client.models.PhotoCollection.list()
    let collectionData = collectionResponse.data

    while(collectionResponse.nextToken) {
      collectionResponse = await client.models.PhotoCollection.list({ nextToken: collectionResponse.nextToken })
      collectionData.push(...collectionResponse.data)
    }

    const mappedCollections: PhotoCollection[] = await Promise.all(
      collectionData.map(async (collection) => {
        if(options?.logging) console.log(collection)
        const mappedSets: PhotoSet[] = []
        const mappedTags: UserTag[] = []
        if(!options || options.siSets){
          let setsResponse = await collection.sets()
          let setData = setsResponse.data

          while(setsResponse.nextToken) {
            setsResponse = await collection.sets({ nextToken: setsResponse.nextToken })
            setData.push(...setsResponse.data)
          }

          mappedSets.push(...await Promise.all(setData.map(async (set) => {
            let mappedPaths: PicturePath[] = []
            if(options?.siPaths) {
              let pathResponse = await set.paths()
              let pathData = pathResponse.data

              while(pathResponse.nextToken) {
                pathResponse = await set.paths({ nextToken: pathResponse.nextToken })
                pathData.push(...pathResponse.data)
              }

              mappedPaths.push(...(pathData.map((path) => ({ ...path, url: '' }))))
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
          let tagResponse = await collection.tags()
          let tagData = tagResponse.data

          while(tagResponse.nextToken) {
            tagResponse = await collection.tags({ nextToken: tagResponse.nextToken })
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
              children: []
            }
            return mappedTag
          }))).filter((tag) => tag !== undefined))
        }
        
        const mappedCollection: PhotoCollection = {
          ...collection,
          coverPath: collection.coverPath ?? undefined,
          coverType: {
            textColor: collection.coverType?.textColor ?? undefined,
            bgColor: collection.coverType?.bgColor ?? undefined,
            placement: collection.coverType?.placement ?? undefined,
            textPlacement: collection.coverType?.textPlacement ?? undefined,
            date: collection.coverType?.date ?? undefined
          },
          publicCoverPath: collection.publicCoverPath ?? undefined,
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
    const end = new Date().getTime()

    if(options?.metric) console.log(`GETALLPHOTOCOLLECTIONS:${new Date(end - start).getTime()}ms`)
    return mappedCollections
}

interface GetAllCollectionsFromUserTagsOptions {
    siTags?: boolean
    siSets?: boolean
    siPaths?: boolean
    collectionsMemo?: PhotoCollection[]
}
export async function getAllCollectionsFromUserTags(client: V6Client<Schema>, tags: UserTag[], options?: GetAllCollectionsFromUserTagsOptions): Promise<PhotoCollection[]> {
    console.log('api call')
    const collections: PhotoCollection[] = (await Promise.all(tags.map(async (tag) => {
      let collectionTagsResponse = await client.models.CollectionTag.listCollectionTagByTagId({ tagId: tag.id })
      let collectionTagsData = collectionTagsResponse.data

      while(collectionTagsResponse.nextToken) {
        collectionTagsResponse = await client.models.CollectionTag.listCollectionTagByTagId({ tagId: tag.id }, { nextToken: collectionTagsResponse.nextToken })
        collectionTagsData.push(...collectionTagsResponse.data)
      }

      const mappedCollections: PhotoCollection[] = (await Promise.all(collectionTagsData.map(async (collectionTag) => {
        const collectionResponse = await collectionTag.collection()
        if (
          !collectionResponse.data || 
          !collectionResponse.data || 
          options?.collectionsMemo?.some((collection) => collection.id === collectionResponse.data?.id)
        ) return
        const tags: UserTag[] = []
        
        if(!options || options.siTags){
          let tagsResponse = await collectionResponse.data.tags()
          let tagsData = tagsResponse.data

          while(tagsResponse.nextToken) {
            tagsResponse = await collectionResponse.data.tags({ nextToken: tagsResponse.nextToken })
            tagsData.push(...tagsResponse.data)
          }

          tags.push(...(await Promise.all(tagsData.map(async (collTag) => {
            const tag = await collTag.tag()
            if(!tag || !tag.data) return
            const mappedTag: UserTag = {
                ...tag.data,
                color: tag.data.color ?? undefined,
                notifications: undefined,
                //TODO: implement children
                children: []
            }
            return mappedTag
          }))).filter((tag) => tag !== undefined))
        }

        const sets: PhotoSet[] = []

        if(options?.siSets) {
          let setsResponse = await collectionResponse.data.sets()
          let setsData = setsResponse.data

          while(setsResponse.nextToken) {
              setsResponse = await collectionResponse.data.sets({ nextToken: setsResponse.nextToken })
              setsData.push(...setsResponse.data)
          }

          sets.push(...(await Promise.all(setsData.map(async (set) => {
            const mappedPaths: PicturePath[] = []
            if(options.siPaths) {
              let pathsResponse = await set.paths()
              let pathsData = pathsResponse.data

              while(pathsResponse.nextToken) {
                pathsResponse = await set.paths({ nextToken: pathsResponse.nextToken })
                pathsData.push(...pathsResponse.data)
              }

              mappedPaths.push(...pathsData.map((path) => {
                const mappedPath: PicturePath = {
                  ...path,
                  url: ''
                }
                return mappedPath
              }))
            }

            const mappedSet: PhotoSet = {
              ...set,
              watermarkPath: set.watermarkPath ?? undefined,
              paths: mappedPaths,
              items: set.items ?? 0
            }

            return mappedSet
          }))))
        }

        const mappedCollection: PhotoCollection = {
          ...collectionResponse.data,
          coverPath: collectionResponse.data.coverPath ?? undefined,
          publicCoverPath: collectionResponse.data.publicCoverPath ?? undefined,
          coverType: {
            textColor: collectionResponse.data.coverType?.textColor ?? undefined,
            bgColor: collectionResponse.data.coverType?.bgColor ?? undefined,
            placement: collectionResponse.data.coverType?.placement ?? undefined,
            textPlacement: collectionResponse.data.coverType?.textPlacement ?? undefined,
            date: collectionResponse.data.coverType?.date ?? undefined
          },
          downloadable: collectionResponse.data.downloadable ?? false,
          watermarkPath: collectionResponse.data.watermarkPath ?? undefined,
          tags: tags,
          items: collectionResponse.data.items ?? 0,
          published: collectionResponse.data.published ?? false,
          sets: sets
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
  console.log('api call')
  if(!path) return [id, '']
  return [id, (await getUrl({
    path: path
  })).url.toString()]
}

interface GetPhotoCollectionByIdOptions {
  siTags?: boolean,
  siSets?: boolean,
  siPaths?: boolean,
  resolveUrls?: boolean,
  participantId?: string,
  unauthenticated?: boolean
}
//TODO: fix favorite secondary indexing
export async function getCollectionById(client: V6Client<Schema>, collectionId?: string, options?: GetPhotoCollectionByIdOptions): Promise<PhotoCollection | null> {
  if(!collectionId) return null
  console.log('api call')
  const collection = await client.models.PhotoCollection.get({ id: collectionId }, { authMode: options?.unauthenticated ? 'identityPool' : 'userPool'})
  if(!collection || !collection.data) return null
  const sets: PhotoSet[] = []
  if(!options || options.siSets){
    sets.push(...await Promise.all((await collection.data.sets(
      { authMode: options?.unauthenticated ? 'identityPool' : 'userPool'}
    )).data.map((async (set) => {
      const mappedPaths: PicturePath[] = []
      if(!options || options?.siPaths) {
        let pathsResponse = await set.paths()
        let paths = pathsResponse.data
        while(pathsResponse.nextToken) {
          pathsResponse = await set.paths({ nextToken: pathsResponse.nextToken })
          paths.push(...pathsResponse.data)
        }
        mappedPaths.push(...await Promise.all(paths.map(async (path) => {
          let favorite: undefined | string
          if(options?.participantId){
            favorite = (await path.favorites()).data.find((favorite) => favorite.participantId === options.participantId)?.id
          }
          const mappedPath: PicturePath = {
            ...path,
            url: options?.resolveUrls ? (
              await getUrl({
                path: path.path,
              })
            ).url.toString() : '',
            favorite: favorite
          }
          return mappedPath
        })))
      }
      const mappedSet: PhotoSet = {
          ...set,
          watermarkPath: set.watermarkPath ?? undefined,
          paths: mappedPaths,
          items: set.items ?? 0
      }
      return mappedSet
    }))))


    //validate set order
    const orderedSets = [...sets].sort((a, b) => a.order - b.order)
    for(let i = 0; i < sets.length; i++) {
      if(orderedSets[i].order !== i) {
        reorderSetsMutation({
          collectionId: collectionId,
          sets: orderedSets.map((set, index) => ({ ...set, order: index }))
        })
      }
    }
  }

  
  const tags: UserTag[] = []
  if(!options || options.siTags){
    tags.push(...(await Promise.all((await collection.data.tags()).data.map(async (colTag) => {
      const tag = (await colTag.tag()).data
      if(!tag) return
      const mappedTag: UserTag = {
        ...tag,
        color: tag.color ?? undefined,
        notifications: undefined,
        //TODO: implement children
        children: []
      }
      return mappedTag
    }))).filter((tag) => tag !== undefined))
  }
  const mappedCollection: PhotoCollection = {
    ...collection.data,
    watermarkPath: collection.data.watermarkPath ?? undefined,
    downloadable: collection.data.downloadable ?? false,
    coverPath: collection.data.coverPath ?? undefined,
    publicCoverPath: collection.data.publicCoverPath ?? undefined,
    coverType: {
        textColor: collection.data.coverType?.textColor ?? undefined,
        bgColor: collection.data.coverType?.bgColor ?? undefined,
        placement: collection.data.coverType?.placement ?? undefined,
        textPlacement: collection.data.coverType?.textPlacement ?? undefined,
        date: collection.data.coverType?.date ?? undefined
    },
    items: collection.data.items ?? 0,
    published: collection.data.published ?? false,
    sets: sets.sort((a, b) => a.order - b.order),
    tags: tags,
  }
  return mappedCollection
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

interface GetParticipantCollectionsOptions {
    siTags?: boolean
    siSets?: boolean
    siPaths?: boolean
}
//TODO: improve with memoization
async function getParticipantCollections(client: V6Client<Schema>, participantId?: string, options?: GetParticipantCollectionsOptions): Promise<PhotoCollection[]> {
    if(!participantId) return []
    let collectionTagResponse = await client.models.ParticipantCollections.listParticipantCollectionsByParticipantId({ participantId: participantId })
    const collectionTagData = collectionTagResponse.data

    while(collectionTagResponse.nextToken) {
      collectionTagResponse = await client.models.ParticipantCollections.listParticipantCollectionsByParticipantId({ participantId: participantId }, { nextToken: collectionTagResponse.nextToken })
      collectionTagData.push(...collectionTagResponse.data)
    }

    const mappedCollections: PhotoCollection[] = (await Promise.all(collectionTagData.map(async (collectionTag) => {
      const mappedCollection = await getCollectionById(client, collectionTag.collectionId, { ...options })
      return mappedCollection
    })))
      .filter((collection) => collection?.published)
      .filter((collection) => collection !== null)

    return mappedCollections
}

export interface CreateCollectionParams {
    name: string,
    tags?:  UserTag[],
    cover?: string,
    downloadable: boolean,
    options?: {
        logging: boolean
    },
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

    const taggingResponse = await Promise.all((params.tags ?? []).map(async (tag) => {
        const taggingResponse = await client.models.CollectionTag.create({
            collectionId: collectionResponse.data!.id,
            tagId: tag.id
        })
        return taggingResponse
    }))

    if(params.options?.logging) console.log(taggingResponse)

    let coverPath: string | undefined

    const returnedCollection: PhotoCollection = {
      ...collectionResponse.data,
      coverPath: coverPath,
      publicCoverPath: coverPath,
      coverType: {
        textColor: collectionResponse.data.coverType?.textColor ?? undefined,
        bgColor: collectionResponse.data.coverType?.bgColor ?? undefined,
        placement: collectionResponse.data.coverType?.placement ?? undefined,
        textPlacement: collectionResponse.data.coverType?.textPlacement ?? undefined,
        date: collectionResponse.data.coverType?.date ?? undefined
      },
      tags: params.tags ?? [],
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
    items?: number,
    coverType?: CoverType
}
export async function updateCollectionMutation(params: UpdateCollectionParams): Promise<PhotoCollection> {
  let updatedCollection = {
    ...params.collection
  }

  const newTags = (params.tags ?? []).filter((tag) => 
    !params.collection.tags.some((colTag) => colTag.id === tag.id))

  const removedTags = params.collection.tags.filter((colTag) => 
    !(params.tags ?? []).some((tag) => tag.id === colTag.id))

  if(params.options?.logging) console.log(newTags, removedTags)

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

  let collectionTagsResponse = await client.models.CollectionTag.listCollectionTagByCollectionId({ collectionId: params.collection.id })
  let collectionTagsData = collectionTagsResponse.data

  while(collectionTagsResponse.nextToken) {
    collectionTagsResponse = await client.models.CollectionTag.listCollectionTagByCollectionId({ collectionId: params.collection.id }, { nextToken: collectionTagsResponse.nextToken })
    collectionTagsData.push(...collectionTagsResponse.data)
  }

  const removeTagsResponse = await Promise.all(
    collectionTagsData
    .map(async (colTag) => {
      if(removedTags.some((tag) => tag.id === colTag.tagId)) {
        const response = await client.models.CollectionTag.delete({
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
    const response = await client.models.PhotoCollection.update({
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

    updatedCollection.name = params.name ?? params.collection.name
    updatedCollection.downloadable = params.downloadable ?? params.collection.downloadable
    updatedCollection.coverPath = params.cover ? parsePathName(params.cover) : params.collection.coverPath
    updatedCollection.published = params.published ?? params.collection.published
    updatedCollection.watermarkPath = params.watermark?.path ?? params.collection.watermarkPath
  }

  if(params.options?.logging) console.log(updatedCollection)

  return updatedCollection
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
export async function publishCollectionMutation(params: PublishCollectionParams): Promise<string | undefined> {
    try{
        if(params.publishStatus){
            const responsePublishPublic = await client.queries.AddPublicPhoto({
                path: params.path,
                type: 'cover',
                name: params.name
            })
    
            if(params.options?.logging) console.log(responsePublishPublic, responsePublishPublic.data)
            if(!responsePublishPublic.data) return
    
            const response = await client.models.PhotoCollection.update({
                id: params.collectionId,
                publicCoverPath: responsePublishPublic.data,
                published: true
            })
    
            if(params.options?.logging) console.log(response)
    
            return responsePublishPublic.data
        }
        else {
            const responsePublic = await client.queries.DeletePublicPhoto({ path: params.path })
    
            if(params.options?.logging) console.log(responsePublic)
            
            const response = await client.models.PhotoCollection.update({
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

export interface DeleteCollectionParams {
    collectionId: string,
    options?: {
        logging: boolean
    }
}
export async function deleteCollectionMutation(params: DeleteCollectionParams) {
    const collection = await getCollectionById(client, params.collectionId, { siPaths: true, siSets: true })
    
    if(!collection) return

    if(collection.publicCoverPath) {
        const responsePublic = await client.queries.DeletePublicPhoto({ path: collection.publicCoverPath })
    
        if(params.options?.logging) console.log(responsePublic)
    }

    const deletePathsResponse = await Promise.all(
        (await Promise.all(collection.sets
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
        id: params.collectionId
    })
    if(params.options?.logging) console.log(response)
}

export interface DeleteCoverParams {
    cover?: string,
    collectionId: string,
    replacement?: boolean,
    options?: {
        logging: boolean,
    }
}
export async function deleteCoverMutation(params: DeleteCoverParams){
    if(!params.cover) return
    const s3response = await remove({
        path: params.cover,
    })

    if(params.options?.logging) console.log(s3response)

    if(!params.replacement){
        const dynamoResponse = await client.models.PhotoCollection.update({
            id: params.collectionId,
            coverPath: null,
        })
        if(params.options?.logging) console.log(dynamoResponse)
    }

}

export interface UploadCoverParams {
    cover: File,
    collectionId: string,
    options?: {
        logging: boolean
    }
}
export async function uploadCoverMutation(params: UploadCoverParams){
    const s3response = await uploadData({
        path: `photo-collections/covers/${params.collectionId}_${params.cover.name}`,
        data: params.cover,
    }).result
    
    const dynamoResponse = await client.models.PhotoCollection.update({
        id: params.collectionId,
        coverPath: s3response.path,
    })

    if(params.options?.logging) console.log(s3response, dynamoResponse)
    
    return s3response.path
}

export interface ReorderSetsParams {
  collectionId: string,
  sets: PhotoSet[],
  options?: {
    logging: boolean
  }
}
export async function reorderSetsMutation(params: ReorderSetsParams){
  const response = await Promise.all(params.sets.map(async (set) => {
    const dynamoResponse = await client.models.PhotoSet.update({
      id: set.id,
      order: set.order,
    })
    return dynamoResponse
  }))

  if(params.options?.logging) console.log(response)
}

export interface AddCollectionParticipantParams {
    participantIds: string[],
    collectionId: string,
    options?: {
        logging?: boolean
    }
}
export async function addCollectionParticipantMutation(params: AddCollectionParticipantParams) {
  const responses = await Promise.all(params.participantIds.map((id) => {
    return client.models.ParticipantCollections.create({
      participantId: id,
      collectionId: params.collectionId,
    })
  }))

  if(params.options?.logging) console.log(responses)
}

export interface RemoveCollectionParticipantParams extends AddCollectionParticipantParams {}
export async function removeCollectionParticipantMutation(params: RemoveCollectionParticipantParams) {
  let findTagsResponse = await client.models.ParticipantCollections
      .listParticipantCollectionsByCollectionId({ collectionId: params.collectionId })
  const findTagsData = findTagsResponse.data

  while(findTagsResponse.nextToken) {
    findTagsResponse = await client.models.ParticipantCollections
      .listParticipantCollectionsByCollectionId({ collectionId: params.collectionId }, { nextToken: findTagsResponse.nextToken })
    
      findTagsData.push(...findTagsResponse.data)
  }

  const responses = await Promise.all(params.participantIds.map((id) => {
    const response = findTagsData.find((tag) => tag.participantId === id)

    if(params.options?.logging) console.log(response)

    if(response) {
      return client.models.ParticipantCollections.delete({ id: response.id })
    }
  }))

  if(params.options?.logging) console.log(responses)
}

export interface RepairPathsParams {
  collectionId: string,
  setId: string,
  options?: {
    logging?: boolean
  }
}
export async function repairPathsMutation(params: RepairPathsParams) {
  const repairPathsResponse = await client.queries.RepairPaths({
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
      if(params.options?.logging) console.log(err)
      return undefined
    }
  }
}

export interface RepairItemCountsParams {
  collection: PhotoCollection,
  refetchAllSets?: boolean,
  options?: {
    logging?: boolean
  }
}
export async function repairItemCountMutation (params: RepairItemCountsParams): Promise<PhotoCollection | undefined> {
  const collectionResponse = params.refetchAllSets ?
    await getCollectionById(client, params.collection.id, {
      siPaths: false,
      siSets: true,
      siTags: false,
    }) : params.collection

  if(collectionResponse) {
    const updatedSets: { response: any, set: PhotoSet }[] = (await Promise.all(collectionResponse.sets
      .map(async (set) => {
        const paths = await getAllPaths(client, set.id)

        const updateSetResponse = await client.models.PhotoSet.update({
          id: set.id,
          items: paths.length
        })

        return ({
          response: updateSetResponse,
          set: {
            ...set,
            items: paths.length
          }
        })
      })
    ))

    if(params.options?.logging) console.log(updatedSets.map((set) => set.response))

    const itemCount = updatedSets
      .map((set) => set.set)
      .reduce((prev, cur) => prev += cur.items, 0)

    const updateResponse = await client.models.PhotoCollection.update({
      id: collectionResponse.id,
      items: itemCount
    })

    if(params.options?.logging) console.log(updateResponse)

    return {
      ...params.collection,
      sets: updatedSets.map((set) => set.set),
      items: itemCount
    }
  }
}

export const collectionsFromUserTagIdQueryOptions = (tags: UserTag[]) => queryOptions({
    queryKey: ['photoCollection', client, tags],
    queryFn: () => getAllCollectionsFromUserTags(client, tags)
})

export const getAllWatermarkObjectsQueryOptions = (options?: GetAllWatermarkObjectsOptions) => queryOptions({
    queryKey: ['watermark', client, options],
    queryFn: () => getAllWatermarkObjects(client, options),
    gcTime: 1000 * 15 * 60 //15 minutes
})

export const getPathsDataMapFromPathsQueryOptions = (paths: PicturePath[]) => queryOptions({
    queryKey: ['photoPaths', paths],
    queryFn: () => getPathsDataMapFromPaths(paths),
    gcTime: 1000 * 15 * 60 //15 minutes
})

export const getPathQueryOptions = (path?: string, id?: string) => queryOptions({
    queryKey: ['path', path, id],
    queryFn: () => getPath(path, id)
})

export const getPhotoCollectionByIdQueryOptions = (collectionId?: string, options?: GetPhotoCollectionByIdOptions) => queryOptions({
    queryKey: ['photoCollection', client, collectionId, options],
    queryFn: () => getCollectionById(client, collectionId, options)
})

export const getAllPhotoCollectionsQueryOptions = (options?: GetAllCollectionsOptions) => queryOptions({
    queryKey: ['photoCollections', client, options],
    queryFn: () => getAllPhotoCollections(client, options)
})

export const getAllCollectionParticipantsQueryOptions = (collectionId: string, options?: GetAllCollectionParticipantsOptions) => queryOptions({
    queryKey: ['collectionParticipants', client, collectionId, options],
    queryFn: () => getAllCollectionParticipants(client, collectionId, options)
})

export const getParticipantCollectionsQueryOptions = (participantId?: string, options?: GetParticipantCollectionsOptions) => queryOptions({
    queryKey: ['participantCollections', client, participantId, options],
    queryFn: () => getParticipantCollections(client, participantId, options)
})
