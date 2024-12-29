import { FC } from "react";
import { Participant, Timeslot, UserTag } from "../../types";
import { formatTime } from "../../utils";
import { HiOutlineCalendar } from "react-icons/hi2";
import { EventAttributes, createEvent } from 'ics'
import { DateTime } from 'luxon'

export interface SlotProps {
    timeslot: Timeslot
    participant?: Participant | null
    tag?: UserTag,
    className?: string,
}

export function createTimeString(timeslot: Timeslot){
    return timeslot.start.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' }) + " - " + timeslot.end.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })
}

export function createTimeslotEvent(timeslot: Timeslot, participant: Participant){
    if(!timeslot.register){
        return (<></>)
    }
    const delta = new Date(timeslot.end.getTime() - timeslot.start.getTime())
    const startDateTime = DateTime.fromObject(
        { year: timeslot.start.getFullYear(), month: timeslot.start.getMonth() + 1, day: timeslot.start.getDate(), hour: timeslot.start.getHours(), minute: timeslot.start.getMinutes()},
        { zone: 'America/Chicago' }
    )
    const startUTC = startDateTime
    
    const calendarEvent: EventAttributes = {
        start: [startUTC.year, startUTC.month, startUTC.day, startUTC.hour, startUTC.minute],
        duration: { hours: delta.getHours(), minutes: delta.getMinutes() },
        title: `${participant.firstName} ${participant.lastName}`,
        description: `Photoshoot for your participant`,
        url: 'https://www.jamesfrenchphoto.com',
        geo: { lat: 32.813040, lon: -96.803810 },
        location: '3624 Oak Lawn Ave # 222, Dallas, TX 75219',
        status: 'CONFIRMED',
        categories: ['James French Photography', 'Photoshoot', 'La Fiesta 2025', 'Debutante', 'Headshot'],
        busyStatus: 'BUSY',
        organizer: { name: 'James French Photography', email: 'camille@jfrenchphotography.com' },
        attendees: [
            { email: timeslot.register, rsvp: true, role: 'REQ-PARTICIPANT' }
        ],
        alarms: [{action: 'display', trigger: { minutes: 30, before: true }}]
    }

    let objectURL: string | undefined
    createEvent(calendarEvent, (error, value) => {
        if(error) {
            console.log(error)
            return
        }
        const calendarInvite = new Blob([value], { type: 'text/calendar;charset=utf-8' })
        objectURL = URL.createObjectURL(calendarInvite)
    })

    return (
        <a href={objectURL} download={`LAF_2025_Headshot_${participant.firstName}_${participant.lastName}.ics`}>
            <HiOutlineCalendar size={24} />
        </a>
    )
}

export const SlotComponent: FC<SlotProps> = ({ timeslot, participant, tag, className }) => {
    return (
        <div className={`flex flex-col relative border border-black justify-center items-center rounded-lg py-2 px-4 text-${tag?.color ?? 'black'} ${className ?? ''}`}>
            <span>{"Time: " + createTimeString(timeslot)}</span>
            {
                participant ? 
                    (
                        <span>
                            {`${participant.preferredName ? participant.preferredName : participant.firstName} ${participant.lastName}`}
                        </span>
                    ) : (
                        participant === null ? (
                            <span>No Register</span>
                        ) : undefined
                    )
            }
            {
                participant ? (
                    <div className="absolute inset-y-0 right-0 self-center justify-self-center me-2">
                        {createTimeslotEvent(timeslot, participant)}
                    </div>
                ) : (<></>)
            }
        </div>)
}

export const CompactSlotComponent: FC<SlotProps> = ({ timeslot }) => {
    return (
        <div className="flex flex-row border border-black items-center rounded-lg py-2 text-sm justify-between px-4 italic text-gray-800">
            <span>{formatTime(timeslot.start, {timeString: false})}</span>
            <span>{createTimeString(timeslot)}</span>
        </div>
    )
}