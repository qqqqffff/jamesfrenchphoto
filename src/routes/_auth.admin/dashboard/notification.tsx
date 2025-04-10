import { createFileRoute } from '@tanstack/react-router'
import { getAllNotificationsQueryOptions } from '../../../services/notificationService'
import { useEffect, useState } from 'react'
import { CreateNotificationPanel } from '../../../components/admin/notification/CreateNotificationPanel'
import { Notification } from '../../../types'
import { useQuery } from '@tanstack/react-query'
import { getAllParticipantsQueryOptions, getAllUserTagsQueryOptions } from '../../../services/userService'
import { formatTime } from '../../../utils'

export const Route = createFileRoute('/_auth/admin/dashboard/notification')({
  component: RouteComponent,
  loader: async ({ context }) => {
    const notifications = await context.queryClient.ensureQueryData(getAllNotificationsQueryOptions())

    return {
      notifications: notifications
    }
  }
})

function RouteComponent() {
  const data = Route.useLoaderData()

  const [creatingNotification, setCreatingNotification] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [selectedNotification, setSelectedNotification] = useState<Notification>()

  useEffect(() => {
    if(data.notifications.some((pNoti) => !notifications.some((noti) => pNoti.id === noti.id))) {
      setNotifications(data.notifications)
    }
  }, [data.notifications])

  const participants = useQuery(getAllParticipantsQueryOptions({ siNotifications: true, siTags: true }))
  const userTags = useQuery(getAllUserTagsQueryOptions({ siCollections: false, siTimeslots: false, siNotifications: true }))

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
        {notifications
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .map((notification, index) => {
            const selected = notification.id === selectedNotification?.id
          
            return (
              <button
                key={index}
                className={`
                  flex flex-row justify-between px-4 py-2 border border-gray-400
                  hover:border-gray-700 ${selected ? 'bg-gray-200 hover:bg-gray-100' : 'hover:bg-gray-200'}
                  rounded-lg w-full font-thin
                `}
                onClick={() => {
                  setSelectedNotification(selected ? undefined : notification)
                  setCreatingNotification(false)
                }}
              >
                <span className='max-w-[60%] text-ellipsis'>{notification.content}</span>
                <span>{formatTime(new Date(notification.updatedAt), { timeString: false })}</span>
              </button>
            )
          })
        }
      </div>
      <div className="border-gray-400 border rounded-2xl p-4 flex flex-col w-full h-auto">
        {creatingNotification ? (
          <CreateNotificationPanel 
            parentUpdateNotification={setSelectedNotification}
            parentUpdateNotifications={setNotifications}
            parentUpdateCreating={setCreatingNotification}
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
