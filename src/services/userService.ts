import { Schema } from "../../amplify/data/resource";
import { Notification, Package, Participant, PhotoCollection, TemporaryAccessToken, Timeslot, UserData, UserProfile, UserTag } from "../types";
import { queryOptions } from "@tanstack/react-query";
import { parseAttribute } from "../utils";
import { ListUsersCommandOutput } from "@aws-sdk/client-cognito-identity-provider/dist-types/commands/ListUsersCommand";
import { signUp, updateUserAttributes } from "aws-amplify/auth";
import { Duration } from "luxon";
import { UserType } from "@aws-sdk/client-cognito-identity-provider/dist-types/models/models_0";
import { RegistrationProfile } from "../components/register/RegisterForm";
import { v4 } from 'uuid'
import { V6Client } from '@aws-amplify/api-graphql'

interface GetUserProfileByEmailOptions {
  siTags?: boolean,
  siTimeslot?: boolean,
  siCollections?: boolean,
  siSets?: boolean,
  siTemporaryToken?: boolean,
  siNotifications?: boolean
  unauthenticated?: boolean,
  memo?: {
    tags?: UserTag[]
  }
}

interface GetAuthUsersOptions {
  siProfiles?: boolean,
  logging?: boolean
  metric?: boolean
}

interface GetAllTemporaryUsersOptions {
  logging?: boolean,
  siTags?: boolean
}

interface GetTemporaryUserOptions {
  logging?: boolean
}

//TODO: address token expiration
async function getTemporaryAccessToken(client: V6Client<Schema>, id: string): Promise<TemporaryAccessToken | undefined> {
  const response = await client.models.TemporaryAccessToken.get({ id: id }, { authMode: 'identityPool' })
  if(response.data && (
    !response.data.expire || new Date(response.data.expire).getTime() < Date.now())
  ){
    const mappedToken: TemporaryAccessToken = {
      ...response.data,
      expires: response.data.expire ? new Date(response.data.expire) : undefined,
      sessionTime: response.data.sessionTime ? Duration.fromISO(response.data.sessionTime) : undefined
    }

    return mappedToken
  }
}

