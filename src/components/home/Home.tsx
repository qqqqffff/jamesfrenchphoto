import { useState } from "react";
import { Alert, Carousel } from "flowbite-react";
import { HiOutlineArrowLeft, HiOutlineArrowRight } from "react-icons/hi";



export default function () {
    // let successNotification = (<></>)
    // let successNotification = 
    const alertComponent = (text: string) => {
        return (
            <div className="flex justify-center items-center font-main mb-4">
                <Alert color='green' className="text-lg w-[90%]" onDismiss={() => {setSuccessNotification((<></>))}}>
                    <p>{text}</p>
                </Alert>
            </div>
        )
    }
    const [successNotification, setSuccessNotification] = useState(history.state && history.state.usr && history.state.usr.contactSuccess ? (alertComponent('Successfully sent message. Please allow time for a team member to review your request!')) : (<></>))
    setTimeout(() => {
        setSuccessNotification((<></>))
    }, 10_000)

    return (
        <>
            {successNotification}
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