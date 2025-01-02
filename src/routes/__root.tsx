import { QueryClient, useMutation } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { HiOutlineCheckCircle } from "react-icons/hi2";
import { AuthContext, useAuth } from '../auth'
import { Dropdown } from 'flowbite-react'
import { ReactNode } from 'react'

const RootComponent = () => {
    const auth = useAuth()
    const participantMutation = useMutation({
        mutationFn: (participantId: string) => auth.changeParticipant(participantId)
    })
    
    if(auth.user == null) return (<Link to='/login'>Login</Link>)

    let dashboardUrl = '/' +  (auth.admin !== undefined && auth.admin ? 'admin' : 'client') + '/dashboard'
    let profileUrl = '/' + (auth.admin !== undefined && auth.admin ? 'admin' : 'client') + '/profile'

    function UserDropdownSkeleton({ children } : {children: ReactNode}) {
        return (
            <>
                <Dropdown.Item href={dashboardUrl}>Dashboard</Dropdown.Item>
                {children}
                <Dropdown.Item href='/logout'>Logout</Dropdown.Item>
            </>
        )
    }

    function UserDropdown(){
        return (
            <UserDropdownSkeleton>
                <Dropdown.Item>
                    <Dropdown
                        arrowIcon={false}
                        inline
                        label={'Participants'}
                        trigger='hover'
                        placement='left'
                    >
                        {auth.user.profile.participant.map((participant, index) => {
                            return (
                                <Dropdown.Item key={index} 
                                    onClick={async () => {
                                        if(auth.user.activeParticipant?.id !== participant.id){

                                        }
                                    }}
                                >{participant.id === userProfile.activeParticipant?.id ? (
                                    <HiOutlineCheckCircle fontSize={'32'}/>
                                ) : (<></>)}{`${participant.preferredName && participant.preferredName !== '' ? participant.preferredName : participant.firstName} ${participant.lastName}`}</Dropdown.Item>
                            )
                        })}
                    </Dropdown>
                </Dropdown.Item>
            </UserDropdownSkeleton>
        )
    }

    return (
        <> 
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