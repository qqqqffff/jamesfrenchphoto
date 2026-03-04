import { Dispatch, FC, SetStateAction, useEffect, useState } from "react";
import { ModalProps } from ".";
import { Participant, Segment, Timeslot, UserTag } from "../../types";
import { Button, Label, Modal, TextInput, Tooltip } from "flowbite-react";
import { DAY_OFFSET, textInputTheme } from "../../utils";
import { InfiniteData, UseInfiniteQueryResult, useMutation, useQuery, UseQueryResult } from "@tanstack/react-query";
import { AdminRegisterTimeslotMutationParams, SendTimeslotConfirmationParams, TimeslotService, UpdateTimeslotMutationParams } from "../../services/timeslotService";
import { GetAllParticipantsData, UserService } from "../../services/userService";
import { HiOutlineExclamation } from "react-icons/hi";
import { formatParticipantName } from "../../functions/clientFunctions";
import { HiOutlineXMark } from "react-icons/hi2";
import { ParticipantPanel } from "../common/ParticipantPanel";
import { CustomDatePicker } from "../common/CustomDatePicker";
import { TagPicker } from "../common/TagPicker";
import { TimeSegmentBar } from "../common/TimeSegmentBar";
import { DateTime, Duration } from "luxon";
import { convertSegmentListToTimeslots, convertTimeslotListToSegments, timeslotListComparison } from "../../functions/timeslotFunctions";
import { UseNavigateResult } from "@tanstack/react-router";

interface EditTimeslotModalProps extends ModalProps {
  TimeslotService: TimeslotService,
  UserService: UserService,
  timeslot: Timeslot,
  //TODO: do some dynamic rendering while loading participants/timeslots
  timeslotQuery: UseQueryResult<Timeslot[] | undefined, Error>
  participantQuery: UseInfiniteQueryResult<InfiniteData<GetAllParticipantsData, unknown>, Error>
  existingTimeslots: Timeslot[]
  tags: UserTag[]
  participants: Participant[],
  activeDate: Date,
  navigate: UseNavigateResult<string>
  parentUpdateTimeslots: Dispatch<SetStateAction<Timeslot[]>>
  parentUpdateTags: Dispatch<SetStateAction<UserTag[]>>
  parentUpdateParticipants: Dispatch<SetStateAction<Participant[]>>
}

