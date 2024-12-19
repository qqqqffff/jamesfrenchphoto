import { useEffect, useState } from "react";
import { Participant, PhotoCollection, Timeslot, UserProfile, UserStorage, UserTag } from "../../types";
import { Badge, Button } from "flowbite-react";
import { 
    HiOutlineCalendar, 
    // HiOutlineClipboardList, 
    // HiOutlineChat, 
    // HiOutlineDocumentText, 
    HiOutlinePlusCircle 
} from "react-icons/hi";
import { useNavigate, useRouteLoaderData } from "react-router-dom";
import { HiOutlineHome } from "react-icons/hi2";
import { Home } from "./Home";
import { badgeColorThemeMap } from "../../utils";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import { TimeslotComponent } from "../timeslot/Timeslot";
import { createParticipantFromUserProfile, fetchUserProfile } from "../../App";

const client = generateClient<Schema>()

// function returnToAdminConsoleComponent(adminView: boolean, navigate: NavigateFunction){
//     if(adminView){
//         return (
//             <Button color='gray' onClick={() => navigate('/admin/dashboard')}>
//                 <HiArrowUturnLeft className="mt-1 me-1"/> Return to Admin View
//             </Button>
//         )
//     }
//     return (<></>)
// }

function addClassComponent(adminView: boolean){
    if(adminView){
        return (<Badge color='gray' icon={HiOutlinePlusCircle} size='md' />)
    }
    return (<></>)
}

