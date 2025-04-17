import { generateClient } from "aws-amplify/api";
import { V6Client } from '@aws-amplify/api-graphql'
import { Schema } from "../../amplify/data/resource";
import { Notification, Participant, PhotoCollection, PhotoSet, TemporaryAccessToken, Timeslot, UserData, UserProfile, UserTag } from "../types";
import { getAllCollectionsFromUserTags } from "./collectionService";
import { queryOptions } from "@tanstack/react-query";
import { parseAttribute } from "../utils";
import { ListUsersCommandOutput } from "@aws-sdk/client-cognito-identity-provider/dist-types/commands/ListUsersCommand";
import { updateUserAttributes } from "aws-amplify/auth";
import { Duration } from "luxon";
import { UserType } from "@aws-sdk/client-cognito-identity-provider/dist-types/models/models_0";
import { getAllTimeslotsByUserTag } from "./timeslotService";
import { getAllNotificationsFromUserTag } from "./notificationService";

const client = generateClient<Schema>()

interface GetTagByIdOptions {
    //TODO: implement the secondary indexes
    siCollection?: boolean,
    siTimeslots?: boolean,
    siNotifications?: boolean,
}
async function getTagById(client: V6Client<Schema>, tagId?: string, options?: GetTagByIdOptions): Promise<UserTag | null> {
    if(!tagId) return null
    if(options) console.log('options')

    const tagResponse = await client.models.UserTag.get({ id: tagId })
    if(tagResponse.data) {
        const mappedTag: UserTag = {
            ...tagResponse.data,
            color: tagResponse.data.color ?? undefined,
            //TODO: implement me later
            collections: [],
            timeslots: [],
            notifications: [],
            package: undefined
        }
        return mappedTag
    }
    return null
}

interface GetAllUserTagsOptions {
    siCollections?: boolean
    siTimeslots?: boolean,
    siNotifications?: boolean
}
async function getAllUserTags(client: V6Client<Schema>, options?: GetAllUserTagsOptions): Promise<UserTag[]> {
    console.log('api call')
    let userTagsResponse = await client.models.UserTag.list()
    let userTagData = userTagsResponse.data

    while(userTagsResponse.nextToken) {
        userTagsResponse = await client.models.UserTag.list({ nextToken: userTagsResponse.nextToken })
        userTagData.push(...userTagsResponse.data)
    }

    let notificationMemo: Notification[] = []

    const mappedTags = await Promise.all(userTagData.map(async (tag) => {
        const collections: PhotoCollection[] = []
        const timeslots: Timeslot[] = []
        const notifications: Notification[] = []
        if(!options || options.siCollections) {
            collections.push(...(await getAllCollectionsFromUserTags(client, [{
                    ...tag,
                    collections: [],
                    notifications: [],
                    color: undefined,
                }], {
                    siTags: false
                })
            ))
        }
        if(options?.siTimeslots) {
            timeslots.push(...(await getAllTimeslotsByUserTag(client, {
                ...tag, 
                collections: [],
                notifications: [],
                color: undefined
            })))
        }
        if(options?.siNotifications) {
            const response = await getAllNotificationsFromUserTag(client, notificationMemo, tag.id)
            notifications.push(...response[0])
            notificationMemo = response[1]
        }
        const mappedTag: UserTag = {
            ...tag,
            collections: collections,
            color: tag.color ?? undefined,
            notifications: notifications

        }
        return mappedTag
    }))
    return mappedTags
}

