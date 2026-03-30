import { queryOptions } from "@tanstack/react-query";
import { Schema } from "../../amplify/data/resource";
import { V6Client } from '@aws-amplify/api-graphql'
import { APIMutationResponse, BaseAPIParams, Timeslot, UserTag } from "../types";
import { DateTime } from "luxon";
import { TagService } from "./tagService";
import { Duration } from "luxon";

interface MapTimeslotOptions {
  siTag?: {
    TagService: TagService,
    memo: UserTag[]
  } //only allow shallow mapping
}
export async function mapTimeslot(timeslotResponse: Schema['Timeslot']['type'], options?: MapTimeslotOptions): Promise<Timeslot> {
  let mappedTag: UserTag | undefined = options?.siTag?.memo.find((tag) => tag.id === timeslotResponse.tagId)

  if (options?.siTag !== undefined && mappedTag === undefined && timeslotResponse?.tagId !== null) {
    mappedTag = (await options.siTag.TagService.getTagById(timeslotResponse.tagId)) ?? undefined
  }

  const mappedTimeslot: Timeslot = {
    ...timeslotResponse,
    description: timeslotResponse.description ?? undefined,
    register: timeslotResponse.register ?? undefined,
    noshowFee: timeslotResponse.noshowFee ?? undefined,
    cancelationFee: timeslotResponse.cancelationFee ? {
      amount: timeslotResponse.cancelationFee.amount,
      window: Duration.fromISO(timeslotResponse.cancelationFee.window)
    } : undefined,
    start: new Date(timeslotResponse.start),
    end: new Date(timeslotResponse.end),
    participantId: timeslotResponse.participantId ?? undefined,
    tag: mappedTag
  }

  return mappedTimeslot
}

interface GetAllTimeslotsByDateOptions extends BaseAPIParams{ 
  siTag?: boolean 
}

async function getAllTimeslotsByDate(client: V6Client<Schema>, date: Date, options?: GetAllTimeslotsByDateOptions) {
  if(options?.options?.logging) console.log('api call')

  let timeslotResponse = await client.models.Timeslot.listTimeslotByStartDate({
    startDate: DateTime.fromJSDate(date).toFormat('MM-dd-yyyy')
  })

  const timeslotData = timeslotResponse.data

  while(timeslotResponse.nextToken) {
    timeslotResponse = await client.models.Timeslot.listTimeslotByStartDate({
      startDate: DateTime.fromJSDate(date).toFormat('MM-dd-yyyy')
    }, {
      nextToken: timeslotResponse.nextToken
    })

    timeslotData.push(...timeslotResponse.data)
  }

  const tagMemo: UserTag[] = []

  const timeslots: Timeslot[] = (await Promise.all(timeslotData.map(async (timeslot) => {
    if (timeslot === undefined ||
      timeslot.id === undefined ||
      timeslot.start === undefined ||
      timeslot.end === undefined
    ) return
    const mappedTimeslot = await mapTimeslot(
      timeslot, 
      options?.siTag ? { 
        siTag: { 
          memo: tagMemo,
          TagService: new TagService(client)
        } 
      } : undefined
    )
    if(mappedTimeslot.tag && !tagMemo.some((tag) => tag.id === mappedTimeslot.tag?.id)) {
      tagMemo.push(mappedTimeslot.tag)
    }
    return mappedTimeslot
  })))
  .filter((timeslot) => timeslot !== undefined)
  .sort((a, b) => a.start.getTime() - b.start.getTime())

  return timeslots
}

interface GetAllTimeslotsByMonthOptions extends GetAllTimeslotsByDateOptions { }

