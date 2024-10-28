import { FC, FormEvent, useState } from "react";
import { ModalProps } from ".";
import { Button, Dropdown, Label, Modal, TextInput } from "flowbite-react";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import { DAY_OFFSET, formatTime } from "../../utils";

const client = generateClient<Schema>()

interface CreateTimeslotElements extends HTMLFormControlsCollection {
    capacity: HTMLInputElement
}

interface CreateTimeslot extends HTMLFormElement {
    readonly elements: CreateTimeslotElements
}

interface CreateTimeslotModalProps extends ModalProps {
    day: Date;
}

export const CreateTimeslotModal: FC<CreateTimeslotModalProps> = ({open, onClose, day}) => {
    const [startTime, setStartTime] = useState<string | Date>('Select Start Time')
    const [endTime, setEndTime] = useState<string | Date>('Select End Time')
    const times = [
        new Date(day.getTime() + DAY_OFFSET * (8/24)),
        new Date(day.getTime() + DAY_OFFSET * (9/24)),
        new Date(day.getTime() + DAY_OFFSET * (10/24)),
        new Date(day.getTime() + DAY_OFFSET * (11/24)),
        new Date(day.getTime() + DAY_OFFSET * (12/24)),
        new Date(day.getTime() + DAY_OFFSET * (13/24)),
        new Date(day.getTime() + DAY_OFFSET * (14/24)),
        new Date(day.getTime() + DAY_OFFSET * (15/24)),
        new Date(day.getTime() + DAY_OFFSET * (16/24)),
        new Date(day.getTime() + DAY_OFFSET * (17/24)),
        new Date(day.getTime() + DAY_OFFSET * (18/24)),
        new Date(day.getTime() + DAY_OFFSET * (19/24)),
        new Date(day.getTime() + DAY_OFFSET * (20/24)),
    ]

    async function createTimeslot(event: FormEvent<CreateTimeslot>){
        event.preventDefault()
        const form = event.currentTarget

        if(typeof startTime === 'string' || typeof endTime === 'string') return


        const response = await client.models.Timeslot.create({
            start: startTime.toISOString(),
            end: endTime.toISOString(),
            capacity: Number.parseInt(form.elements.capacity.value)
        })

        console.log(response)

        // onClose()
    }

    return (
        <Modal show={open} onClose={() => {
            setStartTime('Select Start Time')
            setEndTime('Select End Time')
            onClose()
        }}>
            <Modal.Header>Create a New Timeslot</Modal.Header>
            <Modal.Body>
                <form onSubmit={createTimeslot}>
                    <div className="flex flex-col over">
                        <span className="self-center text-lg max-h-">Date:</span>
                        {/* TODO: scrollable date arrows */}
                        <span className="self-center text-2xl mb-4 underline underline-offset-4">{day.toLocaleDateString()}</span>
                        <div className="grid grid-cols-2 gap-2 mb-6">
                            <div className="flex flex-col items-center">
                                <div className="flex flex-col gap-2">
                                    <Label className="ms-2 font-medium text-lg" htmlFor="name">Start:</Label>
                                    <Dropdown placement="bottom-end" label={formatTime(startTime)} color="light" id="name" name="name" className="overflow-auto max-h-[250px]">
                                        {times.map((time, index) => { 
                                                return (
                                                    <Dropdown.Item key={index} onClick={() => setStartTime(time)}>{formatTime(time)}</Dropdown.Item>
                                                )
                                            })}
                                    </Dropdown>
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="flex flex-col gap-2">
                                    <Label className="ms-2 font-medium text-lg" htmlFor="name">End:</Label>
                                    <Dropdown placement="bottom-end" label={formatTime(endTime)} color="light" id="name" name="name" disabled={typeof startTime == 'string'} className="overflow-auto max-h-[250px]">
                                        {times.map((time, index) => { 
                                                return (
                                                    <Dropdown.Item key={index} className='disabled:text-gray-400 disabled:cursor-not-allowed' disabled={time <= startTime} onClick={() => setEndTime(time)}>{formatTime(time)}</Dropdown.Item>
                                                )
                                            })}
                                    </Dropdown>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-row gap-2 w-[70%] self-center items-center justify-center">
                            <Label className="ms-2 font-medium text-lg" htmlFor="capacity">Capacity:</Label>
                            <TextInput className="" placeholder='Capacity' name="capacity" id="capacity" type="number"/>
                        </div>
                    </div>
                    <div className="flex flex-row justify-end border-t mt-4">
                        <Button className="text-xl w-[40%] max-w-[8rem] mt-4" type="submit" >Create</Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    )
}