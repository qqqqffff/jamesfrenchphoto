import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/admin/dashboard/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className='w-full flex flex-row justify-center mt-2 italic'>
      Select a console to get started!
    </div>
  )
}
