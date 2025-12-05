import { queryOptions } from "@tanstack/react-query"
import { Schema } from "../../amplify/data/resource"
import { V6Client } from '@aws-amplify/api-graphql'
import { PhotoCollection, Participant, UserTag, Timeslot, Package, PackageItem, Notification } from "../types"
import { getAllCollectionsFromUserTagId } from "./collectionService"
import { getAllNotificationsFromUserTag } from "./notificationService"
import { getAllTimeslotsByUserTag } from "./timeslotService"
import { mapParticipant, MapParticipantOptions } from "./userService"

interface MapUserTagOptions {
  siCollections?: boolean,
  siTimeslots?: boolean,
  siNotifications?: boolean,
  siPackages?: {
    siItems?: boolean,
    siCollections?: boolean
  },
  siParticipants?: boolean,
  memos?: {
    notificationsMemo?: Notification[]
    collectionsMemo?: PhotoCollection[]
    participantsMemo?: Participant[]
    tagsMemo?: Schema['UserTag']['type'][]
  }
}
async function mapUserTag(client: V6Client<Schema>, tagResponse: Schema['UserTag']['type'], options?: MapUserTagOptions): Promise<UserTag> {
  let collectionsMemo: PhotoCollection[] = options?.memos?.collectionsMemo ?? []
  let notificationMemo: Notification[] = options?.memos?.notificationsMemo ?? []
  let participantsMemo: Participant[] = options?.memos?.participantsMemo ?? []

  const collections: PhotoCollection[] = []
  const timeslots: Timeslot[] = []
  const notifications: Notification[] = []
  const participants: Participant[] = []
  let pack: Package | undefined
  if(options?.siCollections) {
    const foundCollections = await getAllCollectionsFromUserTagId(client, tagResponse.id, {
        siTags: false,
        collectionsMemo: options?.memos?.collectionsMemo
      }
    )
    collections.push(...foundCollections)
    collectionsMemo.push(...foundCollections)
  }
  if(options?.siTimeslots) {
    timeslots.push(...(await getAllTimeslotsByUserTag(client, tagResponse.id)))
  }
  if(options?.siNotifications) {
    const response = await getAllNotificationsFromUserTag(client, notificationMemo, tagResponse.id)
    notifications.push(...response[0])
    notificationMemo = response[1]
  }

  if(options?.siPackages) {
    const packageResponse = await tagResponse.packages()
    if(packageResponse.data) {
      pack = {
        ...packageResponse.data,
        parentTagId: (await packageResponse.data.packageParentTag()).data?.tagId ?? '',
        pdfPath: packageResponse.data.pdfPath ?? undefined,
        description: packageResponse.data.description ?? undefined,
        price: packageResponse.data.price ?? undefined,
        items: options.siPackages.siItems ? (
          await Promise.all((await packageResponse.data.items()).data.map(async (itemResponse) => {
            const collections: string[] = []
            if(options.siPackages?.siCollections) {
              collections.push(
                ...await Promise.all(
                  (await itemResponse.itemCollections()).data
                  .map((connection) => connection.collectionId)
                )
              )
            }
            const mappedItem: PackageItem = {
              ...itemResponse,
              description: itemResponse.description ?? undefined,
              max: itemResponse.max ?? undefined,
              price: itemResponse.price ?? undefined,
              quantities: itemResponse.quantity ?? undefined,
              hardCap: itemResponse.hardCap ?? undefined,
              dependent: itemResponse.dependent ?? undefined,
              unique: itemResponse.unique ?? undefined,
              statements: itemResponse.statements?.filter((item) => item !== null),
              aLaCarte: itemResponse.aLaCarte ?? undefined,
              display: itemResponse.display ?? true,
              collectionIds: collections
            }
            return mappedItem
          }))
        ) : []
      }
    }
  }

  if(options?.siParticipants) {
    let participantResponse = await tagResponse.participants()
    const participantData = participantResponse.data

    while(participantResponse.nextToken) {
      participantResponse = await tagResponse.participants({ nextToken: participantResponse.nextToken })
      participantData.push(...participantResponse.data)
    }

    participants.push(...(await Promise.all(
      participantData.map(async (participant) => {
        const foundParticipant = participantsMemo.find((part) => part.id === participant.participantId)
        if(foundParticipant !== undefined) return foundParticipant
        const participantData = (await participant.participant()).data
        if(!participantData) return
        //no secondary indexing -> no memos needed
        return mapParticipant(client, participantData, { 
          siCollections: false, 
          siNotifications: false, 
          siTags: undefined, 
          siTimeslot: false,
        })
      })
    )).filter((participant) => participant !== undefined))
  }

  //shallow depth for children
  const children = (await Promise.all((await tagResponse.childTags()).data.map(async (tag) => {
    const packageResponse = await tag.package()
    if(packageResponse.data !== null) {
      const foundTag = options?.memos?.tagsMemo?.find((tag) => tag.id === packageResponse.data!.tagId)
      if(foundTag) {
        const mappedTag: UserTag = {
          ...foundTag,
          color: foundTag.color ?? undefined,
          notifications: [],
          children: [],
          participants: [],
        }
        return mappedTag
      }

      const tagResponse = await packageResponse.data.tag()
      if(tagResponse.data !== null) {
        const mappedTag: UserTag = {
          ...tagResponse.data,
          color: tagResponse.data.color ?? undefined,
          notifications: [],
          children: [],
          participants: []
        }
        return mappedTag
      }
    }
  }))).filter((tag) => tag !== undefined)

  const mappedTag: UserTag = {
    ...tagResponse,
    collections: collections,
    color: tagResponse.color ?? undefined,
    notifications: notifications,
    children: children,
    package: pack,
    participants: participants,
    timeslots: timeslots
  }
  return mappedTag
}

