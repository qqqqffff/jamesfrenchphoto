import { createFileRoute, invariant, redirect, useNavigate } from '@tanstack/react-router'
import { getPhotoCollectionByIdQueryOptions, getPathQueryOptions } from '../services/collectionService'
import { favoriteImageMutation, FavoriteImageMutationParams, getAllPicturePathsByPhotoSetQueryOptions, unfavoriteImageMutation, UnfavoriteImageMutationParams } from '../services/photoSetService'
import { PhotoCollection, PhotoSet, PicturePath, UserProfile } from '../types'
import { useEffect, useRef, useState } from 'react'
import useWindowDimensions from '../hooks/windowDimensions'
import { Button } from 'flowbite-react'
import { useMutation, useQueries } from '@tanstack/react-query'
import { SetCarousel } from '../components/collection/SetCarousel'
import { CgArrowsExpandRight } from 'react-icons/cg'
import { HiOutlineArrowLeft, HiOutlineArrowRight, HiOutlineHeart } from 'react-icons/hi2'
import { downloadImageMutation, DownloadImageMutationParams } from '../services/photoPathService'
import { HiOutlineDownload } from 'react-icons/hi'
import { UnauthorizedEmailModal } from '../components/modals'

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
    const destination = `/${context.auth.admin ? 'admin' : 'client'}/dashboard`
    if(!params.id) throw redirect({ to: destination })
    const collection = await context.queryClient.ensureQueryData(
      getPhotoCollectionByIdQueryOptions(params.id, { 
        user: context.auth.user?.profile.email, 
        siSets: true, 
        siPaths: true,
        unauthenticated: context.temporaryToken !== undefined,
      })
    )

    if((!collection || collection.sets.length === 0 || !collection.published) && !context.auth.admin) throw redirect({ to: destination })
    invariant(collection)

    const set = collection.sets.find((set) => set.id === context.set)
    const watermarkUrl = (collection.watermarkPath !== undefined || set?.watermarkPath !== undefined) ?  (
      await context.queryClient.ensureQueryData(
        getPathQueryOptions(set?.watermarkPath ?? collection.watermarkPath ?? '')))?.[1] : undefined
    const coverUrl = (await context.queryClient.ensureQueryData(
      getPathQueryOptions(collection.coverPath ?? '')
    ))?.[1]
    const paths = (await context.queryClient.ensureQueryData(
      getAllPicturePathsByPhotoSetQueryOptions(set?.id ?? collection.sets[0].id, { 
        user: context.auth.user?.profile.email,
        unauthenticated: context.temporaryToken !== undefined,
      })
    ))
    if(!coverUrl && !context.auth.admin) throw redirect({ to: destination })

    const mappedCollection: PhotoCollection = {
      ...collection,
      watermarkPath: watermarkUrl,
    }

    const mappedSet: PhotoSet = {
      ...(set ?? collection.sets[0]),
      paths: paths ?? [],
    }

    return {
      collection: mappedCollection,
      set: mappedSet,
      auth: context.auth,
      coverPath: coverUrl,
      token: context.temporaryToken
    }
  },
  wrapInSuspense: true
})

