import { Badge, Button, ButtonGroup, Checkbox, Datepicker, Dropdown, Label, Tooltip } from "flowbite-react"
import { FC, useEffect, useState } from "react"
import { ControlComponent } from "../admin/ControlPannel"
import { 
    HiOutlinePlusCircle, 
    // HiOutlineMinusCircle, 
    HiOutlineArrowRight, 
    HiOutlineArrowLeft 
} from "react-icons/hi2"
import { CreateTimeslotModal } from "../modals/CreateTimeslot"
import { Timeslot, UserTag } from "../../types"
import { generateClient } from "aws-amplify/api"
import { Schema } from "../../../amplify/data/resource"
import { SlotComponent } from "./Slot"
import { 
    badgeColorThemeMap, 
    currentDate, 
    DAY_OFFSET, 
    formatTime, 
    GetColorComponent 
} from "../../utils"
import { ConfirmationModal } from "../modals/Confirmation"
import { HiOutlineInformationCircle } from "react-icons/hi"
import useWindowDimensions from "../../hooks/windowDimensions"

const client = generateClient<Schema>()

interface TimeslotComponentProps {
    admin?: boolean
    userEmail?: string
    minDate?: Date
    userTags?: UserTag[]
    participantId?: string
}

interface TagTimeslots extends Record<string, Timeslot[]> {}

