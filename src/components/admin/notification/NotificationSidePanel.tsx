import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { Notification, UserTag } from "../../../types"
import { HiOutlineChevronDown, HiOutlineChevronLeft, HiOutlineClock } from "react-icons/hi2"
import { currentDate, DAY_OFFSET, formatTime, textInputTheme } from "../../../utils"
import { TextInput, Tooltip } from "flowbite-react"
import { FcClock, FcExpired } from "react-icons/fc";
import Loading from "../../common/Loading"
import { useNavigate } from "@tanstack/react-router"

interface NotificationSidePanelProps {
  tagsLoading: boolean,
  notifications: Notification[],
  userTags: UserTag[],
  selectedNotification?: Notification
  parentUpdateSelectedNotification: Dispatch<SetStateAction<Notification | undefined>>
}

export const NotificationSidePanel = (props: NotificationSidePanelProps) => {
  const [filter, setFilter] = useState('')
  const [openedTags, setOpenedTags] = useState<UserTag[]>([])
  const navigate = useNavigate()

  const notificationMap: Record<string, Notification> = Object.fromEntries(
    props.notifications.map((notification) => [notification.id, notification])
  )

  useEffect(() => {
    const foundNotification = props.userTags.find((tag) => tag.notifications?.some((notification) => notification.id === props.selectedNotification?.id))
    if(!openedTags.some((tag) => tag.notifications?.some((notification) => notification.id === props.selectedNotification?.id)) && foundNotification) {
      setOpenedTags([...openedTags, foundNotification])
    }
  }, [props.selectedNotification])

  return (
    <>
      <TextInput 
        theme={textInputTheme} 
        sizing="sm" 
        className="w-full place-self-center mb-2" 
        placeholder="Search Notifications or Tags"
        onChange={(event) => {
          setFilter(event.target.value)
        }}
        value={filter}
      />
      {props.tagsLoading ? (
        <span className="flex flex-row text-start gap-1 italic font-light ms-4 w-full">
          <span>Loading</span>
          <Loading />
        </span>
      ) : (
      props.userTags
        .filter((tag) => ((
          tag.name.toLowerCase().trim().includes(filter.toLowerCase().trim()) ||
          tag.notifications?.some((notification) => notification.content.toLowerCase().trim().includes(filter.toLowerCase().trim()))
        ) && (tag.notifications ?? []).length > 0))
        .map((tag, i) => {
          const selected = openedTags.some((sTag) => sTag.id === tag.id) || filter !== ''
          return (
            <div className="flex flex-col w-full gap-2" key={i}>
              <div className="flex flex-row items-center w-full">
                <button 
                  className={`
                    flex flex-row gap-2 justify-between items-center w-full px-2 py-1 border 
                    border-transparent rounded-lg hover:text-gray-500 hover:border-gray-200
                  `}
                  onClick={() => {
                    if(selected) {
                      setOpenedTags(openedTags.filter((sTag) => sTag.id !== tag.id))
                    }
                    else {
                      setOpenedTags([...openedTags, tag])
                    }
                  }}
                >
                  <div className="flex flex-row items-center text-lg font-light gap-2">
                    <span className={`text-${tag.color ?? 'black'}`}>{tag.name}</span>
                  </div>
                  {selected ? (
                    <HiOutlineChevronDown size={20} />
                  ) : (
                    <HiOutlineChevronLeft size={20} />
                  )}
                </button>
              </div>
              {selected && (
                (tag.notifications ?? [])
                  .filter((notification) => notification.content.toLowerCase().trim().includes(filter.toLowerCase().trim()))
                  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                  .map((noti, j) => {
                    const notification = notificationMap[noti.id]
                    if(notification === undefined) return undefined
                    const notificationSelected = notification.id === props.selectedNotification?.id

                    const notificationState: 'expired' | 'not-expired' | 'no-expiration' = (() => {
                      if(notification.expiration) {
                        const expirationDate = new Date(notification.expiration)
                        if(!isNaN(expirationDate.getTime())) {
                          if(currentDate.getTime() < expirationDate.getTime()) {
                            return 'not-expired'
                          }
                          else {
                            return 'expired'
                          }
                        }
                        return 'no-expiration'
                      }
                      else {
                        return 'no-expiration'
                      }
                    })()

                    return (
                      <button
                        key={j}
                        className={`
                          flex flex-row justify-between px-4 py-2 border border-gray-400
                          hover:border-gray-700 ${notificationSelected ? 'bg-gray-200 hover:bg-gray-100' : 'hover:bg-gray-200'}
                          rounded-lg w-full font-thin
                        `}
                        onClick={() => {
                          props.parentUpdateSelectedNotification(notificationSelected ? undefined : notification)
                          if(!notificationSelected) {
                            navigate({ to: '.', search: { notificationId: notification.id }})
                          }
                          else {
                            navigate({ to: '.', search: { notificationId: '' }})
                          }
                        }}
                      >
                        <span className='max-w-[60%] overflow-hidden whitespace-nowrap text-ellipsis'>{notification.content}</span>
                        <div className="flex flex-row gap-2 items-center">
                          <span>{formatTime(new Date(notification.updatedAt), { timeString: false })}</span>
                          <Tooltip
                            style="light"
                            placement="bottom"
                            content={(
                              <div>
                                {notificationState === 'expired' ? (
                                  `Expired ${formatTime(new Date(new Date(notification.expiration!).getTime() + DAY_OFFSET), { timeString: false })}`
                                ) : (
                                notificationState === 'not-expired' ? (
                                  `Expires ${formatTime(new Date(new Date(notification.expiration!).getTime() + DAY_OFFSET), { timeString: false })}`
                                ) : (
                                  'No Expiration'
                                ))}
                              </div>
                            )}
                          >
                            {notificationState === 'expired' ? (
                              <FcExpired size={20} />
                            ) : (
                            notificationState === 'not-expired' ? (
                              <FcClock size={20} />
                            ) : (
                              <HiOutlineClock className="text-gray-500" size={20}/>
                            ))}
                          </Tooltip>
                        </div>
                        
                      </button>
                    )
                  })
                  .filter((notificaiton) => notificaiton !== undefined)
                )
              }
            </div>
          )
        })
      )}
    </>
  )
}