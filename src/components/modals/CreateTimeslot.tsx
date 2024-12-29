import { FC, FormEvent, useEffect, useState } from "react";
import { ModalProps } from ".";
import { Button, Dropdown, Label, Modal, RangeSlider } from "flowbite-react";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import { DAY_OFFSET, getTimes } from "../../utils";
import { Timeslot } from "../../types";

const client = generateClient<Schema>()

interface CreateTimeslotModalProps extends ModalProps {
    day: Date;
    update: boolean;
}

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

            if(activeTimeslots.length > 0){
                increment = (activeTimeslots[0].end.getTime() - activeTimeslots[0].start.getTime()) / (1000 * 60)
            }

            setIncrement(increment)
            setStartTime(startTime)
            setEndTime(endTime)
            setTimeslots(timeslots)
            setActiveTimeslots(activeTimeslots)
            setInitialActiveTimeslots(activeTimeslots)
            setApiCall(true)
        }
        if(!apiCall && open && update){
            api()
        }
    })

    const times = getTimes(day)

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
            <Modal.Header>{update ? 'Update Timeslots' : 'Create New Timeslots'}</Modal.Header>
            <Modal.Body>
                <form onSubmit={createTimeslot}>
                    <div className="flex flex-col">
                        <span className="self-center text-lg max-h-">Date:</span>
                        {/* TODO: scrollable date arrows */}
                        <span className="self-center text-2xl mb-4 underline underline-offset-4">{day.toLocaleDateString("en-us", { timeZone: 'America/Chicago' })}</span>
                        <div className="grid grid-cols-2 gap-2 mb-6">
                            <div className="flex flex-col items-center">
                                <div className="flex flex-col gap-2">
                                    <Label className="ms-2 font-medium text-lg" htmlFor="name">Start:</Label>
                                    <Dropdown placement="bottom-end" label={typeof startTime === 'string' ? startTime : startTime.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })} color="light" id="name" name="name" className="overflow-auto max-h-[250px]">
                                        {times.map((time, index) => { 
                                                return (
                                                    <Dropdown.Item 
                                                    className='disabled:text-gray-400 disabled:cursor-not-allowed'
                                                    disabled={!startEnabled(time)}
                                                    key={index} 
                                                    onClick={() => {
                                                        let timeslots: Timeslot[] = []
                                                        
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
                                                                if(activeTimeslots.find((ts) => timeslot.start == ts.start && timeslot.end == ts.end) !== undefined) continue
                                                                timeslots.push(timeslot)
                                                                temp = end
                                                            }
                                                        }

                                                        activeTimeslots.forEach((timeslot) => {
                                                            if(timeslots.find((ts) => {
                                                                return ts.start.getTime() == timeslot.start.getTime() && ts.end.getTime() == timeslot.end.getTime()
                                                            }) === undefined) {
                                                                timeslots.push(timeslot)
                                                            }
                                                        })

                                                        setStartTime(time)
                                                        setTimeslots(timeslots.sort((a, b) => a.start.getTime() - b.start.getTime()))
                                                    }}>{time.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })}</Dropdown.Item>
                                                )
                                            })}
                                    </Dropdown>
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="flex flex-col gap-2">
                                    <Label className="ms-2 font-medium text-lg" htmlFor="name">End:</Label>
                                    <Dropdown placement="bottom-end" label={typeof endTime === 'string' ? endTime : endTime.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })} color="light" id="name" name="name" disabled={typeof startTime == 'string'} className="overflow-auto max-h-[250px]">
                                        {times.map((time, index) => { 
                                                return (
                                                    <Dropdown.Item key={index} className='disabled:text-gray-400 disabled:cursor-not-allowed' 
                                                        disabled={!endEnabled(time)} 
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
                                                                    if(activeTimeslots.find((ts) => timeslot.start == ts.start && timeslot.end == ts.end) !== undefined) continue
                                                                    timeslots.push(timeslot)
                                                                    temp = end
                                                                }
                                                            }

                                                            activeTimeslots.forEach((timeslot) => {
                                                                if(timeslots.find((ts) => {
                                                                    return ts.start.getTime() == timeslot.start.getTime() && ts.end.getTime() == timeslot.end.getTime()
                                                                }) === undefined) {
                                                                    timeslots.push(timeslot)
                                                                }
                                                            })

                                                            setEndTime(time)
                                                            setTimeslots(timeslots.sort((a, b) => a.start.getTime() - b.start.getTime()))
                                                        }}>{time.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })}</Dropdown.Item>
                                                )
                                            })}
                                    </Dropdown>
                                </div>
                            </div>
                        </div>
                    </div>
                    {
                        update && initialActiveTimeslots.length > 0 ? (
                            <div className="flex flex-col w-full items-center justify-center">
                                <span>Timeslot Increment: {(initialActiveTimeslots[0].end.getTime() - initialActiveTimeslots[0].start.getTime()) / (1000 * 60)} mins</span>
                            </div> 
                        ) : (
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
                        )
                    }
                    
                   
                    
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
                                                }}>{timeslot.start.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })}</button>
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