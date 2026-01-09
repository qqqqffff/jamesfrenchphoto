import { createFileRoute } from '@tanstack/react-router'
import { NotificationService } from '../../../services/notificationService'
import { useEffect, useState } from 'react'
import { NotificationPanel } from '../../../components/admin/notification/NotificationPanel'
import { Notification, Participant, UserTag } from '../../../types'
import { UserService } from '../../../services/userService'
import { NotificationSidePanel } from '../../../components/admin/notification/NotificationSidePanel'
import { useQuery } from '@tanstack/react-query'
import { v4 } from 'uuid'
import { V6Client } from '@aws-amplify/api-graphql'
import { Schema } from '../../../../amplify/data/resource'
import { TagService } from '../../../services/tagService'

interface NotificationSearchParams {
  notificationId?: string,
}
export const Route = createFileRoute('/_auth/admin/dashboard/notification')({
  validateSearch: (search: Record<string, unknown>): NotificationSearchParams => ({
    notificationId: (search.notificationId as string) || undefined,
  }),
  beforeLoad: ({ search }) => search,
  loader: ({ context }) => {
    const client = context.client as V6Client<Schema>

    return {
      NotificationService: new NotificationService(client),
      UserService: new UserService(client),
      TagService: new TagService(client),
      notificationId: context.notificationId,
    }
  },
  component: RouteComponent,
})

function RouteComponent() {
  const data = Route.useLoaderData()

  //notificationSpecific query
  const notificationsQuery = useQuery(data.NotificationService.getAllNotificationsQueryOptions({ 
    siParticipants: true, 
    siTags: true 
  }))
  //TODO: convert me to infinite query
  const participantsQuery = useQuery(data.UserService.getAllParticipantsQueryOptions({ 
    siNotifications: true, 
    siTags: { 
      siChildren: false,
      siPackages: false,
      siTimeslots: false
    } 
  }))
  //TODO: convert me to infinite query
  const userTagsQuery = useQuery(data.TagService.getAllUserTagsQueryOptions({ siCollections: false, siTimeslots: false, siNotifications: true }))
  
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [selectedNotification, setSelectedNotification] = useState<Notification>()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [userTags, setUserTags] = useState<UserTag[]>([])

  useEffect(() => {
    const foundNotification = notificationsQuery.data?.find((notification) => notification.id === data.notificationId)
    if(notificationsQuery.data?.some((pNoti) => !notifications.some((noti) => pNoti.id === noti.id))) {
      setNotifications(notificationsQuery.data)
    }
    if(foundNotification) {
      setSelectedNotification(foundNotification)
    }
  }, [notificationsQuery.data])

  useEffect(() => {
    if(participantsQuery.data?.some((pPart) => !participants.some((part) => pPart.id === part.id))) {
      setParticipants(participantsQuery.data)
    }
  }, [participantsQuery.data])

  useEffect(() => {
    if(userTagsQuery.data?.some((pTag) => !userTags.some((tag) => pTag.id === tag.id))) {
      setUserTags(userTagsQuery.data)
    }
  }, [userTagsQuery.data])

  return (
    <div className="flex flex-row mx-4 mt-4 gap-4">
      <div className="items-center border border-gray-400 flex flex-col gap-2 rounded-2xl p-4 max-w-[400px] min-w-[400px]">
        <div className='flex flex-row w-full justify-between px-2'>
          <span className='text-xl font-light text-gray-800'>Notifications:</span>
          <button 
            className="flex flex-row gap-2 border border-gray-300 items-center enabled:hover:bg-gray-100 rounded-xl py-1 px-3 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-600"
            disabled={notifications.some((notification) => notification.temporary)}
            onClick={() => {
              if(!notifications.some((notification) => notification.temporary)) {
                const tempNotification: Notification = {
                  id: v4(),
                  temporary: true,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  content: '',
                  location: 'dashboard',
                  participants: [],
                  tags: []
                }
                setSelectedNotification(tempNotification)
              }
            }}
          >
            <span className="text-sm">Create Notification</span>
          </button>
        </div>
        <div className="border w-full"></div>
        <NotificationSidePanel 
          notifications={notifications}
          userTags={userTags}
          tagsLoading={userTagsQuery.isLoading}
          selectedNotification={selectedNotification}
          parentUpdateSelectedNotification={setSelectedNotification}
        />
      </div>
      <div className="border-gray-400 border rounded-2xl p-4 flex flex-col w-full h-auto">
        {selectedNotification ? (
          <NotificationPanel 
            NotificationService={data.NotificationService}
            notification={selectedNotification}
            parentUpdateNotification={setSelectedNotification}
            parentUpdateNotifications={setNotifications}
            parentUpdateParticipants={setParticipants}
            parentUpdateTags={setUserTags}
            participants={participants}
            tags={userTags}
          />
        ) : (
          <div className='flex flex-row items-center justify-center w-full'>
            <span className='font-thin italic text-xl'>Create or open an existing notification to view here.</span>
          </div>
        )}
      </div>
    </div>
  )
}
