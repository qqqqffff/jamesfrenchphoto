import { Dropdown, Progress, TextInput } from "flowbite-react";
import { useState } from "react";
import { HiOutlineCamera, HiOutlineChevronDown, HiOutlineChevronLeft, HiOutlinePlusCircle } from "react-icons/hi";
import { 
    HiEllipsisHorizontal, 
    HiOutlineMinusCircle, 
    HiOutlinePencil 
} from "react-icons/hi2";
import { PhotoCollectionComponent } from "./PhotoCollection";
import { PhotoCollection, Event } from "../../types";
import { ConfirmationModal, CreateCollectionModal, CreateEventModal } from "../modals";
import { useMutation, useQuery } from "@tanstack/react-query";
import { deleteEventMutation, getAllEventsQueryOptions, getAllPicturePathsQueryOptions, getAllWatermarkObjectsQueryOptions } from "../../services/collectionService";
import { getAllUserTagsQueryOptions } from "../../services/userService";
import { textInputTheme } from "../../utils";

export default function CollectionManager(){
    const [groupToggles, setGroupToggles] = useState<Boolean[]>([false])
    const [createEventModalVisible, setCreateEventModalVisible] = useState(false)
    const [createPhotoCollectionModalVisible, setCreatePhotoCollectionModalVisible] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<Event>()
    const [collection, setCollection] = useState<PhotoCollection | null>()
    const [deleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false)
    const [loading, setLoading] = useState(false)
    const [filteredItems, setFilteredItems] = useState<Event[]>()

    const availableTags = useQuery(getAllUserTagsQueryOptions({ siCollections: false }))
    const picturePaths = useQuery(getAllPicturePathsQueryOptions(collection?.id))
    const eventList = useQuery(getAllEventsQueryOptions())
    const watermarkObjects = useQuery(getAllWatermarkObjectsQueryOptions())
    const deleteEvent = useMutation({
        mutationFn: (eventId: string) => deleteEventMutation(eventId),
        onSettled: async (data) => {
            if(data && data.collections.find((col) => col.id === collection?.id) !== undefined){
                setCollection(undefined)
            }
            await eventList.refetch()
            setLoading(false)
        }
    })

    if(!eventList.isLoading && eventList.data && groupToggles.length !== eventList.data.length){
        setGroupToggles(eventList.data.map(() => false))
    }

    function groupToggled(index: number){
        if(groupToggles[index]){
            return (<HiOutlineChevronDown className="me-3" />)
        }
        return (<HiOutlineChevronLeft className="me-3" />)
    }

    function activeItems(event: Event, visible: Boolean){
        if(!eventList) return (<></>)
        const items = event.collections

        if(visible) {
            return (
                items.map((item, index) => {
                    return (
                        <button key={index} type='button'
                            className="flex flex-row items-center ms-4 my-1 hover:bg-gray-100 ps-2 py-1 rounded-3xl cursor-pointer" 
                            onClick={async () => {
                                //reloading the collection
                                setCollection(null)
                                await new Promise(resolve => setTimeout(resolve, 0))
                                setCollection(item)
                            }}
                        >
                            <HiOutlineCamera className="mt-0.5 me-2"/><span>{item.name}</span>
                        </button>
                    )
                })
            )
        }
        return (<></>)
    }

    function filterItems(term: string): undefined | void {
        if(!term || !eventList.data || eventList.data.length <= 0) {
            setFilteredItems(undefined)
            return
        }

        const normalSearchTerm = term.trim().toLocaleLowerCase()

        const data: {event: Event, index: number}[] = eventList.data.map((item, index) => {
            const tempItem = {...item}
            let filterResult = false
            try {
                filterResult = item.name.trim().toLocaleLowerCase().includes(normalSearchTerm)
                
                if(filterResult) return {event: item, index: index}
                tempItem.collections = item.collections.filter((col) => col.name.trim().toLocaleLowerCase().includes(normalSearchTerm))

                filterResult = tempItem.collections.length > 0 || filterResult
            } catch (err) {
                return
            }
            if(filterResult) return {event: tempItem, index: index}
            return
        }).filter((item) => item !== undefined)

        console.log(data)
        setFilteredItems(data.map((item) => item.event))
        setGroupToggles(groupToggles.map((_, index) => data.find((item) => item.index === index) !== undefined))
    }

    return (
        <>
            <CreateEventModal 
                open={createEventModalVisible} 
                onClose={() => setCreateEventModalVisible(false)}
                onSubmit={async (event) => {
                    if(event !== undefined){
                        console.log(event)
                        setLoading(true)
                        await eventList.refetch()
                        setLoading(false)
                        setSelectedEvent(undefined)
                    } else {
                        //TODO: error handle
                    }
                }}
                event={selectedEvent}
            />
            <CreateCollectionModal 
                eventId={selectedEvent?.id ?? ''}
                open={createPhotoCollectionModalVisible} 
                onClose={() => setCreatePhotoCollectionModalVisible(false)}
                onSubmit={async (collection) => {
                    if(collection){
                        setLoading(true)
                        await eventList.refetch()
                        setLoading(false)
                    } 
                    //TODO: error handle
                }}
                availableTags={availableTags.data ?? []}
            />
            <ConfirmationModal 
                title={"Delete Event"} 
                body={`Deleting Event <b>${selectedEvent?.name}</b> will delete <b>ALL</b> collections,\n and <b>ALL</b> associated photos. This action <b>CANNOT</b> be undone!`} 
                denyText={"Cancel"} 
                confirmText={"Delete"} 
                confirmAction={async () => {
                    if(selectedEvent){
                        setLoading(true)
                        deleteEvent.mutate(selectedEvent.id)
                        setSelectedEvent(undefined)
                    } else {
                        //TODO: error handle
                    }
                }} 
                open={deleteConfirmationVisible} 
                onClose={() => setDeleteConfirmationVisible(false)}            
            />
            <div className="grid grid-cols-6 gap-2 mt-4 font-main">
                <div className="flex flex-col ms-5 border border-gray-400 rounded-lg p-2">
                    
                    <button 
                        className="flex flex-row w-full items-center justify-between hover:bg-gray-100 rounded-2xl py-1 cursor-pointer" 
                        onClick={() => setCreateEventModalVisible(true)}
                    >
                        <span className="text-xl ms-4 mb-1">Create New Event</span>
                        <HiOutlinePlusCircle className="text-2xl text-gray-600 me-2"/>
                    </button>

                    <TextInput 
                        className="self-center w-[80%]" 
                        theme={textInputTheme} sizing='sm' placeholder="Search" 
                        onChange={(event) => filterItems(event.target.value)}
                    />
                    <div className="w-full border border-gray-200 my-2"></div>

                    {!eventList.isLoading && !loading ? 
                        eventList.data && eventList.data.length > 0 ? 
                            ((filteredItems ?? eventList.data).map((event, index) => {
                                return (
                                    <div className="flex flex-col" key={index}>
                                        <div className="flex flex-row">
                                            <button 
                                                type="button"
                                                className="flex flex-row w-full items-center justify-between hover:bg-gray-100 rounded-2xl py-1" 
                                                onClick={() => {
                                                    const temp = [...groupToggles]
                                                    temp[index] = !temp[index]
                                                    setGroupToggles(temp)
                                                }}
                                            >
                                                <span className="text-xl ms-4 mb-1">{event.name}</span>
                                                {groupToggled(index)}
                                            </button>
                                            <Dropdown label={<HiEllipsisHorizontal size={24} className="hover:border-gray-400 hover:border rounded-full"/>} inline arrowIcon={false}>
                                                <Dropdown.Item
                                                    onClick={() => {
                                                        setCreateEventModalVisible(true)
                                                        setSelectedEvent(event)
                                                    }}
                                                >
                                                    <HiOutlinePencil className="me-1"/>Rename Event
                                                </Dropdown.Item>
                                                <Dropdown.Item onClick={() => {
                                                        setCreatePhotoCollectionModalVisible(true)
                                                        setSelectedEvent(event)
                                                    }}
                                                >
                                                    <HiOutlinePlusCircle className="me-1"/>Create Photo Collection
                                                </Dropdown.Item>
                                                <Dropdown.Item onClick={() => {
                                                    setDeleteConfirmationVisible(true)
                                                    setSelectedEvent(event)
                                                }}><HiOutlineMinusCircle className="me-1"/>Delete Event</Dropdown.Item>
                                            </Dropdown>
                                        </div>
                                        {activeItems(event, groupToggles[index])}
                                    </div>
                                )
                            })) : (
                                <span className="text-gray-400">No events</span>
                        ) : (
                            <Progress progress={100} textLabel="Loading..." textLabelPosition='inside' labelText size="lg"/>
                        )}
                </div>
                <div className="col-span-5">
                    {
                    collection === undefined ? (
                        <div className="w-[80%] border border-gray-400 rounded-lg p-2 flex flex-row items-center justify-center">
                            Select A Collection to View
                        </div>
                    ) : (
                        collection === null || picturePaths.isLoading || watermarkObjects.isLoading || availableTags.isLoading ? (
                            <div className="w-[80%] border border-gray-400 rounded-lg p-2 flex flex-row items-center justify-center">
                                <Progress progress={100} textLabel="Loading..." textLabelPosition='inside' labelText size="lg" className="min-w-[200px]"/>
                            </div>
                        ) : (
                            picturePaths.data == null || picturePaths.data == undefined || !watermarkObjects.data || !availableTags.data ? (
                                <div className="w-[80%] border border-gray-400 rounded-lg p-2 flex flex-row items-center justify-center">
                                    Failed to load
                                </div>
                            ) : (
                                <PhotoCollectionComponent 
                                    photoCollection={collection} 
                                    photoPaths={picturePaths.data} 
                                    watermarkObjects={watermarkObjects.data} 
                                    availableTags={availableTags.data}
                                />
                            )
                        )
                    )
                    }
                </div>
            </div>
        </>
    )
}