import { Dispatch, FC, SetStateAction, useEffect, useState } from "react";
import { ModalProps } from ".";
import { Button, Checkbox, Modal, TextInput } from "flowbite-react";
import { DAY_OFFSET, formatTime, textInputTheme } from "../../utils";
import { Segment, Timeslot, UserTag } from "../../types";
import { InfiniteData, UseInfiniteQueryResult, useMutation } from "@tanstack/react-query";
import { TimeslotService, CreateTimeslotsMutationParams, DeleteTimeslotsMutationParams, UpdateTimeslotsMutationParams } from "../../services/timeslotService";
import { TagPicker } from "../common/TagPicker";
import { DateTime, Duration } from "luxon";
import { HiOutlineArrowRight, HiOutlineArrowLeft } from 'react-icons/hi'
import { UseNavigateResult } from "@tanstack/react-router";
import { TimeSegmentBar } from "../common/TimeSegmentBar";
import { GetAllUserTagsData } from "../../services/tagService";
import { convertSegmentListToTimeslots, convertTimeslotListToSegments, timeslotListComparison } from "../../functions/timeslotFunctions";
import { SlotComponent } from "../timeslot/Slot";
import { PriceInput } from "../common/PriceInput";
import { HiExclamationTriangle } from "react-icons/hi2";

interface CreateTimeslotModalProps extends ModalProps {
  TimeslotService: TimeslotService,
  day: Date;
  navigate: UseNavigateResult<string>
  timeslots: Timeslot[]
  tags: UserTag[],
  tagsQuery?: UseInfiniteQueryResult<InfiniteData<GetAllUserTagsData, unknown>, Error>
  parentUpdateTimeslots: Dispatch<SetStateAction<Timeslot[]>>
  parentUpdateTags: Dispatch<SetStateAction<UserTag[]>>
}

