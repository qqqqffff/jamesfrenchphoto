import { createFileRoute, invariant, redirect } from '@tanstack/react-router'
import { getPhotoCollectionByIdQueryOptions, getPathQueryOptions } from '../services/collectionService'
import { favoriteImageMutation, FavoriteImageMutationParams, unfavoriteImageMutation, UnfavoriteImageMutationParams } from '../services/photoSetService'
import { PhotoSet, PicturePath, UserProfile } from '../types'
import { useCallback, useEffect, useRef, useState } from 'react'
import useWindowDimensions from '../hooks/windowDimensions'
import { Button } from 'flowbite-react'
import { useInfiniteQuery, useMutation, useQueries, useQuery, UseQueryResult } from '@tanstack/react-query'
import { SetCarousel } from '../components/collection/SetCarousel'
import { CgArrowsExpandRight } from 'react-icons/cg'
import { HiOutlineArrowLeft, HiOutlineArrowRight, HiOutlineHeart } from 'react-icons/hi2'
import { downloadImageMutation, DownloadImageMutationParams, getInfinitePathsQueryOptions } from '../services/photoPathService'
import { HiOutlineDownload } from 'react-icons/hi'
import { UnauthorizedEmailModal } from '../components/modals'
import { Cover } from '../components/collection/Cover'

interface PhotoCollectionParams {
  set?: string,
}

//TODO: fix updating set
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
        siPaths: false,
        unauthenticated: context.temporaryToken !== undefined,
      })
    )

    if((!collection || collection.sets.length === 0 || !collection.published) && !context.auth.admin) throw redirect({ to: destination })
    invariant(collection)

    
    const coverUrl = (await context.queryClient.ensureQueryData(
      getPathQueryOptions(collection.coverPath ?? '')
    ))?.[1]
    
    if(!coverUrl && !context.auth.admin) throw redirect({ to: destination })

    return {
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
  const observerRef = useRef<IntersectionObserver | null>(null)
  const picturesRef = useRef<Map<string, HTMLDivElement | null>>(new Map())

  

  const columnMultiplier = dimensions.width > 1600 ? 5 : (
    dimensions.width > 800 ? 
      3 : 1
    )

  const getTriggerItems = useCallback((allItems: PicturePath[]): PicturePath => {
    return allItems[allItems.length - allItems.length % columnMultiplier - columnMultiplier]
  }, [])
  
  const [tempUser, setTempUser] = useState<UserProfile>()

  const pathsQuery = useInfiniteQuery(
    getInfinitePathsQueryOptions(data.setId ?? collection.sets[0].id, {
      unauthenticated: data.token !== undefined,
      user: data.auth.user?.profile.email ?? tempUser?.email,
      maxItems: Math.round(3 * (columnMultiplier) * 1.5)
    })
  )

  const [set, setSet] = useState<PhotoSet>(collection.sets.find((set) => set.id === data.setId) ?? collection.sets[0])

  useEffect(() => {
    setSet(collection.sets.find((set) => set.id === data.setId) ?? collection.sets[0])
  }, [data.setId])

  const [currentControlDisplay, setCurrentControlDisplay] = useState<string>()
  
  const [emailInputVisible, setEmailInputVisible] = useState(data.token !== undefined)

  const navigate = Route.useNavigate()
  const coverPhotoRef = useRef<HTMLImageElement | null>(null)
  const collectionRef = useRef<HTMLDivElement | null>(null)
  const navigateControls = data.auth.admin
  

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

  const watermarkPath = useQuery(
    getPathQueryOptions(set.watermarkPath ?? collection.watermarkPath, collection.id)
  )

  const formattedCollection: PicturePath[][] = []
  for(let i = 0; i < columnMultiplier; i++){
    formattedCollection.push([] as PicturePath[])
  }

  const mappedPaths = pathsQuery.data?.pages
    .flatMap((page) => page.memo)
    .reduce((prev, cur) => {
      if(!prev.some((path) => path.id === cur.id)) {
        prev.push(cur)
      }
      return prev
    }, [] as PicturePath[])
    .sort((a, b) => a.order - b.order) ?? []

  useEffect(() => {
    if(mappedPaths.length === 0) return

    if(!observerRef.current) {
      observerRef.current = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if(entry.isIntersecting && pathsQuery.hasNextPage && !pathsQuery.isFetchingNextPage) {
            pathsQuery.fetchNextPage()
          }
        })
      }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
      })
    }

    const triggerItem = getTriggerItems(mappedPaths)

    observerRef.current.disconnect()

    const el = picturesRef.current.get(triggerItem.id)
    if(el && observerRef.current) {
      observerRef.current.observe(el)
    }

    return () => {
      if(observerRef.current) {
        observerRef.current.disconnect()
      }
      observerRef.current = null
    }
  }, [
    mappedPaths,
    pathsQuery.fetchNextPage,
    pathsQuery.hasNextPage,
    pathsQuery.isFetchingNextPage,
    getTriggerItems,
  ])

  const setItemRef = useCallback((el: HTMLDivElement | null, id: string) => {
    if(el) {
      picturesRef.current.set(id, el)
    }
  }, [])

  const paths: Record<string, UseQueryResult<[string | undefined, string] | undefined, Error>> = Object.fromEntries(
    useQueries({
      queries: mappedPaths.map((path) => (
        getPathQueryOptions(path.path, path.id)
      ))
    })
    .map((query, index) => {
      return [mappedPaths[index].id, query]
    })
  )

  let curIndex = 0
  
  mappedPaths.forEach((picture) => {
      formattedCollection[curIndex].push(picture)
      if(curIndex + 2 > columnMultiplier){
        curIndex = 0
      }
      else{
        curIndex = curIndex + 1
      }
    })

  const gridClass = `grid grid-cols-${String(columnMultiplier)} gap-4 mx-4 mt-1`

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
                    const url = paths[picture.id]
                    
                    return (
                      <div 
                        key={s_index} 
                        ref={el => setItemRef(el, picture.id)}
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
                              src={watermarkPath.data?.[1]}
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
