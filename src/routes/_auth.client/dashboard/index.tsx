import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PhotoCollection, UserTag } from '../../../types'
import { Alert } from 'flowbite-react'
import useWindowDimensions from '../../../hooks/windowDimensions'
import { useAuth } from '../../../auth'
import { CollectionThumbnail } from '../../../components/admin/collection/CollectionThumbnail'
import { useQueries, useQuery } from '@tanstack/react-query'
import { getParticipantCollectionsQueryOptions, getPathQueryOptions } from '../../../services/collectionService'
import { currentDate } from '../../../utils'

export const Route = createFileRoute('/_auth/client/dashboard/')({
  component: RouteComponent,
})

function RouteComponent() {
  const auth = useAuth()
  const dimensions = useWindowDimensions()
  const navigate = useNavigate()
  const { width } = useWindowDimensions()

  const participantCollections = useQuery(
    getParticipantCollectionsQueryOptions(
      auth.user?.profile.activeParticipant?.id, 
      { siPaths: false, siSets: false, siTags: false }
    )
  )

  const tags: UserTag[] = auth.user?.profile.activeParticipant?.userTags ?? []

  const collections = tags
    .flatMap((tag) => tag.collections)
    .filter((collection) => collection?.published)
    .filter((collection) => collection !== undefined)
    .reduce((prev, cur) => {
      if(!prev.some((collection) => collection.id === cur.id)){
        prev.push(cur)
      }
      return prev
    }, [] as PhotoCollection[])

  if(participantCollections.data) {
    collections.push(...participantCollections.data
      .reduce((prev, cur) => {
        if(!prev.some((collection) => collection.id === cur.id)) {
          prev.push(cur)
        }
        return prev
      }, [] as PhotoCollection[])
    )
  }

  const collectionCovers = useQueries({
    queries: collections.map((collection) => {
      return getPathQueryOptions(collection.coverPath, collection.id)
    })
  }).map((query, index) => {
    return ({
      id: collections[index].id,
      query: query
    })
  })

  return (
    <>
      <div className='flex flex-col w-full items-center justify-center mt-4'>
        <div className={`
          flex flex-col items-center justify-center gap-4 mb-4 overflow-auto 
          ${width > 800 ? 'border-black border rounded-xl w-[60%] max-w-[64rem]' : 'border-y border-y-black w-full'}
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
            {/* notifications will display here */}
          </div>
          
          <span className="text-3xl border-b border-b-gray-400 pb-2 px-4">Your Collections:</span>
          
          {collections.filter((collection) => collection.published).length > 0 ? (
            <div className={`grid grid-cols-${dimensions.width > 700 && collections.length !== 1 ? '2' : '1'} gap-10 mb-4`}>
              {collections
                .filter((collection) => collection.published)
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((collection, index) => {
                  const coverPath = collectionCovers.find((col) => col.id === collection.id)
                  return (
                    <CollectionThumbnail 
                      collectionId={collection.id} 
                      cover={coverPath?.query}
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
        </div>
      </div>
    </>
  )
}
