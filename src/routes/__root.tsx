import { QueryClient, useMutation } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet, useLocation } from '@tanstack/react-router'
import { AuthContext, useAuth } from '../auth'
import { useEffect, useState } from 'react'
import bannerIcon from '../assets/headerPhoto.png'
import useWindowDimensions from '../hooks/windowDimensions';
import { UserProfileComponent } from '../components/client/UserProfileComponent';

const LoginComponent = () => (
  <div className='w-full flex flex-row justify-end'>
    <Link 
      to='/login'
      className='border-2 rounded hover:text-gray-500 font-bodoni font-medium px-4 py-2 text-2xl self-end'
    >Login</Link>
  </div>
)

const RootComponent = () => {
  const data = Route.useLoaderData()
  const auth = useAuth()
  const [selectedParticipant, setSelectedParticipant] = useState(auth.user?.profile.activeParticipant)

  useEffect(() => {
    if(selectedParticipant === undefined && auth.user) {
      if(auth.user.profile.activeParticipant) {
        setSelectedParticipant(auth.user.profile.activeParticipant)
      }
      else if(
        auth.user.profile.participant.length > 0 && 
        auth.user.profile.participant[0].id !== undefined
      ) {
        setSelectedParticipant(auth.user.profile.participant[0])
        auth.changeParticipant(auth.user.profile.participant[0].id)
      }
    }
  }, [auth.user])

  
  const { width } = useWindowDimensions()
  const location = useLocation()

  if(data.hidden) return (<Outlet />)

  const participantMutation = useMutation({
    mutationFn: async (participantId: string) => auth.changeParticipant(participantId)
  })

  function UserComponent(){
    if(auth.user == null) return (<LoginComponent />)
    else if (auth.user !== null) {
      return (
        <UserProfileComponent 
          width={width}
          admin={auth.admin} 
          logout={auth.logout}
          selectedParticipant={selectedParticipant}
          setSelectedParticipant={setSelectedParticipant}
          user={auth.user.profile}
          participantMutation={participantMutation}
        />
      )
    }
  }

    
  return (
    <> 
      <div className={location.href.includes('advertise') ? ' blur-sm' : ''}>
        <div className='flex flex-row px-8 py-4 font-main border-b-2 border-gray-300 items-center'>
          <div className='flex justify-center items-center'>
            <a href="/">
                <img className='ml-3 mt-3' src={bannerIcon} alt='James French Photography Banner' width={150} height={100} />
            </a>
          </div>
          <UserComponent />
        </div>
      </div>
      <Outlet />
      {/* <TanStackRouterDevtools position='bottom-right' /> */}
    </>
  )
}

export const Route = createRootRouteWithContext<{client: any, queryClient: QueryClient, auth: AuthContext }>()({
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
    const backendClient = context.client
    return {
      hidden: context.hidden,
      client: backendClient
    }
  }
})