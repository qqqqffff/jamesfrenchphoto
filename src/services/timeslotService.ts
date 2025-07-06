import { queryOptions } from "@tanstack/react-query";
import { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/api";
import { V6Client } from '@aws-amplify/api-graphql'
import { Timeslot, UserTag } from "../types";

const client = generateClient<Schema>()

//TODO: add metricing
interface MapTimeslotOptions {
    siTag?: {
        memo: UserTag[]
    } //only allow shallow mapping
}
async function mapTimeslot(timeslotResponse: Schema['Timeslot']['type'], options?: MapTimeslotOptions): Promise<Timeslot> {
    let mappedTag: UserTag | undefined

    if(options?.siTag !== undefined) {
        const taggingResponse = await timeslotResponse.timeslotTag()
        if(taggingResponse.data !== null) {
            const foundTag = options.siTag.memo.find((tag) => tag.id === taggingResponse.data?.tagId)
            if(foundTag) {
                mappedTag = foundTag
            }
            else {
                const tagResponse = await taggingResponse.data.tag()
                if(tagResponse.data) {
                    mappedTag = {
                        ...tagResponse.data,
                        color: tagResponse.data?.color ?? undefined,
                        //shallow only
                        children: [],
                        notifications: [],
                        participants: []
                    }
                    options.siTag.memo.push(mappedTag)
                }
            }
        }
    }
    
    const mappedTimeslot: Timeslot = {
        ...timeslotResponse,
        description: timeslotResponse.description ?? undefined,
        register: timeslotResponse.register ?? undefined,
        start: new Date(timeslotResponse.start),
        end: new Date(timeslotResponse.end),
        participantId: timeslotResponse.participantId ?? undefined,
        tag: mappedTag
    }

    return mappedTimeslot
}

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
                    color: tagResponse.data.color ?? undefined,
                    notifications: undefined,
                    //TODO: implement children
                    children: [],
                    participants: []
                }
            }
        }

        const mappedTimeslot: Timeslot = {
            id: timeslot.id as string,
            register: timeslot.register ?? undefined,
            participantId: timeslot.participantId ?? undefined,
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

export async function getAllTimeslotsByUserTag(client: V6Client<Schema>, tagId?: string) {
    if(!tagId) return []
    let timeslotTagsResponse = await client.models.TimeslotTag.listTimeslotTagByTagId({ tagId: tagId })
    let timeslotTagsData = timeslotTagsResponse.data

    while(timeslotTagsResponse.nextToken) {
        timeslotTagsResponse = await client.models.TimeslotTag.listTimeslotTagByTagId({ tagId: tagId }, { nextToken: timeslotTagsResponse.nextToken })
        timeslotTagsData.push(...timeslotTagsResponse.data)
    }

    const mappedTimeslots = (await Promise.all(timeslotTagsData
        .map(async (timeslotTag) => {
            const timeslot = await timeslotTag.timeslot()
            if(!timeslot || !timeslot.data) return
            //TODO: use timeslot mapping function
            const mappedTimeslot: Timeslot = {
                ...timeslot.data,
                description: timeslot.data.description ?? undefined,
                start: new Date(timeslot.data.start),
                end: new Date(timeslot.data.end),
                register: timeslot.data.register ?? undefined,
                participantId: timeslot.data.participantId ?? undefined,
                tag: {
                    id: tagId,
                    participants: [],
                    children: [],
                    name: '',
                    createdAt: new Date().toISOString()
                }
            }
            return mappedTimeslot
        })
    )).filter((timeslot) => timeslot !== undefined)
    return mappedTimeslots
}

async function getAllTimeslotsByUserTagList(client: V6Client<Schema>, userTagIds: string[]){
    const timeslots = (await Promise.all(userTagIds.map(async (tagId) => {
        const returnedTimeslots = await getAllTimeslotsByUserTag(client, tagId)
        return returnedTimeslots
    }))).reduce((prev, cur) => {
        prev.push(...cur)
        return prev
    }, [])

    return timeslots
}

interface GetAllUntaggedTimeslotsOptions { 
    logging?: boolean
    metric?: boolean
}
async function getAllUntaggedTimeslots(client: V6Client<Schema>, options?: GetAllUntaggedTimeslotsOptions): Promise<Timeslot[]> {
    const start = new Date()

    let timeslotsResponse = await client.models.Timeslot.list()
    const timeslotsData = timeslotsResponse.data

    while(timeslotsResponse.nextToken) {
        timeslotsResponse = await client.models.Timeslot.list({ nextToken: timeslotsResponse.nextToken })
        timeslotsData.push(...timeslotsResponse.data)
    }

    if(options?.logging) console.log(timeslotsData)

    const filteredTimeslots = await Promise.all(
        (await Promise.all(timeslotsData.filter(async (timeslot) => {
            const taggingResponse = (await timeslot.timeslotTag()).data
            if(options?.logging) console.log(taggingResponse)
            return taggingResponse === null
        }))).map(async (timeslot) => mapTimeslot(timeslot, { siTag: undefined }))
    )

    if(options?.logging) console.log(filteredTimeslots)

    if(options?.metric) console.log(`GETALLUNTAGGEDTIMESLOTS:${new Date().getTime() - start.getTime()}ms`)
    //no register / participant without a tag
    return filteredTimeslots
}

export interface CreateTimeslotsMutationParams {
    timeslots: Timeslot[],
    options?: {
        logging?: boolean
    }
}
export async function createTimeslotsMutation(params: CreateTimeslotsMutationParams) {
    const response = await Promise.all(params.timeslots.map((timeslot) => {
        return client.models.Timeslot.create({
            id: timeslot.id,
            start: timeslot.start.toISOString(),
            end: timeslot.end.toISOString(),
            description: timeslot.description
        })
    }))

    if(params.options?.logging) console.log(response)
}

//TODO: more complicated tag updating
export async function updateTimeslotMutation(timeslot: Timeslot){
    return client.models.Timeslot.update({
        id: timeslot.id,
        start: timeslot.start.toISOString(),
        end: timeslot.end.toISOString(),
    })
}

export interface DeleteTimeslotsMutationParams {
    timeslots: Timeslot[]
    options?: {
        logging?: boolean
    }
}
export async function deleteTimeslotsMutation(params: DeleteTimeslotsMutationParams){
    const timeslotTagsMemo: { id: string, tagId: string, timeslotId: string }[] = []
    const response = await Promise.all(params.timeslots.map(async (timeslot) => {
        const foundTag = timeslotTagsMemo.find((tag) => tag.timeslotId === timeslot.id)
        if(foundTag) {
            const deleteTagResponse = await client.models.TimeslotTag.delete({ id: foundTag.id })
            if(params.options?.logging) console.log(deleteTagResponse)
        }
        if(timeslot.tag && !foundTag) {
            let taggingResponse = await client.models.TimeslotTag.listTimeslotTagByTagId({ tagId: timeslot.tag.id })
            const taggingData = taggingResponse.data

            while(taggingResponse.nextToken) {
                taggingResponse = await client.models.TimeslotTag.listTimeslotTagByTagId({ tagId: timeslot.tag.id }, { nextToken: taggingResponse.nextToken })
                taggingData.push(...taggingResponse.data)
            }

            for(let i = 0; i < taggingData.length; i++) {
                if(taggingData[i].timeslotId === timeslot.id) {
                    const deleteTagResponse = await client.models.TimeslotTag.delete({ id: taggingData[i].id })
                    if(params.options?.logging) console.log(deleteTagResponse)
                    continue;
                }
                timeslotTagsMemo.push({ 
                    id: taggingData[i].id, 
                    tagId: taggingData[i].tagId, 
                    timeslotId: taggingData[i].timeslotId 
                })
            }
        }

        return client.models.Timeslot.delete({ id: timeslot.id }) 
    }))

    if(params.options?.logging) console.log(response)
}

//TODO: convert me into a lambda function
export async function registerTimeslotMutation(timeslot: Timeslot, notify: boolean){
    const response = await client.models.Timeslot.update({
        id: timeslot.id,
        register: timeslot.register ?? null,
        participantId: timeslot.participantId ?? null
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

export const getAllTimeslotsByUserTagQueryOptions = (tagId?: string) => queryOptions({
    queryKey: ['tag-timeslot', client, tagId],
    queryFn: () => getAllTimeslotsByUserTag(client, tagId)
})

export const getAllTimeslotsByUserTagListQueryOptions = (userTagIds: string[]) => queryOptions({
    queryKey: ['timeslot', client, userTagIds],
    queryFn: () => getAllTimeslotsByUserTagList(client, userTagIds)
})

export const getAllUntaggedTimeslotsQueryOptions = (options?: GetAllUntaggedTimeslotsOptions) => queryOptions({
    queryKey: ['untaggedTimeslots', client, options],
    queryFn: () => getAllUntaggedTimeslots(client, options)
})