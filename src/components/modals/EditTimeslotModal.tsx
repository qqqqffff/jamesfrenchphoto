import { Dispatch, FC, SetStateAction, useEffect, useState } from "react";
import { ModalProps } from ".";
import { Participant, Timeslot, UserTag } from "../../types";
import { Alert, Button, Dropdown, Label, Modal, TextInput, Tooltip } from "flowbite-react";
import { getTimes, normalizeDate, textInputTheme } from "../../utils";
import { useMutation, useQuery, UseQueryResult } from "@tanstack/react-query";
import { TimeslotService, UpdateTimeslotsMutationParams } from "../../services/timeslotService";
import { getUserProfileByEmailQueryOptions } from "../../services/userService";
import { HiOutlineExclamation } from "react-icons/hi";
import { formatParticipantName } from "../../functions/clientFunctions";
import { HiOutlineXMark } from "react-icons/hi2";
import { ParticipantPanel } from "../common/ParticipantPanel";
import { CustomDatePicker } from "../common/CustomDatePicker";
import { TagPicker } from "../admin/package/TagPicker";

interface EditTimeslotModalProps extends ModalProps {
  TimeslotService: TimeslotService,
  timeslot: Timeslot,
  //TODO: do some dynamic rendering while loading participants/timeslots
  timeslotQuery: UseQueryResult<Timeslot[] | undefined, Error>
  participantQuery: UseQueryResult<Participant[], Error>
  existingTimeslots: Timeslot[]
  tags: UserTag[]
  participants: Participant[],
  parentUpdateTimeslots: Dispatch<SetStateAction<Timeslot[]>>
  parentUpdateTags: Dispatch<SetStateAction<UserTag[]>>
  parentUpdateParticipants: Dispatch<SetStateAction<Participant[]>>
}

