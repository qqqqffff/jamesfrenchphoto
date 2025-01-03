import { FC, useState } from "react";
import { ModalProps } from ".";
import { Button, Label, Modal, TextInput } from "flowbite-react";
import { Event } from "../../types";
import { useMutation } from "@tanstack/react-query";
import { createEventMutation, CreateEventParams, updateEventMutation } from "../../services/eventService";

interface CreateEventProps extends ModalProps {
    onSubmit: (event?: Event) => void,
    event?: Event,
}

export const CreateEventModal: FC<CreateEventProps> = ({ onClose, open, onSubmit, event }) => {
    const [submitting, setSubmitting] = useState(false)
    const [eventName, setEventName] = useState<string | undefined>()

    function manageState(data?: Event) {
        setEventName(undefined)
        setSubmitting(false)
        onClose()
        onSubmit(data)
        //TODO: error handling
    }
    const updateEvent = useMutation({
        mutationFn: (event: Event) => updateEventMutation(event),
        onSettled: (data) => manageState(data ?? undefined)
    })
    const createEvent = useMutation({
        mutationFn: (params: CreateEventParams) => createEventMutation(params),
        onSettled: (data) => manageState(data ?? undefined)
    })

    function submit(){
        setSubmitting(true)

        if(eventName){
            if(event !== undefined){
                updateEvent.mutate({
                    ...event,
                    name: eventName,
                })
            }
            else {
                createEvent.mutate({
                    name: eventName,
                })
            }
        } 
    }

    return (
        <Modal show={open} onClose={() => manageState()}>
            <Modal.Header>{event ? 'Rename Event' : 'Create a New Event'}</Modal.Header>
            <Modal.Body>
                <div className="flex flex-col">
                    <Label className="ms-2 font-semibold text-xl mb-2" htmlFor="name">Event Name:</Label>
                    <TextInput sizing='lg' className="mb-2" placeholder="Event Name" type="text" 
                        onChange={(event) => setEventName(event.target.value)}
                        value={eventName ?? event?.name}
                    />
                </div>
            </Modal.Body>
            <Modal.Footer className="flex flex-row justify-end border-t" >
                <Button 
                    className="text-xl w-[40%] max-w-[8rem]" 
                    type="button" 
                    isProcessing={submitting} 
                    disabled={eventName === undefined || event?.name === eventName}
                    onClick={() => {
                        setSubmitting(true)
                        submit()
                    }}
                >{event ? 'Rename' : 'Create'}</Button>
            </Modal.Footer>
        </Modal>
    )
}