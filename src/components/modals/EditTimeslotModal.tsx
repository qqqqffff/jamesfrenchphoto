import { Dispatch, FC, SetStateAction, useEffect, useState } from "react";
import { ModalProps } from ".";
import { Participant, Segment, Timeslot, UserTag } from "../../types";
import { Button, Checkbox, Modal, TextInput, Tooltip } from "flowbite-react";
import { DAY_OFFSET, textInputTheme } from "../../utils";
import { InfiniteData, UseInfiniteQueryResult, useMutation, useQuery, UseQueryResult } from "@tanstack/react-query";
import { DeleteTimeslotMutationParams, SendTimeslotConfirmationParams, TimeslotService, UpdateTimeslotMutationParams } from "../../services/timeslotService";
import { GetAllParticipantsData, UserService } from "../../services/userService";
import { HiOutlineExclamation } from "react-icons/hi";
import { CustomDatePicker } from "../common/CustomDatePicker";
import { TagPicker } from "../common/TagPicker";
import { TimeSegmentBar } from "../common/TimeSegmentBar";
import { DateTime, Duration } from "luxon";
import { convertSegmentListToTimeslots, convertTimeslotListToSegments, timeslotListComparison } from "../../functions/timeslotFunctions";
import { UseNavigateResult } from "@tanstack/react-router";
import { GetAllUserTagsData } from "../../services/tagService";
import { PriceInput } from "../common/PriceInput";
import { NotificationComponent } from "../timeslot/NotificationComponent";
import { ParticipantPicker } from "../common/ParticipantPicker";

interface EditTimeslotModalProps extends ModalProps {
  TimeslotService: TimeslotService,
  UserService: UserService,
  timeslot: Timeslot,
  //TODO: do some dynamic rendering while loading participants/timeslots
  timeslotQuery: UseQueryResult<Timeslot[] | undefined, Error>
  participantQuery: UseInfiniteQueryResult<InfiniteData<GetAllParticipantsData, unknown>, Error>
  tagQuery?: UseInfiniteQueryResult<InfiniteData<GetAllUserTagsData, unknown>, Error>
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
  const [participant, setParticipant] = useState<Participant | undefined>()
  const [noshowFee, setNoshowFee] = useState<number | undefined>(60)
  const [cancelationFee, setCancelationFee] = useState<{ amount: number, window: Duration } | undefined>({ amount: 40, window: Duration.fromMillis(DAY_OFFSET * 2) })
  const [additionalRecipients, setAdditionalRecipients] = useState<string[]>([])
  const [notify, setNotify] = useState(true)
  const [previewTimeslot, setPreviewTimeslot] = useState(false)

  const userProfile = useQuery({
    ...props.UserService.getUserProfileByEmailQueryOptions(participant?.userEmail ?? '', {
      siTimeslot: true
    }),
    enabled: participant !== undefined
  })
  
  const sendEmailConfirmation = useMutation({
    mutationFn: (params: SendTimeslotConfirmationParams) => props.TimeslotService.sendTimeslotConfirmation(params)
  })

  const deleteTimeslot = useMutation({
    mutationFn: (params: DeleteTimeslotMutationParams) => props.TimeslotService.deleteTimeslot(params)
  })

  useEffect(() => {
    if(props.open) {
      setDescription(props.timeslot.description ?? '')
      setActiveTag(props.timeslot.tag)
      setParticipant(props.participants.find((participant) => participant.id === props.timeslot.participantId))
      setNoshowFee(props.timeslot.noshowFee)
      setCancelationFee(props.timeslot.cancelationFee)
      setSegment(convertTimeslotListToSegments([props.timeslot]))
    }
  }, [
    props.open
  ])

  const timeslot: Timeslot = {
    ...props.timeslot,
    noshowFee: noshowFee,
    description: description,
    cancelationFee: cancelationFee,
    tag: activeTag,
    participantId: participant?.id
  }

