import { createFileRoute } from '@tanstack/react-router'
import { getTemporaryUserQueryOptions } from '../services/userService'
import { RegisterForm } from '../components/register/RegisterForm';
import { useQuery } from '@tanstack/react-query';

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
    const profile = await context.queryClient.ensureQueryData(
      getTemporaryUserQueryOptions(context.token, { logging: true })
    )

    if(profile !== null) {
      profile.temporary = context.token
    }

    return {
      profile: profile,
      auth: context.auth,
      token: context.token,
    }
  }
})



export function RouteComponent(){
  const { auth, token } = Route.useLoaderData()

  const profile = useQuery(
    getTemporaryUserQueryOptions(token, { logging: true })
  )

  return (
    <>
      <RegisterForm 
        logout={auth.logout}
        temporaryProfile={profile.data ? {
            ...profile.data,
            password: '',
            confirm: '',
            terms: false,
        } : undefined}
        profileQuery={profile}
      />
    </>
  )
}