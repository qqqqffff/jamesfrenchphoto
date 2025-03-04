import { FC, FormEvent, useEffect, useState } from "react";
import { ModalProps } from ".";
import { Button, Checkbox, Datepicker, Dropdown, Label, Modal, TextInput } from "flowbite-react";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import { Participant, PhotoCollection, Timeslot, UserTag } from "../../types";
import { currentDate, DAY_OFFSET, defaultColors, GetColorComponent, textInputTheme } from "../../utils";
import { BiSolidSquareRounded } from "react-icons/bi";
import { CompactSlotComponent, SlotComponent } from "../timeslot/Slot";

const client = generateClient<Schema>()

interface CreateTagFormElements extends HTMLFormControlsCollection {
    name: HTMLInputElement
    collection: HTMLInputElement
    timeslots: HTMLInputElement[]
}

interface CreateTagForm extends HTMLFormElement {
    readonly elements: CreateTagFormElements
}

interface CreateTagProps extends ModalProps {
    existingTag?: UserTag
}

export const CreateTagModal: FC<CreateTagProps> = ({open, onClose, existingTag}) => {
    const [collections, setCollections] = useState<PhotoCollection[]>([])
    const [timeslots, setTimeslots] = useState<Timeslot[]>([])
    const [apiCall, setApiCall] = useState(false)
    const [activeCollections, setActiveCollections] = useState<PhotoCollection[]>([])
    const [activeTimeslots, setActiveTimeslots] = useState<Timeslot[]>([])
    const [activeColor, setActiveColor] = useState<string | undefined>()

    useEffect(() => {
        async function api(){
            console.log('api call')

            const collections = (await client.models.PhotoCollection.list()).data.map((photoCollection) => {
                const mappedCollection: PhotoCollection = {
                    ...photoCollection,
                    coverPath: photoCollection.coverPath ?? undefined,
                    publicCoverPath: photoCollection.publicCoverPath ?? undefined,
                    tags: [], //TODO: implement me
                    sets: [], //TODO: implement me
                    downloadable: photoCollection.downloadable ?? false,
                    watermarkPath: photoCollection.watermarkPath ?? undefined,
                    items: 0,
                    published: false
                }
                return mappedCollection
            })

            const timeslots = (await client.models.Timeslot.list({
                filter: {
                    start: {
                        contains: new Date(currentDate.getTime() + DAY_OFFSET).toISOString().substring(0, new Date(currentDate.getTime() + DAY_OFFSET).toISOString().indexOf('T'))
                    }
                }}))
                .data.map((timeslot) => {
                    if(!timeslot.id) return
                    const ts: Timeslot = {
                        id: timeslot.id,
                        register: timeslot.register ?? undefined,
                        start: new Date(timeslot.start),
                        end: new Date(timeslot.end),
                    }
                    return ts
                }
            ).filter((timeslot) => timeslot !== undefined)
            
            let activeTimeslots: Timeslot[] = []
            let activeCollections: PhotoCollection[] = []
            let activeColor: string | undefined = undefined

            if(existingTag){
                if(existingTag.collections){
                    activeCollections.push(...existingTag.collections)
                }
                if(existingTag.color){
                    activeColor = existingTag.color
                }
                const userTags = (await client.models.UserTag.get({id: existingTag.id}))
                console.log(userTags)
                const timeslotTags = await userTags.data?.timeslotTags()
                console.log(timeslotTags)
                if(timeslotTags){
                    activeTimeslots = (await Promise.all(timeslotTags.data.map(async (timeslotTags) => {
                        const timeslotResponse = (await timeslotTags.timeslot()).data
                        if(!timeslotResponse || timeslotResponse.id === null) return
                        const tagResponse = (await timeslotTags.tag()).data
                        let tag: UserTag | undefined
                        let participant: Participant | undefined
                        if(tagResponse) {
                            tag = { 
                                ...tagResponse,
                                color: tagResponse.color ?? undefined
                            }
                            const participantResponse = (await timeslotResponse.participant()).data
                            if(participantResponse){
                                participant = {
                                    ...participantResponse,
                                    preferredName: participantResponse.preferredName ?? undefined,
                                    //unnecessary fields
                                    userTags: [],
                                    middleName: undefined,
                                    email: undefined,
                                    contact: false,
                                    timeslot: undefined
                                }
                            }
                        }

                        const timeslot: Timeslot = {
                            ...timeslotResponse,
                            id: timeslotResponse.id!,
                            start: new Date(timeslotResponse.start),
                            end: new Date(timeslotResponse.end),
                            tag: tag,
                            participant: participant,
                            register: timeslotResponse.register ?? undefined
                        }
                        return timeslot
                    }))).filter((timeslot) => timeslot !== undefined)
                    console.log(activeTimeslots)
                }
                
            }
            setActiveColor(activeColor)
            setActiveTimeslots(activeTimeslots)
            setActiveCollections(activeCollections)
            setCollections(collections)
            setTimeslots(timeslots)
            setApiCall(true)
        }
        if(!apiCall && open){
            api()
        }
    })

    async function createTag(event: FormEvent<CreateTagForm>){
        event.preventDefault()
        const form = event.currentTarget
        
        if(existingTag){
            const response = await client.models.UserTag.update({
                id: existingTag.id,
                name: form.elements.name.value,
                color: activeColor,
            })
            console.log(response)

            const timeslotTags = (await response.data!.timeslotTags()).data
            const linkedTimeslotsIds = timeslotTags.map((timeslot) => {
                return timeslot.timeslotId
            })
            const activeTimeslotsIds = activeTimeslots.map((timeslot) => timeslot.id);
            const adjustedTimeslots = activeTimeslots.filter((timeslot) => !linkedTimeslotsIds.includes(timeslot.id))
            const removedTimeslots = linkedTimeslotsIds.filter((id) => !activeTimeslotsIds.includes(id)).map((id) => {
                return timeslotTags.find((timeslotTag) => timeslotTag.timeslotId === id)
            }).filter((item) => item !== undefined)

            const taggingResponse = await Promise.all(adjustedTimeslots.map(async (timeslot) => {
                const response = await client.models.TimeslotTag.create({
                    tagId: existingTag.id,
                    timeslotId: timeslot.id,
                })
                return response.data
            }))

            const removedTagsResponse = await Promise.all(removedTimeslots.map(async (timeslotTag) => {
                const response = await client.models.TimeslotTag.delete({
                    timeslotId: timeslotTag.timeslotId
                })
                return response.data
            }))

            console.log(taggingResponse)
            console.log(removedTagsResponse)
        }

        else {
            const response = await client.models.UserTag.create({
                name: form.elements.name.value,
                color: activeColor,
            })
            console.log(response)

            if(response !== null && response.data !== null){
                const taggingResponse = await Promise.all(activeTimeslots.map(async (timeslot) => {
                    const rsp = await client.models.TimeslotTag.create({
                        tagId: response.data!.id,
                        timeslotId: timeslot.id,
                    })
                    return rsp
                }))

                console.log(taggingResponse)
            }
        }


        clearStates()
        onClose()
    }

    function clearStates() {
        setCollections([])
        setTimeslots([])
        setActiveCollections([])
        setActiveTimeslots([])
        setActiveColor(undefined)
        setApiCall(false)
    }

    return (
        <Modal show={open} onClose={() => {
            clearStates()
            onClose()
        }}>
            <Modal.Header>{existingTag ? 'Update Tag' : 'Create a New Tag'}</Modal.Header>
            <Modal.Body>
                <form onSubmit={createTag} className="flex flex-col">
                    <div className="grid grid-cols-2 gap-8 mb-4">
                        <div className="flex flex-col gap-2">
                            <Label className="ms-2 font-medium text-lg" htmlFor="name">Name:</Label>
                            <TextInput sizing='md' theme={textInputTheme} color={activeColor} placeholder="Tag Name" type="text" id="name" name="name" defaultValue={existingTag?.name}/>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label className="ms-2 font-medium text-lg" htmlFor="name">Collection: {
                                activeCollections.length > 0 ? activeCollections.reduce((prev, cur) => (prev === '' ? '' : prev + ', ') + cur.name, '') : 'None'
                            }</Label>
                            <Dropdown color={'light'} label='Collection' placement="bottom-start" dismissOnClick={false}>
                                {
                                    collections.map((collection, index) => {
                                        const tempMap = activeCollections.map((collection) => collection.id)
                                        return (
                                            <Dropdown.Item key={index}>
                                                <button className="flex flex-row gap-2 text-left items-center" onClick={() => {
                                                    let temp = [...activeCollections]
                                                    
                                                    if(tempMap.includes(collection.id)){
                                                        temp = temp.filter((t) => t.id !== collection.id)
                                                    }
                                                    else{
                                                        temp.push(collection)
                                                    }
                                                    
                                                    setActiveCollections(temp)
                                                }} type="button">
                                                    <Checkbox className="mt-1" checked={tempMap.includes(collection.id)} readOnly />
                                                    <span>{collection.name}</span>
                                                </button>
                                            </Dropdown.Item>
                                        )
                                    })
                                }
                            </Dropdown>
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center gap-2 border-b border-gray-500 pb-4">
                        <div className="flex flex-row items-center justify-center gap-4">
                            <Label className="ms-2 font-medium text-lg" htmlFor="name">Timeslots for:</Label>
                            <Datepicker minDate={currentDate} defaultValue={new Date(currentDate.getTime() + DAY_OFFSET)} onChange={async (date) => {
                                if(!date) return

                                const timeslots = (await client.models.Timeslot.list({
                                    filter: {
                                        start: {
                                            contains: date.toISOString().substring(0, date.toISOString().indexOf('T'))
                                        }
                                    }}))
                                    .data.map((timeslot) => {
                                        if(!timeslot.id) return
                                        const ts: Timeslot = {
                                            id: timeslot.id,
                                            register: timeslot.register ?? undefined,
                                            start: new Date(timeslot.start),
                                            end: new Date(timeslot.end),
                                        }
                                        return ts
                                    }
                                ).filter((timeslot) => timeslot !== undefined)

                                setTimeslots(timeslots)
                            }}/>
                        </div>
                        <div className="grid grid-cols-2 gap-2 w-full border-gray-500 border rounded-lg px-2 py-4 max-h-[250px] overflow-auto">
                            {timeslots.length > 0 ? timeslots.map((timeslot, index) => {
                                const selected = activeTimeslots.filter((ts) => ts.id === timeslot.id).length > 0
                                const selectedBg = selected ? 'bg-gray-200' : ''
                                return (
                                    <button key={index} className={`hover:bg-gray-200 rounded-lg ${selectedBg}`} type='button' onClick={() => {
                                        if(!selected){
                                            setActiveTimeslots([...activeTimeslots, timeslot])
                                        }
                                        else {
                                            const timeslots = activeTimeslots.filter((ts) => ts.id !== timeslot.id)
                                            setActiveTimeslots(timeslots)
                                        }
                                    }}><SlotComponent timeslot={timeslot} participant={timeslot.participant} tag={timeslot.tag} /></button>)
                            }) : <Label className="text-lg italic text-gray-500">No timeslots for this date</Label>}
                        </div>
                        <div className="grid grid-cols-2 gap-2 w-full border-gray-500 rounded-lg px-2 py-2 max-h-[250px] overflow-auto">
                            {activeTimeslots.length > 0 ? activeTimeslots.map((timeslot) => {
                                return (
                                    <button className="hover:bg-red-300 rounded-lg" type='button' onClick={() => {
                                        const timeslots = activeTimeslots.filter((ts) => ts.id !== timeslot.id)
                                        setActiveTimeslots(timeslots)
                                    }}>
                                        <CompactSlotComponent timeslot={timeslot} participant={timeslot.participant} tag={timeslot.tag} />
                                    </button>
                                )
                            }) : <Label className="text-lg italic text-gray-500">No selected timeslots</Label>}
                        </div>
                    </div>
                    <div className="flex flex-col items-center justify-center mb-4 mt-2">
                        <Label className="text-lg" htmlFor="name">Color: <GetColorComponent activeColor={activeColor} /></Label>
                        <div className="grid grid-cols-7 gap-2">
                            {defaultColors.map((color, index) => {
                                const className = 'fill-' + color + ' cursor-pointer'
                                return (<BiSolidSquareRounded key={index} size={48} className={className} onClick={() => setActiveColor(color)}/>)
                            })}
                        </div>
                        <Button className="mt-2" type='button' onClick={() => setActiveColor(undefined)} color="light">Clear</Button>
                    </div>
                    <Button className="w-[100px] self-end" type="submit">{existingTag ? 'Update' : 'Create'}</Button>
                </form>
            </Modal.Body>
        </Modal>
    )
}