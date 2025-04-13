import { createFileRoute } from '@tanstack/react-router'
import { getAllNotificationsQueryOptions } from '../../../services/notificationService'
import { useEffect, useState } from 'react'
import { CreateNotificationPanel } from '../../../components/admin/notification/CreateNotificationPanel'
import { Notification, Participant, UserTag } from '../../../types'
import { getAllParticipantsQueryOptions, getAllUserTagsQueryOptions } from '../../../services/userService'
import { NotificationSidePanel } from '../../../components/admin/notification/NotificationSidePanel'

export const Route = createFileRoute('/_auth/admin/dashboard/notification')({
  component: RouteComponent,
  loader: async ({ context }) => {
    const notifications = context.queryClient.ensureQueryData(getAllNotificationsQueryOptions({ siParticipants: true, siTags: true }))
    const participants = context.queryClient.ensureQueryData(getAllParticipantsQueryOptions({ siNotifications: true, siTags: true }))
    const userTags = context.queryClient.ensureQueryData(getAllUserTagsQueryOptions({ siCollections: false, siTimeslots: false, siNotifications: true }))
  
    return {
      notifications: await notifications,
      participants: await participants,
      userTags: await userTags
    }
  }
})

function RouteComponent() {
  const data = Route.useLoaderData()

  const [creatingNotification, setCreatingNotification] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [selectedNotification, setSelectedNotification] = useState<Notification>()
  const [participants, setParticipants] = useState<Participant[]>([])
  const [userTags, setUserTags] = useState<UserTag[]>([])

  useEffect(() => {
    if(data.notifications.some((pNoti) => !notifications.some((noti) => pNoti.id === noti.id))) {
      setNotifications(data.notifications)
    }
    if(data.participants.some((pPart) => !participants.some((part) => pPart.id === part.id))) {
      setParticipants(data.participants)
    }
    if(data.userTags.some((pTag) => !userTags.some((tag) => pTag.id === tag.id))) {
      setUserTags(data.userTags)
    }
  }, [data.notifications, data.userTags, data,participants])

  return (
    <div className="flex flex-row mx-4 mt-4 gap-4">
      <div className="items-center border border-gray-400 flex flex-col gap-2 rounded-2xl p-4 max-w-[400px] min-w-[400px]">
        <div className='flex flex-row w-full justify-between px-2'>
          <span className='text-xl font-light text-gray-800'>Notifications:</span>
          <button 
            className="flex flex-row gap-2 border border-gray-300 items-center enabled:hover:bg-gray-100 rounded-xl py-1 px-3 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-600"
            disabled={creatingNotification}
            onClick={() => {
              if(!creatingNotification) {
                setSelectedNotification(undefined)
                setCreatingNotification(true)
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
          selectedNotification={selectedNotification}
          parentUpdateSelectedNotification={setSelectedNotification}
          parentUpdateCreatingNotification={setCreatingNotification}
        />
      </div>
      <div className="border-gray-400 border rounded-2xl p-4 flex flex-col w-full h-auto">
        {creatingNotification ? (
          <CreateNotificationPanel 
            notification={undefined}
            parentUpdateNotification={setSelectedNotification}
            parentUpdateNotifications={setNotifications}
            parentUpdateCreating={setCreatingNotification}
            parentUpdateParticipants={setParticipants}
            parentUpdateTags={setUserTags}
            participants={participants}
            tags={userTags}
          />
        ) : (
          selectedNotification ? (
            <CreateNotificationPanel 
              notification={selectedNotification}
              parentUpdateNotification={setSelectedNotification}
              parentUpdateNotifications={setNotifications}
              parentUpdateCreating={setCreatingNotification}
              parentUpdateParticipants={setParticipants}
              parentUpdateTags={setUserTags}
              participants={participants}
              tags={userTags}
            />
          ) : (
            <div className='flex flex-row items-center justify-center w-full'>
              <span className='font-thin italic text-xl'>Create or open an existing notification to view here.</span>
            </div>
          )
        )}
      </div>
    </div>
  )
}
