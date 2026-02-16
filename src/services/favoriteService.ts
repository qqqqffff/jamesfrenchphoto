import { V6Client } from '@aws-amplify/api-graphql'
import { Schema } from '../../amplify/data/resource'
import { Favorite, Participant, PhotoCollection, UserTag } from '../types'
import { mapParticipant } from './userService'
import { queryOptions } from '@tanstack/react-query'
import { getTagById } from './tagService'
import { getCollectionById } from './collectionService'

export function mapFavorite(favoriteResponse: Schema['UserFavorites']['type']): Favorite {
  return {
    id: favoriteResponse.id,
    participantId: favoriteResponse.participantId,
    pathId: favoriteResponse.pathId,
    createdAt: new Date(favoriteResponse.createdAt),
    updatedAt: new Date(favoriteResponse.updatedAt),
  }
}

interface GetFavoritesFromPhotoCollectionOptions {
  logging?: boolean,
  metric?: boolean
}
async function getFavoritesFromPhotoCollection(client: V6Client<Schema>, collectionId: string,  options?: GetFavoritesFromPhotoCollectionOptions): Promise<Map<Participant, Favorite[]>> {
  if(options?.logging) {
    console.log('api call')
  }
  const start = new Date().getTime()

  const participantMemo: Participant[] = []
  const returnMap: Map<Participant, Favorite[]> = new Map()

  let favoritesResponse = await client.models.UserFavorites.listUserFavoritesByCollectionId({
    collectionId: collectionId
  })

  let favoritesData = favoritesResponse.data

  while(favoritesResponse.nextToken !== undefined) {
    favoritesResponse = await client.models.UserFavorites.listUserFavoritesByCollectionId({
      collectionId: collectionId
    }, {
      nextToken: favoritesResponse.nextToken
    })
    favoritesData.push(...favoritesResponse.data)
  }

  await Promise.all(favoritesData.map(async (favorite) => {
    const foundParticipant = participantMemo.find((participant) => participant.id === favorite.participantId)
    if(foundParticipant) {
      returnMap.set(
        foundParticipant,
        [...(returnMap.get(foundParticipant) ?? []), mapFavorite(favorite)]
      )
      return 
    }
    const participantResponse = await favorite.participant()
    if(participantResponse.data !== null) {
      const participant = await mapParticipant(participantResponse.data, {
        siCollections: false,
        siTags: undefined,
        siTimeslot: false,
        siNotifications: false,
        unauthenticated: false,
      })
      participantMemo.push(participant)
      returnMap.set(participant, [mapFavorite(favorite)])
    }
  }))

  if(options?.metric) {
    console.log(`GETFAVORITESFROMPHOTOCOLLECTION: ${new Date().getTime() - start}ms`)
  }

  return returnMap
}

interface GetParticipantFavoritesByCollectionOptions extends GetFavoritesFromPhotoCollectionOptions {
  siCollection?: PhotoCollection,
  favoritesMemo?: Favorite[],
}
export async function getParticipantFavoritesByCollection(client: V6Client<Schema>, participantId: string, collectionId?: string, options?: GetParticipantFavoritesByCollectionOptions): Promise<[PhotoCollection, Favorite[]] | null> {
  if(collectionId === undefined) return null
  if(options?.logging) {
    console.log('api call')
  }
  const start = new Date().getTime()
  const favorites: Favorite[] = [...(options?.favoritesMemo ?? [])]
  const collection = options?.siCollection !== undefined ? options.siCollection : await getCollectionById(client, collectionId, {
    siTags: false,
    siSets: true,
    siPaths: false,
    unauthenticated: false,
    participantId: undefined, // only needed for collection favorite si (not necessary in this case)
  })

  if(collection === null) return null

  let favoritesResponse = await client.models.UserFavorites.listUserFavoritesByParticipantIdAndCollectionId({
    participantId: participantId,
    collectionId: {
      eq: collectionId
    }
  })
  const favoritesData = favoritesResponse.data

  while(favoritesResponse.nextToken !== undefined) {
    favoritesResponse = await client.models.UserFavorites.listUserFavoritesByParticipantIdAndCollectionId({
      participantId: participantId,
      collectionId: {
        eq: collectionId
      }
    }, {
      nextToken: favoritesResponse.nextToken
    })
    favoritesData.push(...favoritesResponse.data)
  }

  favoritesData
  .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  .forEach((favorite) => {
    favorites.push(mapFavorite(favorite))
  })

  if(options?.metric) {
    console.log(`GETPARTICIPANTFAVORITESBYCOLLECTION: ${new Date().getTime() - start}ms`)
  }
  return [collection, favorites]
}

interface GetParticipantFavoritesByUserTag extends GetFavoritesFromPhotoCollectionOptions {}
async function getParticipantFavoritesByUserTag(client: V6Client<Schema>, participantId: string, tagId?: string, options?: GetParticipantFavoritesByUserTag): Promise<[UserTag, Favorite[]] | null> {
  if(tagId === undefined) return null
  if(options?.logging) {
    console.log('api call')
  }
  const start = new Date().getTime()

  const userTagResponse = await getTagById(client, tagId, {
    unauthenticated: false,
    siCollections: true,
    siChildren: false,
    siTimeslots: false,
    siNotifications: false,
    siPackages: undefined,
    siParticipants: false,
  })

  if(!userTagResponse) return null

  const favorites: Favorite[] = []

  let response = (userTagResponse.collections ?? []).map(async (collection) => {
    const collectionFavorites = await getParticipantFavoritesByCollection(client, participantId, collection.id, {
      siCollection: collection,
      favoritesMemo: favorites
    })
    if(collectionFavorites !== null) {
      favorites.push(...collectionFavorites[1])
    }
    return collectionFavorites
  })

  if(options?.logging) {
    console.log(response, favorites)
  }
  if(options?.metric) {
    console.log(`GETPARTICIPANTFAVORITESBYUSERTAG: ${new Date().getTime() - start}ms`)
  }

  return [userTagResponse, favorites.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())]
}

export interface FavoriteImageMutationParams {
  collectionId: string,
  setId: string,
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

export class FavoriteService {
  private client: V6Client<Schema>
  constructor(client: V6Client<Schema>) {
    this.client = client
  }

  async favoriteImageMutation(params: FavoriteImageMutationParams): Promise<[string, string] | undefined> {
    const response = await this.client.models.UserFavorites.create({
      pathId: params.pathId,
      participantId: params.participantId,
      collectionId: params.collectionId,
      setId: params.setId,
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

  getFavoritesFromPhotoCollectionQueryOptions = (collectionId: string, options?: GetFavoritesFromPhotoCollectionOptions) => queryOptions({
    queryKey: ['collectionFavorites', collectionId, options],
    queryFn: () => getFavoritesFromPhotoCollection(this.client, collectionId, options)
  })

  getParticipantFavoritesByCollectionQueryOptions = (participantId: string, collectionId?: string, options?: GetParticipantFavoritesByCollectionOptions) => queryOptions({
    queryKey: ['participantCollectionFavorites', participantId, collectionId, options],
    queryFn: () => getParticipantFavoritesByCollection(this.client, participantId, collectionId, options)
  })

  getParticipantFavoritesByUserTagQueryOptions = (participantId: string, tagId?: string, options?: GetParticipantFavoritesByUserTag) => queryOptions({
    queryKey: ['participantTagFavorites', participantId, tagId, options],
    queryFn: () => getParticipantFavoritesByUserTag(this.client, participantId, tagId, options)
  })
}