export interface MapParticipantOptions {
  siCollections?: boolean
  siTags?: {
    siChildren?: boolean
    siPackages?: boolean
    siCollections?: boolean
    siTimeslots?: boolean
  },
  siTimeslot?: boolean,
  siNotifications?: boolean,
  unauthenticated?: boolean,
  memos?: {
    notificationsMemo?: Notification[]
    tagsMemo?: UserTag[]
    collectionsMemo?: PhotoCollection[]
  }
}
//TODO: add pagination where necessary (timeslots and collections)
export async function mapParticipant(client: V6Client<Schema>, participantResponse: Schema['Participant']['type'], options?: MapParticipantOptions): Promise<Participant> {
  const userTags: UserTag[] = []
  const notifications: Notification[] = []
  const timeslots: Timeslot[] = []
  const collections: PhotoCollection[] = []

  const notificationMemo: Notification[] = options?.memos?.notificationsMemo ?? []
  const collectionsMemo: PhotoCollection[] = options?.memos?.collectionsMemo ?? []
  //no need to create a tags memo since the memo does not change
  console.log(options?.siTags)
  if(options?.siTags !== undefined) {
    let tagsResponse = await participantResponse.tags({ authMode: options?.unauthenticated ? 'identityPool' : 'userPool' })
    //TODO: next token parsing
    console.log(tagsResponse)
    if(tagsResponse.data.length === 0) {
      tagsResponse = await client.models.ParticipantUserTag.listParticipantUserTagByParticipantId({ participantId: participantResponse.id }, { authMode: options?.unauthenticated ? 'identityPool' : 'userPool' })
      console.log(tagsResponse)
    }
    
    userTags.push(...(
      (await Promise.all(
        (tagsResponse.data ?? []).map(async (tag) => {
          let mappedTag: UserTag | undefined = options.memos?.tagsMemo?.find((mTag) => tag.tagId === mTag.id)
          console.log(mappedTag)
          if(mappedTag) {
            return mappedTag
          }
          if(!tag) return
          const tagResponse = await tag.tag({ authMode: options?.unauthenticated ? 'identityPool' : 'userPool' })
          //when unauthenticated shallow auth required
          if(tagResponse.data) {
            const children: UserTag[] = []
            const notifications: Notification[] = []
            const collections: PhotoCollection[] = []
            const timeslots: Timeslot[] = []
            let pack: Package | undefined

            if(options.siTags?.siChildren && !options.unauthenticated) {
              //assume that a parent's children are unique and will not show up in a different tag therefore memoization will make no difference
              //TODO: next tokening, preform all operations simultaneously, children, notifications, collections and timeslots instead of synchronously in order
              children.push(...(
                await Promise.all((await tagResponse.data.childTags()).data.map(async (child) => {
                  const packageResponse = (await child.package()).data
                  if(!packageResponse) return
                  const foundTag = options.memos?.tagsMemo?.find((tag) => tag.id === packageResponse.tagId)
                  if(foundTag) {
                    return foundTag
                  }
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
                }))
              ).filter((tag) => tag !== undefined))
            }

            if(options?.siNotifications && !options.unauthenticated) {
              notifications.push(...(
                await Promise.all((await tagResponse.data.notifications()).data.map(async (notification) => {
                  const foundNotification = options.memos?.notificationsMemo?.find((noti) => noti.id === notification.id)
                  if(foundNotification) return foundNotification
                  const notificationResponse = await notification.notification()
                  if(notificationResponse.data) {
                    const mappedNotification: Notification = {
                      ...notificationResponse.data,
                      location: notificationResponse.data.location ?? 'dashboard',
                      expiration: notificationResponse.data.expiration ?? undefined,
                      //unecessary
                      participants: [],
                      tags: []
                    }
                    return mappedNotification
                  }
                }))
              ).filter((notification) => notification !== undefined))
            }

            if(options?.siTags?.siCollections && !options.unauthenticated) {
              collections.push(...(
                await Promise.all((await tagResponse.data.collectionTags()).data.map(async (collection) => {
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

                    return mappedCollection
                  }
                }))
              ).filter((collection) => collection !== undefined))
            }

            if(options?.siTags?.siTimeslots && !options.unauthenticated) {
              //timeslots are not memoized since they are unique for user tags
              timeslots.push(...(
                await Promise.all((await tagResponse.data.timeslotTags()).data.map(async (timeslot) => {
                  const timeslotResponse = await timeslot.timeslot()
                  if(timeslotResponse.data) {
                    //TODO: use timeslot mapping function
                    const mappedTimeslot: Timeslot = {
                      ...timeslotResponse.data,
                      description: timeslotResponse.data.description ?? undefined,
                      register: timeslotResponse.data.register ?? undefined,
                      start: new Date(timeslotResponse.data.start),
                      end: new Date(timeslotResponse.data.end),
                      participantId: timeslotResponse.data.participantId ?? undefined
                    }
                    return mappedTimeslot
                  }
                }))
              ).filter((timeslot) => timeslot !== undefined))
            }

            if(options?.siTags?.siPackages && !options.unauthenticated) {
              //packages are tag unique, memo not required
              const packageResponse = await tagResponse.data.packages()
              if(packageResponse.data) {
                pack = {
                ...packageResponse.data,
                parentTagId: (await packageResponse.data.packageParentTag()).data?.tagId ?? '',
                description: packageResponse.data.description ?? undefined,
                pdfPath: packageResponse.data.pdfPath ?? undefined,
                price: packageResponse.data.price ?? undefined,
                //shallow depth
                items: []
                }
              }
            }

            mappedTag = {
              ...tagResponse.data,
              color: tagResponse.data.color ?? undefined,
              children: children,
              notifications: notifications,
              collections: collections,
              timeslots: timeslots,
              package: pack,
              participants: []
            }

            //push to the memo for those that don't exist into the memo
            notificationMemo.push(...notifications
              .filter((noti) => !notificationMemo.some((notification) => notification.id === noti.id))
            )
            collectionsMemo.push(...collections
              .filter((col) => !collectionsMemo.some((collection) => collection.id === col.id))
            )
          }
          return mappedTag
        })
      ))).filter((tag) => tag !== undefined)
    )
  }

  if(options?.siNotifications) {
    notifications.push(...(
      await Promise.all((await participantResponse.notifications()).data.map(async (notification) => {
        const foundNotification = notificationMemo.find((noti) => noti.id === notification.notificationId)
        if(foundNotification) return foundNotification
        const notificationResponse = await notification.notification()
        console.log(notificationResponse)
        if(notificationResponse.data) {
          const mappedNotification: Notification = {
            ...notificationResponse.data,
            location: notificationResponse.data.location ?? 'dashboard',
            expiration: notificationResponse.data.expiration ?? undefined,
            //unnecessary
            participants: [],
            tags: []
          }
          return mappedNotification
        }
      }))
    ).filter((notification) => notification !== undefined))
  }

  if(options?.siCollections) {
    collections.push(...(
      await Promise.all((await participantResponse.collections()).data.map(async (collection) => {
        const foundCollection = collectionsMemo.find((col) => col.id === collection.collectionId)
        if(foundCollection) {
          return foundCollection
        }
        const collectionResponse = await collection.collection()
        console.log(collectionResponse)
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
          return mappedCollection
        }
      }))
    ).filter((collection) => collection !== undefined))
  }

  if(options?.siTimeslot) {
    const timeslotResponse = await participantResponse.timeslot()
    console.log(timeslotResponse)
    timeslots.push(...(
      //TODO: use timeslot mapping function
      await Promise.all(timeslotResponse.data.map(async (timeslot) => {
        const mappedTimeslot: Timeslot = {
          ...timeslot,
          description: timeslot.description ?? undefined,
          register: timeslot.register ?? undefined,
          start: new Date(timeslot.start),
          end: new Date(timeslot.end),
          participantId: timeslot.participantId ?? undefined
        }
        return mappedTimeslot
      }))
    ).filter((timeslot) => timeslot !== undefined))
  }

  const mappedParticipant: Participant = {
    ...participantResponse,
    userTags: userTags,
    middleName: participantResponse.middleName ?? undefined,
    preferredName: participantResponse.preferredName ?? undefined,
    email: participantResponse.email ?? undefined,
    contact: participantResponse.contact ?? false,
    timeslot: timeslots,
    notifications: notifications,
    collections: collections
  }
  
  return mappedParticipant
}

