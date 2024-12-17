import { FC, useEffect, useState } from "react";
import { Participant, Timeslot, UserTag } from "../../types";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import { formatTime } from "../../utils";
import { HiOutlineCalendar } from "react-icons/hi2";
import { EventAttributes, createEvent } from 'ics'
import { DateTime } from 'luxon'

const client = generateClient<Schema>()

export interface SlotProps {
    timeslot: Timeslot
    displayRegister: boolean
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

export const SlotComponent: FC<SlotProps> = ({ timeslot, displayRegister }) => {
    const [apiCall, setApiCall] = useState(false)
    const [tag, setTag] = useState<UserTag>()
    const [timeslotParticipant, setTimeslotParticipant] = useState<Participant>()
    
    useEffect(() => {
        async function api(){
            const timeslots = await client.models.Timeslot.get({id: timeslot.id})
            let tag: UserTag | undefined
            let participant: Participant | undefined
            if(timeslots && timeslots.data){
                const timeslotTagResponse = await timeslots.data.timeslotTag()
                
                if(timeslotTagResponse && timeslotTagResponse.data){
                    const tagResponse = await timeslotTagResponse.data.tag()
                    if(tagResponse && tagResponse.data){
                        tag = {
                            ...tagResponse.data,
                            color: tagResponse.data.color ?? undefined
                        }
                    }
                }
                
                const participantResponse = await timeslots.data.participant()

                if(participantResponse && participantResponse.data){
                    participant = {
                        ...participantResponse.data,
                        userTags: [],
                        middleName: undefined,
                        preferredName: participantResponse.data.preferredName ?? undefined,
                        contact: false,
                        email: undefined,
                        timeslot: undefined,
                    }
                }
                else if(timeslot.register) {
                    const userProfileResponse = await client.models.UserProfile.get({ email: timeslot.register})

                    if(userProfileResponse && userProfileResponse.data && 
                        userProfileResponse.data.participantFirstName && userProfileResponse.data.participantLastName) {
                        participant = {
                            id: '',
                            firstName: userProfileResponse.data.participantFirstName,
                            lastName: userProfileResponse.data.participantLastName,
                            preferredName: userProfileResponse.data.participantPreferredName ?? undefined,
                            contact: false,
                            userTags: []
                            
                        }
                    }
                }
            }

            setTimeslotParticipant(participant)
            setTag(tag)
            setApiCall(true)
        }

        if(!apiCall){
            api()
        }
    })

    return (
        <div className={`flex flex-col relative border border-black justify-center items-center rounded-lg py-2 px-4 text-${tag?.color ?? 'black'}`}>
            <span>{"Time: " + createTimeString(timeslot)}</span>
            {
                displayRegister ? 
                    (
                        timeslotParticipant !== undefined ? (
                            <span>{`${timeslotParticipant.preferredName ? timeslotParticipant.preferredName : timeslotParticipant.firstName} ${timeslotParticipant.lastName}`}</span>
                        ) : (
                            <span>
                                No Signup Yet
                            </span>
                        )
                    ) : (<></>)
            }
            {
                displayRegister ? (
                    timeslotParticipant !== undefined ? (
                        <div className="absolute inset-y-0 right-0 self-center me-2">
                            {createTimeslotEvent(timeslot, timeslotParticipant)}
                        </div>
                    ) : (<></>)
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