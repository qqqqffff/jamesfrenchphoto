import { useEffect, useState } from "react";
import { UserProfile, UserStorage, UserTag } from "../../types";
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

    console.log(userProfile)
    const navigate = useNavigate()
    useEffect(() => {
        // console.log(client.models.PhotoPaths.listPhotoPathsByCollectionId({collectionId: "e2606167-0002-4503-a001-dff283705f51"}))
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

            
            const getProfileResponse = (await client.models.UserProfile.get({email: tempUser.attributes.email!})).data
            let profile: UserProfile | null = getProfileResponse ? {
                ...getProfileResponse,
                userTags: getProfileResponse.userTags ? getProfileResponse.userTags as string[] : [],
                preferredName: getProfileResponse.preferredName ? getProfileResponse.preferredName : undefined
            } : null
            if(!profile){
                const response = await client.models.UserProfile.create({
                    email: tempUser.attributes.email!
                })
                profile = {
                    email: response.data!.email,
                    userTags: [],
                }
            }

            console.log(profile)
            
            //get user tags
            const userTags = (await client.models.UserTag.list()).data
            const userTagIds = userTags.map((tag) => tag.id)
            const filteredUserTags = profile.userTags.filter((tag) => userTagIds.includes(tag))

            //validating tags
            if(filteredUserTags.length < profile.userTags.length){
                console.log(filteredUserTags, profile.userTags, userTagIds)
                const response = await client.models.UserProfile.update({
                    email: profile.email,
                    userTags: filteredUserTags
                })
                profile = {
                    email: response.data!.email,
                    userTags: response.data!.userTags ? response.data!.userTags as string[] : [],
                    preferredName: response.data!.preferredName ? response.data!.preferredName : undefined
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