async function getAllTimeslotsByMonth(client: V6Client<Schema>, date: Date, options?: GetAllTimeslotsByMonthOptions) {
  if(options?.options?.logging) console.log('api call')

  let timeslotResponse = await client.models.Timeslot.listTimeslotByStartMonth({
    startMonth: DateTime.fromJSDate(date).toFormat('MM-yyyy'),
  })

  const timeslotData = timeslotResponse.data

  while(timeslotResponse.nextToken) {
    timeslotResponse = await client.models.Timeslot.listTimeslotByStartMonth({
      startMonth: DateTime.fromJSDate(date).toFormat('MM-yyyy'),
    }, {
      nextToken: timeslotResponse.nextToken
    })

    timeslotData.push(...timeslotResponse.data)
  }

  const tagMemo: UserTag[] = []

  const timeslots: Timeslot[] = (await Promise.all(timeslotData.map(async (timeslot) => {
    if (timeslot === undefined ||
      timeslot.id === undefined ||
      timeslot.start === undefined ||
      timeslot.end === undefined
    ) return
    const mappedTimeslot = await mapTimeslot(
      timeslot, 
      options?.siTag ? { 
        siTag: { 
          memo: tagMemo,
          TagService: new TagService(client)
        } 
      } : undefined
    )
    if(mappedTimeslot.tag && !tagMemo.some((tag) => tag.id === mappedTimeslot.tag?.id)) {
      tagMemo.push(mappedTimeslot.tag)
    }
    return mappedTimeslot
  })))
  .filter((timeslot) => timeslot !== undefined)
  .sort((a, b) => a.start.getTime() - b.start.getTime())

  return timeslots
}

export async function getAllTimeslotsByUserTag(client: V6Client<Schema>, tagId?: string, options?: BaseAPIParams) {
  if(options?.options?.logging) console.log('api call')
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
      const mappedTimeslot = await mapTimeslot(timeslot.data)

      return mappedTimeslot
    })
  )).filter((timeslot) => timeslot !== undefined)

  return mappedTimeslots
}

async function getAllTimeslotsByUserTagList(client: V6Client<Schema>, userTags: UserTag[]) {
  const timeslots = (await Promise.all(userTags.map(async (tag) => {
    const returnedTimeslots = await getAllTimeslotsByUserTag(client, tag.id)
    return returnedTimeslots.map((timeslot) => ({ ...timeslot, tag: tag }))
  }))).reduce((prev, cur) => {
    prev.push(...cur)
    return prev
  }, [])

  return timeslots
}

async function getAllUntaggedTimeslots(client: V6Client<Schema>, options?: BaseAPIParams): Promise<Timeslot[]> {
  const start = new Date()

  let timeslotsResponse = await client.models.Timeslot.list()
  const timeslotsData = timeslotsResponse.data

  while (timeslotsResponse.nextToken) {
    timeslotsResponse = await client.models.Timeslot.list({ nextToken: timeslotsResponse.nextToken })
    timeslotsData.push(...timeslotsResponse.data)
  }

  if (options?.options?.logging) console.log(timeslotsData)

  const filteredTimeslots = await Promise.all(
    (await Promise.all(timeslotsData.filter(async (timeslot) => {
      const taggingResponse = (await timeslot.timeslotTag()).data
      if (options?.options?.logging) console.log(taggingResponse)
      return taggingResponse === null
    }))).map(async (timeslot) => mapTimeslot(timeslot, { siTag: undefined }))
  )

  if (options?.options?.logging) console.log(filteredTimeslots)

  if (options?.options?.metric) console.log(`GETALLUNTAGGEDTIMESLOTS:${new Date().getTime() - start.getTime()}ms`)
  //no register / participant without a tag
  return filteredTimeslots
}

interface GetTimeslotByIdOptions extends BaseAPIParams {
  siTag?: boolean
}

export interface CreateTimeslotsMutationParams extends BaseAPIParams{
  timeslots: Timeslot[],
}
export interface UpdateTimeslotsMutationParams extends BaseAPIParams {
  timeslots: Timeslot[]
  previousTimeslots: Timeslot[]
}

export interface UpdateTimeslotMutationParams extends BaseAPIParams {
  timeslot: Timeslot,
  description?: string,
  register?: string,
  participantId?: string,
  start: Date,
  end: Date,
  userTag?: UserTag,
  noShowFee?: number,
  cancelationFee?: {
    amount: number,
    window: Duration
  },
}

export interface DeleteTimeslotsMutationParams extends BaseAPIParams {
  timeslots: Timeslot[]
}

export interface DeleteTimeslotMutationParams extends BaseAPIParams{
  timeslot: Timeslot
}

export interface RegisterTimeslotMutationParams extends BaseAPIParams {
  timeslot: Timeslot,
  participantId: string,
  userEmail: string,
  unregister: boolean,
  additionalRecipients: string[]
  notify: boolean,
}

