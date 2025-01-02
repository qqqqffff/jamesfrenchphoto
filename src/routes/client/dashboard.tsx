import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/client/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/client/dashboard"!</div>
}
