import { FC, FormEvent, useEffect, useState } from "react";
import { ModalProps } from ".";
import { Button, Datepicker, Dropdown, Label, Modal, TextInput } from "flowbite-react";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import { PhotoCollection, Subcategory, Timeslot } from "../../types";
import { formatTime } from "../../utils";

const client = generateClient<Schema>()

interface CreateTagFormElements extends HTMLFormControlsCollection {
    name: HTMLInputElement
    collection: HTMLInputElement
    timeslots: HTMLInputElement[]
}

interface CreateTagForm extends HTMLFormElement {
    readonly elements: CreateTagFormElements
}

export const CreateTagModal: FC<ModalProps> = ({open, onClose}) => {
    const [collections, setCollections] = useState<Subcategory[]>([])
    const [timeslots, setTimeslots] = useState<Timeslot[]>([])
    const [apiCall, setApiCall] = useState(false)
    const [activeCollection, setActiveCollection] = useState<Subcategory | undefined>()
    const [activeTimeslot, setActiveTimeslot] = useState<Timeslot | undefined>()
    const [activeDay, setActiveDay] = useState<Date>(new Date())

    useEffect(() => {
        async function fetch(){
            setCollections((await client.models.SubCategory.list()).data.map((sc) => {
                return {
                    ...sc
                } as Subcategory
            }).filter((sc) => sc.type === 'photoCollection'))

            setTimeslots((await client.models.Timeslot.list()).data.map((timeslot) => {
                return {
                    id: timeslot.id,
                    tagId: timeslot.tagId,
                    capacity: timeslot.capacity,
                    registers: timeslot.registers ? timeslot.registers : [],
                    start: new Date(timeslot.start),
                    end: new Date(timeslot.end),
                } as Timeslot
            }))

            setApiCall(true)
        }
        if(!apiCall){
            fetch()
        }
    })

    async function createTag(event: FormEvent<CreateTagForm>){
        event.preventDefault()

        const form = event.currentTarget
        console.log(form.elements)
    }

    return (
        <Modal show={open} onClose={() => onClose()}>
            <Modal.Header>Create a New Tag</Modal.Header>
            <Modal.Body>
                <form onSubmit={createTag} className="flex flex-col min-h-[500px]">
                    <div className="grid grid-cols-2 gap-8 mb-4">
                        <div className="flex flex-col gap-2">
                            <Label className="ms-2 font-medium text-lg" htmlFor="name">Name:</Label>
                            <TextInput sizing='md' className="" placeholder="Tag Name" type="text" id="name" name="name"/>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label className="ms-2 font-medium text-lg" htmlFor="name">Collection: {activeCollection?.name}</Label>
                            <Dropdown color={'light'} label='Collection' placement="bottom-start">
                                <Dropdown.Item onClick={() => setActiveCollection(undefined)}>None</Dropdown.Item>
                                {
                                    collections.map((collection, index) => {
                                        console.log(collection)
                                        return (<Dropdown.Item key={index} onClick={() => setActiveCollection(collection)}>{collection.name}</Dropdown.Item>)
                                    })
                                }
                            </Dropdown>
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-2">
                        <div className="flex flex-row items-center justify-center mb-4 gap-4">
                            <Label className="ms-2 font-medium text-lg" htmlFor="name">Timeslots for:</Label>
                            <Datepicker onSelectedDateChanged={async (date) => {
                                
                                setTimeslots((await client.models.Timeslot.list({filter: {
                                    start: {
                                        contains: date.toISOString()
                                    }
                                }})).data.map((timeslot) => {
                                    return {
                                        id: timeslot.id ?? '',
                                        tagId: timeslot.tagId ? timeslot.tagId as string : undefined,
                                        capacity: timeslot.capacity,
                                        registers: timeslot.registers ? timeslot.registers as string[] : [],
                                        start: new Date(timeslot.start),
                                        end: new Date(timeslot.end)
                                    }
                                }))
                                setActiveDay(date)
                            }}/>
                        </div>
                        {timeslots.length > 0 ? timeslots.map((timeslot) => {
                            return (<>hello world</>)
                        }) : <Label className="font-medium text-lg italic text-gray-500">No timeslots for this date</Label>}
                    </div>
                    
                    
                    
                    {/* //TODO: dropdown for collections
                    //TODO: date picker with filters for timeslots */}
                    <Button className="w-[100px] self-end" type="submit">Create</Button>
                </form>
            </Modal.Body>
        </Modal>
    )
}