interface GetTagByIdOptions extends MapUserTagOptions { 
  metric?: boolean
}
async function getTagById(client: V6Client<Schema>, tagId?: string, options?: GetTagByIdOptions): Promise<UserTag | null> {
  const start = new Date()
  if(!tagId) return null

  const tagResponse = await client.models.UserTag.get({ id: tagId })
  if(tagResponse.data) {
    const tag = await mapUserTag(client, tagResponse.data, options)
    if(options?.metric) console.log(`GETTAGBYID:${new Date().getTime() - start.getTime()}`)
    return tag
  }
  return null
}

//TODO: implement me please
// interface GetAllUserTagsInfiniteData {
// }
// interface GetAllUserTagsInfiniteOptions { 
// }
// async function getAllUserTagsInfinite(client: V6Client<Schema>, initial: GetAllUserTagsInfiniteData, options?: GetAllUserTagsInfiniteOptions) {
// }

interface GetAllUserTagsOptions extends GetTagByIdOptions { }
async function getAllUserTags(client: V6Client<Schema>, options?: GetAllUserTagsOptions): Promise<UserTag[]> {
  const start = new Date()
  let userTagsResponse = await client.models.UserTag.list()
  let userTagData: Schema['UserTag']['type'][] = userTagsResponse.data

  while(userTagsResponse.nextToken) {
    userTagsResponse = await client.models.UserTag.list({ nextToken: userTagsResponse.nextToken })
    userTagData.push(...userTagsResponse.data)
  }

  let notificationMemo: Notification[] = []
  let collectionsMemo: PhotoCollection[] = []

  const mappedTags = await Promise.all(userTagData.map(async (tag) => {
    return mapUserTag(client, tag, {
      ...options,
      memos: {
        notificationsMemo: notificationMemo,
        collectionsMemo: collectionsMemo,
        tagsMemo: userTagData
      }
    })
  }))
  if(options?.metric) console.log(`GETALLTAGS:${new Date().getTime() - start.getTime()}ms`)
  return mappedTags
}

interface GetAllParticipantsByUserTagOptions extends MapParticipantOptions { }
async function getAllParticipantsByUserTag(client: V6Client<Schema>, tagId?: string, options?: GetAllParticipantsByUserTagOptions): Promise<Participant[]> {
  const participants: Participant[] = []
  if(!tagId) return participants
  const tagResponse = await client.models.UserTag.get({ id: tagId })
  if(tagResponse.data) {
    const notificationMemo: Notification[] = []
    const collectionsMemo: PhotoCollection[] = []
    const tagsMemo: UserTag[] = []

    participants.push(...(
      await Promise.all((await tagResponse.data.participants()).data.map(async (participant) => {
        const participantResponse = (await participant.participant()).data
        if(participantResponse) {
          const newParticipant = await mapParticipant(client, participantResponse, options)
          //pushing to the memo, combining the items from the user tag with the participant specific items and deudplication
          notificationMemo.push(...[
            ...(newParticipant.userTags
              .flatMap((tag) => tag.notifications ?? [])
              .filter((notification) => (
                !notificationMemo.some((noti) => noti.id === notification?.id)
              ))
            ),
            ...newParticipant.notifications
              .filter((notification) => !notificationMemo.some((noti) => noti.id === notification.id))
          ].reduce((prev, cur) => {
            if(!prev.some((notification) => notification.id === cur.id)) {
              prev.push(cur)
            }
            return prev
          }, [] as Notification[]))


          collectionsMemo.push(...[
            ...(newParticipant.userTags
              .flatMap((tag) => tag.collections ?? [])
              .filter((collection) => (
                !collectionsMemo.some((col) => col.id !== collection.id)
              ))
            ),
            ...newParticipant.collections
              .filter((collection) => !collectionsMemo.some((col) => col.id !== collection.id))
          ].reduce((prev, cur) => {
            if(!prev.some((collection) => collection.id === cur.id)) {
              prev.push(cur)
            }
            return prev
          }, [] as PhotoCollection[]))

          //pushing to the memo with deduplication
          tagsMemo.push(...newParticipant.userTags.filter((tag) => !tagsMemo.some((mTag) => mTag.id !== tag.id)))

          return newParticipant
        }
      }))
    ).filter((participant) => participant !== undefined))
  }
  
  return participants
}