//TODO: convert me to infinite query
interface GetAllParticipantsOptions extends MapParticipantOptions { }
async function getAllParticipants(client: V6Client<Schema>, options?: GetAllParticipantsOptions): Promise<Participant[]> {
  let participantResponse = await client.models.Participant.list()
  const participantData = participantResponse.data

  while(participantResponse.nextToken) {
    participantResponse = await client.models.Participant.list({ nextToken: participantResponse.nextToken })
    participantData.push(...participantResponse.data)
  }

  const notificationMemo: Notification[] = []
  const collectionsMemo: PhotoCollection[] = []
  const tagsMemo: UserTag[] = []

  const mappedParticipants: Participant[] = await Promise.all(participantData.map(async (participant) => {
    const newParticipant = await mapParticipant(client, participant, {
      siCollections: options?.siCollections,
      siNotifications: options?.siNotifications,
      siTags: options?.siTags ? {
        siChildren: true, //TODO: remove the hard coding
        siCollections: options.siCollections,
        siPackages: true,
        siTimeslots: options.siTimeslot
      } : undefined,
      siTimeslot: options?.siTimeslot,
      memos: {
        notificationsMemo: notificationMemo,
        tagsMemo: tagsMemo,
        collectionsMemo: collectionsMemo,
      }
    })

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
  }))

  return mappedParticipants
}

export interface RegisterUserMutationParams {
  userProfile: RegistrationProfile,
  token?: string,
  options?: {
    logging?: boolean
    metric?: boolean
  }
}

export interface CreateAccessTokenMutationParams {
  expires?: Date,
  sessionTime?: Duration,
  collectionId: string,
  options?: {
    logging?: boolean
  }
}

export interface CreateParticipantParams {
  participant: Omit<Participant, 'notifications'>,
  authMode: 'identityPool' | 'userPool',
  options?: {
    logging: boolean
  }
}

export interface UpdateUserAttributesMutationParams{
  email: string,
  lastName?: string,
  firstName?: string,
  phoneNumber?: string,
  accessToken?: string,
  preferredContact?: 'EMAIL' | 'PHONE',
  admin?: string,
  options?: {
    logging?: boolean
  }
}

