import { FC, FormEvent, useEffect, useState } from "react";
import { ModalProps } from ".";
import { Button, Dropdown, Label, Modal, RangeSlider } from "flowbite-react";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import { DAY_OFFSET } from "../../utils";
import { Timeslot } from "../../types";

const client = generateClient<Schema>()

interface CreateTimeslotModalProps extends ModalProps {
    day: Date;
    update: boolean;
}

//TODO: when changing start and end dates try to preserve the currently selected time ranges
export const CreateTimeslotModal: FC<CreateTimeslotModalProps> = ({open, onClose, day, update}) => {
    const [startTime, setStartTime] = useState<string | Date>('Select Start Time')
    const [endTime, setEndTime] = useState<string | Date>('Select End Time')
    const [increment, setIncrement] = useState<number>(30)
    const [activeTimeslots, setActiveTimeslots] = useState<Timeslot[]>([])
    const [initialActiveTimeslots, setInitialActiveTimeslots] = useState<Timeslot[]>([])
    const [timeslots, setTimeslots] = useState<Timeslot[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [apiCall, setApiCall] = useState(false)

    useEffect(() => {
        async function api(){
            const activeTimeslots = (await client.models.Timeslot.list({ filter: {
                start: { contains: day.toISOString().substring(0, new Date().toISOString().indexOf('T')) }
            }})).data.map((timeslot) => {
                if(!timeslot.id) return
                const ts: Timeslot = {
                    id: timeslot.id,
                    register: timeslot.register ?? undefined,
                    start: new Date(timeslot.start),
                    end: new Date(timeslot.end),
                }
                return ts}).filter((timeslot) => timeslot !== undefined)

            const sortedTimeslots = activeTimeslots.sort((a, b) => a.start.getTime() - b.start.getTime())

            const startTime = sortedTimeslots.length > 0 ? sortedTimeslots[0].start : 'Select Start Time'
            const endTime = sortedTimeslots.length > 0 ? sortedTimeslots[sortedTimeslots.length - 1].end : 'Select End Time'
            let timeslots: Timeslot[] = []
            let increment = 30;
            if(typeof startTime !== 'string' && typeof endTime !== 'string'){
                increment = (sortedTimeslots[0].end.getTime() - sortedTimeslots[0].start.getTime()) / (1000 * 60)
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

            console.log(increment, startTime, endTime, timeslots, activeTimeslots)

            setIncrement(increment)
            setStartTime(startTime)
            setEndTime(endTime)
            setTimeslots(timeslots)
            setActiveTimeslots(activeTimeslots)
            setInitialActiveTimeslots(activeTimeslots)
            setApiCall(true)
        }
        if(!apiCall && open && update){
            //TODO: pass in timeslots from timeslot component
            api()
        }
    })

    const times = [
        new Date(day.getTime() + DAY_OFFSET * (16/48)),
        new Date(day.getTime() + DAY_OFFSET * (17/48)),
        new Date(day.getTime() + DAY_OFFSET * (18/48)),
        new Date(day.getTime() + DAY_OFFSET * (19/48)),
        new Date(day.getTime() + DAY_OFFSET * (20/48)),
        new Date(day.getTime() + DAY_OFFSET * (21/48)),
        new Date(day.getTime() + DAY_OFFSET * (22/48)),
        new Date(day.getTime() + DAY_OFFSET * (23/48)),
        new Date(day.getTime() + DAY_OFFSET * (24/48)),
        new Date(day.getTime() + DAY_OFFSET * (25/48)),
        new Date(day.getTime() + DAY_OFFSET * (26/48)),
        new Date(day.getTime() + DAY_OFFSET * (27/48)),
        new Date(day.getTime() + DAY_OFFSET * (28/48)),
        new Date(day.getTime() + DAY_OFFSET * (29/48)),
        new Date(day.getTime() + DAY_OFFSET * (30/48)),
        new Date(day.getTime() + DAY_OFFSET * (31/48)),
        new Date(day.getTime() + DAY_OFFSET * (32/48)),
        new Date(day.getTime() + DAY_OFFSET * (33/48)),
        new Date(day.getTime() + DAY_OFFSET * (34/48)),
        new Date(day.getTime() + DAY_OFFSET * (35/48)),
        new Date(day.getTime() + DAY_OFFSET * (36/48)),
    ]

    async function createTimeslot(event: FormEvent){
        event.preventDefault()

        if(initialActiveTimeslots.length < 0) {
            const response = await Promise.all(activeTimeslots.map(async (timeslot) => {
                const response = await client.models.Timeslot.create({
                    start: timeslot.start.toISOString(),
                    end: timeslot.end.toISOString(),
                })
                return response
            }))
            console.log(response)
        }
        else{
            const mappedActiveTimeslots = activeTimeslots.map((timeslot) => ({start: timeslot.start, end: timeslot.end}))
            const mappedInitialTimeslots = initialActiveTimeslots.map((timeslot) => ({start: timeslot.start, end: timeslot.end}))
            const removedTimeslots = await Promise.all(initialActiveTimeslots
                .filter((timeslot) => !mappedActiveTimeslots.includes({start: timeslot.start, end: timeslot.end}))
                .map(async (timeslot) => {
                    if(!timeslot.id || timeslot.id === ''){
                        console.error('Timeslot to remove is missing id')
                        return
                    }
                    const response = await client.models.Timeslot.delete({
                        id: timeslot.id
                    })
                    return response
                }))
            const addedTimeslots = await Promise.all(activeTimeslots
                .filter((timeslot) => !mappedInitialTimeslots.includes({start: timeslot.start, end: timeslot.end}))
                .map(async (timeslot) => {
                    const response = await client.models.Timeslot.create({
                        start: timeslot.start.toISOString(),
                        end: timeslot.end.toISOString(),
                    })
                    return response
                })
            )
            console.log([removedTimeslots, addedTimeslots])
        }
        
        
        setSubmitting(false)
        resetState()
        onClose()
    }

    function resetState(){
        setStartTime('Select Start Time')
        setEndTime('Select End Time')
        setIncrement(30)
        setTimeslots([])
        setActiveTimeslots([])
        setSubmitting(false)
        setApiCall(false)
    }

    return (
        <Modal show={open} onClose={() => {
            resetState()
            onClose()
        }}>
            <Modal.Header>{update ? 'Update Timeslot' : 'Create a New Timeslot'}</Modal.Header>
            <Modal.Body>
                <form onSubmit={createTimeslot}>
                    <div className="flex flex-col">
                        <span className="self-center text-lg max-h-">Date:</span>
                        {/* TODO: scrollable date arrows */}
                        <span className="self-center text-2xl mb-4 underline underline-offset-4">{day.toLocaleDateString()}</span>
                        <div className="grid grid-cols-2 gap-2 mb-6">
                            <div className="flex flex-col items-center">
                                <div className="flex flex-col gap-2">
                                    <Label className="ms-2 font-medium text-lg" htmlFor="name">Start:</Label>
                                    <Dropdown placement="bottom-end" label={typeof startTime === 'string' ? startTime : startTime.toLocaleTimeString()} color="light" id="name" name="name" className="overflow-auto max-h-[250px]">
                                        {times.map((time, index) => { 
                                                return (
                                                    <Dropdown.Item key={index} 
                                                    onClick={() => {
                                                        let timeslots: Timeslot[] = []
                                                        if(typeof endTime !== 'string'){
                                                            let temp = time
                                                            while(temp < endTime){
                                                                const end = new Date(temp.getTime() + DAY_OFFSET * (increment / 1440))
                                                                if(end > temp) break;
                                                                const timeslot: Timeslot = {
                                                                    id: '',
                                                                    start: temp,
                                                                    end: end,
                                                                }
                                                                timeslots.push(timeslot)
                                                                temp = end
                                                            }
                                                        }
                                                        setStartTime(time)
                                                        setTimeslots(timeslots)
                                                        setActiveTimeslots([])
                                                    }}>{time.toLocaleTimeString()}</Dropdown.Item>
                                                )
                                            })}
                                    </Dropdown>
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="flex flex-col gap-2">
                                    <Label className="ms-2 font-medium text-lg" htmlFor="name">End:</Label>
                                    <Dropdown placement="bottom-end" label={typeof endTime === 'string' ? endTime : endTime.toLocaleTimeString()} color="light" id="name" name="name" disabled={typeof startTime == 'string'} className="overflow-auto max-h-[250px]">
                                        {times.map((time, index) => { 
                                                return (
                                                    <Dropdown.Item key={index} className='disabled:text-gray-400 disabled:cursor-not-allowed' disabled={time <= startTime} 
                                                        onClick={() => {
                                                            let timeslots: Timeslot[] = []
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
                                                                    timeslots.push(timeslot)
                                                                    temp = end
                                                                }
                                                            }
                                                            setEndTime(time)
                                                            setTimeslots(timeslots)
                                                            setActiveTimeslots([])
                                                        }}>{time.toLocaleTimeString()}</Dropdown.Item>
                                                )
                                            })}
                                    </Dropdown>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col w-full items-center justify-center">
                        <span>Timeslot Increment: {increment} mins</span>
                        <RangeSlider min={15} max={60} step={15} defaultValue={increment} onChange={(event) => {
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
                            setActiveTimeslots([])
                            }} disabled={typeof startTime === 'string' || typeof endTime === 'string'} className="w-[60%]"/>
                    </div>
                   
                    
                        {timeslots.length > 0 ? (
                            <div className="w-full flex flex-col justify-center items-center mt-4 gap-3">
                                <span className="underline underline-offset-2">Timeslots for selected range:</span>
                                <div className="grid grid-cols-4 w-full gap-2 max-h-[200px] overflow-auto border-2 border-gray-500 rounded-lg p-2">
                                    {timeslots.map((timeslot, index) => {
                                        const selected = activeTimeslots.find((ts) => ts.start.getTime() == timeslot.start.getTime() && ts.end.getTime() == timeslot.end.getTime()) !== undefined
                                        return (
                                            <button key={index} type="button" className={`flex flex-row border-[1.5px] py-1.5 rounded-lg border-black items-center justify-center hover:bg-gray-300 ${selected ? 'bg-gray-200' : ''}`}
                                                onClick={() => {
                                                    if(selected){
                                                        setActiveTimeslots(activeTimeslots.filter((ts) => ts !== timeslot))
                                                    }
                                                    else {
                                                        setActiveTimeslots([...activeTimeslots, timeslot])
                                                    }
                                                }}>{timeslot.start.toLocaleTimeString()}</button>
                                        )})}
                                </div>
                                <div className="flex flex-row w-full justify-end">
                                    <Button color="light" className="border-gray-700 me-4"  type="button" onClick={() => setActiveTimeslots(timeslots)}>Select All</Button>
                                </div>
                            </div>
                        ) : (<span>No timeslots for the selected range</span>)}
                    
                    <div className="flex flex-row justify-end border-t mt-4">
                        <Button className="text-xl w-[40%] max-w-[8rem] mt-4" type="submit" isProcessing={submitting} onClick={() => setSubmitting(true)}>Create</Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    )
}