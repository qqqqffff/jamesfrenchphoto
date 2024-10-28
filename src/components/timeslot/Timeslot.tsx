import { Datepicker, Label } from "flowbite-react"
import { FC, useEffect, useState } from "react"
import { ControlComponent } from "../admin/ControlPannel"
import { HiOutlinePlusCircle, HiOutlineMinusCircle } from "react-icons/hi2"
import { CreateTimeslotModal } from "../modals/CreateTimeslot"
import { Timeslot } from "../../types"
import { generateClient } from "aws-amplify/api"
import { Schema } from "../../../amplify/data/resource"
import { SlotComponent } from "./Slot"
import { currentDate, DAY_OFFSET } from "../../utils"

const client = generateClient<Schema>()



export const TimeslotComponent: FC = () => {
    const [activeDate, setActiveDate] = useState<Date>(currentDate)
    const [timeslots, setTimeslots] = useState<Timeslot[] | null>()
    const [createTimeslotVisible, setCreateTimeslotVisible] = useState(false)
    const [apiCall, setApiCall] = useState(false)

    useEffect(() => {
        async function api(){
            setTimeslots((await client.models.Timeslot.list({ filter: {
                start: { contains: new Date().toISOString().substring(0, new Date().toISOString().indexOf('T')) }
            }})).data.map((timeslot) => {
                return ({
                    id: timeslot.id,
                    capacity: timeslot.capacity,
                    registers: timeslot.registers,
                    start: new Date(timeslot.start),
                    end: new Date(timeslot.end),
            } as Timeslot)}))
            console.log('api call')
        }
        if(!apiCall){
            api()
            setApiCall(true)
        }
    })

    return (
        <>
            <CreateTimeslotModal open={createTimeslotVisible} onClose={() => setCreateTimeslotVisible(false)} day={activeDate} />
            <div className="grid grid-cols-6 gap-2 font-main mt-6">
                <div className="flex flex-col ms-5 border border-gray-400 rounded-lg px-6 py-2 gap-2">
                    <span className="text-2xl underline underline-offset-4">Timeslot Date</span>
                    <Datepicker className='mt-2' onChange={async (date) => {
                        if(date) {
                            setActiveDate(date)
                            const timeslots = (await client.models.Timeslot.list({ filter: {
                                start: { contains: date.toISOString().substring(0, date.toISOString().indexOf('T')) }
                            }})).data.map((timeslot) => ({
                                id: timeslot.id,
                                capacity: timeslot.capacity,
                                registers: timeslot.registers,
                                start: new Date(timeslot.start),
                                end: new Date(timeslot.end),
                        } as Timeslot))
                            setTimeslots(timeslots)
                        }
                    }}/>
                    <ControlComponent className="" name={<><HiOutlinePlusCircle size={20} className="mt-1 me-1"/>Add Timeslot</>} fn={() => setCreateTimeslotVisible(true)} type={true} disabled={activeDate.getTime() < currentDate.getTime() + DAY_OFFSET}/>
                    <ControlComponent name={<><HiOutlineMinusCircle size={20} className="mt-1 me-1"/>Remove Timeslot</>} fn={() => console.log('hello world')} type={true}/>
                    {/* <ControlComponent name={<><HiOutlineUserPlus size={20} className="mt-1 me-1"/>Add Timeslot to Tag</>} fn={() => console.log('hi world')} type={true}/> */}
                </div>
                <div className="col-span-4 border border-gray-400 rounded-lg py-4 px-2 h-[500px] overflow-auto">
                    <div className="grid gap-2 grid-cols-3">
                        {timeslots && timeslots.length > 0 ? timeslots.map((timeslot, index) => {
                            return (<SlotComponent key={index} timeslot={timeslot} />)
                        }) : (<Label className="font-medium text-lg italic text-gray-500">No timeslots for this date</Label>)}
                    </div>
                </div>
            </div>
        </>
    )
}