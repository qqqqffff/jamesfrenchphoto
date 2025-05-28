import { createFileRoute } from '@tanstack/react-router'
import { getTemporaryUserQueryOptions } from '../services/userService'
import { RegisterForm } from '../components/register/RegisterForm';
import { useEffect } from 'react';

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

    return profile
  }
})



export function RouteComponent(){
    const profile = Route.useLoaderData()
    const navigate = Route.useNavigate()

    useEffect(() => {
      if(!profile) navigate({ to: '.' })
    })

    return (
      <>
        <RegisterForm 
            temporaryProfile={profile ? {
                ...profile,
                password: '',
                confirm: '',
                terms: false,
            } : undefined}
        />
      </>
    )
}