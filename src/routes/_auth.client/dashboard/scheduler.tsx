import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/client/dashboard/scheduler')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_auth/client/dashboard/scheduler"!</div>
}