interface GetUserProfileByEmailOptions {
    siTags?: boolean,
    siTimeslot?: boolean,
    siCollections?: boolean,
    siSets?: boolean,
    siNotifications?: boolean
    unauthenticated?: boolean
}
export async function getUserProfileByEmail(client: V6Client<Schema>, email: string, options?: GetUserProfileByEmailOptions): Promise<UserProfile | undefined> {
    console.log('api call')
    const profileResponse = await client.models.UserProfile.get({ email: email }, { authMode: options?.unauthenticated ? 'identityPool' : 'userPool'})
    if(!profileResponse || !profileResponse.data) return
    const participantResponse = await profileResponse.data.participant({ authMode: options?.unauthenticated ? 'identityPool' : 'userPool' })

    const notificationMemo: Notification[] = []
    const mappedParticipants: Participant[] = await Promise.all(participantResponse.data.map(async (participant) => {
        const tags: UserTag[] = []
        const timeslots: Timeslot[] = []
        const notifications: Notification[] = []
        if(options === undefined || options.siTags){
             tags.push(...(await Promise.all(((await participant.tags()).data ?? []).filter((tag) => tag !== null).map(async (tag) => {
                const tagResponse = await tag.tag({ authMode: options?.unauthenticated ? 'identityPool' : 'userPool' })
                const notifications: Notification[] = []
                if(!tagResponse || !tagResponse.data) return
                const mappedCollections: PhotoCollection[] = []
                if(!options || options.siCollections){
                    mappedCollections.push(...(await Promise.all((await tagResponse.data.collectionTags()).data.map(async (colTag) => {
                        const collection = await colTag.collection()
                        if(!collection || !collection.data) return
                        const sets: PhotoSet[] = []
                        if(!options || options.siSets){
                            sets.push(...(await collection.data.sets()).data.map((set) => {
                                const mappedSet: PhotoSet = {
                                    ...set,
                                    watermarkPath: set.watermarkPath ?? undefined,
                                    paths: [],
                                    items: set.items ?? 0
                                }
                                return mappedSet
                            }))
                        }
                        const mappedCollection: PhotoCollection = {
                            ...collection.data,
                            coverPath: collection.data.coverPath ?? undefined,
                            publicCoverPath: collection.data.publicCoverPath ?? undefined,
                            watermarkPath: collection.data.watermarkPath ?? undefined,
                            downloadable: collection.data.downloadable ?? false,
                            items: collection.data.items ?? 0,
                            published: collection.data.published ?? false,
                            coverType: {
                                textColor: collection.data.coverType?.textColor ?? undefined,
                                bgColor: collection.data.coverType?.bgColor ?? undefined,
                                placement: collection.data.coverType?.placement ?? undefined,
                                textPlacement: collection.data.coverType?.textPlacement ?? undefined,
                                date: collection.data.coverType?.date ?? undefined
                            },
                            sets: sets,
                            //unnecessary
                            tags: [],
                        }
                        return mappedCollection
                    }))).filter((item) => item !== undefined))
                }
                if(!options?.unauthenticated) {
                    const notificationResponse = await getAllNotificationsFromUserTag(client, notificationMemo, tag.tagId)
                    notificationMemo.push(...notificationResponse[1])
                    notifications.push(...notificationResponse[0])
                }
                
                const mappedTag: UserTag = {
                    ...tagResponse.data,
                    color: tagResponse.data.color ?? undefined,
                    collections: mappedCollections,
                    notifications: notifications
                }
                return mappedTag
            }))).filter((tag) => tag !== undefined))
        }
        if(options === undefined || options.siTimeslot){
            timeslots.push(...(await Promise.all((await participant.timeslot()).data.map(async (timeslot) => {
                const tag = await timeslot.timeslotTag()
                let mappedTag: UserTag | undefined
                if(options?.siTags){
                    mappedTag = tags.find((userTag) => userTag.id === tag.data?.tagId)
                }
                else {
                    const tagResponse = await tag.data?.tag()
                    if(tagResponse && tagResponse.data){
                        mappedTag = {
                            ...tagResponse.data,
                            color: tagResponse.data.color ?? undefined,
                            notifications: undefined
                        }
                    }
                }
                const mappedTimeslot: Timeslot = {
                    ...timeslot,
                    start: new Date(timeslot.start),
                    end: new Date(timeslot.end),
                    tag: mappedTag,
                    //unneccessary
                    register: undefined,
                    participant: undefined,
                }
                return mappedTimeslot
            }))))
        }
        if(options === undefined || options.siNotifications) {
            notifications.push(...(await Promise.all((await participant.notifications()).data.map(async (notificationTag) => {
                const notification = await notificationTag.notification()
                if(notification.data){
                    const mappedNotification: Notification = {
                        ...notification.data,
                        location: notification.data.location ?? 'dashboard',
                        expiration: notification.data.expiration ?? undefined,
                        //unnecesary
                        participants: [],
                        tags: []
                    }
                    return mappedNotification
                }
            }))).filter((notification) => notification !== undefined))
        }

        const mappedParticipant: Participant = {
            ...participant,
            userTags: tags,
            middleName: participant.middleName ?? undefined,
            preferredName: participant.preferredName ?? undefined,
            email: participant.email ?? undefined,
            contact: participant.contact ?? false,
            timeslot: timeslots,
            notifications: notifications
        }
        return mappedParticipant
    }))

    if(mappedParticipants.length === 0 && 
        profileResponse.data.participantFirstName && 
        profileResponse.data.participantLastName){
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
                    }
                    return mappedTag
                }))).filter((tag) => tag !== undefined),
                userEmail: email,
            },
        }))
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
        lastName: profileResponse.data.lastName ?? undefined
    }

    return userProfile
}

