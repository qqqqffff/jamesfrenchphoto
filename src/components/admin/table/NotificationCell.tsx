import { ComponentProps, Dispatch, SetStateAction, useEffect, useState } from "react";
import { CreateNotificationParams, NotificationService, SendUserEmailNotificationParams, UpdateNotificationParams } from "../../../services/notificationService";
import { Notification, Participant, UserData, UserProfile } from "../../../types";
import { useMutation, UseQueryResult } from "@tanstack/react-query";
import { v4 } from "uuid";
import { formatParticipantName } from "../../../functions/clientFunctions";
import { HiOutlineMinus, HiOutlineXMark } from "react-icons/hi2";
import { Alert, ToggleSwitch } from "flowbite-react";

interface NotificationCellProps extends ComponentProps<'td'> {
  value: string,
  NotificationService: NotificationService,
  notifications: Notification[]
  setNotifications: Dispatch<SetStateAction<Notification[]>>
  updateValue: (text: string) => void
  linkedParticipantId?: string
  userData: {
    users: UserProfile[],
    tempUsers: UserProfile[]
  },
  usersQuery: UseQueryResult<UserData[] | undefined, Error>
  tempUsersQuery: UseQueryResult<UserProfile[] | undefined, Error>,
  notificationQuery: UseQueryResult<Notification[] | undefined, Error>,
}

