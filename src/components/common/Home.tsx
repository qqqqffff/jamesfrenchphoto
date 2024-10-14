import { useEffect, useState } from "react";
import { Alert, Carousel } from "flowbite-react";
import { HiOutlineArrowLeft, HiOutlineArrowRight } from "react-icons/hi";
import carousel1 from '../../assets/home-carousel/carousel-1.jpg'
import carousel2 from '../../assets/home-carousel/carousel-2.jpg'
import carousel3 from '../../assets/home-carousel/carousel-3.jpg'
import carousel4 from '../../assets/home-carousel/carousel-4.jpg'
import carousel5 from '../../assets/home-carousel/carousel-5.jpg'
import carousel6 from '../../assets/home-carousel/carousel-6.jpg'
import carousel7 from '../../assets/home-carousel/carousel-7.jpg'
import carousel8 from '../../assets/home-carousel/carousel-8.jpg'
import carousel9 from '../../assets/home-carousel/carousel-9.jpg'



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
        <div className="flex-col">
            {notification}
            <div className="flex justify-center items-center">
                <div className="h-[750px] w-[100%] min-h-[600px]">
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
                        <div className="flex h-full items-center justify-center bg-gray-400">
                            <img src={carousel1} className="h-full"/>
                            <img src={carousel2} className="h-full"/>
                            <img src={carousel3} className="h-full"/>
                        </div>
                        <div className="flex h-full items-center justify-center bg-gray-400">
                            <img src={carousel4} className="h-full"/>
                            <img src={carousel5} className="h-full"/>
                            <img src={carousel6} className="h-full"/>
                        </div>
                        <div className="flex h-full items-center justify-center bg-gray-400">
                            <img src={carousel7} className="h-full"/>
                            <img src={carousel8} className="h-full"/>
                            <img src={carousel9} className="h-full"/>
                        </div>
                        {/* <div className="flex h-full items-center justify-center bg-gray-400">2</div>
                        <div className="flex h-full items-center justify-center bg-gray-400">3</div> */}
                    </Carousel>
                </div>
            </div>
        </div>
        
    )
}