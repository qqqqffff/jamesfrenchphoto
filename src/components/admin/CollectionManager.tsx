import { generateClient } from "aws-amplify/api";
import { Button, Dropdown, Modal } from "flowbite-react";
import { useEffect, useState } from "react";
import { HiOutlineCamera, HiOutlineChevronDown, HiOutlineChevronLeft, HiOutlineExclamationCircle, HiOutlinePlusCircle } from "react-icons/hi";
import { 
    HiEllipsisHorizontal, 
    // HiOutlineMinusCircle, 
    // HiOutlinePencil 
} from "react-icons/hi2";
import { Schema } from "../../../amplify/data/resource";
import { remove } from "aws-amplify/storage";
import { PhotoCollectionComponent } from "./PhotoCollection";
import { PhotoCollection, PicturePath, Event, UserTag } from "../../types";
import { CreateCollectionModal, CreateEventModal } from "../modals";

const client = generateClient<Schema>()

export default function CollectionManager(){
    const [groupToggles, setGroupToggles] = useState<Boolean[]>([false])
    const [activeItem, setActiveItem] = useState(
        <div className="w-[80%] border border-gray-400 rounded-lg p-2 flex flex-row items-center justify-center">
            Select An Event Item to View
        </div>
    )
    const [createEventModalVisible, setCreateEventModalVisible] = useState(false)
    const [createPhotoCollectionModalVisible, setCreatePhotoCollectionModalVisible] = useState(false)
    const [eventList, setEventList] = useState<Event[]>([])
    const [subcategoryId, setSubcategoryId] = useState<string>()
    const [pictureCollection] = useState<PhotoCollection | undefined>()
    const [pictureCollectionPaths, setPictureCollectionPaths] = useState<PicturePath[] | undefined>()
    const [createCollectionForId, setCreateCollectionForId] = useState('')
    const [photoViewUrl, setPhotoViewUrl] = useState<PicturePath>()
    const [photoModalVisible, setPhotoModalVisible] = useState(false)
    const [availableTags, setAvailableTags] = useState<UserTag[]>([])

    const [apiCall, setApiCall] = useState(false)

    useEffect(() => {
        async function api() {
            console.log('api call')
            const eList: Event[] = (await Promise.all((await client.models.Events.list()).data.map(async (event) => {
                const collectionResponse = await event.collections()
                const collections: PhotoCollection[] = collectionResponse.data.map((collection) => {
                    const mappedCollection: PhotoCollection = {
                        ...collection,
                        coverPath: collection.coverPath ?? undefined,
                        paths: [], //TODO: implement me
                        tags: [],
                    }
                    return mappedCollection
                })
                const mappedEvent: Event = {
                    ...event,
                    collections: collections,
                }
                return mappedEvent
            }))).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            const groupToggles = eList.map(() => false)

            const availableTags = await Promise.all((await client.models.UserTag.list()).data.map((tag) => {
                const mappedTag: UserTag = {
                    ...tag,
                    color: tag.color ?? undefined,
                }
                return mappedTag
            }))

            setGroupToggles(groupToggles)
            setEventList(eList)
            setAvailableTags(availableTags)
            setApiCall(true)
        }
        if(!apiCall){
            api()
        }
    })

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
                                const collection = await renderPhotoCollection(item)

                                setSubcategoryId(item.id)
                                setActiveItem(collection)
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

    async function renderPhotoCollection(item: PhotoCollection | undefined): Promise<JSX.Element> {
        if(!item){
            return (<>Error</>)
        }
        const paths = await Promise.all(((await client.models.PhotoPaths.listPhotoPathsByCollectionId({ collectionId: item.id })).data).map(async (path) => {
            return {
                id: path.id,
                order: path.order,
                path: path.path,
                url: ''
            } as PicturePath
        }))
        console.log(paths)
        return (<PhotoCollectionComponent photoCollection={item} photoPaths={paths}/>)
        // if(!interactionOverride)
        //     setInteractingCollection({interactionOverride: false, buttonText: 'Delete Picture(s)', selectedURLs: ([] as string[])})
        
        // let picturePaths = ([] as PicturePath[])
        // if(subcategoryId != item.id){
        //     const collection = (await client.models.PhotoCollection.listPhotoCollectionBySubCategoryId({
        //         subCategoryId: item.id
        //     })).data[0]
        //     console.log(collection)
        //     setPictureCollection({ ...collection })

        //     let paths = (await client.models.PhotoPaths.listPhotoPathsByCollectionId({ collectionId: collection.id })).data.map((item) => {
        //         return {
        //             id: item.id,
        //             path: item.path,
        //             width: !item.displayWidth ? 200 : item.displayWidth,
        //             height: !item.displayHeight ? 200 : item.displayHeight,
        //             url: ''
        //         }
        //     })
        //     console.log(paths)

        //     if(paths && paths.length > 0){
        //         paths = await Promise.all(paths.map(async (item) => {
        //             return {
        //                 ...item,
        //                 url: (await getUrl({
        //                     path: item.path
        //                 })).url.toString()
        //             }
        //         }))
        //         setPictureCollectionPaths(paths)
        //     }
        //     picturePaths = paths
        // }
        // else{
        //     picturePaths = !pictureCollectionPaths ? [] : pictureCollectionPaths
        // }
        // // console.log(picturePaths)
        // if(!interactionOverride) {
        //     if(picturePaths.length > 0){
        //         setEventControls(renderPhotoCollectionControls('photoCollection', [false, false, false, false, false, false], item.id))
        //     }
        //     else{
        //         setEventControls(renderPhotoCollectionControls('photoCollection', [false, true, true, true, false, false], item.id))
        //     }
        // }

        // const pictures = picturePaths.map((path, index: number) => {
        //     let styling = "enabled:hover:bg-gray-200 w-auto h-auto"
        //     if(interactingCollection.selectedURLs){
        //         styling += (interactingCollection.selectedURLs.includes(path.url) ? 'bg-gray-100' : '')
        //     }
        //     return (
        //         //TODO: fix the display when the photos are selected
        //         <button key={index} className={`flex flex-row hover:bg-gray-200 ${interactingCollection.selectedURLs.includes(path.path) ? 'bg-gray-300' : 'bg-transparent'} h-[${path.height.toString()}px] w-[${path.width.toString()}px]`} onClick={async () => {
        //             if(interactionOverride){
        //                 const interacting = {...interactingCollection}
        //                 if(!interacting.selectedURLs.includes(path.path))
        //                     interacting.selectedURLs.push(path.path)
        //                 else{
        //                     interacting.selectedURLs = interacting.selectedURLs.filter((item) => item != path.path)
        //                 }
        //                 setInteractingCollection(interacting)
        //                 setActiveItem(await renderPhotoCollection(item, interactionOverride))
        //                 console.log(interacting)
        //             }
        //             else{
        //                 setPhotoViewUrl(path)
        //                 setPhotoModalVisible(true)
        //             }
        //         }}>
        //             <img  src={path.url} alt="picture" className={`h-[${path.height.toString()}px] w-[${path.width.toString()}px] object-fill`}/>
        //         </button>
        //     )
        // })
            
        // return (
        //     <>
                
        //         {pictures ? 
        //             (
        //                 <div className="flex flex-row border-black border gap-1">
        //                     {pictures}
        //                 </div>
        //             ) 
        //             : (<p>Upload pictures to start!</p>)}
        //     </>
        // )
        
    }

    return (
        <>
            <CreateEventModal open={createEventModalVisible} onClose={() => setCreateEventModalVisible(false)}
                onSubmit={(event) => {
                    if(event){
                        console.log(event)
                        setEventList([...eventList, event])
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
                        const temp = eventList.find((event) => event.id === createCollectionForId)
                        if(temp){
                            temp.collections.push(collection)
                            setEventList(eventList.map((event) => {
                                if(event.id === createCollectionForId){
                                    return temp
                                }
                                return event
                            }))
                        }
                    } 
                    //TODO: error handle
                }}
                availableTags={availableTags}
            />
            {/* TODO: implement delete confirmation modal */}
            <Modal show={photoModalVisible} onClose={() => {
                setPhotoModalVisible(false)
                setPhotoViewUrl(undefined)
            }}>
                {/* //TODO: replace with a function */}
                <Modal.Header>Viewing Photo {[''].map(() => {
                    if(!photoViewUrl) {
                        return ''
                    }
                    let photoPath = photoViewUrl.url
                    if(!photoPath){
                        console.log(photoViewUrl)
                        return ''
                    }
                    let urlstr = photoPath!.substring(photoPath!.indexOf('photo-collections/'), photoPath!.indexOf('?'))
                    urlstr = urlstr.substring(urlstr.indexOf(subcategoryId!))
                    urlstr = urlstr.substring(urlstr.indexOf('_') + 1)
                    return urlstr
                })}</Modal.Header>
                <Modal.Body className="flex flex-col justify-center items-center gap-3">
                    {/* className={`w-[${photoViewUrl.width}px] h-[${photoViewUrl.height}px] hover:bg-gray-50 object-fill`} */}
                    {/* w-[${photoViewUrl.width.toString()}px] 
                        h-[${photoViewUrl.height.toString()}px]  */}
                    {photoViewUrl && photoViewUrl.url ? (<img src={photoViewUrl.url} className={`object-fill`}/>) : (<></>)}
                    {/* //TODO: replace with a function */}
                    <>{[''].map(() => {
                        if(!photoViewUrl || !photoViewUrl.url){
                            return (<></>)
                        }
                        // console.log(photoViewUrl)
                        let img = document.createElement('img')
                        img.src = photoViewUrl.url!
                        let imgSizeError = img.naturalWidth > 1280 || img.naturalHeight < 720 ? (<div className="flex flex-row items-center"><HiOutlineExclamationCircle className="me-1" size={24}/>Small image</div>) : (<></>)
                        return (
                            <div className="flex flex-col gap-1 items-center justify-center">
                                <p>Natural Size: {img.naturalWidth + ' x ' + img.naturalHeight}</p>
                                {imgSizeError}
                            </div>
                        )
                    })}
                    </>
                </Modal.Body>
                <Modal.Footer className="flex flex-row justify-end gap-1">
                    <Button color='light' onClick={async () => {
                        if(!photoViewUrl || !pictureCollection || !pictureCollectionPaths){
                            setPhotoModalVisible(false)
                            setPhotoViewUrl(undefined)
                            return
                        }
                        const s3removeResponse = await remove({
                            path: photoViewUrl.path,
                            // bucket: 'photo-collections'
                        })
                        console.log(s3removeResponse)
                        const pathsRemoveResponse = await client.models.PhotoPaths.delete({ id: photoViewUrl.id })
                        console.log(pathsRemoveResponse)
                        console.log(pictureCollectionPaths.filter((path) => path.id !== photoViewUrl.id))
                        setPictureCollectionPaths(pictureCollectionPaths.filter((path) => path.id !== photoViewUrl.id))
                        setPhotoModalVisible(false)
                        setPhotoViewUrl(undefined)
                    }}>Delete</Button>
                    <Button onClick={async () => {
                        //TODO: passing updates
                        setPhotoModalVisible(false)
                        setPhotoViewUrl(undefined)
                    }}>Done</Button>
                </Modal.Footer>
            </Modal>
            <div className="grid grid-cols-6 gap-2 mt-4 font-main">
                <div className="flex flex-col ms-5 border border-gray-400 rounded-lg p-2">
                    <button className="flex flex-row w-full items-center justify-between hover:bg-gray-100 rounded-2xl py-1 cursor-pointer" onClick={() => setCreateEventModalVisible(true)}>
                        <span className="text-xl ms-4 mb-1">Create New Event</span>
                        <HiOutlinePlusCircle className="text-2xl text-gray-600 me-2"/>
                    </button>
                    {eventList.map((event, index) => {
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
                    })}
                </div>
                <div className="col-span-5">
                    {activeItem}
                </div>
            </div>
        </>
    )
}