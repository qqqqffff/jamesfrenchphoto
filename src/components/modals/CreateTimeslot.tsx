import { FC, FormEvent, useState } from "react";
import { ModalProps } from ".";
import { Button, Dropdown, Label, Modal, TextInput } from "flowbite-react";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import { formatTime } from "../../utils";

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
        new Date(day.getTime() + 8 * 3600 * 1000),
        new Date(day.getTime() + 9 * 3600 * 1000),
        new Date(day.getTime() + 10 * 3600 * 1000),
        new Date(day.getTime() + 11 * 3600 * 1000),
        new Date(day.getTime() + 12 * 3600 * 1000),
        new Date(day.getTime() + 13 * 3600 * 1000),
        new Date(day.getTime() + 14 * 3600 * 1000),
        new Date(day.getTime() + 15 * 3600 * 1000),
        new Date(day.getTime() + 16 * 3600 * 1000),
        new Date(day.getTime() + 17 * 3600 * 1000),
        new Date(day.getTime() + 18 * 3600 * 1000),
        new Date(day.getTime() + 19 * 3600 * 1000),
        new Date(day.getTime() + 20 * 3600 * 1000),
    ]

    async function createTimeslot(event: FormEvent<CreateTimeslot>){
        event.preventDefault()
        const form = event.currentTarget

        const response = await client.models.Timeslot.create({
            start: startTime.toString(),
            end: endTime.toString(),
            capacity: Number.parseInt(form.elements.capacity.value)
        })

        console.log(response)

        onClose()
    }

    return (
        <Modal show={open} onClose={() => onClose()}>
            <Modal.Header>Create a New Timeslot</Modal.Header>
            <Modal.Body>
                <form onSubmit={createTimeslot}>
                    <div className="flex flex-col">
                        <span className="self-center text-lg">Date:</span>
                        <span className="self-center text-2xl mb-4 underline underline-offset-4">{day.toLocaleDateString()}</span>
                        <div className="grid grid-cols-2 gap-2 mb-6">
                            <div className="flex flex-col items-center">
                                <div className="flex flex-col gap-2">
                                    <Label className="ms-2 font-medium text-lg" htmlFor="name">Start:</Label>
                                    <Dropdown placement="bottom-end" label={formatTime(startTime)} color="light" id="name" name="name">
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
                                    <Dropdown placement="bottom-end" label={formatTime(endTime)} color="light" id="name" name="name" disabled={typeof startTime == 'string'}>
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