export interface UpdateUserProfileParams {
  profile: UserProfile,
  sitting?: number,
  first?: string,
  last?: string,
  options?: {
    logging?: boolean
  }
}

//TODO: improve me
export interface UpdateParticipantMutationParams {
  firstName: string,
  lastName: string,
  preferredName?: string,
  middleName?: string,
  contact: boolean,
  email?: string,
  participant: Participant,
  userTags: UserTag[],
  options?: {
    logging?: boolean
  }
}

export interface CreateTempUserProfileParams {
  email: string,
}

export interface InviteUserParams {
  sittingNumber: number
  email: string,
  firstName: string,
  lastName: string,
  participants: Participant[],
  baseLink: string,
  options?: {
    logging?: boolean
  }
}

export interface RevokeUserInviteMutationParams {
  userEmail: string,
  options?: {
    logging?: boolean,
    metric?: boolean
  }
}

export class UserService {
  private client: V6Client<Schema>
  constructor(client: V6Client<Schema>) {
    this.client = client
  }

  async getTemporaryUser(client: V6Client<Schema>, id?: string, options?: GetTemporaryUserOptions): Promise<UserProfile | null> {
    if(id) {
      const tokenResponse = await client.models.TemporaryCreateUsersTokens.get({ id: id }, { authMode: 'identityPool' })

      if(options?.logging) console.log(tokenResponse)
      if(!tokenResponse.data) return null

      const mappedResponse = await this.getUserProfileByEmail(client, tokenResponse.data.userEmail, { siTags: true, unauthenticated: true })
      if(options?.logging) console.log(mappedResponse)

      return mappedResponse ?? null
    }
    return null
  }

  async getAllTemporaryUsers(client: V6Client<Schema>, options?: GetAllTemporaryUsersOptions): Promise<UserProfile[] | undefined> {
    let response = await client.models.TemporaryCreateUsersTokens.list()
    const temporaryUserData = response.data

    while(response.nextToken) {
      response = await client.models.TemporaryCreateUsersTokens.list({ nextToken: response.nextToken })
      temporaryUserData.push(...response.data)
    }

    if(options?.logging) console.log(response)

    const tagsMemo: UserTag[] = []
    const mappedResponse: UserProfile[] = (await Promise.all(temporaryUserData.map(async (token) => {
      const userProfile = await this.getUserProfileByEmail(client, token.userEmail, { siTags: options?.siTags })
      if(userProfile) {
        tagsMemo.push(...userProfile.participant
          .flatMap((participant) => participant.userTags)
          .reduce((prev, cur) => {
            if(!prev.some((tag) => tag.id === cur.id)) {
              prev.push(cur)
            }
            return prev
          }, [] as UserTag[])
        )
      }
      return userProfile
    }))).filter((data) => data !== undefined)

    if(options?.logging) console.log(mappedResponse)

    return mappedResponse
  }

