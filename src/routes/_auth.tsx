import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { UserService } from '../services/userService'
import { Schema } from '../../amplify/data/resource'
import { V6Client } from '@aws-amplify/api-graphql'

interface AuthSearchParams {
  temporaryToken?: string,
}

export const Route = createFileRoute('/_auth')({
  validateSearch: (search: Record<string, unknown>): AuthSearchParams => ({
    temporaryToken: (search.temporaryToken as string) || undefined
  }),
  beforeLoad: async ({ context, location, search }) => {
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

    const client = context.client as V6Client<Schema>
    const userService = new UserService(client)

    if(search.temporaryToken && location.href.includes('photo') && !context.auth.isAuthenticated){
      const validToken = await context.queryClient.ensureQueryData(
        userService.getTemporaryAccessTokenQueryOptions(search.temporaryToken)
      ) 
      if(!validToken) {
        throw redirect({
          to: '/login',
          search: {
            invalidToken: true
          }
        })
      }
      return validToken
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
