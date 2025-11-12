import { createFileRoute, redirect } from '@tanstack/react-router'
import { CollectionService } from '../services/collectionService'
import { PhotoSet, UserProfile } from '../types'
import { useEffect, useRef, useState } from 'react'
import useWindowDimensions from '../hooks/windowDimensions'
import { Button } from 'flowbite-react'
import { useQuery } from '@tanstack/react-query'
import { SetCarousel } from '../components/collection/SetCarousel'
import { HiOutlineArrowLeft, HiOutlineArrowRight } from 'react-icons/hi2'
import { UnauthorizedEmailModal } from '../components/modals'
import { Cover } from '../components/collection/Cover'
import { CollectionGrid } from '../components/collection/CollectionGrid'
import { Schema } from '../../amplify/data/resource'
import { V6Client } from '@aws-amplify/api-graphql'
import { PhotoPathService } from '../services/photoPathService'
import { PhotoSetService } from '../services/photoSetService'
import { UserService } from '../services/userService'

interface PhotoCollectionParams {
  set?: string,
}

export const Route = createFileRoute('/_auth/photo-collection/$id')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): PhotoCollectionParams => ({
    set: (search.set as string) || undefined,
  }),
  beforeLoad: ({ search }) => search,
  loader: async ({ context, params }) => {
    const client = context.client as V6Client<Schema>
    const collectionService = new CollectionService(client)
    const destination = `/${context.auth.admin ? 'admin' : 'client'}/dashboard`
    if(!params.id) throw redirect({ to: destination })
    

    const collection = await context.queryClient.ensureQueryData(
      collectionService.getPhotoCollectionByIdQueryOptions(params.id, { 
        participantId: context.auth.user?.profile.activeParticipant?.id, 
        siSets: true, 
        siPaths: false,
        unauthenticated: context.temporaryToken !== undefined,
      })
    )

    if(
      !collection || (
        (collection.sets.length === 0 || !collection.published) &&
        !context.auth.admin
      )
    ) throw redirect({ to: destination })
    console.log('det')

    const coverUrl = (await context.queryClient.ensureQueryData(
      collectionService.getPathQueryOptions(collection.coverPath ?? '')
    ))?.[1]
    
    if(!coverUrl && !context.auth.admin) throw redirect({ to: destination })

    return {
      CollectionService: collectionService,
      PhotoPathService: new PhotoPathService(client),
      PhotoSetService: new PhotoSetService(client),
      UserService: new UserService(client),
      collection: collection,
      auth: context.auth,
      coverPath: coverUrl,
      token: context.temporaryToken,
      setId: context.set
    }
  },
  wrapInSuspense: true
})

