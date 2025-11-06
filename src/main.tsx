import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './auth.tsx'
import { routeTree } from './routeTree.gen.ts'
import { Amplify } from 'aws-amplify'
import outputs from '../amplify_outputs.json'
import { generateClient } from 'aws-amplify/api'
import { Schema } from '../amplify/data/resource.ts'

Amplify.configure(outputs)
const client = generateClient<Schema>()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      experimental_prefetchInRender: true,
    }
  }
})

const router = createRouter({
  routeTree,
  context: {
    queryClient,
    auth: undefined!
  },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  const auth = useAuth()
  return (
    <QueryClientProvider client={queryClient} >
      <RouterProvider router={router} context={{ auth }}/>
    </QueryClientProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider client={client} >
      <App />
    </AuthProvider>
  </StrictMode>
)