export interface AdminRegisterTimeslotMutationParams extends Omit<RegisterTimeslotMutationParams, 'timeslot'> {
  timeslotId: string
}

export interface SendTimeslotConfirmationParams extends Omit<AdminRegisterTimeslotMutationParams, 'notify' | 'unregister'> { 
  bypassTagValidation?: boolean
}

export class TimeslotService {
  private client: V6Client<Schema>
  constructor(client: V6Client<Schema>) {
    this.client = client
  }

  async createTimeslotsMutation(params: CreateTimeslotsMutationParams) {
    const response = await Promise.all(params.timeslots.map(async (timeslot) => {
      const formattedDate = DateTime.fromJSDate(timeslot.start)
      return [
        await this.client.models.Timeslot.create({
          id: timeslot.id,
          start: timeslot.start.toISOString(),
          end: timeslot.end.toISOString(),
          description: timeslot.description,
          tagId: timeslot.tag?.id,
          startDate: formattedDate.toFormat('MM-dd-yyyy'),
          startMonth: formattedDate.toFormat('MM-yyyy'),
          noshowFee: timeslot.noshowFee,
          cancelationFee: timeslot.cancelationFee ? {
            amount: timeslot.cancelationFee.amount,
            window: timeslot.cancelationFee.window.toISO() ?? Duration.fromObject({ hours: 48 }).toISO()
          } : undefined,
        }),
        timeslot.tag ? await this.client.models.TimeslotTag.create({
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
  async updateTimeslotsMutation(params: UpdateTimeslotsMutationParams) {
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

  async updateTimeslotMutation(params: UpdateTimeslotMutationParams): Promise<APIMutationResponse> {
    const start = new Date().getTime()
    if(
      params.timeslot.description !== params.description ||
      params.timeslot.register !== params.register ||
      params.timeslot.participantId !== params.participantId ||
      params.timeslot.start.toISOString() !== params.start.toISOString() ||
      params.timeslot.end.toISOString() !== params.end.toISOString() ||
      params.timeslot.noshowFee !== params.noShowFee ||
      (
        (params.timeslot.cancelationFee !== undefined && params.cancelationFee === undefined) ||
        (params.timeslot.cancelationFee === undefined && params.cancelationFee !== undefined) || (
          params.timeslot.cancelationFee?.amount !== params.cancelationFee?.amount ||
          params.timeslot.cancelationFee?.window.toISO() !== params.timeslot.cancelationFee?.window.toISO()
        )
      ) ||
      params.timeslot.tag?.id !== params.userTag?.id
    ) {
      const date = DateTime.fromJSDate(params.start)
      const updateResponse = await this.client.models.Timeslot.update({
        id: params.timeslot.id,
        register: params.register ?? null,
        participantId: params.participantId ?? null,
        description: params.description ?? null,
        startDate: date.toFormat('MM-dd-yyyy'),
        startMonth: date.toFormat('MM-yyyy'),
        start: params.start.toISOString(),
        end: params.start.toISOString(),
        noshowFee: params.noShowFee ?? null,
        cancelationFee: params.cancelationFee ? {
          amount: params.cancelationFee.amount,
          window: params.cancelationFee.window.toISO()!
        } : null,
        tagId: params.userTag?.id ?? null,
      })
      if(!updateResponse.data) { 
        return {
          status: 'Fail',
          error: 'Failed to update timeslot'
        }
      }
      if(params.options?.logging) console.log(updateResponse)

      const previousTaggingResponse = new Promise<APIMutationResponse>(async (resolve) => {
        if(updateResponse.data && params.timeslot.tag?.id !== undefined && params.timeslot.tag.id !== params.userTag?.id) {
          const timeslotTagResponse = await updateResponse.data.timeslotTag()
          if(params.options?.logging) console.log(timeslotTagResponse)
          if(timeslotTagResponse.data) {
            const deleteTimeslotResponse = await this.client.models.TimeslotTag.delete({ id: timeslotTagResponse.data.id })
            if(params.options?.logging) console.log(deleteTimeslotResponse)
            if(!deleteTimeslotResponse.data) {
              resolve({ status: 'Fail', error: 'Failed to delete timeslot tag association' })
            }
          }
          else {
            resolve({ status: 'Fail', error: 'Failed to retrieve previously associated timeslot tag' })
          }
        }
        resolve({ status: 'Success' })
      })

      const currentTaggingResponse = new Promise<APIMutationResponse>(async (resolve) => {
        if(params.userTag !== undefined && params.timeslot.tag?.id !== params.userTag.id) {
          const timeslotTagResponse = await this.client.models.TimeslotTag.create({
            timeslotId: params.timeslot.id,
            tagId: params.userTag.id
          })
          if(params.options?.logging) console.log(timeslotTagResponse)
          if(!timeslotTagResponse.data) {
            resolve({ status: 'Fail', error: 'Failed to create timeslot tag association' })
          }
        }
        resolve({ status: 'Success'})
      })

      const responses = await Promise.all([
        previousTaggingResponse,
        currentTaggingResponse
      ])

      if(params.options?.metric) {
        console.log(`UPDATETIMESLOT:${new Date().getTime() - start}ms`)
      }
      if(responses.some((response) => response.status === 'Fail')) {
        return responses.find((response) => response.status === 'Fail') ?? {
          status: 'Fail',
          error: 'Unexpected error occurred.'
        }
      }
      return {
        status: 'Success'
      }
    }

    return {
      status: 'Fail',
      error: 'No changes to update.'
    }
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

  //TODO: validate that the current user is able to register to this timeslot by receiving first
  async registerTimeslotMutation(params: RegisterTimeslotMutationParams): Promise<APIMutationResponse> {
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
      const parsedResponse: APIMutationResponse = JSON.parse(response.data.toString())
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

  async sendTimeslotConfirmation(params: SendTimeslotConfirmationParams): Promise<APIMutationResponse> {
    const getTimeslotResponse = await this.client.models.Timeslot.get({ id: params.timeslotId })
    if(!getTimeslotResponse.data) {
      return { status: 'Fail', error: 'Timeslot for this id does not exist.'}
    }

    const timeslotTag = getTimeslotResponse.data.tagId

    //participant tag ownership validation
    if(timeslotTag !== null && !params.bypassTagValidation) {
      let getParticipantTagIdsResponse = await this.client.models.ParticipantUserTag.listParticipantUserTagByParticipantId({ participantId: params.participantId })
      const getParticipantTagIdsData = getParticipantTagIdsResponse.data

      while(getParticipantTagIdsResponse.nextToken) {
        getParticipantTagIdsResponse = await this.client.models.ParticipantUserTag.listParticipantUserTagByParticipantId({
          participantId: params.participantId,
        }, {
          nextToken: getParticipantTagIdsResponse.nextToken
        })
        getParticipantTagIdsData.push(...getParticipantTagIdsResponse.data)
      }

      if(!getParticipantTagIdsData.some((tag) => tag.tagId === timeslotTag)) {
        return { status: 'Fail', error: 'Participant does not own the tag required for registration.' }
      }
    }

    const response = await this.client.queries.SendTimeslotConfirmation({
      email: params.userEmail,
      start: getTimeslotResponse.data.start,
      end: getTimeslotResponse.data.end,
      additionalRecipients: params.additionalRecipients,
      tagId: getTimeslotResponse.data.tagId,
      participantId: params.participantId,
    }, {
      authMode: 'userPool'
    })

    if(response.data === null) return { status: 'Success', error: 'Failed to send confirmation email.'}
        
    const emailParsedResponse: { success: boolean } = JSON.parse(response.data.toString())
    if(!emailParsedResponse.success) {
      return { status: 'Success', error: 'Failed to send confirmation email.'}
    }
    return { status: 'Success' }
}

  async getTimeslotById(timeslotId: string, options?: GetTimeslotByIdOptions): Promise<Timeslot | null> {
    if(timeslotId === '') return null
    const start = new Date()
    const timeslotResponse = await this.client.models.Timeslot.get({ id: timeslotId })
    if (!timeslotResponse.data) return null
    if (options?.options?.metric) console.log(`GETTIMESLOTBYID:${new Date().getTime() - start.getTime()}ms`)
    return mapTimeslot(timeslotResponse.data, {
      siTag: options?.siTag ? {
        memo: [],
        TagService: new TagService(this.client)
      } : undefined
    })
  }

  async getTimeslotsByParticipantId(participantId: string, options?: GetTimeslotByIdOptions): Promise<Timeslot[]> {
    const returnArray: Timeslot[] = []

    let timeslotResponse = await this.client.models.Timeslot.listTimeslotByParticipantId({ participantId: participantId })
    const timeslotData = timeslotResponse.data

    while(timeslotResponse.nextToken) {
      timeslotResponse = await this.client.models.Timeslot.listTimeslotByParticipantId({ participantId: participantId }, { nextToken: timeslotResponse.nextToken })
      timeslotData.push(...timeslotResponse.data)
    }

    await Promise.all(timeslotData.map(async (timeslot) => {
      if(timeslot) {
        const mappedTimeslot = await mapTimeslot(timeslot, {
          siTag: options?.siTag ? {
            memo: [],
            TagService: new TagService(this.client)
          } : undefined
        })
        returnArray.push(mappedTimeslot)
      }
    }))

    return returnArray.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }

  async adminRegisterTimeslotMutation(params: AdminRegisterTimeslotMutationParams): Promise<Timeslot | null> {
    const getTimeslot = await this.getTimeslotById(params.timeslotId, { siTag: true })

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

  async deleteTimeslot(params: DeleteTimeslotMutationParams): Promise<APIMutationResponse> {
    const response = await this.client.models.Timeslot.delete({ id: params.timeslot.id })
    if(response.data) {
      if(params.timeslot.tag?.id !== undefined) {
        const timeslotTagResponse = await this.client.models.TimeslotTag.listTimeslotTagByTimeslotId({ timeslotId: params.timeslot.id })
        if(timeslotTagResponse.data) {
          const response = await Promise.all(
            timeslotTagResponse.data
            .filter((data) => data.tagId === params.timeslot.tag?.id)
            .map((timeslotTag) => this.client.models.TimeslotTag.delete({ id: timeslotTag.id }))
          )
          if(response.length > 0) {
            return {
              status: 'Success'
            }
          }
          else {
            return {
              status: 'Success',
              error: 'Failed to delete timeslot tag association.'
            }
          }
        }
        return {
          status: 'Success',
          error: 'Failed to get timeslot tag association'
        }
      }
      return {
        status: 'Success'
      }
    }
    else if(response.errors) {
      return {
        status: 'Fail',
        error: response.errors.map((error) => error.message).join(', ')
      }
    }
    return { 
      status: 'Fail',
      error: 'Failed to delete timeslot.'
    }
  }

  getAllTimeslotsByDateQueryOptions = (date: Date, options?: GetAllTimeslotsByDateOptions) => queryOptions({
    queryKey: ['timeslot-date', date],
    queryFn: () => getAllTimeslotsByDate(this.client, date, options)
  })

  getAllTimeslotsByMonthQueryOptions = (date: Date, options?: GetAllTimeslotsByMonthOptions) => queryOptions({
    queryKey: ['timeslots-month', date],
    queryFn: () => getAllTimeslotsByMonth(this.client, date, options)
  })

  getAllTimeslotsByUserTagQueryOptions = (tagId?: string) => queryOptions({
    queryKey: ['tag-timeslot', tagId],
    queryFn: () => getAllTimeslotsByUserTag(this.client, tagId)
  })

  getAllTimeslotsByUserTagListQueryOptions = (userTags: UserTag[]) => queryOptions({
    queryKey: ['timeslot-by-tag-list', ...userTags.map((tag) => tag.id)],
    queryFn: () => getAllTimeslotsByUserTagList(this.client, userTags)
  })

  getAllUntaggedTimeslotsQueryOptions = (options?: BaseAPIParams) => queryOptions({
    queryKey: ['untagged-timeslots', options],
    queryFn: () => getAllUntaggedTimeslots(this.client, options)
  })

  getTimeslotByIdQueryOptions = (timeslotId: string, options?: GetTimeslotByIdOptions) => queryOptions({
    queryKey: ['timeslot', timeslotId],
    queryFn: () => this.getTimeslotById(timeslotId, options)
  })
}