interface GetAuthUsersOptions {
    siProfiles?: boolean,
    logging?: boolean
    metric?: boolean
}
export async function getAuthUsers(client: V6Client<Schema>, filter?: string | null, options?: GetAuthUsersOptions): Promise<UserData[] | undefined> {
    console.log('api call')
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
        const tokenResponse = await client.models.TemporaryCreateUsersTokens.get({ id: id })

        if(options?.logging) console.log(tokenResponse)
        if(!tokenResponse.data) return

        const mappedResponse = await getUserProfileByEmail(client, tokenResponse.data.userEmail, { siTags: true, unauthenticated: true })

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

interface GetAllParticipantsOptions {
    siTags?: boolean,
    siTimeslot?: boolean, //TODO: implement me
    siNotifications?: boolean
}
async function getAllParticipants(client: V6Client<Schema>, options?: GetAllParticipantsOptions): Promise<Participant[]> {
    let participantResponse = await client.models.Participant.list()
    const participantData = participantResponse.data

    while(participantResponse.nextToken) {
        participantResponse = await client.models.Participant.list({ nextToken: participantResponse.nextToken })
        participantData.push(...participantResponse.data)
    }

    const mappedParticipants: Participant[] = await Promise.all(participantData.map(async (participant) => {
        const userTags: UserTag[] = []
        const notifications: Notification[] = []
        
        if(options?.siTags) {
            userTags.push(...(await Promise.all(((await participant.tags()).data ?? []).map(async (tag) => {
                const tagResponse = await tag.tag()
                if(tagResponse.data) {
                    const mappedTag: UserTag = {
                        ...tagResponse.data,
                        color: tagResponse.data.color ?? undefined,
                        notifications: undefined
                    }
                    return mappedTag
                }
            }))).filter((tag) => tag !== undefined))
        }

        if(options?.siNotifications) {
            notifications.push(...(await Promise.all((await participant.notifications()).data.map(async (notificationTag) => {
                const notification = await notificationTag.notification()
                if(notification.data){
                    const mappedNotification: Notification = {
                        ...notification.data,
                        location: notification.data.location ?? 'dashboard',
                        expiration: notification.data.expiration ?? undefined,
                        //unnecesary
                        participants: [],
                        tags: []
                    }
                    return mappedNotification
                }
            }))).filter((notification) => notification !== undefined))
        }

        const mappedParticipant: Participant = {
            ...participant,
            middleName: participant.middleName ?? undefined,
            preferredName: participant.preferredName ?? undefined,
            contact: participant.contact ?? false,
            email: participant.email ?? undefined,
            timeslot: [],
            userTags: userTags,
            notifications: notifications
        }
        return mappedParticipant
    }))

    return mappedParticipants
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
    authMode?: 'iam',
    options?: {
        logging: boolean
    }
}
export async function createParticipantMutation(params: CreateParticipantParams): Promise<Participant> {
    const createResponse = await client.models.Participant.create({
        ...params.participant,
    }, { authMode: params.authMode })

    if(!createResponse || !createResponse.data) throw new Error('Failed to create participant')
    if(params.options?.logging) console.log(createResponse)

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
    const participantResponses = await Promise.all(params.participants.map(async (participant) => {
        const response = await client.models.Participant.create({
            userEmail: params.email,
            firstName: participant.firstName,
            preferredName: participant.preferredName,
            lastName: participant.lastName,
            email: participant.email
        })
        return response
    }))

    if(params.options?.logging) console.log(participantResponses)


    const userResponse = await client.models.UserProfile.create({
        email: params.email,
        firstName: params.firstName,
        lastName: params.lastName,
        activeParticipant: participantResponses.length > 0 ? 
            participantResponses[Math.floor(Math.random() * participantResponses.length)].data?.id : undefined
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

export interface CreateTagParams {
    name: string,
    color?: string,
    timeslots: Timeslot[],
    collections: PhotoCollection[],
    options?: {
        logging?: boolean
    }
}
export async function createTagMutation(params: CreateTagParams) {
    const createTagResponse = await client.models.UserTag.create({
        name: params.name,
        color: params.color
    })

    if(params.options?.logging) console.log(createTagResponse)
    
    if(createTagResponse !== null && createTagResponse.data !== null) {
        const collectionTagging = await Promise.all(params.collections.map(async (collection) => {
            const response = await client.models.CollectionTag.create({
                collectionId: collection.id,
                tagId: createTagResponse.data!.id
            })
            return response
        }))
        if(params.options?.logging) console.log(collectionTagging)

        const timeslotTagging = await Promise.all(params.timeslots.map(async (timeslot) => {
            const response = await client.models.TimeslotTag.create({
                timeslotId: timeslot.id,
                tagId: createTagResponse.data!.id
            })
            return response
        }))
        if(params.options?.logging) console.log(timeslotTagging)
        
        const mappedTag: UserTag = {
            id: createTagResponse.data.id,
            name: params.name,
            color: params.color,
            collections: params.collections,
            timeslots: params.timeslots
        }

        return mappedTag
    }
}

export interface UpdateTagParams extends Partial<CreateTagParams> {
    tag: UserTag
}
export async function updateTagMutation(params: UpdateTagParams) {
    const removedTimeslots = params.tag.timeslots?.filter((oldTs) => !params.timeslots?.some((newTs) => newTs.id === oldTs.id))
    const newTimeslots = params.timeslots?.filter((newTs) => !params.tag.timeslots?.some((oldTs) => oldTs.id === newTs.id))

    const removedCollections = params.tag.collections?.filter((oldCol) => !params.collections?.some((newCol) => newCol.id === oldCol.id))
    const newCollections = params.collections?.filter((newCol) => params.tag.collections?.some((oldCol) => oldCol.id === newCol.id))

    let timeslotsResponse = await client.models.TimeslotTag.listTimeslotTagByTagId({ tagId: params.tag.id })
    let timeslotsData = timeslotsResponse.data

    while(timeslotsResponse.nextToken) {
        timeslotsResponse = await client.models.TimeslotTag.listTimeslotTagByTagId({ tagId: params.tag.id }, { nextToken: timeslotsResponse.nextToken })
        timeslotsData.push(...timeslotsResponse.data)
    }

    const removedTimeslotsResponse = await Promise.all(timeslotsData.map(async (timeslotTag) => {
        if(removedTimeslots?.some((timeslot) => timeslot.id === timeslotTag.timeslotId)){
            const response = await client.models.TimeslotTag.delete({ id: timeslotTag.id })
            return response
        }
    }))
    if(params.options?.logging) console.log(removedTimeslotsResponse)

    const newTimeslotsResponse = await Promise.all((newTimeslots ?? []).map(async (timeslot) => {
        const response = await client.models.TimeslotTag.create({ 
            timeslotId: timeslot.id, 
            tagId: params.tag.id
        })
        return response
    }))
    if(params.options?.logging) console.log(newTimeslotsResponse)

    let collectionsResponse = await client.models.CollectionTag.listCollectionTagByTagId({ tagId: params.tag.id })
    let collectionsData = collectionsResponse.data

    while(collectionsResponse.nextToken) {
        collectionsResponse = await client.models.CollectionTag.listCollectionTagByTagId({ tagId: params.tag.id }, { nextToken: collectionsResponse.nextToken })
        collectionsData.push(...collectionsResponse.data)
    }

    const removedCollectionsResponse = await Promise.all(collectionsData.map(async (collectionTag) => {
        if(removedCollections?.some((collection) => collection.id === collectionTag.collectionId)){
            const response = await client.models.CollectionTag.delete({ id: collectionTag.id })
            return response
        }
    }))
    if(params.options?.logging) console.log(removedCollectionsResponse)

    const newCollectionsResponse = await Promise.all((newCollections ?? []).map(async (collection) => {
        const response = await client.models.CollectionTag.create({
            collectionId: collection.id,
            tagId: params.tag.id
        })
        return response
    }))
    if(params.options?.logging) console.log(newCollectionsResponse)

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

    const updatedTag: UserTag = {
        id: params.tag.id,
        name: params.name ?? params.tag.name,
        color: params.color ?? params.tag.color,
        collections: params.collections ?? params.tag.collections,
        timeslots: params.timeslots ?? params.tag.timeslots,
    }
    return updatedTag
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