function RouteComponent() {
  const data = Route.useLoaderData()
  const collection = data.collection
  const dimensions = useWindowDimensions()
  const [tempUser, setTempUser] = useState<UserProfile>()
  
  const [set, setSet] = useState<PhotoSet>(collection.sets.find((set) => set.id === data.setId) ?? collection.sets[0])

  const watermarkQuery = useQuery(
    data.CollectionService.getPathQueryOptions(set.watermarkPath ?? collection.watermarkPath, collection.id)
  )

  const [watermarkPath, setWatermarkPath] = useState<string | undefined>()

  useEffect(() => {
    if(watermarkQuery.data) {
      setWatermarkPath(watermarkQuery.data[1])
    }
  }, [watermarkQuery.data])

  useEffect(() => {
    setSet(collection.sets.find((set) => set.id === data.setId) ?? collection.sets[0])
  }, [data.setId])

  
  const [emailInputVisible, setEmailInputVisible] = useState(data.token !== undefined)
  const [resetGridIndex, setResetGridIndex] = useState(false)

  const navigate = Route.useNavigate()
  const coverPhotoRef = useRef<HTMLImageElement | null>(null)
  const collectionRef = useRef<HTMLDivElement | null>(null)
  const navigateControls = data.auth.admin

  const gridRef = useRef<HTMLDivElement | null>(null)
  
  useEffect(() => {
    if(coverPhotoRef && coverPhotoRef.current) {
      coverPhotoRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [coverPhotoRef.current])

  useEffect(() => {
    if(!tempUser && !data.auth.isAuthenticated && !emailInputVisible){
      throw redirect({ to: '/login', search: { unauthorized: true }})
    }
  }, [tempUser])

  const currentIndex = collection.sets.findIndex((colSet) => colSet.id === set.id)

  return (
    <>
      {/* TODO: update this modal please and thank you */}
      <UnauthorizedEmailModal 
        UserService={data.UserService}
        onClose={() => {
          setEmailInputVisible(false)
          throw redirect({ to: '/login', search: { unauthorized: true }})
        }}
        open={emailInputVisible}
        onSubmit={(data) => {
          if(data) {
            setTempUser(data)
          }
          else {
            throw redirect({ to: '/login', search: { unauthorized: true }})
          }
        }}
      />
      <div 
        className="font-bodoni" 
        onContextMenu={(e) => {
          if(!collection.downloadable) e.preventDefault()
        }}
      >
        <div className="flex flex-row justify-center mb-10">
          {data.token === undefined && (
            <Button 
              className='mt-4' 
              onClick={() => 
                navigateControls ? (
                  navigate({
                    to: '/admin/dashboard/collection',
                    search: { set: set.id, collection: collection.id }
                  })
                ) : (
                  navigate({
                    to: '/client/dashboard'
                  }) 
                )
              }
            >
              {navigateControls ? 'Return to Admin Console' : 'Return Home'}
            </Button>
          )}
        </div>
        <Cover 
          path={data.coverPath}
          collection={collection}
          collectionRef={collectionRef}
          coverRef={coverPhotoRef}
        />
        <div className='flex flex-row items-center px-8 sticky gap-2 top-0 z-10 bg-white py-1 border-b-gray-300 border-b' ref={collectionRef}>
          {dimensions.width > 800 && (
            <div className='flex flex-col items-start font-bodoni'>
              <span className='font-bold text-lg whitespace-nowrap'>James French Photograpahy</span>
              <span className='italic text-sm'>{collection.name}</span>
              <span className='text-sm'>{set.name}</span>
            </div>
          )}
          <div 
            className='flex flex-row w-full justify-between col-span-2 me-10'
            style={{ maxWidth: dimensions.width - 300 }}
          >
            <button 
              className='text-gray-700 rounded-lg p-1 z-50 hover:text-gray-500 bg-white'
              onClick={() => {
                const nextIndex = currentIndex - 1 < 0 ? collection.sets.length - 1 : currentIndex - 1
                const set = collection.sets[nextIndex]
                const refObject = gridRef.current
                if(refObject) {
                  refObject.scrollIntoView({ block: 'start', behavior: 'smooth' })
                }

                navigate({ to: '.', search: { set: set.id, temporaryToken: data.token }})

                setSet({...collection.sets[nextIndex]})
              }}
            >
              <HiOutlineArrowLeft size={24} />
            </button>
            <SetCarousel 
              setList={collection.sets}
              setSelectedSet={(set) => {
                const refObject = gridRef.current
                if(refObject) {
                  refObject.scrollIntoView({ block: 'start', behavior: 'smooth' })
                }
                navigate({ to: '.', search: { set: set.id, temporaryToken: data.token }})

                setSet(set)
              }}
              selectedSet={set}
              currentIndex={currentIndex}
            />
            <button className='text-gray-700 rounded-lg p-1 z-50 hover:text-gray-500 bg-white'
              onClick={() => {
                const nextIndex = currentIndex + 1 >= collection.sets.length ? 0 : currentIndex + 1
                const set = collection.sets[nextIndex]
                const refObject = gridRef.current
                if(refObject) {
                  refObject.scrollIntoView({ block: 'start', behavior: 'smooth' })
                }

                navigate({ to: '.', search: { set: set.id, temporaryToken: data.token }})

                setSet(set)
              }}
            >
              <HiOutlineArrowRight size={24} />
            </button>
          </div>
        </div>
        <CollectionGrid 
          PhotoPathService={data.PhotoPathService}
          PhotoSetService={data.PhotoSetService}
          set={set}
          CollectionService={data.CollectionService}
          collection={collection}
          tempUser={tempUser}
          data={{
            auth: data.auth,
            token: data.token
          }}
          watermarkPath={watermarkPath}
          watermarkQuery={watermarkQuery}
          gridRef={gridRef}
          parentUpdateSet={setSet}
          resetOffsets={resetGridIndex}
          completeOffsetReset={setResetGridIndex}
        /> 
        <div className="w-full flex flex-row items-center justify-center">
          <Button
            color='light'
            className="m-4 self-center"
            onClick={() => {
              if(gridRef && gridRef.current){
                setResetGridIndex(true)
                gridRef.current.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start'
                })
              }
            }}
          >Return to Top</Button>
        </div>
      </div>
    </>
  )
}
