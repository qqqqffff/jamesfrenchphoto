import { Schema } from "../../amplify/data/resource";
import { V6Client } from '@aws-amplify/api-graphql'
import { Notification, Participant, UserTag } from "../types";
import { queryOptions } from "@tanstack/react-query";
import sgMail from '@sendgrid/mail'

interface GetAllNotificationOptions {
  siParticipants?: boolean
  siTags?: boolean
  logging?: boolean
  metric?: boolean
}
async function getAllNotifications(client: V6Client<Schema>, options?: GetAllNotificationOptions): Promise<Notification[]> {
  let notificationsResponse = await client.models.Notifications.list()
  const notificationData = notificationsResponse.data
  const mappedNotifications: Notification[] = []
  if(options?.logging) console.log(notificationsResponse);

  while(notificationsResponse.nextToken) {
    notificationsResponse = await client.models.Notifications.list({ 
      nextToken: notificationsResponse.nextToken 
    })
    if(options?.logging) console.log(notificationsResponse);
    notificationData.push(...notificationsResponse.data)
  }

  const participantMemo: Map<String, Participant> = new Map()
  const tagMemo: Map<String, UserTag> = new Map()

  mappedNotifications.push(...await Promise.all(notificationData.map(async (notification) => {
    const mappedParticipants: Participant[] = []
    const mappedTags: UserTag[] = []

    if(options?.siParticipants) {
      let participantResponse = await notification.participant()
      const participantData = participantResponse.data

      while(participantResponse.nextToken) {
        participantResponse = await notification.participant({ 
          nextToken: participantResponse.nextToken 
        })
        participantData.push(...participantResponse.data)
      }

      mappedParticipants.push(...(await Promise.all(participantData.map(async (participantTag) => {
        const existingParticipant = participantMemo.get(participantTag.participantId)
        if(existingParticipant) {
          return existingParticipant
        }
        const participant = await participantTag.participant()

        if(participant.data) {
          const mappedParticipant: Participant = {
            ...participant.data,
            middleName: participant.data.middleName ?? undefined,
            preferredName: participant.data.preferredName ?? undefined,
            contact: participant.data.contact ?? false,
            email: participant.data.email ?? undefined,
            //unnecessary
            timeslot: [],
            userTags: [],
            notifications: [],
            collections: []
          }
          participantMemo.set(mappedParticipant.id, mappedParticipant)

          return mappedParticipant
        }
      }))).filter((participant) => participant !== undefined))
    }

    if(options?.siTags) {
      let tagResponse = await notification.tags()
      const tagData = tagResponse.data

      while(tagResponse.nextToken) {
        tagResponse = await notification.tags({ 
          nextToken: tagResponse.nextToken 
        })
        tagData.push(...tagResponse.data)
      }

      mappedTags.push(...(await Promise.all(tagData.map(async (userTagTag) => {
        const existingTag = tagMemo.get(userTagTag.tagId)
        if(existingTag) {
          return existingTag
        }
        const tag = await userTagTag.tag()

        if(tag.data) {
          const mappedTag: UserTag = {
            ...tag.data,
            color: tag.data.color ?? undefined,
            notifications: undefined,
            //TODO: implement children
            children: [],
            participants: []
          }
          tagMemo.set(mappedTag.id, mappedTag)

          return mappedTag
        }
      }))).filter((tag) => tag !== undefined))
    }

    const mappedNotification: Notification = {
      ...notification,
      location: notification.location ?? 'dashboard',
      participants: mappedParticipants,
      tags: mappedTags,
      expiration: notification.expiration ?? undefined
    }
    return mappedNotification
  })))

  return mappedNotifications
}

//TODO: implement me
// interface GetAllParticipantNotificationOptions {

// }
// async function getAllParticipantNotifications(client: V6Client<Schema>, participantId?: string, options?: GetAllParticipantNotificationOptions) {

// }

interface GetAllNotificationsFromUserTagsOptions {
  logging?: boolean
}
export async function getAllNotificationsFromUserTag(
  client: V6Client<Schema>, 
  memo: Notification[], 
  tagId?: string, 
  options?: GetAllNotificationsFromUserTagsOptions
): Promise<[Notification[], Notification[]]> {
  const mappedNotifications: Notification[] = []
  const updatedMemo = [...memo]
  if(!tagId) return [mappedNotifications, updatedMemo]

  let tagResponse = await client.models.NotificationUserTags.listNotificationUserTagsByTagId({
    tagId: tagId 
  })
  const tagData = tagResponse.data

  while(tagResponse.nextToken) {
    tagResponse = await client.models.NotificationUserTags.listNotificationUserTagsByTagId({ 
      tagId: tagId 
    }, { 
      nextToken: tagResponse.nextToken 
    })
    tagData.push(...tagResponse.data)
  }
  

  mappedNotifications.push(...(await Promise.all(tagData.map(async (tag) => {
    const foundNotification = updatedMemo.find((notification) => notification.id === tag.notificationId)
    if(foundNotification) {
      return foundNotification
    }
    const notification = await tag.notification()
    if(notification.data) {
      const mappedNotification: Notification = {
        ...notification.data,
        location: notification.data.location ?? 'dashboard',
        expiration: notification.data.expiration ?? undefined,
        participants: [],
        tags: []
      }
      updatedMemo.push(mappedNotification)
      return mappedNotification
    }
  }))).filter((notification) => notification !== undefined))

  if(options?.logging) console.log(updatedMemo)

  return [mappedNotifications, updatedMemo]
}

