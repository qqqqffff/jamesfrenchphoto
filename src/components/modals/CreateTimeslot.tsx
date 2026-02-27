import { Dispatch, FC, SetStateAction, useEffect, useState } from "react";
import { ModalProps } from ".";
import { Button, Checkbox, Label, Modal, TextInput } from "flowbite-react";
import { DAY_OFFSET, textInputTheme } from "../../utils";
import { Segment, Timeslot, UserTag } from "../../types";
import { InfiniteData, UseInfiniteQueryResult, useMutation } from "@tanstack/react-query";
import { TimeslotService, CreateTimeslotsMutationParams, DeleteTimeslotsMutationParams, UpdateTimeslotsMutationParams } from "../../services/timeslotService";
import { TagPicker } from "../common/TagPicker";
import { DateTime, Duration } from "luxon";
import { HiOutlineArrowRight, HiOutlineArrowLeft } from 'react-icons/hi'
import { UseNavigateResult } from "@tanstack/react-router";
import { TimeSegmentBar } from "../common/TimeSegmentBar";
import { GetAllUserTagsData } from "../../services/tagService";
import { convertSegmentListToTimeslots, convertTimeslotListToSegments } from "../../functions/timeslotFunctions";
import { SlotComponent } from "../timeslot/Slot";
import { PriceInput } from "../common/PriceInput";

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

export const CreateTimeslotModal: FC<CreateTimeslotModalProps> = (props: CreateTimeslotModalProps) => {
  const [segments, setSegments] = useState<Segment[]>([])
  const [noshowFee, setNoshowFee] = useState<number | undefined>(60)
  const [cancelationFee, setCancelationFee] = useState<{ amount: number, window: Duration } | undefined>({ amount: 40, window: Duration.fromMillis(DAY_OFFSET * 2) })
  const [description, setDescription] = useState<string>('')
  const [selectedTag, setSelectedTag] = useState<UserTag>()

  const createTimeslot = useMutation({
    mutationFn: (params: CreateTimeslotsMutationParams) => props.TimeslotService.createTimeslotsMutation(params)
  })

  const updateTimeslot = useMutation({
    mutationFn: (params: UpdateTimeslotsMutationParams) => props.TimeslotService.updateTimeslotMutation(params)
  })

  const deleteTimeslot = useMutation({
    mutationFn: (params: DeleteTimeslotsMutationParams) => props.TimeslotService.deleteTimeslotsMutation(params)
  })

  useEffect(() => {
    setSegments(convertTimeslotListToSegments(props.timeslots))
  }, [
    props.open
  ])

  function submitForm(){
    console.log(props.timeslots, selectedTimeslots)
    const newIntersectionTimeslots = selectedTimeslots.filter((timeslot) => props.timeslots.some((qTimeslot) => qTimeslot.id === timeslot.id))
    const oldIntersectionTimeslots = props.timeslots.filter((timeslot) => selectedTimeslots.some((qTimeslot) => qTimeslot.id === timeslot.id))
    const newTimeslots = selectedTimeslots.filter((timeslot) => !props.timeslots.some((qTimeslot) => qTimeslot.id === timeslot.id))
    const oldTimeslots = props.timeslots.filter((timeslot) => !selectedTimeslots.some((sTimeslot) => sTimeslot.id === timeslot.id))
    
    
    createTimeslot.mutate({
      timeslots: newTimeslots,
      options: {
        logging: true
      }
    })

    updateTimeslot.mutate({
      //new timeslots intersection with old updated direction
      timeslots: newIntersectionTimeslots,
      //old direction intersection
      previousTimeslots: oldIntersectionTimeslots,
      options: {
        logging: true
      }
    })
    
    deleteTimeslot.mutate({
      timeslots: oldTimeslots,
      options: {
        logging: true
      }
    })
    
    props.parentUpdateTimeslots(selectedTimeslots)
    props.parentUpdateTags((prev) => prev.map((tag) => ({
      ...tag,
    })))
    props.onClose()
  }

  
  const selectedTimeslots = convertSegmentListToTimeslots(
    props.day,
    segments, 
    props.timeslots,
    {
      noshowFee: noshowFee,
      description: description,
      cancelationFee: cancelationFee
    }
  )

  return (
    <Modal 
      show={props.open} 
      onClose={() => {
        props.onClose()
      }}
    >
      <Modal.Header>{props.timeslots.length > 0 ? 'Update Timeslots' : 'Create New Timeslots'}</Modal.Header>
      <Modal.Body>
        <div className="flex flex-col gap-2">
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
          <TimeSegmentBar 
            segments={segments}
            setSegments={setSegments}
            activeTag={selectedTag}
            header={(
              <div className="flex flex-col self-center">
                <Label className="font-medium text-lg" htmlFor="timeslotDescription">Description:</Label>
                <div className="flex flex-row gap-4 items-center">
                  <TextInput
                    id='timeslotDescription'
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
                    parentPickTag={(tag) => setSelectedTag(tag)}
                    pickedTag={selectedTag ? [selectedTag] : undefined}
                    allowMultiple={false}
                    small
                    tagQuery={props.tagsQuery}
                    placement="end"
                    allowClear
                  />
                </div>
              </div>
            )}
          />
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
          {selectedTimeslots.length > 0 ? (
            <div className="w-full flex flex-col justify-center items-center gap-3">
              <span className="underline underline-offset-2">Timeslots Preview:</span>
              <div className="grid grid-cols-3 w-full gap-2 max-h-[250px] overflow-auto border-2 border-gray-500 rounded-lg p-2">
                {selectedTimeslots.map((timeslot, index) => {
                  console.log(timeslot.tag)
                  return (
                    <SlotComponent 
                      key={index}
                      timeslot={timeslot}
                    />  
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
        <div className="flex flex-row justify-end border-t mt-4">
          <Button 
            className="text-xl w-[40%] max-w-[8rem] mt-4" 
            type="submit" 
            onClick={() => submitForm()}
            disabled={selectedTimeslots.length === 0}
          >{props.timeslots.length > 0 ? 'Update' : 'Create'}</Button>
        </div>
      </Modal.Body>
    </Modal>
  )
}