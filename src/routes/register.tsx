import { createFileRoute } from '@tanstack/react-router'
import { UserService } from '../services/userService'
import { RegisterForm } from '../components/register/RegisterForm';
import { useQuery } from '@tanstack/react-query';
import { Schema } from '../../amplify/data/resource';
import { V6Client } from '@aws-amplify/api-graphql'


interface RegisterParams {
  token?: string,
}

export const Route = createFileRoute('/register')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): RegisterParams => ({
    token: (search.token as string) || undefined
  }),
  beforeLoad: ({ search }) => {
    return search
  },
  loader: async ({ context }) => {
    const client = context.client as V6Client<Schema>
    const userService = new UserService(client)

    const profile = await context.queryClient.ensureQueryData(
      userService.getTemporaryUserQueryOptions(context.token, { logging: true })
    )

    if(profile !== null) {
      profile.temporary = context.token
    }

    return {
      UserService: userService,
      profile: profile,
      auth: context.auth,
      token: context.token,
    }
  }
})



export function RouteComponent(){
  const { UserService, auth, token } = Route.useLoaderData()

  const profile = useQuery(
    UserService.getTemporaryUserQueryOptions(token, { logging: true })
  )

  return (
    <>
      <RegisterForm 
        UserService={UserService}
        logout={auth.logout}
        temporaryProfile={profile.data ? {
            ...profile.data,
            password: '',
            confirm: '',
            terms: false,
            temporary: token
        } : undefined}
        profileQuery={profile}
      />
    </>
  )
}