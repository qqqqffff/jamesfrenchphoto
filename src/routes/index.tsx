import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from "react";
import { Alert, Carousel } from "flowbite-react";
import { HiOutlineArrowLeft, HiOutlineArrowRight } from "react-icons/hi";
import carousel1 from '../assets/home-carousel/carousel-1.jpg'
import carousel2 from '../assets/home-carousel/carousel-2.jpg'
import carousel3 from '../assets/home-carousel/carousel-3.jpg'
import carousel4 from '../assets/home-carousel/carousel-4.jpg'
import carousel5 from '../assets/home-carousel/carousel-5.jpg'
import carousel6 from '../assets/home-carousel/carousel-6.jpg'
import carousel7 from '../assets/home-carousel/carousel-7.jpg'
import carousel8 from '../assets/home-carousel/carousel-8.jpg'
import carousel9 from '../assets/home-carousel/carousel-9.jpg'
import useWindowDimensions from '../hooks/windowDimensions';

interface HomeParams {
  logout?: boolean
}

export const Route = createFileRoute('/')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): HomeParams => ({
    logout: (search.logout as boolean) || undefined
  })
})

const notification = (text: string, color: string, remove: () => void) => {
  return (
    <Alert color={color} className="text-lg w-[90%]" onDismiss={() => {remove()}}>
      <p>{text}</p>
    </Alert>
  )
}

function RouteComponent() {
  const search = Route.useSearch()
  const { width } = useWindowDimensions()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<{item: string, visible: boolean}[]>(
    Object.entries(search).map((item) => 
      ({item: item[0], visible: item[1] !== undefined})
    )
  )

  function NotificationComponent() {
    return (
      <div className="flex justify-center items-center font-main mb-4 mt-4">
        {notifications.find((item) => item.item === 'logout')?.visible && 
          notification('Successfully signed out!', 'green', 
            () => {
              navigate({ to: '.' })
              setNotifications(
                notifications.map((notification) => {
                  if(notification.item === 'logout') return {...notification, visible: false}
                  return notification
                })
              )
            }
          )
        }
      </div>
    )
  }

  return width > 800 ? (
    <div className="flex-col">
      <NotificationComponent />
      <div className="flex justify-center items-center">
        <div className="h-[650px] w-full px-4 mt-2">
          <Carousel
            slideInterval={5000}
            leftControl={
              <div className="border p-2 rounded-full border-black bg-gray-300">
                <HiOutlineArrowLeft className="text-xl"/>
              </div>
            }
            rightControl={
              <div className="border p-2 rounded-full border-black bg-gray-300">
                <HiOutlineArrowRight className="text-xl"/>
              </div>
            }
            className="border-2 border-black rounded-lg"
          >
            <div className="flex h-full items-center justify-center bg-transparent">
              <img src={carousel1} className="h-full w-full"/>
              <img src={carousel2} className="h-full w-full"/>
              <img src={carousel3} className="h-full w-full"/>
            </div>
            <div className="flex h-full items-center justify-center bg-transparent">
              <img src={carousel4} className="h-full w-full"/>
              <img src={carousel5} className="h-full w-full"/>
              <img src={carousel6} className="h-full w-full"/>
            </div>
            <div className="flex h-full items-center justify-center bg-transparent ">
              <img src={carousel7} className="h-full w-full"/>
              <img src={carousel8} className="h-full w-full"/>
              <img src={carousel9} className="h-full w-full"/>
            </div>
          </Carousel>
        </div>
    </div>
    </div>
  ) : (
    <div className="flex-col">
        <NotificationComponent />
        <div className="flex justify-center items-center">
            <div className={`max-h-[500px] h-full w-full px-4 mt-2`}>
                <Carousel
                  slideInterval={5000}
                  leftControl={
                    <div className="border p-2 rounded-full border-black bg-gray-300">
                      <HiOutlineArrowLeft className="text-xl"/>
                    </div>
                  }
                  rightControl={
                    <div className="border p-2 rounded-full border-black bg-gray-300">
                      <HiOutlineArrowRight className="text-xl"/>
                    </div>
                  }
                  className={`border-2 border-black rounded-lg h-[500px]`}
                >
                  <div className="flex h-full items-center justify-center bg-transparent">
                    <img src={carousel1} className="h-full w-full"/>
                  </div>
                  <div className="flex h-full items-center justify-center bg-transparent">
                      <img src={carousel2} className="h-full w-full"/>
                  </div>
                  <div className="flex h-full items-center justify-center bg-transparent">
                    <img src={carousel3} className="h-full w-full"/>
                  </div>
                  <div className="flex h-full items-center justify-center bg-transparent">
                    <img src={carousel4} className="h-full w-full"/>
                  </div>
                  <div className="flex h-full items-center justify-center bg-transparent">
                    <img src={carousel5} className="h-full w-full"/>
                  </div>
                  <div className="flex h-full items-center justify-center bg-transparent">
                    <img src={carousel6} className="h-full w-full"/>
                  </div>
                  <div className="flex h-full items-center justify-center bg-transparent">
                    <img src={carousel7} className="h-full w-full"/>
                  </div>
                  <div className="flex h-full items-center justify-center bg-transparent">
                    <img src={carousel8} className="h-full w-full"/>
                  </div>
                  <div className="flex h-full items-center justify-center bg-transparent">
                    <img src={carousel9} className="h-full w-full"/>
                  </div>
                </Carousel>
            </div>
        </div>
    </div>
  )
}
