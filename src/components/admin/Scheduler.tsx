import { useQuery } from "@tanstack/react-query";
import { FC, useState } from "react";
import { getAllTimeslotsByDateQueryOptions } from "../../services/timeslotService";
import { currentDate, DAY_OFFSET } from "../../utils";
import { Datepicker, Label, Progress } from "flowbite-react";
import { ControlComponent } from "./ControlPannel";
import { HiOutlinePlusCircle } from "react-icons/hi2";
import { SlotComponent } from "../timeslot/Slot";
import { CreateTimeslotModal, EditTimeslotModal } from "../modals";
import { Timeslot } from "../../types";

export const Scheduler: FC = () => {
    const [activeDate, setActiveDate] = useState<Date>(currentDate)
    const timeslots = useQuery(getAllTimeslotsByDateQueryOptions(activeDate))
    const [createTimeslotVisible, setCreateTimeslotVisible] = useState(false)
    const [editTimeslotVisible, setEditTimeslotVisible] = useState<Timeslot>()

    return (
        <>
            <CreateTimeslotModal open={createTimeslotVisible} onClose={() => {
                setActiveDate(new Date(activeDate))
                setCreateTimeslotVisible(false)
            }} day={activeDate} update={(timeslots.data ?? []).length > 0} />
            <EditTimeslotModal open={editTimeslotVisible !== undefined} onClose={() => {
                setActiveDate(new Date(activeDate))
                setEditTimeslotVisible(undefined)
            }} timeslot={editTimeslotVisible} />
            <div className="grid grid-cols-6 gap-4 font-main mt-6">
                <div className="flex flex-col ms-4 border border-gray-400 rounded-lg px-6 py-2 gap-2">
                    <div className="flex flex-row gap-1 w-full justify-between">
                        <span className="text-2xl underline underline-offset-4">Timeslot Date</span>
                    </div>
                    { !timeslots.isLoading ? (<></>) : 
                        (
                            <Progress progress={100} textLabel="Loading..." textLabelPosition='inside' labelText size="lg"/>
                        )
                    }
                    <Datepicker className='mt-2' onChange={async (date) => {
                        if(date) {
                            setActiveDate(date)
                            // let timeslots: Timeslot[] = []
                            // setLoading(true)
                            // timeslots = (await Promise.all((await client.models.Timeslot.list({ filter: {
                            //     start: { contains: date.toISOString().substring(0, date.toISOString().indexOf('T')) }
                            // }})).data.map(async (timeslot) => {
                            //     if(timeslot === undefined || timeslot.id === undefined || timeslot.start === undefined || timeslot.end === undefined) return undefined
                            //     let tag: UserTag | undefined
                            //     const tsTagResponse = await timeslot.timeslotTag()
                            //     if(tsTagResponse && tsTagResponse.data){
                            //         const tagResponse = await tsTagResponse.data.tag()
                            //         if(tagResponse && tagResponse.data){
                            //             tag = {
                            //                 ...tagResponse.data,
                            //                 color: tagResponse.data.color ?? undefined,
                            //             }
                            //         }
                            //     }

                            //     const participantResponse = await timeslot.participant()
                            //     let participant: Participant | undefined
                            //     //TODO: improve me
                            //     if(participantResponse.data){
                            //         participant = {
                            //             ...participantResponse.data,
                            //             preferredName: participantResponse.data.preferredName ?? undefined,
                            //             //unnecessary fields
                            //             userTags: [],
                            //             middleName: undefined,
                            //             email: undefined,
                            //             contact: false,
                            //             timeslot: undefined
                            //         }
                            //     }
                            //     else if(timeslot.register) {
                            //         const userProfileResponse = await client.models.UserProfile.get({ email: timeslot.register })
                            //         if(userProfileResponse.data && 
                            //             userProfileResponse.data.participantFirstName && 
                            //             userProfileResponse.data.participantLastName){
                            //             participant = {
                            //                 id: '',
                            //                 firstName: userProfileResponse.data.participantFirstName,
                            //                 lastName: userProfileResponse.data.participantLastName,
                            //                 preferredName: userProfileResponse.data.participantPreferredName ?? undefined,
                            //                 //unnecessary fields
                            //                 userTags: [],
                            //                 middleName: undefined,
                            //                 email: undefined,
                            //                 contact: false,
                            //                 timeslot: undefined
                            //             }
                            //         }
                            //     }

                            //     const ts: Timeslot = {
                            //         id: timeslot.id as string,
                            //         register: timeslot.register ?? undefined,
                            //         start: new Date(timeslot.start),
                            //         end: new Date(timeslot.end),
                            //         participant: participant,
                            //         tag: tag
                            //     }
                            //     return ts
                            // }))).filter((timeslot) => timeslot !== undefined)
                            
                            // setUpdatingTimeslot(timeslots.length > 0)
                            // setActiveDate(date)
                            // setTimeslots(timeslots)
                            // setLoading(false)
                        }
                    }}/>
                    <ControlComponent className="" name={
                        <>
                            <HiOutlinePlusCircle size={20} className="mt-0.5 me-1"/>
                            {(timeslots.data ?? []).length > 0 ? 'Update Timeslot(s)' : 'Add Timeslot(s)'}
                        </>} fn={() => {
                        setCreateTimeslotVisible(true)
                    }} type={true} 
                        disabled={activeDate.getTime() < currentDate.getTime() + DAY_OFFSET}
                    />
                </div>
                <div className="col-span-4 border border-gray-400 rounded-lg py-4 px-2 h-[500px] overflow-auto">
                    <div className="grid gap-2 grid-cols-3">
                        {timeslots.data && timeslots.data.length > 0 ?
                            (timeslots.data.map((timeslot, index) => {
                                return (
                                    <button 
                                        onClick={() => {
                                            setEditTimeslotVisible(timeslot)
                                        }}>
                                        <SlotComponent className="hover:bg-gray-200" timeslot={timeslot} participant={timeslot.participant ?? null} tag={timeslot.tag} key={index} />
                                    </button>
                                )
                            })
                        ) : (
                            <div className="flex flex-row w-full items-center justify-center col-start-2">
                                <Label className="font-medium text-lg italic text-gray-500">No timeslots for this date</Label>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}