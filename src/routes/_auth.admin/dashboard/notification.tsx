import { createFileRoute } from '@tanstack/react-router'
import { HiOutlinePlusCircle } from 'react-icons/hi2'

export const Route = createFileRoute('/_auth/admin/dashboard/notification')({
  component: RouteComponent,
  loader: async ({ context }) => {

  }
})

function RouteComponent() {
  return (
    <div className="flex flex-row mx-4 mt-4 gap-4">
      <div className="items-center border border-gray-400 flex flex-col gap-2 rounded-2xl p-4 max-w-[400px] min-w-[400px]">
        <div className='flex flex-row w-full justify-between px-2'>
          <span className='text-xl font-light text-gray-800'>Notifications:</span>
          <button className="flex flex-row gap-2 border border-gray-300 items-center hover:bg-gray-100 rounded-xl py-1 px-3">
            <span className="text-sm">Create Notification</span>
          </button>
        </div>
        <div className="border w-full"></div>
      </div>
      <div className="border-gray-400 border rounded-2xl p-4 flex flex-col w-full h-auto">
        main pannel
      </div>
    </div>
  )
}