export const NotificationCell = (props: NotificationCellProps) => {
  const [value, setValue] = useState('')
  const [notification, setNotification] = useState<Notification>({
    id: v4(),
    content: '',
    participants: [],
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  const [isFocused, setIsFocused] = useState(false)
  const [foundParticipant, setFoundParticipant] = useState<{ user: UserProfile & { temp: boolean }, participant: Participant } | undefined>()
  const [sendEmailNotificationResult, setSendEmailNotificationResult] = useState<{ success: boolean, message: string, timeout: NodeJS.Timeout } | null>(null)
  const [actionWindowInteraction, setActionWindowInteraction] = useState(false)
  const [search, setSearch] = useState('')
  const [searchHidden, setSearchHidden] = useState(true)

  useEffect(() => {
    if(props.value !== notification?.id) {
      //try to find notification first
      const notification: Notification = props.notifications.find((notification) => notification.id === props.value) ?? 
      {
        id: v4(),
        content: '',
        participants: [],
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      setNotification(notification)
      setValue(notification.id)
      props.setNotifications((prev) => !prev.some((n) => n.id === notification.id) ? [...prev, notification] : prev)
    }
  }, [
    props.value,
    props.notificationQuery.isFetching
  ])

  useEffect(() => {
    if(props.linkedParticipantId) {
      const participant = (() => {
        if(!props.linkedParticipantId) return undefined
        let user: UserProfile | undefined
        let participant = props.userData.users
          .flatMap((user) => user.participant)
          .find((participant) => participant.id === props.linkedParticipantId)

        if(!participant) {
          participant = props.userData.tempUsers  
            .flatMap((user) => user.participant)
            .find((participant) => participant.id === props.linkedParticipantId)

          if(participant) {
            user = props.userData.tempUsers.find((profile) => profile.email === participant?.userEmail)!
            return ({
              participant: participant,
              user: {...user, temp: true}
            })
          }
        }
        else {
          user = props.userData.users.find((profile) => profile.email === participant?.userEmail)!
          return ({
            participant: participant,
            user: {...user, temp: false}
          })
        }
        return undefined
      })()

      setFoundParticipant(participant)
      setNotification(prev => {
        if(participant) {
          if(!prev.participants.some((p) => p.id === participant.participant.id)) {
            return {
              ...prev,
              participants: [...prev.participants, participant.participant]
            }
          }
        }
        return prev
      })
      props.setNotifications((prev) => prev.map((n) => n.id === value && participant ? {
        ...n,
        participants: [...n.participants, participant.participant]
      } : n))
    }
    else {
      setFoundParticipant(undefined)
    }
  }, [
    props.linkedParticipantId,
    props.tempUsersQuery.isFetching,
    props.usersQuery.isFetching
  ])

  const sendNotification = useMutation({
    mutationFn: (params: SendUserEmailNotificationParams) => props.NotificationService.sendUserEmailNotificationMutation(params),
  })

  const createNotification = useMutation({
    mutationFn: (params: CreateNotificationParams) => props.NotificationService.createNotificationMutation(params)
  })

  const updateNotification = useMutation({
    mutationFn: (params: UpdateNotificationParams) => props.NotificationService.updateNotificationMutation(params)
  })

  return (
    <td className={`
      text-ellipsis border py-3 px-3 max-w-[150px]
      ${foundParticipant !== undefined ? 'bg-yellow-50 bg-opacity-40' : ''}
    `}>
      <input 
        placeholder="Note..."
        className={`
          font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400
          bg-transparent border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic
          hover:cursor-pointer
        `}
        value={notification.content}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          if(foundParticipant && !actionWindowInteraction && notification.content !== '') {
            const foundNotification = props.notifications.find((noti) => notification.id === noti.id)
            if(foundNotification !== undefined) {
              const updatedNotification: Notification = {
                ...foundNotification,
                content: notification.content,
                location: notification.location,
                participants: [
                  ...foundNotification.participants.filter((participant) => participant.id !== foundParticipant.participant.id), 
                  foundParticipant.participant
                ],
              }
              updateNotification.mutateAsync({
                notification: foundNotification,
                content: updatedNotification.content,
                location: updatedNotification.location,
                participantIds: updatedNotification.participants.map((participant) => participant.id),
                tagIds: updatedNotification.tags.map((tag) => tag.id),
                options: {
                  logging: true
                }
              }).then(() => {
                props.setNotifications(prev => prev.map((noti) => noti.id === updatedNotification.id ? updatedNotification : noti))
              })
            }
            else {
              createNotification.mutateAsync({
                notification: notification,
                options: {
                  logging: true
                }
              }).then(() => {
                props.setNotifications(prev => [...prev, notification])
              })
            }
          }
          
          setIsFocused(actionWindowInteraction ? true : false)
          setActionWindowInteraction(false)
        }}
        onChange={(event) => {
          setNotification({
            ...notification,
            content: event.target.value
          })
        }}
        onKeyDown={(event) => {
          setActionWindowInteraction(false)
          const foundNotification = props.notifications.find((noti) => notification.id === noti.id)
          if(event.code === 'Escape' && foundNotification) {
            setNotification({
              ...notification,
              content: foundNotification.content
            })
            setTimeout(() => event.currentTarget.blur(), 1)
          }
          else if(event.code === 'Enter') {
            setTimeout(() => event.currentTarget.blur(), 1)
          }
        }}
      />
      {isFocused && foundParticipant !== undefined && (
        <div 
          className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col min-w-[200px]"
          onMouseDown={() => setActionWindowInteraction(true)}
        >
          {sendEmailNotificationResult !== null && (
            <div className="absolute z-20 top-0 w-full mt-2">
              <Alert 
                color={sendEmailNotificationResult.success ? 'green' : 'red'} 
                onDismiss={() => {
                  if(sendEmailNotificationResult.timeout) {
                    clearTimeout(sendEmailNotificationResult.timeout)
                  }
                  setSendEmailNotificationResult(null)
                }}
              >{sendEmailNotificationResult.message}</Alert>
            </div>
          )}
          <div className="italic text-gray-600 w-full whitespace-nowrap border-b py-1 px-2 text-base self-center flex flex-row justify-between">
            <span>Linked with: {formatParticipantName(foundParticipant.participant)}</span>
            <div className="flex flex-row gap-1 items-center">
              <button 
                className=""
                onClick={() => {
                  setIsFocused(false)
                }}
              >
                <HiOutlineXMark size={16} className="text-gray-400 hover:text-gray-800"/>
              </button>
            </div>
          </div>
          <div className="border rounded-lg flex flex-col p-2 gap-2 items-center max-h-[250px] overflow-auto">
            <div className="flex flex-row w-full justify-between">
              <div />
              <input 
                placeholder="Search for notification"
                className=""
                onFocus={() => {
                  setSearchHidden(false)
                  setActionWindowInteraction(true)
                }}
                onChange={(event)  => setSearch(event.target.value)}
                value={search}
              />
              <button
                onClick={() => {
                  setSearchHidden(true)
                  setActionWindowInteraction(true)
                }}
              ><HiOutlineMinus size={12}/></button>
            </div>
            {!searchHidden && (
              props.notifications
              .filter((n) => n.content.trim().toLowerCase().includes(search.trim().toLowerCase()) && n.id !== notification.id)
              .map((n) => (
                <button 
                  className="border-b px-2 py-1 hover:bg-gray-100 w-full text-left"
                  onClick={() => {
                    //TODO: update the notifications here
                    //update once for the previous then once for the new one
                    props.setNotifications(prev => prev.map((parentNotification) => parentNotification.id === props.value ? ({
                      ...parentNotification,
                      participants: parentNotification.participants.filter((participant) => participant.id !== foundParticipant.participant.id)
                    }) : n.id === parentNotification.id ? ({
                      ...parentNotification,
                      participants: [...parentNotification.participants, foundParticipant.participant]
                    }) : parentNotification))
                    setNotification(n)
                    setValue(n.id)
                    props.updateValue(n.id)
                    setActionWindowInteraction(true)
                  }}
                >
                  {n.content}
                </button>
              ))
            )}
          </div>
          <div className="w-full px-2 py-2 flex flex-row justify-center">
            <ToggleSwitch 
              checked={notification.location !== undefined} 
              onChange={() => {
                //TODO: handle updating notification's details here
                setActionWindowInteraction(true)
                setNotification({
                  ...notification,
                  location: notification.location === undefined ? 'dashboard' : undefined
                })
              }}
              label="Display on Dashboard"
            />
          </div>
          <div className="flex flex-col gap-4 justify-center items-center">
            <button
              className="py-1.5 px-4 self-end hover:bg-gray-100 cursor-pointer"
              onClick={() => {
                const newNotification: Notification = {
                  id: v4(),
                  content: '',
                  participants: [foundParticipant.participant],
                  tags: [],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
                setActionWindowInteraction(true)
                props.updateValue(newNotification.id)
              }}
            >
              <span>New Notificaiton</span>
            </button>
            <button
              disabled={sendNotification.isPending || notification.content === ''}
              className="py-1.5 px-4 self-end enabled:hover:bg-gray-100 enabled:cursor-pointer disabled:hover:cursor-wait disabled:opacity-60" 
              onClick={() => {
                setActionWindowInteraction(true)
                sendNotification.mutateAsync({
                  content: notification.content,
                  email: foundParticipant.user.email,
                  options: {
                    logging: true
                  }
                })
                .then((data) => {
                  if(sendEmailNotificationResult?.timeout) {
                    clearTimeout(sendEmailNotificationResult.timeout)
                  }

                  if(data.status === 'success') {
                    setSendEmailNotificationResult({
                      success: true,
                      message: data.message,
                      timeout: setTimeout(() => {
                        setSendEmailNotificationResult(null)
                      }, 5 * 1000)
                    })
                  }
                  else {
                    setSendEmailNotificationResult({
                      success: false,
                      message: data.message,
                      timeout: setTimeout(() => {
                        setSendEmailNotificationResult(null)
                      }, 5 * 1000)
                    })
                  }
                })
                .catch((error) => {
                  if(sendEmailNotificationResult?.timeout) {
                    clearTimeout(sendEmailNotificationResult.timeout)
                  }
                  console.error(error)
                  setSendEmailNotificationResult({
                    success: false,
                    message: 'Failed to send email.',
                    timeout: setTimeout(() => {
                      setSendEmailNotificationResult(null)
                    }, 5 * 1000)
                  })
                })
              }}
            >
              <span>Send Email</span>
            </button>
          </div>
        </div>
      )}
    </td>
  )
}