import { generateClient } from "aws-amplify/api";
import { Schema } from "../../amplify/data/resource";
import { V6Client } from '@aws-amplify/api-graphql'
import { Notification } from "../types";
import { queryOptions } from "@tanstack/react-query";

const client = generateClient<Schema>()

interface GetAllNotificationOptions {

}
async function getAllNotifications(client: V6Client<Schema>, options?: GetAllNotificationOptions): Promise<Notification[]> {
  let notificationsResponse = await client.models.Notifications.list()
  const notificationData = notificationsResponse.data
  const mappedNotifications: Notification[] = []

  while(notificationsResponse.nextToken) {
    notificationsResponse = await client.models.Notifications.list({ nextToken: notificationsResponse.nextToken })
    notificationData.push(...notificationsResponse.data)
  }

  mappedNotifications.push(...notificationData.map((notification) => {
    const mappedNotification: Notification = {
      ...notification,
      location: notification.location ?? 'dashboard',
      participantId: notification.participantId ?? undefined,
      tagId: notification.tagId ?? undefined,
      expiration: notification.expiration ?? undefined
    }
    return mappedNotification
  }))

  return mappedNotifications
}

interface GetAllParticipantNotificationOptions {

}
async function getAllParticipantNotifications(client: V6Client<Schema>, participantId?: string, options?: GetAllParticipantNotificationOptions) {

}

export interface CreateNotificationParams {
  content: string,
  location: 'dashboard',
  participantId?: string,
  tagId?: string,
  expiration?: string,
  options?: {
    logging?: boolean
  }
}
export async function createNotificationMutation(params: CreateNotificationParams) {
  const response = await client.models.Notifications.create({
    content: params.content,
    location: params.location,
    participantId: params.participantId,
  })
}

export interface UpdateNotificationParams extends Partial<CreateNotificationParams> {
  notification: Notification
}
export async function updateNotificationMutation(params: UpdateNotificationParams) {

}

export async function deleteNotificationMutation(notificationId: string) {

}

export const getAllNotificationsQueryOptions = (options?: GetAllNotificationOptions) => queryOptions({
  queryKey: ['notifications', client, options],
  queryFn: () => getAllNotifications(client, options)
})

export const getAllParticipantNotificationsQueryOptions = (participantId?: string, options?: GetAllParticipantNotificationOptions) => queryOptions({
  queryKey: ['participantNotifications', client, options],
  queryFn: () => getAllParticipantNotifications(client, participantId, options)
})