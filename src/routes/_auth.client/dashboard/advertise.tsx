import { createFileRoute, redirect } from '@tanstack/react-router'
import { getClientAdvertiseList } from '../../../functions/packageFunctions'
import { getUserCollectionList } from '../../../functions/clientFunctions'
import { PackageItem } from '../../../types'
import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { getAllPackageItemsQueryOptions } from '../../../services/packageService'
import useWindowDimensions from '../../../hooks/windowDimensions'
import { useState } from 'react'
import { HiOutlineArrowLeftCircle, HiOutlineArrowRightCircle } from 'react-icons/hi2'
import { Badge } from 'flowbite-react'
import { badgeColorThemeMap } from '../../../utils'
import { PackageCard } from '../../../components/common/package/PackageCard'

export const Route = createFileRoute('/_auth/client/dashboard/advertise')({
  component: RouteComponent,
  loader: ({ context }) => {
    const tags = context.auth.user?.profile.activeParticipant?.userTags ?? []
    const advertiseList = getClientAdvertiseList(tags, true)

    if(Object.keys(advertiseList).reduce((prev, cur) => {
      if(!prev) return false
      else if((advertiseList[cur] ?? []).length > 0) return false
      return prev
    }, true)) {
      throw redirect({ to: '/client/dashboard' })
    }

    const collectionList = getUserCollectionList(
      context.auth.user?.profile.activeParticipant?.collections,
      tags,
    )

    return {
      tags: tags,
      advertiseList: advertiseList,
      collectionList: collectionList
    }
  }
})

function RouteComponent() {
  const data = Route.useLoaderData()
  const { width } = useWindowDimensions()
  const [selectedParent, setSelectedParent] = useState<string>(Object.keys(data.advertiseList)[0])
  const [currentPackage, setCurrentPackage] = useState<string>()


  const packageQueries: Record<string, UseQueryResult<PackageItem[] | undefined, Error>> = Object.fromEntries(
    Object.values(data.advertiseList)
      .flatMap((pack) => pack)
      .map((pack) => [
        pack.id,
        useQuery(
          getAllPackageItemsQueryOptions(pack.id, { siCollectionItems: true })
        )
      ])
  )

  const currentParentPackage = data.advertiseList[selectedParent].find((pack) => pack.tagId === selectedParent)

  return (
    <div className='fixed border-4 w-screen h-screen top-0 left-0 flex flex-col items-center justify-center'>
      <div 
        className={`
          flex flex-col items-center justify-center mb-4 overflow-auto py-4 mt-4 
          ${width > 800 ? 'border-black border rounded-xl w-[90%] min-w-[550px] px-12' : 'border-y border-y-black w-full'}
        `}
      >
        <span className='text-2xl italic mb-2'>Upgrade your Package{(data.advertiseList[selectedParent ?? ''] ?? []).length > 1 ? 's' : ''}</span>
        <div className='flex flex-row items-center justify-center w-full gap-4 mb-8'>
          {Object.keys(data.advertiseList).length > 1 && (
            <button
              onClick={() => {
                //find current index go to index - 1  with list wrapping
                const keySet = Object.keys(data.advertiseList)
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
            color={data.tags.find((tag) => tag.id === selectedParent)?.color}
            size='lg'
          >
            {data.tags.find((tag) => tag.id === selectedParent)?.name}
          </Badge>
          {Object.keys(data.advertiseList).length > 1 && (
            <button
              onClick={() => {
                //find current index go to index + 1  with list wrapping
                const keySet = Object.keys(data.advertiseList)
                const currentIndex = keySet.findIndex((id) => id === selectedParent)
                const newIndex = currentIndex + 1 >= keySet.length ? 0 : currentIndex + 1
                setSelectedParent(keySet[newIndex])
              }}
            >
              <HiOutlineArrowRightCircle size={32} className='hover:fill-gray-100 hover:text-gray-500'/>
            </button>
          )}
        </div>
        <div className={`
          grid 
          ${width > 800 ? 'grid-cols-2 gap-x-12 px-4' : ''}  
        `}>
          {currentParentPackage ? (
            <PackageCard 
              package={currentParentPackage}
              collectionList={data.collectionList}
            />
          ) : (
            <span>No Selected Package</span>
          )}
          <div>
            <div className='flex flex-row items-center justify-center w-full'>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
