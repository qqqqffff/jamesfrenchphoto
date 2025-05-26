import { generateClient } from "aws-amplify/api";
import { V6Client } from '@aws-amplify/api-graphql'
import { Schema } from "../../amplify/data/resource";
import { Notification, Package, PackageItem, Participant, PhotoCollection, TemporaryAccessToken, Timeslot, UserData, UserProfile, UserTag } from "../types";
import { getAllCollectionsFromUserTagId } from "./collectionService";
import { queryOptions } from "@tanstack/react-query";
import { parseAttribute } from "../utils";
import { ListUsersCommandOutput } from "@aws-sdk/client-cognito-identity-provider/dist-types/commands/ListUsersCommand";
import { updateUserAttributes } from "aws-amplify/auth";
import { Duration } from "luxon";
import { UserType } from "@aws-sdk/client-cognito-identity-provider/dist-types/models/models_0";
import { getAllTimeslotsByUserTag } from "./timeslotService";
import { getAllNotificationsFromUserTag } from "./notificationService";
import { RegistrationProfile } from "../components/register/RegisterForm";

const client = generateClient<Schema>()

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
async function mapUserTag(tagResponse: Schema['UserTag']['type'], options?: MapUserTagOptions): Promise<UserTag> {
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
                return mapParticipant(participantData, { 
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
    if(options) console.log('options')

    const tagResponse = await client.models.UserTag.get({ id: tagId })
    if(tagResponse.data) {
        const tag = await mapUserTag(tagResponse.data, options)
        if(options?.metric) console.log(`GETTAGBYID:${new Date().getTime() - start.getTime()}`)
        return tag
    }
    return null
}

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
                tagsMemo: userTagData
            }
        })
    }))
    if(options?.metric) console.log(`GETALLTAGS:${new Date().getTime() - start.getTime()}ms`)
    return mappedTags
}

//TODO: implement me please
// interface GetAllUserTagsInfiniteData {
// }
// interface GetAllUserTagsInfiniteOptions { 
// }
// async function getAllUserTagsInfinite(client: V6Client<Schema>, initial: GetAllUserTagsInfiniteData, options?: GetAllUserTagsInfiniteOptions) {
// }

