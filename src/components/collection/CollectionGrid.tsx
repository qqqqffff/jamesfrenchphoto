import { useInfiniteQuery, useQueries, useQuery, UseQueryResult } from "@tanstack/react-query"
import { Dispatch, LegacyRef, SetStateAction, Suspense, useCallback, useEffect, useRef, useState } from "react"
import useWindowDimensions from "../../hooks/windowDimensions"
import { getInfinitePathsQueryOptions } from "../../services/photoPathService"
import { PhotoCollection, PhotoSet, PicturePath, UserProfile } from "../../types"
import { AuthContext } from "../../auth"
import { getPathQueryOptions } from "../../services/collectionService"
import { PhotoControls } from "./PhotoControls"

interface CollectionGridProps {
  set: PhotoSet,
  collection: PhotoCollection,
  tempUser?: UserProfile
  data: {
    auth: AuthContext,
    token?: string
  },
  watermarkPath?: string,
  watermarkQuery?: UseQueryResult<[string | undefined, string] | undefined, Error>
  gridRef: LegacyRef<HTMLDivElement>
  parentUpdateSet: Dispatch<SetStateAction<PhotoSet>>
}

export const CollectionGrid = (props: CollectionGridProps) => {
  const dimensions = useWindowDimensions()

  const columnMultiplier = dimensions.width > 1600 ? 5 : (
    dimensions.width > 800 ? 
      3 : 1
    )

  const bottomObserverRef = useRef<IntersectionObserver | null>(null)
  const topObserverRef = useRef<IntersectionObserver | null>(null)
  const unrenderedObserverRef = useRef<IntersectionObserver | null>(null)
  const currentOffsetIndex = useRef<number | undefined>()
  
  const pathsQuery = useInfiniteQuery(
    getInfinitePathsQueryOptions(props.set.id, {
      unauthenticated: props.data.token !== undefined,
      participantId: props.data.auth.user?.profile.activeParticipant?.id ?? props.tempUser?.activeParticipant?.id,
      maxItems: Math.ceil(3 * (columnMultiplier) * 1.5)
    })
  )

  const [pictures, setPictures] = useState<PicturePath[]>(pathsQuery.data ? pathsQuery.data.pages[pathsQuery.data.pages.length - 1].memo : [])
  const [pictureDimensions, setPictureDimensions] = useState<[string, { width: number, height: number}][]>([])
  const [currentControlDisplay, setCurrentControlDisplay] = useState<string>()
  const topIndex = useRef<number>(0)
  const bottomIndex = useRef<number>(columnMultiplier * 4)
  const picturesRef = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const imageObserverRef = useRef<IntersectionObserver | null>(null) 

  useEffect(() => {
    if(pathsQuery.data) {
      const picturesList = pathsQuery.data.pages[pathsQuery.data.pages.length - 1].memo
      setPictures(picturesList)
    }
  }, [pathsQuery.data])

  const getTriggerItems = useCallback((allItems: PicturePath[], offset?: number): { 
    bottom: PicturePath, 
    top?: PicturePath
  } => {
    if(offset) {
      const pageMultiplier = Math.ceil(4 * 3 * columnMultiplier * 1.5)
      bottomIndex.current = offset + ((offset + pageMultiplier) >= allItems.length ? allItems.length - offset - 1 : pageMultiplier)
      topIndex.current = offset - ((offset - pageMultiplier) > 0 ? pageMultiplier : offset)
      return {
        bottom: allItems[offset + ((offset + pageMultiplier - (columnMultiplier * 2)) >= allItems.length ? 
          allItems.length - offset - 1 : (pageMultiplier - (columnMultiplier * 2)))],
        top: allItems[offset - ((offset - (pageMultiplier - (columnMultiplier * 2))) > 0 ? 
          (pageMultiplier - (columnMultiplier * 2)) : offset)]
      }
    }
    bottomIndex.current = allItems.length - 1
    topIndex.current = allItems.length - Math.ceil(4 * 6 * columnMultiplier * 1.5)
    return {
      bottom: allItems[allItems.length - allItems.length % columnMultiplier - (columnMultiplier * 2)],
      top: allItems?.[allItems.length - allItems.length % 4 - Math.ceil(4 * 6 * columnMultiplier * 1.5)]
    }
  }, [])

  const a = Object.fromEntries(useQueries({
    queries: pictures
      .slice(
        topIndex.current > 0 ? topIndex.current : 0, 
        (bottomIndex.current + 1) > pictures.length ? undefined : bottomIndex.current + 1)
      .map((path) => {
        return getPathQueryOptions(path.path, path.id)
      })
    }).map((query, index) => [
        pictures[index + (topIndex.current > 0 ? topIndex.current : 0)].id, 
        query
    ])
  )

  useEffect(() => {
    if(pictures.length === 0) return

    if(!bottomObserverRef.current) {
      bottomObserverRef.current = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if(entry.isIntersecting &&
            currentOffsetIndex.current &&
            (currentOffsetIndex.current + (2 * 3 * columnMultiplier * 1.5 - columnMultiplier)) > pictures.length
          ) {
            currentOffsetIndex.current = undefined
          }
          else if(
            entry.isIntersecting &&
            currentOffsetIndex.current &&
            (currentOffsetIndex.current + (2 * 3 * columnMultiplier * 1.5 - columnMultiplier)) < pictures.length
          ) {
            const foundIndex = pictures.findIndex((path) => path.id === entry.target.getAttribute('data-id'))
            currentOffsetIndex.current = foundIndex
          }
          if(
            entry.isIntersecting && 
            pathsQuery.hasNextPage && 
            !pathsQuery.isFetchingNextPage &&
            currentOffsetIndex.current === undefined
          ) {
            pathsQuery.fetchNextPage()
          }
        })
      }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
      })
    }

    if(!unrenderedObserverRef.current) {
      unrenderedObserverRef.current = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if(entry.isIntersecting) {
            const pictureId = entry.target.getAttribute('data-unrendered-id')
            const foundIndex = pictures.findIndex((path) => path.id === pictureId)
            if(foundIndex !== -1) {
              const pageMultiplier = Math.ceil(4 * 3 * columnMultiplier * 1.5)
              topIndex.current = Math.max(0, foundIndex - Math.floor(pageMultiplier / 2))
              bottomIndex.current = Math.min(pictures.length - 1, foundIndex + Math.floor(pageMultiplier / 2))
              currentOffsetIndex.current = foundIndex
            }
          }
        })
      }, {
        root: null,
        rootMargin: '50px',
        threshold: 0.1
      })
    }
    if(!topObserverRef.current) {
      topObserverRef.current = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const foundIndex = pictures.findIndex((path) => path.id === entry.target.getAttribute('data-id'))
          if(entry.isIntersecting && foundIndex !== 0) {
            currentOffsetIndex.current = foundIndex
          }
        })
      }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
      })
    }
    const triggerReturn = getTriggerItems(pictures, currentOffsetIndex.current)

    const Tel = picturesRef.current.get(triggerReturn.top?.id ?? '')
    const Bel = picturesRef.current.get(triggerReturn.bottom?.id ?? '')

    if(Tel && topObserverRef.current && triggerReturn.top?.id) {
      Tel.setAttribute('data-id', triggerReturn.top.id)
      topObserverRef.current.observe(Tel)
    }
    if(Bel && bottomObserverRef.current) {
      Bel.setAttribute('data-id', triggerReturn.bottom.id)
      bottomObserverRef.current.observe(Bel)
    }

    return () => {
      if(bottomObserverRef.current) {
        bottomObserverRef.current.disconnect()
      }
      if(topObserverRef.current) {
        topObserverRef.current.disconnect()
      }
      if(unrenderedObserverRef.current) {
        unrenderedObserverRef.current.disconnect()
      }
      topObserverRef.current = null
      bottomObserverRef.current = null
      unrenderedObserverRef.current = null
    }
  }, [
    pictures,
    picturesRef.current,
    currentOffsetIndex.current,
    pathsQuery.fetchNextPage,
    pathsQuery.hasNextPage,
    pathsQuery.isFetchingNextPage,
    getTriggerItems,
    a
  ])

  const setItemRef = useCallback((el: HTMLDivElement | null, id: string) => {
    if(el) {
      picturesRef.current.set(id, el)
    }
  }, [])

  const updateImageDimensions = useCallback((pictureId: string, img: HTMLImageElement) => {
    if(!img.clientHeight || !img.clientWidth) return

    setPictureDimensions(prev => {
      const existing = prev.find(([id]) => id === pictureId)
      if (!existing) {
        return [...prev, [pictureId, { 
          width: img.clientWidth,
          height: img.clientHeight
        }]]
      }
      return prev.map(([id, dims]) => 
        id === pictureId 
          ? [id, { width: img.clientWidth, height: img.clientHeight }]
          : [id, dims]
      )
    })
  }, [])

  useEffect(() => {
    if (!imageObserverRef.current) {
      imageObserverRef.current = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement
            const pictureId = img.getAttribute('data-picture-id')
            if (pictureId && img.complete && img.naturalHeight !== 0) {
              updateImageDimensions(pictureId, img)
            }
          }
        })
      }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
      })
    }

    return () => {
      if (imageObserverRef.current) {
        imageObserverRef.current.disconnect()
        imageObserverRef.current = null
      }
    }
  }, [])

  

  useQuery(getPathQueryOptions())
  
  const gridClass = `grid grid-cols-${String(columnMultiplier)} gap-4 mx-4 mt-1`

  const formattedCollection: PicturePath[][] = []
  for(let i = 0; i < columnMultiplier; i++){
    formattedCollection.push([] as PicturePath[])
  }

  let curIndex = 0
  pictures.forEach((picture) => {
    formattedCollection[curIndex].push(picture)
    if(curIndex + 2 > columnMultiplier){
      curIndex = 0
    }
    else{
      curIndex = curIndex + 1
    }
  })

  function controlsEnabled(id: string): string{
    if(id === currentControlDisplay) return 'flex'
    return 'hidden'
  }

  return (
    <>
      <div className="relative">
        <div ref={props.gridRef} className="absolute -top-[80px]"/>
      </div>
      <div
        className={gridClass}
        style={{
          minHeight: `calc(100vh - 80px)`
        }}
      >
        {formattedCollection.flatMap((path) => path).length > 0 ? (
          formattedCollection.map((subCollection, i) => {
            return (
              <div key={i} className="flex flex-col gap-4">
                {subCollection.map((picture, j) => {
                  const url = a[picture.id]
                  if(
                    !url?.data ||
                    props.watermarkPath === undefined &&
                    props.watermarkQuery !== undefined
                  ) return (
                    <div
                      key={j}
                      className='h-auto max-w-full rounded-lg border-2'
                      style={{
                        width: `${pictureDimensions.find((dimension) => dimension[0] === picture.id)?.[1].width}px`,
                        height: `${pictureDimensions.find((dimension) => dimension[0] === picture.id)?.[1].height}px`
                      }}
                    >
                      <svg className="text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
                        <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
                      </svg>
                    </div>
                  )

                  return (
                    <div
                      ref={el => setItemRef(el, picture.id)}
                      key={j} 
                      className="relative" 
                      onContextMenu={(e) => {
                        if(!props.collection.downloadable) e.preventDefault()
                      }}
                      onMouseEnter={() => setCurrentControlDisplay(picture.id)}
                      onMouseLeave={() => setCurrentControlDisplay(undefined)}
                      onClick={() => setCurrentControlDisplay(picture.id)}
                    >
                      <Suspense fallback={
                        <svg className="text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
                          <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
                        </svg>
                      }>
                        <img 
                          src={url.data?.[1]}
                          key={picture.id}
                          data-picture-id={picture.id}
                          className={`
                            h-auto max-w-full rounded-lg border-2 
                            ${currentControlDisplay === picture.id ? 'border-gray-300' : 'border-transparent'}
                          `}
                          onLoad={(e) => {
                            updateImageDimensions(picture.id, e.currentTarget)
                            if (imageObserverRef.current) {
                              imageObserverRef.current.observe(e.currentTarget)
                            }
                          }}
                          onError={(e) => {
                            if (e.currentTarget.complete && e.currentTarget.naturalHeight !== 0) {
                              updateImageDimensions(picture.id, e.currentTarget)
                            }
                          }}
                        />
                        <img 
                          src={props.watermarkPath}
                          className="absolute inset-0 w-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 object-cover opacity-80"
                          style={{ 
                            maxWidth: `${pictureDimensions.find((dimension) => dimension[0] === picture.id)?.[1].height ?? Math.min(...pictureDimensions.flatMap((dimension) => dimension[1].height))}px`
                          }}
                        />
                      </Suspense>
                      <PhotoControls 
                        picture={picture}
                        set={props.set}
                        collection={props.collection}
                        controlsEnabled={controlsEnabled}
                        parentUpdateSet={props.parentUpdateSet}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })
        ) : (
          <span 
            className="w-full text-center pt-10 italic text-xl"
            style={{
              gridColumnStart: Math.ceil(columnMultiplier/2)
            }}
          >No Pictures Just Yet</span>
        )}
      </div>
    </>
  )
}