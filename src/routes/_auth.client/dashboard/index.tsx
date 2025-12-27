import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Package, Timeslot, UserTag } from '../../../types'
import { Alert, Badge } from 'flowbite-react'
import useWindowDimensions from '../../../hooks/windowDimensions'
import { useAuth } from '../../../auth'
import { CollectionThumbnail } from '../../../components/admin/collection/CollectionThumbnail'
import { useMutation, useQueries, useQuery } from '@tanstack/react-query'
import { CollectionService } from '../../../services/collectionService'
import { badgeColorThemeMap, currentDate, formatTimeslotDates } from '../../../utils'
import { getUserCollectionList } from '../../../functions/clientFunctions'
import { getClientAdvertiseList, getClientPackages } from '../../../functions/packageFunctions'
import { useState } from 'react'
import { HiOutlineArrowLeftCircle, HiOutlineArrowRightCircle } from 'react-icons/hi2'
import { PackageCard } from '../../../components/common/package/PackageCard'
import { PackageService } from '../../../services/packageService'
import { V6Client } from '@aws-amplify/api-graphql'
import { Schema } from '../../../../amplify/data/resource'
import { RegisterTimeslotMutationParams, TimeslotService } from '../../../services/timeslotService'
import { CgSpinner } from 'react-icons/cg'

export const Route = createFileRoute('/_auth/client/dashboard/')({
  component: RouteComponent,
  loader: ({ context }) => {
    const client = context.client as V6Client<Schema>
    return {
      CollectionService: new CollectionService(client),
      PackageService: new PackageService(client),
      TimeslotService: new TimeslotService(client)
    }
  }
})

