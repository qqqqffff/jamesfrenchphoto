import { generateClient } from "aws-amplify/api";
import { V6Client } from '@aws-amplify/api-graphql'
import { Schema } from "../../amplify/data/resource";
import { Participant, PhotoCollection, PhotoSet, TemporaryAccessToken, Timeslot, UserData, UserProfile, UserTag } from "../types";
import { getAllCollectionsFromUserTags } from "./collectionService";
import { queryOptions } from "@tanstack/react-query";
import { parseAttribute } from "../utils";
import { ListUsersCommandOutput } from "@aws-sdk/client-cognito-identity-provider/dist-types/commands/ListUsersCommand";
import { updateUserAttributes } from "aws-amplify/auth";
import { Duration } from "luxon";
import { UserType } from "@aws-sdk/client-cognito-identity-provider/dist-types/models/models_0";

const client = generateClient<Schema>()

interface GetAllUserTagsOptions {
    siCollections: boolean
}
async function getAllUserTags(client: V6Client<Schema>, options?: GetAllUserTagsOptions): Promise<UserTag[]> {
    console.log('api call')
    let userTagsResponse = await client.models.UserTag.list()
    let userTagData = userTagsResponse.data

    while(userTagsResponse.nextToken) {
        userTagsResponse = await client.models.UserTag.list({ nextToken: userTagsResponse.nextToken })
        userTagData.push(...userTagsResponse.data)
    }

    const mappedTags = await Promise.all(userTagData.map(async (tag) => {
        const collections: PhotoCollection[] = []
        if(!options || options.siCollections) {
            collections.push(...(await getAllCollectionsFromUserTags(client, [{
                    ...tag,
                    collections: [],
                    color: undefined,
                }])
            ))
        }
        const mappedTag: UserTag = {
            ...tag,
            collections: collections,
            color: tag.color ?? undefined,
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
    unauthenticated?: boolean
}
export async function getUserProfileByEmail(client: V6Client<Schema>, email: string, options?: GetUserProfileByEmailOptions): Promise<UserProfile | undefined> {
    console.log('api call')
    const profileResponse = await client.models.UserProfile.get({ email: email }, { authMode: options?.unauthenticated ? 'identityPool' : 'userPool'})
    if(!profileResponse || !profileResponse.data) return
    const participantResponse = await profileResponse.data.participant({ authMode: options?.unauthenticated ? 'identityPool' : 'userPool' })
    const mappedParticipants: Participant[] = await Promise.all(participantResponse.data.map(async (participant) => {
        const tags: UserTag[] = []
        const timeslots: Timeslot[] = []
        if(options === undefined || options.siTags){
             tags.push(...(await Promise.all((participant.userTags ?? []).filter((tag) => tag !== null).map(async (tag) => {
                const tagResponse = await client.models.UserTag.get({ id: tag }, { authMode: options?.unauthenticated ? 'identityPool' : 'userPool' })
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
                            //unnecessary
                            sets: sets,
                            tags: [],
                        }
                        return mappedCollection
                    }))).filter((item) => item !== undefined))
                }
                const mappedTag: UserTag = {
                    ...tagResponse.data,
                    color: tagResponse.data.color ?? undefined,
                    collections: mappedCollections
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
                            color: tagResponse.data.color ?? undefined
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
        
        const mappedParticipant: Participant = {
            ...participant,
            userTags: tags,
            middleName: participant.middleName ?? undefined,
            preferredName: participant.preferredName ?? undefined,
            email: participant.email ?? undefined,
            contact: participant.contact ?? false,
            timeslot: timeslots,
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

interface CreateParticipantMutationParams {
    participant: Omit<Participant, 'id'>,
    options?: {
        logging: boolean
    }
}
export async function createParticipantMutation(params: CreateParticipantMutationParams): Promise<Participant> {
    const createResponse = await client.models.Participant.create({
        ...params.participant,
        userTags: params.participant.userTags.map((tag) => tag.id),
    })

    if(!createResponse || !createResponse.data) throw new Error('Failed to create participant')

    if(params.options?.logging) console.log(createResponse)
        

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
        ...params.participant
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

export interface UpdateParticipantMutationParams{
    firstName: string,
    lastName: string,
    preferredName?: string,
    middleName?: string,
    contact: boolean,
    email?: string,
    participant: Participant
}
export async function updateParticipantMutation(params: UpdateParticipantMutationParams){
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

export const getAllUserTagsQueryOptions = (options?: GetAllUserTagsOptions) => queryOptions({
    queryKey: ['userTags', client, options],
    queryFn: () => getAllUserTags(client, options)
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