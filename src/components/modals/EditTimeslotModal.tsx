import { Dispatch, FC, SetStateAction, useEffect, useState } from "react";
import { ModalProps } from ".";
import { Participant, Segment, Timeslot, UserTag } from "../../types";
import { Alert, Button, Checkbox, Modal, TextInput, Tooltip } from "flowbite-react";
import { DAY_OFFSET, formatTime, textInputTheme } from "../../utils";
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
import { ChargeNoShowFeeMutationParams, PaymentService } from "../../services/paymentService";
import Loading from '../common/Loading'
import { HiOutlineExclamationTriangle, HiOutlineInformationCircle } from "react-icons/hi2";
import { TablePanelNotification } from "../admin/table/TablePanel";
import { v4 } from 'uuid'

interface EditTimeslotModalProps extends ModalProps {
  TimeslotService: TimeslotService,
  UserService: UserService,
  PaymentService: PaymentService
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

  const [modalNotifications, setModalNotifications] = useState<TablePanelNotification[]>([])

  const userProfile = useQuery({
    ...props.UserService.getUserProfileByEmailQueryOptions(participant?.userEmail ?? '', {
      siTimeslot: true,
    }),
    enabled: participant !== undefined
  })

  const paymentMethods = useQuery({
    ...props.PaymentService.getUserSavedPaymentMethodsQueryOptions({
      userEmail: userProfile.data?.email ?? '',
      role: 'ADMIN',
      options: {
        logging: true,
        metric: true
      }
    }),
    enabled: userProfile.data !== undefined
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

  const chargeNoShowFee = useMutation({
    mutationFn: (params: ChargeNoShowFeeMutationParams) => props.PaymentService.chargeNoShowFeeMutation(params)
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

  const formattedTimeslotOwnerName = userProfile?.data !== undefined ? (
      userProfile.data.firstName !== undefined && 
      userProfile.data.firstName !== '' && 
      userProfile.data.lastName !== undefined &&
      userProfile.data.lastName !== '' ? (
        `${userProfile.data.firstName} ${userProfile.data.lastName}`
      ) : userProfile.data.email
    ) : 'None'
  
  
  return (
    <Modal 
      show={props.open} 
      onClose={() => {
        props.onClose()
      }}
      size={previewTimeslot ? 'full' : '7xl'}
    >
      <Modal.Header>Edit Timeslot</Modal.Header>
      <Modal.Body className={`grid grid-cols-${previewTimeslot ? '3' : '2'} w-full gap-4 py-2`}>
        <div className="flex flex-col w-full">
          <div className={`
            absolute z-20 w-full max-w-[500px] top-[80px] self-center
          `}>
            {modalNotifications
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .filter((_, index) => index < 3)
            .reverse()
            .map((notification, index) => {
              return (
                <Alert 
                  key={notification.id}
                  className={`opacity-80 border transition-opacity  ${index > 0 ? '-mt-12' : ''}`}
                  color={notification.status === 'Success' ? 'green' : 'red'}
                  onDismiss={() => {
                    if(notification.autoClose !== null) {
                      clearTimeout(notification.autoClose)
                    }
                    setModalNotifications(prev => prev.filter((parentNotifications) => parentNotifications.id !== notification.id))
                  }}
                >{notification.message}</Alert>
              )
            })}
          </div>
          <TimeSegmentBar 
            segments={segement}
            setSegments={setSegment}
            individual={{
              individual: true
            }}
            activeTag={activeTag}
            activeOptions={{
              noshowFee: noshowFee,
              description: description,
              cancelationFee: cancelationFee,
            }}
            header={(
              <div className="flex flex-row gap-4 items-center self-center">
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
                  className=" placeholder:italic w-full min-w-[230px]"
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
        </div>
        <div className="flex flex-col w-full">
          <div className="grid grid-cols-2 place-items-center w-full gap-x-4">
            <div className="flex flex-col gap-1 self-center items-start justify-center relative border rounded-lg py-2 px-4 w-full">
              <ParticipantPicker 
                disabled={timeslot.start.getTime() < new Date().getTime()}
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
                {userProfile.isFetching ? (
                  <span className="flex flex-row items-center gap-1">
                    <span>Loading</span>
                    <Loading />
                  </span>
                ) : (
                  formattedTimeslotOwnerName
                )}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 w-full py-2 gap-x-4">
            <div className="flex flex-col gap-1 self-center items-start justify-center border rounded-lg py-2 px-4 w-full">
              <button 
                className="flex flex-row gap-1 items-center" 
                disabled={timeslot.start.getTime() < new Date().getTime()}
                onClick={(e) => {
                  e.stopPropagation()
                  setNoshowFee(noshowFee !== undefined ? undefined : 40)
                }}
              >
                <Checkbox readOnly checked={noshowFee !== undefined}/>
                <span>No Show Fee</span>
              </button>
              {noshowFee !== undefined && (
                <div className="flex flex-row w-full justify-between">
                  <PriceInput
                    updateState={(v) => setNoshowFee(parseFloat(v))}
                    value={String(noshowFee)}
                  />
                  <Button
                    isProcessing={chargeNoShowFee.isPending}
                    size="xs"
                    className="px-2"
                    disabled={
                      (paymentMethods.data ?? []).length === 0 || 
                      chargeNoShowFee.isPending ||
                      userProfile.data === undefined ||
                      timeslot.start.getTime() > new Date().getTime()
                    }
                    onClick={() => {
                      if(userProfile.data) {
                        chargeNoShowFee.mutateAsync({
                          timeslotId: props.timeslot.id,
                          userEmail: userProfile.data.email
                        }).then((response) => {
                          if(response.status === 'Success') {
                            const notificationId = v4()
                            setModalNotifications(prev => [...prev, {
                              id: notificationId,
                              message: `Successfully invoiced ${formattedTimeslotOwnerName}`,
                              status: 'Success',
                              createdAt: new Date(),
                              autoClose: setTimeout(() => {
                                setModalNotifications(prev => prev.filter((notification) => notification.id !== notificationId))
                              }, 30000)
                            }])
                          }
                          else {
                            setModalNotifications(prev => [...prev, {
                              id: v4(),
                              message: response.status === 'ActionRequired' ? (
                                'Client authorization required, invoice sent with authorization link.'
                              ): (response.error ?? 'Unknown error occured'),
                              status: 'Error',
                              createdAt: new Date(),
                              autoClose: null
                            }])
                          }
                        }).catch(() => {
                          setModalNotifications(prev => [...prev, {
                            id: v4(),
                            message: 'Unknown error occured',
                            status: 'Error',
                            createdAt: new Date(),
                            autoClose: null
                          }])
                        })
                      }
                    }}
                  >Charge Fee</Button>
                </div>
              )}
              <div className="flex flex-col items-start gap-1">
                {userProfile.data === undefined ? (
                  <span className="flex flex-row items-center gap-1 text-red-500 text-xs">
                    <HiOutlineExclamationTriangle size={22} />
                    <span>Registration is required to charge</span>
                  </span>
                ) : (paymentMethods.isFetching ? (
                  <span className="flex flex-row items-center gap-1 text-gray-500 text-xs">
                    <HiOutlineInformationCircle size={22} />
                    <span>Retrieving user payment methods</span>
                  </span>
                ) : ((paymentMethods.data ?? []).length === 0 && (
                  <span className="flex flex-row items-center gap-1 text-red-500 text-xs">
                    <HiOutlineExclamationTriangle size={22} />
                    <span>No saved payment methods</span>
                  </span>
                )))}
                {timeslot.start.getTime() > new Date().getTime() && (
                  <span className="flex flex-row items-center gap-1 text-red-500 text-xs">
                    <HiOutlineExclamationTriangle size={22} />
                    <span>Available to charge after timeslot date.</span>
                  </span>
                )}
                <span className="flex flex-row items-center gap-1 text-xs text-gray-700">
                  <HiOutlineInformationCircle size={22} />
                  <span>Charging the no show fee will send an invoice to the user/parent's email</span>
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-1 border rounded-lg py-2 px-4 w-full h-auto">
              <button
                className="flex flex-row gap-1 items-center"
                onClick={(e) => {
                  e.stopPropagation()
                  setCancelationFee(cancelationFee !== undefined ? undefined : { amount: 40, window: Duration.fromMillis(DAY_OFFSET * 2) })
                }}
              >
                <Checkbox readOnly checked={cancelationFee !== undefined} />
                <span>Short Notice Booking Fee</span>
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
        {previewTimeslot && (
          <div className="flex flex-col w-full gap-4 items-center">
            <span className="text-xl">Timeslot Confirmation Previews</span>
            <div className="flex flex-col rounded-lg border px-4 py-2 w-full">
              <div className="flex flex-row border-b-2">
                <span className="text-xl font-medium">Confirm Timeslot Selection</span>
              </div>
              <div className="text-center flex flex-col">
                <span><b>Registration for Timeslot: {timeslot.start.toLocaleDateString('en-us', { timeZone: 'America/Chicago' })} at {formatTime(timeslot.start, { timeString: true })} - {formatTime(timeslot.end, { timeString: true })}</b></span>
                <span>Make sure that this is the right timeslot for you, since you only can reserve one timeslot!</span>
                {timeslot.cancelationFee && (
                  <span>Booking this timeslot within <b>{timeslot.cancelationFee.window.as('hours')}</b> hours of the selected date will incur an additional short notice booking fee of <b>${timeslot.cancelationFee.amount}</b>.</span>
                )}
                {timeslot.noshowFee && (
                  <span>Please attend your reserved timeslot on time otherwise you will be charged a <b>${timeslot.noshowFee}</b> no show fee.</span>
                )}
                <div  className="w-full border my-2"/>
                {(timeslot.cancelationFee !== undefined || timeslot.noshowFee !== undefined) && (
                  <>
                    <span className="italic text-sm text-gray-500 text-start">Payment information will be collected on following screen which will be subject to charges in the following cases:</span>
                    {timeslot.cancelationFee && (<span className="italic text-sm text-gray-500 text-start">&bull; Short notice booking (immediate) for booking within {timeslot.cancelationFee.window.as('hours')} hours</span>)}
                    {timeslot.noshowFee && (<span className="italic text-sm text-gray-500 text-start">&bull; No show fee (processed within 7 days of timeslot date).</span>)}
                  </>
                )}
                {(timeslot.noshowFee || timeslot.cancelationFee) && (
                  <span className="italic text-xs text-gray-500 text-start">Please note that charges are subject to a 2% platform service charge with a maximum charge of $10 to help keep our platform running.</span>
                )}
                <span className="italic text-sm text-gray-500 mt-4 border px-2 py-1 rounded-lg">Additional fields will display here to send email notifications to user and additional participants</span>
              </div>
            </div>
            <div className="flex flex-col rounded-lg border px-4 py-2 w-full">
              <div className="flex flex-row border-b-2">
                <span className="text-xl font-medium">Confirm Unregistration</span>
              </div>
              <div className="text-center flex flex-col pt-2 pb-8">
                <span><b>Unregistration for Timeslot: {timeslot.start.toLocaleDateString('en-us', { timeZone: 'America/Chicago' })} at {formatTime(timeslot.start, { timeString: true })} - {formatTime(timeslot.end, { timeString: true })}</b></span>
                <span>Are you sure you want to unregister from this timeslot?</span>
              </div>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <div className={`grid grid-cols-${previewTimeslot ? '3' : '2'} justify-items-end w-full items-center`}>
          <div className="flex flex-row justify-between gap-4 items-center col-start-2">
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