export const TimeslotComponent: FC<TimeslotComponentProps> = ({ admin, userEmail, participantId, minDate, userTags }) => {
    const [activeDate, setActiveDate] = useState<Date>(currentDate)
    const [timeslots, setTimeslots] = useState<Timeslot[]>([])
    const [profileTimeslots, setProfileTimeslots] = useState<TagTimeslots>({})
    const [createTimeslotVisible, setCreateTimeslotVisible] = useState(false)
    const [registerConfirmationVisible, setRegisterConfirmationVisible] = useState(false)
    const [unregisterConfirmationVisible, setUnegisterConfirmationVisible] = useState(false)
    const [selectedTimeslot, setSelectedTimeslot] = useState<Timeslot | undefined>()
    const [tagTimeslots, setTagTimeslots] = useState<TagTimeslots>({})
    const [updatingTimeslot, setUpdatingTimeslot] = useState(false)
    const { width } = useWindowDimensions()
    const [activeConsole, setActiveConsole] = useState<string>('myTimeslots')
    const [apiCall, setApiCall] = useState(false)
    const [notify, setNotify] = useState(false)

    useEffect(() => {
        async function api(){
            console.log('api call')

            let tagTimeslots: TagTimeslots = {}
            let tagProfileTimeslots: TagTimeslots = {}
            

            let timeslots: Timeslot[] = []
            let profileTimeslots: Timeslot[] = []

            if(admin){
                timeslots = (await client.models.Timeslot.list({ filter: {
                        start: { contains: currentDate.toISOString().substring(0, new Date().toISOString().indexOf('T')) },
                    }})).data.map((timeslot) => {
                        if(timeslot === undefined || timeslot.id === undefined || timeslot.start === undefined || timeslot.end === undefined) return undefined
                        const ts: Timeslot = {
                            id: timeslot.id as string,
                            register: timeslot.register ?? undefined,
                            start: new Date(timeslot.start),
                            end: new Date(timeslot.end),
                        }
                        return ts
                    }).filter((timeslot) => timeslot !== undefined)
            }
            else if(userTags && !admin && userEmail){
                const profileResponse = (await client.models.UserProfile.get({ email: userEmail})).data
                if(profileResponse){
                    profileTimeslots = (await Promise.all((await profileResponse.timeslot()).data.map((timeslot) => {
                        if(timeslot === undefined || timeslot.id === undefined || timeslot.start === undefined || timeslot.end === undefined) return undefined
                        const ts: Timeslot = {
                            id: timeslot.id as string,
                            register: timeslot.register ?? undefined,
                            start: new Date(timeslot.start),
                            end: new Date(timeslot.end),
                        }
                        return ts
                    }))).filter((timeslot) => timeslot !== undefined)
                }
                timeslots = (await Promise.all(userTags.map(async (tag) => {
                        const tagResponse = (await client.models.UserTag.get({ id: tag.id })).data
                        if(!tagResponse) {
                            tagTimeslots[tag.id] = []
                            return
                        }
                        const timeslotTags = (await tagResponse.timeslotTags()).data
                        if(!timeslotTags) {
                            tagTimeslots[tag.id] = []
                            return
                        }
                        if(profileTimeslots) {
                            const timeslotsMap = timeslotTags.map((tag) => tag.timeslotId)
                            const profileTimeslot = profileTimeslots.find((ts) => timeslotsMap.includes(ts.id))
                            if(profileTimeslot){
                                tagProfileTimeslots[tag.id] = [profileTimeslot]
                            }
                        }
                        
                        const timeslots = (await Promise.all(timeslotTags.map(async (timeslotTag) => {
                                const timeslotResponse = (await timeslotTag.timeslot()).data
                                if(timeslotResponse === null || timeslotResponse.id === null || timeslotResponse.start === undefined || timeslotResponse.end === undefined) return
                                
                                const timeslot: Timeslot = {
                                    id: timeslotResponse.id as string,
                                    start: new Date(timeslotResponse.start),
                                    end: new Date(timeslotResponse.end),
                                    tagId: timeslotTag.tagId ?? undefined,
                                    register: timeslotResponse.register ?? undefined
                                }
                                return timeslot
                        }))).filter((timeslot) => timeslot !== undefined)
                        tagTimeslots[tag.id] = timeslots
                        return timeslots
                    })))
                    .filter((timeslot) => {
                        return timeslot !== undefined
                    })
                    .filter((timeslot) => {
                        if(timeslot.length == 0) return false
                        return currentDate.toISOString().includes(timeslot[0].start.toISOString().substring(0, timeslot[0].start.toISOString().indexOf('T')))
                    })
                    .reduce((prev, cur) => [...prev, ...cur], [])
            }

            const presetDay = Object.values(tagTimeslots)
                .map((timeslots) => timeslots.filter((timeslot) => timeslot.start > new Date()))
                .reduce((prev, cur) => [...prev, ...cur], [])
                .sort((a, b) => a.start.getTime() - b.start.getTime())

            setUpdatingTimeslot(timeslots.length > 0)
            setTimeslots(timeslots)
            setTagTimeslots(tagTimeslots)
            setProfileTimeslots(tagProfileTimeslots)
            setActiveDate(presetDay && presetDay.length > 0 ? new Date(presetDay[0].start.getFullYear(), presetDay[0].start.getMonth(), presetDay[0].start.getDate()) : currentDate)
        }
        if(!apiCall){
            api()
            setApiCall(true)
        }
    })

    async function userFetchTimeslots(userTags: UserTag[], userEmail: string){
        let tagProfileTimeslots: TagTimeslots = {}
        let tagTimeslots: TagTimeslots = {} 
        let profileTimeslots: Timeslot[] = []

        const profileResponse = (await client.models.UserProfile.get({ email: userEmail})).data
        
        if(profileResponse){
            profileTimeslots = (await Promise.all((await profileResponse.timeslot()).data.map((timeslot) => {
                if(timeslot === undefined || timeslot.id === undefined || timeslot.start === undefined || timeslot.end === undefined) return undefined
                const ts: Timeslot = {
                    id: timeslot.id as string,
                    register: timeslot.register ?? undefined,
                    start: new Date(timeslot.start),
                    end: new Date(timeslot.end),
                }
                return ts
            }))).filter((timeslot) => timeslot !== undefined)
        }
        const timeslots: Timeslot[] = (await Promise.all(userTags.map(async (tag) => {
            const tagResponse = (await client.models.UserTag.get({ id: tag.id })).data
            if(!tagResponse) {
                tagTimeslots[tag.id] = []
                return
            }
            const timeslotTags = (await tagResponse.timeslotTags()).data
            if(!timeslotTags) {
                tagTimeslots[tag.id] = []
                return
            }
            if(profileTimeslots) {
                const timeslotsMap = timeslotTags.map((tag) => tag.timeslotId)
                const profileTimeslot = profileTimeslots.find((ts) => timeslotsMap.includes(ts.id))
                if(profileTimeslot){
                    tagProfileTimeslots[tag.id] = [profileTimeslot]
                }
            }
            
            const timeslots = (await Promise.all(timeslotTags.map(async (timeslotTag) => {
                const timeslotResponse = (await timeslotTag.timeslot()).data
                if(timeslotResponse === null || timeslotResponse.id === undefined || timeslotResponse.start === undefined || timeslotResponse.end === undefined) return 
                
                const timeslot: Timeslot = {
                    id: timeslotResponse.id as string,
                    start: new Date(timeslotResponse.start),
                    end: new Date(timeslotResponse.end),
                    tagId: timeslotTag.tagId ?? undefined,
                    register: timeslotResponse.register ?? undefined
                }
                return timeslot
            }))).filter((timeslot) => timeslot !== undefined)
            tagTimeslots[tag.id] = timeslots
            return timeslots
        })))
        .filter((timeslot) => {
            return timeslot !== undefined
        })
        .filter((timeslot) => {
            if(timeslot.length == 0) return false
            return true
        })
        .reduce((prev, cur) => [...prev, ...cur], [])

        setTagTimeslots(tagTimeslots)
        setProfileTimeslots(tagProfileTimeslots)
        setTimeslots(timeslots)
        setNotify(false)
    }

    function formatTimeslot() {
        return Object.entries(tagTimeslots).map(([tagId, timeslots]) => {
            const color = userTags!.find((tag) => tag.id === tagId)!.color ?? 'black'
            const objects = timeslots
                .filter((timeslot) => {
                    return activeDate.toISOString().includes(timeslot.start.toISOString().substring(0, timeslot.start.toISOString().indexOf('T')))
                })
                .sort((a, b) => a.start.getTime() - b.start.getTime())
                .map((timeslot, index) => {
                    const selected = userEmail && userEmail === timeslot.register ? 'bg-gray-200' : ''
                    let disabled = admin || timeslot.register !== undefined || new Date() > activeDate || (
                        profileTimeslots[tagId] && profileTimeslots[tagId].length > 0
                    )
                    if(profileTimeslots[tagId] && profileTimeslots[tagId][0].id === timeslot.id) disabled = false
                    const disabledText = disabled ? 'line-through cursor-not-allowed' : ''

                    return (
                        <button key={index} onClick={() => {
                            if(userEmail && userEmail !== timeslot.register) {
                                setRegisterConfirmationVisible(true)
                                setSelectedTimeslot(timeslot)
                            }
                            else if(userEmail && userEmail === timeslot.register){
                                setUnegisterConfirmationVisible(true)
                                setSelectedTimeslot(timeslot)
                            }
                        }} disabled={disabled} className={`${selected} rounded-lg enabled:hover:bg-gray-300 text-${color} ${disabledText}`}>
                            <SlotComponent timeslot={timeslot} displayRegister={admin ?? false} />
                        </button>
                    )
                })
            return objects
        })
        .filter((elements) => elements.length > 0)
        .reduce((prev, cur) => [...prev, ...cur], [])
    }

    function formatRegisteredTimeslots(){
        return Object.entries(profileTimeslots).map(([tagId, timeslot], index) => {
            const tag = userTags!.find((tag) => tag.id === tagId)
            const color = tag && tag.color ? tag.color : 'black'
            if(!timeslot || timeslot.length < 0 || timeslot[0] === undefined || timeslot[0].id === undefined || timeslot[0].start === undefined || timeslot[0].end === undefined) return undefined
            
            return (
                <div className={`flex flex-col text-${color} text-sm`} key={index}>
                    <span className="underline underline-offset-2">
                        {tag ? tag.name : 'Undefined'}
                    </span>
                    <span>
                        {`${timeslot[0].start.toLocaleDateString("en-us", { timeZone: 'America/Chicago' })}: ${timeslot[0].start.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })} - ${timeslot[0].end.toLocaleTimeString("en-us", { timeZone: 'America/Chicago' })}`}
                    </span>
                </div>
                
            )
        })
        .filter((elements) => elements !== undefined)
    }

    function fullSizeDisplay(){
        return (
            <div className="grid grid-cols-6 gap-4 font-main mt-6">
                <div className="flex flex-col ms-4 border border-gray-400 rounded-lg px-6 py-2 gap-2">
                    <div className="flex flex-row gap-1 w-full justify-between">
                        <span className="text-2xl underline underline-offset-4">Timeslot Date</span>
                        { admin ? (<></>) : 
                            (<Tooltip content={
                                (<span className="italic">Click on a timeslot to register for a selected date in the range seen bellow!</span>)
                            }>
                                <Badge color="light" icon={HiOutlineInformationCircle} className="text-2xl text-gray-600 bg-transparent" theme={badgeColorThemeMap} size="" />
                            </Tooltip>)}
                    </div>
                    {
                        admin ? 
                            (
                            <Datepicker minDate={minDate} className='mt-2' onChange={async (date) => {
                                if(date) {
                                    let timeslots: Timeslot[] = []
                                    if(admin){
                                        timeslots = (await client.models.Timeslot.list({ filter: {
                                            start: { contains: date.toISOString().substring(0, date.toISOString().indexOf('T')) }
                                        }})).data.map((timeslot) => {
                                            if(timeslot === undefined || timeslot.id === undefined || timeslot.start === undefined || timeslot.end === undefined) return undefined
                                            const ts: Timeslot = {
                                                id: timeslot.id as string,
                                                register: timeslot.register ?? undefined,
                                                start: new Date(timeslot.start),
                                                end: new Date(timeslot.end),
                                            }
                                            return ts
                                        }).filter((timeslot) => timeslot !== undefined)
                                    }
                                    else if(!admin && userTags){
                                        timeslots = Object.values(tagTimeslots)
                                            .filter((timeslot) => timeslot !== undefined)
                                            .filter((timeslot) => {
                                                if(timeslot.length == 0) return false
                                                return date.toISOString().includes(timeslot[0].start.toISOString().substring(0, timeslot[0].start.toISOString().indexOf('T')))
                                            })
                                            .reduce((prev, cur) => [...prev, ...cur], [])
                                    }
                                    
                                    setUpdatingTimeslot(timeslots.length > 0)
                                    setActiveDate(date)
                                    setTimeslots(timeslots)
                                }
                            }}/>
                            ) : (
                                <div className="flex flex-row gap-2 items-center">
                                    <button className="border p-1.5 rounded-full border-black bg-white hover:bg-gray-300" onClick={() => {
                                        const timeslots = Object.values(tagTimeslots)
                                            .reduce((prev, cur) => [...prev, ...cur], [])
                                            .map((timeslot) => new Date(timeslot.start.getFullYear(), timeslot.start.getMonth(), timeslot.start.getDate()).getTime())
                                            .reduce((prev, cur) => {
                                                if(!prev.includes(cur)){
                                                    prev.push(cur)
                                                }
                                                return prev
                                            }, [] as number[])
                                            .map((time) => new Date(time))

                                        const currentTimeslotIndex = timeslots.findIndex((date) => date.getTime() === activeDate.getTime())
                                        const currentDate = currentTimeslotIndex - 1 < 0 ? timeslots[timeslots.length - 1] : timeslots[currentTimeslotIndex - 1]
                                        
                                        setActiveDate(currentDate)
                                    }} disabled={!(tagTimeslots && Object.entries(tagTimeslots).length > 0)}>
                                        <HiOutlineArrowLeft />
                                    </button>
                                    <Dropdown color="light" label={'Date: ' + activeDate.toLocaleDateString()}>
                                        {
                                            tagTimeslots && Object.entries(tagTimeslots).length > 0 ? Object.entries(tagTimeslots).map(([tagId, timeslots]) => {
                                                const color = userTags!.find((tag) => tag.id === tagId)!.color ?? 'black'
                                                const dates = timeslots
                                                    .map((timeslot) => new Date(timeslot.start.getFullYear(), timeslot.start.getMonth(), timeslot.start.getDate()).getTime())
                                                    .reduce((prev, cur) => {
                                                        if(!prev.includes(cur)) {
                                                            prev.push(cur)
                                                        }
                                                        return prev
                                                    }, [] as number[])
                                                    .sort((a, b) => a - b)
                                                    .map((time) => new Date(time))
                                                const objects = dates.map((date, index) => {
                                                    return (
                                                        <Dropdown.Item key={index} className={`text-${color}`} onClick={() => setActiveDate(date)}>{date.toLocaleDateString()}</Dropdown.Item>
                                                    )
                                                })
                                                return objects
                                            }) : (<Dropdown.Item>No Dates available</Dropdown.Item>)
                                        }
                                    </Dropdown>
                                    <button className="border p-1.5 rounded-full border-black bg-white hover:bg-gray-300" onClick={() => {
                                        const timeslots = Object.values(tagTimeslots)
                                            .reduce((prev, cur) => [...prev, ...cur], [])
                                            .map((timeslot) => new Date(timeslot.start.getFullYear(), timeslot.start.getMonth(), timeslot.start.getDate()).getTime())
                                            .reduce((prev, cur) => {
                                                if(!prev.includes(cur)){
                                                    prev.push(cur)
                                                }
                                                return prev
                                            }, [] as number[])
                                            .map((time) => new Date(time))

                                        const currentTimeslotIndex = timeslots.findIndex((date) => date.getTime() === activeDate.getTime())
                                        const currentDate = currentTimeslotIndex + 1 >= timeslots.length ? timeslots[0] : timeslots[currentTimeslotIndex + 1]
                                        
                                        setActiveDate(currentDate)
                                    }} disabled={!(tagTimeslots && Object.entries(tagTimeslots).length > 0)}>
                                        <HiOutlineArrowRight />
                                    </button>
                                </div>
                                
                            )
                    }
                    {
                        admin ? (
                            <>
                                <ControlComponent className="" name={<><HiOutlinePlusCircle size={20} className="mt-1 me-1"/>{updatingTimeslot ? 'Update Timeslot' : 'Add Timeslot'}</>} fn={() => {
                                    setUpdatingTimeslot(timeslots.length > 0)
                                    setCreateTimeslotVisible(true)
                                }} type={true} disabled={activeDate.getTime() < currentDate.getTime() + DAY_OFFSET}/>
                                {/* <ControlComponent className="" name={<><HiOutlinePlusCircle size={20} className="mt-1 me-1"/>Update Timeslot</>} fn={() => setCreateTimeslotVisible(true)} type={true} disabled={}/> */}
                                {/* <ControlComponent name={<><HiOutlineMinusCircle size={20} className="mt-1 me-1"/>Remove Timeslot</>} fn={() => {}} type={true}/> */}
                            </>
                        ) : (
                            <>
                                {
                                    tagTimeslots && Object.entries(tagTimeslots).length > 0 ? 
                                    (
                                        <div className="flex flex-col">
                                            {Object.entries(tagTimeslots)
                                                .filter(([tag, timeslots]) => tag && timeslots && timeslots.length > 0)
                                                .map(([tagId, timeslots], index) => {
                                                    const tag: UserTag = userTags!.find((tag) => tag.id == tagId)!
                                                    const sortedTimeslots = timeslots.sort((a, b) => a.start.getTime() - b.start.getTime())
                                                    
                                                    const formattedDateString = sortedTimeslots[0].start.toLocaleDateString("en-us", { timeZone: 'America/Chicago' }) + ' - ' + sortedTimeslots[sortedTimeslots.length - 1].start.toLocaleDateString("en-us", { timeZone: 'America/Chicago' })

                                                    return (
                                                        <div key={index} className="flex flex-col items-center justify-center">
                                                            <span>Dates for:</span>
                                                            <Badge theme={badgeColorThemeMap} color={tag.color ? tag.color : 'light'} key={index} className="py-1 text-md">{tag.name}</Badge>
                                                            <GetColorComponent activeColor={tag.color} customText={formattedDateString} />
                                                            {/* <GetColorComponent activeColor={tag.color} customText={} */}
                                                        </div>
                                                    )
                                            })}
                                        </div>
                                        
                                    ) 
                                    : (<span className="text-gray-400 italic">No current timeslots for registration!</span>)
                                }
                            </>
                        )
                        
                    }
                </div>
                <div className="col-span-4 border border-gray-400 rounded-lg py-4 px-2 h-[500px] overflow-auto">
                    <div className="grid gap-2 grid-cols-3">
                        { userTags ?  
                            (formatTimeslot().length > 0 ? 
                                formatTimeslot() : 
                                (<Label className="font-medium text-lg italic text-gray-500">No timeslots for this date</Label>)) :
                            (admin && timeslots && timeslots.length > 0 ? timeslots
                                .sort((a, b) => a.start.getTime() - b.start.getTime())
                                .filter((timeslot) => timeslot !== undefined && timeslot.id !== undefined && timeslot.start !== undefined && timeslot.end !== undefined)
                                .map((timeslot, index) => {
                                    const selected = userEmail && userEmail === timeslot.register ? 'bg-gray-200' : ''

                                    return (
                                        <button key={index} onClick={() => {
                                            if(userEmail && userEmail === timeslot.register) {
                                                setRegisterConfirmationVisible(true)
                                                setSelectedTimeslot(timeslot)
                                            }
                                            else if(userEmail && userEmail === timeslot.register){
                                                setUnegisterConfirmationVisible(true)
                                                setSelectedTimeslot(timeslot)
                                            }
                                        }} disabled={admin || timeslot.register !== undefined} className={`${selected} rounded-lg enabled:hover:bg-gray-300`}>
                                            <SlotComponent timeslot={timeslot} displayRegister={admin ?? false} />
                                        </button>
                                    )
                            }) : (<Label className="font-medium text-lg italic text-gray-500">No timeslots for this date</Label>))}
                    </div>
                </div>
                {
                    admin ? (<></>) :
                    (
                        <div className="flex flex-col border border-gray-400 rounded-lg py-2 px-6 h-[500px] overflow-auto me-4 gap-2">
                            <span className="text-2xl underline underline-offset-4">Selected Timeslots:</span>
                            {formatRegisteredTimeslots()}
                        </div>
                    )
                }
            </div>
        )
    }

    function smallDisplay(){
        function activeControlClass(control: string) {
            if(control == activeConsole) return 'border border-black'
            return undefined
        }

        function timeslotsConsole() {
            return (
                <div className="flex flex-col px-4 w-full justify-center items-center">
                    <div className="flex flex-row gap-4">
                        <button className="border p-2 rounded-full border-black bg-white hover:bg-gray-300" onClick={() => {
                            const timeslots = Object.values(tagTimeslots)
                                .reduce((prev, cur) => [...prev, ...cur], [])
                                .map((timeslot) => new Date(timeslot.start.getFullYear(), timeslot.start.getMonth(), timeslot.start.getDate()).getTime())
                                .reduce((prev, cur) => {
                                    if(!prev.includes(cur)){
                                        prev.push(cur)
                                    }
                                    return prev
                                }, [] as number[])
                                .map((time) => new Date(time))

                            const currentTimeslotIndex = timeslots.findIndex((date) => date.getTime() === activeDate.getTime())
                            const currentDate = currentTimeslotIndex - 1 < 0 ? timeslots[timeslots.length - 1] : timeslots[currentTimeslotIndex - 1]
                            
                            setActiveDate(currentDate)
                        }} disabled={!(tagTimeslots && Object.entries(tagTimeslots).length > 0)}>
                            <HiOutlineArrowLeft className="text-xl"/>
                        </button>
                        <Dropdown color="light" label={'Date: ' + activeDate.toLocaleDateString("en-us", { timeZone: 'America/Chicago' })}>
                        {
                            tagTimeslots && Object.entries(tagTimeslots).length > 0 ? Object.entries(tagTimeslots).map(([tagId, timeslots]) => {
                                const color = userTags!.find((tag) => tag.id === tagId)!.color ?? 'black'
                                const dates = timeslots
                                    .map((timeslot) => new Date(timeslot.start.getFullYear(), timeslot.start.getMonth(), timeslot.start.getDate()).getTime())
                                    .reduce((prev, cur) => {
                                        if(!prev.includes(cur)) {
                                            prev.push(cur)
                                        }
                                        return prev
                                    }, [] as number[])
                                    .sort((a, b) => a - b)
                                    .map((time) => new Date(time))
                                const objects = dates.map((date, index) => {
                                    return (
                                        <Dropdown.Item key={index} className={`text-${color}`} onClick={() => setActiveDate(date)}>{date.toLocaleDateString("en-us", { timeZone: 'America/Chicago' })}</Dropdown.Item>
                                    )
                                })
                                return objects
                            }) : (<Dropdown.Item>No Dates available</Dropdown.Item>)
                        }
                        </Dropdown>
                        <button className="border p-2 rounded-full border-black bg-white hover:bg-gray-300" onClick={() => {
                            const timeslots = Object.values(tagTimeslots)
                                .reduce((prev, cur) => [...prev, ...cur], [])
                                .map((timeslot) => new Date(timeslot.start.getFullYear(), timeslot.start.getMonth(), timeslot.start.getDate()).getTime())
                                .reduce((prev, cur) => {
                                    if(!prev.includes(cur)){
                                        prev.push(cur)
                                    }
                                    return prev
                                }, [] as number[])
                                .map((time) => new Date(time))

                            const currentTimeslotIndex = timeslots.findIndex((date) => date.getTime() === activeDate.getTime())
                            const currentDate = currentTimeslotIndex + 1 >= timeslots.length ? timeslots[0] : timeslots[currentTimeslotIndex + 1]
                            
                            setActiveDate(currentDate)
                        }} disabled={!(tagTimeslots && Object.entries(tagTimeslots).length > 0)}>
                            <HiOutlineArrowRight className="text-xl"/>
                        </button>
                    </div>
                    
                    <div className={`grid ${width > 600 ? 'grid-cols-2' : 'grid-cols-1'} border-gray-500 border rounded-lg px-4 py-2 w-full my-4 items-center justify-center gap-4`}>
                        {(formatTimeslot().length > 0 ? 
                            (
                                formatTimeslot()
                            ) : 
                            (
                                <Label className="font-medium text-lg italic text-gray-500">No timeslots for this date</Label>
                            )
                        )}
                    </div>
                </div>
                
            )
        }

        function myTimeslotsConsole() {
            return (
                <div className="grid w-full px-4">
                    <div className={`grid ${width > 600 && formatRegisteredTimeslots().length > 0 ? 'grid-cols-2' : 'grid-cols-1'} border-gray-500 border rounded-lg px-4 py-2 w-full my-4 items-center justify-center gap-4`}>
                        {formatRegisteredTimeslots().length > 0 ? (
                            formatRegisteredTimeslots().map((element) => {
                                return (
                                    <div className="border border-gray-300 rounded-lg px-4 py-2">
                                        {element}
                                    </div>
                                )
                            })
                        ) : (
                            <Label className="font-medium text-lg italic text-gray-500">You will see your timeslot here after you register!</Label>
                        )}
                    </div>
                </div>
                
            )
        }

        return (
            <>
                <div className="flex flex-col border-t border-gray-500 mt-4 font-main justify-center items-center">
                    <div className="flex flex-row gap-4 my-4">
                        <ButtonGroup outline>
                            <Button color="light" className={activeControlClass('myTimeslots')} onClick={() => setActiveConsole('myTimeslots')}>My Timeslots</Button>
                            <Button color="light" className={activeControlClass('timeslots')} onClick={() => setActiveConsole('timeslots')}>View Timeslots</Button>
                        </ButtonGroup>
                    </div>
                    {activeConsole == 'timeslots' ? 
                        (
                            timeslotsConsole()
                        ) : (
                            myTimeslotsConsole()
                        )
                    }
                </div>
            </>
        )
    }

    function notificationComponent(email?: string){
        return (
            <button className="flex flex-row gap-2 text-left items-center mt-4 ms-2" onClick={() => setNotify(!notify)} type="button">
                <Checkbox className="mt-1" checked={notify} readOnly />
                <span>Send a confirmation email to <span className="italic">{email}</span></span>
            </button>
        )
    }


    return (
        <>
            <CreateTimeslotModal open={createTimeslotVisible} onClose={async () => {
                const timeslots = (await client.models.Timeslot.list({ filter: {
                    start: { contains: activeDate.toISOString().substring(0, activeDate.toISOString().indexOf('T')) }
                }})).data.map((timeslot) => {
                    if(timeslot === undefined || timeslot.id === undefined || timeslot.start === undefined || timeslot.end === undefined) return undefined
                    const ts: Timeslot = {
                        id: timeslot.id as string,
                        register: timeslot.register ?? undefined,
                        start: new Date(timeslot.start),
                        end: new Date(timeslot.end),
                    }
                    return ts
                }).filter((timeslot) => timeslot !== undefined)

                setUpdatingTimeslot(timeslots.length > 0)
                setCreateTimeslotVisible(false)
                setTimeslots(timeslots)
            }} day={activeDate} update={updatingTimeslot} />
            <ConfirmationModal open={registerConfirmationVisible} onClose={() => setRegisterConfirmationVisible(false)} 
                confirmText="Schedule"
                denyText="Back"
                confirmAction={async () => {
                    if(selectedTimeslot && userEmail && participantId && userTags) {
                        const timeslot = await client.models.Timeslot.get({id: selectedTimeslot.id})
                        if(timeslot.data?.register || timeslot.data?.participantId){
                            console.error('Timeslot has been filled')
                        }
                        await client.models.Timeslot.update({
                            id: selectedTimeslot.id,
                            register: userEmail,
                            participantId: participantId
                        }, { authMode: 'userPool'})

                        if(notify && userEmail) {
                            client.queries.SendTimeslotConfirmation({
                                email: userEmail,
                                start: selectedTimeslot.start.toISOString(),
                                end: selectedTimeslot.end.toISOString()
                            }, {
                                authMode: 'userPool'
                            })
                        }

                        await userFetchTimeslots(userTags, userEmail)
                    }
                }}
                children={notificationComponent(userEmail)}
                title="Confirm Timeslot Selection" body={`<b>Registration for Timeslot: ${selectedTimeslot?.start.toLocaleDateString("en-us", { timeZone: 'America/Chicago' })} at ${formatTime(selectedTimeslot?.start, {timeString: true})} - ${formatTime(selectedTimeslot?.end, {timeString: true})}.</b>\nMake sure that this is the right timeslot for you, since you only have one!\nRescheduling is only allowed up until one day in advance.`}/>
            <ConfirmationModal open={unregisterConfirmationVisible} onClose={() => setUnegisterConfirmationVisible(false)}
                confirmText="Confirm"
                denyText="Back"
                confirmAction={async () => {
                    if(selectedTimeslot && userEmail && participantId && userTags) {
                        await client.models.Timeslot.update({
                            id: selectedTimeslot.id,
                            register: null,
                            participantId: null,
                        }, { authMode: 'userPool'})

                        await userFetchTimeslots(userTags, userEmail)
                    }
                }}
                title="Confirm Unregistration" body={`<b>Unregistration for Timeslot: ${selectedTimeslot?.start.toLocaleDateString("en-us", { timeZone: 'America/Chicago' })} at ${formatTime(selectedTimeslot?.start, {timeString: true})} - ${formatTime(selectedTimeslot?.end, {timeString: true})}.</b>\nAre you sure you want to unregister from this timeslot?`} />
            {
                width > 1200 ? (
                    fullSizeDisplay()
                ) : (smallDisplay())
            }
        </>
    )
}