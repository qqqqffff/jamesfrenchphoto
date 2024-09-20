import { generateClient } from "aws-amplify/api";
import { Button, Dropdown, FileInput, Label, Modal, TextInput } from "flowbite-react";
import { FC, FormEvent, useEffect, useState } from "react";
import { HiOutlineCamera, HiOutlineChevronDown, HiOutlineChevronLeft, HiOutlineDocumentReport, HiOutlineExclamationCircle, HiOutlinePlusCircle } from "react-icons/hi";
import { HiEllipsisHorizontal, HiOutlinePencil, HiOutlineXMark } from "react-icons/hi2";
import { Schema } from "../../../amplify/data/resource";
import { getUrl, uploadData } from "aws-amplify/storage";


//TODO: create a data type for the things
interface EventTableData {
    headings: string[]
    fields: Field[]
}

interface EventItem {
    title: string
    type: string
    tableData?: EventTableData
}


interface Field {
    [key: string]: string
}

interface CreateEventFormElements extends HTMLFormControlsCollection{
    name: HTMLInputElement
}

interface CreateTableFormElements extends CreateEventFormElements{
    importData: HTMLInputElement
}

interface UploadImagesFormElements extends HTMLFormControlsCollection{
    eventId: HTMLInputElement
    subCategoryId: HTMLInputElement
    files: HTMLInputElement
}

interface CreateEventForm extends HTMLFormElement{
    readonly elements: CreateEventFormElements
}

interface CreateTableForm extends HTMLFormElement{
    readonly elements: CreateTableFormElements
}

interface UploadImagesForm extends HTMLFormElement{
    readonly elements: UploadImagesFormElements
}

const client = generateClient<Schema>()

//TODO: replace me
enum EventTypes {
    PhotoCollection = 'photoCollection',
    Table = 'table'
}

type PicturePath = {
    id: string;
    url: string;
    path: string;
    height: number;
    width: number;
}

type PhotoCollection = {
    coverPath: string | null;
    createdAt: string;
    id: string;
    name: string;
    updatedAt: string;
}

type Subcategory = {
    id: string,
    name: string,
    headers?: string[],
    type: string,
    eventId: string,
}

