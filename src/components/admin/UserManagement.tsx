import { generateClient } from "aws-amplify/api"
import { Schema } from "../../../amplify/data/resource"
import { Button } from "flowbite-react"
import { MouseEventHandler, useEffect, useState } from "react"
import { UserStorage } from "../../types"
import { Amplify } from "aws-amplify"
import outputs from '../../../amplify_outputs.json'
import { HiOutlineChatAlt, HiOutlineChevronDoubleDown, HiOutlineChevronDoubleUp, HiOutlineChevronDown, HiOutlineChevronLeft, HiOutlineMinusCircle, HiOutlinePlus, HiOutlinePlusCircle } from "react-icons/hi"

Amplify.configure(outputs)
const client = generateClient<Schema>()

interface TableField {
    [key: string]: {
        [key: string]: string
    }
}

export default function UserManagement(){
    const [admin, setAdmin] = useState<UserStorage>()
    const [userData, setUserData] = useState<TableField[]>()
    const [sideBarToggles, setSideBarToggles] = useState<Boolean[]>([false])

    function parseAttribute(attribute: string){
        switch(attribute){
            case 'email':
                return 'Email'
            case 'email_verified':
                return 'Verified'
            case 'family_name':
                return 'Last'
            case 'given_name':
                return 'First'
            case 'sub':
                return 'User ID'
            default:
                return 'Attribute'
        }
    }
    async function getUsers() {
        const json = await client.queries.GetAuthUsers({authMode: 'userPool'})
        setUserData(JSON.parse(json.data?.toString()!).Users)
        return JSON.parse(json.data?.toString()!).Users.map((user: any) => {
            const attributes = user.Attributes.map((attribute: any) => {
                return { Name: parseAttribute(attribute.name), Value: String(attribute.Value) }
            })
            const enabled = { Name: 'Enabled', Value: String(user.Enabled) }
            const createDate = { Name: 'Created', Value: String(user.UserCreateDate) }
            const lastModifyDate = { Name: 'Last Updated', Value: String(user.UserLastModifiedDate) }
            const status = { Name: 'Status', Value: String(user.UserStatus) }
            const userId = { Name: 'User ID', Value: String(user.Username) }

            return {
                ...attributes,
                enabled,
                createDate,
                lastModifyDate,
                status,
                userId,
            }
        })
    }
    useEffect(() => {
        // window.sessionStorage.setItem('users', JSON.stringify(client.queries.))
        
        if(!admin)
            setAdmin(JSON.parse(window.localStorage.getItem('user')!))
        if(!userData){
            getUsers()
        }
    }, [])

    const createUser = () => {
        console.log('hellow world')
    }
    const notifyUser = () => {}
    const deleteUser = () => {}
    const promoteUser = () => {}
    const demoteUser = () => {}


    function managementOptions(){
        const options = [
            {
                title: 'Create User',
                fn: createUser,
                icon: (<HiOutlinePlusCircle />)
            },
            {
                title: 'Notify User',
                fn: notifyUser,
                icon: (<HiOutlineChatAlt />)
            },
            {
                title: 'Delete User',
                fn: deleteUser,
                icon: (<HiOutlineMinusCircle />)
            },
            {
                title: 'Promote User',
                fn: promoteUser,
                icon: (<HiOutlineChevronDoubleUp />)
            },
            {
                title: 'Demote User',
                fn: demoteUser,
                icon: (<HiOutlineChevronDoubleDown />)
            }
        ]

        if(sideBarToggles[0]){
            return (
                <>
                    {options.map((option, index) => {
                        return (
                            <div key={index} className="flex flex-row items-center ms-4 my-1 hover:bg-gray-100 ps-2 py-1 rounded-3xl cursor-pointer" onClick={() => {option.fn()}}>
                                <div className="me-1 mt-1">{option.icon}</div>{option.title}
                            </div>
                        )
                    })}
                </>
            )
        }
        return (<></>)
    }

    function sideBarToggled(index: number){
        if(sideBarToggles[index]){
            return (<HiOutlineChevronDown className="me-3" />)
        }
        return (<HiOutlineChevronLeft className="me-3" />)
    }
    return (
        <>
            <Button onClick={async () => console.log(await getUsers())}></Button>
            <div className="grid grid-cols-6 gap-2 mt-4 font-main">
                <div className="flex flex-col ms-5 border border-gray-400 rounded-lg p-2">
                    <div className="flex flex-row">
                        <div className="flex flex-row w-full items-center justify-between hover:bg-gray-100 rounded-2xl py-1 cursor-pointer" onClick={() => {setSideBarToggles([!sideBarToggles[0], ...sideBarToggles])}}>
                            <span className="text-xl ms-4 mb-1">Management Options</span>
                            {sideBarToggled(0)}
                        </div>
                    </div>
                   {managementOptions()}
                </div>
                <div className="flex col-span-4 justify-center border border-gray-400 rounded-lg">
                <div className="relative overflow-x-auto overflow-y-auto max-h-[100rem] shadow-md sm:rounded-lg">
                    {/* <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                {Object.keys(userData).map((heading, index) => (
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
                    </table> */}
                    {userData ? Object.entries(userData).map(([key, value]) => (<div key={key}>{value.toString()}</div>)) : <></>}
                </div>
                </div>
                <div className="border border-red-400">
                    1
                </div>
            </div>
        </>
    )
}