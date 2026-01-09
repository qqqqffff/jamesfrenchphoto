import { queryOptions } from "@tanstack/react-query"
import { Schema } from "../../amplify/data/resource"
import { V6Client } from '@aws-amplify/api-graphql'
import { PhotoCollection, Participant, UserTag, Timeslot, Package, Notification } from "../types"
import { mapNotification } from "./notificationService"
import { mapParticipant, MapParticipantOptions } from "./userService"
import { mapTimeslot } from "./timeslotService"

interface MapUserTagOptions {
  unauthenticated?: boolean
  siCollections?: boolean,
  siChildren?: boolean,
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
  }
}
export async function mapUserTag(tagResponse: Schema['UserTag']['type'], options?: MapUserTagOptions): Promise<UserTag> {
  const children: UserTag[] = []
  let childrenResponse: Promise<(UserTag | undefined)[]> | undefined

  const notifications: Notification[] = []
  let notificationsResponse: Promise<(Notification | undefined)[]> | undefined
  const notificationMemo: Notification[] = options?.memos?.notificationsMemo ?? []

  const collections: PhotoCollection[] = []
  let collectionsResponse: Promise<(PhotoCollection | undefined)[]> | undefined
  const collectionsMemo: PhotoCollection[] = options?.memos?.collectionsMemo ?? []

  const timeslots: Timeslot[] = []
  let timeslotsResponse: Promise<(Timeslot | undefined)[]> | undefined 

  const participants: Participant[] = []
  let participantResponse: Promise<(Participant | undefined)[]> | undefined
  const participantsMemo: Participant[] = options?.memos?.participantsMemo ?? []

  let pack: Package | undefined

  if(options?.siChildren && !options.unauthenticated) {
    //assume that a parent's children are unique and will not show up in a different tag therefore memoization will make no difference
    //TODO: next tokening, preform all operations simultaneously, children, notifications, collections and timeslots instead of synchronously in order
    childrenResponse = new Promise<(UserTag | undefined)[]>(async (resolve) => {
      let childTagResponse = await tagResponse.childTags()
      const childTagData = childTagResponse.data
      while(childTagResponse.nextToken) {
        childTagResponse = await tagResponse.childTags({ nextToken: childTagResponse.nextToken })
        childTagData.push(...childTagResponse.data)
      }
      
      resolve(Promise.all(childTagData.map(async (tag) => {
        const packageResponse = (await tag.package()).data
        if(!packageResponse) return
        
        const childResponse = (await packageResponse.tag()).data
        //package required for si inside of dashboard
        const pack: Package = {
          ...packageResponse,
          parentTagId: tag.id,
          items: [],
          pdfPath: packageResponse.pdfPath ?? undefined,
          description: packageResponse.description ?? undefined,
          price: packageResponse.price ?? undefined
        }
        if(childResponse) {
          //only shallow depth required for children since they will not be included in the tag memo
          const mappedTag: UserTag = {
            ...childResponse,
            color: childResponse.color ?? undefined,
            notifications: [],
            package: pack,
            children: [],
            participants: []
          }
          return mappedTag
        }
        
        return undefined
      })))
    })
  }

  if(options?.siNotifications && !options.unauthenticated) {
    notificationsResponse = new Promise<(Notification | undefined)[]>(async (resolve) => {
      let notificationResponse = await tagResponse.notifications()
      const notificationData = notificationResponse.data
      while(notificationResponse.nextToken) {
        notificationResponse = await tagResponse.notifications({ nextToken: notificationResponse.nextToken })
        notificationData.push(...notificationResponse.data)
      }

      
      resolve(Promise.all(notificationData.map(async (notification) => {
        const foundNotification = notificationMemo.find((noti) => noti.id === notification.id)
        if(foundNotification) return foundNotification
        const notificationResponse = await notification.notification()
        if(notificationResponse.data) {
          const mappedNotification: Notification = await mapNotification(notificationResponse.data)
          notificationMemo.push(mappedNotification)
          return mappedNotification
        }
      })))
    })
  }

  if(options?.siCollections && !options.unauthenticated) {
    collectionsResponse = new Promise<(PhotoCollection | undefined)[]>(async (resolve) => {
      let tagCollectionResponse = await tagResponse.collectionTags()
      const tagCollectionData = tagCollectionResponse.data
      while(tagCollectionResponse.nextToken) {
        tagCollectionResponse = await tagResponse.collectionTags({ nextToken: tagCollectionResponse.nextToken })
        tagCollectionData.push(...tagCollectionResponse.data)
      }
      resolve(Promise.all(tagCollectionData.map(async (collection) => {
        const foundCollection = collectionsMemo.find((col) => col.id === collection.collectionId)
        if(foundCollection) return foundCollection
        const collectionResponse = await collection.collection()

        if(collectionResponse.data) {
          const mappedCollection: PhotoCollection = {
            ...collectionResponse.data,
            coverPath: collectionResponse.data.coverPath ?? undefined,
            coverType: {
              textColor: collectionResponse.data.coverType?.textColor ?? undefined,
              bgColor: collectionResponse.data.coverType?.bgColor ?? undefined,
              placement: collectionResponse.data.coverType?.placement ?? undefined,
              textPlacement: collectionResponse.data.coverType?.textPlacement ?? undefined,
              date: collectionResponse.data.coverType?.date ?? undefined,
            },
            publicCoverPath: collectionResponse.data.publicCoverPath ?? undefined,
            watermarkPath: collectionResponse.data.watermarkPath ?? undefined,
            downloadable: collectionResponse.data.downloadable ?? false,
            items: collectionResponse.data.items ?? 0,
            published: collectionResponse.data.published ?? false,
            //unnecessary or shallow depth only
            tags: [],
            sets: []
          }
          collectionsMemo.push(mappedCollection)

          return mappedCollection
        }
      })))
    })
  }

  if(options?.siTimeslots && !options.unauthenticated) {
    //timeslots are not memoized since they are unique for user tags
    timeslotsResponse = new Promise<(Timeslot | undefined)[]>(async (resolve) => {
      let tagTimeslotResponse = await tagResponse.timeslotTags()
      const tagTimeslotData = tagTimeslotResponse.data
      while(tagTimeslotResponse.nextToken) {
        tagTimeslotResponse = await tagResponse.timeslotTags({ nextToken: tagTimeslotResponse.nextToken })
        tagTimeslotData.push(...tagTimeslotResponse.data)
      }
      resolve(Promise.all(tagTimeslotData.map(async (timeslot) => {
        const timeslotResponse = await timeslot.timeslot()
        if(timeslotResponse.data) {
          const mappedTimeslot: Timeslot = await mapTimeslot(timeslotResponse.data)
          return mappedTimeslot
        }
      })))
    })
  }

  if(options?.siPackages && !options.unauthenticated) {
    //packages are tag unique, memo not required
    const packageResponse = await tagResponse.packages()
    if(packageResponse.data) {
      pack = {
        ...packageResponse.data,
        parentTagId: (await packageResponse.data.packageParentTag()).data?.tagId,
        description: packageResponse.data.description ?? undefined,
        pdfPath: packageResponse.data.pdfPath ?? undefined,
        price: packageResponse.data.price ?? undefined,
        //shallow depth
        items: []
      }
    }
  }

  if(options?.siParticipants && !options.unauthenticated) {
    participantResponse = new Promise<(Participant | undefined)[]>(async (resolve) => {
      let tagParticipantResponse = await tagResponse.participants()
      const tagParticipantData = tagParticipantResponse.data
      while(tagParticipantResponse.nextToken) {
        tagParticipantResponse = await tagResponse.participants({ nextToken: tagParticipantResponse.nextToken })
        tagParticipantData.push(...tagParticipantResponse.data)
      }
      resolve(Promise.all(tagParticipantData.map(async (participantTag) => {
        const foundParticipant = participantsMemo.find((part) => part.id === participantTag.participantId)
        if(foundParticipant) return foundParticipant
        const participantResponse = await participantTag.participant()
        if(participantResponse.data) {
          const mappedParticipant: Participant = await mapParticipant(participantResponse.data, {
            siCollections: false,
            siNotifications: false,
            siTags: undefined,
            siTimeslot: false
          })
          participantsMemo.push(mappedParticipant)
          return mappedParticipant
        }
      })))
    })
  }

  await Promise.all([
    childrenResponse !== undefined ? childrenResponse.then((c) => {
      children.push(...c.filter((child) => child !== undefined))
    }) : Promise.resolve(),
    notificationsResponse !== undefined? notificationsResponse.then((n) => {
      notifications.push(...n.filter((noti) => noti !== undefined))
    }) : Promise.resolve(),
    collectionsResponse !== undefined ? collectionsResponse.then((c) => {
      collections.push(...c.filter((col) => col !== undefined))
    }) : Promise.resolve(),
    timeslotsResponse !== undefined ? timeslotsResponse.then((t) => {
      timeslots.push(...t.filter((time) => time !== undefined))
    }) : Promise.resolve(),
    participantResponse !== undefined ? participantResponse.then((p) => {
      participants.push(...p.filter((part) => part !== undefined))
    }) : Promise.resolve(),
  ])

  const mappedTag: UserTag = {
    ...tagResponse,
    color: tagResponse.color ?? undefined,
    children: children,
    notifications: notifications,
    collections: collections,
    timeslots: timeslots,
    package: pack,
    participants: participants
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
    const tag = await mapUserTag(tagResponse.data, options)
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
    return mapUserTag(tag, {
      ...options,
      memos: {
        notificationsMemo: notificationMemo,
        collectionsMemo: collectionsMemo,
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
          const newParticipant = await mapParticipant(participantResponse, options)
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