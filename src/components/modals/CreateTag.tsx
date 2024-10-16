import { FC, FormEvent, useEffect, useState } from "react";
import { ModalProps } from ".";
import { Button, Label, Modal, TextInput } from "flowbite-react";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import { PhotoCollection, Subcategory, Timeslot } from "../../types";

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
                <form onSubmit={createTag} className="flex flex-col gap-2">
                    <Label className="ms-2 font-medium text-lg" htmlFor="name">Name:</Label>
                    <TextInput sizing='md' className="w-[60%]" placeholder="Tag Name" type="text" id="name" name="name"/>
                    //TODO: dropdown for collections
                    //TODO: date picker with filters for timeslots
                    <Button className="w-[100px]" type="submit">Create</Button>
                </form>
            </Modal.Body>
        </Modal>
    )
}