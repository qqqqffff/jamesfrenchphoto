import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from "react";
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
  logout?: 'success' | 'fail'
}

export const Route = createFileRoute('/')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): HomeParams => ({
    logout: (search.logout as 'success' | 'fail') || undefined,
  })
})

function NotificationObject(props: { text: string, color: string, remove: () => void }) {
  return (
    <Alert color={props.color} className="text-lg w-[90%]" onDismiss={() => {props.remove()}}>
      <p>{props.text}</p>
    </Alert>
  )
}

interface HomeNotifications {
  item: 'logout',
  status: 'success' | 'fail',
}

function RouteComponent() {
  const search = Route.useSearch()
  const { width } = useWindowDimensions()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<HomeNotifications[]>([])

  useEffect(() => {
    const notifications: HomeNotifications[] = []
    if(search.logout) {
      notifications.push({
        item: 'logout',
        status: search.logout
      })
    }
    setNotifications(notifications)
  }, [search])

  function NotificationComponent() {
    return (
      <div className="flex justify-center items-center font-main mb-4 mt-4">
        {notifications.map((notification, index) => {
          let text = 'Unknown Notification'
          if(notification.item === 'logout') {
            text = notification.status === 'success' ? 'Successfully logged out.' : 'Failed to logout, please try again later.'
          }
          return (
            <NotificationObject
              key={index}
              text={text} 
              color={notification.status === 'success' ? 'green' : 'red'} 
              remove={() => {
                setNotifications(prev => prev.filter(n => n.item !== notification.item))
                navigate({ to: '.' })
              }}
            />
          )
        })}
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
