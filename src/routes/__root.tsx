import { QueryClient, useMutation } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { HiOutlineCheckCircle } from "react-icons/hi2";
import { AuthContext, useAuth } from '../auth'
import { Dropdown } from 'flowbite-react'
import { FC, ReactNode } from 'react'
import { UserStorage } from '../types';
import bannerIcon from '../assets/headerPhoto.png'
// import useWindowDimensions from '../hooks/windowDimensions';
// import { HiOutlineMenu } from 'react-icons/hi';

const LoginComponent = () => (<Link to='/login'>Login</Link>)
const UserProfileComponent: FC<{
    user: UserStorage,
    admin: boolean | null, 
    changeParticipant: (participantId: string) => Promise<void | undefined>,
    logout: () => Promise<void>,
}> = ({ user, admin, changeParticipant, logout }) => {
    const participantMutation = useMutation({
        mutationFn: (participantId: string) => changeParticipant(participantId)
    })

    let dashboardUrl = '/' +  (admin !== null && admin ? 'admin' : 'client') + '/dashboard'
    let profileUrl = '/' + (admin !== null && admin ? 'admin' : 'client') + '/profile'

    function UserDropdownSkeleton({ children } : {children?: ReactNode}) {
        return (
            <>
                <Dropdown.Item href={dashboardUrl}>Dashboard</Dropdown.Item>
                {children}
                <Dropdown.Item onClick={() => logout()}>Logout</Dropdown.Item>
            </>
        )
    }

    function UserDropdown() {
        return (
            <UserDropdownSkeleton>
                <Dropdown.Item href={profileUrl}>Profile</Dropdown.Item>
                <Dropdown.Item>
                    <Dropdown
                        arrowIcon={false}
                        inline
                        label={'Participants'}
                        trigger='hover'
                        placement='left'
                    >
                        {user.profile.participant.map((participant, index) => {
                            return (
                                <Dropdown.Item key={index} 
                                    onClick={async () => {
                                        if(user.profile.activeParticipant?.id !== participant.id){
                                            participantMutation.mutate(participant.id)
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

    if(admin) return (<UserDropdown />)
    return (<UserDropdownSkeleton />)
}

const RootComponent = () => {
    const auth = useAuth()

    function UserComponent(){
        if(auth.user == null) return (<LoginComponent />)
        else if (auth.user !== null) return (
            <UserProfileComponent 
                user={auth.user} 
                admin={auth.admin} 
                changeParticipant={auth.changeParticipant}
                logout={auth.logout}
            />
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
                {
                    // dimensions.width > 800 ? 
                    // (
                        <>
                            <UserComponent />
                        </>
                    // ) : (
                    //     <Dropdown label={(<HiOutlineMenu className='text-xl' />)} color='light' arrowIcon={false} trigger='hover'>
                    //         <Dropdown.Item><Link to="/contact-form">Contact Us</Link></Dropdown.Item>
                    //         <Dropdown.Divider className='bg-gray-300'/>
                    //         {renderHeaderItems()}
                    //     </Dropdown>
                    // )
                }
                </div>
            </div>
            <Outlet />
            <TanStackRouterDevtools position='bottom-right' />
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
    }
})