export interface CreateNotificationParams {
  notification: Notification,
  options?: {
    logging?: boolean
  }
}

export interface UpdateNotificationParams extends Partial<CreateNotificationParams> {
  notification: Notification,
  content: string,
  location: Notification["location"],
  expiration?: string,
  participantIds: string[],
  tagIds: string[],
}

export interface DeleteNotificationParams {
  notificationId: string,
  options?: {
    logging?: boolean
  }
}

export interface SendUserEmailNotificationParams {
  email: string,
  additionalRecipients: string[]
  content: string,
  options?: {
    logging?: boolean
  }
}

// export const getAllParticipantNotificationsQueryOptions = (participantId?: string, options?: GetAllParticipantNotificationOptions) => queryOptions({
//   queryKey: ['participantNotifications', client, options],
//   queryFn: () => getAllParticipantNotifications(client, participantId, options)
// })

export class NotificationService {
  private client: V6Client<Schema>;

  constructor(client: V6Client<Schema>) {
    this.client = client
  }

  async createNotificationMutation(params: CreateNotificationParams): Promise<'success' | 'fail'> {
    const response = await this.client.models.Notifications.create({
      id: params.notification.id,
      content: params.notification.content,
      location: params.notification.location,
      expiration: params.notification.expiration,
    })

    if(params.options?.logging) console.log(response)

    if(response.data) {
      const notificationId = response.data.id

      const userTagResponse = await Promise.all((params.notification.tags ?? []).map((tag) => {
        return this.client.models.NotificationUserTags.create({
          tagId: tag.id,
          notificationId: notificationId
        })
      }))

      if(params.options?.logging) console.log(userTagResponse)

      const participantResponse = await Promise.all((params.notification.participants ?? []).map((participant) => {
        return this.client.models.NotificationParticipants.create({
          participantId: participant.id,
          notificationId: notificationId
        })
      }))

      if(params.options?.logging) console.log(participantResponse)

      return [
        ...participantResponse.map((data) => data.data).filter((data) => data !== null),
        ...userTagResponse.map((data) => data.data).filter((data) => data !== null)
      ].length === (
        params.notification.participants.length + 
        params.notification.tags.length
      ) ? 'success' : 'fail'
    }
    return 'fail'
  }

