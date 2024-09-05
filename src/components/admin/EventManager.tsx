import { Dropdown } from "flowbite-react";
import { useState } from "react";
import { HiOutlineChevronDown, HiOutlineChevronLeft, HiOutlineDocumentReport, HiOutlinePlus } from "react-icons/hi";
import { HiEllipsisHorizontal, HiOutlinePencil } from "react-icons/hi2";

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

export default function EventManager(){
    const [groupToggles, setGroupToggles] = useState<Boolean[]>([false])
    const [eventItem, setEventItem] = useState(<>Select An Event Item to View</>)

    function groupToggled(index: number){
        if(groupToggles[index]){
            return (<HiOutlineChevronDown className="me-3" />)
        }
        return (<HiOutlineChevronLeft className="me-3" />)
    }

    function eventItems(eventName: string, visible: Boolean){
        if(eventName == '2024 TRF'){}
        const items: EventItem[] = [
            {
                title: '2024 TRF LIW',
                type: 'table',
            },
            {
                title: '2024 TRF Duchesses',
                type: 'table',
                tableData: {
                    headings: [
                        'Last', 
                        'First', 
                        'Parent', 
                        'Number', 
                        'Email', 
                        'Package', 
                        'Paid', 
                        'City', 
                        'Headshot', 
                        'Signed up for portrait', 
                        'Portrait Choice', 
                        'Formal Name', 
                        'Address', 
                        'Zip', 
                        'Formal Title', 
                        'Costume', 
                        'Notes',
                        'Formal Parents Names',
                        'Dad',
                        'Dad address',
                        'Dad Formal Name',
                    ],
                    fields: [
                        {
                            firstName: 'Apollo',
                            lastName: 'Rowe',
                            parent: 'Christina',
                            number: '408-316-2737',
                            email: '1apollo.rowe@gmail.com',
                            package: 'Needs to select',
                            paid: 'Done',
                            city: 'Lawrence',
                            headshot: 'Done!',
                            signedUpForPortrait: 'Done',
                            portraitChoice: '',
                            formalName: 'Mr Apollinaris Iparragirre T Rowe',
                            address: '481 S Broadway Unit 25',
                            zip: '01843',
                            formalTitle: 'King of Massachussets',
                            costume: 'English Royal',
                            notes: 'Divorced parents',
                            formalParentsNames: 'Ms. Christina Louise Rowe',
                            dad: '',
                            dadFormalName: '',
                        }
                    ]
                }
            },
            {
                title: '2024 TRF Attendants',
                type: 'table',
            },
            {
                title: '2024 TRF Escorts',
                type: 'table',
            },
            {
                title: '2024 TRF Docs, etc',
                type: 'table',
            }
        ]

        if(visible) {
            return items.map((item, index) => {
                return (
                    <div key={index} className="flex flex-row items-center ms-4 my-1 hover:bg-gray-100 ps-2 py-1 rounded-3xl cursor-pointer" onClick={() => setEventItem(renderEvent(item))}>
                        <HiOutlineDocumentReport className="mt-0.5 me-2"/>{item.title}
                    </div>
                )
            })
        }
        return (<></>)
    }

    function renderEvent(item: EventItem){
        if(!item.tableData){
            return (
                <>
                    <p>No table data. Start by uploading a csv, or adding a column!</p>
                </>
            )
        }
        else{
            return (
                <div className="relative overflow-x-auto overflow-y-auto max-h-[100rem] shadow-md sm:rounded-lg">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                {item.tableData.headings.map((heading, index) => (
                                    <th scope='col' className='px-6 py-3 border-x border-x-gray-300 border-b border-b-gray-300' key={index}>
                                        {heading}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {item.tableData.fields.map((field, index) => {
                                return (
                                    <tr key={index} className="bg-white border-b ">
                                        {Object.values(field).map((x, index) => {
                                            return (
                                                <td className="overflow-ellipsis px-6 py-4" key={index}>{x}</td>
                                            )
                                        })}
                                    </tr>
                                )    
                            })}
                        </tbody>
                    </table>
                </div>
            )
        }
    }
    return (
        <>
            <div className="grid grid-cols-6 gap-2 mt-4 font-main">
                <div className="flex flex-col ms-5 border border-gray-400 rounded-lg p-2">
                    <div className="flex flex-row">
                        <div className="flex flex-row w-full items-center justify-between hover:bg-gray-100 rounded-2xl py-1 cursor-pointer" onClick={() => {setGroupToggles([!groupToggles[0], ...groupToggles])}}>
                            <span className="text-xl ms-4 mb-1">2024 TRF</span>
                            {groupToggled(0)}
                        </div>
                        <Dropdown label={<HiEllipsisHorizontal size={24} className="hover:border-gray-400 hover:border rounded-full"/>} inline arrowIcon={false}>
                            <Dropdown.Item><HiOutlinePencil className="me-1"/>Rename Event</Dropdown.Item>
                            <Dropdown.Item><HiOutlinePlus className="me-1"/>Create Table</Dropdown.Item>
                        </Dropdown>
                    </div>
                    {eventItems('2024 TRF', groupToggles[0])}
                </div>
                <div className="flex col-span-4 justify-center border border-gray-400 rounded-lg">
                    {eventItem}
                </div>
                <div className="border border-red-400">
                    1
                </div>
            </div>
        </>
    )
}