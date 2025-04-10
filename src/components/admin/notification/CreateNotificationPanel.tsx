import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import { Notification, Participant, UserTag } from "../../../types"
import { Badge, Button, Checkbox, Datepicker, Dropdown, TextInput, Tooltip } from "flowbite-react"
import { HiOutlineCog6Tooth } from "react-icons/hi2"
import { AutoExpandTextarea } from "../../common/AutoExpandTextArea"
import { useMutation, UseQueryResult } from "@tanstack/react-query"
import Loading from "../../common/Loading"
import { badgeColorThemeMap_hoverable, currentDate, DAY_OFFSET, textInputTheme } from "../../../utils"
import { HiOutlineX } from "react-icons/hi"
import { ParticipantPanel } from "../../common/ParticipantPanel"
import { createNotificationMutation, CreateNotificationParams, deleteNotificationMutation, DeleteNotificationParams, updateNotificationMutation, UpdateNotificationParams } from "../../../services/notificationService"

interface CreateNotificationPanelProps {
  notification?: Notification
  parentUpdateNotification: Dispatch<SetStateAction<Notification | undefined>>
  parentUpdateNotifications: Dispatch<SetStateAction<Notification[]>>
  parentUpdateCreating: Dispatch<SetStateAction<boolean>>
  participants: UseQueryResult<Participant[], Error>
  tags: UseQueryResult<UserTag[], Error>
}

