import { generateClient } from "aws-amplify/api";
import { Schema } from "../../amplify/data/resource";
import { V6Client } from '@aws-amplify/api-graphql'
import { Notification, Participant, UserTag } from "../types";
import { queryOptions } from "@tanstack/react-query";

const client = generateClient<Schema>()

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
    notificationsResponse = await client.models.Notifications.list({ nextToken: notificationsResponse.nextToken })
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
        participantResponse = await notification.participant({ nextToken: participantResponse.nextToken })
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
            notifications: []
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
        tagResponse = await notification.tags({ nextToken: tagResponse.nextToken })
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
            notifications: undefined
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

interface GetAllParticipantNotificationOptions {

}
async function getAllParticipantNotifications(client: V6Client<Schema>, participantId?: string, options?: GetAllParticipantNotificationOptions) {

}

interface GetAllNotificationsFromUserTagsOptions {
  logging?: boolean
}
export async function getAllNotificationsFromUserTag(client: V6Client<Schema>, memo: Notification[], tagId?: string, options?: GetAllNotificationsFromUserTagsOptions): Promise<[Notification[], Notification[]]> {
  const mappedNotifications: Notification[] = []
  const updatedMemo = [...memo]
  if(!tagId) return [mappedNotifications, updatedMemo]

  let tagResponse = await client.models.NotificationUserTags.listNotificationUserTagsByTagId({ tagId: tagId })
  const tagData = tagResponse.data

  while(tagResponse.nextToken) {
    tagResponse = await client.models.NotificationUserTags.listNotificationUserTagsByTagId({ tagId: tagId }, { nextToken: tagResponse.nextToken })
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
  content: string,
  location: 'dashboard',
  participantIds?: string[],
  tagIds?: string[],
  expiration?: string,
  options?: {
    logging?: boolean
  }
}
export async function createNotificationMutation(params: CreateNotificationParams): Promise<string | undefined> {
  const response = await client.models.Notifications.create({
    content: params.content,
    location: params.location,
    expiration: params.expiration,
  })

  if(params.options?.logging) console.log(response)

  if(response.data) {
    const userTagResponse = await Promise.all((params.tagIds ?? []).map((tag) => {
      return client.models.NotificationUserTags.create({
        tagId: tag,
        notificationId: response.data!.id
      })
    }))

    if(params.options?.logging) console.log(userTagResponse)

    const participantResponse = await Promise.all((params.participantIds ?? []).map((participant) => {
      return client.models.NotificationParticipants.create({
        participantId: participant,
        notificationId: response.data!.id
      })
    }))

    if(params.options?.logging) console.log(participantResponse)

    return response.data.id
  }
}

export interface UpdateNotificationParams extends Partial<CreateNotificationParams> {
  notification: Notification
}
export async function updateNotificationMutation(params: UpdateNotificationParams) {
  if(params.participantIds?.some((cPid) => !params.notification.participants.some((participant) => cPid === participant.id))) {
    const deletedParticipants: string[] = params.notification.participants
      .filter((participant) => !params.participantIds?.some((id) => id === participant.id))
      .map((participant) => participant.id)

    const addedParticipants: string[] = params.participantIds
      .filter((id) => !params.notification.participants.some((participant) => participant.id === id))


    let tagResponse = await client.models.NotificationParticipants.listNotificationParticipantsByNotificationId({ notificationId: params.notification.id })
    let tagData = tagResponse.data

    while(tagResponse.nextToken) {
      tagResponse = await client.models.NotificationParticipants.listNotificationParticipantsByNotificationId({ notificationId: params.notification.id }, { nextToken: tagResponse.nextToken })
      tagData.push(...tagResponse.data)
    }

    const deleteResponse = await Promise.all(deletedParticipants.map((pId) => {
      const foundId = tagData.find((tag) => tag.participantId === pId)?.id
      if(foundId) {
        return client.models.NotificationParticipants.delete({
          id: foundId,
        })
      }
    }))

    if(params.options?.logging) console.log(deleteResponse)

    const addResponse = await Promise.all(addedParticipants.map((participant) => {
      return client.models.NotificationParticipants.create({
        participantId: participant,
        notificationId: params.notification.id
      })
    }))

    if(params.options?.logging) console.log(addResponse)
  }

  if(params.tagIds?.some((cTid) => !params.notification.tags.some((tag) => cTid === tag.id))) {
    const deletedTags: string[] = params.notification.tags
      .filter((tag) => !params.tagIds?.some((id) => id === tag.id))
      .map((tag) => tag.id)

    const addedTags: string[] = params.tagIds
      .filter((id) => !params.notification.tags.some((tag) => tag.id === id))


    let tagResponse = await client.models.NotificationUserTags.listNotificationUserTagsByNotificationId({ notificationId: params.notification.id })
    let tagData = tagResponse.data

    while(tagResponse.nextToken) {
      tagResponse = await client.models.NotificationUserTags.listNotificationUserTagsByNotificationId({ notificationId: params.notification.id }, { nextToken: tagResponse.nextToken })
      tagData.push(...tagResponse.data)
    }

    const deleteResponse = await Promise.all(deletedTags.map((tId) => {
      const foundId = tagData.find((tag) => tag.tagId === tId)?.id
      if(foundId) {
        return client.models.NotificationUserTags.delete({
          id: foundId,
        })
      }
    }))

    if(params.options?.logging) console.log(deleteResponse)

    const addResponse = await Promise.all(addedTags.map((tag) => {
      return client.models.NotificationUserTags.create({
        tagId: tag,
        notificationId: params.notification.id
      })
    }))

    if(params.options?.logging) console.log(addResponse)
  }

  if(params.content !== params.notification.content ||
    params.location !== params.notification.location ||
    params.expiration !== params.expiration
  ) {
    const response = await client.models.Notifications.update({
      id: params.notification.id,
      content: params.content ?? params.notification.content,
      location: params.location ?? params.notification.location,
      expiration: params.expiration ?? params.notification.expiration,
    })

    if(params.options?.logging) console.log(response)
  }
}

export interface DeleteNotificationParams {
  notificationId: string,
  options?: {
    logging?: boolean
  }
}
export async function deleteNotificationMutation(params: DeleteNotificationParams) {
  const response = await client.models.Notifications.delete({ id: params.notificationId })

  if(params.options?.logging) console.log(response)
}

export const getAllNotificationsQueryOptions = (options?: GetAllNotificationOptions) => queryOptions({
  queryKey: ['notifications', client, options],
  queryFn: () => getAllNotifications(client, options)
})

export const getAllParticipantNotificationsQueryOptions = (participantId?: string, options?: GetAllParticipantNotificationOptions) => queryOptions({
  queryKey: ['participantNotifications', client, options],
  queryFn: () => getAllParticipantNotifications(client, participantId, options)
})