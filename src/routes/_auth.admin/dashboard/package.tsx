import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { LuBadgeDollarSign, LuHammer } from 'react-icons/lu'
import { PricelistPanel } from '../../../components/admin/package/PricelistPanel'
import { BuilderPanel } from '../../../components/admin/package/BuilderPanel'
import { Package, PackageItem, UserTag } from '../../../types'
import { getAllUserTagsQueryOptions } from '../../../services/userService'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { getAllPackagesQueryOptions, getInfinitePackageItemsQueryOptions } from '../../../services/packageService'
import { getAllPhotoCollectionsQueryOptions } from '../../../services/collectionService'

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
      console: context.console,
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
    ) : undefined)
  )
  const [packages, setPackages] = useState<Package[]>([])
  const [tags, setTags] = useState<UserTag[]>([])
  const [allPackageItems, setAllPackageItems] = useState<PackageItem[]>([])

  const tagsQuery = useQuery(getAllUserTagsQueryOptions({ 
    siCollections: true, 
    siNotifications: false, 
    siTimeslots: true,
    siPackages: { }
  }))

  const packageItemsInfiniteQuery = useInfiniteQuery(getInfinitePackageItemsQueryOptions({
    siCollectionItems: false
  }))

  const collectionQuery = useQuery(getAllPhotoCollectionsQueryOptions({
    siPaths: false,
    siSets: false,
    siTags: false
  }))

  const packagesQuery = useQuery(getAllPackagesQueryOptions({
    siPackageItems: undefined
  }))

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

  useEffect(() => {
    if(packageItemsInfiniteQuery.data && (packageItemsInfiniteQuery.data.pages.length ?? 0) > 0) {
      setAllPackageItems(packageItemsInfiniteQuery.data.pages[
        packageItemsInfiniteQuery.data.pages.length - 1
      ].memo)
    }
  }, [packageItemsInfiniteQuery.data])

  useEffect(() => {
    if(packagesQuery.data && packagesQuery.data.length > 0) {
      setPackages(packagesQuery.data)
    }
  }, [packagesQuery.data])

  useEffect(() => {
    if(tagsQuery.data) {
      if(!tags.some((tag) => tagsQuery.data.some((pTag) => pTag.id === tag.id)) ||
        !tagsQuery.data.some((pTag) => tags.some((tag) => tag.id === pTag.id))
      ) {
        setTags(tagsQuery.data)
      }
    }
  }, [tagsQuery.data])
  
  return (
    <>
      {activeConsole === 'builder' ? (
        <BuilderPanel 
          packages={packages}
          packagesQuery={packagesQuery}
          parentUpdatePackages={setPackages}
          tags={tags}
          parentUpdateTags={setTags}
          allPackageItems={allPackageItems}
          allPackageItemsQuery={packageItemsInfiniteQuery}
          collectionListQuery={collectionQuery}
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
