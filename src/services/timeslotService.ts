import { queryOptions } from "@tanstack/react-query";
import { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/api";
import { V6Client } from '@aws-amplify/api-graphql'
import { Participant, Timeslot, UserTag } from "../types";

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

export async function updateTimeslotMutation(timeslot: Timeslot){
    return client.models.Timeslot.update({
        id: timeslot.id,
        start: timeslot.start.toISOString(),
        end: timeslot.end.toISOString(),
    })
}

export const getAllTimeslotsByDateQueryOptions = (date: Date) => queryOptions({
    queryKey: ['timeslot', client, date],
    queryFn: () => getAllTimeslotsByDate(client, date)
})