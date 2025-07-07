import { Dispatch, FC, SetStateAction, useEffect, useState } from "react";
import { ModalProps } from ".";
import { Button, Dropdown, Label, Modal, RangeSlider, TextInput } from "flowbite-react";
import { DAY_OFFSET, defaultColumnColors, getTimes, textInputTheme } from "../../utils";
import { Timeslot, UserTag } from "../../types";
import { useMutation, UseQueryResult } from "@tanstack/react-query";
import { createTimeslotsMutation, CreateTimeslotsMutationParams, deleteTimeslotsMutation, DeleteTimeslotsMutationParams } from "../../services/timeslotService";
import { v4 } from 'uuid'
import { TagPicker } from "../admin/package/TagPicker";

interface CreateTimeslotModalProps extends ModalProps {
  day: Date;
  timeslots: Timeslot[]
  timeslotQuery: UseQueryResult<Timeslot[] | undefined, Error>
  tags: UserTag[]
  parentUpdateTimeslots: Dispatch<SetStateAction<Timeslot[]>>
}

export const CreateTimeslotModal: FC<CreateTimeslotModalProps> = (props: CreateTimeslotModalProps) => {
  const [startTime, setStartTime] = useState<string | Date>('Select Start Time')
  const [endTime, setEndTime] = useState<string | Date>('Select End Time')
  const [increment, setIncrement] = useState<number>(30)
  const [previewTimeslots, setPreviewTimeslots] = useState<Timeslot[]>([])
  const [selectedTimeslots, setSelectedTimeslots] = useState<Timeslot[]>(props.timeslots)
  const [description, setDescription] = useState<string>('')
  const [selectedTag, setSelectedTag] = useState<UserTag>()

  const createTimeslot = useMutation({
    mutationFn: (params: CreateTimeslotsMutationParams) => createTimeslotsMutation(params)
  })

  const deleteTimeslot = useMutation({
    mutationFn: (params: DeleteTimeslotsMutationParams) => deleteTimeslotsMutation(params)
  })

  useEffect(() => {
    const timeslotData = props.timeslots
    let startTime: string | Date = 'Select Start Time'
    let endTime: string | Date = 'Select End Time'
    let timeslots: Timeslot[] = []
    let increment = 30;
    if(timeslotData && timeslotData.length > 0) {
      startTime = timeslotData[0].start
      endTime = timeslotData[timeslotData.length - 1].end
      
      increment = (timeslotData[0].end.getTime() - timeslotData[0].start.getTime()) / (1000 * 60)
      let temp = startTime
      while(temp < endTime){
        const end = new Date(temp.getTime() + DAY_OFFSET * (increment / 1440))
        if(end > endTime) break;
        const existingTimeslot = timeslotData.find((timeslot) => 
          timeslot.start.getTime() === temp.getTime() && timeslot.end.getTime() === end.getTime()
        )
        const timeslot: Timeslot = {
          id: existingTimeslot ? existingTimeslot.id : v4(),
          start: temp,
          end: end,
          tag: existingTimeslot?.tag
        }
        timeslots.push(timeslot)
        temp = end
      }
    }
    setIncrement(increment)
    setStartTime(startTime)
    setEndTime(endTime)
    setSelectedTimeslots(timeslotData)
    setPreviewTimeslots(timeslots)
    setDescription(timeslotData[0]?.description ?? '')
  }, [
    props.timeslots,
    props.timeslotQuery,
  ])

  const times = getTimes(props.day)

  function submitForm(){
    //timeslots can only be created or deleted
    createTimeslot.mutate({
      timeslots: selectedTimeslots.filter((timeslot) => !props.timeslots.some((qTimeslot) => qTimeslot.id === timeslot.id)),
      options: {
        logging: true
      }
    })
    
    deleteTimeslot.mutate({
      timeslots: props.timeslots.filter((timeslot) => !selectedTimeslots.some((sTimeslot) => sTimeslot.id === timeslot.id)),
      options: {
        logging: true
      }
    })
    
    props.parentUpdateTimeslots(selectedTimeslots)
    resetState()
    props.onClose()
  }

  function resetState(){
    setStartTime('Select Start Time')
    setEndTime('Select End Time')
    setIncrement(30)
    setPreviewTimeslots([])
    setSelectedTimeslots([])
  }

  const startEnabled = (time: Date) => (
    typeof startTime === 'string' || (
      typeof endTime !== 'string' && time.getTime() < endTime.getTime()
    )
  )

  const endEnabled = (time: Date) => {
    return (
      (typeof endTime === 'string' && typeof startTime !== 'string' && time.getTime() > startTime.getTime()) || (
        typeof startTime !== 'string' && time.getTime() > startTime.getTime()
      )
    )
  }

  return (
    <Modal 
      show={props.open} 
        onClose={() => {
        resetState()
        props.onClose()
      }}
    >
      <Modal.Header>{props.timeslots.length > 0 ? 'Update Timeslots' : 'Create New Timeslots'}</Modal.Header>
      <Modal.Body>
        <div className="flex flex-col">
          <TextInput
            theme={textInputTheme} 
            placeholder="Timeslot Descripition..."
            className="max-w-[400px] min-w-[400px] placeholder:italic self-center mb-4"
            sizing="md" 
            onChange={(event) => {
                setDescription(event.target.value)
            }}
            value={description}
            name="Timeslot Description"
          />
                
                
                {/* TODO: scrollable date arrows */}
                
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="flex flex-col text-start ">
              <span className="text-lg ms-2">Date:</span>
              <span className="text-2xl mb-4 underline underline-offset-4">{props.day.toLocaleDateString()}</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex flex-col gap-1">
                <Label className="ms-2 font-medium text-lg" htmlFor="name">Start:</Label>
                <Dropdown size='sm' placement="bottom-start" label={typeof startTime === 'string' ? startTime : startTime.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })} color="light" id="name" name="name" className="overflow-auto max-h-[250px]">
                    {times.map((time, index) => { 
                      return (
                        <Dropdown.Item 
                          className='disabled:text-gray-400 disabled:cursor-not-allowed'
                          disabled={!startEnabled(time)}
                          key={index} 
                          onClick={() => {
                            let timeslots: Timeslot[] = [...previewTimeslots]
                            
                            if(typeof endTime !== 'string'){
                              let temp = time
                              while(temp.getTime() < endTime.getTime()){
                                //end incremented by the increment + offseted start (temp)
                                const end = new Date(temp.getTime() + DAY_OFFSET * (increment / 1440))
                                if(end.getTime() > endTime.getTime()) break;
                                //if dne in current array push to array
                                if(!timeslots.some((timeslot) => (
                                  timeslot.start.getTime() === temp.getTime() && 
                                  timeslot.end.getTime() === end.getTime()
                                ))) {
                                  const timeslot: Timeslot = {
                                    id: v4(),
                                    start: temp,
                                    end: end,
                                  }
                                  timeslots.push(timeslot)
                                }
                                
                                temp = end
                              }
                              //trim start
                              timeslots = timeslots.filter((timeslot) => timeslot.start.getTime() >= time.getTime())
                            }

                            const updatedSelectedTimeslots: Timeslot[] = []
                            //check selected timeslots
                            for(let i = 0; i < selectedTimeslots.length; i++) {
                              if(timeslots.some((timeslot) => (
                                timeslot.start.getTime() === selectedTimeslots[i].start.getTime() &&
                                timeslot.end.getTime() === selectedTimeslots[i].end.getTime()
                              ))) {
                                updatedSelectedTimeslots.push(selectedTimeslots[i])
                              }
                            }

                            setStartTime(time)
                            setPreviewTimeslots(timeslots.sort((a, b) => a.start.getTime() - b.start.getTime()))
                            setSelectedTimeslots(updatedSelectedTimeslots.sort((a, b) => a.start.getTime() - b.start.getTime()))
                          }}
                        >{time.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })}</Dropdown.Item>
                      )
                    })}
                </Dropdown>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="ms-2 font-medium text-lg" htmlFor="name">End:</Label>
              <Dropdown size='sm' placement="bottom-end" label={typeof endTime === 'string' ? endTime : endTime.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })} color="light" id="name" name="name" disabled={typeof startTime == 'string'} className="overflow-auto max-h-[250px]">
                {times.map((time, index) => { 
                  return (
                      <Dropdown.Item 
                        key={index} 
                        className='disabled:text-gray-400 disabled:cursor-not-allowed' 
                        disabled={!endEnabled(time)} 
                        onClick={() => {
                          let timeslots: Timeslot[] = [...previewTimeslots]
                          
                          if(typeof startTime !== 'string'){
                            let temp = startTime
                            let startOffset = 0
                            while(temp < time){
                              //end incremented by the increment + offseted start (temp)
                              const end = new Date(temp.getTime() + DAY_OFFSET * (increment / 1440))
                              //break if greater
                              if(end > time) break;
                              //if does not already exist push to array
                              if(!timeslots.some((ts) => (
                                temp.getTime() === ts.start.getTime() && end.getTime() === ts.end.getTime()
                              ))) {
                                const timeslot: Timeslot = {
                                  id: v4(),
                                  start: temp,
                                  end: end,
                                }
                                timeslots.push(timeslot)
                              }
                              
                              temp = end
                              startOffset++;
                            }
                            //trim end
                            timeslots = timeslots.filter((timeslot) => timeslot.end.getTime() <= time.getTime())
                          }

                          const updatedSelectedTimeslots: Timeslot[] = []
                          //check selected timeslots
                          for(let i = 0; i < selectedTimeslots.length; i++) {
                            if(timeslots.some((timeslot) => (
                              timeslot.start.getTime() === selectedTimeslots[i].start.getTime() &&
                              timeslot.end.getTime() === selectedTimeslots[i].end.getTime()
                            ))) {
                              updatedSelectedTimeslots.push(selectedTimeslots[i])
                            }
                          }

                          setEndTime(time)
                          setPreviewTimeslots(timeslots.sort((a, b) => a.start.getTime() - b.start.getTime()))
                          setSelectedTimeslots(updatedSelectedTimeslots.sort((a, b) => a.start.getTime() - b.start.getTime()))
                        }}
                      >{time.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })}</Dropdown.Item>
                  )})
                }
              </Dropdown>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="ms-2 font-medium text-lg" htmlFor="name">Tag:</Label>
              <TagPicker 
                tags={props.tags}
                parentPickTag={(tag) => setSelectedTag(tag)}
                pickedTag={selectedTag ? [selectedTag] : undefined}
                allowMultiple={false}
                className="max-w-[150px] border rounded-lg px-2 py-1.5"
              />
            </div>
          </div>
        </div>
        {
          props.timeslots.length > 0 ? (
            <div className="flex flex-col w-full items-center justify-center">
              <span>Timeslot Increment: {increment} mins</span>
            </div> 
          ) : (
            <div className="flex flex-col w-full items-center justify-center">
              <span>Timeslot Increment: {increment} mins</span>
              <RangeSlider 
                min={15} 
                max={60} 
                step={15} 
                defaultValue={increment} 
                onChange={(event) => {
                  const increment = event.target.valueAsNumber
                  let timeslots: Timeslot[] = []
                  if(typeof startTime !== 'string' && typeof endTime !== 'string'){
                      let temp = startTime
                      while(temp < endTime){
                          const end = new Date(temp.getTime() + DAY_OFFSET * (increment / 1440))
                          if(end > endTime) break;
                          const timeslot: Timeslot = {
                              id: '',
                              start: temp,
                              end: end,
                          }
                          timeslots.push(timeslot)
                          temp = end
                      }
                  }
                  setIncrement(increment)
                  setPreviewTimeslots(timeslots)
                  setSelectedTimeslots([])
                }} 
                disabled={typeof startTime === 'string' || typeof endTime === 'string'} 
                className="w-[60%]"
              />
            </div>
          )
        }
        {previewTimeslots.length > 0 ? (
          <div className="w-full flex flex-col justify-center items-center mt-4 gap-3">
            <span className="underline underline-offset-2">Timeslots for selected range:</span>
            <div className="grid grid-cols-4 w-full gap-2 max-h-[200px] overflow-auto border-2 border-gray-500 rounded-lg p-2">
              {previewTimeslots.map((timeslot, index) => {
                const selected = selectedTimeslots.find((ts) => timeslot.id === ts.id)
                
                return (
                    <button 
                      key={index} 
                      type="button" 
                      className={`
                        flex flex-row border-[1.5px] py-1.5 rounded-lg 
                        border-black items-center justify-center hover:bg-gray-300 
                        ${selected ? 
                            selected.tag && selected.tag.color ? `bg-${defaultColumnColors[selected.tag.color].bg}` : 'bg-gray-200' 
                          : ''
                        }
                      `}
                      onClick={() => {
                          if(selected !== undefined && selected.tag?.id === selectedTag?.id){
                            setSelectedTimeslots(selectedTimeslots.filter((ts) => ts.id !== timeslot.id))
                          }
                          else if(selected !== undefined && selected.tag?.id !== selectedTag?.id) {
                            setSelectedTimeslots(selectedTimeslots.map((timeslot) => (timeslot.id === selected.id ? ({
                              ...selected,
                              tag: selectedTag
                            }) : timeslot )))
                          }
                          else {
                            setSelectedTimeslots([...selectedTimeslots, {
                              ...timeslot,
                              tag: selectedTag
                            }])
                          }
                      }}>{timeslot.start.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })}</button>
                  )})}
            </div>
            <div className="flex flex-row w-full justify-end">
              <Button color="light" className="border-gray-700 me-4"  type="button" onClick={() => setSelectedTimeslots(previewTimeslots.map((timeslot) => ({...timeslot, tag: selectedTag})))}>Select All</Button>
            </div>
          </div>
        ) : (
          <span>No timeslots for the selected range</span>
        )}
            
        <div className="flex flex-row justify-end border-t mt-4">
          <Button 
            className="text-xl w-[40%] max-w-[8rem] mt-4" 
            type="submit" 
            onClick={() => submitForm()}
          >{props.timeslots.length > 0 ? 'Update' : 'Create'}</Button>
        </div>
      </Modal.Body>
    </Modal>
  )
}