export const EditTimeslotModal: FC<EditTimeslotModalProps> = (props: EditTimeslotModalProps) => {
  const [startTime, setStartTime] = useState<Date>(props.timeslot.start)
  const [endTime, setEndTime] = useState<Date>(props.timeslot.end)
  const [description, setDescription] = useState<string>(props.timeslot.description ?? '')
  const [activeTag, setActiveTag] = useState<UserTag | undefined>(props.timeslot.tag)
  const [participantId, setParticipantId] = useState<string | undefined>(props.timeslot.participantId)

  const [activeDate, setActiveDate] = useState<Date>(normalizeDate(props.timeslot.start))
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string}>()
  const [participantSearch, setParticipantSearch] = useState<string>('')
  const [participantSearchFocused, setParticipantSearchFocused] = useState(false)

  const userProfile = useQuery({
    ...getUserProfileByEmailQueryOptions(props.participants.find((participant) => participant.id === participantId)?.userEmail ?? '', {
      siCollections: false,
      siNotifications: false,
      siSets: false,
      siTags: false,
      siTemporaryToken: false,
      siTimeslot: true
    }),
    enabled: participantId !== undefined && props.participants.some((participant) => participant.id === participantId)
  })

  useEffect(() => {
    setStartTime(props.timeslot.start)
    setEndTime(props.timeslot.end)
    setDescription(props.timeslot.description ?? '')
    setActiveTag(props.timeslot.tag)
    setParticipantId(props.timeslot.participantId)
  }, [
    props.timeslot
  ])
  const updateTimeslot = useMutation({
    mutationFn: (params: UpdateTimeslotsMutationParams) => props.TimeslotService.updateTimeslotMutation(params),
    onSuccess: () => {
      setNotification({type: 'success', message: 'Successfully Updated Timeslot'})
    },
    onError: () => {
      setNotification({type: 'error', message: 'Failed to Update Timeslot'})
    }
  })

  const times = getTimes(activeDate)

  const calculateOverlap = (() => {
    const found = props.existingTimeslots
      .filter((ts) => ts.id !== props.timeslot.id)
      .filter((timeslot) => {
        return timeslot.start.getTime() === startTime.getTime() || 
          timeslot.end.getTime() === endTime.getTime() ||
          (timeslot.start.getTime() > startTime.getTime() && timeslot.end.getTime() < endTime.getTime())
    })
    if(found.length == 0) return undefined
    if(found.find((timeslot) => timeslot.participantId !== undefined || timeslot.register !== undefined) !== undefined) return 'emergency'
    return 'warning'
  })()

  const filteredParticipants: Participant[] = props.participants
    .filter((participant) => (
      participant.firstName.trim().toLowerCase().includes(participantSearch.trim().toLowerCase()) ||
      participant.lastName.trim().toLowerCase().includes(participantSearch.trim().toLowerCase())) ||
      participant.preferredName?.trim().toLowerCase().includes(participantSearch.trim().toLowerCase()) ||
      participant.email?.trim().toLowerCase().includes(participantSearch.trim().toLowerCase()) ||
      participant.middleName?.trim().toLowerCase().includes(participantSearch.trim().toLowerCase())
    )
    .sort((a, b) => a.firstName.localeCompare(b.firstName))
  
  return (
    <Modal 
      show={props.open} 
      onClose={() => {
        props.onClose()
      }}
    >
      <Modal.Header>Edit Timeslot</Modal.Header>
      <Modal.Body className="min-h-[500px]">
        <div className="flex flex-col">
          {notification && (
            <Alert 
              color={notification.type == 'success' ? 'green' : notification.type == 'error' ? 'red' : 'gray'} 
              className="mb-2" 
              onDismiss={() => setNotification(undefined)}
            >{notification.message}</Alert>
          )}
          <div className="flex flex-row gap-8 w-full justify-center">
            <div className="flex flex-col gap-1 min-w-[200px]">
              <Label className="ms-2 font-medium text-lg">Date:</Label>
              <CustomDatePicker 
                selectedDate={activeDate}
                selectDate={(date) => {
                  if(date) {
                    setActiveDate(date)
                  }
                }}
                tags={props.tags}
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[250px]">
              <Label className="ms-2 font-medium text-lg" htmlFor="timeslotDescription">Description:</Label>
              <TextInput
                id='timeslotDescription'
                theme={textInputTheme} 
                placeholder="Timeslot Descripition..."
                className=" placeholder:italic w-full mb-4"
                sizing="md" 
                onChange={(event) => {
                    setDescription(event.target.value)
                }}
                value={description}
                name="Timeslot Description"
              />
            </div>     
          </div>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="flex flex-col items-center">
              <div className="flex flex-col gap-1">
                <Label className="ms-2 font-medium text-lg" htmlFor="name">Start:</Label>
                <Dropdown placement="bottom-end" label={typeof startTime === 'string' ? startTime : startTime.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })} color="light" id="name" name="name" className="overflow-auto max-h-[250px]">
                  {times
                    .map((time, index) => {
                      return (
                        <Dropdown.Item 
                          key={index} 
                          className={`disabled:text-gray-400 disabled:cursor-not-allowed`}
                          onClick={() => {
                            setStartTime(time)
                            setEndTime(new Date(time.getTime() + (endTime.getTime() - startTime.getTime())))
                          }}
                        >
                          {time.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })}
                        </Dropdown.Item>
                      )
                    })
                  }
                </Dropdown>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex flex-col gap-1">
                <Label className="ms-2 font-medium text-lg" htmlFor="name">End:</Label>
                <Dropdown placement="bottom-end" label={typeof endTime === 'string' ? endTime : endTime.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })} color="light" id="name" name="name" disabled={typeof startTime == 'string'} className="overflow-auto max-h-[250px]">
                  {times.map((time, index) => { 
                    return (
                      <Dropdown.Item 
                        key={index} 
                        className={`disabled:text-gray-400 disabled:cursor-not-allowed`}
                        onClick={() => {
                          setStartTime(new Date(time.getTime() - (endTime.getTime() - startTime.getTime())))
                          setEndTime(time)
                        }}
                      >
                        {time.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })}
                      </Dropdown.Item>
                    )
                  })}
                </Dropdown>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="ms-2 font-medium text-lg" >Tag:</span>
              <TagPicker 
                tags={props.tags}
                parentPickTag={(tag) => setActiveTag(tag)}
                pickedTag={activeTag ? [activeTag] : undefined}
                allowMultiple={false}
                allowClear
                className="max-w-[150px] border rounded-lg px-2 py-1.5"
              />
            </div>
          </div>
          <div className="grid grid-cols-2">
              <div className="flex flex-col gap-1 mb-4 self-center items-center justify-center relative">
                  <Label className="font-medium text-lg" htmlFor="participant">
                      Participant:
                  </Label>
                  <TextInput 
                    id='participant'
                    theme={textInputTheme}
                    sizing="sm"
                    className="max-w-[250px]"
                    placeholder='Pick Participant'
                    onChange={(event) => setParticipantSearch(event.target.value)}
                    value={props.participants.some((participant) => participant.id === participantId) ? (
                      formatParticipantName(props.participants.find((participant) => participant.id === participantId)!)
                    ) : participantSearch}
                    onFocus={() => setParticipantSearchFocused(true)}
                    onBlur={() => setTimeout(() => {
                      setParticipantSearchFocused(false)
                    }, 200)}
                    onKeyDown={(event) => {
                      if(event.key === 'Enter' && filteredParticipants.length > 0) {
                        setParticipantId(filteredParticipants[0].id)
                      }
                      else if(event.key === 'Escape') {
                        if(participantSearch !== '') {
                          setParticipantSearch('')
                        }
                        else {
                          setParticipantSearchFocused(false)
                        }
                      }
                    }}
                  />
                  {participantSearchFocused && (
                    <div className="absolute z-10 top-1/2 mt-10 bg-white border border-gray-200 rounded-md shadow-lg">
                      <div className="flex flex-row p-1 justify-between w-full border-b gap-8">
                        <span className="ms-2 whitespace-nowrap">Participants</span>
                        <button 
                          onClick={() => setParticipantSearchFocused(false)}
                        >
                          <HiOutlineXMark size={16} className="text-gray-400 hover:text-gray-700"/>
                        </button>
                      </div>
                      <ul className="max-h-40 overflow-y-auto py-1 min-w-max">
                        {filteredParticipants.map((item, index) => {
                          return (
                            <Tooltip
                              theme={{ target: undefined }}
                              key={index}
                              content={(
                                <ParticipantPanel participant={item} />
                              )}
                              style="light"
                            >
                              <li
                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                onClick={() => {
                                  setParticipantId(item.id)
                                  setParticipantSearch('')
                                  setParticipantSearchFocused(false)
                                }}
                              >
                                {formatParticipantName(item)}
                              </li>
                            </Tooltip>
                          )
                        })}
                      </ul>
                    </div>
                  )}
              </div>
              <div className="flex flex-col gap-1 mb-4 self-center items-center justify-center">
                  <span className="font-medium text-lg">
                      User/Parent:
                  </span>
                  <span className="text-xl">
                    {/* type safety important since not all userprofiles have the first/last name field */}
                    {userProfile?.data !== undefined ? (
                      userProfile.data.firstName !== undefined && 
                      userProfile.data.firstName !== '' && 
                      userProfile.data.lastName !== undefined &&
                      userProfile.data.lastName !== '' ? (
                        `${userProfile.data.firstName} ${userProfile.data.lastName}`
                      ) : userProfile.data.email
                    ) : 'None'}
                  </span>
              </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer className="flex flex-row-reverse gap-4">
        <Button onClick={() => props.onClose()}>Done</Button>
        {/* TODO: updates check */}
        <Button
          color="light"
          onClick={async () => {
            const newTimeslot: Timeslot = {
              ...props.timeslot,
              start: startTime,
              end: endTime,
              description: description,
              tag: activeTag,
              participantId: participantId,
              register: userProfile.data?.email
            }
            updateTimeslot.mutate({
              timeslots: [newTimeslot],
              previousTimeslots: [props.timeslot],
              options: {
                logging: true
              }
            })
            //update state

            //participant - append to new participant and remove from old
            props.parentUpdateParticipants((prev) => prev.map((participant) => participant.id === participantId ? ({
              ...participant,
              timeslot: participant.timeslot ? [...participant.timeslot, newTimeslot] : [newTimeslot]
            }) : participant.id === props.timeslot.participantId && props.timeslot.participantId !== participantId ? ({
              ...participant,
              timeslot: participant.timeslot ? participant.timeslot.filter((timeslot) => timeslot.id !== props.timeslot.id) : []
            }) : (
              participant
            )))
            //tag - append to new tag and remove from old
            props.parentUpdateTags((prev) => prev.map((tag) => tag.id === activeTag?.id ? ({
              ...tag,
              timeslots: [...tag.timeslots ?? [], newTimeslot]
            }) : tag.id === props.timeslot.tag?.id && props.timeslot.tag.id !== activeTag?.id ? ({
              ...tag,
              timeslots: tag.timeslots?.filter((timeslot) => timeslot.id !== newTimeslot.id)
            }) : tag ))
            //timeslot - update timeslots
            props.parentUpdateTimeslots((prev) => prev.map((timeslot) => timeslot.id === newTimeslot.id ? newTimeslot : timeslot))
          }}
          isProcessing={updateTimeslot.isPending}
        >
            Update
        </Button>
        {calculateOverlap !== undefined ? (
            <Tooltip content={<span>This new date overlaps with an existing timeslot(s){calculateOverlap == 'emergency' && ' with a registration'}</span>}>
                <HiOutlineExclamation size={32} className={`${calculateOverlap == 'emergency' ? 'fill-red-400' : 'fill-yellow-400'}`}/>
            </Tooltip>
        ) : undefined}
      </Modal.Footer>
    </Modal>
  )
}