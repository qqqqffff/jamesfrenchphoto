import { Dropdown } from "flowbite-react";
import { useState } from "react";
import { HiOutlineCamera, HiOutlineChevronDown, HiOutlineChevronLeft, HiOutlinePlusCircle } from "react-icons/hi";
import { 
    HiEllipsisHorizontal, 
    // HiOutlineMinusCircle, 
    // HiOutlinePencil 
} from "react-icons/hi2";
import { PhotoCollectionComponent } from "./PhotoCollection";
import { PhotoCollection, Event } from "../../types";
import { CreateCollectionModal, CreateEventModal } from "../modals";
import { useQuery } from "@tanstack/react-query";
import { getAllEventsQueryOptions, getAllPicturePathsQueryOptions, getAllWatermarkObjectsQueryOptions } from "../../services/collectionService";
import { getAllUserTagsQueryOptions } from "../../services/userService";

export default function CollectionManager(){
    const [groupToggles, setGroupToggles] = useState<Boolean[]>([false])
    const [createEventModalVisible, setCreateEventModalVisible] = useState(false)
    const [createPhotoCollectionModalVisible, setCreatePhotoCollectionModalVisible] = useState(false)
    const eventList = useQuery(getAllEventsQueryOptions())
    const [createCollectionForId, setCreateCollectionForId] = useState('')
    const availableTags = useQuery(getAllUserTagsQueryOptions({ siCollections: false }))
    const [collection, setCollection] = useState<PhotoCollection | null>()
    const picturePaths = useQuery(getAllPicturePathsQueryOptions(collection?.id))
    const watermarkObjects = useQuery(getAllWatermarkObjectsQueryOptions())

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
                                await new Promise(resolve => setTimeout(resolve, 1))
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

    return (
        <>
            <CreateEventModal open={createEventModalVisible} onClose={() => setCreateEventModalVisible(false)}
                onSubmit={(event) => {
                    if(event){
                        console.log(event)
                        eventList.refetch()
                    } else {
                        //TODO: error handle
                    }
                }}
            />
            <CreateCollectionModal 
                eventId={createCollectionForId}
                open={createPhotoCollectionModalVisible} 
                onClose={() => setCreatePhotoCollectionModalVisible(false)}
                onSubmit={(collection) => {
                    if(collection){
                        eventList.refetch()
                    } 
                    //TODO: error handle
                }}
                availableTags={availableTags.data ?? []}
            />
            <div className="grid grid-cols-6 gap-2 mt-4 font-main">
                <div className="flex flex-col ms-5 border border-gray-400 rounded-lg p-2">
                    <button className="flex flex-row w-full items-center justify-between hover:bg-gray-100 rounded-2xl py-1 cursor-pointer" onClick={() => setCreateEventModalVisible(true)}>
                        <span className="text-xl ms-4 mb-1">Create New Event</span>
                        <HiOutlinePlusCircle className="text-2xl text-gray-600 me-2"/>
                    </button>

                    {!eventList.isLoading ? 
                        eventList.data && eventList.data.length > 0 ? 
                            (eventList.data.map((event, index) => {
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
                                                {/* //TODO: implement me <Dropdown.Item><HiOutlinePencil className="me-1"/>Rename Event</Dropdown.Item> */}
                                                <Dropdown.Item onClick={() => {
                                                        setCreatePhotoCollectionModalVisible(true)
                                                        setCreateCollectionForId(event.id)
                                                    }}
                                                >
                                                    <HiOutlinePlusCircle className="me-1"/>Create Photo Collection
                                                </Dropdown.Item>
                                                {/* <Dropdown.Item onClick={() => {
                                                    //TODO: implement me
                                                }}><HiOutlineMinusCircle className="me-1"/>Delete Event</Dropdown.Item> */}
                                            </Dropdown>
                                        </div>
                                        {activeItems(event, groupToggles[index])}
                                    </div>
                                )
                            })) : (
                                <span className="text-gray-400">No events</span>
                        ) : (
                            <span>Loading...</span>
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
                                Loading...
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