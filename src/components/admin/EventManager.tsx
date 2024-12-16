import { generateClient } from "aws-amplify/api";
import { Button, Dropdown, FileInput, Label, Modal, TextInput } from "flowbite-react";
import { FormEvent, useEffect, useState } from "react";
import { HiOutlineCamera, HiOutlineChevronDown, HiOutlineChevronLeft, HiOutlineExclamationCircle, HiOutlinePlusCircle } from "react-icons/hi";
import { HiEllipsisHorizontal, HiOutlinePencil } from "react-icons/hi2";
import { Schema } from "../../../amplify/data/resource";
import { remove } from "aws-amplify/storage";
import { PhotoCollectionComponent } from "./PhotoCollection";
import { PhotoCollection, PicturePath } from "../../types";

interface CreateEventFormElements extends HTMLFormControlsCollection{
    name: HTMLInputElement
}

interface CreateTableFormElements extends CreateEventFormElements{
    importData: HTMLInputElement
}

interface CreateEventForm extends HTMLFormElement{
    readonly elements: CreateEventFormElements
}

interface CreateTableForm extends HTMLFormElement{
    readonly elements: CreateTableFormElements
}

const client = generateClient<Schema>()


export default function EventManager(){
    const [groupToggles, setGroupToggles] = useState<Boolean[]>([false])
    const [eventItem, setEventItem] = useState(<>Select An Event Item to View</>)
    const [createModalVisible, setCreateModalVisible] = useState(false)
    const [createPhotoCollectionModalVisible, setCreatePhotoCollectionModalVisible] = useState(false)
    const [eventList, setEventList] = useState<any>()
    const [subcategoryId, setSubcategoryId] = useState<string>()
    const [photoCollections, setPhotoCollections] = useState<PhotoCollection[]>([])
    const [pictureCollection] = useState<PhotoCollection | undefined>()
    const [pictureCollectionPaths, setPictureCollectionPaths] = useState<PicturePath[] | undefined>()
    const [createTableForId, setCreateTableForId] = useState('')
    const [photoViewUrl, setPhotoViewUrl] = useState<PicturePath>()
    const [photoModalVisible, setPhotoModalVisible] = useState(false)

    useEffect(() => {
        if(!eventList){
            (async () => {
                const eList = (await client.models.Events.list()).data
                const groupToggles = eList.map(() => false)

                setGroupToggles(groupToggles)
                setEventList(eList)
                setPhotoCollections(((await client.models.PhotoCollection.list()).data.map((collection) => {
                    const photoCollection: PhotoCollection = {
                        ...collection,
                        coverPath: collection.coverPath ?? undefined,
                    }
                    return photoCollection
                })).filter((collection) => collection !== undefined))
            })()
            console.log('fetched')
        }
    })

    function groupToggled(index: number){
        if(groupToggles[index]){
            return (<HiOutlineChevronDown className="me-3" />)
        }
        return (<HiOutlineChevronLeft className="me-3" />)
    }

    function eventItems(eventName: string, eventId: string, visible: Boolean){
        console.log(eventName)
        if(!photoCollections) return (<></>)
        const items = photoCollections.filter((sc) => (sc.eventId === eventId))

        if(visible) {
            return items.map((item, index) => {
                return (
                    <button key={index} className="flex flex-row items-center ms-4 my-1 hover:bg-gray-100 ps-2 py-1 rounded-3xl cursor-pointer" onClick={async () => {
                        setSubcategoryId(item.id)
                        setEventItem(await renderPhotoCollection(item, false))
                    }}>
                        <HiOutlineCamera className="mt-0.5 me-2"/><span>{item.name}</span>
                    </button>
                )
            })
        }
        return (<></>)
    }

    async function renderPhotoCollection(item: PhotoCollection | undefined, interactionOverride: boolean){
        console.log(interactionOverride)
        if(!item){
            return (<>Error</>)
        }
        const photoCollection = ((await client.models.PhotoCollection.get({ id: item.id })).data)
        console.log(photoCollection)
        const paths = await Promise.all(((await client.models.PhotoPaths.listPhotoPathsByCollectionId({ collectionId: item.id })).data).map(async (path) => {
            return {
                id: path.id,
                order: path.order,
                width: path.displayWidth,
                height: path.displayHeight,
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
        //                 setEventItem(await renderPhotoCollection(item, interactionOverride))
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

    async function handleCreateEvent(event: FormEvent<CreateEventForm>){
        event.preventDefault()
        const form = event.currentTarget;

        const response = await client.models.Events.create({
            name: form.elements.name.value
        })

        console.log(response)

        if(!response.errors){
            const eventList = (await client.models.Events.list()).data;
            setEventList(eventList)
            setCreateModalVisible(false)
        }
        //trigger a rerender of the side console
    }

    async function handleCreatePhotoCollection(event: FormEvent<CreateTableForm>){
        event.preventDefault()
        const form = event.currentTarget;

        const photoCollectionResponse = await client.models.PhotoCollection.create({
            name: form.elements.name.value,
            eventId: createTableForId,
        })
        console.log(photoCollectionResponse)

        // if(!response.errors){
        //     const scList: Subcategory[] = (await client.models.SubCategory.list()).data.map((subcategory) => {
        //         const headers = subcategory.headers ? subcategory.headers.filter((header): header is string => header !== null) : undefined
        //         return {
        //             ...subcategory,
        //             headers: headers
        //         }
        //     })
        //     console.log(scList)
        //     setSubcategories(scList)
        //     setCreatePhotoCollectionModalVisible(false)
        //     setCreateTableForId('')
        // }
    }

    function eventListComponents(){
        if(eventList satisfies []){
            return (eventList.map((event: any, index: number) => {
                return (
                    <div className="flex flex-col" key={index}>
                        <div className="flex flex-row">
                            <div className="flex flex-row w-full items-center justify-between hover:bg-gray-100 rounded-2xl py-1 cursor-pointer" onClick={() => {setGroupToggles([!groupToggles[index], ...groupToggles])}}>
                                <span className="text-xl ms-4 mb-1">{event.name}</span>
                                {groupToggled(index)}
                            </div>
                            <Dropdown label={<HiEllipsisHorizontal size={24} className="hover:border-gray-400 hover:border rounded-full"/>} inline arrowIcon={false}>
                                <Dropdown.Item><HiOutlinePencil className="me-1"/>Rename Event</Dropdown.Item>
                                <Dropdown.Item onClick={() => {
                                        setCreatePhotoCollectionModalVisible(true)
                                        setCreateTableForId(event.id)
                                    }}
                                >
                                    <HiOutlinePlusCircle className="me-1"/>Create Photo Collection
                                </Dropdown.Item>
                            </Dropdown>
                        </div>
                        {eventItems(event.name, event.id, groupToggles[index])}
                    </div>
                )
            }))
        }
    }

    return (
        <>
            <Modal show={createModalVisible} onClose={() => setCreateModalVisible(false)}>
                <Modal.Header>Create a new Event</Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleCreateEvent} className="flex flex-col">
                        <Label className="ms-2 font-semibold text-xl mb-4" htmlFor="name">Event Name:</Label>
                        <TextInput sizing='lg' className="mb-6" placeholder="Event Name" type="name" id="name" name="name" />
                        <div className="flex flex-row justify-end border-t">
                            <Button className="text-xl w-[40%] max-w-[8rem] mt-4" type="submit">Create</Button>
                        </div>
                    </form>
                </Modal.Body>
            </Modal>
            <Modal show={createPhotoCollectionModalVisible} onClose={() => setCreatePhotoCollectionModalVisible(false)}>
                <Modal.Header>Create Table</Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleCreatePhotoCollection}>
                        <div className="flex flex-col">
                            <Label className="ms-2 font-semibold text-xl mb-2" htmlFor="name">Photo Collection Name:</Label>
                            <TextInput className="mb-6" placeholder="Event Name" type="name" id="name" name="name" />
                        </div>
                        <div className="flex flex-col">
                            <Label className="ms-2 font-semibold text-xl mb-2" htmlFor="importData">Upload Photos:</Label>
                            <FileInput id="importData" name="importData" helperText='Photo file types are supported' className=""/>
                        </div>
                        <div className="flex flex-row justify-end border-t mt-4">
                            <Button className="text-xl w-[40%] max-w-[8rem] mt-4" type="submit" >Create</Button>

                        </div>
                    </form>
                </Modal.Body>
            </Modal>
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
                    {photoViewUrl && photoViewUrl.url ? (<img src={photoViewUrl.url} className={`w-[${photoViewUrl.width.toString()}px] h-[${photoViewUrl.height.toString()}px] object-fill`}/>) : (<></>)}
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
                                <p>Display Size: {photoViewUrl.width + ' x ' + photoViewUrl.height}</p>
                                <p>Natural Size: {img.naturalWidth + ' x ' + img.naturalHeight}</p>
                                {imgSizeError}
                            </div>
                        )
                    })}
                    </>
                    <div>
                        <Dropdown
                            className="mt-1"
                            inline
                            label='Display Size'
                        >
                            <Dropdown.Item onClick={() => setPhotoViewUrl({...photoViewUrl!, width: 180, height: 180})}>Square (180x180)</Dropdown.Item>
                            <Dropdown.Item onClick={() => setPhotoViewUrl({...photoViewUrl!, width: 120, height: 180})}>Portrait (120x180)</Dropdown.Item>
                            <Dropdown.Item onClick={() => setPhotoViewUrl({...photoViewUrl!, width: 180, height: 120})}>Landscape (180x120)</Dropdown.Item>
                        </Dropdown>
                    </div>
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
                        if(!photoViewUrl || !pictureCollectionPaths){
                            setPhotoModalVisible(false)
                            setPhotoViewUrl(undefined)
                            return
                        }
                        const originalPath = pictureCollectionPaths.filter((picture) => picture.id == photoViewUrl.id)[0]
                        if(originalPath.width == photoViewUrl.width && originalPath.height == photoViewUrl.height){
                            setPhotoModalVisible(false)
                            setPhotoViewUrl(undefined)
                            return
                        }
                        const response = await client.models.PhotoPaths.update({
                            id: photoViewUrl.id,
                            displayWidth: photoViewUrl.width,
                            displayHeight: photoViewUrl.height,
                        })
                        setPictureCollectionPaths(pictureCollectionPaths.map((picture) => {
                            if(picture.id === photoViewUrl.id){
                                return {
                                    ...picture,
                                    width: photoViewUrl.width,
                                    height: photoViewUrl.height,
                                }
                            }
                            return { 
                                ...picture,
                            }
                        }))
                        console.log(response)
                        //TODO: passing updates
                        setPhotoModalVisible(false)
                        setPhotoViewUrl(undefined)
                    }}>Done</Button>
                </Modal.Footer>
            </Modal>
            <div className="grid grid-cols-6 gap-2 mt-4 font-main">
                <div className="flex flex-col ms-5 border border-gray-400 rounded-lg p-2">
                    <div className="flex flex-row w-full items-center justify-between hover:bg-gray-100 rounded-2xl py-1 cursor-pointer" onClick={() => setCreateModalVisible(true)}>
                        <span className="text-xl ms-4 mb-1">Create New Event</span>
                        <HiOutlinePlusCircle className="text-2xl text-gray-600 me-2"/>
                    </div>
                    {eventListComponents()}
                </div>
                <div className="col-span-5">
                    {eventItem}
                </div>
            </div>
        </>
    )
}