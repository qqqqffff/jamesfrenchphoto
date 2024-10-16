import { Datepicker } from "flowbite-react"
import { FC, useRef, useState } from "react"
import { ControlComponent } from "../admin/ControlPannel"
import { HiOutlinePlusCircle, HiOutlineMinusCircle, HiOutlineUserPlus} from "react-icons/hi2"
import { CreateTimeslotModal } from "../modals/CreateTimeslot"

export const Timeslot: FC = () => {
    const dateRef = useRef<undefined | Date>()
    const [createTimeslotVisible, setCreateTimeslotVisible] = useState(false)

    return (
        <>
            <CreateTimeslotModal open={createTimeslotVisible} onClose={() => setCreateTimeslotVisible(false)} day={dateRef.current ?? new Date()} />
            <div className="grid grid-cols-6 gap-2 font-main">
                <div className="flex flex-col ms-5 border border-gray-400 rounded-lg px-6 py-2 gap-2">
                    <span className="text-2xl underline underline-offset-4">Timeslot Date</span>
                    <Datepicker minDate={new Date()} onSelectedDateChanged={(date) => {
                        dateRef.current = date
                    }}/>
                    <ControlComponent className="mt-3" name={<><HiOutlinePlusCircle size={20} className="mt-1 me-1"/>Add Timeslot</>} fn={() => setCreateTimeslotVisible(true)} type={true}/>
                    <ControlComponent name={<><HiOutlineMinusCircle size={20} className="mt-1 me-1"/>Remove Timeslot</>} fn={() => console.log('hello world')} type={true}/>
                    <ControlComponent name={<><HiOutlineUserPlus size={20} className="mt-1 me-1"/>Add Timeslot to Tag</>} fn={() => console.log('hi world')} type={true}/>
                </div>
            </div>
        </>
    )
}