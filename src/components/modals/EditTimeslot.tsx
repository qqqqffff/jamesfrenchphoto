import { Dispatch, FC, SetStateAction, useEffect, useState } from "react";
import { ModalProps } from ".";
import { Participant, Segment, Timeslot, UserTag } from "../../types";
import { Alert, Button, Checkbox, Modal, TextInput } from "flowbite-react";
import { DAY_OFFSET, textInputTheme } from "../../utils";
import { InfiniteData, UseInfiniteQueryResult, useMutation, useQuery } from "@tanstack/react-query";
import { DeleteTimeslotMutationParams, SendTimeslotConfirmationParams, TimeslotService, UpdateTimeslotMutationParams } from "../../services/timeslotService";
import { GetAllParticipantsData, UserService } from "../../services/userService";
import { CustomDatePicker } from "../common/CustomDatePicker";
import { TagPicker } from "../common/TagPicker";
import { deriveWindow, TimeSegmentBar } from "../common/TimeSegmentBar";
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
import { ComponentNotification } from "../../types";
import { v4 } from 'uuid'
import { TimeslotRegistration } from "../timeslot/TimeslotRegistration";
import { retrieveTimeslotOrderTransactionType, timeslotIdInvoiceIdCompare } from "../../functions/paymentFunctions";
import validator from 'validator'

interface EditTimeslotModalProps extends ModalProps {
  TimeslotService: TimeslotService,
  UserService: UserService,
  PaymentService: PaymentService
  timeslot: Timeslot,
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
  const [topOffset, setTopOffset] = useState<number>(0)

  const [description, setDescription] = useState<string>(props.timeslot.description ?? '')
  const [activeTag, setActiveTag] = useState<UserTag | undefined>(props.timeslot.tag)
  const [participant, setParticipant] = useState<Participant | undefined>()
  const [noshowFee, setNoshowFee] = useState<number | undefined>(60)
  const [cancelationFee, setCancelationFee] = useState<{ amount: number, window: Duration } | undefined>({ amount: 40, window: Duration.fromMillis(DAY_OFFSET * 2) })
  
  const [additionalRecipients, setAdditionalRecipients] = useState<string[]>([])
  const [notify, setNotify] = useState(true)
  
  const [previewTimeslot, setPreviewTimeslot] = useState(false)

  const [modalNotifications, setModalNotifications] = useState<ComponentNotification[]>([])