function RouteComponent() {
  const data = Route.useLoaderData()
  const auth = useAuth()
  const tags: UserTag[] = auth.user?.profile.activeParticipant?.userTags ?? []
  const packageList: Record<string, Package | undefined> = getClientPackages(tags)
  const advertiseList = getClientAdvertiseList(tags)
  
  const dimensions = useWindowDimensions()
  const navigate = useNavigate()
  const { width } = useWindowDimensions()
  const [clientMessages, setClientMessages] = useState<{ status: "Success" | 'Fail', error?: string }>()

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
    ...data.PackageService.getAllPackageItemsQueryOptions(packageList[selectedParentTagId ?? '']?.id),
    enabled: selectedParentTagId !== undefined
  })

  const registeredTimeslots = auth.user?.profile.activeParticipant?.timeslot ?? []
  const registrationAvailable = tags.map((tag) => ({
    //some timeslot where the date is after today
    timeslotAvailable: (tag.timeslots ?? []).filter((timeslot) => new Date(timeslot.start).getTime() > currentDate.getTime()).length > 0 &&
      //the tag is not in the registrations
      !registeredTimeslots.some((timeslot) => timeslot.tag?.id === tag.id) && 
      !(tag.timeslots ?? []).some((tagTimeslot) => registeredTimeslots.some((timeslot) => timeslot.id === tagTimeslot.id)),
    tag: tag
  }))

  const unregisterTimeslot = useMutation({
    mutationFn: (params: RegisterTimeslotMutationParams) => data.TimeslotService.registerTimeslotMutation(params)
  })

  console.log(tags.map((tag) => !(tag.timeslots ?? []).some((tagTimeslot) => registeredTimeslots.some((timeslot) => timeslot.id === tagTimeslot.id))), registrationAvailable)


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
          {clientMessages !== undefined && (
            <div className={`relative top-8 w-[80%] z-10`}>
              <Alert 
                color={clientMessages.status === 'Success' ? 'green' : 'red'}
                className='absolute w-full opacity-80'
                onDismiss={() => {
                  setClientMessages(undefined)
                }}
              >{clientMessages.status === 'Success' ? 'Successfully unregistered your timeslot' : clientMessages.error ?? 'Failed to register. Please try again later.'}</Alert>
            </div>
          )} 
          <div className="flex flex-col items-center justify-center w-full px-2 py-2 gap-2">
            {(auth.user?.profile.activeParticipant?.notifications ?? [])
              .filter((notification) => 
                !notification.expiration || 
                currentDate.getTime() < new Date(notification.expiration).getTime())
              .map((notification, index) => {
                return (
                  <Alert color="gray" key={index} className='w-full items-center text-lg border'>
                    {notification.content}
                  </Alert>
                )
              })
            }
          </div>
          {registrationAvailable.length > 0 && (
            <>
              <span className="text-3xl border-b border-b-gray-400 pb-2 px-4 w-fit self-center">Your Timeslots</span>
              <div className='flex flex-col justify-center w-fit items-center border rounded-lg px-10 py-5 gap-4'>
                {registrationAvailable.sort((a, b) => {
                  if(a.timeslotAvailable && b.timeslotAvailable) return 0
                  if(!a.timeslotAvailable && b.timeslotAvailable) return -1
                  return 1
                }).map((registration) => {
                  const foundTimeslot = (registration.tag.timeslots ?? []).find((timeslot) => registeredTimeslots.some((registeredTimeslot) => registeredTimeslot.id === timeslot.id))
                  const mappedTimeslot: Timeslot | undefined = foundTimeslot ? {
                    ...foundTimeslot,
                    tag: registration.tag
                  } : undefined
                  return (
                    mappedTimeslot !== undefined 
                  ? (
                    <div className={`flex flex-row items-center gap-1`}>
                      <span>Registration for</span>
                      <span className={`text-${registration.tag.color ?? 'black'} underline`}>{registration.tag.name}:</span>
                      <button
                        disabled={unregisterTimeslot.isPending}
                        className={`
                          flex flex-row items-center enabled:hover:line-through 
                          text-${registration.tag.color ?? 'black'} 
                          border rounded-lg px-2 py-1 ms-2 disabled:text-gray-400 disabled:cursor-not-allowed
                          enabled:hover:bg-gray-100 enabled:hover:border-gray-400
                        `}
                        onClick={() => {
                          if(
                            auth.user?.profile.activeParticipant?.id !== undefined &&
                            auth.user?.profile.activeParticipant?.id === mappedTimeslot.participantId &&
                            auth.user?.profile.email !== undefined
                          ) {
                            unregisterTimeslot.mutateAsync({
                              timeslot: mappedTimeslot,
                              unregister: true,
                              participantId: auth.user.profile.activeParticipant.id,
                              userEmail: auth.user.profile.email,
                              notify: false,
                              additionalRecipients: []
                            }).then((response) => {
                              if(response.status === 'Success' && auth.user?.profile.activeParticipant) {
                                const updatedTimeslot = (auth.user?.profile.activeParticipant?.timeslot ?? [])
                                  .filter((timeslot) => timeslot.id !== mappedTimeslot.id)

                                auth.updateProfile({
                                  ...auth.user.profile,
                                  participant: auth.user.profile.participant.map((participant) => participant.id === auth.user?.profile.activeParticipant?.id ? ({
                                    ...participant,
                                    timeslot: updatedTimeslot
                                  }) : participant),
                                  activeParticipant: {
                                    ...auth.user.profile.activeParticipant,
                                    timeslot: updatedTimeslot
                                  }
                                })
                              }
                              
                              setClientMessages(response)
                            }).catch(() => {
                              setClientMessages({ status: 'Fail', error: 'Failed to unregister from your timeslot. Please try again later.'})
                            })
                          }
                        }}
                      >
                        {unregisterTimeslot.isPending && (<CgSpinner size={20} className='animate-spin text-gray-500'/>)}
                        <span>{new Date(mappedTimeslot.start).toLocaleDateString('en-us', { timeZone: 'America/Chicago' })} at {formatTimeslotDates(mappedTimeslot)}</span>
                      </button>
                    </div>
                  ) : (
                    <div className={`flex flex-row items-center gap-1`}>
                      <span>Registration available for:</span>
                      <button 
                        onClick={() => navigate({ to: '/client/dashboard/scheduler', search: { tagId: registration.tag.id }})}
                        className={`text-${registration.tag.color ?? 'black'} hover:underline border rounded-lg px-2 py-1 ms-2 hover:bg-gray-100 hover:border-gray-400`}
                      >{registration.tag.name}</button>
                    </div>
                  ))
                })}
              </div>
            </>
          )}
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
                    className='hover:bg-gray-300 animate-pulse border border-black' 
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
