import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/dashboard/package')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>This page has not been implemented yet</div>
}
