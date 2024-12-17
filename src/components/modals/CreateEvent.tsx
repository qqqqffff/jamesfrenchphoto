import { FC, useState } from "react";
import { ModalProps } from ".";
import { Button, Label, Modal, TextInput } from "flowbite-react";
import { Schema } from "../../../amplify/data/resource";
import { generateClient } from "aws-amplify/api";
import { Event } from "../../types";

const client = generateClient<Schema>()

interface CreateEventProps extends ModalProps {
    onSubmit: (event?: Event) => void
}

export const CreateEventModal: FC<CreateEventProps> = ({ onClose, open, onSubmit }) => {
    const [submitting, setSubmitting] = useState(false)
    const [eventName, setEventName] = useState<string>('')

    async function submit(){
        setSubmitting(true)
        let event: Event | undefined
        if(eventName){
            const response = await client.models.Events.create({
                name: eventName!,
            })
            if(response && response.data){
                event = {
                    ...response.data,
                    collections: []
                }
            }
        }
        setEventName('')
        setSubmitting(false)
        onClose()
        onSubmit(event)
    }
    return (
        <Modal show={open} onClose={() => {
            onClose()
        }}>
            <Modal.Header>Create a new Event</Modal.Header>
            <Modal.Body>
                <div className="flex flex-col">
                    <Label className="ms-2 font-semibold text-xl mb-4" htmlFor="name">Event Name:</Label>
                    <TextInput sizing='lg' className="mb-6" placeholder="Event Name" type="name" id="name" name="name" 
                        onChange={(event) => setEventName(event.target.value)}
                        value={eventName}
                    />
                </div>
            </Modal.Body>
            <Modal.Footer className="flex flex-row justify-end border-t" >
                <Button className="text-xl w-[40%] max-w-[8rem] mt-4" type="button" isProcessing={submitting} 
                    disabled={eventName === undefined}
                    onClick={async () => {
                        setSubmitting(true)
                        await submit()
                        setSubmitting(false)
                    }}
                >Create</Button>
            </Modal.Footer>
        </Modal>
    )
}