export function Dashboard() {
    const [userProfile, setUserProfile] = useState(useRouteLoaderData("/") as UserProfile | null)
    const [activeConsole, setActiveConsole] = useState('home')
    const [userProfileTags, setUserProfileTags] = useState<UserTag[]>([])
    const [schedulerEnabled, setSchedulerEnabled] = useState(false)
    const [apiCall, setApiCall] = useState(false)
    const navigate = useNavigate()

    const user = window.localStorage.getItem('user') !== null ? JSON.parse(window.localStorage.getItem('user')!) as UserStorage : undefined
    const adminView = user?.groups.includes('ADMINS') ?? false

    

    useEffect(() => {
        //set subscription
        const profileSubscription = client.models.UserProfile.onUpdate({
            filter: {
                email: {
                    eq: userProfile?.email
                }
            }
        }).subscribe({
            next: async (item) => {
                if(item){
                    const participantResponse = await item.participant()
                    const participants: Participant[] = []
                    let timeslot: Timeslot[] = []
                    
                    //try to create a participant from the details
              
                    if(participantResponse.data.length == 0 && item.participantFirstName && item.participantLastName){
                      //timeslots
                      const timeslotResponse = await item.timeslot()
                      timeslot = timeslotResponse ? (await Promise.all(timeslotResponse.data.map(async (timeslot) => {
                        if(!timeslot.id) return
                        let tag: UserTag | undefined
                        const tsTagResponse = await timeslot.timeslotTag()
                        if(tsTagResponse && tsTagResponse.data) {
                            const tagResponse = await tsTagResponse.data.tag()
                            if(tagResponse && tagResponse.data){
                                tag = {
                                    ...tagResponse.data,
                                    color: tagResponse.data.color ?? undefined,
                                }
                            }
                        }
                        const ts: Timeslot = {
                          ...timeslot,
                          id: timeslot.id,
                          register: timeslot.register ?? undefined,
                          tag: tag,
                          start: new Date(timeslot.start),
                          end: new Date(timeslot.end),
                          participant: undefined
                        }
                        return ts
                      }))).filter((timeslot) => timeslot !== undefined) : []
              
                      //create
                      const createdParticipant = await createParticipantFromUserProfile({
                        ...item,
                        participantFirstName: item.participantFirstName,
                        participantLastName: item.participantFirstName,
                        participantMiddleName: item.participantMiddleName ?? undefined,
                        participantPreferredName: item.participantPreferredName ?? undefined,
                        participantContact: item.participantContact ?? false,
                        participantEmail: item.participantEmail ?? undefined,
                        //unecessary fields
                        participant: [],
                        activeParticipant: undefined,
                        userTags: [],
                        timeslot: [],
                        preferredContact: item.preferredContact ?? 'EMAIL',
                      }, timeslot, true)
              
                      //on success
                      if(createdParticipant) {
                        participants.push(createdParticipant)
                        //update timeslots
                        await Promise.all(timeslot.map((timeslot) => {
                          return client.models.Timeslot.update({
                            id: timeslot.id,
                            participantId: createdParticipant.id
                          })
                        }))
                      }
                    }
                    else if(participantResponse.data.length > 0){
                      const parts: Participant[] = participantResponse ? (await Promise.all(participantResponse.data.map(async (participant) => {
                        if(!participant.id) return

                        //tags
                        const userTags: UserTag[] = participant.userTags ? (await Promise.all((participant.userTags as string[]).map(async (tag) => {
                            if(!tag) return
                            const tagResponse = await client.models.UserTag.get({ id: tag })
                            if(!tagResponse || !tagResponse.data || !tagResponse.data.id) return
                
                            //collection
                            const collectionTagResponse = await tagResponse.data.collectionTags()
                            const collections: PhotoCollection[] = []
                            if(collectionTagResponse && collectionTagResponse.data && collectionTagResponse.data.length > 0){
                              collections.push(...(await Promise.all(collectionTagResponse.data.map(async (colTag) => {
                                const photoCollection = await colTag.collection()
                                if(!photoCollection || !photoCollection.data) return
                                const col: PhotoCollection = {
                                    ...photoCollection.data,
                                    coverPath: photoCollection.data.coverPath ?? undefined,
                                    paths: [], //TODO: fix me,
                                    tags: [], //TODO: fix me
                                    downloadable: photoCollection.data.downloadable ?? false, 
                                    watermarkPath: photoCollection.data.watermarkPath ?? undefined,
                                }
                                return col
                              }))).filter((collection) => collection !== undefined))
                            }
                
                            const userTag: UserTag = {
                              ...tagResponse.data,
                              color: tagResponse.data.color ?? undefined,
                              collections: collections
                            }
                
                            return userTag
                          }))).filter((tag) => tag !== undefined) : []
              
                        //timeslots
                        const timeslotResponse = await participant.timeslot()
                        const timeslot: Timeslot[] = timeslotResponse ? (await Promise.all(timeslotResponse.data.map(async (timeslot) => {
                          if(!timeslot.id) return
                          const tagId = (await timeslot.timeslotTag()).data?.tagId

                          const ts: Timeslot = {
                            ...timeslot,
                            id: timeslot.id,
                            register: timeslot.register ?? undefined,
                            tag: userTags.find((tag) => tag.id == tagId),
                            start: new Date(timeslot.start),
                            end: new Date(timeslot.end),
                            participant: undefined
                          }
                          return ts
                        }))).filter((timeslot) => timeslot !== undefined) : []
              
                        
              
                        //all together
                        const part: Participant = {
                          ...participant,
                          timeslot: timeslot,
                          userTags: userTags,
                          middleName: participant.middleName ?? undefined,
                          preferredName: participant.preferredName ?? undefined,
                          email: participant.email ?? undefined,
                          contact: participant.contact ?? false,
                        }
                        return part
                      }))).filter((participant) => participant !== undefined) : []
              
                      participants.push(...parts)
                    }
              
                    const userProfile: UserProfile = {
                      ...item,
                      participant: participants,
                      activeParticipant: participants.find((participant) => participant.id === item?.activeParticipant) ?? (participants.length > 0 ? participants[0] : undefined),
                      userTags: item.userTags ? item.userTags as string[] : [],
                      timeslot: timeslot,
                      participantFirstName: item.participantFirstName ?? undefined,
                      participantLastName: item.participantFirstName ?? undefined,
                      participantMiddleName: item.participantMiddleName ?? undefined,
                      participantPreferredName: item.participantPreferredName ?? undefined,
                      participantContact: item.participantContact ?? false,
                      participantEmail: item.participantEmail ?? undefined,
                      preferredContact: item.preferredContact ?? 'EMAIL',
                    }

                    let schedulerEnabled = false
                    const userTags: UserTag[] = (await Promise.all((userProfile.activeParticipant ? userProfile.activeParticipant.userTags : []).map(async (tag) => {
                        //secondary indexing to enable scheduler
                        const secondaryIndex = (await client.models.TimeslotTag.listTimeslotTagByTagId({tagId: tag.id})).data
                        schedulerEnabled = schedulerEnabled ? schedulerEnabled : secondaryIndex.filter((item) => item !== null && item !== undefined).length > 0
                        return tag
                    }))) 

                    setSchedulerEnabled(schedulerEnabled)
                    setUserProfile(userProfile)
                    setUserProfileTags(userTags)
                }
            }
        })

        async function api(){
            let schedulerEnabled = false
            let tempUserProfile = userProfile
            let userProfileTags: UserTag[] = []
            if(tempUserProfile === null){
                tempUserProfile = await fetchUserProfile(user)
            }
            
            if(tempUserProfile !== null){
                const userTags = tempUserProfile.activeParticipant ? tempUserProfile.activeParticipant.userTags : tempUserProfile.userTags

                if(userTags == undefined || userTags.length <= 0) return
                userProfileTags.push(...(tempUserProfile ? 
                    (tempUserProfile.activeParticipant?.userTags && tempUserProfile.activeParticipant.userTags.length > 0 ? 
                        (await Promise.all(tempUserProfile.activeParticipant.userTags.map(async (tag) => {
                            //secondary indexing to enable scheduler
                            const secondaryIndex = (await client.models.TimeslotTag.listTimeslotTagByTagId({tagId: tag.id})).data
                            schedulerEnabled = schedulerEnabled ? schedulerEnabled : secondaryIndex.filter((item) => item !== null && item !== undefined).length > 0
                            return tag
                        }))) 
                        :
                        (await Promise.all(tempUserProfile.userTags.map(async (tag) => {
                            //secondary indexing to enable scheduler
                            const secondaryIndex = (await client.models.TimeslotTag.listTimeslotTagByTagId({tagId: tag})).data
                            schedulerEnabled = schedulerEnabled ? schedulerEnabled : secondaryIndex.filter((item) => item !== null && item !== undefined).length > 0
                            
                            const response = (await client.models.UserTag.get({id: tag})).data
                            if(!response) return
                            const userTag: UserTag = {
                                ...response,
                                color: response.color ?? undefined,
                                collections: (await Promise.all((await response.collectionTags()).data.map(async (item) => {
                                    if(item === undefined) return
                                    const collectionData = (await item.collection()).data
                                    if(collectionData === null) return
                                    const collection: PhotoCollection = {
                                        ...collectionData,
                                        coverPath: collectionData.coverPath ?? undefined,
                                        tags: [], //TODO: fix me
                                        paths: [], //TODO: fix me
                                        downloadable: collectionData.downloadable ?? false, 
                                        watermarkPath: collectionData.watermarkPath ?? undefined,
                                    }
                                    return collection
                                }))).filter((item) => item !== undefined)
                            }
                            return userTag
                        }))).filter((tag) => tag !== undefined)
                    ) : []))
            }
            else{
                navigate('/client')
                return
            }
            setUserProfileTags(userProfileTags)
            setSchedulerEnabled(schedulerEnabled)
            setUserProfile(tempUserProfile)
            setApiCall(true)
        }

        if(!apiCall){
            api()
        }

        return () => {
            profileSubscription.unsubscribe()
        }
    }, [userProfile])

    function structureFullname(){
        if(userProfile)
            return  (
                userProfile.activeParticipant ? (
                    `${userProfile.activeParticipant.preferredName ? userProfile.activeParticipant.preferredName : userProfile.activeParticipant.firstName} ${userProfile.activeParticipant.lastName}`
                ) : (
                    userProfile.participantFirstName && userProfile.participantFirstName ? (
                        `${userProfile.participantPreferredName ? userProfile.participantPreferredName : userProfile.participantFirstName} ${userProfile.participantLastName}`
                    ) : (
                        'Error'
                    )
                )
            )
        else{
            return 'Loading...'
        }
    }
    

    function activeConsoleClassName(console: string){
        if(console == activeConsole){
            return 'border border-black';
        }
        return ''
    }

    function activeConsoleComponent(){
        if(userProfile && userProfile.activeParticipant){
            switch(activeConsole){
                case 'home':
                    return (<Home user={userProfile!} tags={userProfileTags} />)
                case 'scheduler':
                    return (<TimeslotComponent participantId={userProfile!.activeParticipant?.id} userEmail={userProfile!.email} userTags={userProfile!.activeParticipant?.userTags}/>)
                default:
                    return (<></>)
            }
        } else {
            return (<></>)
        }
        
    }
    return (
        <>
            <div className="flex flex-col items-center justify-center font-main">
                <p className="font-semibold text-3xl mb-4 text-center">Welcome {structureFullname()}</p>
                <div className="flex flex-row gap-2 items-center mb-4">
                    {
                        userProfileTags.map((tag, index) => {
                            return (<Badge theme={badgeColorThemeMap} color={tag.color ? tag.color : 'light'} key={index} className="py-1 text-md">{tag.name}</Badge>)
                        })
                    }
                    {addClassComponent(adminView)}
                </div>
                <p className="font-medium text-xl mb-1">Quick Actions:</p>
                <Button.Group>
                    <Button color='gray' onClick={() => setActiveConsole('home')} className={activeConsoleClassName('home')}>
                        <HiOutlineHome className="mt-1 me-1"/>Home
                    </Button>
                    {schedulerEnabled ? (<Button color='gray' onClick={() => setActiveConsole('scheduler')} className={activeConsoleClassName('scheduler')}>
                        <HiOutlineCalendar className="mt-1 me-1"/>Scheduler
                    </Button>) : (<></>)}
                    {/* <Button color='gray' onClick={() => setActiveConsole('checklist')} className={activeConsoleClassName('checklist')}>
                        <HiOutlineClipboardList className="mt-1 me-1"/>Checklist
                    </Button>
                    <Button color='gray' onClick={() => setActiveConsole('notifications')} className={activeConsoleClassName('notifications')}>
                        <HiOutlineChat className="mt-1 me-1"/>Notifications
                    </Button>
                    <Button color='gray' onClick={() => setActiveConsole('packageInfo')} className={activeConsoleClassName('packageInfo')}>
                        <HiOutlineDocumentText className="mt-1 me-1"/>Package Info
                    </Button> */}
                    
                    {/* {adminView ? returnToAdminConsoleComponent(adminView, navigate) : undefined} */}
                </Button.Group>
            </div>
            {activeConsoleComponent()}
        </>
    )
}