  async getUserProfileByEmail(client: V6Client<Schema>, email: string, options?: GetUserProfileByEmailOptions): Promise<UserProfile | undefined> {
    if(email === '') return
    const profileResponse = await client.models.UserProfile.get({ email: email }, { authMode: options?.unauthenticated ? 'identityPool' : 'userPool' })
    console.log(profileResponse)
    if(!profileResponse || !profileResponse.data) return
    const temporaryToken = options?.siTemporaryToken ? (await profileResponse.data.temporaryCreate({ authMode: options?.unauthenticated ? 'identityPool' : 'userPool' })).data?.id : undefined
    let participantResponse = (await profileResponse.data.participant({ authMode: options?.unauthenticated ? 'identityPool' : 'userPool' })).data
    console.log(participantResponse)
    if(participantResponse.length === 0) {
      participantResponse = (await client.models.Participant.listParticipantByUserEmail({ userEmail: email }, { authMode: options?.unauthenticated ? 'identityPool' : 'userPool' })).data
      console.log(participantResponse)
      if(participantResponse.length === 0 && profileResponse.data.activeParticipant !== null) {
        const getActiveParticipant = (await client.models.Participant.get({ id: profileResponse.data.activeParticipant }, { authMode: options?.unauthenticated ? 'identityPool' : 'userPool' })).data
        console.log(getActiveParticipant)
        if(getActiveParticipant) participantResponse = [getActiveParticipant]
      }
    }

    const notificationMemo: Notification[] = []
    const collectionsMemo: PhotoCollection[] = []
    const tagsMemo: UserTag[] = options?.memo?.tags ?? []

    const mappedParticipants: Participant[] = await Promise.all(participantResponse.map(async (participant) => {
      const newParticipant = await mapParticipant(client, participant, {
        siCollections: options?.siCollections,
        siNotifications: options?.siNotifications,
        siTags: options?.siTags ? {
          siChildren: true, //TODO: remove the hard coding
          siCollections: options.siCollections,
          siPackages: true,
          siTimeslots: options.siTimeslot
        } : undefined,
        siTimeslot: options?.siTimeslot,
        unauthenticated: options?.unauthenticated,
        memos: {
          notificationsMemo: notificationMemo,
          tagsMemo: tagsMemo,
          collectionsMemo: collectionsMemo,
        },
      })

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
    }))

    if(
      mappedParticipants.length === 0 && 
      profileResponse.data.participantFirstName && 
      profileResponse.data.participantLastName
    ){
      try {
        const participant: Participant = {
          id: v4(),
          firstName: profileResponse.data.participantFirstName,
          lastName: profileResponse.data.participantLastName,
          middleName: profileResponse.data.participantMiddleName ?? undefined,
          preferredName: profileResponse.data.participantPreferredName ?? undefined,
          contact: profileResponse.data.participantContact ?? false,
          email: profileResponse.data.participantEmail ?? undefined,
          createdAt: new Date().toISOString(),
          userTags: (profileResponse.data.userTags ?? []).map((tagString) => {
            if(!tagString) return
            const mappedTag: UserTag = {
              id: tagString,
              name: '',
              children: [],
              participants: [],
              createdAt: new Date().toISOString()
            }
            return mappedTag
          }).filter((tag) => tag !== undefined),
          userEmail: email,
          collections: [],
          notifications: []
        }

        await this.createParticipantMutation({
          participant: participant,
          authMode: options?.unauthenticated ? 'identityPool' : 'userPool',
        })

        mappedParticipants.push(participant)
      } catch(err) {
        //TODO: do something with the error
      }
    }

    //in theory there should be at least one participant upon reaching this point
    let activeParticipant = mappedParticipants.find((participant) => participant.id === profileResponse.data?.activeParticipant)
    if(!profileResponse.data.activeParticipant && mappedParticipants.length > 0){
      activeParticipant = mappedParticipants[0]
      await client.models.UserProfile.update({
        email: email,
        activeParticipant: activeParticipant?.id
      })
    }

    const userProfile: UserProfile = {
      ...profileResponse.data,
      sittingNumber: profileResponse.data.sittingNumber ?? -1,
      participant: mappedParticipants,
      activeParticipant: activeParticipant,
      preferredContact: profileResponse.data.preferredContact ?? 'EMAIL',
      //deprecated
      userTags: [],
      timeslot: undefined,
      participantFirstName: profileResponse.data.participantFirstName ?? undefined,
      participantLastName: profileResponse.data.participantLastName ?? undefined,
      participantMiddleName: profileResponse.data.participantMiddleName ?? undefined,
      participantPreferredName: profileResponse.data.participantPreferredName ?? undefined,
      participantContact: undefined,
      participantEmail: undefined,
      firstName: profileResponse.data.firstName ?? undefined,
      lastName: profileResponse.data.lastName ?? undefined,
      temporary: temporaryToken
    }

    return userProfile
  }

  async getAuthUsers(client: V6Client<Schema>, filter?: string | null, options?: GetAuthUsersOptions): Promise<UserData[] | undefined> {
    const start = new Date().getTime()
    const json = await client.queries.GetAuthUsers({authMode: 'userPool'})
        
    const usersResponse = JSON.parse(json.data?.toString()!) as ListUsersCommandOutput[]
    
    let users = usersResponse.reduce((prev, cur) => {
      if(cur.Users) {
        prev.push(...cur.Users)
      }

      return prev
    }, [] as UserType[])

    const parsedUsersData = (await Promise.all(users.map(async (user) => {
      let attributes = new Map<string, string>()
      if(user.Attributes){
        user.Attributes.filter((attribute) => attribute.Name && attribute.Value).forEach((attribute) => {
          attributes.set(parseAttribute(attribute.Name!), attribute.Value!)
        })
      }
      const enabled = user.Enabled
      const created = user.UserCreateDate
      const updated = user.UserLastModifiedDate
      const status = String(user.UserStatus)
      const userId = String(user.Username)

      let profile: UserProfile | undefined
      const email = attributes.get('email')
      if(options?.siProfiles && email){
        profile = await this.getUserProfileByEmail(client, email, {
          siCollections: true,
          siSets: true,
          siTags: true,
          siTimeslot: true
        })
      }

      return {
        ...Object.fromEntries(attributes),
        enabled,
        created,
        updated,
        status,
        userId,
        profile
      } as UserData
    }))).filter((user) => (filter === undefined || user.email === filter) && filter !== null)

    if(options?.metric) console.log(`GETAUTHUSERS: ${new Date().getTime() - start}ms`)

    return parsedUsersData
  }

