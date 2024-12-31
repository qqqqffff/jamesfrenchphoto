import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "flowbite-react";
import { 
    HiOutlineCalendar,
    // HiOutlineChat, 
    HiOutlineClipboardList, 
    HiOutlineDocumentText, 
    HiOutlineUserCircle
 } from "react-icons/hi";
import { UserStorage } from "../../types";
import UserManagement from "./UserManagement";
import CollectionManager from "./CollectionManager";
import PackageManager from "./PackageManager";
import { Scheduler } from "./Scheduler";

export const Dashboard = () => {
    const [user, setUser] = useState<UserStorage>()
    const [activeConsole, setActiveConsole] = useState('collectionManager')
    const navigate = useNavigate()
    useEffect(() => {
        if(!user){
            if(!window.localStorage.getItem('user')){
                navigate('/login')
            }
            else{
                const tempUser: UserStorage = JSON.parse(window.localStorage.getItem('user')!);
                if(!tempUser.groups.includes('ADMINS')){
                    navigate('/client/dashboard')
                }
                setUser(tempUser)
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

    function activeConsoleClassName(console: string){
        if(console == activeConsole){
            return 'border border-black';
        }
        return ''
    }

    function activeConsoleComponent(){
        switch(activeConsole){
            case 'scheduler': 
                // return (<TimeslotComponent admin/>)
                return (<Scheduler />)
            case 'collectionManager':
                return (<CollectionManager />)
            case 'userManagement':
                return (<UserManagement />)
            case 'packageManager':
                return (<PackageManager />)
            default:
                return (<>Click a console to get started</>)
        }
    }

    
    return (
        <>
            <div className="flex flex-col items-center justify-center font-main">
                <p className="font-semibold text-3xl mb-4">Welcome {structureFullname()}</p>
                <p className="font-medium text-xl mb-1">Management Consoles:</p>
                <Button.Group outline>
                    <Button color='gray' onClick={() => setActiveConsole('scheduler')} className={activeConsoleClassName('scheduler')}>
                        <HiOutlineCalendar className="mt-1 me-1"/> Scheduler
                    </Button>
                    <Button color='gray' onClick={() => setActiveConsole('collectionManager')} className={activeConsoleClassName('collectionManager')}>
                        <HiOutlineClipboardList className="mt-1 me-1"/> Collection Manager
                    </Button>
                    {/* <Button color='gray' onClick={() => setActiveConsole('notificationCenter')} className={activeConsoleClassName('notificationCenter')}>
                        <HiOutlineChat className="mt-1 me-1"/> Notification Center
                    </Button> */}
                    <Button color='gray' onClick={() => setActiveConsole('packageManager')} className={activeConsoleClassName('packageManager')}>
                        <HiOutlineDocumentText className="mt-1 me-1"/> Package Manager
                    </Button>
                    <Button color='gray' onClick={() => setActiveConsole('userManagement')} className={activeConsoleClassName('userManagement')}>
                        <HiOutlineUserCircle className="mt-1 me-1"/> User Management
                    </Button>
                    {/* <Button color='gray' onClick={() => navigate('/client/dashboard')}>
                        <HiOutlineUserCircle className="mt-1 me-1"/> User View
                    </Button> */}
                </Button.Group>
            </div>
            {activeConsoleComponent()}
        </>
    )
}