import { Badge, Button, Datepicker, Label, Tooltip } from "flowbite-react"
import { FC, useEffect, useState } from "react"
import { ControlComponent } from "../admin/ControlPannel"
import { HiOutlinePlusCircle, HiOutlineMinusCircle } from "react-icons/hi2"
import { CreateTimeslotModal } from "../modals/CreateTimeslot"
import { Timeslot, UserTag } from "../../types"
import { generateClient } from "aws-amplify/api"
import { Schema } from "../../../amplify/data/resource"
import { SlotComponent } from "./Slot"
import { badgeColorThemeMap, currentDate, DAY_OFFSET, formatTime, GetColorComponent } from "../../utils"
import { ConfirmationModal } from "../modals/Confirmation"
import { HiOutlineInformationCircle } from "react-icons/hi"

const client = generateClient<Schema>()

interface TimeslotComponentProps {
    admin?: boolean
    userEmail?: string
    minDate?: Date
    userTags?: UserTag[]
}

interface TagTimeslots extends Record<string, Timeslot[]> {}

export const TimeslotComponent: FC<TimeslotComponentProps> = ({ admin, userEmail, minDate, userTags }) => {
    const [activeDate, setActiveDate] = useState<Date>(currentDate)
    const [timeslots, setTimeslots] = useState<Timeslot[] | null>()
    const [createTimeslotVisible, setCreateTimeslotVisible] = useState(false)
    const [registerConfirmationVisible, setRegisterConfirmationVisible] = useState(false)
    const [unregisterConfirmationVisible, setUnegisterConfirmationVisible] = useState(false)
    const [selectedTimeslot, setSelectedTimeslot] = useState<Timeslot | undefined>()
    const [tagTimeslots, setTagTimeslots] = useState<TagTimeslots>({})
    const [apiCall, setApiCall] = useState(false)

    useEffect(() => {
        async function api(){
            console.log('api call')

            // let tagTimeslots: TagTimeslots = {}
            // if(userTags){
            //     tagTimeslots = userTags.map((tag) => {
            //         await Promise.all(((await client.models.UserTag.get({id: tag.id})).data?.timeslotTags().then(() =>)))
            //     }
            // }

            // setTagTimeslots(tagTimeslots)
            setTimeslots((await client.models.Timeslot.list({ filter: {
                start: { contains: currentDate.toISOString().substring(0, new Date().toISOString().indexOf('T')) }
            }})).data.map((timeslot) => {
                return ({
                    id: timeslot.id,
                    capacity: timeslot.capacity,
                    registers: timeslot.registers,
                    start: new Date(timeslot.start),
                    end: new Date(timeslot.end),
            } as Timeslot)}))
        }
        if(!apiCall){
            api()
            setApiCall(true)
        }
    })

    return (
        <>
            <CreateTimeslotModal open={createTimeslotVisible} onClose={() => setCreateTimeslotVisible(false)} day={activeDate} />
            <ConfirmationModal open={registerConfirmationVisible} onClose={() => setRegisterConfirmationVisible(false)} 
                confirmText="Schedule"
                denyText="Back"
                confirmAction={async () => {
                    if(selectedTimeslot && userEmail) {
                        const registers = selectedTimeslot.registers ? selectedTimeslot.registers : [];
                        
                        const response = await client.models.Timeslot.update({
                            id: selectedTimeslot.id,
                            registers: [...registers, userEmail]
                        })

                        const timeslots = (await client.models.Timeslot.list({ filter: {
                            start: { contains: activeDate.toISOString().substring(0, activeDate.toISOString().indexOf('T')) }
                        }})).data.map((timeslot) => ({
                            id: timeslot.id,
                            capacity: timeslot.capacity,
                            registers: timeslot.registers,
                            start: new Date(timeslot.start),
                            end: new Date(timeslot.end),
                        } as Timeslot))

                        console.log(response, timeslots)

                        setTimeslots(timeslots)
                    }
                }}
                title="Confirm Timeslot Selection" body={`<b>Registration for Timeslot: ${selectedTimeslot?.start.toLocaleDateString()} at ${formatTime(selectedTimeslot?.start, {timeString: true})} - ${formatTime(selectedTimeslot?.end, {timeString: true})}.</b>\nMake sure that this is the right timeslot for you, since you only have one!\nRescheduling is only allowed up until one day in advance.`}/>
            <ConfirmationModal open={unregisterConfirmationVisible} onClose={() => setUnegisterConfirmationVisible(false)}
                confirmText="Confirm"
                denyText="Back"
                confirmAction={async () => {
                    if(selectedTimeslot && userEmail) {
                        const registers = selectedTimeslot.registers ? selectedTimeslot.registers : [];
                        
                        const response = await client.models.Timeslot.update({
                            id: selectedTimeslot.id,
                            registers: registers.filter((email) => email != userEmail)
                        })

                        const timeslots = (await client.models.Timeslot.list({ filter: {
                            start: { contains: activeDate.toISOString().substring(0, activeDate.toISOString().indexOf('T')) }
                        }})).data.map((timeslot) => ({
                            id: timeslot.id,
                            capacity: timeslot.capacity,
                            registers: timeslot.registers,
                            start: new Date(timeslot.start),
                            end: new Date(timeslot.end),
                        } as Timeslot))

                        console.log(response, timeslots)

                        setTimeslots(timeslots)
                    }
                }}
                title="Confirm Unregistration" body={`<b>Unregistration for Timeslot: ${selectedTimeslot?.start.toLocaleDateString()} at ${formatTime(selectedTimeslot?.start, {timeString: true})} - ${formatTime(selectedTimeslot?.end, {timeString: true})}.</b>\nAre you sure you want to unregister from this timeslot?`} />
            <div className="grid grid-cols-6 gap-2 font-main mt-6">
                <div className="flex flex-col ms-5 border border-gray-400 rounded-lg px-6 py-2 gap-2">
                    <div className="flex flex-row gap-1 w-full justify-between">
                        <span className="text-2xl underline underline-offset-4">Timeslot Date</span>
                        { admin ? (<></>) : 
                            (<Tooltip content={
                                (<span className="italic">Click on a timeslot to register for a selected date in the range seen bellow!</span>)
                            }>
                                <Badge color="light" icon={HiOutlineInformationCircle} className="text-2xl text-gray-600 bg-transparent" theme={badgeColorThemeMap} size="" />
                            </Tooltip>)}
                    </div>
                    <Datepicker minDate={minDate} className='mt-2' onChange={async (date) => {
                        if(date) {
                            const timeslots = (await client.models.Timeslot.list({ filter: {
                                    start: { contains: date.toISOString().substring(0, date.toISOString().indexOf('T')) }
                                }})).data.map((timeslot) => ({
                                    id: timeslot.id,
                                    capacity: timeslot.capacity,
                                    registers: timeslot.registers,
                                    start: new Date(timeslot.start),
                                    end: new Date(timeslot.end),
                                } as Timeslot))
                            setActiveDate(date)
                            setTimeslots(timeslots)
                        }
                    }}/>
                    {
                        admin ? (
                            <>
                                <ControlComponent className="" name={<><HiOutlinePlusCircle size={20} className="mt-1 me-1"/>Add Timeslot</>} fn={() => setCreateTimeslotVisible(true)} type={true} disabled={activeDate.getTime() < currentDate.getTime() + DAY_OFFSET}/>
                                <ControlComponent name={<><HiOutlineMinusCircle size={20} className="mt-1 me-1"/>Remove Timeslot</>} fn={() => console.log('hello world')} type={true}/>
                            </>
                        ) : (
                            <>
                                {
                                    userTags && userTags.length > 0 ? 
                                    (
                                        <div className="flex flex-col">
                                            {userTags.map((tag, index) => {
                                                const formatDateString = ''
                                                return (
                                                    <div key={index} className="flex flex-col items-center justify-center">
                                                        <span>Dates for:</span>
                                                        <GetColorComponent activeColor={tag.color} customText={tag.name} />
                                                        {/* <GetColorComponent activeColor={tag.color} customText={} */}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        
                                    ) 
                                    : (<span className="text-gray-400 italic">No current timeslots for registration!</span>)
                                }
                            </>
                        )
                        
                    }
                </div>
                <div className="col-span-4 border border-gray-400 rounded-lg py-4 px-2 h-[500px] overflow-auto">
                    <div className="grid gap-2 grid-cols-3">
                        {timeslots && timeslots.length > 0 ? timeslots.map((timeslot, index) => {
                            const registers = timeslot.registers ? timeslot.registers : []
                            const selected = userEmail && registers.includes(userEmail) ? 'bg-gray-200' : ''

                            return (
                                <button key={index} onClick={() => {
                                    const registers = timeslot.registers ? timeslot.registers : []
                                    if(userEmail && !registers.includes(userEmail)) {
                                        setRegisterConfirmationVisible(true)
                                        setSelectedTimeslot(timeslot)
                                    }
                                    else if(userEmail && registers.includes(userEmail)){
                                        setUnegisterConfirmationVisible(true)
                                        setSelectedTimeslot(timeslot)
                                    }
                                }} disabled={admin} className={`${selected} rounded-lg enabled:hover:bg-gray-300`}>
                                    {/* //TODO: show the registers when clicking the capacity for admin users */}
                                    <SlotComponent timeslot={timeslot} showTags={false} displayCapacity={admin} />
                                </button>
                            )
                        }) : (<Label className="font-medium text-lg italic text-gray-500">No timeslots for this date</Label>)}
                    </div>
                </div>
            </div>
        </>
    )
}