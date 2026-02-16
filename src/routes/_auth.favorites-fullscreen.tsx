import { useMutation, useQueries, useQuery, UseQueryResult } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import React, { useEffect, useState } from 'react'
import { CollectionService } from '../services/collectionService'
import {
  PhotoPathService,
  DownloadImageMutationParams,
} from '../services/photoPathService'
import { parsePathName } from '../utils'
import {
  HiOutlineArrowLeft,
  HiOutlineArrowRight,
  HiOutlineDownload,
} from 'react-icons/hi'
import { PhotoCarousel } from '../components/admin/collection/PhotoCarousel'
import useWindowDimensions from '../hooks/windowDimensions'
import { Favorite, PhotoCollection, PicturePath, UserTag } from '../types'
import { Schema } from '../../amplify/data/resource'
import { V6Client } from '@aws-amplify/api-graphql'
import { PhotoSetService } from '../services/photoSetService'
import { calculatePictureHeight } from '../functions/photoFunctions'
import { LazyImage } from '../components/common/LazyImage'
import Loading from '../components/common/Loading'
import { HiOutlineMinus, HiOutlinePlus } from 'react-icons/hi2'
import { FavoriteService } from '../services/favoriteService'

interface FavoritesFullScreenParams {
  collection?: string,
  tag?: string,
  path?: string,
  participantId?: string,
}

//TODO: revamp me with infinite query
export const Route = createFileRoute('/_auth/favorites-fullscreen')({
  component: RouteComponent,
  validateSearch: (
    search: Record<string, unknown>,
  ): FavoritesFullScreenParams => ({
    collection: (search.collection as string) ?? undefined,
    tag: (search.tag as string) ?? undefined,
    path: (search.path as string) ?? undefined,
    participantId: (search.participantId as string) ?? undefined,
  }),
  beforeLoad: ({ search }) => search,
  loader: ({ context }) => {
    const client = context.client as V6Client<Schema>

    if(
      (context.collection === undefined && context.tag === undefined)
      ||
      (context.collection !== undefined && context.tag !== undefined)
    ) {
      throw redirect({ to: `${context.auth.admin ? '/admin/dashboard/collection' : '/client/dashboard'}` })
    }

    return {
      CollectionService: new CollectionService(client),
      PhotoPathService: new PhotoPathService(client),
      PhotoSetService: new PhotoSetService(client),
      FavoriteService: new FavoriteService(client),
      auth: context.auth,
      path: context.path,
      collection: context.collection,
      tag: context.tag,
      participantId: context.participantId,
    }
  },
})

interface SlideInformation {
  start: React.Touch,
  current: React.Touch,
  finished: PicturePath | null
}