export default function EventManager(){
    const [groupToggles, setGroupToggles] = useState<Boolean[]>([false])
    const [eventItem, setEventItem] = useState(<>Select An Event Item to View</>)
    const [createModalVisible, setCreateModalVisible] = useState(false)
    const [createTableModalVisible, setCreateTableModalVisible] = useState(false)
    const [createPhotoCollectionModalVisible, setCreatePhotoCollectionModalVisible] = useState(false)
    const [uploadPhotosModalVisible, setUploadPhotosModalVisible] = useState(false)
    const [eventList, setEventList] = useState<any>()
    const [subCategories, setSubcategories] = useState<Subcategory[] | undefined>()
    const [createColumnModalVisible, setCreateColumnModalVisible] = useState(false)
    const [subcategoryId, setSubcategoryId] = useState<string>()
    const [tableFields, setTableFields] = useState<any>()
    const [pictureCollection, setPictureCollection] = useState<PhotoCollection | undefined>()
    const [pictureCollectionPaths, setPictureCollectionPaths] = useState<PicturePath[] | undefined>()
    const [columnsDeletable, setColumnsDeletable] = useState()
    const [filesUpload, setFilesUpload] = useState<File[] | null>()
    const [interactingCollection, setInteractingCollection] = useState({ interactionOverride: true, selectedURLs: ([] as string[]), buttonText: ['Delete Picture(s)', 'Assign Picture(s)'] })
    const [eventControls, setEventControls] = useState((<></>))
    const [createTableForId, setCreateTableForId] = useState('')
    const [photoViewUrl, setPhotoViewUrl] = useState<PicturePath>()
    const [photoModalVisible, setPhotoModalVisible] = useState(false)

    useEffect(() => {
        if(!eventList){
            (async () => {
                const eList = (await client.models.Events.list()).data
                const scList: Subcategory[] = (await client.models.SubCategory.list()).data.map((subcategory) => {
                    const headers = subcategory.headers ? subcategory.headers.filter((header): header is string => header !== null) : ([] as string[])
                    return {
                        ...subcategory,
                        headers: headers
                    }
                })
                const groupToggles = eList.map(() => false)

                setGroupToggles(groupToggles)
                setEventList(eList)
                setSubcategories(scList)
            })()
            console.log('fetched')
        }
        const updateSub = client.models.Events.onUpdate().subscribe({
            next: (data) => {
                console.log(data)
                setEventList(data)
            }
        })
        const deleteSub = client.models.Events.onDelete().subscribe({
            next: (data) => {
                console.log(data)
                setEventList(data)
            }
        })
        const createSub = client.models.Events.onCreate().subscribe({
            next: (data) => {
                console.log(data)
                setEventList(data)
            }
        })
        return () => {
            updateSub.unsubscribe()
            deleteSub.unsubscribe()
            createSub.unsubscribe()
        }
    })

    function groupToggled(index: number){
        if(groupToggles[index]){
            return (<HiOutlineChevronDown className="me-3" />)
        }
        return (<HiOutlineChevronLeft className="me-3" />)
    }

    function renderEventControls(type: string, disabled: boolean[], itemId: string){
        if(type === 'table'){
            return (
                <>
                    <div className="flex flex-col gap-4 items-center w-full">
                        <span className="mt-2 text-2xl">Table Controls</span>
                        <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black" 
                            disabled={disabled[0]} 
                            onClick={() => setCreateColumnModalVisible(true)}
                        >
                            Add Column
                        </button>
                        <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black" 
                            disabled={disabled[1]} 
                            onClick={async () => {
                                let keys: string[] = []
                                if(!subCategories){
                                    const response = (await client.models.SubCategory.get({ id: itemId })).data
                                    if(response) keys = response.headers ? response.headers.filter((header): header is string => header !== null) : []
                                }
                                else{
                                    keys = subCategories.filter((sc) => sc.id === itemId).map((sc) => (sc.headers ? sc.headers : []))[0]
                                }
                                console.log(keys)
                                let fields = tableFields
                                if(!fields || !(fields satisfies []))
                                    fields = (await client.models.SubCategoryFields.listSubCategoryFieldsBySubCategoryId({subCategoryId: itemId})).data
                                let max = -1
                                fields.forEach((field: any) => max = Math.max(field.row, max))
                                keys.forEach(async (heading: string) => {
                                    const response = await client.models.SubCategoryFields.create({
                                        subCategoryId: subcategoryId!,
                                        row: max + 1,
                                        key: heading,
                                        value: ''
                                    })
                                    console.log(response)
                                })
                                //TODO: replace without doing a db call
                                const sc: Subcategory[] = (await client.models.SubCategory.list()).data.map((subcategory) => {
                                    const headers = subcategory.headers ? subcategory.headers.filter((header): header is string => header !== null) : []
                                    return {
                                        ...subcategory,
                                        headers
                                    }
                                })
                                setSubcategories(sc)
                            }}
                        >
                            Add Row
                        </button>
                        <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black" 
                            disabled={disabled[2]} 
                            onClick={async () => {

                            }}
                        >
                            Delete Column
                        </button>
                        <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black" 
                            disabled={disabled[3]} 
                            onClick={() => {console.log('hello world')}}
                        >
                            Delete Row
                        </button>
                        <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black" 
                            disabled={disabled[4]} 
                            onClick={() => {console.log('hello world')}}
                        >
                            Rename Subcategory
                        </button>
                        <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 mb-6 border disabled:border-gray-400 border-black" 
                            disabled={disabled[5]} 
                            onClick={() => {console.log('hello world')}}
                        >
                            Delete Subcategory
                        </button>
                    </div>
                </>
            )
        }
        else if(type === 'photoCollection'){
            return (
                <>
                    <div className="flex flex-col gap-4 items-center w-full">
                        <span className="mt-2 text-2xl">Photo Collection Controls</span>
                            {/* <input className=" focus:border-none" type="file" multiple onChange={(event) => setFiles(event.target.files)}/> */}
                            <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black" 
                                disabled={disabled[0]} 
                                onClick={() => setUploadPhotosModalVisible(true)}
                                type="submit"
                            >
                                Upload Picture(s)
                            </button>
                        <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black" 
                            disabled={disabled[1]} 
                            onClick={async () => {
                                const temp = { ...interactingCollection }
                                temp.buttonText[0] = temp.buttonText[0] === 'Delete Picture(s)' ? 'Confirm Selections' : 'Delete Picture(s)'
                                temp.interactionOverride = temp.buttonText[0] === 'Confirm Selections'
                                temp.buttonText[1] = 'Assign Picture(s)'
                                setInteractingCollection(temp)
                                setEventControls(renderEventControls('photoCollection', [false, false, false, false, false, false], itemId))
                                const subcategory = subCategories ? subCategories.filter((sc) => sc.id === itemId)[0] : undefined
                                setEventItem(await renderEvent(subcategory, temp.interactionOverride))
                            }}
                        >
                            {interactingCollection.buttonText[0]}
                        </button>
                        <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black" 
                            disabled={disabled[2]} 
                            onClick={() => {console.log('hello world')}}
                        >
                            {interactingCollection.buttonText[1]}
                        </button>
                        <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black" 
                            disabled={disabled[3]} 
                            onClick={() => {console.log('hello world')}}
                        >
                            Auto Assign
                        </button>
                        <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black" 
                            disabled={disabled[4]} 
                            onClick={async () => {
                                
                            }}
                        >
                            Rename Subcategory
                        </button>
                        <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 mb-6 border disabled:border-gray-400 border-black" 
                            disabled={disabled[5]} 
                            onClick={() => {console.log('hello world')}}
                        >
                            Delete Subcategory
                        </button>
                    </div>
                </>
            )
        }
        return (
            <>
            </>
        )
    }

    function eventItems(eventName: string, eventId: string, visible: Boolean){
        if(!subCategories) return (<></>)
        const items = subCategories.filter((sc) => (sc.eventId === eventId))

        //TODO: convert div to button
        if(visible) {
            return items.map((item, index) => {
                return (
                    <div key={index} className="flex flex-row items-center ms-4 my-1 hover:bg-gray-100 ps-2 py-1 rounded-3xl cursor-pointer" onClick={async () => {
                        setSubcategoryId(item.id)
                        setEventItem(await renderEvent(item, false))
                    }}>
                        {item.type === 'table' ? (<HiOutlineDocumentReport className="mt-0.5 me-2"/>) : (<HiOutlineCamera className="mt-0.5 me-2"/>)}{item.name}
                    </div>
                )
            })
        }
        return (<></>)
    }

    async function renderEvent(item: Subcategory | undefined, interactionOverride: boolean){
        if(!item){
            return (<>Error</>)
        }
        switch(item.type){
            case 'table':
                if(!item.headers){
                    setEventControls(renderEventControls(item.type, [false, true, true, true, false, false], item.id))
                    return (
                        <>
                            <p>No table data. Start by uploading a csv, or adding a column!</p>
                        </>
                    )
                }
                else{
                    //TODO: add a conditional for the parsed event fields
                    setEventControls(renderEventControls(item.type, [false, false, false, false, false, false], item.id))
                    let fields = tableFields
                    if(subcategoryId != item.id){
                        fields = (await client.models.SubCategoryFields.listSubCategoryFieldsBySubCategoryId({
                            subCategoryId: item.id
                        })).data
                        setTableFields(fields)
                        console.log('call')
                    }

                    type TableRows = {
                        [key: string]: string;
                    }

                    const rowMap: { [rowNumber: number]: TableRows} = {}
                    fields.forEach((entry: any) => {
                        if (!rowMap[entry.row]) {
                            rowMap[entry.row] = {};
                        }
                        rowMap[entry.row][entry.key] = entry.value;
                    });
        
                    return (
                        <>
                            <div className="relative overflow-x-auto overflow-y-auto max-h-[100rem] shadow-md sm:rounded-lg">
                                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                        <tr>
                                            {item.headers.map((heading: any, index: number) => (
                                                <th scope='col' className='px-6 py-3 border-x border-x-gray-300 border-b border-b-gray-300' key={index}>
                                                    {heading}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.values(rowMap).map((field, index) => {
                                            return (
                                                <tr key={index} className="bg-white border-b ">
                                                    {Object.entries(field).map(([key, value], index) => {
                                                        return (
                                                            <td className="overflow-ellipsis px-6 py-4" key={index}>
                                                                <TextInput sizing='sm' className="" defaultValue={value} placeholder="Click Here to Edit" onChange={async (event) => {
                                                                    const response = await client.models.SubCategoryFields.update({
                                                                        id: fields.filter((field: any) => field.key == key && index == field.row).map((sc: any) => sc.id)[0],
                                                                        value: event.target.value
                                                                    })
                                                                    console.log(response)
                                                                    //TODO: put in a reducer and analyze for efficency
                                                                }}/>
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            )    
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )
                }
            case 'photoCollection':
                setInteractingCollection({interactionOverride: false, buttonText: ['Delete Picture(s)', 'Assign Picture(s)'], selectedURLs: ([] as string[])})
                
                let picturePaths = ([] as PicturePath[])
                if(subcategoryId != item.id){
                    const collection = (await client.models.PhotoCollection.listPhotoCollectionBySubCategoryId({
                        subCategoryId: item.id
                    })).data[0]
                    console.log(collection)
                    setPictureCollection({ ...collection })

                    let paths = (await client.models.PhotoPaths.listPhotoPathsByCollectionId({ collectionId: collection.id })).data.map((item) => {
                        return {
                            id: item.id,
                            path: item.path,
                            width: !item.displayWidth ? 200 : item.displayWidth,
                            height: !item.displayHeight ? 200 : item.displayHeight,
                            url: ''
                        }
                    })
                    console.log(paths)

                    if(paths && paths.length > 0){
                        paths = await Promise.all(paths.map(async (item) => {
                            return {
                                ...item,
                                url: (await getUrl({
                                    path: item.path
                                })).url.toString()
                            }
                        }))
                        setPictureCollectionPaths(paths)
                    }
                    picturePaths = paths
                }
                else{
                    picturePaths = !pictureCollectionPaths ? [] : pictureCollectionPaths
                }
                console.log(picturePaths)

                if(picturePaths.length > 0){
                    setEventControls(renderEventControls('photoCollection', [false, false, false, false, false, false], item.id))
                }
                else{
                    setEventControls(renderEventControls('photoCollection', [false, true, true, true, false, false], item.id))
                }

                const pictures = picturePaths.map((path, index: number) => {
                    let styling = "enabled:hover:bg-gray-200 w-auto h-auto"
                    if(interactingCollection.selectedURLs){
                        styling += (interactingCollection.selectedURLs.includes(path.url) ? 'bg-gray-100' : '')
                    }
                    return (
                        <button key={index} className={`flex flex-row hover:bg-gray-200 h-[${path.height.toString()}px] w-[${path.width.toString()}px]`} onClick={() => {
                            if(interactionOverride){
                                const interacting = {...interactingCollection}
                                interacting.selectedURLs.push(path.url)
                                setInteractingCollection(interacting)
                                console.log(interacting)
                            }
                            else{
                                setPhotoViewUrl(path)
                                setPhotoModalVisible(true)
                            }
                        }}>
                            <img  src={path.url} alt="picture" className={`h-[${path.height.toString()}px] w-[${path.width.toString()}px] object-fill`}/>
                        </button>
                    )
                })
                    
                return (
                    <>
                        
                        {pictures ? 
                            (
                                <div className="flex flex-row border-black border gap-1">
                                    {pictures}
                                </div>
                            ) 
                            : (<p>Upload pictures to start!</p>)}
                    </>
                )
            default:
                return (
                    <>
                    </>
                )
        }
        
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

    async function handleCreateTable(event: FormEvent<CreateTableForm>){
        event.preventDefault()
        const form = event.currentTarget;

        const response = await client.models.SubCategory.create({
            eventId: createTableForId,
            name: form.elements.name.value,
            type: 'table'
        })
        console.log(response)


        if(!response.errors){
            const scList: Subcategory[] = (await client.models.SubCategory.list()).data.map((item) => {
                const headers = item.headers ? item.headers.filter((str): str is string => str !== null) : undefined
                return {
                    ...item,
                    headers: headers
                }
            })
            console.log(scList)
            setSubcategories(scList)
            setCreateTableModalVisible(false)
            setCreateTableForId('')
        }
    }

    async function handleCreatePhotoCollection(event: FormEvent<CreateTableForm>){
        event.preventDefault()
        const form = event.currentTarget;

        const response = await client.models.SubCategory.create({
            eventId: createTableForId,
            name: form.elements.name.value,
            type: 'photoCollection'
        })
        console.log(response)

        const photoCollectionResponse = await client.models.PhotoCollection.create({
            name: form.elements.name.value,
            subCategoryId: response.data!.id
        })
        console.log(photoCollectionResponse)

        if(!response.errors){
            const scList: Subcategory[] = (await client.models.SubCategory.list()).data.map((subcategory) => {
                const headers = subcategory.headers ? subcategory.headers.filter((header): header is string => header !== null) : undefined
                return {
                    ...subcategory,
                    headers: headers
                }
            })
            console.log(scList)
            setSubcategories(scList)
            setCreatePhotoCollectionModalVisible(false)
            setCreateTableForId('')
        }
    }

    async function handleUploadPhotos(event: FormEvent<UploadImagesForm>){
        event.preventDefault()
        const form = event.currentTarget

        //TODO: preform form validation
        let paths = []
        if(!subCategories || !subcategoryId) return
        const sc = subCategories.filter((sc) => sc.id === subcategoryId)[0]
        if(filesUpload) {
            paths = await Promise.all(
                filesUpload.map(async (file) => {
                    const result = await uploadData({
                        path: `photo-collections/${sc.eventId}_${subcategoryId}_${file.name}`,
                        data: file,
                    }).result
                    console.log(result)
                    return result.path
                })
            )
        }
        else {
            setFilesUpload(null)
            setUploadPhotosModalVisible(false)
            return
        }

        
        let collectionId: string

        if(!pictureCollection){
            const photoCollection = await client.models.PhotoCollection.listPhotoCollectionBySubCategoryId({
                subCategoryId: subcategoryId!
            })
            console.log(photoCollection)

            if(photoCollection.data.length == 0){
                const photoCollectionResponse = (await client.models.PhotoCollection.create({
                    subCategoryId: subcategoryId!,
                    name: sc.name,
                })).data!
                collectionId = photoCollectionResponse.id
                setPictureCollection({
                    id: photoCollectionResponse.id,
                    name: photoCollectionResponse.name,
                    coverPath: photoCollectionResponse.coverPath ? photoCollectionResponse.coverPath : null,
                    createdAt: photoCollectionResponse.createdAt,
                    updatedAt: photoCollectionResponse.updatedAt,
                 })
            }
            else{
                collectionId = photoCollection.data[0].id
                setPictureCollection(photoCollection.data[0])
            }

            
            // console.log(photoCollectionResponse)
            
            
        }
        else {
            collectionId = pictureCollection.id
        }
        paths.forEach(async (path) => {
            const photoPathsResponse = await client.models.PhotoPaths.create({
                path: path,
                displayHeight: 200,
                displayWidth: 200,
                collectionId: collectionId
            })
            console.log(photoPathsResponse)
        })
        

        //TODO: manage state
        setFilesUpload(null)
        setUploadPhotosModalVisible(false)
    }

    async function handleCreateColumn(event: FormEvent<CreateEventForm>) {
        event.preventDefault()
        const form = event.currentTarget;
        if(!subCategories || !subcategoryId) return
        let headers = subCategories.filter((sc) => sc.id == subcategoryId).map((sc) => sc.headers)[0]
        headers = headers ? headers : ([] as string[])
        //TODO: check for duplicates
        headers.push(form.elements.name.value)
        const response = await client.models.SubCategory.update({
            id: subcategoryId!,
            headers: headers
        })
        console.log(response)
        let fields: any = tableFields
        if(!tableFields)
            fields = (await client.models.SubCategoryFields.listSubCategoryFieldsBySubCategoryId({ subCategoryId: response.data!.id})).data
        let max = -1
        fields.forEach((field: any) => max = Math.max(field.row, max))
        if(max >= 0){
            for(let i = 0; i <= max; i++){
                const resp = await client.models.SubCategoryFields.create({
                    subCategoryId: response.data!.id,
                    row: i,
                    key: form.elements.name.value,
                    value: ''
                })
                console.log(resp)
                //TODO: sanity check
                fields.push(resp.data!)
            }
        }
        setTableFields(fields)
        const scList: Subcategory[] = (await client.models.SubCategory.list()).data.map((subcategory) => {
            const headers = subcategory.headers ? subcategory.headers.filter((header): header is string => header !== null) : undefined
            return {
                ...subcategory,
                headers: headers
            }
        })
        setSubcategories(scList)
        setCreateColumnModalVisible(false)
        //TODO: append values to existing fields
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
                                        setCreateTableModalVisible(true)
                                        setCreateTableForId(event.id)
                                    }}
                                >
                                    <HiOutlinePlusCircle className="me-1"/>Create Table
                                </Dropdown.Item>
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
            <Modal show={createTableModalVisible} onClose={() => setCreateTableModalVisible(false)}>
                <Modal.Header>Create Table</Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleCreateTable}>
                        <div className="flex flex-col">
                            <Label className="ms-2 font-semibold text-xl mb-2" htmlFor="name">Subcategory Name:</Label>
                            <TextInput className="mb-6" placeholder="Event Name" type="name" id="name" name="name" />
                        </div>
                        <div className="flex flex-col">
                            <Label className="ms-2 font-semibold text-xl mb-2" htmlFor="importData">Import Table Data:</Label>
                            <FileInput id="importData" name="importData" helperText='File types of .csv are supported' className=""/>
                        </div>
                        <div className="flex flex-row justify-end border-t mt-4">
                            <Button className="text-xl w-[40%] max-w-[8rem] mt-4" type="submit" >Create</Button>

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
            <Modal show={createColumnModalVisible} onClose={() => setCreateColumnModalVisible(false)}>
                <Modal.Header>Create Table</Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleCreateColumn}>
                        <div className="flex flex-col">
                            <Label className="ms-2 font-semibold text-xl mb-2" htmlFor="name">Column Header:</Label>
                            <TextInput className="mb-6" placeholder="Column Name" type="name" id="name" name="name" />
                        </div>
                        <div className="flex flex-row justify-end border-t mt-4">
                            <Button className="text-xl w-[40%] max-w-[8rem] mt-4" type="submit" >Create</Button>

                        </div>
                    </form>
                </Modal.Body>
            </Modal>
            <Modal show={uploadPhotosModalVisible} onClose={() => {
                setUploadPhotosModalVisible(false)
                setFilesUpload(null)
            }}>
                <Modal.Header>Upload Picture(s)</Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleUploadPhotos}>
                        <div className="flex flex-col">
                            <div className="flex items-center justify-center w-full">
                                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                                        </svg>
                                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Picture Files Supported</p>
                                    </div>
                                    <input id="dropzone-file" type="file" className="hidden" multiple onChange={(event) => {
                                        if(event.target.files){
                                            const files = event.target.files
                                            if(filesUpload)
                                                setFilesUpload([...Array.from(files), ...filesUpload])
                                            else
                                                setFilesUpload([...Array.from(files)])
                                        }
                                    }}/>
                                </label>
                            </div>
                            <Label className="ms-2 font-semibold text-xl mt-3" htmlFor="name">Files:</Label>
                            {filesUpload ? 
                                (<>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex flex-row ms-6 justify-between me-16">
                                            <span className="underline font-semibold">File Name:</span>
                                            <span className="underline font-semibold">Size:</span>
                                        </div>
                                        {filesUpload!.map((file) => {
                                            return (
                                                <>
                                                    <div className="flex flex-row ms-6 justify-between me-6">
                                                        <span>{file.name}</span>
                                                        <div className="flex flex-row gap-2">
                                                            <span>{(file.size * 0.000001).toFixed(5)} MB</span>
                                                            <button className="hover:border-gray-500 border border-transparent rounded-full p-0.5" onClick={() => {
                                                                setFilesUpload(filesUpload.filter(f => file != f))
                                                            }}><HiOutlineXMark size={20}/></button>
                                                        </div>
                                                    </div>
                                                </>
                                            )
                                        })}
                                    </div>
                                    
                                </>) 
                                : 
                                (<>
                                    <span className=" italic text-sm ms-6">Upload files to preview them here!</span>
                                </>)
                            }
                        </div>
                        <div className="flex flex-row justify-end border-t mt-4">
                            <Button className="text-xl w-[40%] max-w-[8rem] mt-4" type="submit" >Upload</Button>

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
                        console.log(photoViewUrl)
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
                    <Button color='light'>Delete</Button>
                    <Button onClick={async () => {
                        if(!photoViewUrl || !pictureCollectionPaths || !subCategories){
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
                        setEventItem(await renderEvent(subCategories.filter((subcategory) => subcategory.id == subcategoryId)[0], false))
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
                    {/* <div className="flex flex-row">
                        <div className="flex flex-row w-full items-center justify-between hover:bg-gray-100 rounded-2xl py-1 cursor-pointer" onClick={() => {setGroupToggles([!groupToggles[0], ...groupToggles])}}>
                            <span className="text-xl ms-4 mb-1">2024 TRF</span>
                            {groupToggled(0)}
                        </div>
                        <Dropdown label={<HiEllipsisHorizontal size={24} className="hover:border-gray-400 hover:border rounded-full"/>} inline arrowIcon={false}>
                            <Dropdown.Item><HiOutlinePencil className="me-1"/>Rename Event</Dropdown.Item>
                            <Dropdown.Item><HiOutlinePlusCircle className="me-1"/>Create Table</Dropdown.Item>
                        </Dropdown>
                    </div>
                    {eventItems('2024 TRF', '123', groupToggles[0])} */}
                    {eventListComponents()}
                </div>
                <div className="flex col-span-4 justify-center border border-gray-400 rounded-lg">
                    {eventItem}
                </div>
                <div className="flex justify-center border border-gray-400 rounded-lg me-5">
                    {eventControls}
                </div>
            </div>
        </>
    )
}