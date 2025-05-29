import { createFileRoute, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../../auth'
import { Badge, Button } from 'flowbite-react'
import { HiArrowUturnLeft, HiOutlineCalendar, HiOutlineClipboard, HiOutlineHome } from 'react-icons/hi2'
import { badgeColorThemeMap } from '../../utils'
import { useQueries, useQuery } from '@tanstack/react-query'
import { UserProfile } from '../../types'
import { getAllUserTagsQueryOptions } from '../../services/userService'
import { getAllTimeslotsByUserTagQueryOptions } from '../../services/timeslotService'

export const Route = createFileRoute('/_auth/client/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  if(auth.user == null){
    navigate({ to: '/login', search: { unauthorized: true }})
    return
  }

  const tags = useQuery({
    ...getAllUserTagsQueryOptions({ siCollections: false }),
    enabled: auth.admin ?? false
  })
  const timeslots = useQueries({
    queries: (!auth.admin ? (
      auth.user.profile.activeParticipant?.userTags ?? []
    ) : (
      tags.data ?? [])
    ).map((tag) => {
      return getAllTimeslotsByUserTagQueryOptions(tag.id)
    })
  })

  const structureFullname = (userProfile: UserProfile) => {
    return  (
      userProfile.activeParticipant ? (
        `${userProfile.activeParticipant.preferredName ? userProfile.activeParticipant.preferredName : userProfile.activeParticipant.firstName} ${userProfile.activeParticipant.lastName}`
      ) : (
        userProfile.participantFirstName && userProfile.participantFirstName ? (
          `${userProfile.participantPreferredName ? userProfile.participantPreferredName : userProfile.participantFirstName} ${userProfile.participantLastName}`
        ) : (
          'Error'
        )
      )
    )
  }

  const activeConsoleClassName = (console: string) => {
    if (location.pathname.substring(location.pathname.lastIndexOf('/') + 1) == console) {
      return 'border border-black'
    }
    return ''
  }

  const schedulerEnabled = timeslots.find((data) => {
    return (data.data ?? []).length > 0}
  ) !== undefined

  //enabled if there is a tag that has children that are not included in the current user's tags 
  // (also must be currently advertising)
  const packagesEnabled = auth.user.profile.activeParticipant?.userTags.some((tag, _, array) => {
    return (
      !tag.children.some((cTag) => array.some((pTag) => pTag.id === cTag.id)) &&
      tag.children.some((cTag) => cTag.package?.advertise)
    )
  })
  return (
    <>
      <div className="flex flex-col items-center justify-center font-main">
          <p className="font-semibold text-3xl mb-4 text-center">Welcome {structureFullname(auth.user.profile)}</p>
          <div className="flex flex-row gap-2 items-center mb-4">
              {
                auth.user.profile.activeParticipant?.userTags.map((tag, index) => {
                  return (
                    <Badge 
                      theme={badgeColorThemeMap} 
                      color={tag.color ? tag.color : 'light'} 
                      key={index} 
                      className="py-1 text-md"
                    >{tag.name}</Badge>
                  )
                })
              }
          </div>
          <p className="font-medium text-xl mb-1">Quick Actions:</p>
          <Button.Group>
              <Button color='gray' onClick={() => navigate({ to : '/client/dashboard' })} className={activeConsoleClassName('dashboard')}>
                <HiOutlineHome className="mt-1 me-1"/>Home
              </Button>
              {(schedulerEnabled || auth.admin) && (
                <Button color='gray' onClick={() => navigate({ to: '/client/dashboard/scheduler' })} className={activeConsoleClassName('scheduler')}>
                  <HiOutlineCalendar className="mt-1 me-1"/>Scheduler
                </Button>
              )}
              {packagesEnabled && (
                <Button color='gray' onClick={() => navigate({ to : '/client/dashboard/package' })} className={activeConsoleClassName('package')}>
                  <HiOutlineClipboard className="mt-1 me-1"/>Packages
                </Button>
              )}
              {auth.admin && (
                <Button color='gray' onClick={() => navigate({ to: '/admin/dashboard' })}>
                  <HiArrowUturnLeft className="mt-1 me-1"/>Admin Console
                </Button>
              )}
          </Button.Group>
      </div>
      <Outlet />
    </>
  )
}
