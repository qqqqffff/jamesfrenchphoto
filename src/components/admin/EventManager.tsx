import { generateClient } from "aws-amplify/api";
import { Button, Checkbox, Dropdown, FileInput, Label, Modal, TextInput } from "flowbite-react";
import { FormEvent, useEffect, useState } from "react";
import { HiOutlineCamera, HiOutlineChevronDown, HiOutlineChevronLeft, HiOutlineDocumentReport, HiOutlineExclamationCircle, HiOutlinePlusCircle } from "react-icons/hi";
import { HiEllipsisHorizontal, HiOutlinePencil, HiOutlineXMark } from "react-icons/hi2";
import { Schema } from "../../../amplify/data/resource";
import { remove } from "aws-amplify/storage";
import { PhotoCollectionComponent } from "./PhotoCollection";
import { PhotoCollection, PicturePath, Subcategory } from "../../types";


//TODO: create a data type for the things
// interface EventTableData {
//     headings: string[]
//     fields: Field[]
// }

// interface EventItem {
//     title: string
//     type: string
//     tableData?: EventTableData
// }


// interface Field {
//     [key: string]: string
// }

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

//TODO: replace me
// enum EventTypes {
//     PhotoCollection = 'photoCollection',
//     Table = 'table'
// }


export default function EventManager(){
    const [groupToggles, setGroupToggles] = useState<Boolean[]>([false])
    const [eventItem, setEventItem] = useState(<>Select An Event Item to View</>)
    const [createModalVisible, setCreateModalVisible] = useState(false)
    const [createTableModalVisible, setCreateTableModalVisible] = useState(false)
    const [createPhotoCollectionModalVisible, setCreatePhotoCollectionModalVisible] = useState(false)
    const [renameSubcategoryModalVisible, setRenameSubcategoryModalVisible] = useState(false)
    const [eventList, setEventList] = useState<any>()
    const [subCategories, setSubcategories] = useState<Subcategory[] | undefined>()
    const [createColumnModalVisible, setCreateColumnModalVisible] = useState(false)
    const [subcategoryId, setSubcategoryId] = useState<string>()
    const [tableFields, setTableFields] = useState<any>()
    const [pictureCollection] = useState<PhotoCollection | undefined>()
    const [pictureCollectionPaths, setPictureCollectionPaths] = useState<PicturePath[] | undefined>()
    // const [columnsDeletable, setColumnsDeletable] = useState()
    // const [interactingCollection, setInteractingCollection] = useState({ interactionOverride: false, selectedURLs: ([] as string[]), buttonText: 'Delete Picture(s)' })
    const [createTableForId, setCreateTableForId] = useState('')
    const [photoViewUrl, setPhotoViewUrl] = useState<PicturePath>()
    const [photoModalVisible, setPhotoModalVisible] = useState(false)
    const [createEnumColumn, setCreateEnumColumn] = useState(false)
    const [createEnumColumnValues, setCreateEnumColumnValues] = useState<string[] | undefined>()

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

    // function renderEventControls(type: string, disabled: boolean[], itemId: string, ic?: {interactionOverride: boolean, selectedURLs: string[], buttonText: string}){
    //     if(type === 'table'){
    //         return (
    //             <>
    //                 <div className="flex flex-col gap-4 items-center w-full">
    //                     <span className="mt-2 text-2xl">Table Controls</span>
    //                     <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black" 
    //                         disabled={disabled[0]} 
    //                         onClick={() => setCreateColumnModalVisible(true)}
    //                     >
    //                         Add Column
    //                     </button>
    //                     <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black" 
    //                         disabled={disabled[1]} 
    //                         onClick={async () => {
    //                             let keys: string[] = []
    //                             if(!subCategories){
    //                                 const response = (await client.models.SubCategory.get({ id: itemId })).data
    //                                 if(response) keys = response.headers ? response.headers.filter((header): header is string => header !== null) : []
    //                             }
    //                             else{
    //                                 keys = subCategories.filter((sc) => sc.id === itemId).map((sc) => (sc.headers ? sc.headers : []))[0]
    //                             }
    //                             console.log(keys)
    //                             let fields = tableFields
    //                             if(!fields || !(fields satisfies []))
    //                                 fields = (await client.models.SubCategoryFields.listSubCategoryFieldsBySubCategoryId({subCategoryId: itemId})).data
    //                             let max = -1
    //                             fields.forEach((field: any) => max = Math.max(field.row, max))
    //                             keys.forEach(async (heading: string) => {
    //                                 const response = await client.models.SubCategoryFields.create({
    //                                     subCategoryId: subcategoryId!,
    //                                     row: max + 1,
    //                                     key: heading,
    //                                     value: ''
    //                                 })
    //                                 console.log(response)
    //                             })
    //                             //TODO: replace without doing a db call
    //                             const sc: Subcategory[] = (await client.models.SubCategory.list()).data.map((subcategory) => {
    //                                 const headers = subcategory.headers ? subcategory.headers.filter((header): header is string => header !== null) : []
    //                                 return {
    //                                     ...subcategory,
    //                                     headers
    //                                 }
    //                             })
    //                             setSubcategories(sc)
    //                         }}
    //                     >
    //                         Add Row
    //                     </button>
    //                     <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black" 
    //                         disabled={disabled[2]} 
    //                         onClick={async () => {

    //                         }}
    //                     >
    //                         Delete Column
    //                     </button>
    //                     <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black" 
    //                         disabled={disabled[3]} 
    //                         onClick={() => {console.log('hello world')}}
    //                     >
    //                         Delete Row
    //                     </button>
    //                     <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black" 
    //                         disabled={disabled[4]} 
    //                         onClick={() => {console.log('hello world')}}
    //                     >
    //                         Rename Subcategory
    //                     </button>
    //                     <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 mb-6 border disabled:border-gray-400 border-black" 
    //                         disabled={disabled[5]} 
    //                         onClick={() => {console.log('hello world')}}
    //                     >
    //                         Delete Subcategory
    //                     </button>
    //                 </div>
    //             </>
    //         )
    //     }
    //     else if(type === 'photoCollection'){
    //         return (
    //             <>
    //                 <div className="flex flex-col gap-4 items-center w-full">
    //                     <span className="mt-2 text-2xl">Photo Collection Controls</span>
    //                         {/* <input className=" focus:border-none" type="file" multiple onChange={(event) => setFiles(event.target.files)}/> */}
    //                     <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black" 
    //                         disabled={disabled[1]} 
    //                         onClick={async () => {
    //                             const temp = { ...interactingCollection }
    //                             if((ic ? ic.buttonText : temp.buttonText) == 'Confirm Selections'){
    //                                 const urls = (ic ? ic.selectedURLs : temp.selectedURLs)
    //                                 urls.forEach(async (url) => {
    //                                     const response = await remove({
    //                                         path: url
    //                                     })
    //                                     console.log(response)
    //                                 })

    //                                 setPictureCollectionPaths(pictureCollectionPaths!.filter(async (path) => {
    //                                     if(urls.includes(path.path)){
    //                                         const response = await client.models.PhotoPaths.delete({ id: path.id })
    //                                         console.log(response)
    //                                     }
    //                                     return !urls.includes(path.path)
    //                                 }))
    //                             }
    //                             temp.buttonText = (ic ? ic.buttonText : temp.buttonText) === 'Delete Picture(s)' ? 'Confirm Selections' : 'Delete Picture(s)'
    //                             temp.interactionOverride = temp.buttonText === 'Confirm Selections'
    //                             setInteractingCollection(temp)
    //                             // setEventControls(renderEventControls(type, disabled, itemId, temp))
    //                             const subcategory = subCategories ? subCategories.filter((sc) => sc.id === itemId)[0] : undefined
    //                             setEventItem(await renderEvent(subcategory, temp.interactionOverride))
    //                         }}
    //                     >
    //                         {ic ? ic.buttonText : interactingCollection.buttonText}
    //                     </button>
    //                     <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black" 
    //                         disabled={disabled[3]} 
    //                         onClick={() => {console.log('hello world')}}
    //                     >
    //                         Tag Pictures
    //                     </button>
    //                     <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black" 
    //                         disabled={disabled[4]} 
    //                         onClick={() => {
    //                             setRenameSubcategoryModalVisible(true)
    //                         }}
    //                     >
    //                         Rename Subcategory
    //                     </button>
    //                     <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 mb-6 border disabled:border-gray-400 border-black" 
    //                         disabled={disabled[5]} 
    //                         onClick={() => {console.log('hello world')}}
    //                     >
    //                         Delete Subcategory
    //                     </button>
    //                 </div>
    //             </>
    //         )
    //     }
    //     return (
    //         <>
    //         </>
    //     )
    // }

    function eventItems(eventName: string, eventId: string, visible: Boolean){
        console.log(eventName)
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
        console.log(interactionOverride)
        if(!item){
            return (<>Error</>)
        }
        switch(item.type){
            case 'table':
                if(!item.headers){
                    // setEventControls(renderEventControls(item.type, [false, true, true, true, false, false], item.id))
                    return (
                        <>
                            <p>No table data. Start by uploading a csv, or adding a column!</p>
                        </>
                    )
                }
                else{
                    //TODO: add a conditional for the parsed event fields
                    // setEventControls(renderEventControls(item.type, [false, false, false, false, false, false], item.id))
                    let fields = tableFields
                    if(subcategoryId != item.id){
                        fields = (await client.models.SubCategoryFields.listSubCategoryFieldsBySubCategoryId({
                            subCategoryId: item.id
                        })).data
                        setTableFields(fields)
                        console.log('call')
                    }

                    console.log(fields)
                    console.log(subCategories)
                    

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
                const photoCollection = ((await client.models.PhotoCollection.listPhotoCollectionBySubCategoryId({ subCategoryId: item.id })).data[0]) as PhotoCollection
                console.log(photoCollection)
                const paths = await Promise.all(((await client.models.PhotoPaths.listPhotoPathsByCollectionId({ collectionId: photoCollection.id })).data).map(async (path) => {
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
                return (<PhotoCollectionComponent subcategory={item} photoCollection={photoCollection} photoPaths={paths}/>)
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
                //         setEventControls(renderEventControls('photoCollection', [false, false, false, false, false, false], item.id))
                //     }
                //     else{
                //         setEventControls(renderEventControls('photoCollection', [false, true, true, true, false, false], item.id))
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
                //                 setEventItem(await renderEvent(item, interactionOverride))
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

    async function handleCreateColumn(event: FormEvent<CreateEventForm>) {
        event.preventDefault()
        const form = event.currentTarget;
        if(!subCategories || !subcategoryId) return
        let headers = subCategories.filter((sc) => sc.id == subcategoryId).map((sc) => sc.headers)[0]
        headers = headers ? headers : ([] as string[])
        //TODO: check for duplicates
        headers.push(form.elements.name.value)
        console.log(headers)
        const response = await client.models.SubCategory.update({
            id: subcategoryId,
            headers: headers
        })
        console.log(response)
        let fields: any = tableFields
        if(!tableFields)
            fields = (await client.models.SubCategoryFields.listSubCategoryFieldsBySubCategoryId({ subCategoryId: response.data!.id})).data
        console.log(fields)
        let max = -1
        fields.forEach((field: any) => max = Math.max(field.row, max))
        if(max >= 0){
            for(let i = 0; i <= max; i++){
                const resp = await client.models.SubCategoryFields.create({
                    subCategoryId: subcategoryId,
                    row: i,
                    key: form.elements.name.value,
                    value: '',
                    enum: createEnumColumn ? {
                        options: createEnumColumnValues
                        // TODO: implement colors:
                    } : undefined
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

    //TODO: preform a full refresh on complete to fetch new name
    async function handleRenameSubcategory(event: FormEvent<CreateEventForm>){
        event.preventDefault()
        const form = event.currentTarget;
        if(!subCategories) return ''
        const subcategory = subCategories.filter((subcategory) => subcategory.id == subcategoryId)
        if(!subcategory || !subcategory[0]) return ''

        const response = await client.models.SubCategory.update({
            id: subcategory[0].id,
            name: form.elements.name.value
        })
        console.log(response)
        
        setRenameSubcategoryModalVisible(false)
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

    function subcategoryName(){
        if(!subCategories) return ''
        const subcategory = subCategories.filter((subcategory) => subcategory.id == subcategoryId)
        if(!subcategory || !subcategory[0]) return ''
        return subcategory[0].name
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
                            <TextInput className="mb-6" placeholder="Subcategory Name" type="name" id="name" name="name" />
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
                <Modal.Header>Create Column</Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleCreateColumn}>
                        <div className="flex flex-col">
                            <Label className="ms-2 font-semibold text-xl mb-2" htmlFor="name">Column Header:</Label>
                            <TextInput className="mb-6" placeholder="Column Name" type="text" id="name" name="name" />
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex gap-2 items-center">
                                    <Checkbox className="p-2.5" id='enumColumn' name="enumColumn" onClick={() => {
                                        setCreateEnumColumnValues([''])
                                        setCreateEnumColumn(!createEnumColumn)
                                    }}/>
                                    <Label className="text-xl font-light">Enum Column</Label>
                                </div>
                                {createEnumColumn ? (<Button color='light' onClick={() => {
                                    if(!createEnumColumnValues || !createEnumColumn){
                                        return
                                    }
                                    const temp = [...createEnumColumnValues]
                                    temp.push('')
                                    setCreateEnumColumnValues(temp)
                                }}>Add Value</Button>) : (<></>)}
                            </div>
                            
                            {createEnumColumn ? createEnumColumnValues?.map((value, index) => {
                                return (
                                    <div key={index} className="flex flex-row items-center gap-3 mb-4 w-full justify-between">
                                        <div className="flex flex-row items-center gap-3 w-full">
                                            <Label className="text-lg">Value {index + 1}:</Label>
                                            <TextInput className='w-[40%]' placeholder='Expected Column Value' sizing='sm' defaultValue={value} onChange={(event) => {
                                                const temp = [...createEnumColumnValues]
                                                temp[index] = event.target.value
                                                console.log(temp)
                                                setCreateEnumColumnValues(temp)
                                            }} />
                                        </div>
                                        {
                                            createEnumColumnValues.length > 1 ? (
                                            <button className="me-4" onClick={() => {
                                                let temp = [...createEnumColumnValues]
                                                temp = temp.filter((_, i) => i != index)
                                                setCreateEnumColumnValues(temp)
                                            }}>
                                                <HiOutlineXMark size={16}/>
                                            </button>
                                            ) : (<></>)
                                        }
                                        
                                    </div>
                                )
                            }) : (<></>)}
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
                        if(!photoViewUrl || !pictureCollection || !pictureCollectionPaths || !subCategories){
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
                        setEventItem(await renderEvent(subCategories.filter((subcategory) => subcategory.id == subcategoryId)[0], false))
                        setPhotoModalVisible(false)
                        setPhotoViewUrl(undefined)
                    }}>Delete</Button>
                    <Button onClick={async () => {
                        if(!photoViewUrl || !pictureCollectionPaths || !subCategories){
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
                        setEventItem(await renderEvent(subCategories.filter((subcategory) => subcategory.id == subcategoryId)[0], false))
                        setPhotoModalVisible(false)
                        setPhotoViewUrl(undefined)
                    }}>Done</Button>
                </Modal.Footer>
            </Modal>
            <Modal show={renameSubcategoryModalVisible} onClose={() => setRenameSubcategoryModalVisible(false)}>
                <Modal.Header>Rename Subcategory</Modal.Header>
                <Modal.Body>
                    <form onSubmit={handleRenameSubcategory}>
                        <div className="flex flex-col">
                            <Label className="ms-2 font-semibold text-xl mb-2" htmlFor="name">Subcategory Name:</Label>
                            <TextInput className="mb-6" placeholder="Subcategory Name" type="name" id="name" name="name" defaultValue={subcategoryName()}/>
                        </div>
                        <div className="flex flex-row justify-end border-t mt-4">
                            <Button className="text-xl w-[40%] max-w-[8rem] mt-4" type="submit" >Rename</Button>
                        </div>
                    </form>
                </Modal.Body>
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