import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { UserTag } from '../../../types'
import { Alert, Badge } from 'flowbite-react'
import useWindowDimensions from '../../../hooks/windowDimensions'
import { useAuth } from '../../../auth'
import { CollectionThumbnail } from '../../../components/admin/collection/CollectionThumbnail'
import { useQueries, useQuery } from '@tanstack/react-query'
import { CollectionService } from '../../../services/collectionService'
import { badgeColorThemeMap, currentDate } from '../../../utils'
import { getUserCollectionList } from '../../../functions/clientFunctions'
import { getClientAdvertiseList, getClientPackages } from '../../../functions/packageFunctions'
import { useState } from 'react'
import { HiOutlineArrowLeftCircle, HiOutlineArrowRightCircle } from 'react-icons/hi2'
import { PackageCard } from '../../../components/common/package/PackageCard'
import { getAllPackageItemsQueryOptions } from '../../../services/packageService'
import { V6Client } from '@aws-amplify/api-graphql'
import { Schema } from '../../../../amplify/data/resource'

export const Route = createFileRoute('/_auth/client/dashboard/')({
  component: RouteComponent,
  loader: ({ context }) => {
    const client = context.client as V6Client<Schema>
    return {
      CollectionService: new CollectionService(client)
    }
  }
})

function RouteComponent() {
  const data = Route.useLoaderData()
  const auth = useAuth()
  const tags: UserTag[] = auth.user?.profile.activeParticipant?.userTags ?? []
  const packageList = getClientPackages(tags)
  const advertiseList = getClientAdvertiseList(tags)
  
  const dimensions = useWindowDimensions()
  const navigate = useNavigate()
  const { width } = useWindowDimensions()

  const [selectedParentTagId, setSelectedParentTagId] = useState<string | undefined>(Object.keys(packageList)[0])

  const collections = getUserCollectionList(
    auth.user?.profile.activeParticipant?.collections,
    tags
  )

  const collectionCoverQueries = useQueries({
    queries: collections.map((collection) => data.CollectionService.getPathQueryOptions(collection.coverPath, collection.id))
  })

  const collectionCovers = Object.fromEntries(
    collections.map((collection, index) => [
      collection.id,
      collectionCoverQueries[index]
    ])
  )

  const packageItems = useQuery({
    ...getAllPackageItemsQueryOptions(packageList[selectedParentTagId ?? '']?.id),
    enabled: selectedParentTagId !== undefined
  })

  return (
    <>
      <div className='flex flex-col w-full items-center justify-center mt-4 relative'>
        <div className={`
          flex flex-col items-center justify-center gap-4 mb-4 overflow-auto 
          ${width > 800 ? (
            `border-black border rounded-xl ${ width > 1600 ? 'w-[60%]' : width > 1400 ? 'w-[70%]' : width > 1200 ? 'w-[80%]' : 'w-[90%]' } max-w-[64rem]`
          ) : (
            'border-y border-y-black w-full'
          )}
        `}>
          <div className="flex flex-col items-center justify-center w-full">
            {(auth.user?.profile.activeParticipant?.notifications ?? [])
              .filter((notification) => 
                !notification.expiration || 
                currentDate.getTime() < new Date(notification.expiration).getTime())
              .map((notification, index) => {
                return (
                  <Alert color="gray" key={index} className='w-full'>
                    {notification.content}
                  </Alert>
                )
              })
            }
          </div>
          <span className="text-3xl border-b border-b-gray-400 pb-2 px-4">Your Collections</span>
          {collections.filter((collection) => collection.published).length > 0 ? (
            <div className={`grid grid-cols-${dimensions.width > 900 && collections.length !== 1 ? '2' : '1'} gap-x-10 gap-y-6 mb-4`}>
              {collections
                .filter((collection) => collection.published)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((collection, index) => {
                  const coverPath = collectionCovers[collection.id]
                  return (
                    <CollectionThumbnail 
                      CollectionService={data.CollectionService}
                      collectionId={collection.id} 
                      cover={coverPath}
                      key={index} 
                      onClick={() => {
                        navigate({ to: `/photo-collection/${collection.id}`})
                      }}
                      contentChildren={(
                        <div className='font-thin font-bodoni opacity-90 text-gray-500 italic'>
                          <p>{collection.name}</p>
                        </div>
                      )}
                    />
                  )
                }
              )}
            </div>
          ) : (
            <div className="text-xl text-gray-400 italic flex flex-col text-center mb-4">
              <span>Sorry, there are no viewable collections for you right now.</span>
              <span>You will receive a notification when your collection is ready!</span>
            </div>
          )}
          {Object.keys(packageList).length > 0 && (
            <>
              <span className="text-3xl border-b border-b-gray-400 pb-2 px-4">Your Package For</span>
              {selectedParentTagId && advertiseList[selectedParentTagId] !== undefined && (
                <button>
                  <Badge 
                    color='gray' 
                    className='hover:bg-gray-300 animate-pulse' 
                    onClick={() => navigate({ to: '/client/dashboard/package', search: { id: selectedParentTagId } })}
                  >Upgrade</Badge>
                </button>
              )}
              <div className='flex flex-row items-center justify-center w-full gap-4'>
                {Object.keys(packageList).length > 1 && (
                  <button
                    onClick={() => {
                      //find current index go to index - 1  with list wrapping
                      const keySet = Object.keys(packageList)
                      const currentIndex = keySet.findIndex((id) => id === selectedParentTagId)
                      const newIndex = currentIndex - 1 < 0 ? keySet.length - 1 : currentIndex - 1
                      setSelectedParentTagId(keySet[newIndex])
                    }}
                  >
                    <HiOutlineArrowLeftCircle size={32} className='hover:fill-gray-100 hover:text-gray-500'/>
                  </button>
                )}
                <Badge 
                  theme={badgeColorThemeMap}
                  color={tags.find((tag) => tag.id === selectedParentTagId)?.color}
                  size='lg'
                >
                  {tags.find((tag) => tag.id === selectedParentTagId)?.name}
                </Badge>
                {Object.keys(packageList).length > 1 && (
                  <button
                    onClick={() => {
                      //find current index go to index + 1  with list wrapping
                      const keySet = Object.keys(packageList)
                      const currentIndex = keySet.findIndex((id) => id === selectedParentTagId)
                      const newIndex = currentIndex + 1 >= keySet.length ? 0 : currentIndex + 1
                      setSelectedParentTagId(keySet[newIndex])
                    }}
                  >
                    <HiOutlineArrowRightCircle size={32} className='hover:fill-gray-100 hover:text-gray-500'/>
                  </button>
                )}
              </div>
              {selectedParentTagId && packageList[selectedParentTagId] !== undefined ? (
                <PackageCard 
                  package={{
                    ...packageList[selectedParentTagId],
                    items: packageItems.data ?? []
                  }}
                  itemsLoading={packageItems.isLoading}
                  collectionList={collections}
                />
              ) : (
                <div className='flex flex-col h-full w-full items-center py-4'>
                  <span className='font-semibold'>No Selected Package</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
