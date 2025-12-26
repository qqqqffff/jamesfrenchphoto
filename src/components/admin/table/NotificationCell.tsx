import { ComponentProps, Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { CreateNotificationParams, NotificationService, SendUserEmailNotificationParams, UpdateNotificationParams } from "../../../services/notificationService";
import { Notification, Participant, UserData, UserProfile } from "../../../types";
import { useMutation, UseQueryResult } from "@tanstack/react-query";
import { v4 } from "uuid";
import { formatParticipantName } from "../../../functions/clientFunctions";
import { HiOutlineMinus, HiOutlinePlus, HiOutlineXMark } from "react-icons/hi2";
import { Alert, ToggleSwitch } from "flowbite-react";
import { TablePanelNotification } from "./TablePanel";
import validator from 'validator'

interface NotificationCellProps extends ComponentProps<'td'> {
  value: string,
  rowIndex: number,
  NotificationService: NotificationService,
  notifications: Notification[]
  setNotifications: Dispatch<SetStateAction<Notification[]>>
  setTableNotification: Dispatch<SetStateAction<TablePanelNotification[]>>
  updateValue: (text: string) => void
  linkedParticipantId?: string
  userData: {
    users: UserProfile[],
    tempUsers: UserProfile[]
  },
  usersQuery: UseQueryResult<UserData[] | undefined, Error>
  tempUsersQuery: UseQueryResult<UserProfile[] | undefined, Error>,
  notificationQuery: UseQueryResult<Notification[] | undefined, Error>,
  search: string
}

export const NotificationCell = (props: NotificationCellProps) => {
  const [notification, setNotification] = useState<Notification>({
    id: v4(),
    content: '',
    participants: [],
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  const [isFocused, setIsFocused] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [foundParticipant, setFoundParticipant] = useState<{ user: UserProfile & { temp: boolean }, participant: Participant } | undefined>()
  const [sendEmailNotificationResult, setSendEmailNotificationResult] = useState<{ success: boolean, message: string, timeout: NodeJS.Timeout } | null>(null)
  const [actionWindowInteraction, setActionWindowInteraction] = useState(false)
  const [search, setSearch] = useState('')
  const [searchHidden, setSearchHidden] = useState(true)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [emailCooldown, setEmailCooldown] = useState<{
    cooldown: NodeJS.Timeout
    remaining: number
  } | null>(null)

  //TODO: combine use effects
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

  const cellColoring = props.rowIndex % 2 ? foundParticipant ? 'bg-yellow-200 bg-opacity-40' : 'bg-gray-200 bg-opacity-40' : foundParticipant ? 'bg-yellow-100 bg-opacity-20' : ''
  const filteredNotifications = props.notifications
    .filter((n) => n.content.trim().toLowerCase().includes(search.trim().toLowerCase()) && n.id !== notification.id && n.content !== '')

  const selectedNotification = props.notifications.find((parentNotification) => 
    parentNotification.id === notification.id && 
    parentNotification.participants.some((participant) => foundParticipant?.participant.id === participant.id)
  )

  const selectedSearch = props.search !== '' && props.notifications.some((parentNotification) => 
    parentNotification.id === notification.id && 
    parentNotification.content.toLowerCase().includes(props.search.toLowerCase())
  )

  return (
    <td className={`
      text-ellipsis border py-3 px-3 max-w-[150px]
      ${selectedSearch ? 'outline outline-green-400' : ''}
      ${cellColoring}
    `}>
      <input 
        placeholder="Note..."
        className={`
          font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400
          bg-transparent border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic
          hover:cursor-text
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
                const notificationId = v4()
                props.setNotifications(prev => prev.map((noti) => noti.id === updatedNotification.id ? updatedNotification : noti))
                props.setTableNotification(prev => [...prev, {
                  id: notificationId,
                  message: `Successfully created new notification for: ${formatParticipantName(foundParticipant.participant)}`,
                  status: 'Success' as 'Success',
                  createdAt: new Date(),
                  autoClose: setTimeout(() => props.setTableNotification(prev => prev.filter((notification) => notification.id === notificationId)), 5 * 1000)
                }])
              }).catch(() => {
                props.setTableNotification(prev => [...prev, {
                  id: v4(),
                  message: `Failed to create notification for: ${formatParticipantName(foundParticipant.participant)}`,
                  status: 'Error' as 'Error',
                  createdAt: new Date(),
                  autoClose: null
                }])
              })
            }
            else {
              createNotification.mutateAsync({
                notification: notification,
                options: {
                  logging: true
                }
              }).then(() => {
                const notificationId = v4()
                props.setNotifications(prev => [...prev, notification])
                props.setTableNotification(prev => [...prev, {
                  id: notificationId,
                  message: `Successfully created new notification for: ${formatParticipantName(foundParticipant.participant)}`,
                  status: 'Success' as 'Success',
                  createdAt: new Date(),
                  autoClose: setTimeout(() => props.setTableNotification(prev => prev.filter((notification) => notification.id === notificationId)), 5 * 1000)
                }])
              }).catch(() => {
                props.setTableNotification(prev => [...prev, {
                  id: v4(),
                  message: `Failed to create notification for: ${formatParticipantName(foundParticipant.participant)}`,
                  status: 'Error' as 'Error',
                  createdAt: new Date(),
                  autoClose: null
                }])
              })
            }
          }
          //remove participant from the notification
          else if(foundParticipant && !actionWindowInteraction && selectedNotification !== undefined && notification.content === '') {
            updateNotification.mutateAsync({
              notification: selectedNotification,
              content: selectedNotification.content,
              location: selectedNotification.location,
              participantIds: selectedNotification.participants
                .filter((participant) => participant.id !== foundParticipant.participant.id)
                .map((participant) => participant.id),
              tagIds: selectedNotification.tags.map((tag) => tag.id),
              options: {
                logging: true
              }
            }).catch(() => {
              props.setTableNotification(prev => [...prev, {
                id: v4(),
                message: `Failed to remove notification from: ${formatParticipantName(foundParticipant.participant)}`,
                status: 'Error' as 'Error',
                createdAt: new Date(),
                autoClose: null
              }])
            })
          }
          
          setIsFocused(actionWindowInteraction ? true : false)
          setActionWindowInteraction(false)
        }}
        onChange={(event) => {
          setActionWindowInteraction(false)
          setNotification({
            ...notification,
            content: event.target.value
          })
        }}
        onKeyDown={(event) => {
          setActionWindowInteraction(false)
          const foundNotification = props.notifications.find((noti) => notification.id === noti.id)
          if(event.code === 'Escape') {
            setNotification({
              ...notification,
              content: foundNotification ? foundNotification.content : ''
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
          onMouseDown={() => {
            setActionWindowInteraction(true)
          }}
          ref={containerRef}
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
          <div className="italic text-gray-600 w-full whitespace-nowrap border-b py-1 px-2 text-base self-center flex flex-row justify-between gap-2">
            <span className="max-w-[250px] truncate">Linked with: {formatParticipantName(foundParticipant.participant)}</span>
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
          <div className="border rounded-lg flex flex-col p-2 gap-2 items-center max-h-[250px] overflow-auto mt-1 mx-2">
            <div className="flex flex-row w-full justify-between gap-4">
              <input 
                placeholder="Search for notification"
                className="border-b focus:outline-none ps-1.5 pb-0.5 placeholder:italic placeholder:text-gray-400 w-full"
                onFocus={() => setSearchHidden(false)}
                onChange={(event)  => setSearch(event.target.value)}
                value={search}
              />
              <button
                className="focus:outline-none"
                onClick={() => setSearchHidden(!searchHidden)}
              >{searchHidden ? (
                <HiOutlinePlus size={12} />
              ) : (
                <HiOutlineMinus size={12}/>
              )}</button>
            </div>
            {!searchHidden && selectedNotification !== undefined && (
              <button
                className={`
                  border-y px-2 py-1 hover:bg-gray-100 w-full text-left 
                  ${hoveredItem === selectedNotification.id ? '' : 'truncate'}
                `}
                onMouseEnter={() => setHoveredItem(selectedNotification.id)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  maxWidth: containerRef.current ? containerRef.current.clientWidth - 36 : '184px',
                  minWidth: containerRef.current ? containerRef.current.clientWidth - 36 : '184px'
                }}
                onClick={() => {
                  const updatedNotification: Notification = {
                    ...selectedNotification,
                    participants: selectedNotification.participants.filter((participant) => participant.id !== foundParticipant.participant.id)
                  }
                  const newNotification: Notification = {
                    id: v4(),
                    content: '',
                    participants: [foundParticipant.participant],
                    tags: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }
                  props.setNotifications(prev => prev.map((parentNotification) => parentNotification.id === selectedNotification.id ? (
                    updatedNotification
                  ) : (
                    parentNotification
                  )))
                  setNotification(newNotification)
                  props.updateValue('')
                  updateNotification.mutateAsync({
                    notification: selectedNotification,
                    content: selectedNotification.content,
                    location: selectedNotification.location,
                    participantIds: selectedNotification.participants
                      .filter((participant) => participant.id !== foundParticipant.participant.id)
                      .map((participant) => participant.id),
                    tagIds: selectedNotification.tags.map((tag) => tag.id),
                    options: {
                      logging: true
                    }
                  }).catch(() => {
                    props.setTableNotification(prev => [...prev, {
                      id: v4(),
                      message: `Failed to remove notification from: ${formatParticipantName(foundParticipant.participant)}`,
                      status: 'Error' as 'Error',
                      createdAt: new Date(),
                      autoClose: null
                    }])
                  })
                }}
              >
                {hoveredItem ? (
                  <div className="flex flex-col gap-1">
                    <span className="border-b">{selectedNotification.content}</span>
                    <span className="font-medium">Created: {new Date(selectedNotification.createdAt).toLocaleDateString('en-us', { timeZone: 'America/Chicago' })}</span>
                  </div>
                  
                ) : (
                  <span>{selectedNotification.content}</span>
                )}
              </button>
            )}
            {!searchHidden && (
              filteredNotifications.length > 0 ? (
                filteredNotifications
                .map((n, index) => {
                  return (
                    <button 
                      key={index}
                      onMouseEnter={(event) => setHoveredItem(event.currentTarget.disabled ? null : n.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                      disabled={updateNotification.isPending}
                      className={`
                        ${index === 0 ? 'border-y' : 'border-b'}
                        px-2 py-1 enabled:hover:bg-gray-100 w-full text-left
                        disabled:opacity-60 disabled:cursor-not-allowed
                        ${hoveredItem === n.id ? '' : 'truncate'}
                      `}
                      style={{
                        maxWidth: containerRef.current ? containerRef.current.clientWidth - 36 : '184px',
                        minWidth: containerRef.current ? containerRef.current.clientWidth - 36 : '184px'
                      }}
                      onClick={() => {
                        const foundNotification = props.notifications.find((parentNotification) => parentNotification.id === n.id)
                        if(!foundNotification) return

                        //if found notification is equal to the parents push the participant
                        props.setNotifications(prev => prev.map((parentNotification) => foundNotification.id === parentNotification.id ? ({
                          ...parentNotification,
                          participants: [...parentNotification.participants, foundParticipant.participant]
                        //if there is a previously selected notification, remove the participant from it
                        }) : (
                          selectedNotification?.id === parentNotification.id ? ({
                            ...parentNotification,
                            participants: parentNotification.participants.filter((participant) => participant.id !== foundParticipant.participant.id)
                          }) : (
                            parentNotification
                          ))
                        ))
                        setNotification(n)
                        props.updateValue(n.id)
                        setHoveredItem(null)
                        updateNotification.mutateAsync({
                          notification: foundNotification,
                          participantIds: [...foundNotification.participants.map((participant) => participant.id), foundParticipant.participant.id],
                          tagIds: foundNotification.tags.map((tag) => tag.id),
                          content: foundNotification.content,
                          location: foundNotification.location,
                          options: {
                            logging: true
                          }
                        }).then(() => {
                          const notificationId = v4()
                          props.setTableNotification(prev => [...prev, {
                            id: notificationId,
                            message: `Successfully created new notification for: ${formatParticipantName(foundParticipant.participant)}`,
                            status: 'Success' as 'Success',
                            createdAt: new Date(),
                            autoClose: setTimeout(() => props.setTableNotification(prev => prev.filter((notification) => notification.id === notificationId)), 5 * 1000)
                          }])
                        }).catch(() => {
                          props.setTableNotification(prev => [...prev, {
                            id: v4(),
                            message: `Failed to create notification for: ${formatParticipantName(foundParticipant.participant)}`,
                            status: 'Error' as 'Error',
                            createdAt: new Date(),
                            autoClose: null
                          }])
                        })
                        if(selectedNotification !== undefined) {
                          updateNotification.mutateAsync({
                            notification: selectedNotification,
                            content: selectedNotification.content,
                            location: selectedNotification.location,
                            participantIds: selectedNotification.participants
                              .filter((participant) => participant.id !== foundParticipant.participant.id)
                              .map((participant) => participant.id),
                            tagIds: selectedNotification.tags.map((tag) => tag.id),
                            options: {
                              logging: true
                            }
                          }).catch(() => {
                            props.setTableNotification(prev => [...prev, {
                              id: v4(),
                              message: `Failed to remove notification from: ${formatParticipantName(foundParticipant.participant)}`,
                              status: 'Error' as 'Error',
                              createdAt: new Date(),
                              autoClose: null
                            }])
                          })
                        }
                      }}
                    >
                      {hoveredItem ? (
                        <div className="flex flex-col gap-1">
                          <span className="border-b">{n.content}</span>
                          <span className="font-medium">Created: {new Date(n.createdAt).toLocaleDateString('en-us', { timeZone: 'America/Chicago' })}</span>
                        </div>
                        
                      ) : (
                        <span>{n.content}</span>
                      )}
                    </button>
                  )
                })
              ) : (
                <span className="">No Notifications found.</span>
              )
            )}
          </div>
          <button 
            className="mt-2 px-2 py-1 flex flex-row justify-center gap-3 border rounded-lg mx-2 enabled:hover:border-gray-600 disabled:opacity-60"
            disabled={updateNotification.isPending}
            onClick={(event) => {
              event.stopPropagation()
              const foundNotification = props.notifications.find((parentNotification) => parentNotification.id === notification.id)
              setNotification({
                ...notification,
                location: notification.location === undefined ? 'dashboard' : undefined
              })
              props.setNotifications(prev => foundNotification !== undefined ? prev.map((parentNotification) => parentNotification.id === notification.id ? ({
                ...parentNotification,
                location: parentNotification.location === undefined ? 'dashboard' : undefined
              }) : parentNotification) : prev)
              if(foundNotification !== undefined) {
                updateNotification.mutateAsync({
                  notification: foundNotification,
                  content: foundNotification.content,
                  location: foundNotification.location === undefined ? 'dashboard' : undefined,
                  participantIds: foundNotification.participants.map((participant) => participant.id),
                  tagIds: foundNotification.tags.map((tag) => tag.id),
                  options: {
                    logging: true
                  }
                }).then(() => {
                  const notificationId = v4()
                  props.setTableNotification(prev => [...prev, {
                    id: notificationId,
                    message: `Successfully posted on dashboard for: ${formatParticipantName(foundParticipant.participant)}`,
                    status: 'Success' as 'Success',
                    createdAt: new Date(),
                    autoClose: setTimeout(() => props.setTableNotification(prev => prev.filter((notification) => notification.id === notificationId)), 5 * 1000)
                  }])
                }).catch(() => {
                  props.setTableNotification(prev => [...prev, {
                    id: v4(),
                    message: `Failed to post on dashboard for: ${formatParticipantName(foundParticipant.participant)}`,
                    status: 'Error' as 'Error',
                    createdAt: new Date(),
                    autoClose: null
                  }])
                })
              }
              
            }}
          >
            <ToggleSwitch 
              sizing="sm"
              checked={notification.location !== undefined} 
              onChange={() => {}}
            />
            <span>Display on Dashboard</span>
          </button>
          <div className="flex flex-row gap-4 justify-center items-center px-2 py-2">
            <button
              className="
                py-1.5 px-4 enabled:hover:bg-gray-100 
                enabled:cursor-pointer disabled:hover:cursor-not-allowed
                disabled:opacity-60
                border rounded-lg whitespace-nowrap text-xs
              "
              disabled={!props.notifications.some((parentNotification) => notification.id === parentNotification.id) || updateNotification.isPending}
              onClick={() => {
                const updatedNotification: Notification | undefined = selectedNotification ? {
                  ...selectedNotification,
                  participants: selectedNotification.participants.filter((participant) => participant.id !== foundParticipant.participant.id)
                } : undefined
                const newNotification: Notification = {
                  id: v4(),
                  content: '',
                  participants: [foundParticipant.participant],
                  tags: [],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
                setNotification(newNotification)
                props.updateValue('')
                props.setNotifications(prev => updatedNotification !== undefined ? prev.map((notification) => notification.id === updatedNotification.id ? 
                    updatedNotification 
                  : 
                    notification
                ) : (
                  prev
                ))
                if(updatedNotification !== undefined && selectedNotification !== undefined) {
                  updateNotification.mutateAsync({
                    notification: selectedNotification,
                    participantIds: updatedNotification.participants.map((participant) => participant.id),
                    tagIds: updatedNotification.tags.map((tag) => tag.id),
                    content: updatedNotification.content,
                    location: updatedNotification.location,
                    options: {
                      logging: true
                    }
                  }).catch(() => {
                    props.setTableNotification(prev => [...prev, {
                      id: v4(),
                      message: `Failed to remove notification from: ${formatParticipantName(foundParticipant.participant)}`,
                      status: 'Error' as 'Error',
                      createdAt: new Date(),
                      autoClose: null
                    }])
                  })
                }
              }}
            >
              <span>New Notificaiton</span>
            </button>
            <button
              disabled={
                sendNotification.isPending || 
                notification.content === '' || 
                emailCooldown !== null || 
                !validator.isEmail(foundParticipant.user.email)
              }
              className={`
                py-1.5 px-4 enabled:hover:bg-gray-100 
                enabled:cursor-pointer disabled:opacity-60 
                ${sendNotification.isPending ? 'disabled:hover:cursor-wait' : 'disabled:hover:cursor-not-allowed'} 
                border rounded-lg whitespace-nowrap text-xs
              `}
              onClick={() => {
                sendNotification.mutateAsync({
                  content: notification.content,
                  email: foundParticipant.user.email,
                  additionalRecipients: (
                    foundParticipant.participant.contact &&
                    foundParticipant.participant.email &&
                    validator.isEmail(foundParticipant.participant.email)
                  ) ? [foundParticipant.participant.email] : [],
                  options: {
                    logging: true
                  }
                })
                .then((data) => {
                  if(data.status === 'success') {
                    const notificationId = v4()
                    props.setTableNotification(prev => [...prev, {
                      id: notificationId,
                      message: `Successfully sent notification to: ${foundParticipant.user.email}${
                        foundParticipant.participant.contact && 
                        foundParticipant.participant.email && 
                        validator.isEmail(foundParticipant.participant.email) ? ` and ${formatParticipantName(foundParticipant.participant)}.` : '.'
                      }`,
                      status: 'Success' as 'Success',
                      createdAt: new Date(),
                      autoClose: setTimeout(() => props.setTableNotification(prev => prev.filter((notification) => notification.id === notificationId)), 5 * 1000)
                    }])
                  }
                  else {
                    props.setTableNotification(prev => [...prev, {
                      id: v4(),
                      message: `Failed to send notification to: ${foundParticipant.user.email}${
                        foundParticipant.participant.contact && 
                        foundParticipant.participant.email && 
                        validator.isEmail(foundParticipant.participant.email) ? ` and ${formatParticipantName(foundParticipant.participant)}.` : '.'
                      }`,
                      status: 'Success' as 'Success',
                      createdAt: new Date(),
                      autoClose: null
                    }])
                  }
                })
                .catch(() => {
                  props.setTableNotification(prev => [...prev, {
                    id: v4(),
                    message: `Failed to send notification to: ${foundParticipant.user.email}${
                      foundParticipant.participant.contact && 
                      foundParticipant.participant.email && 
                      validator.isEmail(foundParticipant.participant.email) ? ` and ${formatParticipantName(foundParticipant.participant)}.` : '.'
                    }`,
                    status: 'Error' as 'Error',
                    createdAt: new Date(),
                    autoClose: null
                  }])
                }).finally(() => {
                  //10 second cooldown
                  setEmailCooldown({
                    cooldown: setInterval(() => {
                      setEmailCooldown(prev => prev !== null && prev.remaining > 0 ? {
                        ...prev,
                        remaining: prev.remaining - 1
                      } : null)
                    }, 1000),
                    remaining: 10
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