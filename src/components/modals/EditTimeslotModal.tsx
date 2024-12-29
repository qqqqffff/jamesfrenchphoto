import { FC, useState } from "react";
import { ModalProps } from ".";
import { Timeslot } from "../../types";
import { Alert, Button, Datepicker, Dropdown, Label, Modal, Tooltip } from "flowbite-react";
import { getTimes } from "../../utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getAllTimeslotsByDateQueryOptions, updateTimeslotMutation } from "../../services/timeslotService";
import { getAuthUsersQueryOptions } from "../../services/userService";
import { HiOutlineExclamation } from "react-icons/hi";

interface EditTimeslotModalProps extends ModalProps {
    timeslot?: Timeslot
}

const EditTimeslotModalComponent: FC<EditTimeslotModalProps> = ({open, onClose, timeslot}) => {
    const [submitting, setSubmitting] = useState(false)
    const [startTime, setStartTime] = useState<Date>(timeslot!.start)
    const [endTime, setEndTime] = useState<Date>(timeslot!.end)
    const [activeDate, setActiveDate] = useState<Date>(new Date(timeslot!.start.toLocaleDateString('en-US', { timeZone: 'America/Chicago' })))
    const [notification, setNotification] = useState<{type: 'success' | 'error', message: string}>()
    const timeslots = useQuery(getAllTimeslotsByDateQueryOptions(activeDate))
    const user = useQuery(getAuthUsersQueryOptions(timeslot?.register ?? null))
    const mutation = useMutation({
        mutationFn: (timeslot: Timeslot) => updateTimeslotMutation(timeslot),
        onSuccess: () => {
            setNotification({type: 'success', message: 'Successfully Updated Timeslot'})
        },
        onError: () => {
            setNotification({type: 'error', message: 'Failed to Update Timeslot'})
        },
        onSettled: () => {
            setSubmitting(false)
        }
    })

    const startEnabled = (time: Date) => (
        time.getTime() < endTime.getTime()
    )

    const endEnabled = (time: Date) => (
        time.getTime() > startTime.getTime()
    )

    const times = getTimes(activeDate)

    const calculateOverlap = (() => {
        const found = (timeslots.data ?? [])
            .filter((ts) => ts.id !== timeslot?.id)
            .filter((timeslot) => {
                return timeslot.start.getTime() === startTime.getTime() || 
                    timeslot.end.getTime() === endTime.getTime() ||
                    (timeslot.start.getTime() > startTime.getTime() && timeslot.end.getTime() < endTime.getTime())
        })
        if(found.length == 0) return undefined
        if(found.find((timeslot) => timeslot.participant !== undefined || timeslot.register !== undefined) !== undefined) return 'emergency'
        return 'warning'
    })()
    
    return (
        <Modal show={open} onClose={() => {
            onClose()
        }}>
            <Modal.Header>Edit Timeslot</Modal.Header>
            <Modal.Body className="">
            <div className="flex flex-col">
                {notification && (
                    <Alert color={notification.type == 'success' ? 'green' : notification.type == 'error' ? 'red' : 'gray'} className="mb-2" onDismiss={() => setNotification(undefined)}>{notification.message}</Alert>
                )}
                {timeslots.isLoading ? (
                    <span>Loading...</span>
                ) : (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="flex flex-col items-center">
                            <div className="flex flex-col gap-2">
                                <Label className="ms-2 font-medium text-lg" htmlFor="name">Start:</Label>
                                <Dropdown placement="bottom-end" label={typeof startTime === 'string' ? startTime : startTime.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })} color="light" id="name" name="name" className="overflow-auto max-h-[250px]">
                                    {times.map((time, index) => {
                                        return (
                                            <Dropdown.Item 
                                                key={index} 
                                                className={`disabled:text-gray-400 disabled:cursor-not-allowed`}
                                                disabled={!startEnabled(time)}
                                                onClick={() => {
                                                    setStartTime(time)
                                                }}
                                            >
                                                {time.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })}
                                            </Dropdown.Item>
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
                                            <Dropdown.Item 
                                                key={index} 
                                                className={`disabled:text-gray-400 disabled:cursor-not-allowed`}
                                                disabled={!endEnabled(time)} 
                                                onClick={() => {
                                                    setEndTime(time)
                                                }}
                                            >
                                                {time.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })}
                                            </Dropdown.Item>
                                        )
                                    })}
                                </Dropdown>
                            </div>
                        </div>
                    </div>
                )}
                <div className='flex flex-row items-center justify-center mb-4'>
                    <Datepicker inline value={activeDate} onChange={(date) => {
                        if(date){
                            const tempStart = startTime
                            tempStart.setFullYear(activeDate.getFullYear(), activeDate.getMonth(), activeDate.getDate())
                            const tempEnd = endTime
                            tempEnd.setFullYear(activeDate.getFullYear(), activeDate.getMonth(), activeDate.getDate())
                            setActiveDate(date)
                            setStartTime(tempStart)
                            setEndTime(tempEnd)
                        }
                    }}/>
                </div>
                <div className="grid grid-cols-2">
                    <div className="flex flex-col gap-2 mb-4 self-center items-center justify-center">
                        <Label className="font-medium text-lg" htmlFor="name">
                            Participant:
                        </Label>
                        <Label className="text-xl">
                        {timeslot!.participant ? (
                                <span>{timeslot!.participant.preferredName ?? timeslot!.participant.firstName}{' '}{timeslot!.participant.lastName}</span>
                            ) : 'None'}
                        </Label>
                    </div>
                    <div className="flex flex-col gap-2 mb-4 self-center items-center justify-center">
                        <Label className="font-medium text-lg" htmlFor="name">
                            User/Parent:
                        </Label>
                        <Label className="text-xl">
                        {user.data?.[0] !== undefined ? (
                                <span>{user.data[0].first}{' '}{user.data[0].last}</span>
                            ) : 'None'}
                        </Label>
                    </div>
                </div>
                
            </div>
            </Modal.Body>
            <Modal.Footer className="flex flex-row-reverse gap-4">
                <Button onClick={() => onClose()}>Done</Button>
                <Button
                    color="light"
                    onClick={async () => {
                        setSubmitting(true)
                        const response = mutation.mutate({
                            ...timeslot!,
                            start: startTime,
                            end: endTime,
                        })
                        console.log(response)
                    }}
                    isProcessing={submitting}
                >
                    Update
                </Button>
                {calculateOverlap !== undefined ? (
                    <Tooltip content={<span>This new date overlaps with an existing timeslot(s){calculateOverlap == 'emergency' && ' with a registration'}</span>}>
                        <HiOutlineExclamation size={32} className={`${calculateOverlap == 'emergency' ? 'fill-red-400' : 'fill-yellow-400'}`}/>
                    </Tooltip>
                ) : undefined}
            </Modal.Footer>
        </Modal>
    )
}

export const EditTimeslotModal: FC<EditTimeslotModalProps> = ({open, onClose, timeslot}) => {
    if(!timeslot) return null
    else{
        return (<EditTimeslotModalComponent open={open} onClose={onClose} timeslot={timeslot} />)
    }
}