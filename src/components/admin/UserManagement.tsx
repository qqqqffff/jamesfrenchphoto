import { generateClient } from "aws-amplify/api"
import { Schema } from "../../../amplify/data/resource"
import { Button } from "flowbite-react"
import { useEffect, useState } from "react"
import { HiOutlineChatAlt, HiOutlineChevronDoubleDown, HiOutlineChevronDoubleUp, HiOutlineChevronDown, HiOutlineChevronLeft, HiOutlineMinusCircle, HiOutlinePlusCircle } from "react-icons/hi"
import { ListUsersCommandOutput } from "@aws-sdk/client-cognito-identity-provider/dist-types/commands/ListUsersCommand"
import { CreateUserModal } from "../modals"
import { CreateTagModal } from "../modals/CreateTag"

const client = generateClient<Schema>()

interface UserData {
    email: string;
    emailVerified: boolean;
    last: string;
    first: string;
    userId: string;
    status: string;
    created?: Date;
    updated?: Date;
    enabled?: boolean;
}

export default function UserManagement(){
    const [createUserModalVisible, setCreateUserModalVisible] = useState(false)
    const [createTagModalVisible, setCreateTagModalVisible] = useState(false)
    const [userData, setUserData] = useState<UserData[] | undefined>()
    const [sideBarToggles, setSideBarToggles] = useState<boolean>(true)

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
                return 'UserID'
            default:
                return 'Attribute'
        }
    }
    async function getUsers() {
        console.log('api call')
        const json = await client.queries.GetAuthUsers({authMode: 'userPool'})
        
        const users = JSON.parse(json.data?.toString()!) as ListUsersCommandOutput
        console.log(users)
        if(!users || !users.Users) return
        const parsedUsers = users.Users.map((user) => {
            let attributes = new Map<string, string>()
            if(user.Attributes){
                user.Attributes.filter((attribute) => attribute.Name && attribute.Value).forEach((attribute) => {
                    attributes.set(parseAttribute(attribute.Name!), attribute.Value!)
                })
            }
            const enabled = user.Enabled
            const created = user.UserCreateDate
            const updated = user.UserLastModifiedDate
            const status = String(user.UserStatus)
            const userId = String(user.Username)
            return {
                ...Object.fromEntries(attributes),
                enabled,
                created,
                updated,
                status,
                userId,
            } as UserData
        })

        console.log(parsedUsers)
        setUserData(parsedUsers)
        return parsedUsers
    }
    useEffect(() => {
        if(!userData){
            getUsers()
        }
    }, [])

    const createUser = () => {
        setCreateUserModalVisible(true)
    }
    const createTag = () => {
        setCreateTagModalVisible(true)
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
                title: 'Create Tag',
                fn: createTag,
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

        if(sideBarToggles){
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

    function sideBarToggled(){
        if(sideBarToggles){
            return (<HiOutlineChevronDown className="me-3" />)
        }
        return (<HiOutlineChevronLeft className="me-3" />)
    }

    function displayKeys(key: string): boolean{
        return key != 'userId'
    }

    return (
        <>
            <CreateUserModal open={createUserModalVisible} onClose={() => setCreateUserModalVisible(false)} />
            <CreateTagModal open={createTagModalVisible} onClose={() => setCreateTagModalVisible(false)} />
            <Button onClick={async () => console.log(window.localStorage.getItem('user'))}></Button>
            <div className="grid grid-cols-6 gap-2 mt-4 font-main">
                <div className="flex flex-col ms-5 border border-gray-400 rounded-lg p-2">
                    <div className="flex flex-row">
                        <div className="flex flex-row w-full items-center justify-between hover:bg-gray-100 rounded-2xl py-1 cursor-pointer" onClick={() => {setSideBarToggles(!sideBarToggles)}}>
                            <span className="text-xl ms-4 mb-1">Management Options</span>
                            {sideBarToggled()}
                        </div>
                    </div>
                   {managementOptions()}
                </div>
                <div className="flex col-span-4 justify-center border border-gray-400 rounded-lg">
                    <div className="relative overflow-x-auto overflow-y-auto max-h-[100rem] shadow-md sm:rounded-lg">
                        {userData && userData.length > 0 ? 
                            (
                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                    <tr>
                                        {Object.keys(userData[0]).filter((key) => displayKeys(key)).map((heading, i) => (
                                            <th scope='col' className='px-6 py-3 border-x border-x-gray-300 border-b border-b-gray-300' key={i}>
                                                {heading}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                {userData.map((field, i) => {
                                    return (
                                        <tr key={i} className="bg-white border-b ">
                                            {Object.entries(field).filter((entry) => entry[0] != 'userId').map(([k, v], j) => {
                                                // console.log(k, v)
                                                let formatted: String = ''
                                                let tempDate = new Date(v)
                                                let currentUserBolding = ''
                                                if(!isNaN(tempDate.getTime()) && tempDate.getTime() > 1){
                                                    formatted = tempDate.toLocaleString()
                                                }
                                                else if(k.toUpperCase() !== 'USERID'){
                                                    formatted = [...String(v)][0].toUpperCase() + String(v).substring(1).toLowerCase()
                                                }
                                                else {
                                                    formatted = v
                                                }
                                                const currentUser = window.localStorage.getItem('user');
                                                if(currentUser && JSON.parse(currentUser).user.userId === field.userId){
                                                    currentUserBolding = 'font-bold'
                                                }

                                                return (
                                                    <td className={`text-ellipsis px-6 py-4 ${currentUserBolding}`} key={j}>{formatted}</td>
                                                )
                                            })}
                                        </tr>
                                    )    
                                })}
                            </tbody>
                            </table>
                        )
                        : (<></>)}
                    </div>
                </div>
                <div className="border border-red-400">
                    1
                </div>
            </div>
        </>
    )
}