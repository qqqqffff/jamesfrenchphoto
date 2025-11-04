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
            description: timeslot.description ?? undefined,
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
    console.log('api call')
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

interface GetTimeslotByIdOptions {
    siTag?: boolean
    logging?: boolean,
    metric?: boolean,
}
async function getTimeslotById(client: V6Client<Schema>, timeslotId: string, options?: GetTimeslotByIdOptions): Promise<Timeslot | null> {
    const start = new Date()
    const timeslotResponse = await client.models.Timeslot.get({ id: timeslotId })
    if(!timeslotResponse.data) return null
    if(options?.metric) console.log(`GETTIMESLOTBYID:${new Date().getTime() - start.getTime()}ms`)
    return mapTimeslot(timeslotResponse.data, {
        siTag: options?.siTag ? {
            memo: []
        } : undefined
    })
}

export interface CreateTimeslotsMutationParams {
    timeslots: Timeslot[],
    options?: {
        logging?: boolean
    }
}
export async function createTimeslotsMutation(params: CreateTimeslotsMutationParams) {
    const response = await Promise.all(params.timeslots.map((timeslot) => {

        return [
            client.models.Timeslot.create({
                id: timeslot.id,
                start: timeslot.start.toISOString(),
                end: timeslot.end.toISOString(),
                description: timeslot.description
            }),
            timeslot.tag ? client.models.TimeslotTag.create({
                timeslotId: timeslot.id,
                tagId: timeslot.tag.id
            }) : undefined
        ]
    }))

    if(params.options?.logging) console.log(response)
}

export interface UpdateTimeslotsMutationParams {
    timeslots: Timeslot[]
    previousTimeslots: Timeslot[]
    previousTags: UserTag[]
    options?: {
        logging?: boolean
    }
}
export async function updateTimeslotMutation(params: UpdateTimeslotsMutationParams){
    const timeslotTagsMemo: { id: string, tagId: string, timeslotId: string}[] = []
    const previousTagCleanup = await Promise.all(params.previousTags.map(async (tag) => {
        let tagResponse = await client.models.TimeslotTag.listTimeslotTagByTagId({ 
            tagId: tag.id
        })

        const tagData = tagResponse.data
        while(tagResponse.nextToken) {
            tagResponse = await client.models.TimeslotTag.listTimeslotTagByTagId({
                tagId: tag.id
            }, { nextToken: tagResponse.nextToken })
            tagData.push(...tagResponse.data)
        }
        
        timeslotTagsMemo.push(...tagData.map((data) => ({ id: data.id, tagId: data.tagId, timeslotId: data.timeslotId })))

        return timeslotTagsMemo
            .filter((memo) => params.timeslots.some((timeslot) => timeslot.id === memo.id && tag.id === memo.tagId))
            .map((memo) => client.models.TimeslotTag.delete({ id: memo.id }))
    }))
    if(params.options?.logging) console.log(previousTagCleanup)

    const response = await Promise.all(params.timeslots.map(async (timeslot) => {
        // tag cases: 
        
        // dne in db -> create instance
        // no tag -> if exists in db delete otherwise skip
        // exists in db -> skip
        const foundTag = timeslotTagsMemo.find((memo) => memo.timeslotId === timeslot.id && memo.tagId === timeslot.tag?.id)
        //does not exist in memo && memo does not have the tags
        if(
            timeslot.tag && 
            foundTag === undefined && 
            !timeslotTagsMemo.some((memo) => memo.tagId === timeslot.tag?.id)
        ) {
            let tagResponse = await client.models.TimeslotTag.listTimeslotTagByTagId({ 
                tagId: timeslot.tag.id
            })

            const tagData = tagResponse.data
            while(tagResponse.nextToken) {
                tagResponse = await client.models.TimeslotTag.listTimeslotTagByTagId({
                    tagId: timeslot.tag.id
                }, { nextToken: tagResponse.nextToken })
                tagData.push(...tagResponse.data)
            }
            
            timeslotTagsMemo.push(...tagData.map((data) => ({ id: data.id, tagId: data.tagId, timeslotId: data.timeslotId })))

            const createResponse = await client.models.TimeslotTag.create({
                tagId: timeslot.tag.id,
                timeslotId: timeslot.id
            })
            if(params.options?.logging) console.log(createResponse)
        }
        else if(
            timeslot.tag &&
            timeslotTagsMemo.some((memo) => memo.tagId === timeslot.tag?.id)
        ) {
            const createResponse = await client.models.TimeslotTag.create({
                tagId: timeslot.tag.id,
                timeslotId: timeslot.id
            })
            if(params.options?.logging) console.log(createResponse)
        }
        //previous tags have been deleted atp

        const previousTimeslot = params.previousTimeslots.find((pTimeslot) => pTimeslot.id === timeslot.id)
        if(previousTimeslot && (
            //deep comparison check
            previousTimeslot.start.getTime() !== timeslot.start.getTime() ||
            previousTimeslot.end.getTime() !== timeslot.end.getTime() ||
            previousTimeslot.description !== timeslot.description ||
            previousTimeslot.register !== timeslot.register ||
            previousTimeslot.participantId !== timeslot.participantId
        )) {
            return client.models.Timeslot.update({
                id: timeslot.id,
                start: timeslot.start.toISOString(),
                end: timeslot.end.toISOString(),
                description: timeslot.description,
                register: timeslot.register,
                participantId: timeslot.participantId
            })
        }
        
    }))

    if(params.options?.logging) console.log(response)
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

export interface RegisterTimeslotMutationParams {
    timeslot: Timeslot,
    notify: boolean,
    options?: {
        logging: boolean
    }
}
//TODO: convert me into a lambda function
export async function registerTimeslotMutation(params: RegisterTimeslotMutationParams){
    const response = await client.models.Timeslot.update({
        id: params.timeslot.id,
        register: params.timeslot.register ?? null,
        participantId: params.timeslot.participantId ?? null
    }, { authMode: 'userPool' })
    if(params.options?.logging) console.log(response)
    if(!response.data) return false
    if(params.notify && params.timeslot.register){
        const response = await client.queries.SendTimeslotConfirmation({
            email: params.timeslot.register,
            start: params.timeslot.start.toISOString(),
            end: params.timeslot.end.toISOString()
        }, {
            authMode: 'userPool'
        })
        if(params.options?.logging) console.log(response)
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

export const getTimeslotByIdQueryOptions = (timeslotId: string, options?: GetTimeslotByIdOptions) => queryOptions({
    queryKey: ['timeslot', client, timeslotId],
    queryFn: () => getTimeslotById(client, timeslotId, options)
})