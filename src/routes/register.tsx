import { createFileRoute } from '@tanstack/react-router'
import { getTemporaryUserQueryOptions } from '../services/userService'
import { RegisterForm } from '../components/register/RegisterForm';

interface RegisterParams {
  token: string,
}

export const Route = createFileRoute('/register')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): RegisterParams => ({
    token: (search.token as string)
  }),
  beforeLoad: ({ search }) => {
    return search
  },
  loader: async ({ context }) => {
    const profile = await context.queryClient.ensureQueryData(
        getTemporaryUserQueryOptions(context.token, { logging: true })
    )

    return profile
  }
})



export function RouteComponent(){
    const profile = Route.useLoaderData()    

    return (
        <>
            <RegisterForm 
                temporaryProfile={profile ? {
                    ...profile,
                    password: '',
                    confirm: '',
                    terms: false
                } : undefined}
            />
        </>
    )
}