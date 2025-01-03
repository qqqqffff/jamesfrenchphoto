import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ context, location }) => {
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