  const selectedTimeslot = convertSegmentListToTimeslots(
    props.activeDate,
    segement,
    [timeslot]
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
  
  
  return (
    <Modal 
      show={props.open} 
      onClose={() => {
        props.onClose()
      }}
      size={previewTimeslot ? '6xl' : '2xl'}
    >
      <Modal.Header>Edit Timeslot</Modal.Header>
      <Modal.Body className={`grid grid-cols-${previewTimeslot ? '2' : '1'} w-full gap-4`}>
        <div className="flex flex-col w-full">
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
              <div className="flex flex-row gap-4 items-center">
                <CustomDatePicker 
                  selectedDate={props.activeDate}
                  selectDate={(date) => {
                    if(date) {
                      props.navigate({ to: '.', search: { date: DateTime.fromJSDate(date).toFormat('MM-dd-yyyy') }})
                    }
                  }}
                  fetchMonthTimeslots={props.TimeslotService}
                />
                <TextInput
                  theme={textInputTheme} 
                  placeholder="Timeslot Descripition..."
                  className=" placeholder:italic w-full min-w-[300px]"
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
                  tagQuery={props.tagQuery}
                  allowMultiple={false}
                  allowClear
                  small
                  placement="end"
                />  
              </div>
            )}
          />
          <div className="grid grid-cols-2 place-items-center w-full rounded-lg py-2 px-4 gap-x-4">
            <div className="flex flex-col gap-1 self-center items-start justify-center relative border rounded-lg py-2 px-4 w-full">
              <ParticipantPicker 
                type={{
                  type: 'search',
                  label: 'top'
                }}
                multiple={{
                  multiple: 'false',
                  selectedParticipant: participant,
                  setSelectedParticipant: setParticipant
                }}
                participants={props.participants}
                participantQuery={props.participantQuery}
              />
            </div>
            <div className="flex flex-col gap-1 self-center items-start justify-center border rounded-lg py-2 px-4 w-full">
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
          <div className="flex flex-row w-full px-6 justify-between border rounded-lg py-2">
            <div className="flex flex-col gap-2">
              <button 
                className="flex flex-row gap-1 items-center" 
                onClick={(e) => {
                  e.stopPropagation()
                  setNoshowFee(noshowFee !== undefined ? undefined : 40)
                }}
              >
                <Checkbox readOnly checked={noshowFee !== undefined}/>
                <span>No Show Fee</span>
              </button>
              {noshowFee !== undefined && (
                <PriceInput
                  updateState={(v) => setNoshowFee(parseFloat(v))}
                  value={String(noshowFee)}
                />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                className="flex flex-row gap-1 items-center self-end"
                onClick={(e) => {
                  e.stopPropagation()
                  setCancelationFee(cancelationFee !== undefined ? undefined : { amount: 40, window: Duration.fromMillis(DAY_OFFSET * 2) })
                }}
              >
                <Checkbox readOnly checked={cancelationFee !== undefined} />
                <span>Last Minute Booking Fee</span>
              </button>
              {cancelationFee !== undefined && (
                <div className="flex flex-row gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm italic">Hours Before</span>
                    <TextInput
                      theme={textInputTheme}
                      sizing="sm" 
                      className="w-[100px]"
                      onChange={(event) => {
                        let value = event.target.value.replace(/[^\d]/g, '')
                        value = value === '' ? '0' : value
                        if(!isNaN(parseInt(value))) {
                          setCancelationFee({
                            ...cancelationFee,
                            window: Duration.fromObject({ hours: parseInt(value) })
                          })
                        }
                      }}
                      value={cancelationFee.window.as('hours')}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm italic">Fee</span>
                    <PriceInput
                      updateState={(v) => setCancelationFee({
                        ...cancelationFee,
                        amount: parseFloat(v)
                      })}
                      value={String(cancelationFee.amount)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          {participant !== undefined && (
              <NotificationComponent 
                setNotify={setNotify}
                email={participant.userEmail}
                notify={notify}
                recipients={additionalRecipients}
                setRecipients={setAdditionalRecipients}
              />
            )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className={`grid grid-cols-${previewTimeslot ? '2' : '1'} justify-items-end w-full items-center`}>
          <div className="flex flex-row justify-between gap-4 items-center">
            {calculateOverlap !== undefined && (
              <Tooltip content={<span>This new date overlaps with an existing timeslot(s){calculateOverlap == 'emergency' && ' with a registration'}</span>}>
                <HiOutlineExclamation size={32} className={`${calculateOverlap == 'emergency' ? 'fill-red-400' : 'fill-yellow-400'}`}/>
              </Tooltip>
            )}
            <Button
              color="red"
              isProcessing={deleteTimeslot.isPending}
              onClick={() => {
                deleteTimeslot.mutateAsync({
                  timeslot: props.timeslot
                }).then(() => {
                  props.onClose()
                })
              }}
            >Delete</Button>
            <Button
              onClick={() => {
                const timeslot = selectedTimeslot[0]
                if(timeslot === undefined) return

                updateTimeslot.mutateAsync({
                  timeslot: props.timeslot,
                  start: timeslot.start,
                  end: timeslot.end,
                  description: timeslot.description,
                  userTag: timeslot.tag,
                  participantId: timeslot.participantId,
                  register: userProfile.data?.email,
                  noShowFee: timeslot.noshowFee,
                  cancelationFee: timeslot.cancelationFee,
                  options: {
                    logging: true
                  }
                }).then(() => {
                  //TODO: handle response
                  if(
                    participant &&
                    participant.id !== props.timeslot.participantId && 
                    userProfile.data && 
                    notify
                  ) {
                    sendEmailConfirmation.mutate({
                      timeslotId: props.timeslot.id,
                      bypassTagValidation: true,
                      participantId: participant.id,
                      userEmail: userProfile.data.email,
                      additionalRecipients: additionalRecipients,
                      options: {
                        logging: true
                      }
                    })
                  }
                })
                

                //participant - append to new participant and remove from old
                props.parentUpdateParticipants((prev) => prev.map((pParticipant) => participant?.id === pParticipant.id ? ({
                  ...pParticipant,
                  timeslot: [...(pParticipant.timeslot ?? []), timeslot]
                }) : pParticipant.id === props.timeslot.participantId && timeslot.participantId !== participant?.id ? ({
                  ...pParticipant,
                  timeslot: [...pParticipant.timeslot ?? []].filter((timeslot) => timeslot.id !== props.timeslot.id)
                }) : (
                  pParticipant
                )))
                //tag - append to new tag and remove from old
                props.parentUpdateTags((prev) => prev.map((tag) => tag.id === activeTag?.id ? ({
                  ...tag,
                  timeslots: [...tag.timeslots ?? [], timeslot]
                }) : tag.id === props.timeslot.tag?.id && props.timeslot.tag.id !== activeTag?.id ? ({
                  ...tag,
                  timeslots: (tag.timeslots ?? []).filter((pTimeslot) => pTimeslot.id !== timeslot.id)
                }) : tag ))
                //timeslot - update timeslots
                props.parentUpdateTimeslots((prev) => prev.map((pTimeslot) => timeslot.id === pTimeslot.id ? timeslot : pTimeslot))
              }}
              isProcessing={updateTimeslot.isPending || sendEmailConfirmation.isPending}
              disabled={(
                timeslotListComparison(selectedTimeslot, [props.timeslot]) ||
                (updateTimeslot.isPending || sendEmailConfirmation.isPending)
              )}
            >
              Update
            </Button>
            <Button color="light" onClick={() => setPreviewTimeslot(!previewTimeslot)}>{previewTimeslot ? 'Close ' : ''}Preview</Button>
            <Button color="light" onClick={() => props.onClose()}>Done</Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  )
}