export const EditTimeslotModal: FC<EditTimeslotModalProps> = (props: EditTimeslotModalProps) => {
  const [segement, setSegment] = useState<Segment[]>([])
  const [description, setDescription] = useState<string>(props.timeslot.description ?? '')
  const [activeTag, setActiveTag] = useState<UserTag | undefined>(props.timeslot.tag)
  const [participantId, setParticipantId] = useState<string | undefined>(props.timeslot.participantId)
  const [noshowFee, setNoshowFee] = useState<number | undefined>(60)
  const [cancelationFee, setCancelationFee] = useState<{ amount: number, window: Duration } | undefined>({ amount: 40, window: Duration.fromMillis(DAY_OFFSET * 2) })
  const [additionalRecipients, setAdditionalRecipients] = useState<string[]>([])
  const [notify, setNotify] = useState(true)

  const [participantSearch, setParticipantSearch] = useState<string>('')
  const [participantSearchFocused, setParticipantSearchFocused] = useState(false)

  const userProfile = useQuery({
    ...props.UserService.getUserProfileByEmailQueryOptions(props.participants.find((participant) => participant.id === participantId)?.userEmail ?? '', {
      siTimeslot: true
    }),
    enabled: participantId !== undefined && props.participants.some((participant) => participant.id === participantId)
  })
  
  const sendEmailConfirmation = useMutation({
    mutationFn: (params: SendTimeslotConfirmationParams) => props.TimeslotService.sendTimeslotConfirmation(params)
  })

  useEffect(() => {
    if(props.open) {
      setDescription(props.timeslot.description ?? '')
      setActiveTag(props.timeslot.tag)
      setParticipantId(props.timeslot.participantId)
      setNoshowFee(props.timeslot.noshowFee)
      setCancelationFee(props.timeslot.cancelationFee)
      setSegment(convertTimeslotListToSegments([props.timeslot]))
    }
  }, [
    props.open
  ])

  const selectedTimeslot = convertSegmentListToTimeslots(
    props.activeDate,
    segement,
    [props.timeslot]
  )

  const updateTimeslot = useMutation({
    mutationFn: (params: UpdateTimeslotMutationParams) => props.TimeslotService.updateTimeslotMutation(params)
  })

  const calculateOverlap = (() => {
    const found = props.existingTimeslots
      .filter((ts) => ts.id !== props.timeslot.id)
      .filter((timeslot) => {
        return (
          // inside
          (timeslot.start.getTime() <= props.timeslot.start.getTime() && timeslot.end.getTime() >= props.timeslot.end.getTime()) ||
          // ends inside
          (timeslot.start.getTime() >= props.timeslot.start.getTime() && timeslot.end.getTime() <= props.timeslot.end.getTime()) ||
          // starts inside
          (timeslot.start.getTime() <= props.timeslot.start.getTime() && timeslot.end.getTime() >= props.timeslot.end.getTime())
        )
    })
    if(found.length == 0) return undefined
    if(found.some((timeslot) => timeslot.participantId !== undefined || timeslot.register !== undefined)) return 'emergency'
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
          <div className="flex flex-row gap-8 w-full justify-center">
            <div className="flex flex-col gap-1 min-w-[200px]">
              <Label className="ms-2 font-medium text-lg">Date:</Label>
              <CustomDatePicker 
                selectedDate={props.activeDate}
                selectDate={(date) => {
                  if(date) {
                    props.navigate({ to: '.', search: { date: DateTime.fromJSDate(date).toFormat('MM-dd-yyyy') }})
                  }
                }}
                fetchMonthTimeslots={props.TimeslotService}
              />
            </div>
          </div>
          <TimeSegmentBar 
            segments={segement}
            setSegments={setSegment}
            individual
            activeTag={activeTag}
            activeOptions={{
              noshowFee: noshowFee,
              description: description,
              cancelationFee: cancelationFee,
            }}
            header={(
              <div className="flex flex-row gap-2 items-center">
                <TextInput
                  theme={textInputTheme} 
                  placeholder="Timeslot Descripition..."
                  className=" placeholder:italic w-full mb-4 max-w-[350px]"
                  sizing="md" 
                  onChange={(event) => {
                      setDescription(event.target.value)
                  }}
                  value={description}
                  name="Timeslot Description"
                />
                <TagPicker 
                  tags={props.tags}
                  parentPickTag={(tag) => setActiveTag(tag)}
                  pickedTag={activeTag ? [activeTag] : undefined}
                  allowMultiple={false}
                  allowClear
                  small
                />  
              </div>
            )}
          />
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
        <Button color="light" onClick={() => props.onClose()}>Done</Button>
        {/* TODO: updates check */}
        <Button
          onClick={() => {
            if(selectedTimeslot[0] === undefined) return
            const newTimeslot = selectedTimeslot[0]
            
            updateTimeslot.mutateAsync({
              timeslot: props.timeslot,
              start: newTimeslot.start,
              end: newTimeslot.end,
              description: description,
              userTag: activeTag,
              participantId: participantId,
              register: userProfile.data?.email,
              noShowFee: noshowFee,
              cancelationFee: cancelationFee,
              options: {
                logging: true
              }
            }).then(() => {
              //TODO: handle response
              if(participantId !== props.timeslot.participantId && userProfile.data && participantId) {
                sendEmailConfirmation.mutate({
                  timeslotId: props.timeslot.id,
                  bypassTagValidation: true,
                  participantId: participantId,
                  userEmail: userProfile.data.email,
                  additionalRecipients: additionalRecipients,
                  options: {
                    logging: true
                  }
                })
              }
            })
            

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
          isProcessing={updateTimeslot.isPending || sendEmailConfirmation.isPending}
          disabled={(
            timeslotListComparison(selectedTimeslot, [props.timeslot]) ||
            (updateTimeslot.isPending || sendEmailConfirmation.isPending)
          )}
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