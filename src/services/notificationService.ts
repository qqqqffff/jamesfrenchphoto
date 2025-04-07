import { generateClient } from "aws-amplify/api";
import { Schema } from "../../amplify/data/resource";
import { V6Client } from '@aws-amplify/api-graphql'
import { Notification } from "../types";
import { queryOptions } from "@tanstack/react-query";

const client = generateClient<Schema>()

interface GetAllNotificationOptions {

}
async function getAllNotifications(client: V6Client<Schema>, options?: GetAllNotificationOptions) {

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
}
export async function createNotificationMutation(params: CreateNotificationParams) {

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