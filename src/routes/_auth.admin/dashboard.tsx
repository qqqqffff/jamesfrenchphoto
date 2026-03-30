import { createFileRoute, useLocation } from '@tanstack/react-router'
import { Button } from 'flowbite-react'
import {
  HiOutlineCalendar,
  HiOutlineChat,
  HiOutlineClipboardList,
  HiOutlineDocumentText,
  HiOutlineSearchCircle,
  HiOutlineUserCircle,
} from 'react-icons/hi'
import { Outlet, useNavigate } from '@tanstack/react-router'
import { HiOutlineTag } from 'react-icons/hi2'
import { DateTime } from 'luxon'
import { currentDate } from '../../utils'


export const Route = createFileRoute('/_auth/admin/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()
  const location = useLocation()

  function activeConsoleClassName(console: string) {
    if (location.pathname.includes(console)) {
      return 'border rounded-none border-black'
    }
    return 'border rounded-none'
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center font-main">
        <p className="font-medium text-xl mb-1">Management Consoles:</p>
        <Button.Group className='flex-wrap justify-center px-5'>
          <Button
            color="gray"
            onClick={() => navigate({ 
              to: '/admin/dashboard/scheduler', 
              search: { date: DateTime.fromJSDate(currentDate).toFormat('MM-dd-yyyy') } 
            })}
            className={`${activeConsoleClassName('scheduler')}`}
          >
            <HiOutlineCalendar className="mt-1 me-1" /> Scheduler
          </Button>
          <Button
            color="gray"
            onClick={() => navigate({ 
              to: '/admin/dashboard/collection', 
              search: { collection: undefined, set: undefined, console: 'sets' }
            })}
            className={`${activeConsoleClassName('collection')}`}
          >
            <HiOutlineClipboardList className="mt-1 me-1" /> Collections
          </Button>
          <Button 
            color='gray' 
            onClick={() => navigate({ to: '/admin/dashboard/notification' })} 
            className={`${activeConsoleClassName('notification')}`}
          >
            <HiOutlineChat className='self-center me-1'/> 
            <span>Notifications</span>
          </Button>
          <Button
            color="gray"
            onClick={() => {
                navigate({ to: '/admin/dashboard/package' })
            }}
            className={`${activeConsoleClassName('package')}`}
          >
            <HiOutlineDocumentText className="mt-1 me-1" /> Packages
          </Button>
          <Button
            color="gray"
            onClick={() => navigate({ to: '/admin/dashboard/table' })}
            className={activeConsoleClassName('table')}
          >
            <HiOutlineUserCircle className="mt-1 me-1" /> Tables
          </Button>
          <Button
            color="gray"
            onClick={() => {
                navigate({ to: '/admin/dashboard/tagging' })
            }}
            className={activeConsoleClassName('tagging')}
          >
            <HiOutlineTag className="mt-1 me-1" /> Tagging
          </Button>
          <Button
            color="gray"
            onClick={() => navigate({ to: '/client/dashboard' })}
            className={activeConsoleClassName('userView')}
          >
            <HiOutlineSearchCircle className="mt-1 me-1" /> User View
          </Button>
        </Button.Group>
      </div>
      <Outlet />
    </>
  )
}
