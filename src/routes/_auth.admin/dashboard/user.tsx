import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/dashboard/user')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/dashboard/userManagement"!</div>
}