function RouteComponent() {
  const data = Route.useLoaderData()
  const collection = data.collection
  const [set, setSet] = useState(data.set)
  const [currentControlDisplay, setCurrentControlDisplay] = useState<string>()
  const [tempUser, setTempUser] = useState<UserProfile>()
  const [emailInputVisible, setEmailInputVisible] = useState(data.token !== undefined)

  const navigate = useNavigate()
  const coverPhotoRef = useRef<HTMLImageElement | null>(null)
  const collectionRef = useRef<HTMLDivElement | null>(null)
  const navigateControls = data.auth.admin
  const dimensions = useWindowDimensions()

  useEffect(() => {
    if(coverPhotoRef && coverPhotoRef.current) {
      coverPhotoRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    if(!tempUser && !data.auth.isAuthenticated && !emailInputVisible){
      throw redirect({ to: '/login', search: { unauthorized: true }})
    }
  }, [coverPhotoRef.current, tempUser])

  const paths = useQueries({
    queries: set.paths.map((path) => (
      getPathQueryOptions(path.path, path.id)
    ))
  })

  const formattedCollection: PicturePath[][] = []
  let maxIndex = (dimensions.width > 1600 ? 5 : (
    dimensions.width > 800 ? 
      3 : 1
  ))
  for(let i = 0; i < maxIndex; i++){
    formattedCollection.push([] as PicturePath[])
  }

  let curIndex = 0
  set.paths
    .sort((a, b) => a.order - b.order)
    .forEach((picture) => {
      formattedCollection[curIndex].push(picture)
      if(curIndex + 2 > maxIndex){
        curIndex = 0
      }
      else{
        curIndex = curIndex + 1
      }
    })

  const gridClass = `grid grid-cols-${String(maxIndex)} gap-4 mx-4 mt-1`

  function controlsEnabled(id: string){
    if(id === currentControlDisplay) return 'flex'
    return 'hidden'
  }

  const currentIndex = collection.sets.findIndex((colSet) => colSet.id === set.id)

  const favorite = useMutation({
    mutationFn: (params: FavoriteImageMutationParams) => favoriteImageMutation(params),
    onSettled: (favorite) => {
      if(favorite) {
        setSet({
          ...set,
          paths: set.paths.map((path) => {
            if(path.id === favorite[1]){
              return ({
                ...path,
                favorite: favorite[0]
              })
            }
            return path
          })
        })
      }
    }
  })

  const unfavorite = useMutation({
    mutationFn: (params: UnfavoriteImageMutationParams) => unfavoriteImageMutation(params)
  })

  const downloadImage = useMutation({
    mutationFn: (params: DownloadImageMutationParams) => downloadImageMutation(params),
    onSettled: (file) => {
      if(file){
        try{
          const url = window.URL.createObjectURL(file)
          const link = document.createElement('a')
          link.href = url
          link.download = file.name
          link.click()
          window.URL.revokeObjectURL(url)
        }catch(error){
          console.error(error)
        }
      }
    }
  })

  return (
    <>
      <UnauthorizedEmailModal 
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
                navigate({ 
                  to: `/${navigateControls ? 'admin' : 'client'}/dashboard${navigateControls ? '/collection' : ''}`, 
                  search: { set: navigateControls ? set.id : undefined, collection: navigateControls ? collection.id : undefined } 
                })
              }
            >
              {navigateControls ? 'Return to Admin Console' : 'Return Home'}
            </Button>
          )}
        </div>
        <div className="flex flex-row justify-center items-center mb-2 relative bg-gray-200">
          <div className="absolute flex flex-col inset-0 place-self-center text-center items-center justify-center">
            <div className='bg-white bg-opacity-30 flex flex-col gap-2 px-10 py-4'>
              <p className={`${dimensions.width > 1600 ? "text-7xl" : 'text-5xl' } font-thin font-birthstone`}>{collection.name}</p>
              <p className="italic text-xl">{new Date(collection.createdAt).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}</p>
            </div>
            <button 
              className='border rounded-lg py-1.5 px-2 animate-pulse mt-10'
              onClick={() => {
                if(collectionRef.current){
                  collectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
            >
              Go to Sets
            </button>
          </div>
          <img ref={coverPhotoRef} src={data.coverPath} style={{ maxHeight: '100vh', minHeight: '100vh' }} />
        </div>
        <div className='grid grid-cols-3 items-center px-8 sticky gap-2 top-0 z-10 bg-white py-1 border-b-gray-300 border-b' ref={collectionRef}>
          <div className='flex flex-col items-start font-bodoni'>
            <span className='font-bold text-lg'>James French Photograpahy</span>
            <span className='italic flex flex-row gap-1'>
              <span>{collection.name}</span>
              <span className='font-light'>&bull;</span>
              <span>{set.name}</span>
            </span>
          </div>
          <div className='flex flex-row w-full justify-between col-span-2 me-10'>
            <button className='text-gray-700 rounded-lg p-1 z-50 hover:text-gray-500 bg-white'
              onClick={() => {
                const nextIndex = currentIndex - 1 < 0 ? collection.sets.length - 1 : currentIndex - 1
                setSet({...collection.sets[nextIndex]})
              }}
            >
              <HiOutlineArrowLeft size={24} />
            </button>
            <SetCarousel 
              setList={collection.sets}
              setSelectedSet={setSet}
              selectedSet={set}
              currentIndex={currentIndex}
            />
            <button className='text-gray-700 rounded-lg p-1 z-50 hover:text-gray-500 bg-white'
              onClick={() => {
                const nextIndex = currentIndex + 1 >= collection.sets.length ? 0 : currentIndex + 1
                setSet({...collection.sets[nextIndex]})
              }}
            >
              <HiOutlineArrowRight size={24} />
            </button>
          </div>
        </div>
        <div className={gridClass} >
          {formattedCollection  && formattedCollection.length > 0 && formattedCollection
            .map((subCollection, index) => {
              return (
                <div key={index} className="flex flex-col gap-4">
                  {subCollection.map((picture, s_index) => {
                    const url = paths.find((path) => path.data?.[0] === picture.id)
                    
                    return (
                      <div 
                        key={s_index} 
                        className="relative" 
                        onContextMenu={(e) => {
                          if(!collection.downloadable) e.preventDefault()
                        }}
                        onMouseEnter={() => setCurrentControlDisplay(picture.id)}
                        onMouseLeave={() => setCurrentControlDisplay(undefined)}
                        onClick={() => setCurrentControlDisplay(picture.id)}
                      >
                        { url?.isLoading ? (
                          <div className="flex items-center justify-center h-[100px] bg-gray-300 rounded-lg">
                            <svg className="w-10 h-10 text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
                              <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
                            </svg>
                          </div>
                        ) : (
                          <>
                            <img 
                              className={`h-auto max-w-full rounded-lg border-2 ${currentControlDisplay === picture.id ? 'border-gray-300' : 'border-transparent'}`} src={url?.data?.[1]} alt="" 
                            />
                            <img 
                              src={collection.watermarkPath}
                              className="absolute inset-0 max-w-[200px] max-h-[300px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 object-cover opacity-80"
                              alt=""
                            />
                          </>
                        )}
                        <div className={`absolute bottom-2 inset-x-0 justify-end flex-row gap-1 me-3 ${controlsEnabled(picture.id)}`}>
                          <button
                            title={`${picture.favorite !== undefined ? 'Unfavorite' : 'Favorite'}`}
                            onClick={() => {
                              if(!picture.favorite && data.auth.user?.profile.email || tempUser?.email){
                                favorite.mutate({
                                  pathId: picture.id,
                                  user: data.auth.user?.profile.email ?? tempUser!.email,
                                  options: {
                                    logging: true
                                  }
                                })
                                setSet({
                                  ...set,
                                  paths: set.paths.map((path) => {
                                    if(path.id === picture.id){
                                      return ({
                                        ...path,
                                        favorite: 'temp'
                                      })
                                    }
                                    return path
                                  })
                                })
                              }
                              else if(picture.favorite && picture.favorite !== 'temp'){
                                unfavorite.mutate({
                                  id: picture.favorite,
                                })
                                setSet({
                                  ...set,
                                  paths: set.paths.map((path) => {
                                    if(path.id === picture.id){
                                      return ({
                                        ...path,
                                        favorite: undefined
                                      })
                                    }
                                    return path
                                  })
                                })
                              }
                            }}
                          >
                            <HiOutlineHeart size={20} className={`${picture.favorite !== undefined ? 'fill-red-400' : ''}`}/>
                          </button>
                          {collection.downloadable && (
                            <button 
                              title='Download' 
                              className={`${downloadImage.isPending ? 'cursor-wait' : ''}`} 
                              onClick={() => {
                                if(!downloadImage.isPending){
                                  downloadImage.mutate({
                                    path: picture.path
                                  })
                                }
                              }}
                            >
                              <HiOutlineDownload size={20} />
                            </button>
                          )}
                          <button
                            title='Preview Fullscreen'
                            onClick={() => {
                              navigate({
                                to: `/photo-fullscreen`,
                                search: {
                                  set: set.id,
                                  path: picture.id,
                                  temporaryToken: data.token
                                }
                              })
                            }}
                          >
                            <CgArrowsExpandRight size={20} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })
          }
        </div>
        <div className="w-full flex flex-row items-center justify-center">
          <Button
            color='light'
            className="m-4 self-center"
            onClick={() => {
              if(coverPhotoRef && coverPhotoRef.current){
                coverPhotoRef.current.scrollIntoView({
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
