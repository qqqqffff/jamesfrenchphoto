import { useState } from "react"
import { 
    // HiOutlineChatAlt, 
    // HiOutlineChevronDoubleDown, 
    // HiOutlineChevronDoubleUp, 
    HiOutlineChevronDown, 
    HiOutlineChevronLeft, 
    // HiOutlineMinusCircle, 
    HiOutlinePlusCircle 
} from "react-icons/hi"
import { CreateUserModal } from "../modals"
import { CreateTagModal } from "../modals/CreateTag"
import { UserTag } from "../../types"
// import { createTimeString } from "../timeslot/Slot"
// import { GoTriangleDown, GoTriangleUp } from 'react-icons/go'

export default function UserManagement(){
    const [createUserModalVisible, setCreateUserModalVisible] = useState(false)
    const [createTagModalVisible, setCreateTagModalVisible] = useState(false)

    // const [userColumnDisplay, setUserColumnDisplay] = useState<UserColumnDisplay[]>([])
    const [sideBarToggles, setSideBarToggles] = useState<boolean>(true)

    const [existingTag] = useState<UserTag>()

    // const [selectedHeader, setSelectedHeader] = useState<{header: string, sort: 'ASC' | 'DSC' | undefined}>()

    //TODO: implement tag filtering

    // const createUser = () => {
    //     setCreateUserModalVisible(true)
    // }
    const createTag = () => {
        setCreateTagModalVisible(true)
    }
    // const notifyUser = () => {}
    // const deleteUser = () => {}
    // const promoteUser = () => {}
    // const demoteUser = () => {}
    // const deleteTag = () => {}


    function managementOptions(){
        const options = [
            // {
            //     title: 'Create User',
            //     fn: createUser,
            //     icon: (<HiOutlinePlusCircle />)
            // },
            {
                title: 'Create User Tag',
                fn: createTag,
                icon: (<HiOutlinePlusCircle />)
            },
            // {
            //     title: 'Notify User',
            //     fn: notifyUser,
            //     icon: (<HiOutlineChatAlt />)
            // },
            // {
            //     title: 'Delete User',
            //     fn: deleteUser,
            //     icon: (<HiOutlineMinusCircle />)
            // },
            // {
            //     title: 'Delete Tag',
            //     fn: deleteTag,
            //     icon: (<HiOutlineMinusCircle />)
            // },
            // {
            //     title: 'Promote User',
            //     fn: promoteUser,
            //     icon: (<HiOutlineChevronDoubleUp />)
            // },
            // {
            //     title: 'Demote User',
            //     fn: demoteUser,
            //     icon: (<HiOutlineChevronDoubleDown />)
            // },
            
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

    // function displayKeys(key: string): boolean {
    //     return key != 'userId' && key != 'participant' && key != 'activeParticipant'
    // }

    return (
        <>

            <CreateUserModal open={createUserModalVisible} onClose={() => setCreateUserModalVisible(false)} />
            <CreateTagModal open={createTagModalVisible} onClose={async () => {
                setCreateTagModalVisible(false)
            }} existingTag={existingTag}/>
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
                    {/* <div className="relative overflow-x-auto overflow-y-auto max-h-[100rem] shadow-md sm:rounded-lg">
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
                    </div> */}
                </div>
                <div className="flex flex-col border border-gray-400 rounded-lg p-2 me-4">
                    <div className="mb-2">
                        <span className="text-xl ms-4 mb-1">User Tags</span>
                    </div>
                </div>
            </div>
        </>
    )
}