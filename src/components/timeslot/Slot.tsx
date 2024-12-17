import { FC, useEffect, useState } from "react";
import { Participant, Timeslot, UserTag } from "../../types";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import { formatTime } from "../../utils";

const client = generateClient<Schema>()

export interface SlotProps {
    timeslot: Timeslot
    displayRegister: boolean
}

export function createTimeString(timeslot: Timeslot){
    return timeslot.start.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' }) + " - " + timeslot.end.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })
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
        <div className={`flex flex-col border border-black justify-center items-center rounded-lg py-2 px-4 text-${tag?.color ?? 'black'}`}>
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