export interface CreateTagParams {
  tag: UserTag,
  options?: {
    logging?: boolean
    metric?: boolean
  }
}

export interface UpdateTagParams {
  tag: UserTag, //old tag
  name: string,
  color?: string,
  collections?: PhotoCollection[],
  timeslots?: Timeslot[],
  participants: Participant[],
  options?: {
    logging?: boolean,
    metric?: boolean
  }
}

export class TagService {
  private client: V6Client<Schema>
  constructor(client: V6Client<Schema>) {
    this.client = client
  }

  async createTagMutation(params: CreateTagParams) {
    const start = new Date()
    const createTagResponse = await this.client.models.UserTag.create({
      id: params.tag.id,
      name: params.tag.name,
      color: params.tag.color,
    })

    if(params.options?.logging) console.log(createTagResponse)

    const createCollectionTagResponse = await Promise.all((params.tag.collections ?? []).map(async (collection) => {
      return [
        await this.client.models.CollectionTag.create({
          collectionId: collection.id,
          tagId: params.tag.id
        })
      ]
    }))

    if(params.options?.logging) console.log(createCollectionTagResponse)

    const createTimeslotTagResponse = await Promise.all((params.tag.timeslots ?? []).map(async (timeslot) => {
      return [
        await this.client.models.TimeslotTag.create({
          tagId: params.tag.id,
          timeslotId: timeslot.id
        })
      ]
    }))

    if(params.options?.logging) console.log(createTimeslotTagResponse)

    const createParticipantTagResponse = await Promise.all(params.tag.participants.map(async (participant) => {
      return [
        await this.client.models.ParticipantUserTag.create({
          participantId: participant.id,
          tagId: params.tag.id
        })
      ]
    }))

    if(params.options?.logging) console.log(createParticipantTagResponse)
    if(params.options?.metric) console.log(`CREATETAG:${new Date().getTime() - start.getTime()}ms`)       
  }

