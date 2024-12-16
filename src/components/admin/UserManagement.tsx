import { generateClient } from "aws-amplify/api"
import { Schema } from "../../../amplify/data/resource"
import { Checkbox, Dropdown, Label, Radio, Tooltip } from "flowbite-react"
import { useEffect, useState } from "react"
import { HiOutlineChatAlt, HiOutlineChevronDoubleDown, HiOutlineChevronDoubleUp, HiOutlineChevronDown, HiOutlineChevronLeft, HiOutlineMinusCircle, HiOutlinePlusCircle } from "react-icons/hi"
import { ListUsersCommandOutput } from "@aws-sdk/client-cognito-identity-provider/dist-types/commands/ListUsersCommand"
import { CreateUserModal } from "../modals"
import { CreateTagModal } from "../modals/CreateTag"
import { ColumnColor, Participant, PhotoCollection, Timeslot, UserColumnDisplay, UserData, UserProfile, UserTag } from "../../types"
import { createTimeString } from "../timeslot/Slot"
import { UserColumnModal } from "../modals/UserColumn"
import { GoTriangleDown, GoTriangleUp } from 'react-icons/go'
import { v4 } from 'uuid'

const client = generateClient<Schema>()
type UserTableData = 
    Omit<UserProfile, 'userTags' | 'participant' | 'activeParticipant'> & 
    Omit<Participant, 'firstName' | 'lastName' | 'contact' | 'email'> & { 
    parentFirstName: string,
    parentLastName: string,
    createdAt: string,
    updatedAt: string,
}

