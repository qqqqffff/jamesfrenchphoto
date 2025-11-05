import { QueryClient, useMutation, UseMutationResult, useQueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { HiOutlineCheckCircle } from "react-icons/hi2";
import { AuthContext, useAuth } from '../auth'
import { Dropdown } from 'flowbite-react'
import { Dispatch, FC, ReactNode, SetStateAction, useEffect, useState } from 'react'
import bannerIcon from '../assets/headerPhoto.png'
import useWindowDimensions from '../hooks/windowDimensions';
import { HiOutlineMenu } from 'react-icons/hi';
import { CgSpinner } from 'react-icons/cg';

const LoginComponent = () => (<Link to='/login'>Login</Link>)

const UserProfileComponent: FC<{
  width: number,
  admin: boolean | null, 
  logout: () => Promise<void>
  selectedParticipant: string | undefined
  setSelectedParticipant: Dispatch<SetStateAction<string | undefined>>
  auth: AuthContext,
  participantMutation: UseMutationResult<void, Error, string, unknown>
}> = ({ 
  width,
  admin, 
  logout, 
  selectedParticipant, 
  setSelectedParticipant, 
  auth, 
  participantMutation 
}) => {
  const navigate = useNavigate()
  let dashboardUrl = '/' +  (admin !== null && admin ? 'admin' : 'client') + '/dashboard'

  function UserDropdownSkeleton({ children } : {children?: ReactNode}) {
    return (
      <>
        <Dropdown.Item href={dashboardUrl}>Dashboard</Dropdown.Item>
        
        {children}
        <Dropdown.Item onClick={async () => {
          await logout()
          navigate({to: '/', search: { logout: true }})
        }}>Logout</Dropdown.Item>
      </>
    )
  }

  function UserDropdown() {
    return (
      <UserDropdownSkeleton>
        {width <=  800 && (
          <Dropdown
          arrowIcon={false}
          inline
          label={<Dropdown.Item as='div'>{`Participant${(auth.user?.profile.participant ?? []).length > 1 ? 's' : ''}`}</Dropdown.Item>}
          trigger='click'
          placement='left'
          dismissOnClick={false}
        >
          {auth.user?.profile.participant.map((participant, index) => {
            return (
              <Dropdown.Item 
                className='whitespace-nowrap flex flex-row gap-1 items-center'
                key={index} 
                onClick={async () => {
                  if(auth.user?.profile.activeParticipant?.id !== participant.id){
                    setSelectedParticipant(participant.id)
                    participantMutation.mutate(participant.id)
                  }
                }}
              >
                {participant.id === selectedParticipant && (
                  participantMutation.isPending ? (
                    <CgSpinner size={20} className="animate-spin text-gray-600"/>
                  ) : (
                    <HiOutlineCheckCircle size={20} />
                  )
                )}
                {`${participant.preferredName && participant.preferredName !== '' ? 
                  participant.preferredName : participant.firstName} ${participant.lastName}`}
              </Dropdown.Item>
            )
          })}
          </Dropdown>
        )}
        <Dropdown.Item onClick={() => navigate({ to: '/client/profile' })}>My Profile</Dropdown.Item>
      </UserDropdownSkeleton>
    )
  }

  if(!admin) return (<UserDropdown />)
  return (<UserDropdownSkeleton />)
}

const RootComponent = () => {
  const data = Route.useLoaderData()
  const auth = useAuth()
  const [selectedParticipant, setSelectedParticipant] = useState(auth.user?.profile.activeParticipant?.id)

  useEffect(() => {
    if(selectedParticipant === undefined) {
      if(auth.user?.profile.activeParticipant) {
        setSelectedParticipant(auth.user?.profile.activeParticipant.id)
      }
      else if((auth.user?.profile.participant ?? []).length > 0 && auth.user?.profile.participant[0].id) {
        setSelectedParticipant(auth.user.profile.participant[0].id)
        auth.changeParticipant(auth.user.profile.participant[0].id)
      }
    }
  }, [auth.user])

  const changeParticipant = async (participantId: string) => {
    await auth.changeParticipant(participantId)
    await queryClient.invalidateQueries({
      queryKey: ['coverPath', 'photoPaths', 'photoCollection', 'watermark', 'timeslot', 'userProfile', 'userTags']
    })
    navigate({ to: '/client/dashboard' })
  }

  const participantMutation = useMutation({
    mutationFn: (participantId: string) => changeParticipant(participantId)
  })

  
  const { width } = useWindowDimensions()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  if(data.hidden) return (<Outlet />)

  function UserComponent(){
      if(auth.user == null) return (<LoginComponent />)
      else if (auth.user !== null) return (
        <Dropdown
          arrowIcon={false}
          label={(width > 800 ? (
            <span>Profile</span>
          ) : (
            <HiOutlineMenu className='text-xl'/>
          ))}
          trigger={width > 800 ? 'hover' : 'click'}
          placement='bottom-end'
          inline
          dismissOnClick={false}
        >
          <UserProfileComponent 
            width={width}
            admin={auth.admin} 
            logout={auth.logout}
            selectedParticipant={selectedParticipant}
            setSelectedParticipant={setSelectedParticipant}
            auth={auth}
            participantMutation={participantMutation}
          />
        </Dropdown>
      )
  }

    
  return (
    <> 
      <div className={location.href.includes('advertise') ? ' blur-sm' : ''}>
        <div className='flex flex-row px-8 py-4 font-main border-b-2 border-gray-300'>
          <div className='flex justify-center items-center'>
            <a href="/">
                <img className='ml-3 mt-3' src={bannerIcon} alt='James French Photography Banner' width={150} height={100} />
            </a>
          </div>
          <div className='flex flex-row items-center lg:px-12 text-2xl w-full justify-end gap-10'>
            {width > 800 && !(auth.admin ?? false) && auth.isAuthenticated && (
              <Dropdown
                arrowIcon={false}
                inline
                label={`Participant${(auth.user?.profile.participant ?? []).length > 1 ? 's' : ''}`}
                trigger='hover'
                placement='bottom'
                dismissOnClick={false}
              >
                {auth.user?.profile.participant.map((participant, index) => {
                  return (
                    <Dropdown.Item 
                      className='whitespace-nowrap flex flex-row gap-1 items-center'
                      key={index} 
                      onClick={async () => {
                        if(auth.user?.profile.activeParticipant?.id !== participant.id){
                          setSelectedParticipant(participant.id)
                          participantMutation.mutate(participant.id)
                        }
                      }}
                    >
                      {participant.id === selectedParticipant && (
                        participantMutation.isPending ? (
                          <CgSpinner size={20} className="animate-spin text-gray-600"/>
                        ) : (
                          <HiOutlineCheckCircle size={20} />
                        )
                      )}
                      {`${participant.preferredName && participant.preferredName !== '' ? 
                        participant.preferredName : participant.firstName} ${participant.lastName}`}
                    </Dropdown.Item>
                  )
                })}
              </Dropdown>
            )}
            <UserComponent />
          </div>
        </div>
      </div>
      <Outlet />
      {/* <TanStackRouterDevtools position='bottom-right' /> */}
    </>
  )
}

export const Route = createRootRouteWithContext<{queryClient: QueryClient, auth: AuthContext }>()({
  component: RootComponent,
  notFoundComponent: () => {
    return (
      <div>
        <span>This was unexpected</span>
        <Link to='/'>Click here to return home</Link>
      </div>
    )
  },
  beforeLoad: ({ location }) => {
    return { hidden: (
      location.href.includes('photo-fullscreen') ||
      location.href.includes('favorites-fullscreen')
    )}
  },
  loader: ({ context }) => {
    return {
      hidden: context.hidden
    }
  }
})