import { generateClient } from "aws-amplify/api";
import { V6Client } from '@aws-amplify/api-graphql'
import { Schema } from "../../amplify/data/resource";
import { Participant, Timeslot, UserData, UserProfile, UserTag } from "../types";
import { getAllCollectionsFromUserTags } from "./collectionService";
import { queryOptions } from "@tanstack/react-query";
import { parseAttribute } from "../utils";
import { ListUsersCommandOutput } from "@aws-sdk/client-cognito-identity-provider/dist-types/commands/ListUsersCommand";

const client = generateClient<Schema>()

async function getAllUserTags(client: V6Client<Schema>): Promise<UserTag[]> {
    console.log('api call')
    const userTagsResponse = await client.models.UserTag.list()
    const mappedTags = await Promise.all(userTagsResponse.data.map(async (tag) => {
        const collections = await getAllCollectionsFromUserTags(client, [{
            ...tag,
            collections: [],
            color: undefined,
        }])
        const mappedTag: UserTag = {
            ...tag,
            collections: collections,
            color: tag.color ?? undefined,
        }
        return mappedTag
    }))
    return mappedTags
}

//TODO: conditional si based on options
async function getUserProfileByEmail(client: V6Client<Schema>, email: string): Promise<UserProfile | undefined> {
    console.log('api call')
    const profileResponse = await client.models.UserProfile.get({ email: email })
    if(!profileResponse || !profileResponse.data) return
    const participantResponse = await profileResponse.data.participant()
    const mappedParticipants: Participant[] = await Promise.all(participantResponse.data.map(async (participant) => {
        const tags: UserTag[] = (await Promise.all((participant.userTags ?? []).filter((tag) => tag !== null).map(async (tag) => {
            const tagResponse = await client.models.UserTag.get({ id: tag })
            if(!tagResponse || !tagResponse.data) return
            const mappedTag: UserTag = {
                ...tagResponse.data,
                color: tagResponse.data.color ?? undefined
            }
            return mappedTag
        }))).filter((tag) => tag !== undefined)

        const timeslot = (await participant.timeslot()).data.map((timeslot) => {
            const mappedTimeslot: Timeslot = {
                ...timeslot,
                start: new Date(timeslot.start),
                end: new Date(timeslot.end),
                //unneccessary
                register: undefined,
                participant: undefined,
            }
            return mappedTimeslot
        })

        const mappedParticipant: Participant = {
            ...participant,
            userTags: tags,
            middleName: participant.middleName ?? undefined,
            preferredName: participant.preferredName ?? undefined,
            email: participant.email ?? undefined,
            contact: participant.contact ?? false,
            timeslot: timeslot,
        }
        return mappedParticipant
    }))

    //TODO: conditional create participant if no found participants

    const userProfile: UserProfile = {
        ...profileResponse.data,
        participant: mappedParticipants,
        activeParticipant: mappedParticipants.find((participant) => participant.id === profileResponse.data!.activeParticipant),
        preferredContact: profileResponse.data.preferredContact ?? 'EMAIL',
        //deprecated
        userTags: [],
        timeslot: undefined,
        participantFirstName: undefined,
        participantLastName: undefined,
        participantMiddleName: undefined,
        participantPreferredName: undefined,
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

export const getAllUserTagsQueryOptions = queryOptions({
    queryKey: ['userTags', client],
    queryFn: () => getAllUserTags(client)
})

export const getUserProfileQueryOptions = (email: string) => queryOptions({
    queryKey: ['userProfile', client, email],
    queryFn: () => getUserProfileByEmail(client, email)
})

export const getAuthUsersQueryOptions = (filter?: string | null) =>  queryOptions({
    queryKey: ['authUsers', client, filter],
    queryFn: () => getAuthUsers(client, filter)
})