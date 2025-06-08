import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import { Notification, Participant, UserTag } from "../../../types"
import { Badge, Button, Checkbox, Datepicker, Dropdown, Radio, TextInput, Tooltip } from "flowbite-react"
import { HiOutlineCog6Tooth } from "react-icons/hi2"
import { AutoExpandTextarea } from "../../common/AutoExpandTextArea"
import { useMutation } from "@tanstack/react-query"
import { badgeColorThemeMap_hoverable, currentDate, DAY_OFFSET, textInputTheme } from "../../../utils"
import { HiOutlineX } from "react-icons/hi"
import { ParticipantPanel } from "../../common/ParticipantPanel"
import { createNotificationMutation, CreateNotificationParams, deleteNotificationMutation, DeleteNotificationParams, updateNotificationMutation, UpdateNotificationParams } from "../../../services/notificationService"

interface  NotificationPanelProps {
  notification: Notification
  parentUpdateNotification: Dispatch<SetStateAction<Notification | undefined>>
  parentUpdateNotifications: Dispatch<SetStateAction<Notification[]>>
  parentUpdateParticipants: Dispatch<SetStateAction<Participant[]>>
  parentUpdateTags: Dispatch<SetStateAction<UserTag[]>>
  participants: Participant[]
  tags: UserTag[]
}

