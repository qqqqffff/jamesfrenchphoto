import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { PhotoSetService, FavoriteImageMutationParams, UnfavoriteImageMutationParams } from '../services/photoSetService'
import { useMutation, useQueries, useQuery, UseQueryResult } from '@tanstack/react-query'
import { CollectionService } from '../services/collectionService'
import { V6Client } from '@aws-amplify/api-graphql'
import useWindowDimensions from '../hooks/windowDimensions'
import { HiOutlineArrowLeft, HiOutlineArrowRight, HiOutlineHeart, HiOutlineDownload } from "react-icons/hi";
import React, { useEffect, useState } from 'react'
import { parsePathName } from '../utils'
import { PhotoCarousel } from '../components/admin/collection/PhotoCarousel'
import { DownloadImageMutationParams, PhotoPathService } from '../services/photoPathService'
import { Schema } from '../../amplify/data/resource'
import { LazyImage } from '../components/common/LazyImage'
import { HiOutlineBars3, HiOutlineCheckCircle, HiOutlineMinus, HiOutlinePlus } from 'react-icons/hi2'
import { PhotoCollection, PhotoSet, PicturePath } from '../types'
import Loading from '../components/common/Loading'
import { Dropdown } from 'flowbite-react'
import { calculatePictureHeight } from '../functions/photoFunctions'

interface PhotoFullScreenParams {
  set: string,
  path?: string,
}

//TODO: could revamp me with infinite query
export const Route = createFileRoute('/_auth/photo-fullscreen')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): PhotoFullScreenParams => ({
    set: (search.set as string) || '',
    path: (search.path as string) || undefined,
  }),
  beforeLoad: ({ search }) => {
    return search
  },
  loader: ({ context }) => {
    const client = context.client as V6Client<Schema>
    const collectionService = new CollectionService(client)
    const photoSetService = new PhotoSetService(client)

    return {
      CollectionService: collectionService,
      PhotoPathService: new PhotoPathService(client),
      PhotoSetService: photoSetService,
      auth: context.auth,
      path: context.path,
      set: context.set
    }
  }

})

interface SlideInformation {
  start: React.Touch,
  current: React.Touch,
  finished: PicturePath | null
}