function RouteComponent() {
  const data = Route.useLoaderData()
  const [current, setCurrent] = useState(data.path ?? '')
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [paths, setPaths] = useState<PicturePath[]>([])
  const [collection, setCollection] = useState<PhotoCollection>()
  const [tag, setTag] = useState<UserTag>()

  const navigate = Route.useNavigate()
  const dimensions = useWindowDimensions()

  const [carouselHidden, setCarouselHidden] = useState(false)
  const [sliding, setSliding] = useState<SlideInformation | null>(null)

  const tagFavoriteQuery = useQuery({
    ...data.FavoriteService.getParticipantFavoritesByUserTagQueryOptions(
      data.participantId ?? data.auth.user?.profile.activeParticipant?.id ?? '', 
      data.tag, {
        logging: true,
        metric: true
      }
    ),
    enabled: data.tag !== undefined
  })

  const collectionFavoriteQuery = useQuery({
    ...data.FavoriteService.getParticipantFavoritesByCollectionQueryOptions(
      data.participantId ?? data.auth.user?.profile.activeParticipant?.id ?? '',
      data.collection, {
        logging: true,
        metric: true
      }
    ),
    enabled: data.collection !== undefined
  })

  const pathsQuery = useQuery(data.PhotoPathService.getPathsFromFavoriteIdsQueryOptions(
    favorites.map((favorite) => favorite.id),
    {
      logging: true,
    }
  ))

  useEffect(() => {
    if(collectionFavoriteQuery.data && (
      collection === undefined || 
      collection.id !== collectionFavoriteQuery.data[0].id
    )) {
      setCollection(collectionFavoriteQuery.data[0])
      setFavorites(collectionFavoriteQuery.data[1])
      setCurrent(prev => {
        const current = (
          collectionFavoriteQuery.data && 
          !collectionFavoriteQuery.data[1].some((favorite) => favorite.pathId === prev) && 
          collectionFavoriteQuery.data[1].length > 0
        ) ? (
          collectionFavoriteQuery.data[1][0].pathId
        ) : prev

        navigate({ to: '.', search: { collection: data.collection, path: current } })
        return current
      })
    }
    if(tagFavoriteQuery.data && (
      tag === undefined || 
      tag.id !== tagFavoriteQuery.data[0].id
    )) {
      setTag(tagFavoriteQuery.data[0])
      setFavorites(tagFavoriteQuery.data[1])
      setCurrent(prev => {
        const current = (
          tagFavoriteQuery.data && 
          !tagFavoriteQuery.data[1].some((favorite) => favorite.pathId === prev) && 
          tagFavoriteQuery.data[1].length > 0
        ) ? (
          tagFavoriteQuery.data[1][0].pathId
        ) : prev

        navigate({ to: '.', search: { collection: data.collection, path: current } })
        return current
      })
    }
    if(pathsQuery.data) {
      setPaths(pathsQuery.data)
    }
  }, [
    collectionFavoriteQuery.data,
    tagFavoriteQuery.data,
    pathsQuery.data
  ])

  const { top, bottom } = (() => {
    const length = dimensions.width
    const currentIndex = paths.findIndex((path) => path.id === current)
    const path = paths[currentIndex]
    if(!path) return { top: 0, bottom: 0 }

    let bottom = currentIndex > 0 ? currentIndex - 1 : 0
    let bottomAccumulatedWidth = ((140 / path.height) * (path.width) + 2) * 0.5
    let top = currentIndex < paths.length - 1 ? currentIndex + 1 : currentIndex
    let topAccumulatedWidth = bottomAccumulatedWidth

    while(bottom > 0 && bottomAccumulatedWidth < length) {
      bottomAccumulatedWidth += ((140 / paths[bottom].height) * (paths[bottom].width) + 4) * 0.75
      bottom -= 1
    }

    while(top < paths.length && topAccumulatedWidth < length) {
      topAccumulatedWidth += ((140 / paths[top].height) * (paths[top].width) + 4) * 0.75
      top += 1
    }

    return {
      top: top < paths.length - 1 ? top + 1 : top,
      bottom: bottom > 0 ? bottom - 1 : bottom
    }
  })()

  const pathQueries: Record<string, UseQueryResult<[string | undefined, string], Error>> =
  Object.fromEntries(
    useQueries({
      queries: paths.slice(bottom, top).map((path) => (
        data.CollectionService.getPathQueryOptions(path.path ?? '', path.id)
      ))
    })
    .map((query, index) => {
      return [
        paths[index + bottom]?.id ?? '',
        query
      ]
    })
  )

  const currentPath = paths.find((path) => path.id === current)
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

  const watermarkPath = data.collection ? (
    collection?.watermarkPath ? (
      collection.watermarkPath 
    ) : ( 
      collection?.sets.find((set) => set.id === currentPath?.setId)?.watermarkPath
    )
  ) : (
    (() => {
      const collectionWatermarkPath = tag?.collections?.find((collection) => collection.sets.some((set) => set.paths.some((path) => path.id === current)))?.watermarkPath
      if(collectionWatermarkPath) return collectionWatermarkPath

      const set = (tag?.collections ?? []).flatMap((collection) => collection.sets).find((set) => set.id === currentPath?.setId)
      return set?.watermarkPath
    })()
  )
  const watermarkQuery = useQuery({
    ...data.CollectionService.getPathQueryOptions(watermarkPath ?? ''),
    enabled: watermarkPath !== undefined
  })

  const downloadImage = useMutation({
    mutationFn: (params: DownloadImageMutationParams) =>
      data.PhotoPathService.downloadImageMutation(params),
    onSettled: (file) => {
      if (file) {
        try {
          const url = window.URL.createObjectURL(file)
          const link = document.createElement('a')
          link.href = url
          link.download = file.name
          link.click()
          window.URL.revokeObjectURL(url)
        } catch (error) {
          console.error(error)
        }
      }
    },
  })

  function NextImage(props: { side: 'left' | 'right', differential: number }): JSX.Element | null {
    if(
      centerPicture === undefined ||
      (
        props.side === 'right' && (props.differential >= 0 || centerPicture.order == paths.length - 1)
      ||
        props.side === 'left' && (props.differential <= 0 || centerPicture.order === 0)
      )
    ) return null

    const nextIndex = props.side === 'left' ? (
      centerPicture.order - 1
    ) : (
      centerPicture.order + 1
    )

    const path = paths[nextIndex]
    const maxPictureHeight = calculatePictureHeight(path, dimensions, (dimensions.height - (carouselHidden ? 50 : 200)))

    return (
      <div className='flex justify-center h-full items-center overflow-hidden w-[100vw]'>
        <LazyImage
          srcPathQuery={pathQueries[path.id]}
          watermarkQuery={watermarkPath !== undefined ? watermarkQuery : undefined}
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

  const validSlide = centerPicture !== undefined && (
    (
      differential > 0 && centerPicture.order !== 0
    ) || (
      differential < 0 && centerPicture.order !== paths.length - 1
    )
  )

  return (
    <div
      className="bg-white flex flex-col"
      style={{ height: dimensions.height }}
    >
      <div className="min-h-[50px] max-h-[50px] grid grid-cols-3 justify-between items-center px-4 text-gray-700 w-full">
        <div>
          <button
            className="hover:border-gray-100 border border-transparent rounded-lg px-2 py-1 hover:bg-gray-200 hover:text-gray-500"
            onClick={() => {
              if (data.auth.admin && (collection !== undefined || tag !== undefined) && currentPath !== undefined) {
                const foundCollection = collection !== undefined ? collection : (
                  tag !== undefined ? (
                    tag.collections?.find((collection) => collection.sets.some((set) => set.id === currentPath.setId))
                  ) : undefined
                )
                if(foundCollection) {
                  navigate({ to: '/admin/dashboard/collection', search: { collection: foundCollection.id, console: 'favorites' } })
                }
                navigate({ to: '/admin/dashboard/collection' })
              } 
              else if(data.auth.admin) {
                navigate({ to: '/admin/dashboard/collection' })
              } 
              else if((collection !== undefined || tag !== undefined) && currentPath !== undefined) {
                const foundSet = collection !== undefined ? (
                  collection.sets.find((set) => set.id === currentPath.setId)
                ) : (
                  tag !== undefined ? (
                    (tag.collections ?? []).flatMap((collection) => collection.sets).find((set) => set.id === currentPath.setId)
                  ) : undefined
                )
                if(foundSet !== undefined && data.collection !== undefined) {
                  // navigate({ to: `/photo-collection/${data.collection}`, search: { set: foundSet.id, path: current } })
                }
                else if(foundSet !== undefined && tag !== undefined) {
                  // navigate({ to: `/photo-collection/${foundSet.collectionId}`, search: { set: foundSet.id, path: current } })
                }
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
          <span className='flex flex-row gap-1 self-center'>
            <span>Loading</span>
            <Loading />
          </span>
        )}</div>
        <div className={`flex flex-row ${dimensions.width < 500 ? 'gap-2' : 'gap-4'} justify-end`}>
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
            if(
              sliding !== null && 
              sliding.finished === null && (
                validSlide || Math.abs(differential) < 100
              )
            ) {
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
              validSlide &&
              Math.abs(endDifferential) > minThreshold
            ) {
              const currentIndex = paths.findIndex((path) => path.id === current)
              const nextIndex = endDifferential > 0 ? (
                currentIndex - 1
              ) : (
                currentIndex + 1
              )
              setTimeout(() => {
                setSliding(null)
              }, 500)
              setCurrent(paths[nextIndex].id)
              navigate({ to: '.', search: { collection: data.collection, tag: data.tag, path: paths[nextIndex].id }})
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
              sliding !== null && 
              sliding.finished === null && (
                validSlide || Math.abs(differential) < 100
              )
            ) {
              const foundTouch = Array.from(event.changedTouches).find(touch => touch.identifier === sliding.start.identifier) ?? sliding.current
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
              validSlide &&
              Math.abs(endDifferential) > minThreshold
            ) {  
              const currentIndex = paths.findIndex((path) => path.id === current)
              const nextIndex = endDifferential > 0 ? (
                currentIndex - 1
              ) : (
                currentIndex + 1
              )
              setTimeout(() => {
                setSliding(null)
              }, 500)
              setCurrent(paths[nextIndex].id)
              navigate({ to: '.', search: { collection: data.collection, tag: data.tag, path: paths[nextIndex].id }})
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
              srcPathQuery={sliding === null || sliding.finished === null ? pathQueries[current] : pathQueries[sliding.finished.id]}
              watermarkQuery={watermarkPath !== undefined ? watermarkQuery : undefined}
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
        paths.length > 0
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
            paths={paths} 
            data={{
              type: 'favorite',
              collectionId: data.collection,
              tagId: data.tag
            }}
            pictureData={Object.values(pathsQuery)} 
            watermarkQuery={watermarkPath !== undefined ? watermarkQuery : undefined}
            setSelectedPath={setCurrent} 
            selectedPath={current}
            dimensions={dimensions}
          />
        </div>
      )}
      {paths.length - 1 === paths.findIndex((path) => path.id === current) && (
        <button
          className="fixed top-1/2 right-4 -translate-y-1/2 text-gray-700 rounded-lg p-4 z-50 hover:text-gray-500"
          onClick={() => {
            const currentIndex = paths.findIndex(
              (path) => path.id === current,
            )
            const nextIndex = currentIndex + 1
            setCurrent(paths[nextIndex].id)
            navigate({
              to: '.',
              search: {
                collection: data.collection,
                tag: data.tag,
                path: paths[nextIndex].id,
              },
            })
          }}
        >
          <HiOutlineArrowRight size={32} />
        </button>
      )}
      {paths.findIndex((path) => path.id === current) !== 0 && (
        <button
          className="fixed top-1/2 left-4 -translate-y-1/2 text-gray-700 rounded-lg p-4 z-50 hover:text-gray-500"
          onClick={() => {
            const currentIndex = paths.findIndex((path) => path.id === current,)
            const nextIndex = currentIndex - 1 
            setCurrent(paths[nextIndex].id)
            navigate({
              to: '.',
              search: {
                collection: data.collection,
                tag: data.tag,
                path: paths[nextIndex].id,
              },
            })
          }}
        >
          <HiOutlineArrowLeft size={32} />
        </button>
      )}
    </div>
  )
}