  async updateNotificationMutation(params: UpdateNotificationParams) {
    if(
      params.participantIds?.some((cPid) => !params.notification.participants.some((participant) => cPid === participant.id)) ||
      params.notification.participants.some((participant) => !params.participantIds.some((pid) => pid === participant.id))
    ) {
      const deletedParticipants: string[] = params.notification.participants
        .filter((participant) => !params.participantIds?.some((id) => id === participant.id))
        .map((participant) => participant.id)

      const addedParticipants: string[] = params.participantIds
        .filter((id) => !params.notification.participants.some((participant) => participant.id === id))


      let participantResponse = await this.client.models.NotificationParticipants.listNotificationParticipantsByNotificationId({ 
        notificationId: params.notification.id 
      })
      const participantData = participantResponse.data

      while(
        participantResponse.nextToken || 
        deletedParticipants.reduce((prev, cur) => {
          if(prev) return prev
          if(!participantData.some((data) => data.participantId === cur)) return true
          return prev
        }, false)
      ) {
        participantResponse = await this.client.models.NotificationParticipants.listNotificationParticipantsByNotificationId({ 
          notificationId: params.notification.id 
        }, { 
          nextToken: participantResponse.nextToken 
        })
        participantData.push(...participantResponse.data)
      }

      const deleteResponse = Promise.all(participantData.map((data) => {
        if(deletedParticipants.some((pId) => pId === data.participantId)) {
          return this.client.models.NotificationParticipants.delete({
            id: data.id
          })
        }
      }))

      if(params.options?.logging) console.log(deleteResponse)

      const addResponse = Promise.all(addedParticipants.map((participant) => {
        return this.client.models.NotificationParticipants.create({
          participantId: participant,
          notificationId: params.notification.id
        })
      }))

      if(params.options?.logging) console.log(addResponse)
    }

    if(
      params.tagIds?.some((cTid) => !params.notification.tags.some((tag) => cTid === tag.id)) ||
      params.notification.tags.some((tag) => !params.tagIds.some((tagId) => tagId === tag.id))
    ) {
      const deletedTags: string[] = params.notification.tags
        .filter((tag) => !params.tagIds?.some((id) => id === tag.id))
        .map((tag) => tag.id)

      const addedTags: string[] = params.tagIds
        .filter((id) => !params.notification.tags.some((tag) => tag.id === id))


      let tagResponse = await this.client.models.NotificationUserTags.listNotificationUserTagsByNotificationId({ 
        notificationId: params.notification.id 
      })
      const tagData = tagResponse.data

      while(
        tagResponse.nextToken || 
        deletedTags.reduce((prev, cur) => {
          if(prev) return prev
          if(!tagData.some((data) => data.tagId === cur)) return true
          return prev
        }, false)
      ) {
        tagResponse = await this.client.models.NotificationUserTags.listNotificationUserTagsByNotificationId({ 
          notificationId: params.notification.id 
        }, { 
          nextToken: tagResponse.nextToken 
        })
        tagData.push(...tagResponse.data)
      }

      const deleteResponse = Promise.all(tagData.map((data) => {
        if(deletedTags.some((tagId) => tagId === data.tagId)) {
          return this.client.models.NotificationUserTags.delete({
            id: data.id,
          })
        }
      }))

      if(params.options?.logging) console.log(deleteResponse)

      const addResponse = Promise.all(addedTags.map((tag) => {
        return this.client.models.NotificationUserTags.create({
          tagId: tag,
          notificationId: params.notification.id
        })
      }))

      if(params.options?.logging) console.log(addResponse)
    }

    if(params.content !== params.notification.content ||
      params.location !== params.notification.location ||
      params.expiration !== params.notification.expiration
    ) {
      const response = this.client.models.Notifications.update({
        id: params.notification.id,
        content: params.content ?? params.notification.content,
        location: params.location ?? params.notification.location,
        expiration: params.expiration === 'none' ? null : params.expiration ?? params.notification.expiration,
      })

      if(params.options?.logging) console.log(response)
    }
  }

  async deleteNotificationMutation(params: DeleteNotificationParams) {
    const response = await this.client.models.Notifications.delete({ id: params.notificationId })
    if(params.options?.logging) console.log(response)
    if(response.data) {
      let participantResponse = await response.data.participant()
      const participantData = participantResponse.data

      while(participantResponse.nextToken) {
        participantResponse = await response.data.participant({ nextToken: participantResponse.nextToken })
        participantData.push(...participantResponse.data)
      }

      const deleteParticipantResponse = Promise.all(participantData.map((data) => this.client.models.NotificationParticipants.delete({ id: data.id })))
      if(params.options?.logging) console.log(deleteParticipantResponse)

      let tagResponse = await response.data.tags()
      const tagData = tagResponse.data

      while(tagResponse.nextToken) {
        tagResponse = await response.data.tags({ nextToken: tagResponse.nextToken })
        tagData.push(...tagResponse.data)
      }

      const deleteTagsResponse = Promise.all(tagData.map((data) => this.client.models.NotificationUserTags.delete({ id: data.id })))
      if(params.options?.logging) console.log(deleteTagsResponse)
    }
  }

  async sendUserEmailNotificationMutation(params: SendUserEmailNotificationParams): Promise<{message: string, status: 'fail' | 'success'}> {
    try {
      const response = await this.client.queries.NotifyUser({
        email: params.email,
        content: params.content,
        additionalRecipients: params.additionalRecipients
      })

      if(params.options?.logging) {
        console.log(response)
      }
      if(response.data !== null) {
        const sgResponse: [sgMail.ClientResponse, {}] = JSON.parse(response.data.toString())
        if(sgResponse[0].statusCode >= 200 && sgResponse[0].statusCode < 300) {
          return { message: 'Email notification sent successfully.', status: 'success' }
        }
        else {
          return { message: 'Failed to send email notification.', status: 'fail' }
        }
      }
      else {
        return { message: 'Failed to send email notification.', status: 'fail' }
      }
      
    } catch(error) {
      return { message: 'Failed to send email notification.', status: 'fail' }
    }
  }

  public getAllNotificationsQueryOptions = (options?: GetAllNotificationOptions) => queryOptions({
    queryKey: ['notifications', options],
    queryFn: () => getAllNotifications(this.client, options)
  })

}