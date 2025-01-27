import { QueryClient, useMutation, useQueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet, useNavigate } from '@tanstack/react-router'
import { HiOutlineCheckCircle } from "react-icons/hi2";
import { AuthContext, useAuth } from '../auth'
import { Dropdown } from 'flowbite-react'
import { FC, ReactNode } from 'react'
import { UserStorage } from '../types';
import bannerIcon from '../assets/headerPhoto.png'
import useWindowDimensions from '../hooks/windowDimensions';
import { HiOutlineMenu } from 'react-icons/hi';

const LoginComponent = () => (<Link to='/login'>Login</Link>)
const UserProfileComponent: FC<{
    user: UserStorage,
    admin: boolean | null, 
    changeParticipant: (participantId: string) => Promise<void | undefined>,
    logout: () => Promise<void>,
    width: number
}> = ({ user, admin, changeParticipant, logout, width }) => {
    const participantMutation = useMutation({
        mutationFn: (participantId: string) => changeParticipant(participantId)
    })
    const navigate = useNavigate()
    

    let dashboardUrl = '/' +  (admin !== null && admin ? 'admin' : 'client') + '/dashboard'

    function UserDropdownSkeleton({ children } : {children?: ReactNode}) {
        return (
            <>
                <Dropdown.Item href={dashboardUrl}>Dashboard</Dropdown.Item>
                {/* <Dropdown.Item onClick={() => navigate({to: '/register', search: { token: 'abc'}})}>Test</Dropdown.Item> */}
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
                <Dropdown.Item onClick={() => navigate({ to: '/client/profile' })}>Profile</Dropdown.Item>
                <Dropdown.Item as='div'>
                    <Dropdown
                        arrowIcon={false}
                        inline
                        label={'Participants'}
                        trigger={width > 800 ? 'hover' : 'click'}
                        placement='left'
                        
                    >
                        {user.profile.participant.map((participant, index) => {
                            return (
                                <Dropdown.Item key={index} 
                                    onClick={async () => {
                                        if(user.profile.activeParticipant?.id !== participant.id){
                                            await participantMutation.mutateAsync(participant.id)
                                        }
                                    }}
                                >
                                    {participant.id === user.profile.activeParticipant?.id && (
                                        <HiOutlineCheckCircle fontSize={'32'}/>
                                    )}
                                    {`${participant.preferredName && participant.preferredName !== '' ? 
                                        participant.preferredName : participant.firstName} ${participant.lastName}`}
                                </Dropdown.Item>
                            )
                        })}
                    </Dropdown>
                </Dropdown.Item>
            </UserDropdownSkeleton>
        )
    }

    if(!admin) return (<UserDropdown />)
    return (<UserDropdownSkeleton />)
}

const RootComponent = () => {
    const data = Route.useLoaderData()

    const auth = useAuth()
    const { width } = useWindowDimensions()
    const queryClient = useQueryClient()
    const navigate = useNavigate()

    if(data) return (<Outlet />)

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
                user={auth.user} 
                admin={auth.admin} 
                changeParticipant={async (id: string) => {
                    await auth.changeParticipant(id)
                    await queryClient.invalidateQueries({
                        queryKey: ['coverPath', 'photoPaths', 'photoCollection', 'watermark', 'timeslot', 'userProfile', 'userTags']
                    })
                    navigate({to: '/client/dashboard'})
                }}
                logout={auth.logout}
                width={width}
            />
          </Dropdown>
            
        )
    }

    return (
        <>
            <div className='flex flex-row px-8 py-4 font-main border-b-2 border-gray-300'>
                <div className='flex justify-center items-center'>
                    <a href="/">
                        <img className='ml-3 mt-3' src={bannerIcon} alt='James French Photography Banner' width={150} height={100} />
                    </a>
                </div>
                <div className='flex flex-row items-center lg:px-12 text-2xl w-full justify-end gap-10'>
                    <UserComponent />
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
        return { hidden: location.href.includes('photo-fullscreen') }
    },
    loader: ({ context }) => {
        return context.hidden
    }
})