interface GetUserProfileByEmailOptions {
    siTags?: boolean,
    siTimeslot?: boolean,
    siCollections?: boolean,
    siSets?: boolean,
    siTemporaryToken?: boolean,
    siNotifications?: boolean
    unauthenticated?: boolean
}
export async function getUserProfileByEmail(client: V6Client<Schema>, email: string, options?: GetUserProfileByEmailOptions): Promise<UserProfile | undefined> {
    const profileResponse = await client.models.UserProfile.get({ email: email }, { authMode: options?.unauthenticated ? 'identityPool' : 'userPool'})
    if(!profileResponse || !profileResponse.data) return
    const temporaryToken = options?.siTemporaryToken ? (await profileResponse.data.temporaryCreate()).data?.id : undefined
    const participantResponse = await profileResponse.data.participant({ authMode: options?.unauthenticated ? 'identityPool' : 'userPool' })

    const notificationMemo: Notification[] = []
    const collectionsMemo: PhotoCollection[] = []
    const tagsMemo: UserTag[] = []

    const mappedParticipants: Participant[] = await Promise.all(participantResponse.data.map(async (participant) => {
        const newParticipant = await mapParticipant(participant, {
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

    if(mappedParticipants.length === 0 && 
        profileResponse.data.participantFirstName && 
        profileResponse.data.participantLastName){
        try {
            mappedParticipants.push(await createParticipantMutation({
                participant: {
                    firstName: profileResponse.data.participantFirstName,
                    lastName: profileResponse.data.participantLastName,
                    middleName: profileResponse.data.participantMiddleName ?? undefined,
                    preferredName: profileResponse.data.participantPreferredName ?? undefined,
                    contact: profileResponse.data.participantContact ?? false,
                    email: profileResponse.data.participantEmail ?? undefined,
                    userTags: (await Promise.all((profileResponse.data.userTags ?? []).map(async (tagString) => {
                        if(!tagString) return
                        const mappedTag: UserTag = {
                            id: tagString,
                            name: '',
                            children: [],
                            participants: [],
                            createdAt: new Date().toISOString()
                        }
                        return mappedTag
                    }))).filter((tag) => tag !== undefined),
                    userEmail: email,
                    collections: []
                },
                authMode: options?.unauthenticated ? 'identityPool' : 'userPool',
            }))
        } catch(err) {
            
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

interface GetAuthUsersOptions {
    siProfiles?: boolean,
    logging?: boolean
    metric?: boolean
}
export async function getAuthUsers(client: V6Client<Schema>, filter?: string | null, options?: GetAuthUsersOptions): Promise<UserData[] | undefined> {
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
            profile = await getUserProfileByEmail(client, email, {
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

interface GetAllTemporaryUsersOptions {
    logging?: boolean
}
async function getAllTemporaryUsers(client: V6Client<Schema>, options?: GetAllTemporaryUsersOptions): Promise<UserProfile[] | undefined> {
    const response = await client.models.TemporaryCreateUsersTokens.list()

    if(options?.logging) console.log(response)

    const mappedResponse: UserProfile[] = (await Promise.all(response.data.map(async (token) => {
        return getUserProfileByEmail(client, token.userEmail)
    }))).filter((data) => data !== undefined)

    if(options?.logging) console.log(mappedResponse)

    return mappedResponse
}

interface GetTemporaryUserOptions {
    logging?: boolean
}
async function getTemporaryUser(client: V6Client<Schema>, id?: string, options?: GetTemporaryUserOptions): Promise<UserProfile | undefined> {
    if(id) {
        const tokenResponse = await client.models.TemporaryCreateUsersTokens.get({ id: id }, { authMode: 'identityPool' })

        if(options?.logging) console.log(tokenResponse)
        if(!tokenResponse.data) return

        const mappedResponse = await getUserProfileByEmail(client, tokenResponse.data.userEmail, { siTags: true, unauthenticated: true })
        if(options?.logging) console.log(mappedResponse)

        return mappedResponse
    }
    return
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
export async function mapParticipant(participantResponse: Schema['Participant']['type'], options?: MapParticipantOptions): Promise<Participant> {
    const userTags: UserTag[] = []
    const notifications: Notification[] = []
    const timeslots: Timeslot[] = []
    const collections: PhotoCollection[] = []

    const notificationMemo: Notification[] = options?.memos?.notificationsMemo ?? []
    const collectionsMemo: PhotoCollection[] = options?.memos?.collectionsMemo ?? []
    //no need to create a tags memo since the memo does not change

    console.log(await participantResponse.tags({ authMode: 'identityPool' }))

    if(options?.siTags) {
        userTags.push(...(
            (await Promise.all(
                ((await participantResponse.tags({ authMode: options?.unauthenticated ? 'identityPool' : 'userPool' })).data ?? []).map(async (tag) => {
                    console.log(tag)
                    let mappedTag: UserTag | undefined = options.memos?.tagsMemo?.find((mTag) => tag.tagId === mTag.id)
                    if(mappedTag) {
                        return mappedTag
                    }
                    const tagResponse = await tag.tag({ authMode: options?.unauthenticated ? 'identityPool' : 'userPool' })
                    if(tagResponse.data) {
                        const children: UserTag[] = []
                        const notifications: Notification[] = []
                        const collections: PhotoCollection[] = []
                        const timeslots: Timeslot[] = []
                        let pack: Package | undefined

                        if(options.siTags?.siChildren) {
                            //assume that a parent's children are unique and will not show up in a different tag therefore memoization will make no difference
                            children.push(...(
                                await Promise.all((await tagResponse.data.childTags()).data.map(async (child) => {
                                    const foundTag = options.memos?.tagsMemo?.find((tag) => tag.id === child.tagId)
                                    if(foundTag) {
                                        return foundTag
                                    }
                                    const tagResponse = await child.tag()
                                    if(tagResponse.data) {
                                        //only shallow depth required for children since they will not be included in the tag memo
                                        const mappedTag: UserTag = {
                                            ...tagResponse.data,
                                            color: tagResponse.data.color ?? undefined,
                                            notifications: [],
                                            children: [],
                                            participants: []
                                        }
                                        return mappedTag
                                    }
                                }))
                            ).filter((tag) => tag !== undefined))
                        }

                        if(options?.siNotifications) {
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

                        if(options?.siTags?.siCollections) {
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

                        if(options?.siTags?.siTimeslots) {
                            //timeslots are not memoized since they are unique for user tags
                            timeslots.push(...(
                                await Promise.all((await tagResponse.data.timeslotTags()).data.map(async (timeslot) => {
                                    const timeslotResponse = await timeslot.timeslot()
                                    if(timeslotResponse.data) {
                                        const mappedTimeslot: Timeslot = {
                                            ...timeslotResponse.data,
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

                        if(options?.siTags?.siPackages) {
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
        timeslots.push(...(
            await Promise.all((await participantResponse.timeslot()).data.map(async (timeslot) => {
                const mappedTimeslot: Timeslot = {
                    ...timeslot,
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
        const newParticipant = await mapParticipant(participant, {
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

//TODO: implement me please :)
export interface RegisterUserMutationParams {
    userProfile: RegistrationProfile,
    token?: string,
}
export async function registerUserMutation(params: RegisterUserMutationParams) {

}

export interface CreateAccessTokenMutationParams {
    expires?: Date,
    sessionTime?: Duration,
    collectionId: string,
    options?: {
        logging?: boolean
    }
}
export async function createAccessTokenMutation(params: CreateAccessTokenMutationParams): Promise<string | undefined> {
    const response = await client.models.TemporaryAccessToken.create({
        expire: params.expires?.toISOString(),
        collectionId: params.collectionId,
        sessionTime: params.sessionTime?.toString(),
    })

    if(params.options?.logging) console.log(response)

    return response.data?.id
}

export interface CreateParticipantParams {
    participant: Omit<Participant, 'id' | 'notifications'>,
    authMode: 'identityPool' | 'userPool',
    options?: {
        logging: boolean
    }
}
export async function createParticipantMutation(params: CreateParticipantParams): Promise<Participant> {
    const createResponse = await client.models.Participant.create({
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
        return client.models.ParticipantUserTag.create({
            participantId: createResponse.data!.id,
            tagId: tag.id
        })
    }))

    if(params.options?.logging) console.log(taggingResponse)
        

    const timeslotsUpdateResponse = await Promise.all((params.participant.timeslot ?? []).map(async (timeslot) => {
        const timeslotResponse = await client.models.Timeslot.update({
            id: timeslot.id,
            participantId: createResponse.data?.id
        })
        return timeslotResponse
    }))

    if(params.options?.logging) console.log(timeslotsUpdateResponse)

    return {
        id: createResponse.data.id,
        ...params.participant,
        //TODO: create tag mapping response
        notifications: []
    }
}

export interface UpdateUserAttributesMutationParams{
    email: string,
    lastName?: string,
    firstName?: string,
    phoneNumber?: string,
    accessToken?: string,
    preferredContact?: 'EMAIL' | 'PHONE'
}
export async function updateUserAttributeMutation(params: UpdateUserAttributesMutationParams){
    let updated = false
    if(params.firstName && params.lastName){
        await updateUserAttributes({
            userAttributes: {
                email: params.email,
                family_name: params.lastName,
                given_name: params.firstName,
            }
        })
        updated = true
    }
    if(params.phoneNumber && params.accessToken){
        await client.queries.UpdateUserPhoneNumber({
            phoneNumber: `+1${params.phoneNumber.replace(/\D/g, "")}`,
            accessToken: params.accessToken
        })
        updated = true
    }
    if(params.preferredContact !== undefined){
        await client.models.UserProfile.update({
            email: params.email,
            preferredContact: params.preferredContact ? "PHONE" : 'EMAIL',
        })
        updated = true
    }
    return updated
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
}
export async function updateParticipantMutation(params: UpdateParticipantMutationParams){
    const addedTags = params.userTags.filter((tag) => !params.participant.userTags.some((pTag) => pTag.id === tag.id))
    const removedTags = params.userTags.filter((pTag) => !params.userTags.some((tag) => tag.id === pTag.id))

    await Promise.all((await client.models.ParticipantUserTag.listParticipantUserTagByParticipantId({ participantId: params.participant.id }))
        .data.map((tag) => {
            if(removedTags.some((rTag) => rTag.id === tag.tagId)) {
                return client.models.ParticipantUserTag.delete({ id: tag.id })
            }
        })
    )

    await Promise.all(addedTags.map(async (tag) => {
        return client.models.ParticipantUserTag.create({
            tagId: tag.id,
            participantId: params.participant.id
        })
    }))

    return client.models.Participant.update({
        id: params.participant.id,
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
        preferredName: params.preferredName,
        middleName: params.middleName,
        contact: params.contact
    })
}

export interface CreateTempUserProfileParams {
    email: string,
}
export async function createTempUserProfileMutation(params: CreateTempUserProfileParams): Promise<UserProfile | undefined> {
    const response = await client.models.UserProfile.create({
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
export async function inviteUserMutation(params: InviteUserParams) {
    const participantResponses: [
        Schema['Participant']['type'] | null, 
        (Schema['ParticipantUserTag']['type'] | null)[]
    ][] = await Promise.all(params.participants.map(async (participant) => {
        const response = await client.models.Participant.create({
            userEmail: params.email,
            firstName: participant.firstName,
            preferredName: participant.preferredName,
            middleName: participant.middleName,
            lastName: participant.lastName,
            email: participant.email
        })
        return [
            response.data,
            (await Promise.all(participant.userTags.map((tag) => (
                client.models.ParticipantUserTag.create({
                    participantId: participant.id,
                    tagId: tag.id
                })
            )))).map((response) => response.data)
        ]
    }))

    if(params.options?.logging) console.log(participantResponses)


    const userResponse = await client.models.UserProfile.create({
        sittingNumber: params.sittingNumber,
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
        activeParticipant: participantResponses.length > 0 ? 
            participantResponses[Math.floor(Math.random() * participantResponses.length)][0]?.id : undefined
    })

    if(params.options?.logging) console.log(userResponse)

    const tokenResponse = await client.models.TemporaryCreateUsersTokens.create({
        userEmail: params.email
    })

    if(params.options?.logging) console.log(tokenResponse)

    if(!tokenResponse.data) return

    const shareResponse = await client.queries.ShareUserInvite({
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
        link: params.baseLink + `?token=${tokenResponse.data.id}`
    })

    if(params.options?.logging) console.log(shareResponse)
}

export interface RevokeUserInviteMutationParams {
    userEmail: string,
    options?: {
        logging?: boolean,
        metric?: boolean
    }
}
export async function revokeUserInviteMutation(params: RevokeUserInviteMutationParams) {
    const start = new Date()
    const profile = await getUserProfileByEmail(client, params.userEmail, {
        siCollections: false, // check if individual collections / notifications are needed too 
        siNotifications: false,
        siSets: false,
        siTags: true, //tags needed
        siTimeslot: false, //not possible to register for a timeslot if user is temporary
        siTemporaryToken: true
    })

    if(params.options?.logging) console.log(profile)

    if(!profile || !profile.temporary) return

    const deleteProfileResponse = await client.models.UserProfile.delete({
        email: params.userEmail
    })

    if(params.options?.logging) console.log(deleteProfileResponse)

    const deleteParticipantsResponse = await Promise.all(profile.participant.map(async (participant) => {
        const deleteParticipantResponse = await client.models.Participant.delete({ id: participant.id })

        const deleteTagsResponse = await Promise.all((await client.models.ParticipantUserTag
            .listParticipantUserTagByParticipantId({ participantId: participant.id })).data.map((connection) => (
                client.models.ParticipantUserTag.delete({ id: connection.id })
            ))
        )

        return [
            deleteParticipantResponse,
            deleteTagsResponse
        ]
    }))

    if(params.options?.logging) console.log(deleteParticipantsResponse)

    const deleteTemporaryToken = await client.models.TemporaryCreateUsersTokens.delete({ id: profile.temporary })
    if(params.options?.logging) console.log(deleteTemporaryToken)
    if(params.options?.metric) console.log(`REVOKEUSERINVITE:${new Date().getTime() - start.getTime()}ms`)
}

export interface CreateTagParams {
    tag: UserTag,
    options?: {
        logging?: boolean
        metric?: boolean
    }
}
export async function createTagMutation(params: CreateTagParams) {
    const start = new Date()
    const createTagResponse = await client.models.UserTag.create({
        id: params.tag.id,
        name: params.tag.name,
        color: params.tag.color,
    })

    if(params.options?.logging) console.log(createTagResponse)

    const createCollectionTagResponse = await Promise.all((params.tag.collections ?? []).map(async (collection) => {
        return [
            await client.models.CollectionTag.create({
                collectionId: collection.id,
                tagId: params.tag.id
            })
        ]
    }))

    if(params.options?.logging) console.log(createCollectionTagResponse)

    const createTimeslotTagResponse = await Promise.all((params.tag.timeslots ?? []).map(async (timeslot) => {
        return [
            await client.models.TimeslotTag.create({
                tagId: params.tag.id,
                timeslotId: timeslot.id
            })
        ]
    }))

    if(params.options?.logging) console.log(createTimeslotTagResponse)

    const createParticipantTagResponse = await Promise.all(params.tag.participants.map(async (participant) => {
        return [
            await client.models.ParticipantUserTag.create({
                participantId: participant.id,
                tagId: params.tag.id
            })
        ]
    }))

    if(params.options?.logging) console.log(createParticipantTagResponse)
    if(params.options?.metric) console.log(`CREATETAG:${new Date().getTime() - start.getTime()}ms`)       
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
export async function updateTagMutation(params: UpdateTagParams) {
    const start = new Date()

    //updating collections
    const newCollections: PhotoCollection[] = (params.collections ?? [])
        .filter((collection) => !params.tag.collections?.some((pCollection) => pCollection.id === collection.id))

    const removedCollections = (params.tag.collections ?? []).filter((collection) => !params.collections?.some((pCollection) => pCollection.id === collection.id))

    //TODO: can optimize by putting the removal api call inside of the next token loop
    const fetchAndDeleteCollectionConnections = async () => {
        let collectionConnectionResponse = await client.models.CollectionTag
            .listCollectionTagByTagId({ tagId: params.tag.id })
        const collectionConnectionData = collectionConnectionResponse.data

        while(collectionConnectionResponse.nextToken) {
            collectionConnectionResponse = await client.models.CollectionTag
                .listCollectionTagByTagId(
                    { tagId: params.tag.id },
                    { nextToken: collectionConnectionResponse.nextToken }
                )
            collectionConnectionData.push(...collectionConnectionResponse.data)
        }

        return Promise.all(removedCollections.map((collection) => {
            const foundConnection = collectionConnectionData.find((connection) => connection.collectionId === collection.id)
            if(foundConnection) return client.models.CollectionTag.delete({ id: foundConnection.id })
        }))
    }

    const collectionConnectionsToDelete = removedCollections.length > 0 ? (
        await fetchAndDeleteCollectionConnections()
    ) : undefined

    if(params.options?.logging) console.log(collectionConnectionsToDelete)

    const newCollectionsResponse = await Promise.all(newCollections.map((collection) => {
        return client.models.CollectionTag.create({
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
        let timeslotConnectionResponse = await client.models.TimeslotTag
            .listTimeslotTagByTagId({ tagId: params.tag.id })
        const timeslotConnectionData = timeslotConnectionResponse.data

        while(timeslotConnectionResponse.nextToken) {
            timeslotConnectionResponse = await client.models.TimeslotTag
                .listTimeslotTagByTagId(
                    { tagId: params.tag.id },
                    { nextToken: timeslotConnectionResponse.nextToken }
                )
            timeslotConnectionData.push(...timeslotConnectionResponse.data)
        }

        return Promise.all(removedTimeslots.map((timeslot) => {
            const foundConnection = timeslotConnectionData.find((connection) => connection.timeslotId === timeslot.id)
            if(foundConnection) return client.models.TimeslotTag.delete({ id: foundConnection.id })
        }))
    }

    const timeslotConnectionsToDelete = removedTimeslots.length > 0 ? (
        await fetchAndDeleteTimeslotConnections()
    ) : undefined

    if(params.options?.logging) console.log(timeslotConnectionsToDelete)

    const newTimeslotsResponse = await Promise.all(newTimeslots.map((timeslot) => {
        return client.models.TimeslotTag.create({
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
        let participantConnectionResponse = await client.models.ParticipantUserTag
            .listParticipantUserTagByTagId({ tagId: params.tag.id })
        const participantConnectionData = participantConnectionResponse.data

        while(participantConnectionResponse.nextToken) {
            participantConnectionResponse = await client.models.ParticipantUserTag
                .listParticipantUserTagByTagId(
                    { tagId: params.tag.id },
                    { nextToken: participantConnectionResponse.nextToken }
                )
            participantConnectionData.push(...participantConnectionResponse.data)
        }

        return Promise.all(removedParticipants.map((participant) => {
            const foundConnection = participantConnectionData.find((connection) => connection.participantId === participant.id)
            if(foundConnection) return client.models.CollectionTag.delete({ id: foundConnection.id })
        }))
    }

    const participantConnectionsToDelete = removedParticipants.length > 0 ? (
        await fetchAndDeleteParticipantConnections()
    ) : undefined

    if(params.options?.logging) console.log(participantConnectionsToDelete)

    const newParticipantsResponse = await Promise.all(newParticipants.map((participant) => {
        return client.models.ParticipantUserTag.create({
            participantId: participant.id,
            tagId: params.tag.id
        })
    }))
    if(params.options?.logging) console.log(newParticipantsResponse)

    if(
        params.tag.name !== params.name ||
        params.tag.color !== params.color
    ) {
        const response = await client.models.UserTag.update({
            id: params.tag.id,
            name: params.name ?? params.tag.name,
            color: params.color ?? params.tag.color
        })
        if(params.options?.logging) console.log(response)
    }

    if(params.options?.metric) console.log(`UPDATETAG:${new Date().getTime() - start.getTime()}ms`)
}

export const getAllUserTagsQueryOptions = (options?: GetAllUserTagsOptions) => queryOptions({
    queryKey: ['userTags', client, options],
    queryFn: () => getAllUserTags(client, options)
})

export const getUserTagByIdQueryOptions = (tagId?: string, options?: GetTagByIdOptions) => queryOptions({
    queryKey: ['userTag', client, options],
    queryFn: () => getTagById(client, tagId, options)
})

export const getUserProfileByEmailQueryOptions = (email: string, options?: GetUserProfileByEmailOptions) => queryOptions({
    queryKey: ['userProfile', client, email, options],
    queryFn: () => getUserProfileByEmail(client, email, options)
})

export const getAuthUsersQueryOptions = (filter?: string | null, options?: GetAuthUsersOptions) =>  queryOptions({
    queryKey: ['authUsers', client, filter, options],
    queryFn: () => getAuthUsers(client, filter, options)
})

export const getTemporaryAccessTokenQueryOptions = (id: string) => queryOptions({
    queryKey: ['temporaryAccessToken', client, id],
    queryFn: () => getTemporaryAccessToken(client, id)
})

export const getAllTemporaryUsersQueryOptions = (options?: GetAllTemporaryUsersOptions) => queryOptions({
    queryKey: ['temporaryUsers', client, options],
    queryFn: () => getAllTemporaryUsers(client, options)
})

export const getTemporaryUserQueryOptions = (id?: string, options?: GetTemporaryUserOptions) => queryOptions({
    queryKey: ['temporaryUser', client, options],
    queryFn: () => getTemporaryUser(client, id, options)
})

export const getAllParticipantsQueryOptions = (options?: GetAllParticipantsOptions) => queryOptions({
    queryKey: ['participants', client, options],
    queryFn: () => getAllParticipants(client, options)
})

export const getAllParticipantsByUserTagQueryOptions = (tagId?: string, options?: GetAllParticipantsByUserTagOptions) => queryOptions({
    queryKey: ['userTagParticipants', client, tagId, options],
    queryFn: () => getAllParticipantsByUserTag(client, tagId, options)
})