  async registerUserMutation(params: RegisterUserMutationParams) {
    const start = new Date()
    const response = await this.client.mutations.RegisterUser({
      userProfile: JSON.stringify(params.userProfile),
      token: params.token
    }, { authMode: 'iam' })
    if(params.options?.logging) console.log(response)
    
    const cognitoResponse = await signUp({
      username: params.userProfile.email.toLocaleLowerCase(),
      password: params.userProfile.password,
      options: {
        userAttributes: {
          email: params.userProfile.email.toLocaleLowerCase(),
          ...(params.userProfile.phone && params.userProfile.phone !== '' && ({phone_number: `+1${params.userProfile.phone.replace(/\D/g, '')}`})),
          given_name: params.userProfile.firstName,
          family_name: params.userProfile.lastName,
          'custom:verified': 'true'
        }
      }
    })
    if(params.options?.logging) console.log(cognitoResponse)
    if(params.options?.metric) console.log(`REGISTERUSER:${new Date().getTime() - start.getTime()}ms`)
    return cognitoResponse.nextStep
  }

  async createAccessTokenMutation(params: CreateAccessTokenMutationParams): Promise<string | undefined> {
    const response = await this.client.models.TemporaryAccessToken.create({
      expire: params.expires?.toISOString(),
      collectionId: params.collectionId,
      sessionTime: params.sessionTime?.toString(),
    })

    if(params.options?.logging) console.log(response)

    return response.data?.id
  }

  async createParticipantMutation(params: CreateParticipantParams) {
    const createResponse = await this.client.models.Participant.create({
      id: params.participant.id,
      firstName: params.participant.firstName,
      lastName: params.participant.lastName,
      middleName: params.participant.middleName,
      preferredName: params.participant.preferredName,
      contact: params.participant.contact,
      email: params.participant.email,
      userEmail: params.participant.userEmail,
    }, { authMode: params.authMode })

    if(params.options?.logging) console.log(createResponse)
    if(!createResponse || !createResponse.data) throw new Error('Failed to create participant')
    

    const taggingResponse = await Promise.all(params.participant.userTags.map((tag) => {
      return this.client.models.ParticipantUserTag.create({
        participantId: createResponse.data!.id,
        tagId: tag.id
      })
    }))

    if(params.options?.logging) console.log(taggingResponse)
      

    const timeslotsUpdateResponse = await Promise.all((params.participant.timeslot ?? []).map(async (timeslot) => {
      const timeslotResponse = await this.client.models.Timeslot.update({
        id: timeslot.id,
        participantId: createResponse.data?.id
      })
      return timeslotResponse
    }))

    if(params.options?.logging) console.log(timeslotsUpdateResponse)
  }

  async updateUserAttributeMutation(params: UpdateUserAttributesMutationParams){
    let updated = false
    if(params.firstName && params.lastName){
      if(!params.admin) {
        const response = await updateUserAttributes({
          userAttributes: {
            email: params.email,
            family_name: params.lastName,
            given_name: params.firstName,
          }
        })
        if(params.options?.logging) console.log(response)
      }
      else {
        const response = await this.client.mutations.AdminUpdateUserAttributes({
          userId: params.admin,
          last: params.lastName,
          first: params.firstName,
          phone: params.phoneNumber ? `+1${params.phoneNumber.replace(/\D/g, "")}` : undefined,
        })
        if(params.options?.logging) console.log(response)
      }
      updated = true
    }
    if(params.phoneNumber && params.accessToken){
      const response = await this.client.mutations.UpdateUserPhoneNumber({
        phoneNumber: `+1${params.phoneNumber.replace(/\D/g, "")}`,
        accessToken: params.accessToken
      })
      if(params.options?.logging) console.log(response)
      updated = true
    }
    if(params.preferredContact !== undefined){
      const response = await this.client.models.UserProfile.update({
        email: params.email,
        preferredContact: params.preferredContact ? "PHONE" : 'EMAIL',
      })
      if(params.options?.logging) console.log(response)
      updated = true
    }
    return updated
  }

