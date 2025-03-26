import { queryOptions } from "@tanstack/react-query";
import { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/api";
import { V6Client } from '@aws-amplify/api-graphql'
import { Participant, Timeslot, UserTag } from "../types";
import { getUserProfileByEmail } from "./userService";

const client = generateClient<Schema>()

async function getAllTimeslotsByDate(client: V6Client<Schema>, date: Date){
    console.log('api call')
    const timeslots: Timeslot[] = (await Promise.all((await client.models.Timeslot.list({ filter: {
        start: { contains: date.toISOString().substring(0, date.toISOString().indexOf('T')) }
    }})).data.map(async (timeslot) => {
        if(timeslot === undefined || 
            timeslot.id === undefined ||
            timeslot.start === undefined ||
            timeslot.end === undefined
        ) return
        const tsTagResponse = await timeslot.timeslotTag()
        let tag: UserTag | undefined
        if(tsTagResponse && tsTagResponse.data) {
            const tagResponse = await tsTagResponse.data.tag()
            if(tagResponse && tagResponse.data){
                tag = {
                    ...tagResponse.data,
                    color: tagResponse.data.color ?? undefined
                }
            }
        }
        const participantResponse = await timeslot.participant()
        let participant: Participant | undefined
        if(participantResponse && participantResponse.data){
            participant = {
                ...participantResponse.data,
                preferredName: participantResponse.data.preferredName ?? undefined,
                //unnecessary
                userTags: [],
                email: undefined,
                contact: false,
                timeslot: undefined,
                middleName: undefined,
            }
        }
        //deprecation compatability
        else if(timeslot.register !== null){
            const userProfile = await getUserProfileByEmail(client, timeslot.register, { siTags: false, siTimeslot: false })
            if(userProfile && userProfile.participantFirstName && userProfile.participantLastName){
                participant = {
                    id: '',
                    firstName: userProfile.participantFirstName,
                    lastName: userProfile.participantLastName,
                    preferredName: userProfile?.participantPreferredName,
                    //unnecessary
                    userTags: [],
                    email: undefined,
                    contact: false,
                    timeslot: undefined,
                    middleName: undefined,
                    userEmail: userProfile.email
                }
            }
        }
        const mappedTimeslot: Timeslot = {
            id: timeslot.id as string,
            register: timeslot.register ?? undefined,
            participant: participant,
            start: new Date(timeslot.start),
            end: new Date(timeslot.end),
            tag: tag,
        }
        return mappedTimeslot
    })))
        .filter((timeslot) => timeslot !== undefined)
        .sort((a, b) => a.start.getTime() - b.start.getTime())
    return timeslots
}

export async function getAllTimeslotsByUserTag(client: V6Client<Schema>, userTag: UserTag) {
    console.log('api call')
    let timeslotTagsResponse = await client.models.TimeslotTag.listTimeslotTagByTagId({ tagId: userTag.id })
    let timeslotTagsData = timeslotTagsResponse.data

    while(timeslotTagsResponse.nextToken) {
        timeslotTagsResponse = await client.models.TimeslotTag.listTimeslotTagByTagId({ tagId: userTag.id }, { nextToken: timeslotTagsResponse.nextToken })
        timeslotTagsData.push(...timeslotTagsResponse.data)
    }

    const mappedTimeslots = (await Promise.all(timeslotTagsData
        .map(async (timeslotTag) => {
            const timeslot = await timeslotTag.timeslot()
            if(!timeslot || !timeslot.data) return
            const participant = await timeslot.data.participant()
            const mappedTimeslot: Timeslot = {
                ...timeslot.data,
                start: new Date(timeslot.data.start),
                end: new Date(timeslot.data.end),
                register: timeslot.data.register ?? undefined,
                participant: participant && participant.data ? ({
                    ...participant.data,
                    middleName: participant.data.middleName ?? undefined,
                    preferredName: participant.data.preferredName ?? undefined,
                    email: participant.data.email ?? undefined,
                    contact: participant.data.contact ?? false,
                    //unnecessary
                    userTags: [],
                    timeslot: undefined,
                }) : undefined,
                tag: userTag
            }
            return mappedTimeslot
        })
    )).filter((timeslot) => timeslot !== undefined)
    return mappedTimeslots
}

async function getAllTimeslotsByUserTagList(client: V6Client<Schema>, userTags: UserTag[]){
    const timeslots = (await Promise.all(userTags.map(async (tag) => {
        const returnedTimeslots = await getAllTimeslotsByUserTag(client, tag)
        return returnedTimeslots
    }))).reduce((prev, cur) => {
        prev.push(...cur)
        return prev
    }, [])

    return timeslots
}

export async function updateTimeslotMutation(timeslot: Timeslot){
    return client.models.Timeslot.update({
        id: timeslot.id,
        start: timeslot.start.toISOString(),
        end: timeslot.end.toISOString(),
    })
}

export async function registerTimeslotMutation(timeslot: Timeslot, notify: boolean){
    const response = await client.models.Timeslot.update({
        id: timeslot.id,
        register: timeslot.register ?? null,
        participantId: timeslot.participant?.id ?? null
    }, { authMode: 'userPool' })
    if(!response.data) return false
    if(notify && timeslot.register){
        client.queries.SendTimeslotConfirmation({
            email: timeslot.register,
            start: timeslot.start.toISOString(),
            end: timeslot.end.toISOString()
        }, {
            authMode: 'userPool'
        })
    }
    return true
}

export const getAllTimeslotsByDateQueryOptions = (date: Date) => queryOptions({
    queryKey: ['timeslot', client, date],
    queryFn: () => getAllTimeslotsByDate(client, date)
})

export const getAllTimeslotsByUserTagQueryOptions = (userTag: UserTag) => queryOptions({
    queryKey: ['timeslot', client, userTag],
    queryFn: () => getAllTimeslotsByUserTag(client, userTag)
})

export const getAllTimeslotsByUserTagListQueryOptions = (userTags: UserTag[]) => queryOptions({
    queryKey: ['timeslot', client, userTags],
    queryFn: () => getAllTimeslotsByUserTagList(client, userTags)
})