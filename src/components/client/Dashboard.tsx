import { useEffect, useState } from "react";
import { Timeslot, UserProfile, UserStorage, UserTag } from "../../types";
import { Badge, Button } from "flowbite-react";
import { HiOutlineCalendar, HiOutlineClipboardList, HiOutlineChat, HiOutlineDocumentText, HiOutlinePlusCircle } from "react-icons/hi";
import { NavigateFunction, useNavigate } from "react-router-dom";
import { HiArrowUturnLeft, HiOutlineHome } from "react-icons/hi2";
import { Home } from "./Home";
import { badgeColorThemeMap } from "../../utils";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import { TimeslotComponent } from "../timeslot/Timeslot";

const client = generateClient<Schema>()

function returnToAdminConsoleComponent(adminView: boolean, navigate: NavigateFunction){
    if(adminView){
        return (
            <Button color='gray' onClick={() => navigate('/admin/dashboard')}>
                <HiArrowUturnLeft className="mt-1 me-1"/> Return to Admin View
            </Button>
        )
    }
    return (<></>)
}

function addClassComponent(adminView: boolean){
    if(adminView){
        return (<Badge color='gray' onClick={() => console.log('hello world')} icon={HiOutlinePlusCircle} size='md' />)
    }
    return (<></>)
}

export function Dashboard() {
    const [user, setUser] = useState<UserStorage>()
    const [adminView, setAdminView] = useState(false)
    const [activeConsole, setActiveConsole] = useState('home')
    const [userProfile, setUserProfile] = useState<UserProfile | undefined>()
    const [userProfileTags, setUserProfileTags] = useState<UserTag[]>([])
    const [apiCall, setApiCall] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        async function api(){
            let tempUser: UserStorage | undefined
            if(!user){
                if(!window.localStorage.getItem('user')){
                    navigate('/client')
                    return
                }
                else{
                    tempUser = JSON.parse(window.localStorage.getItem('user')!);
                }
            }

            if(!tempUser){
                navigate('/client')
                return
            }

            
            const resp = (await client.models.UserProfile.get({ email: tempUser.attributes.email! }))
            const getProfileResponse = resp.data
            console.log(resp)
            if(!getProfileResponse){
                // navigate('/logout', {
                //     state: {
                //         NoProfile: true
                //     }
                // })
                setApiCall(true)
                return
            }
            const getProfileTimeslot = (await getProfileResponse.timeslot()).data
            const profileTimeslot: Timeslot | undefined = getProfileTimeslot ? {
                id: getProfileTimeslot.id,
                register: getProfileTimeslot.register ?? undefined,
                start: new Date(getProfileTimeslot.start),
                end: new Date(getProfileTimeslot.end),
            } as Timeslot : undefined

            let profile: UserProfile = {
                ...getProfileResponse,
                userTags: getProfileResponse.userTags ? getProfileResponse.userTags as string[] : [],
                timeslot: profileTimeslot,
                participantMiddleName: getProfileResponse.participantMiddleName ?? undefined,
                participantPreferredName: getProfileResponse.participantPreferredName ?? undefined,
                preferredContact: getProfileResponse.preferredContact ?? 'EMAIL',
                participantContact: getProfileResponse.participantContact ?? true
            }

            console.log(profile)
            
            //get user tags
            const userTags = (await client.models.UserTag.list()).data
            const userTagIds = userTags.map((tag) => tag.id)
            const filteredUserTags = profile.userTags.filter((tag) => userTagIds.includes(tag))

            //validating tags
            if(filteredUserTags.length < profile.userTags.length){
                console.log(filteredUserTags, profile.userTags, userTagIds)
                const response = (await client.models.UserProfile.update({
                    email: profile.email,
                    userTags: filteredUserTags
                })).data

                if(!response){
                    // navigate('/logout', {
                    //     state: {
                    //         NoProfile: true
                    //     }
                    // })
                    setApiCall(true)
                    return
                }

                const getResponseTimeslot = (await response.timeslot()).data
                const responseTimeslot: Timeslot | undefined = getResponseTimeslot ? {
                    id: getResponseTimeslot.id,
                    register: getResponseTimeslot.register ?? undefined,
                    start: new Date(getResponseTimeslot.start),
                    end: new Date(getResponseTimeslot.end),
                } as Timeslot : undefined

                profile = {
                    ...response,
                    userTags: response.userTags ? response.userTags as string[] : [],
                    timeslot: responseTimeslot,
                    participantMiddleName: response.participantMiddleName ?? undefined,
                    participantPreferredName: response.participantPreferredName ?? undefined,
                    preferredContact: response.preferredContact ?? 'EMAIL',
                    participantContact: response.participantContact ?? true
                }
                console.log(response, profile)
            }

            //secondary indexing
            const userProfileTags = await Promise.all(profile.userTags.map(async (tag) => {
                const response = (await client.models.UserTag.get({id: tag})).data!
                return {
                    ...response,
                    color: response.color ? response.color : undefined,
                    collectionId: response.collectionId ? response.collectionId : undefined
                }
            }))
            console.log(userProfileTags)

            setUserProfileTags(userProfileTags)
            setUserProfile(profile)
            setUser(tempUser)
            setAdminView(tempUser.groups.includes('ADMINS'))
            setApiCall(true)
        }

        if(!apiCall){
            api()
        }
    }, [])

    function structureFullname(){
        if(user)
            return  user.attributes.given_name + ' ' + user.attributes.family_name
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
        switch(activeConsole){
            case 'home':
                return (<Home user={user!}/>)
            case 'scheduler':
                return (<TimeslotComponent userEmail={userProfile?.email} userTags={userProfileTags}/>)
            default:
                return (<></>)
        }
    }
    return (
        <>
            <div className="flex flex-col items-center justify-center font-main">
                <p className="font-semibold text-3xl mb-4">Welcome {structureFullname()}</p>
                <div className="flex flex-row gap-2 items-center mb-4">
                    {
                        userProfileTags.map((tag, index) => {
                            return (<Badge theme={badgeColorThemeMap} color={tag.color ? tag.color : 'light'} key={index} className="py-1 text-md">{tag.name}</Badge>)
                        })
                    }
                    {addClassComponent(adminView)}
                </div>
                <p className="font-medium text-xl mb-1">Quick Actions:</p>
                <Button.Group outline>
                    <Button color='gray' onClick={() => setActiveConsole('home')} className={activeConsoleClassName('home')}>
                        <HiOutlineHome className="mt-1 me-1"/>Home
                    </Button>
                    <Button color='gray' onClick={() => setActiveConsole('scheduler')} className={activeConsoleClassName('scheduler')}>
                        <HiOutlineCalendar className="mt-1 me-1"/>Scheduler
                    </Button>
                    <Button color='gray' onClick={() => setActiveConsole('checklist')} className={activeConsoleClassName('checklist')}>
                        <HiOutlineClipboardList className="mt-1 me-1"/>Checklist
                    </Button>
                    <Button color='gray' onClick={() => setActiveConsole('notifications')} className={activeConsoleClassName('notifications')}>
                        <HiOutlineChat className="mt-1 me-1"/>Notifications
                    </Button>
                    <Button color='gray' onClick={() => setActiveConsole('packageInfo')} className={activeConsoleClassName('packageInfo')}>
                        <HiOutlineDocumentText className="mt-1 me-1"/>Package Info
                    </Button>
                    
                    {returnToAdminConsoleComponent(adminView, navigate)}
                </Button.Group>
            </div>
            {activeConsoleComponent()}
        </>
    )
}