import { Dispatch, FC, SetStateAction, useEffect, useState } from "react";
import { ModalProps } from ".";
import { Button, Dropdown, Label, Modal, RangeSlider, TextInput } from "flowbite-react";
import { DAY_OFFSET, getTimes, textInputTheme } from "../../utils";
import { Timeslot } from "../../types";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createTimeslotsMutation, CreateTimeslotsMutationParams, deleteTimeslotsMutation, DeleteTimeslotsMutationParams, getAllTimeslotsByDateQueryOptions } from "../../services/timeslotService";
import { v4 } from 'uuid'

interface CreateTimeslotModalProps extends ModalProps {
  day: Date;
  parentUpdateTimeslots: Dispatch<SetStateAction<Timeslot[]>>
}

//TODO: add tag selection
export const CreateTimeslotModal: FC<CreateTimeslotModalProps> = ({open, onClose, day, parentUpdateTimeslots }) => {
  const [startTime, setStartTime] = useState<string | Date>('Select Start Time')
  const [endTime, setEndTime] = useState<string | Date>('Select End Time')
  const [increment, setIncrement] = useState<number>(30)
  const [timeslots, setTimeslots] = useState<Timeslot[]>([])
  const [selectedTimeslots, setSelectedTimeslots] = useState<Timeslot[]>([])
  const [description, setDescription] = useState<string>('')

  //get all timeslots by date
  const activeTimeslots = useQuery(getAllTimeslotsByDateQueryOptions(day))

  const createTimeslot = useMutation({
    mutationFn: (params: CreateTimeslotsMutationParams) => createTimeslotsMutation(params)
  })

  const deleteTimeslot = useMutation({
    mutationFn: (params: DeleteTimeslotsMutationParams) => deleteTimeslotsMutation(params)
  })

  useEffect(() => {
    const timeslotData = activeTimeslots.data
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
        const timeslot: Timeslot = {
          id: v4(),
          start: temp,
          end: end,
        }
        timeslots.push(timeslot)
        temp = end
      }
    }
    setIncrement(increment)
    setStartTime(startTime)
    setEndTime(endTime)
    setTimeslots(timeslots)
    setSelectedTimeslots(timeslotData ?? [])
  }, [
    activeTimeslots.data,
  ])

  const times = getTimes(day)

  function submitForm(){
    //timeslots can only be created or deleted
    createTimeslot.mutate({
      timeslots: selectedTimeslots.filter((timeslot) => !activeTimeslots.data?.some((qTimeslot) => qTimeslot.id === timeslot.id)),
      options: {
        logging: true
      }
    })
    
    deleteTimeslot.mutate({
      timeslots: (activeTimeslots.data ?? []).filter((timeslot) => !selectedTimeslots.some((sTimeslot) => sTimeslot.id === timeslot.id)),
      options: {
        logging: true
      }
    })
    
    parentUpdateTimeslots(selectedTimeslots)
    resetState()
    onClose()
  }

  function resetState(){
    setStartTime('Select Start Time')
    setEndTime('Select End Time')
    setIncrement(30)
    setTimeslots([])
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
    <Modal show={open} onClose={() => {
      resetState()
      onClose()
    }}>
      <Modal.Header>{(activeTimeslots.data ?? []).length > 0 ? 'Update Timeslots' : 'Create New Timeslots'}</Modal.Header>
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
                
          <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="flex flex-col text-start ">
                  <span className="text-lg ms-2">Date:</span>
                  <span className="text-2xl mb-4 underline underline-offset-4">{day.toLocaleDateString("en-us", { timeZone: 'America/Chicago' })}</span>
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
                                  let timeslots: Timeslot[] = []
                                  
                                  //TODO: recalculate the timeslots that as a result of the time change
                                  if(typeof endTime !== 'string'){
                                    let temp = time
                                    while(temp.getTime() < new Date(endTime).getTime()){
                                      const end = new Date(temp.getTime() + DAY_OFFSET * (increment / 1440))
                                      if(end.getTime() > new Date(endTime).getTime()) break;
                                      const timeslot: Timeslot = {
                                        id: '',
                                        start: temp,
                                        end: end,
                                      }
                                      if(selectedTimeslots.some((ts) => timeslot.start == ts.start && timeslot.end == ts.end) !== undefined) continue
                                      timeslots.push(timeslot)
                                      temp = end
                                    }
                                  }

                                  timeslots.forEach((timeslot) => {
                                    if(timeslots.find((ts) => {
                                      return ts.start.getTime() == timeslot.start.getTime() && ts.end.getTime() == timeslot.end.getTime()
                                    }) === undefined) {
                                      timeslots.push(timeslot)
                                    }
                                  })

                                  setStartTime(time)
                                  setTimeslots(timeslots.sort((a, b) => a.start.getTime() - b.start.getTime()))
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
                              let timeslots: Timeslot[] = []
                              //TODO: recalculate the timeslots as a result of updating the end time
                              if(typeof startTime !== 'string'){
                                let temp = startTime
                                while(temp < time){
                                  const end = new Date(temp.getTime() + DAY_OFFSET * (increment / 1440))
                                  if(end > time) break;
                                  const timeslot: Timeslot = {
                                    id: '',
                                    start: temp,
                                    end: end,
                                  }
                                  if(timeslots.find((ts) => timeslot.start == ts.start && timeslot.end == ts.end) !== undefined) continue
                                  timeslots.push(timeslot)
                                  temp = end
                                }
                              }

                              timeslots.forEach((timeslot) => {
                                if(timeslots.find((ts) => {
                                  return ts.start.getTime() == timeslot.start.getTime() && ts.end.getTime() == timeslot.end.getTime()
                                }) === undefined) {
                                  timeslots.push(timeslot)
                                }
                              })

                              setEndTime(time)
                              setTimeslots(timeslots.sort((a, b) => a.start.getTime() - b.start.getTime()))
                            }}
                          >{time.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })}</Dropdown.Item>
                      )})
                    }
                  </Dropdown>
              </div>
          </div>
        </div>
        {
          (activeTimeslots.data ?? []).length > 0 ? (
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
                  setTimeslots(timeslots)
                  setSelectedTimeslots([])
                }} 
                disabled={typeof startTime === 'string' || typeof endTime === 'string'} 
                className="w-[60%]"
              />
            </div>
          )
        }
        {timeslots.length > 0 ? (
          <div className="w-full flex flex-col justify-center items-center mt-4 gap-3">
            <span className="underline underline-offset-2">Timeslots for selected range:</span>
            <div className="grid grid-cols-4 w-full gap-2 max-h-[200px] overflow-auto border-2 border-gray-500 rounded-lg p-2">
              {timeslots.map((timeslot, index) => {
                const selected = selectedTimeslots.some((ts) => timeslot.id === ts.id)
                return (
                    <button 
                      key={index} 
                      type="button" 
                      className={`flex flex-row border-[1.5px] py-1.5 rounded-lg border-black items-center justify-center hover:bg-gray-300 ${selected ? 'bg-gray-200' : ''}`}
                      onClick={() => {
                          if(selected){
                            setSelectedTimeslots(selectedTimeslots.filter((ts) => ts.id !== timeslot.id))
                          }
                          else {
                            setSelectedTimeslots([...selectedTimeslots, timeslot])
                          }
                      }}>{timeslot.start.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })}</button>
                  )})}
            </div>
            <div className="flex flex-row w-full justify-end">
              <Button color="light" className="border-gray-700 me-4"  type="button" onClick={() => setSelectedTimeslots(timeslots)}>Select All</Button>
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
          >Create</Button>
        </div>
      </Modal.Body>
    </Modal>
  )
}