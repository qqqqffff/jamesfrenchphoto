import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { LuBadgeDollarSign, LuHammer } from 'react-icons/lu'
import { PricelistPanel } from '../../../components/admin/package/PricelistPanel'
import { BuilderPanel } from '../../../components/admin/package/BuilderPanel'
import { Package } from '../../../types'

interface PackageSearchParams {
  console?: string
}

export const Route = createFileRoute('/_auth/admin/dashboard/package')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): PackageSearchParams => ({
    console: (search.console as string) || undefined
  }),
  beforeLoad: ({ search }) => search,
  loader: async ({ context }) => {
    return {
      console: context.console
    }
  },
})

function RouteComponent() {
  const data = Route.useLoaderData()
  const navigate = useNavigate()
  const [activeConsole, setActiveConsole] = useState<'builder' | 'pricelist' | undefined>(
  data.console === 'builder' ? (
    'builder' as 'builder'
  ) : (
  data.console === 'pricelist' ? (
    'pricelist' as 'pricelist'
  ) : undefined))
  const [packages, setPackages] = useState<Package[]>([])

  useEffect(() => {
    setActiveConsole(
      data.console === 'builder' ? (
        'builder' as 'builder'
      ) : (
      data.console === 'pricelist' ? (
        'pricelist' as 'pricelist'
      ) : undefined)
    )
  }, [data.console])
  
  return (
    <>
      {activeConsole === 'builder' ? (
        <BuilderPanel 
          packages={packages}
          parentUpdatePackages={setPackages}
        />
      ) : (
      activeConsole === 'pricelist' ? (
        <PricelistPanel />
      ) : (

        <div className="grid grid-cols-7 gap-2 mt-4">
          <div className="col-start-2 col-span-5 border border-gray-400 rounded-lg py-8 px-10 gap-10 grid grid-cols-2">
            <button 
              className='flex flex-col min-h-[300px] rounded-lg justify-center items-center hover:bg-gray-100 border border-black hover:border-gray-500'
              onClick={() => {
                setActiveConsole('builder')
                navigate({ to: '.', search: { console: 'builder' }})
              }}
            >
              <div className='text-3xl flex flex-row gap-2 items-center'>
                <LuHammer />
                <span>Builder</span>
              </div>
            </button>
            <button 
              className='flex flex-col min-h-[300px] rounded-lg justify-center items-center hover:bg-gray-100 border border-black hover:border-gray-500'
              onClick={() => {
                setActiveConsole('pricelist')
                navigate({ to: '.', search: { console: 'pricelist' }})
              }}
            >
              <div className='text-3xl flex flex-row gap-2 items-center'>
                <LuBadgeDollarSign />
                <span>Price List</span>
              </div>
            </button>
          </div>
        </div>
      ))}
    </>
  )
}