function RouteComponent() {
  const data = Route.useLoaderData()

  const [current, setCurrent] = useState<string>(data.path ?? '')
  const [set, setSet] = useState<PhotoSet>()
  const [collection, setCollection] = useState<PhotoCollection>()
  const dimensions = useWindowDimensions()
  const navigate = useNavigate()
  const [carouselHidden, setCarouselHidden] = useState(false)
  const [sliding, setSliding] = useState<SlideInformation | null>(null)

  const setQuery = useQuery(
    data.PhotoSetService.getPhotoSetByIdQueryOptions(data.set, { 
      resolveUrls: false, 
      participantId: data.auth.user?.profile.activeParticipant?.id 
    })
  )

  const collectionQuery = useQuery({
    ...data.CollectionService.getPhotoCollectionByIdQueryOptions(setQuery.data?.collectionId, { siPaths: false, siSets: true, siTags: false }),
    enabled: setQuery.isSuccess
  })

  useEffect(() => {
    if(setQuery.data && setQuery.data !== null && (
      set === undefined || set.id !== setQuery.data.id
    )) {
      if(current === '') {
        const pathId = setQuery.data.paths[0]?.id
        setCurrent(pathId)
        setSet(setQuery.data)
        navigate({ to: '.', search: { set: data.set, path: pathId }})
      } else {
        setSet(setQuery.data)
      }
    }
    if(collectionQuery.data && collection === undefined) {
      setCollection(collectionQuery.data)
    }
  }, [
    setQuery.data,
    collectionQuery.data
  ])

  const { top, bottom } = (() => {
    if(!set) return { top: 0, bottom: 0 }
    const halfLength = dimensions.width;
    const path = set.paths.find((path) => path.id === current)
    if(!path) return { top: 0, bottom: 0 }
    const currentIndex = path.order

    let bottom = currentIndex > 0 ? currentIndex - 1 : 0
    let bottomAccumulatedWidth = (140 / path.height) * (path.width + 4) * 0.5
    let top = currentIndex < Object.entries(set.paths).length - 1 ? currentIndex + 1 : currentIndex
    let topAccumulatedWidth = bottomAccumulatedWidth

    while(bottom > 0 && bottomAccumulatedWidth < halfLength) {
      bottomAccumulatedWidth += (140 / set.paths[bottom].height) * (set.paths[bottom].width + 4) * 0.75
      bottom -= 1
    }

    while(top < set.paths.length && topAccumulatedWidth < halfLength) {
      topAccumulatedWidth += (140 / set.paths[top].height) * (set.paths[top].width + 4) * 0.75
      top += 1
    }

    // console.log(bottomAccumulatedWidth, bottom, topAccumulatedWidth, top)

    return {
      top: top < set.paths.length - 1 ? top + 1 : top,
      bottom: bottom > 0 ? bottom - 1 : bottom
    }
  })()

  const paths: Record<string, UseQueryResult<[string | undefined, string], Error>> = 
    Object.fromEntries(
      useQueries({
        queries: (set?.paths ?? []).slice(bottom, top).map((path) => (
          data.CollectionService.getPathQueryOptions(path.path ?? '', path.id)
        ))
      })
      .map((query, index) => {
        return [
          set?.paths[index + bottom]?.id ?? '',
          query
        ]
      })
    )

  const watermarkQuery = useQuery({
    ...data.CollectionService.getPathQueryOptions(collection?.watermarkPath ?? set?.watermarkPath ?? ''),
    enabled: collection?.watermarkPath !== undefined || set?.watermarkPath !== undefined,
  })

  const favorite = useMutation({
    mutationFn: (params: FavoriteImageMutationParams) => data.PhotoSetService.favoriteImageMutation(params),
    onSettled: (favorite) => {
      if(favorite && set !== undefined){
        const pathIndex = set.paths.findIndex((path) => path.id === favorite[1])
        if(pathIndex !== -1) {
          const temp = [...set.paths]
          temp[pathIndex] = {
            ...temp[pathIndex],
            favorite: favorite[0]
          }
          setSet({
            ...set,
            paths: temp,
          })
        }
      }
    }
  })

  const unfavorite = useMutation({
    mutationFn: (params: UnfavoriteImageMutationParams) => data.PhotoSetService.unfavoriteImageMutation(params),
  })

  const downloadImage = useMutation({
    mutationFn: (params: DownloadImageMutationParams) => data.PhotoPathService.downloadImageMutation(params),
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

  const currentPath = (set?.paths ?? []).find((path) => path.id === current)
  const centerPicture = sliding === null || sliding.finished === null ? (
    currentPath
  ) : (
    sliding.finished
  )

  const maxPictureHeight = centerPicture !== undefined ? (
    calculatePictureHeight(centerPicture, dimensions, (dimensions.height - (carouselHidden ? 50 : 200)))
  ) : (
    dimensions.height - (carouselHidden ? 50 : 200)
  )

  const differential = (sliding?.current.clientX ?? 0) - (sliding?.start.clientX ?? 0)


  function NextImage(props: { side: 'left' | 'right', differential: number }): JSX.Element | null {
    if(
      set === undefined || 
      centerPicture === undefined ||
      (
        props.side === 'right' && (props.differential >= 0 || centerPicture.order === set.paths.length - 1) 
      ||
        props.side === 'left' && (props.differential <= 0 || centerPicture.order === 0)
      )
    ) return null
    const nextIndex = props.side === 'left' ? (
      centerPicture.order - 1 
    ) : (
      centerPicture.order + 1
    )

    const path = set.paths[nextIndex]

    const maxPictureHeight = calculatePictureHeight(path, dimensions, (dimensions.height - (carouselHidden ? 50 : 200)))

    return (
      <div className='flex justify-center h-full items-center overflow-hidden w-[100vw]'>
        <LazyImage 
          srcPathQuery={paths[path.id]}
          watermarkQuery={collection?.watermarkPath !== undefined || set?.watermarkPath !== undefined ? watermarkQuery : undefined}
          style={{ 
            maxHeight: `calc(100vh - ${(carouselHidden ? 50 : 200)}px)`,
            height: `${maxPictureHeight}px`,
            transition: 'height 300ms',
            minWidth: `200px`,
            minHeight: '200px',
            maxWidth: '100vw'
          }}
          className='flex-1 ease-in-out'
          loading='lazy'
          draggable={false}
        />
      </div>
    )
  }

  const validSlide = centerPicture !== undefined && set !== undefined && (
    (
      differential > 0 && centerPicture.order !== 0 
    ) || (
      differential < 0 && centerPicture.order !== set.paths.length - 1
    )
  )

  return (
    <div className="bg-white flex flex-col" style={{ height: dimensions.height }}>
      <div className='min-h-[50px] max-h-[50px] grid grid-cols-3 justify-between items-center px-4 text-gray-700 w-full '>
        <div>
          <button 
            className='hover:border-gray-100 border rounded-lg px-2 py-1 hover:bg-gray-200 hover:text-gray-500'
            onClick={() => {
              if(data.auth.admin && collection !== undefined) {
                navigate({ to: '/admin/dashboard/collection', search: { collection: collection.id, set: data.set }})
              }
              else if(data.auth.admin) {
                navigate({ to: '/admin/dashboard/collection' })
              } 
              else if(collection !== undefined){
                navigate({ to: `/photo-collection/${collection.id}`, search: { set: data.set, path: current } })
              }
              else {
                navigate({ to: '/client/dashboard' })
              }
            }}
          >
            Back
          </button>
        </div>
        <div className='font-bodoni italic font-semibold truncate text-center'>{currentPath !== undefined ? (
          parsePathName(currentPath.path) 
        ) : (
          <span className='flex flex-row gap-1'>
            <span>Loading</span>
            <Loading />
          </span>
        )}</div>
        <div className={`flex flex-row ${dimensions.width < 500 ? 'gap-2' : 'gap-4'} justify-end`}>
          {(
            currentPath !== undefined  && 
            set !== undefined &&
            collection !== undefined &&
            data.auth.user?.profile.activeParticipant?.id !== undefined
          ) && (
            <button 
              title={`${currentPath !== undefined ? 'Unfavorite' : 'Favorite'}`}
              onClick={() => {
                if(currentPath.favorite !== undefined && currentPath.favorite !== 'temp'){
                  unfavorite.mutate({
                    id: currentPath.favorite,
                    options: {
                      logging: true
                    }
                  })
                  const pathIndex = set.paths.findIndex((path) => path.id === currentPath.id)
                  if(pathIndex !== -1) {
                    const temp = [...set.paths]
                    temp[pathIndex] = {
                      ...currentPath,
                      favorite: undefined
                    }
                    setSet({
                      ...set,
                      paths: temp
                    })
                  }
                }
                else if(currentPath.favorite === undefined && data.auth.user?.profile.activeParticipant?.id !== undefined){
                  favorite.mutate({
                    pathId: currentPath.id,
                    participantId: data.auth.user.profile.activeParticipant?.id,
                    collectionId: collection.id,
                    setId: data.set,
                  })
                  const pathIndex = set.paths.findIndex((path) => path.id === currentPath.id)
                  if(pathIndex !== -1) {
                    const temp = [...set.paths]
                    temp[pathIndex] = {
                      ...currentPath,
                      favorite: 'temp'
                    }
                    setSet({
                      ...set,
                      paths: temp
                    })
                  }
                }
                
              }}
            >
              <HiOutlineHeart size={24} className={`${currentPath.favorite !== undefined ? 'fill-red-400 hover:fill-red-700' : 'hover:fill-red-200'}`}/>
            </button>
          )}
          {(
            (collection?.downloadable || data.auth.admin) && 
            currentPath !== undefined
          ) && (
            <button 
              title='Download'
              className={`${downloadImage.isPending ? 'cursor-wait' : ''} hover:text-gray-500`}
              onClick={() => {
                if(!downloadImage.isPending){
                  downloadImage.mutate({
                    path: currentPath.path,
                    options: {
                      logging: true
                    }
                  })
                }
              }}
            >
              <HiOutlineDownload size={24} />
            </button>
          )}
          <button 
            title='Hide Carousel'
            className='p-1 hover:text-gray-400 hover:bg-gray-100 -ms-2'
            onClick={() => {
              setCarouselHidden(!carouselHidden)
            }}
          >
            {carouselHidden ? <HiOutlinePlus size={24}/> : <HiOutlineMinus size={24}/>}
          </button>
          {(
            collection !== undefined
          ) && (
            <Dropdown
              className='-ms-2'
              label={<HiOutlineBars3 className='hover:text-gray-400'/>}
              arrowIcon={false}
              inline
            >
              {collection.sets
              .filter((set) => set.items > 0 || data.auth.admin)
              .sort((a, b) => a.order - b.order)
              .map((collectionSet, index) => {
                const selected = set?.id === collectionSet.id
                return (
                  <Dropdown.Item 
                    key={index} 
                    disabled={selected}
                    onClick={() => {
                      setCurrent('')
                      navigate({ to: '.', search: { set: collectionSet.id }})
                    }}
                    className='flex flex-row gap-1 disabled:hover:cursor-not-allowed'
                  >
                    {selected && (<HiOutlineCheckCircle />)}
                    <span>{collectionSet.name}</span>
                  </Dropdown.Item>
                )
              })}
            </Dropdown>
          )}
        </div>
      </div>
      <div className='border-y-2 border-y-gray-300'>
      <div 
        className='flex h-full justify-center items-center overflow-hidden touch-none'
        style={{
          translate: 
            sliding !== null && differential !== 0 && sliding.finished === null ? (
              `${differential + (validSlide && differential > 0 ? -dimensions.width : 0)}px` 
            ) : (
              sliding !== null && sliding.finished !== null ? (
                `${differential > 0 ? 0 : -dimensions.width}px`
              )  : (
                '0px'
              )
            ),
          width: sliding !== null && validSlide ? `${dimensions.width * 2}px` : '100%',
          transition: sliding !== null && sliding.finished !== null ? 'translate 500ms' : undefined
        }}
        onMouseDown={(event) => {
          if(sliding === null || sliding.finished === null) {
            const slide: React.Touch = {
              identifier: 0,
              clientX: event.clientX,
              clientY: event.clientY,
              target: event.target,
              screenX: event.screenX,
              screenY: event.screenY,
              pageX: event.pageX,
              pageY: event.pageY
            }
            setSliding({
              start: slide,
              current: slide,
              finished: null
            })
          }
        }}
        onMouseMove={(event) => {
          if(sliding !== null && sliding.finished === null) {
            const slide: React.Touch = {
              identifier: 0,
              clientX: event.clientX,
              clientY: event.clientY,
              target: event.target,
              screenX: event.screenX,
              screenY: event.screenY,
              pageX: event.pageX,
              pageY: event.pageY
            }
            setSliding({
              start: sliding.start,
              current: slide,
              finished: null
            })
          }
        }}
        onMouseUp={(event) => {
          const end: React.Touch = {
            identifier: 0,
            clientX: event.clientX,
            clientY: event.clientY,
            target: event.target,
            screenX: event.screenX,
            screenY: event.screenY,
            pageX: event.pageX,
            pageY: event.pageY
          }
          const endDifferential = end.clientX - (sliding?.start.clientX ?? 0)
          const minThreshold = 50
          if(
            end !== undefined &&
            sliding !== null && 
            sliding.finished === null &&
            currentPath !== undefined &&
            set !== undefined &&
            validSlide &&
            Math.abs(endDifferential) > minThreshold
          ) {
            const nextIndex = endDifferential > 0 ? (
              currentPath.order - 1 < 0 ? set.paths.length - 1 : currentPath.order - 1
            ) : (
              currentPath.order + 1 >= set.paths.length ? 0 : currentPath.order + 1
            )
            setTimeout(() => {
              setSliding(null)
            }, 500)
            setCurrent(set.paths[nextIndex].id)
            navigate({ to: '.', search: { set: set.id, path: set.paths[nextIndex].id }})
            setSliding({
              ...sliding,
              current: end,
              finished: currentPath
            })
            return
          }
          setSliding(null)
        }}
        onTouchStart={(event) => {
          if(sliding === null || sliding.finished === null) {
            setSliding({
              start:event.touches[0],
              current: event.touches[0],
              finished: null
            })
          }
        }}
        onTouchMove={(event) => {
          if(
            sliding && 
            sliding.finished === null && 
            currentPath !== undefined && 
            set !== undefined
          ) {
            const foundTouch = Array.from(event.changedTouches).find(touch => touch.identifier === sliding.start.identifier) ?? sliding.current
            if(
              (
                currentPath.order === set.paths.length - 1 &&
                (foundTouch.clientX - sliding.start.clientX) <= -100
              ) 
                || 
              (
                currentPath.order === 0 &&
                (foundTouch.clientX - sliding.start.clientX) >= 100
              )
            ) {
              return
            }
            setSliding({
              start: sliding.start,
              current: foundTouch,
              finished: null
            })
          }
        }}
        onTouchEnd={(event) => {
          const end = Array.from(event.changedTouches).find(touch => touch.identifier === sliding?.start.identifier)
          const endDifferential = (end?.clientX ?? 0) - (sliding?.start.clientX ?? 0)
          const minThreshold = 50
          if(
            end !== undefined &&
            sliding !== null && 
            sliding.finished === null && 
            currentPath !== undefined && 
            set !== undefined && 
            validSlide &&
            Math.abs(endDifferential) > minThreshold
          ) {  
            const nextIndex = endDifferential > 0 ? (
              currentPath.order - 1 < 0 ? set.paths.length - 1 : currentPath.order - 1
            ) : (
              currentPath.order + 1 >= set.paths.length ? 0 : currentPath.order + 1
            )
            setTimeout(() => {
              setSliding(null)
            }, 500)
            setCurrent(set.paths[nextIndex].id)
            navigate({ to: '.', search: { set: set.id, path: set.paths[nextIndex].id }})
            setSliding({
              ...sliding,
              current: end,
              finished: currentPath
            })
            return
          }
          setSliding(null)
        }}
      >
        <NextImage side='left' differential={differential} />
        <div 
          className='flex items-center justify-center w-[100vw]'
          style={{
            height: `calc(100vh - ${(carouselHidden ? 50 : 200)}px)`
          }}
        >
          <LazyImage 
            srcPathQuery={sliding === null || sliding.finished === null ? paths[current] : paths[sliding.finished.id]}
            watermarkQuery={collection?.watermarkPath !== undefined || set?.watermarkPath !== undefined ? watermarkQuery : undefined}
            style={{ 
              // minHeight: `calc(100vh - ${carouselHeight}px)`,
              maxHeight: `calc(100vh - ${(carouselHidden ? 50 : 200)}px)`,
              height: `${maxPictureHeight}px`,
              transition: 'maxHeight 300ms',
              minWidth: '200px',
              minHeight: '200px',
              maxWidth: '100vw'
            }}
            className='flex-shrink-0 ease-in-out'
            loading='lazy'
            draggable={false}
          />
        </div>
        <NextImage side='right' differential={differential} />
      </div>
      </div>
      {(
        set !== undefined &&
        paths !== undefined
      ) && (
        <div
          className='duration-300 ease-in-out overflow-hidden transition-all'
          style={{
            minHeight: carouselHidden ? '0px' : `150px`,
            maxHeight: carouselHidden ? '0px' : `150px`,
            opacity: carouselHidden ? 0 : 1
          }}
        >
          <PhotoCarousel 
            paths={set.paths} 
            data={Object.values(paths)} 
            watermarkQuery={collection?.watermarkPath !== undefined || set?.watermarkPath !== undefined ? watermarkQuery : undefined}
            setSelectedPath={setCurrent} 
            selectedPath={current}
            set={set}
            dimensions={dimensions}
          />
        </div>
      )}
      {set !== undefined && sliding === null && (currentPath?.order ?? 0) !== 0 && (
        <button 
          className={`
            fixed left-4 -translate-y-1/2 text-gray-700 rounded-lg p-4 z-50 
            hover:text-gray-500 hover:bg-gray-100 ease-in-out
          `}
          style={{
            top: carouselHidden ? 'calc(50% + 25px)' : 'calc(50% - 40px)',
            transition: 'top 300ms'
          }}
          onClick={() => {
            const currentIndex = set.paths.findIndex((path) => path.id === current)
            if(currentIndex == -1) {
              //TODO: handle the error
            }
            
            const nextIndex = currentIndex - 1 < 0 ? set.paths.length - 1 : currentIndex - 1

            setTimeout(() => {
              setSliding(null)
            }, 500)
            const ghostTouch: React.Touch = {
              identifier: 0,
              clientX: 0,
              clientY: 0,
              screenX: 0,
              screenY: 0,
              pageX: 0,
              pageY: 0,
              target: {} as EventTarget
            }
            setSliding({
              current: {...ghostTouch, clientX: 50},
              start: ghostTouch,
              finished: null
            })
            setTimeout(() => {
              setSliding({
                current: {...ghostTouch, clientX: 50},
                start: ghostTouch,
                finished: set.paths[currentIndex]
              })
            }, 1)
            setCurrent(set.paths[nextIndex].id)
            navigate({ to: '.', search: { set: set.id, path: set.paths[nextIndex].id }})
          }}
        >
          <HiOutlineArrowLeft size={32} />
        </button>
      )}
      {set !== undefined && sliding === null && (currentPath?.order ?? set.paths.length - 1) !== set.paths.length - 1 && (
        <button 
          className={`
            fixed right-4 -translate-y-1/2 text-gray-700 rounded-lg p-4 z-50 
            hover:text-gray-500 hover:bg-gray-100 ease-in-out
          `}
          style={{
            top: carouselHidden ? 'calc(50% + 25px)' : 'calc(50% - 40px)',
            transition: 'top 300ms'
          }}
          onClick={() => {
            const currentIndex = set.paths.findIndex((path) => path.id === current)
            if(currentIndex == -1) {
              //TODO: handle the error
            }
            
            const nextIndex = currentIndex + 1 >= set.paths.length ? 0 : currentIndex + 1

            setTimeout(() => {
              setSliding(null)
            }, 500)
            const ghostTouch: React.Touch = {
              identifier: 0,
              clientX: 0,
              clientY: 0,
              screenX: 0,
              screenY: 0,
              pageX: 0,
              pageY: 0,
              target: {} as EventTarget
            }
            setSliding({
              current: {...ghostTouch, clientX: -50},
              start: ghostTouch,
              finished: set.paths[currentIndex]
            })

            setCurrent(set.paths[nextIndex].id)
            navigate({ to: '.', search: { set: set.id, path: set.paths[nextIndex].id }})
          }}
        >
          <HiOutlineArrowRight size={32} />
        </button>
      )}
    </div>
  )
}
