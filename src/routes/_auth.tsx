import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location }) => {
    //old code assistant
    if(localStorage.getItem('user') !== null){
      localStorage.removeItem('user')
      await context.auth.logout()
      await new Promise(resolve => setTimeout(resolve, 1))
      throw redirect({
        to: '/login',
        search: {
          relogin: true
        }
      })
    }
    if(!context.auth.isAuthenticated){
      throw redirect({
        to: '/login',
        search: {
          unauthorized: true
        }
      })
    }
    else if(!context.auth.admin && location.pathname.includes('admin')){
      throw redirect({
        to: '/client/dashboard'
      })
    }
  },
  component: () => (<Outlet/>),
})
