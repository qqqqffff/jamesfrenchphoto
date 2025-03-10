import { createFileRoute, useLocation } from '@tanstack/react-router'
import { Button } from 'flowbite-react'
import {
  HiOutlineCalendar,
  // HiOutlineCalendar,
  // HiOutlineChat,
  HiOutlineClipboardList,
  HiOutlineDocumentText,
  HiOutlineSearchCircle,
  HiOutlineUserCircle,
} from 'react-icons/hi'
import { Outlet, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../../auth'


export const Route = createFileRoute('/_auth/admin/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  function structureFullname() {
    if (auth.user)
      return (
        auth.user.attributes.given_name + ' ' + auth.user.attributes.family_name
      )
    else {
      return 'Loading...'
    }
  }

  function activeConsoleClassName(console: string) {
    if (location.pathname.includes(console)) {
      return 'border border-black'
    }
    return ''
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center font-main">
        <p className="font-semibold text-3xl mb-4">
          Welcome {structureFullname()}
        </p>
        <p className="font-medium text-xl mb-1">Management Consoles:</p>
        <Button.Group>
          <Button
            color="gray"
            onClick={() => {
                navigate({ to: '/admin/dashboard/scheduler' })
            }}
            className={activeConsoleClassName('scheduler')}
          >
            <HiOutlineCalendar className="mt-1 me-1" /> Scheduler
          </Button>
          <Button
            color="gray"
            onClick={() => {
                navigate({ to: '/admin/dashboard/collection' })
            }}
            className={activeConsoleClassName('collection')}
          >
            <HiOutlineClipboardList className="mt-1 me-1" /> Collection Manager
          </Button>
          {/* <Button color='gray' onClick={() => setActiveConsole('notificationCenter')} className={activeConsoleClassName('notificationCenter')}>
                        <HiOutlineChat className="mt-1 me-1"/> Notification Center
                    </Button> */}
          <Button
            color="gray"
            onClick={() => {
                navigate({ to: '/admin/dashboard/package' })
            }}
            className={activeConsoleClassName('package')}
          >
            <HiOutlineDocumentText className="mt-1 me-1" /> Package
          </Button>
          <Button
            color="gray"
            onClick={() => {
                navigate({ to: '/admin/dashboard/table' })
            }}
            className={activeConsoleClassName('table')}
          >
            <HiOutlineUserCircle className="mt-1 me-1" /> Management Tables
          </Button>
          <Button
            color="gray"
            onClick={() => {
                navigate({ to: '/client/dashboard' })
            }}
          >
            <HiOutlineSearchCircle className="mt-1 me-1" /> User View
          </Button>
        </Button.Group>
      </div>
      <Outlet />
    </>
  )
}
