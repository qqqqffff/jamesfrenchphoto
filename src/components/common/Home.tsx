import { useEffect, useState } from "react";
import { Alert, Carousel } from "flowbite-react";
import { HiOutlineArrowLeft, HiOutlineArrowRight } from "react-icons/hi";



export default function () {
    const [notification, setNotification] = useState((<></>))
    
    useEffect(() => {
        if(history.state && history.state.usr){
            let components = []
            if(history.state.usr.contactSuccess){
                components.push(notificationComponent('Successfully sent message. Please allow time for a teammember to review your message!', 'green'))
            }
            if(history.state.usr.logoutSuccess){
                components.push(notificationComponent('Successfully logged out!', 'green'))
            }
            setNotification((<>{components.map((element, index) => <div key={index}>{element}</div>)}</>))
        }
    }, [])
    setTimeout(() => {
        setNotification((<></>))
    }, 10_000)

    

    const notificationComponent = (text: string, color: string) => {
        return (
            <div className="flex justify-center items-center font-main mb-4">
                <Alert color={color} className="text-lg w-[90%]" onDismiss={() => {setNotification((<></>))}}>
                    <p>{text}</p>
                </Alert>
            </div>
        )
    }

    return (
        <>
            {notification}
            <div className="flex justify-center items-center">
                <div className="h-[600px] w-[75%] min-h-[600px]">
                    <Carousel
                        slideInterval={5000}
                        leftControl={
                            <div className="border p-2 rounded-full border-black">
                                <HiOutlineArrowLeft className="text-xl"/>
                            </div>
                        }
                        rightControl={
                            <div className="border p-2 rounded-full border-black">
                                <HiOutlineArrowRight className="text-xl"/>
                            </div>
                        }
                        className="border-2 border-black rounded-lg"
                    >
                        <div className="flex h-full items-center justify-center bg-gray-400">1</div>
                        <div className="flex h-full items-center justify-center bg-gray-400">2</div>
                        <div className="flex h-full items-center justify-center bg-gray-400">3</div>
                    </Carousel>
                </div>
            </div>
        </>
        
    )
}