export const CreateNotificationPanel = (props: CreateNotificationPanelProps) => {
  const tagAdded = useRef(false)
  const participantAdded = useRef(false)

  const [content, setContent] = useState('')

  const [participants, setParticipants] = useState<Participant[]>([])
  const [searchParticipant, setSearchParticipant] = useState('')
  const [searchParticipantFocused, setSearchParticipantFocused] = useState(false)

  const [tags, setTags] = useState<UserTag[]>([])
  const [searchTag, setSearchTag] = useState('')
  const [searchTagFocused, setSearchTagFocused] = useState(false)

  const [expiration, setExpiration] = useState<Date>(new Date(currentDate.getTime() + DAY_OFFSET))
  const [expirationEnabled, setExpirationEnabled] = useState(true)

  useEffect(() => {
    if(
      props.notification && (
        props.notification.content !== content ||
        props.notification.participants.some((participant) => !participants.some((cPart) => cPart.id === participant.id)) ||
        props.notification.tags.some((tag) => !tags.some((cTag) => cTag.id === tag.id)) ||
        (props.notification.expiration && new Date(props.notification.expiration).getTime() == expiration.getTime())
      )
    ){
      setContent(props.notification.content)
      setParticipants(props.notification.participants)
      setTags(props.notification.tags)
      setExpirationEnabled(props.notification.expiration !== undefined)
      setExpiration(props.notification.expiration ? new Date(props.notification.expiration) : expiration)
    }
  }, [props.notification])

  const createNotification = useMutation({
    mutationFn: (params: CreateNotificationParams) => createNotificationMutation(params),
    onSuccess: (data) => {
      if(data) {
        props.parentUpdateNotification((prev) => {
          if(prev?.id === 'temp') {
            return {
              ...prev,
              id: data
            }
          }
          return prev
        })
        props.parentUpdateNotifications((prev) => {
          const temp = [...prev]

          return temp.map((notification) => {
            if(notification.id === 'temp') {
              return {
                ...notification,
                id: data
              }
            }
            return notification
          })
        })
      }
    }
  })

  const updateNotification = useMutation({
    mutationFn: (params: UpdateNotificationParams) => updateNotificationMutation(params)
  })

  const deleteNotification = useMutation({
    mutationFn: (params: DeleteNotificationParams) => deleteNotificationMutation(params)
  })

  //TODO: add me to a util file
  function transformText(value: string){
    const split = value.split('\n')
    return split.map((value, key) => {
      return (
        <span key={key} className="inline-block w-full whitespace-normal break-words">
          {value}
          <br />
        </span>
      )
    })
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-row w-full justify-between">
        <span className="font-light text-xl px-2 w-full py-1">{props.notification ? 'Update' : 'Create'} Notification</span>
        {props.notification && (
          <Dropdown 
            dismissOnClick={false} 
            label={(<HiOutlineCog6Tooth size={24} className="hover:text-gray-600"/>)} 
            inline 
            arrowIcon={false}
            title="Notification Settings"
          >
            <Dropdown.Item onClick={() => {
              props.parentUpdateNotification(undefined)
              props.parentUpdateNotifications((prev) => {
                const temp = [...prev]

                return temp.filter((notification) => notification.id !== props.notification?.id)
              })
              deleteNotification.mutate({
                notificationId: props.notification!.id,
                options: {
                  logging: true
                }
              })
            }}>
              Delete Notification
            </Dropdown.Item>
          </Dropdown>
        )}
      </div>
      <div className="border w-full mb-4" />
      <div className="grid grid-cols-2 gap-x-4 px-10">
        <div className="flex flex-col gap-1 max-w-[500px]">
          <span className="font-thin text-lg italic mt-2">Users</span>
          <div className="relative">
            <TextInput
              theme={textInputTheme}
              sizing="sm"
              placeholder="Search for participants" 
              onChange={(event) => {
                setSearchParticipant(event.target.value)
              }}
              onFocus={() => setSearchParticipantFocused(true)}
              onBlur={() => 
                setTimeout(() => {
                  if(!participantAdded.current) {
                    setSearchParticipantFocused(false)
                  }
                  else {
                    participantAdded.current = false
                  }
                }, 200)
              }
            />
            {searchParticipantFocused && (
              <div className="absolute mt-0.5 z-10 bg-white border border-gray-200 rounded-md shadow-lg">
                <ul className="max-h-60 overflow-y-auto py-1 min-w-max">
                  {!props.participants.data ? (
                    <li className="flex flex-row">Loading<Loading /></li>
                  ) : (
                    (props.participants.data ?? [])
                      .filter((participant) => ((
                        participant.email?.toLowerCase().trim().includes(searchParticipant.toLowerCase()) ||
                        participant.firstName.toLowerCase().trim().includes(searchParticipant.toLowerCase()) ||
                        participant.lastName.toLowerCase().trim().includes(searchParticipant.toLowerCase()) ||
                        participant.preferredName?.toLowerCase().trim().includes(searchParticipant.toLowerCase()) 
                      ) && !participants.some((part) => part.id === participant.id)))
                      .map((participant, index) => {
                        return (
                          <Tooltip 
                            theme={{ target: undefined }}
                            key={index}
                            content={(
                              <ParticipantPanel participant={participant} />
                            )}
                            style="light"
                            placement="bottom"
                          >
                            <li 
                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                              onClick={() => {
                                const temp = [...participants, participant]
                                setParticipants(temp)
                                participantAdded.current = (props.participants.data ?? []).some((part) => !temp.some((tPart) => tPart.id === part.id))
                              }}
                            >
                              {!participant.email ? `${participant.firstName}, ${participant.lastName}` : participant.email}
                            </li>
                          </Tooltip>
                        )
                      })
                  )}
                </ul>
              </div>
            )}
            <div className="flex flex-row gap-x-4 gap-y-2 mt-2">
              {participants.map((participant, index) => {
                return (
                  <Tooltip 
                    key={index}
                    content={(
                      <ParticipantPanel participant={participant} />
                    )}
                    style="light"
                    placement="bottom"
                  >
                    <Badge 
                      key={index}
                      className="hover:bg-gray-200 hover:cursor-pointer px-4 text-wrap"
                      onClick={() => {
                        setParticipants(participants.filter((part) => part.id !== participant.id))
                        participantAdded.current = false
                      }}
                      icon={HiOutlineX}
                      color="gray"
                    >
                      {participant.firstName}, {participant.lastName}
                    </Badge>
                  </Tooltip>
                )
              })}
            </div>
          </div>
          <span className="font-thin text-lg italic mt-2">User Tags</span>
          <div className="relative">
            <TextInput
              theme={textInputTheme}
              sizing="sm"
              placeholder="Search for tags" 
              onChange={(event) => {
                setSearchTag(event.target.value)
              }}
              onFocus={() => setSearchTagFocused(true)}
              onBlur={() => 
                setTimeout(() => {
                  if(!tagAdded.current) {
                    setSearchTagFocused(false)
                  }
                  else {
                    tagAdded.current = false
                  }
                }, 200)
              }
            />
            {searchTagFocused && (
              <div className="absolute mt-0.5 z-10 bg-white border border-gray-200 rounded-md shadow-lg">
                <ul className="max-h-60 overflow-y-auto py-1 min-w-max">
                {!props.tags.data ? (
                    <li className="flex flex-row">Loading<Loading /></li>
                ) : (
                  (props.tags.data ?? [])
                    .filter((tag) => ((
                      tag.name.toLowerCase().trim().includes(searchTag.toLowerCase()) 
                    ) && !tags.some((t) => t.id === tag.id)))
                    .map((tag, index) => {
                      return (
                        <li 
                          key={index}
                          className={`px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-${tag.color ?? 'black'}`}
                          onClick={() => {
                            const temp = [...tags, tag]
                            setTags(temp)
                            tagAdded.current = (props.tags.data ?? []).some((t) => !temp.some((tT) => tT.id === t.id))
                          }}
                        >
                          {tag.name}
                        </li>
                      )
                    })
                )}
                </ul>
              </div>
            )}
            <div className="flex flex-row gap-x-4 gap-y-2 pt-2 pb-4">
              {tags.map((tag, index) => {
                return (
                  <Badge 
                    theme={badgeColorThemeMap_hoverable}
                    key={index}
                    color={tag.color ?? 'gray'}
                    className={`hover:cursor-pointer px-4 text-wrap`}
                    onClick={() => {
                      setTags(tags.filter((t) => t.id !== tag.id))
                      tagAdded.current = false
                    }}
                    icon={HiOutlineX}
                  >
                    {tag.name}
                  </Badge>
                )
              })}
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-thin text-lg italic">Notification content</span>
              <AutoExpandTextarea 
                placeholder="Enter Notification Content Here..."
                stateUpdate={setContent}
                parentValue={content}
              />
            </div>
            <div className="flex flex-col gap-1 mt-2">
              <span className="font-thin text-lg italic">Expiration date</span>
              <div className="flex flex-row ">
                <Datepicker 
                  minDate={new Date(currentDate.getTime() + DAY_OFFSET)}
                  disabled={expirationEnabled}
                  showClearButton={false}
                  showTodayButton={false}
                  onChange={(event) => {
                    if(event) {
                      setExpiration(event)
                    }
                  }}
                  value={expiration}
                />
              </div>
              <button 
                className="flex flex-row gap-2 items-center ms-2"
                onClick={() => setExpirationEnabled(!expirationEnabled)}
              >
                <Checkbox 
                  checked={!expirationEnabled}
                  className="text-sm"
                  readOnly
                />
              <span className="text-sm">Expiration Enabled</span>
            </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-thin text-lg italic">Preview Notification</span>
          <div className="border border-gray-400 rounded-lg px-4 py-1">
            <span className={`${content ? 'text-black' : 'text-gray-300'} text-base font-extralight`}>{content ? transformText(content) : 'Notification content will display here'}</span>
          </div>
          <div className="flex flex-row gap-2 self-end mt-2">
            <Button 
              className="max-w-min disabled:cursor-not-allowed"
              disabled={createNotification.isPending}
              color="light"
              onClick={() => {
                props.parentUpdateCreating(false)
              }}
            >Cancel</Button>
            <Button 
              className="max-w-min disabled:cursor-not-allowed"
              //TODO: add in sanity check
              disabled={createNotification.isPending}
              isProcessing={createNotification.isPending}
              onClick={() => {
                if(!props.notification) {
                  createNotification.mutate({
                    content: content,
                    location: 'dashboard',
                    participantIds: participants.map((participant) => participant.id),
                    tagIds: tags.map((tag) => tag.id),
                    expiration: expirationEnabled ? expiration.toISOString() : undefined,
                    options: {
                      logging: true
                    }
                  })
                } else {
                  const tempNotification: Notification = {
                    ...props.notification,
                    content: content,
                    location: 'dashboard',
                    participants: participants,
                    tags: tags,
                    expiration: expirationEnabled ? expiration.toISOString() : undefined,
                  }
                  props.parentUpdateNotification(tempNotification)
                  props.parentUpdateNotifications((prev) => {
                    const temp = [...prev]

                    return temp.map((notification) => {
                      if(notification.id === tempNotification.id) {
                        return tempNotification
                      }
                      return notification
                    })
                  })
                  updateNotification.mutate({
                    notification: props.notification,
                    content: content,
                    location: 'dashboard',
                    participantIds: participants.map((participant) => participant.id),
                    tagIds: tags.map((tag) => tag.id),
                    expiration: expirationEnabled ? expiration.toISOString() : undefined,
                    options: {
                      logging: true,
                    }
                  })
                }
                
              }}
            >{props.notification ? 'Update' : 'Create'}</Button>
          </div>
          
        </div>
      </div>
    </div>
  )
}