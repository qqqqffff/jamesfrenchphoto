import { createFileRoute } from '@tanstack/react-router'
import { PackageItem } from '../../../types'
import useWindowDimensions from '../../../hooks/windowDimensions'
import { useEffect, useState } from 'react'
import { HiOutlineArrowLeftCircle, HiOutlineArrowRightCircle } from 'react-icons/hi2'
import { Badge } from 'flowbite-react'
import { badgeColorThemeMap } from '../../../utils'
import { PackageCard } from '../../../components/common/package/PackageCard'
import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { getAllPackageItemsQueryOptions } from '../../../services/packageService'
import Loading from '../../../components/common/Loading'
import { getUserCollectionList } from '../../../functions/clientFunctions'
import { getClientAdvertiseList } from '../../../functions/packageFunctions'

export const Route = createFileRoute('/_auth/client/dashboard/package')({
  component: RouteComponent,
  loader: ({ context }) => {
    return context.auth
  }
})

//TODO: preload the data in this route
function RouteComponent() {
  const data = Route.useLoaderData()
  const { width } = useWindowDimensions()
  const [selectedParent, setSelectedParent] = useState<string | undefined>()

  const userTags = data.user?.profile.activeParticipant?.userTags ?? []
  const advertiseList = getClientAdvertiseList(userTags)

  useEffect(() => {
    if(selectedParent === undefined) {
      setSelectedParent(Object.keys(advertiseList)[0])
    }
  }, [advertiseList])

  const packageQueries: Record<string, UseQueryResult<PackageItem[] | undefined, Error>> = Object.fromEntries(
    Object.values(advertiseList)
      .flatMap((pack) => pack)
      .map((pack) => [
        pack.id,
        useQuery(
          getAllPackageItemsQueryOptions(pack.id, { siCollectionItems: true })
        )
      ])
  )

  const collectionList = getUserCollectionList(
    data.user?.profile.activeParticipant?.collections,
    userTags,
  )

  return (
    <div className='flex flex-col items-center justify-center w-full'>
    <div 
      className={`
        flex flex-col items-center justify-center mb-4 overflow-auto py-4 mt-4 
        ${width > 800 ? 'border-black border rounded-xl w-[90%] min-w-[48rem] px-12' : 'border-y border-y-black w-full'}
      `}
    >
      <span className='text-lg italic font-light mb-2'>Package{(advertiseList[selectedParent ?? ''] ?? []).length > 1 ? 's' : ''} For</span>
      <div className='flex flex-row items-center justify-center w-full gap-4 mb-8'>
        {Object.keys(advertiseList).length > 1 && (
          <button
            onClick={() => {
              //find current index go to index - 1  with list wrapping
              const keySet = Object.keys(advertiseList)
              const currentIndex = keySet.findIndex((id) => id === selectedParent)
              const newIndex = currentIndex - 1 < 0 ? keySet.length - 1 : currentIndex - 1
              setSelectedParent(keySet[newIndex])
            }}
          >
            <HiOutlineArrowLeftCircle size={32} className='hover:fill-gray-100 hover:text-gray-500'/>
          </button>
        )}
        <Badge 
          theme={badgeColorThemeMap}
          color={userTags.find((tag) => tag.id === selectedParent)?.color}
          size='sm'
        >
          {userTags.find((tag) => tag.id === selectedParent)?.name}
        </Badge>
        {Object.keys(advertiseList).length > 1 && (
          <button
            onClick={() => {
              //find current index go to index + 1  with list wrapping
              const keySet = Object.keys(advertiseList)
              const currentIndex = keySet.findIndex((id) => id === selectedParent)
              const newIndex = currentIndex + 1 >= keySet.length ? 0 : currentIndex + 1
              setSelectedParent(keySet[newIndex])
            }}
          >
            <HiOutlineArrowRightCircle size={32} className='hover:fill-gray-100 hover:text-gray-500'/>
          </button>
        )}
      </div>
      <div 
        className={`
            grid ${width <= 1000 ? 'grid-cols-1' : width <= 1500 ? 'grid-cols-2' : 'grid-cols-3'}
            gap-x-10 gap-y-4
        `}
      >
        {(advertiseList[selectedParent ?? ''] ?? []).map((pack, index) => {
          if(packageQueries[pack.id].isLoading) {
            return (
              <span className="flex flex-row text-start gap-1 italic font-light" key={index}>
                <span>Loading</span>
                <Loading />
              </span>
            )
          }
          return (
            <PackageCard 
              key={index}
              package={{
                ...pack,
                items: packageQueries[pack.id].data ?? []
              }}
              //TODO: implement me
              collectionList={collectionList}
              // actionButton={(
              //   <Button 
              //     onClick={() => {
              //       //navigate to checkout with package as the search id
              //     }}
              //     size='sm'
              //   >
              //     Purchase
              //   </Button>
              // )}
            />
          )
        })}
      </div>
    </div>
    </div>
  )
}
