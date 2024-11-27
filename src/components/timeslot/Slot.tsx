import { FC, useEffect, useState } from "react";
import { Timeslot, UserTag } from "../../types";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import { formatTime, GetColorComponent } from "../../utils";

const client = generateClient<Schema>()

export interface SlotProps {
    timeslot: Timeslot
    showTags?: boolean
    displayRegister: boolean
}

export function createTimeString(timeslot: Timeslot){
    return timeslot.start.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' }) + " - " + timeslot.end.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })
}

export const SlotComponent: FC<SlotProps> = ({ timeslot, showTags = true, displayRegister }) => {
    const [apiCall, setApiCall] = useState(false)
    const [tag, setTag] = useState<UserTag>()
    
    useEffect(() => {
        async function api(){
            if(showTags){
                const timeslots = (await client.models.Timeslot.get({id: timeslot.id})).data
                if(!timeslots){
                    setTag(undefined)
                    setApiCall(true)
                    return
                }
                const tsTag = (await timeslots.timeslotTag()).data
                if(!tsTag){
                    setTag(undefined)
                    setApiCall(true)
                    return
                }
                const tag = (await tsTag.tag()).data
                if(!tag){
                    setTag(undefined)
                    setApiCall(true)
                    return
                }
                const response: UserTag = {
                    ...tag,
                    color: tag.color ?? undefined
                }
                console.log(response)
                setTag(response)
            }
            setApiCall(true)
        }

        if(!apiCall){
            api()
        }
    })

    return (
        <div className="flex flex-col border border-black justify-center items-center rounded-lg py-2 px-4">
            <span>{"Time: " + createTimeString(timeslot)}</span>
            {
                displayRegister ? 
                    (timeslot.register !== undefined ? (<span>{timeslot.register}</span>) : (<span>No Signup Yet</span>))
                    : (<></>)
            }
            {showTags ? 
            (tag ? (<GetColorComponent activeColor={tag.color} customText={tag.name}/>) : (<>No Tag</>)
            ) : (
                <></>
            )}
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