import { useEffect, useState } from "react";
import { UserStorage } from "../../types";
import { Badge, Button } from "flowbite-react";
import { HiOutlineCalendar, HiOutlineClipboardList, HiOutlineChat, HiOutlineDocumentText, HiOutlinePlusCircle } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import { HiArrowUturnLeft, HiOutlineHome } from "react-icons/hi2";
import { Home } from "./Home";



export function Dashboard() {
    const [user, setUser] = useState<UserStorage>()
    const [adminView, setAdminView] = useState(false)
    const [activeConsole, setActiveConsole] = useState('home')
    const navigate = useNavigate()
    useEffect(() => {
        // console.log(client.models.PhotoPaths.listPhotoPathsByCollectionId({collectionId: "e2606167-0002-4503-a001-dff283705f51"}))
        if(!user){
            if(!window.localStorage.getItem('user')){
                navigate('/client')
            }
            else{
                const tempUser: UserStorage = JSON.parse(window.localStorage.getItem('user')!);
                setUser(tempUser)
                setAdminView(tempUser.groups.includes('ADMINS'))
            }
        }
    }, [])

    function structureFullname(){
        if(user)
            return  user.attributes.given_name + ' ' + user.attributes.family_name
        else{
            return 'Loading...'
        }
    }

    function addClassComponent(){
        if(adminView){
            return (<Badge color='gray' onClick={() => console.log('hello world')} icon={HiOutlinePlusCircle} size='md' />)
        }
        return (<></>)
    }

    function returnToAdminConsoleComponent(){
        if(adminView){
            return (
                <Button color='gray' onClick={() => navigate('/admin/dashboard')}>
                    <HiArrowUturnLeft className="mt-1 me-1"/> Return to Admin View
                </Button>
            )
        }
        return (<></>)
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
            case 'userManagement':
                // return (<UserManagement />)
            default:
                return (<></>)
        }
    }
    return (
        <>
            <div className="flex flex-col items-center justify-center font-main">
                <p className="font-semibold text-3xl mb-4">Welcome {structureFullname()}</p>
                <div className="flex flex-row gap-2 items-center mb-10">
                    {/* TODO: replace me with dynamically piped information*/}
                    <Badge color='blue' className="py-1 text-md">TRF Princess Debutante 2024</Badge>
                    {addClassComponent()}
                </div>
                <p className="font-medium text-xl mb-1">Quick Actions:</p>
                <Button.Group outline={true}>
                    <Button color='gray' onClick={() => setActiveConsole('home')} className={activeConsoleClassName('home')}>
                        <HiOutlineHome className="mt-1 me-1"/> Home
                    </Button>
                    <Button color='gray' onClick={() => setActiveConsole('schedule')} className={activeConsoleClassName('schedule')}>
                        <HiOutlineCalendar className="mt-1 me-1"/> Schedule
                    </Button>
                    <Button color='gray' onClick={() => setActiveConsole('checklist')} className={activeConsoleClassName('checklist')}>
                        <HiOutlineClipboardList className="mt-1 me-1"/> Checklist
                    </Button>
                    <Button color='gray' onClick={() => setActiveConsole('notifications')} className={activeConsoleClassName('notifications')}>
                        <HiOutlineChat className="mt-1 me-1"/> Notifications
                    </Button>
                    <Button color='gray' onClick={() => setActiveConsole('packageInfo')} className={activeConsoleClassName('packageInfo')}>
                        <HiOutlineDocumentText className="mt-1 me-1"/> Package Info
                    </Button>
                    
                    {returnToAdminConsoleComponent()}
                </Button.Group>
            </div>
            {activeConsoleComponent()}
        </>
    )
}