  async updateUserProfileMutation(params: UpdateUserProfileParams) {
    if(
      (params.profile.firstName !== params.first && params.first !== undefined && params.first !== '') || 
      (params.profile.lastName !== params.last && params.last !== undefined && params.last !== '') || 
      (params.profile.sittingNumber !== params.sitting && params.sitting !== undefined && !isNaN(params.sitting)) 
    ) {
      const response = await this.client.models.UserProfile.update({
        email: params.profile.email,
        firstName: params.first ?? params.profile.firstName,
        lastName: params.last ?? params.profile.lastName,
        sittingNumber: params.sitting ?? params.profile.sittingNumber,
      })

      if(params.options?.logging) console.log(response)
    }
  }

  async updateParticipantMutation(params: UpdateParticipantMutationParams){
    const addedTags = params.userTags.filter((tag) => !params.participant.userTags.some((pTag) => pTag.id === tag.id))
    const removedTags = params.participant.userTags.filter((pTag) => !params.userTags.some((tag) => tag.id === pTag.id))

    const removedTagsResponse = await Promise.all((await this.client.models.ParticipantUserTag.listParticipantUserTagByParticipantId({ participantId: params.participant.id }))
      .data.map((tag) => {
        if(removedTags.some((rTag) => rTag.id === tag.tagId)) {
          return this.client.models.ParticipantUserTag.delete({ id: tag.id })
        }
      })
    )

    if(params.options?.logging) console.log(removedTagsResponse)

    const addedTagsResponse = await Promise.all(addedTags.map(async (tag) => {
      return this.client.models.ParticipantUserTag.create({
        tagId: tag.id,
        participantId: params.participant.id
      })
    }))

    if(params.options?.logging) console.log(addedTagsResponse)

    if(
      params.email !== params.participant.email || 
      params.firstName !== params.participant.firstName || 
      params.lastName !== params.participant.lastName || 
      params.preferredName !== params.participant.preferredName || 
      params.middleName !== params.participant.middleName || 
      params.contact !== params.participant.contact
    ) {
      const response = await this.client.models.Participant.update({
        id: params.participant.id,
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
        preferredName: params.preferredName,
        middleName: params.middleName,
        contact: params.contact
      })
      if(params.options?.logging) console.log(response)
    }
  }

  async createTempUserProfileMutation(params: CreateTempUserProfileParams): Promise<UserProfile | undefined> {
    const response = await this.client.models.UserProfile.create({
      email: params.email,
    }, { authMode: 'identityPool'})
    if(response.data){
      const mappedProfile: UserProfile = {
        ...response.data,
        sittingNumber: -1,
        userTags: [],
        timeslot: undefined,
        participant: [],
        participantFirstName: undefined,
        participantLastName: undefined,
        participantPreferredName: undefined,
        participantMiddleName: undefined,
        preferredContact: 'EMAIL',
        participantContact: false,
        participantEmail: undefined,
        activeParticipant: undefined,
        firstName: response.data.firstName ?? undefined,
        lastName: response.data.lastName ?? undefined
      }

      return mappedProfile
    }
  }

