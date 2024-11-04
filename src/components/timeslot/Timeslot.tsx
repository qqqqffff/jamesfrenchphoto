import { Badge, Datepicker, Dropdown, Label, Tooltip } from "flowbite-react"
import { FC, useEffect, useState } from "react"
import { ControlComponent } from "../admin/ControlPannel"
import { HiOutlinePlusCircle, HiOutlineMinusCircle } from "react-icons/hi2"
import { CreateTimeslotModal } from "../modals/CreateTimeslot"
import { Timeslot, UserTag } from "../../types"
import { generateClient } from "aws-amplify/api"
import { Schema } from "../../../amplify/data/resource"
import { SlotComponent } from "./Slot"
import { badgeColorThemeMap, currentDate, DAY_OFFSET, formatTime, GetColorComponent } from "../../utils"
import { ConfirmationModal } from "../modals/Confirmation"
import { HiOutlineInformationCircle } from "react-icons/hi"

const client = generateClient<Schema>()

interface TimeslotComponentProps {
    admin?: boolean
    userEmail?: string
    minDate?: Date
    userTags?: UserTag[]
}

interface TagTimeslots extends Record<string, Timeslot[]> {}

export const TimeslotComponent: FC<TimeslotComponentProps> = ({ admin, userEmail, minDate, userTags }) => {
    const [activeDate, setActiveDate] = useState<Date>(currentDate)
    const [timeslots, setTimeslots] = useState<Timeslot[]>([])
    const [profileTimeslots, setProfileTimeslots] = useState<TagTimeslots>({})
    const [createTimeslotVisible, setCreateTimeslotVisible] = useState(false)
    const [registerConfirmationVisible, setRegisterConfirmationVisible] = useState(false)
    const [unregisterConfirmationVisible, setUnegisterConfirmationVisible] = useState(false)
    const [selectedTimeslot, setSelectedTimeslot] = useState<Timeslot | undefined>()
    const [tagTimeslots, setTagTimeslots] = useState<TagTimeslots>({})
    const [updatingTimeslot, setUpdatingTimeslot] = useState(false)
    const [apiCall, setApiCall] = useState(false)

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

            setUpdatingTimeslot(timeslots.length > 0)
            setTimeslots(timeslots)
            setTagTimeslots(tagTimeslots)
            setProfileTimeslots(tagProfileTimeslots)
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
                            <SlotComponent timeslot={timeslot} showTags={false} displayRegister={admin ?? false} />
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
                        {`${timeslot[0].start.toLocaleDateString()}: ${timeslot[0].start.toLocaleTimeString()} - ${timeslot[0].start.toLocaleTimeString()}`}
                    </span>
                </div>
                
            )
        })
        .filter((elements) => elements !== undefined)
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

                setCreateTimeslotVisible(false)
                setTimeslots(timeslots)
            }} day={activeDate} update={updatingTimeslot} />
            <ConfirmationModal open={registerConfirmationVisible} onClose={() => setRegisterConfirmationVisible(false)} 
                confirmText="Schedule"
                denyText="Back"
                confirmAction={async () => {
                    if(selectedTimeslot && userEmail && userTags) {
                        const timeslot = await client.models.Timeslot.get({id: selectedTimeslot.id})
                        if(timeslot.data?.register){
                            throw new Error('Timeslot has been filled')
                        }
                        const response = await client.models.Timeslot.update({
                            id: selectedTimeslot.id,
                            register: userEmail
                        }, { authMode: 'userPool'})

                        console.log(response)


                        await userFetchTimeslots(userTags, userEmail)
                    }
                }}
                title="Confirm Timeslot Selection" body={`<b>Registration for Timeslot: ${selectedTimeslot?.start.toLocaleDateString()} at ${formatTime(selectedTimeslot?.start, {timeString: true})} - ${formatTime(selectedTimeslot?.end, {timeString: true})}.</b>\nMake sure that this is the right timeslot for you, since you only have one!\nRescheduling is only allowed up until one day in advance.`}/>
            <ConfirmationModal open={unregisterConfirmationVisible} onClose={() => setUnegisterConfirmationVisible(false)}
                confirmText="Confirm"
                denyText="Back"
                confirmAction={async () => {
                    if(selectedTimeslot && userEmail && userTags) {
                        const response = await client.models.Timeslot.update({
                            id: selectedTimeslot.id,
                            register: null
                        }, { authMode: 'userPool'})

                        console.log(response)

                        await userFetchTimeslots(userTags, userEmail)
                    }
                }}
                title="Confirm Unregistration" body={`<b>Unregistration for Timeslot: ${selectedTimeslot?.start.toLocaleDateString()} at ${formatTime(selectedTimeslot?.start, {timeString: true})} - ${formatTime(selectedTimeslot?.end, {timeString: true})}.</b>\nAre you sure you want to unregister from this timeslot?`} />
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
                            (<Datepicker minDate={minDate} className='mt-2' onChange={async (date) => {
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
                                    
                                    setActiveDate(date)
                                    setTimeslots(timeslots)
                                }
                            }}/>) : 
                            (
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
                                            const objects = dates.map((date) => {
                                                return (
                                                    <Dropdown.Item className={`text-${color}`} onClick={() => setActiveDate(new Date(date))}>{new Date(date).toLocaleDateString()}</Dropdown.Item>
                                                )
                                            })
                                            return objects
                                        }) : (<Dropdown.Item>No Dates available</Dropdown.Item>)
                                    }
                                </Dropdown>
                                
                            )
                    }
                    {
                        admin ? (
                            <>
                                <ControlComponent className="" name={<><HiOutlinePlusCircle size={20} className="mt-1 me-1"/>Add Timeslot</>} fn={() => setCreateTimeslotVisible(true)} type={true} disabled={activeDate.getTime() < currentDate.getTime() + DAY_OFFSET || updatingTimeslot}/>
                                <ControlComponent className="" name={<><HiOutlinePlusCircle size={20} className="mt-1 me-1"/>Update Timeslot</>} fn={() => setCreateTimeslotVisible(true)} type={true} disabled={!updatingTimeslot}/>
                                <ControlComponent name={<><HiOutlineMinusCircle size={20} className="mt-1 me-1"/>Remove Timeslot</>} fn={() => console.log('hello world')} type={true}/>
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
                                                    
                                                    const formattedDateString = sortedTimeslots[0].start.toLocaleDateString() + ' - ' + sortedTimeslots[sortedTimeslots.length - 1].start.toLocaleDateString()

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
                                            <SlotComponent timeslot={timeslot} showTags={false} displayRegister={admin ?? false} />
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
        </>
    )
}