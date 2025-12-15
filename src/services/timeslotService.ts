import { queryOptions } from "@tanstack/react-query";
import { Schema } from "../../amplify/data/resource";
import { V6Client } from '@aws-amplify/api-graphql'
import { Timeslot, UserTag } from "../types";

//TODO: add metricing
interface MapTimeslotOptions {
  siTag?: {
    memo: UserTag[]
  } //only allow shallow mapping
}
export async function mapTimeslot(timeslotResponse: Schema['Timeslot']['type'], options?: MapTimeslotOptions): Promise<Timeslot> {
  let mappedTag: UserTag | undefined

  if (options?.siTag !== undefined) {
    const taggingResponse = await timeslotResponse.timeslotTag()
    if (taggingResponse.data !== null) {
      const foundTag = options.siTag.memo.find((tag) => tag.id === taggingResponse.data?.tagId)
      if (foundTag) {
        mappedTag = foundTag
      }
      else {
        const tagResponse = await taggingResponse.data.tag()
        if (tagResponse.data) {
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

async function getAllTimeslotsByDate(client: V6Client<Schema>, date: Date) {
  console.log('api call')
  const timeslots: Timeslot[] = (await Promise.all((await client.models.Timeslot.list({
    filter: {
      start: { contains: date.toISOString().substring(0, date.toISOString().indexOf('T')) }
    }
  })).data.map(async (timeslot) => {
    if (timeslot === undefined ||
      timeslot.id === undefined ||
      timeslot.start === undefined ||
      timeslot.end === undefined
    ) return
    const tsTagResponse = await timeslot.timeslotTag()
    let tag: UserTag | undefined
    if (tsTagResponse && tsTagResponse.data) {
      const tagResponse = await tsTagResponse.data.tag()
      if (tagResponse && tagResponse.data) {
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
  if (!tagId) return []
  let timeslotTagsResponse = await client.models.TimeslotTag.listTimeslotTagByTagId({ tagId: tagId })
  let timeslotTagsData = timeslotTagsResponse.data

  while (timeslotTagsResponse.nextToken) {
    timeslotTagsResponse = await client.models.TimeslotTag.listTimeslotTagByTagId({ tagId: tagId }, { nextToken: timeslotTagsResponse.nextToken })
    timeslotTagsData.push(...timeslotTagsResponse.data)
  }

  const mappedTimeslots = (await Promise.all(timeslotTagsData
    .map(async (timeslotTag) => {
      const timeslot = await timeslotTag.timeslot()
      if (!timeslot || !timeslot.data) return
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

async function getAllTimeslotsByUserTagList(client: V6Client<Schema>, userTagIds: string[]) {
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

  while (timeslotsResponse.nextToken) {
    timeslotsResponse = await client.models.Timeslot.list({ nextToken: timeslotsResponse.nextToken })
    timeslotsData.push(...timeslotsResponse.data)
  }

  if (options?.logging) console.log(timeslotsData)

  const filteredTimeslots = await Promise.all(
    (await Promise.all(timeslotsData.filter(async (timeslot) => {
      const taggingResponse = (await timeslot.timeslotTag()).data
      if (options?.logging) console.log(taggingResponse)
      return taggingResponse === null
    }))).map(async (timeslot) => mapTimeslot(timeslot, { siTag: undefined }))
  )

  if (options?.logging) console.log(filteredTimeslots)

  if (options?.metric) console.log(`GETALLUNTAGGEDTIMESLOTS:${new Date().getTime() - start.getTime()}ms`)
  //no register / participant without a tag
  return filteredTimeslots
}

interface GetTimeslotByIdOptions {
  siTag?: boolean
  logging?: boolean,
  metric?: boolean,
}
async function getTimeslotById(client: V6Client<Schema>, timeslotId: string, options?: GetTimeslotByIdOptions): Promise<Timeslot | null> {
  if(timeslotId === '') return null
  const start = new Date()
  const timeslotResponse = await client.models.Timeslot.get({ id: timeslotId })
  if (!timeslotResponse.data) return null
  if (options?.metric) console.log(`GETTIMESLOTBYID:${new Date().getTime() - start.getTime()}ms`)
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

export interface UpdateTimeslotsMutationParams {
  timeslots: Timeslot[]
  previousTimeslots: Timeslot[]
  options?: {
    logging?: boolean
  }
}

export interface DeleteTimeslotsMutationParams {
  timeslots: Timeslot[]
  options?: {
    logging?: boolean
  }
}

export interface RegisterTimeslotMutationParams {
  timeslot: Timeslot,
  participantId: string,
  userEmail: string,
  unregister: boolean,
  additionalRecipients: string[]
  notify: boolean,
  options?: {
    logging: boolean
  }
}

export interface AdminRegisterTimeslotMutationParams extends Omit<RegisterTimeslotMutationParams, 'timeslot'> {
  timeslot: string
}

export class TimeslotService {
  private client: V6Client<Schema>
  constructor(client: V6Client<Schema>) {
    this.client = client
  }

  async createTimeslotsMutation(params: CreateTimeslotsMutationParams) {
    const response = await Promise.all(params.timeslots.map((timeslot) => {

      return [
        this.client.models.Timeslot.create({
          id: timeslot.id,
          start: timeslot.start.toISOString(),
          end: timeslot.end.toISOString(),
          description: timeslot.description
        }),
        timeslot.tag ? this.client.models.TimeslotTag.create({
          timeslotId: timeslot.id,
          tagId: timeslot.tag.id
        }) : undefined
      ]
    }))

    if (params.options?.logging) console.log(response)
  }

  /*
  update timeslot flow
  remove previous timeslot tags for timeslots that tags change
  create new timeslot tags for those timeslots that change

  timeslots are the new timeslots that overlap with the previous
  previous are just the previous version that are being updated
  */
  async updateTimeslotMutation(params: UpdateTimeslotsMutationParams) {
    const response = await Promise.all(params.timeslots.map(async (timeslot) => {
      const previousTimeslot = params.previousTimeslots.find((pTimeslot) => pTimeslot.id === timeslot.id)

      if (!previousTimeslot) return

      //timeslot tag handling
      if (
        previousTimeslot.tag?.id !== timeslot.tag?.id
      ) {
        //timeslot ids are the same
        const timeslotTagResponse = await this.client.models.TimeslotTag.listTimeslotTagByTimeslotId({
          timeslotId: timeslot.id
        })
        if (params.options?.logging) console.log(timeslotTagResponse)

        //three cases: 
        //no tag to yes tag
        //yes tag to no tag
        //yes tag to yes tag

        if (
          previousTimeslot.tag === undefined &&
          timeslot.tag !== undefined
        ) {
          let success = false
          //should not be more than 0 but just in case
          if (timeslotTagResponse.data.length > 0) {
            const response = Promise.all(timeslotTagResponse.data.map((timeslotTag) => {
              if (timeslotTag.tagId === timeslot.tag?.id && !success) {
                success = true
                return
              }
              return this.client.models.TimeslotTag.delete({ id: timeslotTag.id })
            }))

            if (params.options?.logging) console.log(response)
          }

          if (!success) {
            const response = await this.client.models.TimeslotTag.create({
              tagId: timeslot.tag.id,
              timeslotId: timeslot.id
            })
            if (params.options?.logging) console.log(response)
          }
        }
        else if (
          previousTimeslot.tag !== undefined &&
          timeslot.tag === undefined
        ) {
          const response = Promise.all(timeslotTagResponse.data.map((timeslotTag) => {
            return this.client.models.TimeslotTag.delete({ id: timeslotTag.id })
          }))
          if (params.options?.logging) console.log(response)
        }
        else if (
          previousTimeslot.tag !== undefined &&
          timeslot.tag !== undefined
        ) {
          let success = false
          const response = Promise.all(timeslotTagResponse.data.map((timeslotTag) => {
            if (timeslotTag.tagId === timeslot.tag?.id) {
              success = true
              return
            }
            return this.client.models.TimeslotTag.delete({ id: timeslotTag.id })
          }))
          if (params.options?.logging) console.log(response)

          if (!success) {
            const response = this.client.models.TimeslotTag.create({
              timeslotId: timeslot.id,
              tagId: timeslot.tag.id
            })
            if (params.options?.logging) console.log(response)
          }
        }
      }

      if (
        //deep comparison field check
        previousTimeslot.start.getTime() !== timeslot.start.getTime() ||
        previousTimeslot.end.getTime() !== timeslot.end.getTime() ||
        previousTimeslot.description !== timeslot.description ||
        previousTimeslot.register !== timeslot.register ||
        previousTimeslot.participantId !== timeslot.participantId
      ) {
        return this.client.models.Timeslot.update({
          id: timeslot.id,
          start: timeslot.start.toISOString(),
          end: timeslot.end.toISOString(),
          description: timeslot.description,
          register: timeslot.register,
          participantId: timeslot.participantId
        })
      }

    }))

    if (params.options?.logging) console.log(response)
  }

  async deleteTimeslotsMutation(params: DeleteTimeslotsMutationParams) {
    const response = await Promise.all(params.timeslots.map(async (timeslot) => {
      if (timeslot.tag) {
        const timeslotTagResponse = await this.client.models.TimeslotTag.listTimeslotTagByTimeslotId({
          timeslotId: timeslot.id
        })

        if (timeslotTagResponse.data != null) {
          return {
            deleteTimeslotPromise: this.client.models.Timeslot.delete({ id: timeslot.id }),
            deleteTimeslotTagPromise: timeslotTagResponse.data.map((timeslotTagResponse) => (
              this.client.models.TimeslotTag.delete({ id: timeslotTagResponse.id })
            ))
          }
        }
      }

      return this.client.models.Timeslot.delete({ id: timeslot.id })
    }))

    if (params.options?.logging) console.log(response)
  }

  //TODO: convert me into a lambda function
  //TODO: also handle errors with email sending
  //TODO: validate that the current user is able to register to this timeslot by receiving first
  async registerTimeslotMutation(params: RegisterTimeslotMutationParams): Promise<{ status: 'Success' | 'Fail', error?: string }> {
    if(!params.timeslot.tag) return { status: 'Fail', error: 'Unable to register for a timeslot with no tag' }
    
    const response = await this.client.mutations.RegisterTimeslot({
      timeslotId: params.timeslot.id,
      unregister: params.unregister,
      userEmail: params.userEmail,
      participantId: params.participantId,
    }, { authMode: 'userPool' })
    
    if (params.options?.logging) console.log(response)
    if (!response.data) return { status: 'Fail', error: 'Failed to register for timeslot.' }
    try {
      const parsedResponse: { status: 'Fail' | 'Success', error?: string } = JSON.parse(response.data.toString())
      if(params.options?.logging) console.log(parsedResponse.status === 'Success', params.notify, !params.unregister)
      if(parsedResponse.status === 'Success' && params.notify && !params.unregister) {
        //continue with registration
        const response = await this.client.queries.SendTimeslotConfirmation({
          email: params.userEmail,
          start: params.timeslot.start.toISOString(),
          end: params.timeslot.end.toISOString(),
          additionalRecipients: params.additionalRecipients,
          tagId: params.timeslot.tag.id,
          participantId: params.participantId,
        }, {
          authMode: 'userPool'
        })
        if (params.options?.logging) console.log(response)
        if(response.data === null) return { status: 'Success', error: 'Failed to send confirmation email.'}
        
        const emailParsedResponse: { success: boolean } = JSON.parse(response.data.toString())
        if(!emailParsedResponse.success) {
          return { status: 'Success', error: 'Failed to send confirmation email.'}
        }
      }
      return parsedResponse
    } catch(err) {
      console.error(err)
      return { status: 'Fail', error: 'Recieved invalid response from server, please try again later.'}
    }
  }

  async adminRegisterTimeslotMutation(params: AdminRegisterTimeslotMutationParams): Promise<Timeslot | null> {
    const getTimeslot = await getTimeslotById(this.client, params.timeslot, { siTag: true })

    if(getTimeslot === null) return null

    const registerResponse = await this.client.models.Timeslot.update({
      id: getTimeslot.id,
      register: params.unregister ? null : params.userEmail,
      participantId: params.unregister ? null : params.participantId,
    })
    if(params.options?.logging) console.log(registerResponse)
      
    if(params.notify && getTimeslot.tag?.id !== undefined) {
      const emailResponse = await this.client.queries.SendTimeslotConfirmation({
        email: params.userEmail,
        participantId: params.participantId,
        start: getTimeslot.start.toISOString(),
        end: getTimeslot.end.toISOString(),
        tagId: getTimeslot.tag.id,
        additionalRecipients: params.additionalRecipients,
      })
      if(params.options?.logging) console.log(emailResponse)
    }

    const returnedTimeslot: Timeslot = {
      ...getTimeslot,
      register: params.unregister ? undefined : params.userEmail,
      participantId: params.unregister ? undefined : params.participantId,
    }

    return returnedTimeslot
  }

  getAllTimeslotsByDateQueryOptions = (date: Date) => queryOptions({
    queryKey: ['timeslot', date],
    queryFn: () => getAllTimeslotsByDate(this.client, date)
  })

  getAllTimeslotsByUserTagQueryOptions = (tagId?: string) => queryOptions({
    queryKey: ['tag-timeslot', tagId],
    queryFn: () => getAllTimeslotsByUserTag(this.client, tagId)
  })

  getAllTimeslotsByUserTagListQueryOptions = (userTagIds: string[]) => queryOptions({
    queryKey: ['timeslot', userTagIds],
    queryFn: () => getAllTimeslotsByUserTagList(this.client, userTagIds)
  })

  getAllUntaggedTimeslotsQueryOptions = (options?: GetAllUntaggedTimeslotsOptions) => queryOptions({
    queryKey: ['untaggedTimeslots', options],
    queryFn: () => getAllUntaggedTimeslots(this.client, options)
  })

  getTimeslotByIdQueryOptions = (timeslotId: string, options?: GetTimeslotByIdOptions) => queryOptions({
    queryKey: ['timeslot', timeslotId],
    queryFn: () => getTimeslotById(this.client, timeslotId, options)
  })
}