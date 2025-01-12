import { generateClient } from "aws-amplify/api";
import { V6Client } from '@aws-amplify/api-graphql'
import { Schema } from "../../amplify/data/resource";
import { Participant, PhotoCollection, Timeslot, UserData, UserProfile, UserTag } from "../types";
import { getAllCollectionsFromUserTags } from "./collectionService";
import { queryOptions } from "@tanstack/react-query";
import { parseAttribute } from "../utils";
import { ListUsersCommandOutput } from "@aws-sdk/client-cognito-identity-provider/dist-types/commands/ListUsersCommand";
import { updateUserAttributes } from "aws-amplify/auth";

const client = generateClient<Schema>()

interface GetAllUserTagsOptions {
    siCollections: boolean
}
async function getAllUserTags(client: V6Client<Schema>, options?: GetAllUserTagsOptions): Promise<UserTag[]> {
    console.log('api call')
    const userTagsResponse = await client.models.UserTag.list()
    const mappedTags = await Promise.all(userTagsResponse.data.map(async (tag) => {
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
    siCollections?: boolean
}
export async function getUserProfileByEmail(client: V6Client<Schema>, email: string, options?: GetUserProfileByEmailOptions): Promise<UserProfile | undefined> {
    console.log('api call')
    const profileResponse = await client.models.UserProfile.get({ email: email })
    if(!profileResponse || !profileResponse.data) return
    const participantResponse = await profileResponse.data.participant()
    const mappedParticipants: Participant[] = await Promise.all(participantResponse.data.map(async (participant) => {
        const tags: UserTag[] = []
        const timeslots: Timeslot[] = []
        if(options === undefined || options.siTags){
             tags.push(...(await Promise.all((participant.userTags ?? []).filter((tag) => tag !== null).map(async (tag) => {
                const tagResponse = await client.models.UserTag.get({ id: tag })
                if(!tagResponse || !tagResponse.data) return
                const mappedCollections: PhotoCollection[] = []
                if(!options || options.siCollections){
                    mappedCollections.push(...(await Promise.all((await tagResponse.data.collectionTags()).data.map(async (colTag) => {
                        const collection = await colTag.collection()
                        if(!collection || !collection.data) return
                        const mappedCollection: PhotoCollection = {
                            ...collection.data,
                            coverPath: collection.data.coverPath ?? undefined,
                            watermarkPath: collection.data.watermarkPath ?? undefined,
                            downloadable: collection.data.downloadable ?? false,
                            //unnecessary
                            sets: [], //TODO: implement si for sets
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
                }))).filter((tag) => tag !== undefined)
            },
            userEmail: email,
        }))
    }

    //in theory there should be at least one participant upon reaching this point
    let activeParticipant = mappedParticipants.find((participant) => participant.id === profileResponse.data?.activeParticipant)
    if(!profileResponse.data.activeParticipant){
        activeParticipant = mappedParticipants[0]
        await client.models.UserProfile.update({
            email: email,
            activeParticipant: activeParticipant?.id
        })
    }

    const userProfile: UserProfile = {
        ...profileResponse.data,
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
    }

    return userProfile
}

async function getAuthUsers(client: V6Client<Schema>, filter?: string | null): Promise<UserData[] | undefined> {
    console.log('api call')
    const json = await client.queries.GetAuthUsers({authMode: 'userPool'})
            
    const users = JSON.parse(json.data?.toString()!) as ListUsersCommandOutput
    if(!users || !users.Users) return
    const parsedUsersData = users.Users.map((user) => {
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
        return {
            ...Object.fromEntries(attributes),
            enabled,
            created,
            updated,
            status,
            userId,
        } as UserData
    }).filter((user) => (filter === undefined || user.email === filter) && filter !== null)

    return parsedUsersData
}

interface CreateParticipantMutationParams {
    participant: Omit<Participant, 'id'>,
    userEmail: string,
    options?: {
        logging: boolean
    }
}
export async function createParticipantMutation(params: CreateParticipantMutationParams): Promise<Participant> {
    const createResponse = await client.models.Participant.create({
        userEmail: params.userEmail,
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

export const getAllUserTagsQueryOptions = (options?: GetAllUserTagsOptions) => queryOptions({
    queryKey: ['userTags', client, options],
    queryFn: () => getAllUserTags(client, options)
})

export const getUserProfileByEmailQueryOptions = (email: string, options?: GetUserProfileByEmailOptions) => queryOptions({
    queryKey: ['userProfile', client, email, options],
    queryFn: () => getUserProfileByEmail(client, email, options)
})

export const getAuthUsersQueryOptions = (filter?: string | null) =>  queryOptions({
    queryKey: ['authUsers', client, filter],
    queryFn: () => getAuthUsers(client, filter)
})