  const userProfile = useQuery({
    ...props.UserService.getUserProfileByEmailQueryOptions(participant?.userEmail ?? '', {
      siParticipants: {
        siTimeslot: true
      },
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

  const userTimeslotOrders = useQuery({
    ...props.PaymentService.getTimeslotOrdersQueryOptions({
      timeslotId: props.timeslot.id,
      options: {
        logging: true,
        metric: true
      }
    })
  })
  
  const sendEmailConfirmation = useMutation({
    mutationFn: (params: SendTimeslotConfirmationParams) => props.TimeslotService.sendTimeslotConfirmation(params)
  })

  const deleteTimeslot = useMutation({
    mutationFn: (params: DeleteTimeslotMutationParams) => props.TimeslotService.deleteTimeslot(params)
  })

  useEffect(() => {
    const segment = convertTimeslotListToSegments([props.timeslot])
    setDescription(props.timeslot.description ?? '')
    setActiveTag(props.timeslot.tag)
    setParticipant(props.participants.find((participant) => participant.id === props.timeslot.participantId))
    setNoshowFee(props.timeslot.noshowFee)
    setCancelationFee(props.timeslot.cancelationFee)
    setSegment(segment)
    setTopOffset(deriveWindow(segment, 8).top)
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
    topOffset,
    segement,
    [timeslot]
  )[0]

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
        if(selectedTimeslot !== undefined) {
          const result = (
            //segment start inside of another segment
            (timeslot.start.getTime() < selectedTimeslot.start.getTime() && timeslot.end.getTime() > selectedTimeslot.start.getTime()) ||
            //segment end inside of another
            (timeslot.start.getTime() < selectedTimeslot.end.getTime() && timeslot.end.getTime() > selectedTimeslot.end.getTime()) ||
            //segment inside of another
            (timeslot.start.getTime() <= selectedTimeslot.start.getTime() && timeslot.end.getTime() >= selectedTimeslot.end.getTime())
          )
          
          return result
        }
        
        return false
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

  //7 days to edit after timeslot passes (still cannot change date)
  const disabledEdits = (
    DateTime.fromJSDate(props.timeslot.start).diffNow().toMillis() < 0 && 
    Math.abs(DateTime.fromJSDate(props.timeslot.start).diffNow().toMillis()) > Duration.fromObject({ days: 7 }).toMillis()
  )

  //cannot change date or register if date has passed
  const datechangeDisabled = DateTime.fromJSDate(props.timeslot.start).diffNow().toMillis() < 0

  const foundPayment: ('noshow' | 'cancelation')[] = (userTimeslotOrders.data ?? []).reduce((prev, cur) => {
    if(
      timeslotIdInvoiceIdCompare(cur.invoiceId, props.timeslot.id) &&
      retrieveTimeslotOrderTransactionType(cur.invoiceId) !== null
    ) {
      prev.push(retrieveTimeslotOrderTransactionType(cur.invoiceId)!)
    }
    return prev
  }, [] as ('noshow' | 'cancelation')[])
  
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
            setTopOffset={setTopOffset}
            disabled={datechangeDisabled}
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
                  disabled={datechangeDisabled}
                />
                <TextInput
                  theme={textInputTheme} 
                  placeholder="Timeslot Descripition..."
                  className=" placeholder:italic w-full min-w-[230px]"
                  sizing="md" 
                  disabled={disabledEdits}
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
                  disabled={disabledEdits}
                />  
              </div>
            )}
          />
        </div>
        <div className="flex flex-col w-full">
          <div className="grid grid-cols-2 place-items-center w-full gap-x-4">
            <div className="flex flex-col gap-1 self-center items-start justify-center relative border rounded-lg py-2 px-4 w-full">
              <ParticipantPicker 
                disabled={disabledEdits}
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
              <span className="font-medium text-lg">User/Parent:</span>
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
                disabled={disabledEdits}
                onClick={(e) => {
                  e.stopPropagation()
                  setNoshowFee(noshowFee !== undefined ? undefined : 40)
                }}
              >
                <Checkbox readOnly checked={noshowFee !== undefined} disabled={disabledEdits} />
                <span>No Show Fee</span>
              </button>
              {noshowFee !== undefined && (
                <>
                  <div className="flex flex-row w-full justify-between">
                    <PriceInput
                      updateState={(v) => setNoshowFee(parseFloat(v))}
                      value={String(noshowFee)}
                      disabled={disabledEdits}
                    />
                    <Button
                      isProcessing={chargeNoShowFee.isPending}
                      size="xs"
                      className="px-2"
                      disabled={
                        (paymentMethods.data ?? []).length === 0 || 
                        chargeNoShowFee.isPending ||
                        userProfile.data === undefined ||
                        timeslot.start.getTime() > new Date().getTime() ||
                        disabledEdits ||
                        foundPayment.some((payment) => payment === 'noshow')
                      }
                      onClick={() => {
                        if(userProfile.data) {
                          chargeNoShowFee.mutateAsync({
                            timeslotId: props.timeslot.id,
                            userEmail: userProfile.data.email,
                            userId: '', //TODO: implement userid discovery
                            intent: {
                              type: 'timeslot',
                              timeslotId: props.timeslot.id,
                              amount: noshowFee ?? 0,
                            }
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
                                ): (response.error ?? 'Unexpected error occured.'),
                                status: 'Error',
                                createdAt: new Date(),
                                autoClose: null
                              }])
                            }
                          }).catch(() => {
                            setModalNotifications(prev => [...prev, {
                              id: v4(),
                              message: 'Unexpected error occured.',
                              status: 'Error',
                              createdAt: new Date(),
                              autoClose: null
                            }])
                          })
                        }
                      }}
                    >Charge Fee</Button>
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    {userProfile.data === undefined ? (
                      <span className="flex flex-row items-center gap-1 text-red-500 text-xs">
                        <HiOutlineExclamationTriangle size={22} />
                        <span>Registration is required to charge.</span>
                      </span>
                    ) : (paymentMethods.isFetching ? (
                      <span className="flex flex-row items-center text-gray-500 text-xs">
                        <HiOutlineInformationCircle size={22} className="me-1" />
                        <span>Retrieving user payment methods</span>
                        <Loading />
                      </span>
                    ) : ((paymentMethods.data ?? []).length === 0 && (
                      <span className="flex flex-row items-center gap-1 text-red-500 text-xs">
                        <HiOutlineExclamationTriangle size={22} />
                        <span>No saved payment methods.</span>
                      </span>
                    )))}
                    {timeslot.start.getTime() > new Date().getTime() ? (
                      <span className="flex flex-row items-center gap-1 text-red-500 text-xs">
                        <HiOutlineExclamationTriangle size={22} />
                        <span>Available to charge after timeslot date.</span>
                      </span>
                    ) : (disabledEdits && (
                      <span className="flex flex-row items-center gap-1 text-red-500 text-xs">
                        <HiOutlineExclamationTriangle size={22} />
                        <span>7 day window to charge fee has past.</span>
                      </span>
                    ))}
                    {foundPayment.some((payment) => payment === 'noshow') && (
                      <span className="grid grid-flow-col items-center gap-1 text-xs text-gray-700">
                        <HiOutlineInformationCircle size={22} />
                        <span>${timeslot.noshowFee} no show fee has been charged for {formattedTimeslotOwnerName}.</span>
                      </span>
                    )}
                    <span className="grid grid-flow-col items-center gap-1 text-xs text-gray-700">
                      <HiOutlineInformationCircle size={22} />
                      <span>Charging the no show fee will send an invoice to the user/parent's email.</span>
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-col gap-1 border rounded-lg py-2 px-4 w-full h-auto">
              <button
                className="flex flex-row gap-1 items-center"
                disabled={disabledEdits}
                onClick={(e) => {
                  e.stopPropagation()
                  setCancelationFee(cancelationFee !== undefined ? undefined : { amount: 40, window: Duration.fromMillis(DAY_OFFSET * 2) })
                }}
              >
                <Checkbox readOnly checked={cancelationFee !== undefined} disabled={disabledEdits} />
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
                      type="number"
                      autoComplete="false"
                      disabled={disabledEdits}
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
                      disabled={disabledEdits}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          {participant !== undefined && !datechangeDisabled && (
            <NotificationComponent 
              setNotify={setNotify}
              email={participant.userEmail}
              notify={notify}
              recipients={additionalRecipients}
              baseRecipients={participant.contact && participant.email && validator.isEmail(participant.email) ? [participant.email] : []}
              setRecipients={setAdditionalRecipients}
            />
          )}
        </div>
        {previewTimeslot && (
          <div className="flex flex-col w-full gap-4 items-center">
            <span className="text-xl">Timeslot Confirmation Previews</span>
            <TimeslotRegistration 
              timeslot={timeslot}
              type="Registration"
              preview={{
                preview: true
              }}
            />
            <TimeslotRegistration
              timeslot={timeslot}
              type="Unregistration"
              preview={{
                preview: true
              }}
            />
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <div className={`grid grid-cols-${previewTimeslot ? '3' : '2'} w-full items-center`}>
          <div className="flex flex-row justify-between gap-4 items-center col-start-2 w-full">
            <span className="flex flex-row gap-1 items-center text-sm">
              {calculateOverlap !== undefined && (
                <>
                  <HiOutlineExclamationTriangle size={32} className={`${calculateOverlap == 'emergency' ? 'fill-red-400' : 'fill-yellow-400'}`}/>
                  <span className={`
                    italic 
                    ${calculateOverlap === 'emergency' ? 'text-red-400' : 'text-yellow-400'}
                  `}>The new date overlaps with an existing timeslot{calculateOverlap == 'emergency' && ' with a registration'}</span>
                </>
              )}
            </span>
            <div className="flex flex-row gap-2 items-center">
              <Button
                color="red"
                isProcessing={deleteTimeslot.isPending}
                disabled={datechangeDisabled}
                onClick={() => {
                  deleteTimeslot.mutateAsync({
                    timeslot: props.timeslot
                  }).then(() => {
                    props.parentUpdateParticipants(participants => participants.map((participant) => participant.id === props.timeslot.participantId ? ({
                      ...participant,
                      timeslot: (participant.timeslot ?? []).filter((timeslot) => timeslot.id !== props.timeslot.id)
                    }) : participant))
                    props.parentUpdateTags(tags => tags.map((tag) => tag.id === props.timeslot.tag?.id ? ({
                      ...tag,
                      timeslots: (tag.timeslots ?? []).filter((timeslot) => timeslot.id !== props.timeslot.id)
                    }) : tag))
                    props.parentUpdateTimeslots(timeslots => timeslots.filter((timeslot) => timeslot.id !== props.timeslot.id))
                    props.onClose()
                  })
                }}
              >Delete</Button>
              <Button
                onClick={() => {
                  const timeslot = selectedTimeslot
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
                      sendEmailConfirmation.mutateAsync({
                        timeslotId: props.timeslot.id,
                        bypassTagValidation: true,
                        participantId: participant.id,
                        userEmail: userProfile.data.email,
                        additionalRecipients: additionalRecipients,
                        options: {
                          logging: true
                        }
                      }).then((response) => {
                        if(response.status === 'Success') {
                          const successId = v4()
                          setModalNotifications(prev => [...prev, {
                            id: successId,
                            message: 'Confirmation sent to participant.',
                            status: 'Success',
                            createdAt: new Date(),
                            autoClose: setTimeout(() => setModalNotifications(prev => prev.filter((notification) => notification.id !== successId)), 15000)
                          }])
                        }
                        else {
                          setModalNotifications(prev => [...prev, {
                            id: v4(),
                            message: response.error ?? 'Unexpected Error occured.',
                            status: 'Error',
                            createdAt: new Date(),
                            autoClose: null
                          }])
                        }
                      }).catch(() => {
                        setModalNotifications(prev => [...prev, {
                          id: v4(),
                          message: 'Unexpected error occured.',
                          status: 'Error',
                          createdAt: new Date(),
                          autoClose: null
                        }])
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
                  (selectedTimeslot !== undefined && timeslotListComparison([selectedTimeslot], [props.timeslot])) ||
                  updateTimeslot.isPending || 
                  sendEmailConfirmation.isPending ||
                  disabledEdits
                )}
              >
                Update
              </Button>
              <Button color="light" onClick={() => setPreviewTimeslot(!previewTimeslot)}>{previewTimeslot ? 'Close ' : ''}Preview</Button>
              <Button color="light" onClick={() => props.onClose()}>Done</Button>
            </div>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  )
}