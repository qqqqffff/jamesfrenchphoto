import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/dashboard/scheduler')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_auth/admin/dashboard/scheduler"!</div>
}