export default function UserManagement(){
    const [createUserModalVisible, setCreateUserModalVisible] = useState(false)
    const [createTagModalVisible, setCreateTagModalVisible] = useState(false)
    const [userColumnModalVisible, setUserColumnModalVisible] = useState(false)

    const [userData, setUserData] = useState<UserTableData[]>([])
    const [userColumnDisplay, setUserColumnDisplay] = useState<UserColumnDisplay[]>([])
    const [sideBarToggles, setSideBarToggles] = useState<boolean>(true)

    const [userTags, setUserTags] = useState<UserTag[]>([])
    const [existingTag, setExistingTag] = useState<UserTag>()

    const [selectedColumn, setSelectedColumn] = useState<string>('')
    const [selectedTag, setSelectedTag] = useState<string>('')
    const [selectedHeader, setSelectedHeader] = useState<{header: string, sort: 'ASC' | 'DSC' | undefined}>()

    const [apiCall, setApiCall] = useState(false)

    function parseAttribute(attribute: string){
        switch(attribute){
            case 'email':
                return 'email'
            case 'email_verified':
                return 'verified'
            case 'family_name':
                return 'last'
            case 'given_name':
                return 'first'
            case 'sub':
                return 'userId'
            default:
                return 'attribute'
        }
    }

    //TODO: implement tag filtering
    async function getUsers(tag?: string) {
        console.log('api call', tag)
        const json = await client.queries.GetAuthUsers({authMode: 'userPool'})
        
        const users = JSON.parse(json.data?.toString()!) as ListUsersCommandOutput
        if(!users || !users.Users) return
        const parsedUsersData = users.Users.map((user) => {
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

        const userTags: UserTag[] = await Promise.all((await client.models.UserTag.list()).data.map(async (tag) => {
            const userTag: UserTag = {
                ...tag,
                color: tag.color ?? undefined,
                collections: (await Promise.all((await tag.collectionTags()).data.map(async (item) => {
                    if(item === undefined) return
                    const collectionData = (await item.collection()).data
                    if(collectionData === null) return
                    const collection: PhotoCollection = {
                        ...collectionData,
                        coverPath: collectionData.coverPath ?? undefined,
                    }
                    return collection
                }))).filter((item) => item !== undefined)
            }
            return userTag
        }))

        const userTableData: UserTableData[] = (await Promise.all(parsedUsersData.map(async (user) => {
            const profile = (await client.models.UserProfile.get({ email: user.email })).data
            if(!profile) return
            const timeslot = (await profile.timeslot()).data
            const participantResponse = await profile.participant()
            if(participantResponse && participantResponse.data){
                const tableData: UserTableData[] = await Promise.all(participantResponse.data.map(async (participant) => {
                    const participantTimeslotsResponse = await participant.timeslot()
                    let participantTimeslot: Timeslot[] | undefined
                    if(participantTimeslotsResponse.data && participantTimeslotsResponse.data.length > 0){
                        participantTimeslot = (await Promise.all(participantTimeslotsResponse.data.map(async (timeslot) => {
                            if(!timeslot || !timeslot.id) return
                            const ts: Timeslot = {
                                ...timeslot,
                                id: timeslot.id!,
                                register: timeslot.register ?? undefined,
                                tagId: (await timeslot.timeslotTag()).data?.tagId,
                                start: new Date(timeslot.start),
                                end: new Date(timeslot.end),
                            }
                            return ts
                        }))).filter((item) => item !== undefined)
                    }
                    else if(timeslot.length > 0 && 
                        (!profile.participantFirstName || profile.participantFirstName == participant.firstName) && 
                        (!profile.participantLastName || profile.participantLastName == participant.lastName)) {
                        participantTimeslot = (await Promise.all(timeslot.map(async (timeslot) => {
                            if(!timeslot || !timeslot.id) return
                            const ts: Timeslot = {
                                ...timeslot,
                                id: timeslot.id!,
                                register: timeslot.register ?? undefined,
                                tagId: (await timeslot.timeslotTag()).data?.tagId,
                                start: new Date(timeslot.start),
                                end: new Date(timeslot.end),
                            }
                            return ts
                        }))).filter((item) => item !== undefined)
                    }
                    const participantData: UserTableData = {
                        ...profile,
                        id: participant.id,
                        participantFirstName: participant.firstName ?? undefined,
                        participantLastName: participant.lastName ?? undefined,
                        participantEmail: participant.email ?? undefined,
                        userTags: profile.userTags ? (profile.userTags as string[]).map((tag) => {
                            return userTags.find((userTag) => userTag.id === tag)
                        }).filter((tag) => tag !== undefined) : [],
                        timeslot: participantTimeslot,
                        participantMiddleName: participant.middleName ?? undefined,
                        participantPreferredName: participant.preferredName ?? undefined,
                        parentFirstName: user.first,
                        parentLastName: user.last,
                        preferredContact: profile.preferredContact ?? 'EMAIL',
                        participantContact: participant.contact ?? false,
                    }
                    return participantData
                }))
                return tableData
            }
            else{
                const participantData: UserTableData = {
                    ...profile,
                    id: v4(),
                    participantFirstName: profile.participantFirstName ?? undefined,
                    participantLastName: profile.participantLastName ?? undefined,
                    participantEmail: profile.participantEmail?? undefined,
                    userTags: profile.userTags ? (profile.userTags as string[]).map((tag) => {
                        return userTags.find((userTag) => userTag.id === tag)
                    }).filter((tag) => tag !== undefined) : [],
                    timeslot: (await Promise.all(timeslot.map(async (timeslot) => {
                        if(!timeslot || !timeslot.id) return
                        const ts: Timeslot = {
                            ...timeslot,
                            id: timeslot.id!,
                            register: timeslot.register ?? undefined,
                            tagId: (await timeslot.timeslotTag()).data?.tagId,
                            start: new Date(timeslot.start),
                            end: new Date(timeslot.end),
                        }
                        return ts
                    }))).filter((item) => item !== undefined),
                    participantMiddleName: profile.participantMiddleName ?? undefined,
                    participantPreferredName: profile.participantPreferredName ?? undefined,
                    parentFirstName: user.first,
                    parentLastName: user.last,
                    preferredContact: profile.preferredContact ?? 'EMAIL',
                    participantContact: profile.participantContact ?? false,
                }
                return [participantData]
            }
        })))
        .filter((item) => item !== undefined)
        .reduce((prev, cur) => {
            const ret = cur
            ret.push(...(prev.filter((item) => !cur.find((j) => j.id == item.id))))
            return ret
        }, [])

        const userColumnDisplay: UserColumnDisplay[] = []
        const response = await client.models.UserColumnDisplay.listUserColumnDisplayByTag({tag: 'all-users'})

        if(response !== null && response.data.find((item) => item !== null)){
            userColumnDisplay.push(...(await Promise.all(response.data.map(async (item) => {
                if(!item) return
                const color: ColumnColor[] = (await item.color()).data.map((color) => {
                    if(!color) return
                    return {
                        ...color,
                        bgColor: color.bgColor ?? undefined,
                        textColor: color.textColor ?? undefined,
                    }
                }).filter((item) => item !== undefined)
                const col: UserColumnDisplay = {
                    ...item,
                    color: color,
                    display: item.display ?? true,
                }
                return col
            }))).filter((item) => item !== undefined))
        }


        setUserColumnDisplay(userColumnDisplay)
        setUserData(userTableData)
        setUserTags(userTags)
        setApiCall(true)
    }
    useEffect(() => {
        if(!apiCall){
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
    const deleteTag = () => {}


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
                title: 'Delete Tag',
                fn: deleteTag,
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
            },
            
        ]

        if(sideBarToggles){
            return (
                <>
                    {options.map((option, index) => {
                        return (
                            <button key={index} className="flex flex-row items-center ms-4 my-1 hover:bg-gray-100 ps-2 py-1 rounded-3xl cursor-pointer" onClick={() => {option.fn()}}>
                                <div className="me-1 mt-1">{option.icon}</div>{option.title}
                            </button>
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

    function displayKeys(key: string): boolean {
        return key != 'userId' && key != 'participant' && key != 'activeParticipant'
    }

    function headingMap(key: string | undefined, update?: {original: UserTableData, val: string, noCommit?: boolean}, sort?: "ASC" | 'DSC' ): string | undefined | UserTableData[] | UserTableData {
        if(key === undefined) return
        switch(key.toLowerCase()){
            case 'sittingnumber':
                if(sort && userData){
                    const tempData = [...userData]
                    const sorted = sort == 'ASC' ? (
                        tempData.sort((a, b) => a.sittingNumber - b.sittingNumber)
                    ) : (
                        tempData.sort((a, b) => b.sittingNumber - a.sittingNumber)
                    )
                    return sorted
                }
                if(update) {
                    const temp = {...update.original}
                    temp.sittingNumber = Number.parseInt(update.val)
                    if(update.noCommit) updateRow(temp)
                    return temp
                }
                return 'Sitting Number'
            case 'email':
                if(sort && userData){
                    const tempData = [...userData]
                    return sort == 'ASC' ? (
                        tempData.sort((a, b) => a.email.localeCompare(b.email))
                    ) : (
                        tempData.sort((a, b) => b.email.localeCompare(a.email))
                    )
                }
                return 'Email'
            case 'usertags':
                return 'User Tags'
            case 'participantfirstname':
                if(sort && userData){
                    const tempData = [...userData]
                    return sort == 'ASC' ? (
                        tempData.sort((a, b) => {
                            if (a.participantFirstName === undefined) return 1; 
                            if (b.participantFirstName === undefined) return -1;
                            return a.participantFirstName.localeCompare(b.participantFirstName)
                        })
                    ) : (
                        tempData.sort((a, b) => {
                            if (b.participantFirstName === undefined) return 1; 
                            if (a.participantFirstName === undefined) return -1;
                            return b.participantFirstName.localeCompare(a.participantFirstName)
                        })
                    )
                }
                if(update) {
                    const temp = {...update.original}
                    temp.participantFirstName = update.val
                    if(update.noCommit) updateRow(temp)
                    return temp
                }
                return 'Participant First Name'
            case 'participantlastname':
                if(sort && userData){
                    const tempData = [...userData]
                    return sort == 'ASC' ? (
                        tempData.sort((a, b) => {
                            if (a.participantLastName === undefined) return 1; 
                            if (b.participantLastName === undefined) return -1;
                            return a.participantLastName.localeCompare(b.participantLastName)
                        })
                    ) : (
                        tempData.sort((a, b) => {
                            if (b.participantLastName === undefined) return 1; 
                            if (a.participantLastName === undefined) return -1;
                            return b.participantLastName.localeCompare(a.participantLastName)
                        })
                    )
                }
                if(update) {
                    const temp = {...update.original}
                    temp.participantLastName = update.val
                    if(update.noCommit) updateRow(temp)
                    return temp
                }
                return 'Participant Last Name'
            case 'participantmiddlename':
                if(sort && userData){
                    const tempData = [...userData]
                    return sort == 'ASC' ? (
                        tempData.sort((a, b) => {
                            if (a.participantMiddleName === undefined) return 1; 
                            if (b.participantMiddleName === undefined) return -1;
                            return a.participantMiddleName.localeCompare(b.participantMiddleName)
                        })
                    ) : (
                        tempData.sort((a, b) => {
                            if (b.participantMiddleName === undefined) return 1; 
                            if (a.participantMiddleName === undefined) return -1;
                            return b.email.localeCompare(a.email)
                        })
                    )
                }
                if(update) {
                    const temp = {...update.original}
                    temp.participantMiddleName = update.val
                    if(update.noCommit) updateRow(temp)
                    return temp
                }
                return 'Participant Middle Name'
            case 'participantpreferredname':
                if(sort && userData){
                    const tempData = [...userData]
                    return sort == 'ASC' ? (
                        tempData.sort((a, b) => {
                            if (a.participantPreferredName === undefined) return 1; 
                            if (b.participantPreferredName === undefined) return -1;
                            return a.participantPreferredName.localeCompare(b.participantPreferredName)
                        })
                    ) : (
                        tempData.sort((a, b) => {
                            if (b.participantPreferredName === undefined) return 1; 
                            if (a.participantPreferredName === undefined) return -1;
                            return b.participantPreferredName.localeCompare(a.participantPreferredName)
                        })
                    )
                }
                if(update) {
                    const temp = {...update.original}
                    temp.participantPreferredName = update.val
                    if(update.noCommit) updateRow(temp)
                    return temp
                }
                return 'Participant Preferred Name'
            case 'participantcontact':
                if(sort && userData){
                    const tempData = [...userData]
                    return sort == 'ASC' ? (
                        tempData.sort((a, b) => {
                            const x = a.participantContact ? 1 : 0
                            const y = b.participantContact ? 1 : 0
                            return x - y
                        })
                    ) : (
                        tempData.sort((a, b) => {
                            const x = a.participantContact ? 1 : 0
                            const y = b.participantContact ? 1 : 0
                            return y - x
                        })
                    )
                }
                if(update) {
                    const temp = {...update.original}
                    temp.participantContact = update.val.toLowerCase() === 'true' ? true : false
                    if(update.noCommit) updateRow(temp)
                    return temp
                }
                return 'Participant Contact'
            case 'preferredcontact':
                if(sort && userData){
                    const tempData = [...userData]
                    return sort == 'ASC' ? (
                        tempData.sort((a, b) => {
                            const x = a.preferredContact == 'EMAIL' ? 1 : 0
                            const y = b.preferredContact == 'EMAIL' ? 1 : 0
                            return x - y
                        })
                    ) : (
                        tempData.sort((a, b) => {
                            const x = a.preferredContact == 'EMAIL' ? 1 : 0
                            const y = b.preferredContact == 'EMAIL' ? 1 : 0
                            return y - x
                        })
                    )
                }
                if(update) {
                    const temp = {...update.original}
                    temp.preferredContact = update.val === 'PHONE' ? 'PHONE' : 'EMAIL'
                    if(update.noCommit) updateRow(temp)
                    return temp
                }
                return 'Preferred Contact'
            case 'participantemail':
                if(sort && userData){
                    const tempData = [...userData]
                    return sort == 'ASC' ? (
                        tempData.sort((a, b) => {
                            if (a.participantEmail === undefined) return 1; 
                            if (b.participantEmail === undefined) return -1;
                            return a.participantEmail.localeCompare(b.participantEmail)
                        })
                    ) : (
                        tempData.sort((a, b) => {
                            if (b.participantEmail === undefined) return 1; 
                            if (a.participantEmail === undefined) return -1;
                            return b.participantEmail.localeCompare(a.participantEmail)
                        })
                    )
                }
                if(update) {
                    const temp = {...update.original}
                    temp.participantEmail = update.val
                    if(update.noCommit) updateRow(temp)
                }
                return 'Participant Email'
            case 'createdat':
                if(sort && userData){
                    const tempData = [...userData]
                    return sort == 'ASC' ? (
                        tempData.sort((a, b) => {
                            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                        })
                    ) : (
                        tempData.sort((a, b) => {
                            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                        })
                    )
                }
                return 'Created At'
            case 'updatedat':
                if(sort && userData){
                    const tempData = [...userData]
                    return sort == 'ASC' ? (
                        tempData.sort((a, b) => {
                            return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
                        })
                    ) : (
                        tempData.sort((a, b) => {
                            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                        })
                    )
                }
                return 'Updated At'
            case 'timeslot':
                //TODO: special sorting
                return 'Timeslot'
            case 'parentfirstname':
                if(sort && userData){
                    const tempData = [...userData]
                    return sort == 'ASC' ? (
                        tempData.sort((a, b) => {
                            return a.parentFirstName.localeCompare(b.parentFirstName)
                        })
                    ) : (
                        tempData.sort((a, b) => {
                            return b.parentFirstName.localeCompare(a.parentFirstName)
                        })
                    )
                }
                if(update) {
                    const temp = {...update.original}
                    temp.parentFirstName = update.val
                    if(update.noCommit) updateRow(temp)
                    return temp
                }
                return 'Parent First Name'
            case 'parentlastname':
                if(sort && userData){
                    const tempData = [...userData]
                    return sort == 'ASC' ? (
                        tempData.sort((a, b) => {
                            return a.parentLastName.localeCompare(b.parentLastName)
                        })
                    ) : (
                        tempData.sort((a, b) => {
                            return b.parentLastName.localeCompare(a.parentLastName)
                        })
                    )
                }
                if(update) {
                    const temp = {...update.original}
                    temp.parentLastName = update.val
                    if(update.noCommit) updateRow(temp)
                    return temp
                }
                return 'Parent Last Name'
        }
    }

    async function updateRow(newItem: UserTableData) {
        const updateProfileResponse = await client.models.UserProfile.update({
            email: newItem.email,
            sittingNumber: newItem.sittingNumber,
            userTags: userTags
                .filter((item) => newItem.userTags
                .map((item) => item.name).includes(item.name))
                .map((item) => item.id),
            participantFirstName: newItem.participantFirstName,
            participantLastName: newItem.participantLastName,
            participantMiddleName: newItem.participantMiddleName,
            participantPreferredName: newItem.participantPreferredName,
            preferredContact: newItem.preferredContact,
            participantContact: newItem.participantContact,
            participantEmail: newItem.participantEmail,
        })
        console.log(updateProfileResponse)

        if(userData && updateProfileResponse){
            const temp = [...userData].map((item) => {
                if(item.email !== newItem.email) return item
                return newItem
            })
            setUserData(temp)
        }
    }

    return (
        <>

            <CreateUserModal open={createUserModalVisible} onClose={() => setCreateUserModalVisible(false)} />
            <CreateTagModal open={createTagModalVisible} onClose={async () => {
                setApiCall(false)
                setCreateTagModalVisible(false)
                await getUsers(selectedTag)
            }} existingTag={existingTag}/>
            <UserColumnModal 
                open={userColumnModalVisible} 
                onClose={() => setUserColumnModalVisible(false)} 
                columnData={{
                    heading: headingMap(selectedColumn!)! as string, 
                    data: userData ? userData.map((item) => {
                        const value = Object.entries(item)
                            .find((item) => (item[0].toLowerCase() === selectedColumn.toLowerCase()))
                        if(value === undefined || typeof value[1] !== 'string') return
                        return ({ 
                            value: value[1],
                            id: item.email
                        })
                    }).filter((item) => item !== undefined) : [],
                    tag: selectedTag
                }}
            />
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
                <div className="flex col-span-4 justify-center border border-gray-400 rounded-lg px-1">
                    <div className="relative overflow-x-auto overflow-y-auto max-h-[100rem] shadow-md sm:rounded-lg">
                        {userData ? 
                            userData.length > 0 ? (
                                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky">
                                        <tr>
                                            {Object.keys(userData[0]).filter((key) => displayKeys(key)).map((heading, i) => {
                                                return (
                                                    <th onMouseEnter={() => {
                                                            if(heading !== 'userTags' && heading !== 'timeslot' && (!selectedHeader || selectedHeader.header !== heading)) {
                                                                setSelectedHeader({header: heading, sort: undefined})
                                                            }
                                                        }} 
                                                        onDrag={(event) => console.log(event)} scope='col' 
                                                        className='relative px-6 py-3 border-x border-x-gray-300 border-b border-b-gray-300 min-w-[150px] max-w-[150px] whitespace-normal overflow-hidden break-words text-center items-center' key={i}>
                                                        <button className="hover:underline underline-offset-2 max-w-[140px]" onClick={() => {
                                                            setSelectedColumn(heading)
                                                            setUserColumnModalVisible(true)
                                                        }}>{headingMap(heading) as string}</button>
                                                        {selectedHeader && selectedHeader.header == heading ? (
                                                            <button className="absolute me-1 mt-1 inset-y-0 right-0" onClick={() => {
                                                                const temp = { ...selectedHeader }
                                                                temp.sort = temp.sort == 'ASC' ? 'DSC' : 'ASC'
                                                                const temp2 = headingMap(heading, undefined, temp.sort) as UserTableData[]
                                                                setSelectedHeader(temp)
                                                                setUserData(temp2)
                                                            }}>{
                                                                selectedHeader.sort == 'ASC' ? (
                                                                    <GoTriangleUp className="text-lg"/>
                                                                ) : (
                                                                    <GoTriangleDown className="text-lg"/>
                                                            )}</button>
                                                        ) : (<></>)}
                                                    </th>
                                                )
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {userData.map((field, i) => {
                                            return (
                                                <tr key={i} className="bg-white border-b">
                                                    {Object.entries(field).map(([k, v], j) => {
                                                        if(k === undefined) return (<></>)
                                                        if(!displayKeys(k)) return undefined
                                                        let display = v
                                                        let styling = ''
                                                        const columnDisplay = userColumnDisplay.find((item) => {
                                                            return item.heading.replace(new RegExp(/\s/, 'g'), '').toLowerCase() == k.toLowerCase()
                                                        })
                                                        if(columnDisplay){
                                                            const color = columnDisplay.color?.find((color) => color.value == v)
                                                            const textColor = color?.textColor ? `text-${color.textColor}` : ''
                                                            const bgColor = color?.bgColor ? `bg-${color.bgColor}` : ''
                                                            styling = textColor + ' ' + bgColor
                                                        }
                                                        let children: JSX.Element[] | undefined
                                                        if(k.toLowerCase() == 'usertags'){
                                                            const tagString = (v as UserTag[])
                                                            const displayTags = tagString
                                                                .map((tag, index) => {
                                                                    const userTag = userTags.find((ut) => ut.id == tag.id)
                                                                    if(!userTag) return
                                                                    return (
                                                                        <p className={`${userTag.color ? `text-${userTag.color}` : ''}`}>{userTag.name + (tagString.length - 1 != index ? ', ' : '')}</p>
                                                                    )
                                                                })
                                                                .filter((item) => item !== undefined)
                                                            children = [(
                                                                <Dropdown
                                                                    label={displayTags.length > 0 ? displayTags : 'None'} key={field.email + '-' + 'tags'} color='light' dismissOnClick={false}>
                                                                    {userTags.map((tag, index) => {
                                                                        return (
                                                                            <Dropdown.Item key={index}>
                                                                                <button className="flex flex-row gap-2 text-left items-center" onClick={() => {
                                                                                    const temp = {...field}
                                                                                    if(tagString.map((tag) => tag.id).includes(tag.id)){
                                                                                        temp.userTags = temp.userTags.filter((t) => t.id !== tag.id)
                                                                                    }
                                                                                    else{
                                                                                        temp.userTags.push(tag)
                                                                                    }
                                                                                    
                                                                                    updateRow(temp)
                                                                                }} type="button">
                                                                                    <Checkbox className="mt-1" checked={tagString.map((tag) => tag.id).includes(tag.id)} readOnly />
                                                                                    <span className={`${tag.color ? `text-${tag.color}` : ''}`}>{tag.name}</span>
                                                                                </button>
                                                                            </Dropdown.Item>
                                                                         )
                                                                    })}
                                                                </Dropdown>
                                                            )]
                                                        }
                                                        if(k.toLowerCase() == 'participantcontact' || k.toLowerCase() == 'preferredcontact'){
                                                            display = String(v)[0].toUpperCase() + String(v).substring(1).toLowerCase()
                                                        }
                                                        if(k.toLocaleLowerCase() == 'createdat' || k.toLocaleLowerCase() == 'updatedat'){
                                                            display = new Date(v as string).toLocaleString("en-us", { timeZone: 'America/Chicago' })
                                                        }
                                                        if(k.toLocaleLowerCase() == 'timeslot'){
                                                            const timeslots = v as Timeslot[]
                                                            children = userData[i].userTags.map((tag) => {
                                                                const userTag = userTags?.find((ut) => ut.id == tag.id)
                                                                if(!userTag) return
                                                                const timeslot = timeslots.find((timeslot) => timeslot.tagId === userTag.id)
                                                                return (
                                                                    <p className={`${userTag.color !== undefined ? `text-${userTag.color}` : ''}`}>{
                                                                        timeslot ? timeslot.start.toLocaleDateString("en-us", { timeZone: 'America/Chicago' }) + ": " + createTimeString(timeslot) :
                                                                        'Not Registered'    
                                                                    }</p>
                                                                )
                                                            })
                                                            .filter((item) => item !== undefined)
                                                            children = children.length == 0 ? undefined : children
                                                            display = 'No Timeslots'
                                                        }

                                                        return (
                                                            <td className={`text-ellipsis px-6 py-4 ${styling} border`} key={j}>
                                                                {children ? children : (
                                                                    <input 
                                                                        disabled={k.toLowerCase() == 'email' || k.toLowerCase() == 'createdat' || k.toLowerCase() == 'updatedat'} 
                                                                        className={`focus:outline-none focus:border-b focus:border-black disabled:bg-transparent disabled:cursor-not-allowed ${styling}`} 
                                                                        defaultValue={typeof display == 'string' ? display : undefined} 
                                                                        onBlur={(event) => {
                                                                            headingMap(k, {original: field, val: event.target.value})
                                                                        }}
                                                                        onChange={() => {}}
                                                                        value={typeof display == 'string' ? display : undefined}
                                                                    />
                                                                )}
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            )    
                                        })}
                                        <tr className="bg-white">
                                            {Object.keys(userData[0]).map((item, i) => {
                                                const found = userColumnDisplay.find((col) => headingMap(item) == col.heading)
                                                if(item.toLowerCase() == 'timeslot'){
                                                    const aggregate = userData
                                                        .map((item) => item.timeslot)
                                                        .reduce((prev, cur) => cur !== undefined && cur.length > 0 ? prev = prev + 1 : prev, 0)
                                                    return (
                                                        <td key={i} className="text-ellipsis px-6 py-4 border">
                                                            {aggregate + "/" + userData.length} Registered
                                                        </td>
                                                    )
                                                }
                                                if(found && found.color && found.color.length > 0){
                                                    let leftover = userData.length
                                                    return (
                                                        <td key={i} className="text-ellipsis px-6 py-4 border">
                                                            <div className="flex flex-row">
                                                                {found.color?.map((color) => {
                                                                    const aggregate = userData
                                                                        .map((row) => {
                                                                            return Object.entries(row).find((entry) => entry[0] === item)?.[1]
                                                                        })
                                                                        .filter((item) => item !== undefined && typeof item === 'string')
                                                                        .reduce((prev, cur) => cur !== undefined && cur == color.value ? prev = prev + 1 : prev, 0)
                                                                    leftover -= aggregate
                                                                    return (
                                                                        <Tooltip content={aggregate + '/' + userData.length + ` ${((aggregate/userData.length) * 100).toPrecision(4)}%`}>
                                                                            <div className={`text-${color.textColor} bg-${color.bgColor} p-2`}>
                                                                                {color.value[0]}
                                                                            </div>
                                                                        </Tooltip>
                                                                        
                                                                    )
                                                                })}
                                                                <Tooltip content={leftover + '/' + userData.length + ` ${((leftover/userData.length) * 100).toPrecision(4)}%`}>
                                                                    <div className={`text-black bg-gray-300 p-2`}>
                                                                        N/A
                                                                    </div>
                                                                </Tooltip>
                                                            </div>
                                                        </td>
                                                    )
                                                }
                                                return (
                                                    <td></td>
                                                )
                                            })}
                                        </tr>
                                    </tbody>
                                </table>
                            ) : (
                                <>No Users in this group</>
                            )
                        : (<>Loading...</>)}
                    </div>
                </div>
                <div className="flex flex-col border border-gray-400 rounded-lg p-2 me-4">
                    <div className="mb-2">
                        <span className="text-xl ms-4 mb-1">User Tags</span>
                    </div>
                    {apiCall ? (
                        <>
                            <div className="flex flex-row items-center">
                                <Radio checked={selectedTag === ''} onChange={async () => {
                                    setSelectedTag('')
                                    setUserData([])
                                    await getUsers('')
                                }}/>
                                <span className={`ms-4 mb-1`}>All Users</span>
                            </div>
                            {userTags.map((tag) => {
                                const color = tag.color ? tag.color : 'black'

                                return (
                                    <div className="flex flex-row items-center">
                                        <Radio checked={selectedTag === tag.id} onChange={async () => {
                                            setSelectedTag(tag.id)
                                            setUserData([])
                                            await getUsers(tag.id)
                                        }}/>
                                        <span key={tag.id} className={`text-${color} ms-4 mb-1 cursor-pointer hover:underline underline-offset-2`} onClick={() => {
                                            setExistingTag(tag)
                                            setCreateTagModalVisible(true)
                                        }}>{tag.name}</span>
                                    </div>
                                    
                                )
                            })}
                        </>
                        
                    ) : (<Label className="text-lg italic text-gray-500">Loading...</Label>)}
                </div>
            </div>
        </>
    )
}