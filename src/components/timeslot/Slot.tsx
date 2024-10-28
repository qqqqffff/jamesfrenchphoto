import { FC, useEffect, useState } from "react";
import { Timeslot, UserTag } from "../../types";
import { Dropdown } from "flowbite-react";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import { formatTime, GetColorComponent } from "../../utils";

const client = generateClient<Schema>()

export interface SlotProps {
    timeslot: Timeslot
    showTags?: boolean
}

function createTimeString(timeslot: Timeslot){
    return timeslot.start.toLocaleTimeString() + " - " + timeslot.end.toLocaleTimeString()
}

export const SlotComponent: FC<SlotProps> = ({ timeslot, showTags = true }) => {
    const [apiCall, setApiCall] = useState(false)
    const [tags, setTags] = useState<UserTag[]>([])
    
    useEffect(() => {
        async function api(){
            if(showTags){
                const response = await Promise.all((await (await client.models.Timeslot.get({id: timeslot.id})).data!.timeslotTag()).data.map(async (timeslottags) => {
                    return (await timeslottags.tag()).data as UserTag
                }))
                console.log(response)
                setTags(response)
            }
            setApiCall(true)
        }

        if(!apiCall){
            api()
        }
    })

    
    function createCapacityString(){
        return 'Capacity: ' + (timeslot.registers ? timeslot.registers.length : 0) + " / " + timeslot.capacity
    }
    return (
        <div className="flex flex-col border border-black justify-center items-center rounded-lg py-2">
            <span>{"Time: " + createTimeString(timeslot)}</span>
            <span>{createCapacityString()}</span>
            {showTags ? 
            (<Dropdown label="Tags:" inline>
                {tags.length > 0 ? (tags.map((tag) => {
                    return (<Dropdown.Item><GetColorComponent activeColor={tag.color}/></Dropdown.Item>)
                })) : (<Dropdown.Item>None</Dropdown.Item>)}
            </Dropdown>) : (<></>)}
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