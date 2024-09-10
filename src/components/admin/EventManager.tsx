import { generateClient } from "aws-amplify/api";
import { Button, Dropdown, FileInput, Label, Modal, TextInput } from "flowbite-react";
import { FormEvent, useEffect, useState } from "react";
import { HiOutlineChevronDown, HiOutlineChevronLeft, HiOutlineDocumentReport, HiOutlinePlusCircle } from "react-icons/hi";
import { HiEllipsisHorizontal, HiOutlinePencil } from "react-icons/hi2";
import { Schema } from "../../../amplify/data/resource";


//todo create a data type for the things
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
    const [createTableModalVisible, setCreateTableModalVisible] = useState(false)
    const [eventList, setEventList] = useState<any>()
    const [subCategories, setSubcategories] = useState<any>()
    const [createColumnModalVisible, setCreateColumnModalVisible] = useState(false)
    const [tableId, setTableId] = useState('')
    function renderEventControls(disabled: boolean[]){
        return (
            <>
                <div className="flex flex-col gap-4 items-center w-full">
                    <span className="mt-2 text-2xl">Controls</span>
                    <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black" 
                        disabled={disabled[0]} 
                        onClick={() => {console.log('hello world')}}
                    >
                        Add Column
                    </button>
                    <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black" 
                        disabled={disabled[1]} 
                        onClick={() => {console.log('hello world')}}
                    >
                        Add Row
                    </button>
                    <button className="flex flex-row w-[80%] justify-center hover:bg-gray-100 disabled:hover:bg-transparent disabled:text-gray-400 rounded-3xl py-2 border disabled:border-gray-400 border-black" 
                        disabled={disabled[2]} 
                        onClick={() => {console.log('hello world')}}
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
    const [eventControls, setEventControls] = useState(renderEventControls([true, true, true, true, true, true]))
    const [createTableForId, setCreateTableForId] = useState('')

    useEffect(() => {
        if(!eventList){
            (async () => {
                const eList = (await client.models.Events.list()).data
                const scList = (await client.models.SubCategory.list()).data
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

    function eventItems(eventName: string, eventId: string, visible: Boolean){
        const items: [] = subCategories.filter((sc: any) => (sc.eventId === eventId))
        // console.log(itm)
        // const items: EventItem[] = [
        //     {
        //         title: '2024 TRF LIW',
        //         type: 'table',
        //     },
        //     {
        //         title: '2024 TRF Duchesses',
        //         type: 'table',
        //         tableData: {
        //             headings: [
        //                 'Last', 
        //                 'First', 
        //                 'Parent', 
        //                 'Number', 
        //                 'Email', 
        //                 'Package', 
        //                 'Paid', 
        //                 'City', 
        //                 'Headshot', 
        //                 'Signed up for portrait', 
        //                 'Portrait Choice', 
        //                 'Formal Name', 
        //                 'Address', 
        //                 'Zip', 
        //                 'Formal Title', 
        //                 'Costume', 
        //                 'Notes',
        //                 'Formal Parents Names',
        //                 'Dad',
        //                 'Dad address',
        //                 'Dad Formal Name',
        //             ],
        //             fields: [
        //                 {
        //                     firstName: 'Apollo',
        //                     lastName: 'Rowe',
        //                     parent: 'Christina',
        //                     number: '408-316-2737',
        //                     email: '1apollo.rowe@gmail.com',
        //                     package: 'Needs to select',
        //                     paid: 'Done',
        //                     city: 'Lawrence',
        //                     headshot: 'Done!',
        //                     signedUpForPortrait: 'Done',
        //                     portraitChoice: '',
        //                     formalName: 'Mr Apollinaris Iparragirre T Rowe',
        //                     address: '481 S Broadway Unit 25',
        //                     zip: '01843',
        //                     formalTitle: 'King of Massachussets',
        //                     costume: 'English Royal',
        //                     notes: 'Divorced parents',
        //                     formalParentsNames: 'Ms. Christina Louise Rowe',
        //                     dad: '',
        //                     dadFormalName: '',
        //                 }
        //             ]
        //         }
        //     },
        //     {
        //         title: '2024 TRF Attendants',
        //         type: 'table',
        //     },
        //     {
        //         title: '2024 TRF Escorts',
        //         type: 'table',
        //     },
        //     {
        //         title: '2024 TRF Docs, etc',
        //         type: 'table',
        //     }
        // ]

        //todo convert div to button
        if(visible) {
            return items.map((item: any, index) => {
                return (
                    <div key={index} className="flex flex-row items-center ms-4 my-1 hover:bg-gray-100 ps-2 py-1 rounded-3xl cursor-pointer" onClick={async () => {
                        setEventItem(await renderEvent(item))
                        setTableId(item.id)
                    }}>
                        <HiOutlineDocumentReport className="mt-0.5 me-2"/>{item.name}
                    </div>
                )
            })
        }
        return (<></>)
    }

    async function renderEvent(item: any){
        if(!item.headers){
            setEventControls(renderEventControls([false, true, true, true, false, false]))
            return (
                <>
                    <p>No table data. Start by uploading a csv, or adding a column!</p>
                </>
            )
        }
        else{
            //todo: add a conditional for the parsed event fields
            setEventControls(renderEventControls([false, false, false, false, false, false]))
            const fields = await client.models.SubCategoryFields.listSubCategoryFieldsBySubCategoryId({
                subCategoryId: item.id
            })

            type TableRows = {
                [key: string]: string;
              } & {
                index: number;
              };
            const rows: TableRows[] = []
            fields.data.forEach(field => {
                const r = rows.find((x) => x.index == field.row)
                if(r){
                    const row: TableRows = r
                    const index = rows.indexOf(row)
                    Object.entries(row).map(([key, value]) => {
                        if(key == field.key){
                            return [key, field.value]
                        }
                        return [key, value]
                    })
                    rows[index] = row
                }
                else{
                    const row: any = {
                        [field.key]: field.value,
                        index: field.row
                    }
                    rows.push(row)
                }
            });

            console.log(rows)

            setEventControls(renderEventControls([false, false, true, true]))
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
                                //todo fix for fields
                                {/* {fields.data.map((field, index) => {
                                    return (
                                        <tr key={index} className="bg-white border-b ">
                                            {Object.values(field).map((x, index) => {
                                                return (
                                                    <td className="overflow-ellipsis px-6 py-4" key={index}>{x}</td>
                                                )
                                            })}
                                        </tr>
                                    )    
                                })} */}
                            </tbody>
                        </table>
                    </div>
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
        // console.log(form.elements.importData.files)
        // const response = await client.models.SubCategory.create({
        //     eventId:
        // })
        const response = await client.models.SubCategory.create({
            eventId: createTableForId,
            name: form.elements.name.value
        })
        console.log(response)


        if(!response.errors){
            const scList = (await client.models.SubCategory.list()).data
            console.log(scList)
            setSubcategories(scList)
            setCreateTableModalVisible(false)
            setCreateTableForId('')
        }
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
                <div className="flex justify-center border border-gray-400 rounded-lg">
                    {eventControls}
                </div>
            </div>
        </>
    )
}