//TODO: use timeslot query to show loading
export const CreateTimeslotModal: FC<CreateTimeslotModalProps> = (props: CreateTimeslotModalProps) => {
  const [segments, setSegments] = useState<Segment[]>([])
  const [noshowFee, setNoshowFee] = useState<number | undefined>(60)
  const [cancelationFee, setCancelationFee] = useState<{ amount: number, window: Duration } | undefined>({ amount: 40, window: Duration.fromMillis(DAY_OFFSET * 2) })
  const [description, setDescription] = useState<string>('')
  const [selectedTag, setSelectedTag] = useState<UserTag>()
  const [previewTimeslot, setPreviewTimeslot] = useState<Timeslot>()
  const [selectedSegment, setSelectedSegment] = useState<Segment | undefined>()

  const createTimeslot = useMutation({
    mutationFn: (params: CreateTimeslotsMutationParams) => props.TimeslotService.createTimeslotsMutation(params)
  })

  const updateTimeslot = useMutation({
    mutationFn: (params: UpdateTimeslotsMutationParams) => props.TimeslotService.updateTimeslotsMutation(params)
  })

  const deleteTimeslot = useMutation({
    mutationFn: (params: DeleteTimeslotsMutationParams) => props.TimeslotService.deleteTimeslotsMutation(params)
  })

  useEffect(() => {
    setSegments(convertTimeslotListToSegments(props.timeslots))
    setPreviewTimeslot(undefined)
    setCancelationFee({ amount: 40, window: Duration.fromMillis(DAY_OFFSET * 2) })
    setDescription('')
    setNoshowFee(60)
    setSelectedTag(undefined)
  }, [
    props.open
  ])

  useEffect(() => {
    if(selectedSegment) {
      setCancelationFee(selectedSegment.options?.cancelationFee)
      setDescription(selectedSegment.options?.description ?? '')
      setNoshowFee(selectedSegment.options?.noshowFee)
      setSelectedTag(selectedSegment.userTag)
    }
    else {
      setCancelationFee({ amount: 40, window: Duration.fromMillis(DAY_OFFSET * 2) })
      setDescription('')
      setNoshowFee(60)
      setSelectedTag(undefined)
    }
  }, [
    selectedSegment
  ])

  const selectedTimeslots = convertSegmentListToTimeslots(
    props.day,
    segments, 
    props.timeslots,
  )

  async function submitForm(){
    const newIntersectionTimeslots = selectedTimeslots.filter((timeslot) => props.timeslots.some((qTimeslot) => qTimeslot.id === timeslot.id))
    const oldIntersectionTimeslots = props.timeslots.filter((timeslot) => selectedTimeslots.some((qTimeslot) => qTimeslot.id === timeslot.id))
    const newTimeslots = selectedTimeslots.filter((timeslot) => !props.timeslots.some((qTimeslot) => qTimeslot.id === timeslot.id))
    const oldTimeslots = props.timeslots.filter((timeslot) => !selectedTimeslots.some((sTimeslot) => sTimeslot.id === timeslot.id))
    
    
    if(newTimeslots.length > 0) {
      createTimeslot.mutateAsync({
        timeslots: newTimeslots,
        options: {
          logging: true
        }
      })
    }

    if(newIntersectionTimeslots.length > 0 && oldIntersectionTimeslots.length > 0) {
      updateTimeslot.mutateAsync({
        //new timeslots intersection with old updated direction
        timeslots: newIntersectionTimeslots,
        //old direction intersection
        previousTimeslots: oldIntersectionTimeslots,
        options: {
          logging: true
        }
      })
    }

    if(oldTimeslots.length > 0) {
      deleteTimeslot.mutate({
        timeslots: oldTimeslots,
        options: {
          logging: true
        }
      })
    }
    
    props.parentUpdateTimeslots(selectedTimeslots)
    props.parentUpdateTags((prev) => prev.map((tag) => ({
      ...tag,
      timeslots: selectedTimeslots.filter((timeslot) => timeslot.tag?.id === tag.id)
    })))
    props.onClose()
  }

  const timeslotsWithParticipantsRemoved = props.timeslots.some((timeslot) => (
    (
      timeslot.participantId !== undefined ||
      timeslot.register !== undefined
    ) &&
    !selectedTimeslots.find((sTimeslot) => sTimeslot.id === timeslot.id)
  ))

  return (
    <Modal 
      show={props.open} 
      onClose={() => {
        props.onClose()
      }}
      size={previewTimeslot ? 'full' : "7xl"}
    >
      <Modal.Header>{props.timeslots.length > 0 ? 'Update Timeslots' : 'Create New Timeslots'}</Modal.Header>
      <Modal.Body className={`grid grid-cols-${previewTimeslot ? '3' : "2"} w-full gap-4 py-2`}>
        <div className="flex flex-col gap-2 w-full">
          <TimeSegmentBar 
            segments={segments}
            setSegments={setSegments}
            activeTag={selectedTag}
            activeOptions={{
              noshowFee: noshowFee,
              description: description,
              cancelationFee: cancelationFee
            }}
            individual={{
              individual: false,
              setSelectedSegement: setSelectedSegment,
              selectedSegment: selectedSegment
            }}
            header={(
              <div className="flex flex-row gap-4 items-center">
                <TextInput
                  theme={textInputTheme} 
                  autoComplete="off"
                  placeholder="Timeslot Descripition..."
                  className=" placeholder:italic w-full min-w-[300px]"
                  sizing="md" 
                  onChange={(event) => {
                    if(selectedSegment) {
                      setSegments(prev => prev.map((segment) => segment.id === selectedSegment.id ? ({
                        ...segment,
                        options: {
                          description: event.target.value
                        }
                      }) : segment))
                      setSelectedSegment({
                        ...selectedSegment,
                        options: {
                          ...selectedSegment.options,
                          description: event.target.value
                        }
                      })
                      setDescription(event.target.value)
                    }
                    else {
                      setDescription(event.target.value)
                    }
                  }}
                  value={description}
                  name="Timeslot Description"
                />
                <TagPicker 
                  tags={props.tags}
                  parentPickTag={(tag) => {
                    if(selectedSegment) {
                      setSegments(prev => prev.map((segment) => segment.id === selectedSegment.id ? ({
                        ...segment,
                        userTag: tag
                      }) : segment))
                      setSelectedSegment({
                        ...selectedSegment,
                        userTag: tag
                      })
                      setSelectedTag(tag)
                    }
                    else {
                      setSelectedTag(tag)
                    }
                  }}
                  pickedTag={selectedTag ? [selectedTag] : undefined}
                  allowMultiple={false}
                  small
                  tagQuery={props.tagsQuery}
                  placement="end"
                  allowClear
                />
              </div>
            )}
          />
        </div>
        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-row gap-3 items-center self-center">
            <button
              className="py-1 px-2 border rounded-lg cursor-pointer enabled:hover:border-gray-400 disabled:opacity-60"
              onClick={() => props.navigate({ to: '.', search: { date: DateTime.fromJSDate(new Date(props.day.getTime() - DAY_OFFSET)).toFormat('MM-dd-yyyy')}}) }
            >
              <HiOutlineArrowLeft size={20} />
            </button>
            <span className="text-xl self-center">{DateTime.fromJSDate(props.day).toFormat('LLL dd, yyyy')}</span>
            <button 
              className="py-1 px-2 border rounded-lg cursor-pointer hover:border-gray-400"
              onClick={() => props.navigate({ to: '.', search: { date: DateTime.fromJSDate(new Date(props.day.getTime() + DAY_OFFSET)).toFormat('MM-dd-yyyy')}}) }
            >
              <HiOutlineArrowRight size={20} className="text-gray-900"/>
            </button>
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
          {selectedTimeslots.length > 0 ? (
            <div className="w-full flex flex-col justify-center items-center gap-3">
              <span className="underline underline-offset-2">Timeslots Preview:</span>
              <div className="grid grid-cols-3 w-full gap-2 max-h-[400px] overflow-auto border p-2">
                {selectedTimeslots.map((timeslot, index) => {
                  const selected = previewTimeslot?.id === timeslot.id
                  return (
                    <button
                      key={index}
                      onClick={() => setPreviewTimeslot(timeslot)}
                    >
                      <SlotComponent 
                        className={`${selected ? 'bg-gray-100 hover:border-gray-400' : 'hover:bg-gray-100'}`}
                        timeslot={timeslot}
                      />  
                    </button>
                  )})}
              </div>
              <div className="flex flex-row w-full justify-end">
                <Button 
                  color="light" 
                  className="border-gray-700 me-4" 
                  type="button" 
                  onClick={() => setSegments([])}
                >Clear</Button>
              </div>
            </div>
          ) : (
            <div className="border rounded-lg w-full flex flex-row justify-center px-4 py-2">
              <span>No timeslots for the selected range</span>
            </div>
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
                <span><b>Registration for Timeslot: {previewTimeslot.start.toLocaleDateString('en-us', { timeZone: 'America/Chicago' })} at {formatTime(previewTimeslot.start, { timeString: true })} - {formatTime(previewTimeslot.end, { timeString: true })}</b></span>
                <span>Make sure that this is the right timeslot for you, since you only can reserve one timeslot!</span>
                {previewTimeslot.cancelationFee && (
                  <span>Booking this timeslot within <b>{previewTimeslot.cancelationFee.window.as('hours')}</b> hours of the selected date will incur an additional short notice booking fee of <b>${previewTimeslot.cancelationFee.amount}</b>.</span>
                )}
                {previewTimeslot.noshowFee && (
                  <span>Please attend your reserved timeslot on time otherwise you will be charged a <b>${previewTimeslot.noshowFee}</b> no show fee.</span>
                )}
                <div  className="w-full border my-2"/>
                {(previewTimeslot.cancelationFee !== undefined || previewTimeslot.noshowFee !== undefined) && (
                  <>
                    <span className="italic text-sm text-gray-500 text-start">Payment information will be collected on following screen which will be subject to charges in the following cases:</span>
                    {previewTimeslot.cancelationFee && (<span className="italic text-sm text-gray-500 text-start">&bull; Short notice booking (immediate) for booking within {previewTimeslot.cancelationFee.window.as('hours')} hours</span>)}
                    {previewTimeslot.noshowFee && (<span className="italic text-sm text-gray-500 text-start">&bull; No show fee (processed within 7 days of timeslot date).</span>)}
                  </>
                )}
                {(previewTimeslot.noshowFee || previewTimeslot.cancelationFee) && (
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
                <span><b>Unregistration for Timeslot: {previewTimeslot.start.toLocaleDateString('en-us', { timeZone: 'America/Chicago' })} at {formatTime(previewTimeslot.start, { timeString: true })} - {formatTime(previewTimeslot.end, { timeString: true })}</b></span>
                <span>Are you sure you want to unregister from this timeslot?</span>
              </div>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <div className={`grid grid-cols-${previewTimeslot ? '3' : '2'} justify-items-end w-full items-center`}>
          <div className="flex flex-row justify-between w-full items-center col-start-2">
            <div className="text-red-400 flex flex-row items-center gap-1 text-sm">
              {timeslotsWithParticipantsRemoved && (
                <>
                  <HiExclamationTriangle size={32} />
                  <div className="flex flex-col">
                    <span><b>Notice:</b> a Timeslot with a participant has been removed!</span>
                    <span>Continuing will <b>PERMANENTLY</b> delete this timeslot,</span>
                    <span>Effectively unregistering the participant</span>
                  </div>
                  
                </>
              )}
            </div>
            <Button 
              className={`text-xl w-full max-w-[8rem] h-fit`} 
              onClick={() => submitForm()}
              disabled={(
                selectedTimeslots.length === 0 || 
                timeslotListComparison(selectedTimeslots, props.timeslots) ||
                (createTimeslot.isPending || updateTimeslot.isPending || deleteTimeslot.isPending)
              )}
              isProcessing={createTimeslot.isPending || updateTimeslot.isPending || deleteTimeslot.isPending}
            >{props.timeslots.length > 0 ? 'Update' : 'Create'}</Button>
          </div>
          {previewTimeslot && (
            <Button 
              onClick={() => setPreviewTimeslot(undefined)}
              color='light'
              className="h-fit max-w-[8rem] text-xl whitespace-nowrap"
            >Close Preview</Button>
          )}
        </div>
      </Modal.Footer>
    </Modal>
  )
}