import { createFileRoute, redirect } from '@tanstack/react-router'
import { getClientAdvertiseList } from '../../../functions/packageFunctions'
import { getUserCollectionList } from '../../../functions/clientFunctions'
import { PackageItem } from '../../../types'
import { useQuery, UseQueryResult } from '@tanstack/react-query'
import { PackageService } from '../../../services/packageService'
import useWindowDimensions from '../../../hooks/windowDimensions'
import { useState } from 'react'
import { HiOutlineArrowLeftCircle, HiOutlineArrowRightCircle, HiOutlineXMark } from 'react-icons/hi2'
import { Badge, Carousel } from 'flowbite-react'
import { badgeColorThemeMap } from '../../../utils'
import { PackageCard } from '../../../components/common/package/PackageCard'
import { Schema } from '../../../../amplify/data/resource'
import { V6Client } from '@aws-amplify/api-graphql'

export const Route = createFileRoute('/_auth/client/dashboard/advertise')({
  component: RouteComponent,
  loader: ({ context }) => {
    const client = context.client as V6Client<Schema>
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
      collectionList: collectionList,
      PackageService: new PackageService(client),
    }
  }
})

function RouteComponent() {
  const data = Route.useLoaderData()
  const { width } = useWindowDimensions()
  const [selectedParent, setSelectedParent] = useState<string>(Object.keys(data.advertiseList)[0])
  const navigate = Route.useNavigate()


  const packageQueries: Record<string, UseQueryResult<PackageItem[] | undefined, Error>> = Object.fromEntries(
    Object.values(data.advertiseList)
      .flatMap((pack) => pack)
      .map((pack) => [
        pack.id,
        useQuery(
          data.PackageService.getAllPackageItemsQueryOptions(pack.id, { siCollectionItems: true })
        )
      ])
  )

  const currentParentPackage = data.advertiseList[selectedParent].find((pack) => pack.tagId === selectedParent)

  return (
    <div className='fixed w-screen h-screen top-0 left-0 flex flex-col items-center justify-center'>
      <div 
        className={`
          flex flex-col items-center justify-center mb-4 py-4 bg-white relative h-[85vh] overflow-y-auto
          ${width > 800 ? 'border-black border rounded-xl w-[90%] min-w-[550px] px-12' : 'border-y border-y-black w-full'}
        `}
      >
        <button onClick={() => navigate({ to: '/client/dashboard' })}>
          <HiOutlineXMark size={32} className='hover:text-gray-500 top-2 right-2 absolute'/>
        </button>
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
          grid w-full h-[70vh]
          ${width > 1550 ? 'grid-cols-2 gap-x-12 px-4' : 'gap-y-10'}  
        `}>
          {currentParentPackage ? (
            <div className='min-h-[500px]'>
              <PackageCard 
                package={{
                  ...currentParentPackage,
                  items: packageQueries[currentParentPackage.id].data ?? []
                }}
                collectionList={data.collectionList}
              />
            </div>
          ) : (
            <div className='border rounded-lg flex flex-col h-full w-full items-center py-4'>
              <span className='font-semibold'>No Selected Package</span>
            </div>
          )}
          <div className='flex flex-col items-center w-full h-full border rounded-lg min-h-[500px] mb-24'>
            <Carousel
              slide={false} 
              leftControl={data.advertiseList[selectedParent].length > 1 && (
                <HiOutlineArrowLeftCircle size={32} className='hover:fill-gray-100 hover:text-gray-500'/>
              )}
              rightControl={data.advertiseList[selectedParent].length > 1 && (
                <HiOutlineArrowRightCircle size={32} className='hover:fill-gray-100 hover:text-gray-500'/>
              )}
            >
              {data.advertiseList[selectedParent].map((pack, index) => (
                <div className='flex w-full h-full justify-center py-4' key={index}>
                  <div>
                    <PackageCard 
                      itemsLoading={packageQueries[pack.id].isLoading}
                      package={{
                        ...pack,
                        items: packageQueries[pack.id].data ?? []
                      }}
                      collectionList={data.collectionList}
                      maxHeight='max-h-[44vh]'
                    />
                  </div>
                </div>
              ))}
            </Carousel>            
          </div>
        </div>
      </div>
    </div>
  )
}