//TODO: wieghted filtering of participants tf
export const NotificationPanel = (props: NotificationPanelProps) => {
  const tagAdded = useRef(false)

  const [content, setContent] = useState('')

  const [participants, setParticipants] = useState<Participant[]>([])
  const [searchParticipant, setSearchParticipant] = useState('')
  const [participantFilterTag, setParticipantFilterTag] = useState<string>('')
  const [filterParticipantTag, setFilterParticipantTag] = useState<string>('')

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
        (props.notification.expiration && new Date(props.notification.expiration).getTime() == expiration.getTime()) ||
        (!props.notification.expiration !== expirationEnabled)
      )
    ){
      setContent(props.notification.content)
      setParticipants(props.notification.participants)
      setTags(props.notification.tags)
      setExpirationEnabled(props.notification.expiration !== undefined)
      setExpiration(props.notification.expiration ? new Date(props.notification.expiration) : expiration)
    }
    else if(!props.notification) {
      setContent('')
      setParticipants([])
      setTags([])
      setExpirationEnabled(true)
      setExpiration(new Date(currentDate.getTime() + DAY_OFFSET))
    }
  }, [props.notification])

  const createNotification = useMutation({
    mutationFn: (params: CreateNotificationParams) => createNotificationMutation(params),
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

  const participantFilter = (participant: Participant) => ((
    participant.email?.toLowerCase().trim().includes(searchParticipant.toLowerCase()) ||
    participant.firstName.toLowerCase().trim().includes(searchParticipant.toLowerCase()) ||
    participant.lastName.toLowerCase().trim().includes(searchParticipant.toLowerCase()) ||
    participant.preferredName?.toLowerCase().trim().includes(searchParticipant.toLowerCase()) 
  ) &&
    (participantFilterTag === '' || participant.userTags.some((tag) => tag.id === participantFilterTag))
  ) ?? false

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
      <div className="flex flex-row px-8 gap-x-4">
        <div className="flex flex-col w-[70%]">
          <span className="font-thin text-lg italic mt-2">Users</span>
          <div className="flex flex-col gap-2">
            <div className="flex flex-row w-full gap-4 items-center">
              <TextInput
                theme={textInputTheme}
                sizing="sm"
                className="w-full"
                placeholder="Search for participants" 
                onChange={(event) => {
                  setSearchParticipant(event.target.value)
                }}
              />
              <Dropdown
                color="light"
                size="xs"
                label={<span className="text-nowrap whitespace-nowrap">Filter Tags</span>}
                dismissOnClick={false}
              >
                <TextInput 
                  theme={textInputTheme} 
                  sizing="sm" 
                  className="w-full place-self-center mb-2 px-2 pt-1" 
                  placeholder="Search for Tag"
                  onKeyDown={(event) => {
                    event.stopPropagation()
                  }}
                  onChange={(event) => {
                    setFilterParticipantTag(event.target.value)
                  }}
                  value={filterParticipantTag}
                />
                {props.tags
                  .filter((tag) => tag.name.toLocaleLowerCase().trim().includes(filterParticipantTag.toLocaleLowerCase().trim()))
                  .map((tag) => {
                    return (
                      <Dropdown.Item 
                        className="flex flex-row items-center justify-start gap-2" 
                        as='label' 
                        htmlFor={tag.id} 
                        key={tag.id} 
                        onClick={() => {
                          setParticipantFilterTag(tag.id)
                        }}
                      >
                        <Radio name='tag' id={tag.id} checked={participantFilterTag === tag.id} />
                        <span className={`text-${tag.color ?? 'black'}`}>{tag.name}</span>
                      </Dropdown.Item>
                    )
                  })
                }
                <Dropdown.Item
                  onClick={() => {
                    setParticipantFilterTag('')
                    setFilterParticipantTag('')
                  }}
                >Clear</Dropdown.Item>
              </Dropdown>
            </div>
            <div className="grid grid-cols-3 gap-x-4 gap-y-2 max-h-[140px] overflow-y-auto border rounded-lg px-2 py-2">
              {(searchParticipant !== '' || participantFilterTag !== '') && props.participants.filter((participant) => participantFilter(participant)).length === 0 ? (
                <span className="italic font-light">No Results</span>
              ) : (
              props.participants.length === 0 ? (
                <span className="italic font-light">No Available Participants</span>
              ) : (
                props.participants
                  .filter((participant) => participantFilter(participant))
                  .map((participant, index) => {
                    const selected = (
                      participants.some((pParticipant) => pParticipant.id === participant.id) || 
                      participant.userTags.some((tag) => tags.some((sTag) => sTag.id === tag.id))
                    )
                    const tagSelected = participant.userTags.some((tag) => tags.some((sTag) => sTag.id === tag.id))
                    return (
                      <Tooltip 
                        theme={{ target: undefined }}
                        key={index}
                        content={(
                          tagSelected ? (
                            <div className="flex flex-col gap-1">
                              <span className="italic font-bold">Participant selected by tags</span>
                              <ParticipantPanel participant={participant} />
                            </div>
                          ) : (
                            <ParticipantPanel participant={participant} />
                          )
                        )}
                        style="light"
                        placement="bottom"
                      >
                        <button 
                          disabled={tagSelected}
                          className={`
                            px-4 py-2 border rounded-lg text-start enabled:hover:bg-gray-100
                            flex flex-row font-light gap-2 truncate w-full
                            ${selected ? (
                              tagSelected ? (
                                'disabled:hover:cursor-not-allowed bg-gray-200'
                              ) : (
                                'bg-gray-200' 
                              )
                            ) : (
                              ''
                            )}
                          `}
                          onClick={() => {
                            const temp = [...participants, participant]
                            setParticipants(temp)
                          }}
                        >
                          {`${participant.preferredName ? participant.preferredName : participant.firstName} ${participant.lastName}`}
                        </button>
                      </Tooltip>
                    )
                  })
                )
              )}
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
                {props.tags
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
                          tagAdded.current = props.tags.some((t) => !temp.some((tT) => tT.id === t.id))
                        }}
                      >
                        {tag.name}
                      </li>
                    )
                  })
                }
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
                  disabled={!expirationEnabled}
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
                  checked={expirationEnabled}
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
              //TODO: add in sanity check
              disabled={createNotification.isPending || updateNotification.isPending}
              isProcessing={createNotification.isPending || updateNotification.isPending}
              onClick={() => {
                if(props.notification.temporary) {
                  const tempNotification: Notification = {
                    ...props.notification,
                    content: content,
                    participants: participants,
                    tags: tags,
                    expiration: expirationEnabled ? expiration.toISOString() : undefined,
                    updatedAt: new Date().toISOString(),
                  }

                  props.parentUpdateNotification(tempNotification)
                  props.parentUpdateNotifications((prev) => [...prev, tempNotification])
                  props.parentUpdateParticipants((prev) => {
                    const temp = [...prev]
                      .map((part) => {
                        if(participants.some((p) => p.id === part.id)) {
                          return {
                            ...part,
                            notifications: [...part.notifications, tempNotification]
                          }
                        }
                        return part
                      })

                    return temp
                  })
                  props.parentUpdateTags((prev) => {
                    const temp = [...prev]
                      .map((tag) => {
                        if(tags.some((t) => t.id === tag.id)) {
                          return {
                            ...tag,
                            notifications: [...tag.notifications ?? [], tempNotification],
                          }
                        }
                        return tag
                      })

                    return temp
                  })

                  createNotification.mutate({
                    notification: tempNotification,
                    options: {
                      logging: true
                    }
                  })
                } else {
                  const tempNotification: Notification = {
                    ...props.notification,
                    content: content,
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
                  props.parentUpdateParticipants((prev) => {
                    const temp = [...prev]
                      .map((part) => {
                        if(participants.some((p) => p.id === part.id)) {
                          return {
                            ...part,
                            notifications: [...part.notifications
                              .filter((notification) => notification.id !== tempNotification.id),
                              tempNotification
                            ]
                          }
                        }
                        if(part.notifications.some((notification) => notification.id === tempNotification.id)) {
                          return {
                            ...part,
                            notifications: part.notifications.filter((notification) => notification.id !== tempNotification.id)
                          }
                        }
                        return part
                      })

                    return temp
                  })
                  props.parentUpdateTags((prev) => {
                    const temp = [...prev]
                      .map((tag) => {
                        if(tags.some((t) => t.id === tag.id)) {
                          return {
                            ...tag,
                            notifications: [...(tag.notifications ?? [])
                              .filter((notification) => notification.id !== tempNotification.id),
                              tempNotification
                            ],
                          }
                        }
                        if(tag.notifications?.some((notification) => notification.id === tempNotification.id)) {
                          return {
                            ...tag,
                            notifications: (tag.notifications ?? []).filter((notification) => notification.id !== tempNotification.id)
                          }
                        }
                        return tag
                      })

                    return temp
                  })

                  
                  updateNotification.mutate({
                    notification: props.notification,
                    content: content,
                    location: 'dashboard',
                    participantIds: participants.map((participant) => participant.id),
                    tagIds: tags.map((tag) => tag.id),
                    expiration: expirationEnabled ? expiration.toISOString() : 'none',
                    options: {
                      logging: true,
                    }
                  })
                }
                
              }}
            >{props.notification.temporary ? 'Create' : 'Update'}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}