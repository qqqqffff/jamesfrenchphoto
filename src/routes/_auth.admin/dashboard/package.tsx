import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/dashboard/package')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_auth/admin/dashboard/package"!</div>
}