  async inviteUserMutation(params: InviteUserParams) {
    const participantResponses: [
      Schema['Participant']['type'] | null, 
      (Schema['ParticipantUserTag']['type'] | null)[]
    ][] = await Promise.all(params.participants.map(async (participant) => {
      const response = await this.client.models.Participant.create({
        id: participant.id,
        userEmail: params.email.toLocaleLowerCase(),
        firstName: participant.firstName,
        preferredName: participant.preferredName,
        middleName: participant.middleName,
        lastName: participant.lastName,
        email: (participant.email ?? '').toLocaleLowerCase()
      })
      return [
        response.data,
        (await Promise.all(participant.userTags.map((tag) => (
          this.client.models.ParticipantUserTag.create({
            participantId: participant.id,
            tagId: tag.id
          })
        )))).map((response) => response.data)
      ]
    }))

    if(params.options?.logging) console.log(participantResponses)


    const userResponse = await this.client.models.UserProfile.create({
      sittingNumber: params.sittingNumber,
      email: params.email.toLocaleLowerCase(),
      firstName: params.firstName,
      lastName: params.lastName,
      activeParticipant: participantResponses.length > 0 ? 
        participantResponses[0][0]?.id : undefined
    })

    if(params.options?.logging) console.log(userResponse)

    const tokenResponse = await this.client.models.TemporaryCreateUsersTokens.create({
      userEmail: params.email.toLocaleLowerCase()
    })

    if(params.options?.logging) console.log(tokenResponse)

    if(tokenResponse.data?.id === undefined) return
    
    const response = await this.client.queries.ShareUserInvite({
      email: params.email.toLocaleLowerCase(),
      firstName: params.firstName,
      lastName: params.lastName,
      link: params.baseLink + `?token=${tokenResponse.data!.id}`
    }, {
      authMode: 'userPool'
    })

    if(params.options?.logging) console.log(response)
  }

  async revokeUserInviteMutation(params: RevokeUserInviteMutationParams) {
    const start = new Date()
    const profile = await this.getUserProfileByEmail(this.client, params.userEmail, {
      siCollections: false, // check if individual collections / notifications are needed too 
      siNotifications: false,
      siSets: false,
      siTags: true, //tags needed
      siTimeslot: false, //not possible to register for a timeslot if user is temporary
      siTemporaryToken: true
    })

    if(params.options?.logging) console.log(profile)

    if(!profile || !profile.temporary) return

    const deleteProfileResponse = await this.client.models.UserProfile.delete({
      email: params.userEmail
    })

    if(params.options?.logging) console.log(deleteProfileResponse)

    const deleteParticipantsResponse = await Promise.all(profile.participant.map(async (participant) => {
      const deleteParticipantResponse = await this.client.models.Participant.delete({ id: participant.id })

      const deleteTagsResponse = await Promise.all((await this.client.models.ParticipantUserTag
        .listParticipantUserTagByParticipantId({ participantId: participant.id })).data.map((connection) => (
          this.client.models.ParticipantUserTag.delete({ id: connection.id })
        ))
      )

      return [
        deleteParticipantResponse,
        deleteTagsResponse
      ]
    }))

    if(params.options?.logging) console.log(deleteParticipantsResponse)

    const deleteTemporaryToken = await this.client.models.TemporaryCreateUsersTokens.delete({ id: profile.temporary })
    if(params.options?.logging) console.log(deleteTemporaryToken)
    if(params.options?.metric) console.log(`REVOKEUSERINVITE:${new Date().getTime() - start.getTime()}ms`)
  }

  getUserProfileByEmailQueryOptions = (email: string, options?: GetUserProfileByEmailOptions) => queryOptions({
    queryKey: ['userProfile', email, options],
    queryFn: () => this.getUserProfileByEmail(this.client, email, options)
  })

  getAuthUsersQueryOptions = (filter?: string | null, options?: GetAuthUsersOptions) =>  queryOptions({
    queryKey: ['authUsers', filter, options],
    queryFn: () => this.getAuthUsers(this.client, filter, options)
  })

  getTemporaryAccessTokenQueryOptions = (id: string) => queryOptions({
    queryKey: ['temporaryAccessToken', id],
    queryFn: () => getTemporaryAccessToken(this.client, id)
  })

  getAllTemporaryUsersQueryOptions = (options?: GetAllTemporaryUsersOptions) => queryOptions({
    queryKey: ['temporaryUsers', options],
    queryFn: () => this.getAllTemporaryUsers(this.client, options)
  })

  getTemporaryUserQueryOptions = (id?: string, options?: GetTemporaryUserOptions) => queryOptions({
    queryKey: ['temporaryUser', options],
    queryFn: () => this.getTemporaryUser(this.client, id, options)
  })


  getAllParticipantsQueryOptions = (options?: GetAllParticipantsOptions) => queryOptions({
    queryKey: ['participants', options],
    queryFn: () => getAllParticipants(this.client, options)
  })
}