  async updateTagMutation(params: UpdateTagParams) {
    const start = new Date()

    //updating collections
    const newCollections: PhotoCollection[] = (params.collections ?? [])
      .filter((collection) => !params.tag.collections?.some((pCollection) => pCollection.id === collection.id))

    const removedCollections = (params.tag.collections ?? []).filter((collection) => !params.collections?.some((pCollection) => pCollection.id === collection.id))

    //TODO: can optimize by putting the removal api call inside of the next token loop
    const fetchAndDeleteCollectionConnections = async () => {
      let collectionConnectionResponse = await this.client.models.CollectionTag
        .listCollectionTagByTagId({ tagId: params.tag.id })
      const collectionConnectionData = collectionConnectionResponse.data

      while(collectionConnectionResponse.nextToken) {
        collectionConnectionResponse = await this.client.models.CollectionTag
          .listCollectionTagByTagId(
            { tagId: params.tag.id },
            { nextToken: collectionConnectionResponse.nextToken }
          )
        collectionConnectionData.push(...collectionConnectionResponse.data)
      }

      return Promise.all(removedCollections.map((collection) => {
        const foundConnection = collectionConnectionData.find((connection) => connection.collectionId === collection.id)
        if(foundConnection) return this.client.models.CollectionTag.delete({ id: foundConnection.id })
      }))
    }

    const collectionConnectionsToDelete = removedCollections.length > 0 ? (
      await fetchAndDeleteCollectionConnections()
    ) : undefined

    if(params.options?.logging) console.log(collectionConnectionsToDelete)

    const newCollectionsResponse = await Promise.all(newCollections.map((collection) => {
      return this.client.models.CollectionTag.create({
        collectionId: collection.id,
        tagId: params.tag.id
      })
    }))
    if(params.options?.logging) console.log(newCollectionsResponse)

    //updating timeslots

    const newTimeslots: Timeslot[] = (params.timeslots ?? [])
      .filter((timeslot) => !params.tag.timeslots?.some((pTimeslot) => pTimeslot.id === timeslot.id))

    const removedTimeslots = (params.tag.timeslots ?? []).filter((timeslot) => !params.timeslots?.some((pTimeslot) => pTimeslot.id === timeslot.id))

    //TODO: can optimize by putting the removal api call inside of the next token loop
    const fetchAndDeleteTimeslotConnections = async () => {
      let timeslotConnectionResponse = await this.client.models.TimeslotTag
        .listTimeslotTagByTagId({ tagId: params.tag.id })
      const timeslotConnectionData = timeslotConnectionResponse.data

      while(timeslotConnectionResponse.nextToken) {
        timeslotConnectionResponse = await this.client.models.TimeslotTag
          .listTimeslotTagByTagId(
            { tagId: params.tag.id },
            { nextToken: timeslotConnectionResponse.nextToken }
          )
        timeslotConnectionData.push(...timeslotConnectionResponse.data)
      }

      return Promise.all(removedTimeslots.map((timeslot) => {
        const foundConnection = timeslotConnectionData.find((connection) => connection.timeslotId === timeslot.id)
        if(foundConnection) return this.client.models.TimeslotTag.delete({ id: foundConnection.id })
      }))
    }

    const timeslotConnectionsToDelete = removedTimeslots.length > 0 ? (
      await fetchAndDeleteTimeslotConnections()
    ) : undefined

    if(params.options?.logging) console.log(timeslotConnectionsToDelete)

    const newTimeslotsResponse = await Promise.all(newTimeslots.map((timeslot) => {
      return this.client.models.TimeslotTag.create({
        timeslotId: timeslot.id,
        tagId: params.tag.id
      })
    }))
    if(params.options?.logging) console.log(newTimeslotsResponse)

    //update participants

    const newParticipants: Participant[] = params.participants
      .filter((participant) => !params.tag.participants.some((pParticipant) => pParticipant.id === participant.id))

    const removedParticipants = params.tag.participants.filter((participant) => !params.participants.some((pParticipant) => pParticipant.id === participant.id))

    //TODO: can optimize by putting the removal api call inside of the next token loop
    const fetchAndDeleteParticipantConnections = async () => {
      let participantConnectionResponse = await this.client.models.ParticipantUserTag
        .listParticipantUserTagByTagId({ tagId: params.tag.id })
      const participantConnectionData = participantConnectionResponse.data

      while(participantConnectionResponse.nextToken) {
        participantConnectionResponse = await this.client.models.ParticipantUserTag
          .listParticipantUserTagByTagId(
            { tagId: params.tag.id },
            { nextToken: participantConnectionResponse.nextToken }
          )
        participantConnectionData.push(...participantConnectionResponse.data)
      }

      return Promise.all(removedParticipants.map((participant) => {
        const foundConnection = participantConnectionData.find((connection) => connection.participantId === participant.id)
        if(foundConnection) return this.client.models.CollectionTag.delete({ id: foundConnection.id })
      }))
    }

    const participantConnectionsToDelete = removedParticipants.length > 0 ? (
      await fetchAndDeleteParticipantConnections()
    ) : undefined

    if(params.options?.logging) console.log(participantConnectionsToDelete)

    const newParticipantsResponse = await Promise.all(newParticipants.map((participant) => {
      return this.client.models.ParticipantUserTag.create({
        participantId: participant.id,
        tagId: params.tag.id
      })
    }))
    if(params.options?.logging) console.log(newParticipantsResponse)

    if(
      params.tag.name !== params.name ||
      params.tag.color !== params.color
    ) {
      const response = await this.client.models.UserTag.update({
        id: params.tag.id,
        name: params.name ?? params.tag.name,
        color: params.color ?? params.tag.color
      })
      if(params.options?.logging) console.log(response)
    }

    if(params.options?.metric) console.log(`UPDATETAG:${new Date().getTime() - start.getTime()}ms`)
  }

  getAllUserTagsQueryOptions = (options?: GetAllUserTagsOptions) => queryOptions({
    queryKey: ['userTags', options],
    queryFn: () => getAllUserTags(this.client, options)
  })

    getUserTagByIdQueryOptions = (tagId?: string, options?: GetTagByIdOptions) => queryOptions({
    queryKey: ['userTag', options],
    queryFn: () => getTagById(this.client, tagId, options)
  })

  getAllParticipantsByUserTagQueryOptions = (tagId?: string, options?: GetAllParticipantsByUserTagOptions) => queryOptions({
    queryKey: ['userTagParticipants', tagId, options],
    queryFn: () => getAllParticipantsByUserTag(this.client, tagId, options)
  })
}