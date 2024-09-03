import { useEffect, useState } from "react";
import { UserStorage } from "../../types";
import { Badge, Button } from "flowbite-react";
import { HiOutlineCalendar, HiOutlineClipboardList, HiOutlineChat, HiOutlineDocumentText } from "react-icons/hi";
import { useNavigate } from "react-router-dom";

export const Dashboard = () => {
    const [user, setUser] = useState<UserStorage>()
    const navigate = useNavigate()
    useEffect(() => {
        if(!user){
            if(!window.localStorage.getItem('user')){
                navigate('/client')
            }
            else{
                setUser(JSON.parse(window.localStorage.getItem('user')!))
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
    return (
        <>
            <div className="flex flex-col items-center justify-center font-main">
                <p className="font-semibold text-3xl mb-4">Welcome {structureFullname()}</p>
                <div className="flex flex-row gap-2 items-center mb-10">
                    {/* TODO: replace me with dynamically piped information*/}
                    <Badge color='blue' className="py-1 text-md">TRF Princess Debutante 2024</Badge>
                </div>
                <p className="font-medium text-xl mb-1">Quick Actions:</p>
                <Button.Group outline>
                    <Button color='gray'>
                        <HiOutlineCalendar className="mt-1 me-1"/> Schedule
                    </Button>
                    <Button color='gray'>
                        <HiOutlineClipboardList className="mt-1 me-1"/> Checklist
                    </Button>
                    <Button color='gray'>
                        <HiOutlineChat className="mt-1 me-1"/> Notifications
                    </Button>
                    <Button color='gray'>
                        <HiOutlineDocumentText className="mt-1 me-1"/> Package Info
                    </Button>
                </Button.Group>
            </div>
        </>
    )
}