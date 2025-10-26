import { useInfiniteQuery, useQueries, useQuery, UseQueryResult } from "@tanstack/react-query"
import { Dispatch, LegacyRef, SetStateAction, Suspense, useCallback, useEffect, useRef, useState } from "react"
import useWindowDimensions from "../../hooks/windowDimensions"
import { getInfinitePathsQueryOptions } from "../../services/photoPathService"
import { PhotoCollection, PhotoSet, PicturePath, UserProfile } from "../../types"
import { AuthContext } from "../../auth"
import { getPathQueryOptions } from "../../services/collectionService"
import { PhotoControls } from "./PhotoControls"
import { HiOutlineXCircle } from "react-icons/hi2"
import { CgSpinner } from "react-icons/cg"

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
  resetOffsets: boolean,
  completeOffsetReset: Dispatch<SetStateAction<boolean>>
}

export const CollectionGrid = (props: CollectionGridProps) => {
  const dimensions = useWindowDimensions()

  const columnMultiplier = dimensions.width > 1600 ? 5 : (
    dimensions.width > 800 ? 
      3 : 1
    )

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
  const bottomIndex = useRef<number>(columnMultiplier * 6)
  const picturesRef = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const imageObserverRef = useRef<IntersectionObserver | null>(null) 

  useEffect(() => {
    if(props.resetOffsets) {
      topIndex.current = 0
      bottomIndex.current = columnMultiplier * 6
      currentOffsetIndex.current = undefined
      props.completeOffsetReset(false)
    }
  }, [props.resetOffsets])

  // console.log(topIndex.current, bottomIndex.current, currentOffsetIndex.current)

  const [picDimensions, setPicDimensions] = useState({
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0
  })
  const [closing, setClosing] = useState(false)
  const [expanded, setExpanded] = useState<string>()
  const expandedRef = useRef<HTMLDivElement | null>(null)
  const expandedImageRef = useRef<HTMLImageElement | null>(null)
  const expandedWatermarkRef = useRef<HTMLImageElement | null>(null)
  const [expandedDimensions, setExpandedDimensions] = useState<number>()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleLongPress = useCallback((id: string) => {
    timeoutRef.current = setTimeout(() => {
      handleExpand(id)
    }, 300)
  }, [])

  const handleEndLongPress = useCallback(() => {
    if(timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const handleExpand = (id: string) => {
    const picture = picturesRef.current.get(id)
    if(picture) {
      console.log('expanding')
      const thumbRect = picture.getBoundingClientRect()

      setPicDimensions({
        startX: thumbRect.left,
        startY: thumbRect.top,
        startWidth: thumbRect.width,
        startHeight: thumbRect.height
      })

      setExpanded(id)
      setClosing(false)
    }
  }

  const handleClose = (id: string) => {
    setClosing(true)

    const picture = picturesRef.current.get(id)
    setTimeout(() => {
      setExpanded(undefined)
      setClosing(false)
      picture?.focus()
    }, 300)
  }

  useEffect(() => {
    if(expanded && expandedImageRef.current && expandedRef.current) {
      const expandedRect = expandedImageRef.current.getBoundingClientRect()
      const containerRect = expandedRef.current.getBoundingClientRect()

      const thumbnailCenterX = picDimensions.startX + picDimensions.startWidth / 2
      const thumbnailCenterY = picDimensions.startY + picDimensions.startHeight / 2
      const expandedCenterX = containerRect.left + containerRect.width / 2
      const expandedCenterY = containerRect.top + containerRect.height / 2

      const translateX = thumbnailCenterX - expandedCenterX
      const translateY = thumbnailCenterY - expandedCenterY

      const scaleX = picDimensions.startWidth / expandedRect.width
      const scaleY = picDimensions.startHeight / expandedRect.height

      const scale = Math.min(scaleX, scaleY)

      if(!closing) {
        expandedRef.current.style.transition = 'none'
        expandedRef.current.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`
        expandedRef.current.style.opacity = '0.7'

        expandedRef.current.offsetWidth

        expandedRef.current.style.transition = 'transform 300ms ease-out, opacity 300ms ease-out'
        expandedRef.current.style.transform = 'translate(0,0) scale(1)'
        expandedRef.current.style.opacity = '1'
      }
      else {
        expandedRef.current.style.transform = `translate(${translateX}px, ${translateY}px) scale({${scale}})`
        expandedRef.current.style.opacity = '0.7'
      }
    }
  })

  useEffect(() => {
    if(
      props.watermarkPath &&
      props.watermarkQuery && 
      (
        !expandedWatermarkRef.current?.complete || 
        expandedWatermarkRef.current.naturalWidth < 0
      )
    ) {
      props.watermarkQuery.refetch()
    }
  }, [expandedWatermarkRef.current])

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
    //having an offset means scrolling up
    if(offset) {
      //1 page = 4 rows * 2 pages until next load
      const pageMultiplier = 4 * 2 * columnMultiplier
      //if offset + the pagemultiplier is greater than the length set to the length - the offset otherwise add the multiplier
      const lowerBound = (offset + pageMultiplier) >= allItems.length ? 
        allItems.length - offset - 1 : pageMultiplier
      bottomIndex.current = offset + lowerBound
      //if offset - pagemultiplier is less than 0 then return the offset otherwise subtract the multiplier
      const upperBound = (offset - pageMultiplier) > 0 ? 
        pageMultiplier : offset
      topIndex.current = offset - upperBound

      return {
        bottom: allItems[offset + (lowerBound - (columnMultiplier * 4))],
        top: allItems[offset - (upperBound + (columnMultiplier * 4))]
        // bottom: allItems[offset + ((offset + pageMultiplier - (columnMultiplier * 2)) >= allItems.length ? 
        //   allItems.length - offset - 1 : (pageMultiplier - (columnMultiplier * 2)))],
        // top: allItems[offset - ((offset - (pageMultiplier - (columnMultiplier * 2))) > 0 ? 
        //   (pageMultiplier - (columnMultiplier * 2)) : offset)]
      }
    }
    bottomIndex.current = allItems.length - 1
    topIndex.current = allItems.length - Math.ceil(4 * 6 * columnMultiplier * 1.5)
    return {
      bottom: allItems[allItems.length - allItems.length % columnMultiplier - (columnMultiplier * 2)],
      top: allItems?.[allItems.length - allItems.length % 4 - Math.ceil(4 * 6 * columnMultiplier * 1.5)]
    }
  }, [])

  const pictureQueries = Object.fromEntries(useQueries({
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

  // useEffect(() => {
  //   if(pictures.length === 0) return

  //   if(!bottomObserverRef.current) {
  //     bottomObserverRef.current = new IntersectionObserver((entries) => {
  //       entries.forEach(entry => {
  //         if(entry.isIntersecting &&
  //           currentOffsetIndex.current &&
  //           (currentOffsetIndex.current + (2 * 3 * columnMultiplier * 1.5 - columnMultiplier)) > pictures.length
  //         ) {
  //           currentOffsetIndex.current = undefined
  //         }
  //         else if(
  //           entry.isIntersecting &&
  //           currentOffsetIndex.current &&
  //           (currentOffsetIndex.current + (2 * 3 * columnMultiplier * 1.5 - columnMultiplier)) < pictures.length
  //         ) {
  //           const foundIndex = pictures.findIndex((path) => path.id === entry.target.getAttribute('data-id'))
  //           currentOffsetIndex.current = foundIndex
  //         }
  //         if(
  //           entry.isIntersecting && 
  //           pathsQuery.hasNextPage && 
  //           !pathsQuery.isFetchingNextPage &&
  //           currentOffsetIndex.current === undefined
  //         ) {
  //           pathsQuery.fetchNextPage()
  //         }
  //       })
  //     }, {
  //       root: null,
  //       rootMargin: '0px',
  //       threshold: 0.1
  //     })
  //   }

  //   if(!topObserverRef.current) {
  //     topObserverRef.current = new IntersectionObserver((entries) => {
  //       entries.forEach(entry => {
  //         const foundIndex = pictures.findIndex((path) => path.id === entry.target.getAttribute('data-id'))
  //         if(entry.isIntersecting && foundIndex !== 0) {
  //           currentOffsetIndex.current = foundIndex
  //         }
  //       })
  //     }, {
  //       root: null,
  //       rootMargin: '0px',
  //       threshold: 0.1
  //     })
  //   }
  //   const triggerReturn = getTriggerItems(pictures, currentOffsetIndex.current)

  //   const Tel = picturesRef.current.get(triggerReturn.top?.id ?? '')
  //   const Bel = picturesRef.current.get(triggerReturn.bottom?.id ?? '')

  //   if(Tel && topObserverRef.current && triggerReturn.top?.id) {
  //     Tel.setAttribute('data-id', triggerReturn.top.id)
  //     topObserverRef.current.observe(Tel)
  //   }
  //   if(Bel && bottomObserverRef.current) {
  //     Bel.setAttribute('data-id', triggerReturn.bottom.id)
  //     bottomObserverRef.current.observe(Bel)
  //   }

  //   return () => {
  //     if(bottomObserverRef.current) {
  //       bottomObserverRef.current.disconnect()
  //     }
  //     if(topObserverRef.current) {
  //       topObserverRef.current.disconnect()
  //     }
  //     if(unrenderedObserverRef.current) {
  //       unrenderedObserverRef.current.disconnect()
  //     }
  //     topObserverRef.current = null
  //     bottomObserverRef.current = null
  //     unrenderedObserverRef.current = null
  //   }
  // }, [
  //   pictures,
  //   picturesRef.current,
  //   currentOffsetIndex.current,
  //   pathsQuery.fetchNextPage,
  //   pathsQuery.hasNextPage,
  //   pathsQuery.isFetchingNextPage,
  //   getTriggerItems,
  //   pictureQueries
  // ])

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
  //necessary for first fetch
  useQuery(getPathQueryOptions())
  
  const gridClass = `grid grid-cols-${String(columnMultiplier)} gap-4 mx-4 mt-1 items-start`

  const formattedCollection: PicturePath[][] = Array.from(
    { length: columnMultiplier },
    () => [],
  );
  const columnHeights = new Array(columnMultiplier).fill(0);

  pictures.forEach((picture) => {
    const dimensions = pictureDimensions.find((d) => d[0] === picture.id);
    // Use aspect ratio for height calculation, assuming column width is constant.
    // Default to 1 (square) if dimensions are not yet available.
    const aspectRatio = dimensions
      ? dimensions[1].height / dimensions[1].width
      : 1;

    // Find the column with the minimum height
    let shortestColumnIndex = 0;
    for (let i = 1; i < columnHeights.length; i++) {
      if (columnHeights[i] < columnHeights[shortestColumnIndex]) {
        shortestColumnIndex = i;
      }
    }

    // Add the picture to the shortest column
    formattedCollection[shortestColumnIndex].push(picture);

    // Update the height of that column
    columnHeights[shortestColumnIndex] += aspectRatio;
  });

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
              <div 
                key={i} 
                className="flex flex-col gap-4 h-auto" 
              >
                {subCollection.map((picture, j) => {
                  const url = pictureQueries[picture.id]

                  if(
                    !url?.data ||
                    props.watermarkPath === undefined &&
                    props.watermarkQuery !== undefined
                  ) return (
                    <div
                      id={picture.id}
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
                      tabIndex={j}
                      className="relative focus:ring-0 focus:outline-none" 
                      onContextMenu={(e) => {
                        if(!props.collection.downloadable) e.preventDefault()
                      }}
                      onMouseEnter={(event) => {
                        event.currentTarget.focus()
                        setCurrentControlDisplay(picture.id)
                      }}
                      onMouseLeave={() => setCurrentControlDisplay(undefined)}
                      onMouseDown={() => {
                        handleLongPress(picture.id)
                        setCurrentControlDisplay(picture.id)
                      }}
                      onMouseUp={handleEndLongPress}
                      onTouchStart={() => {
                        handleLongPress(picture.id)
                        setCurrentControlDisplay(picture.id)
                      }}
                      onTouchEnd={handleEndLongPress}
                      onTouchCancel={handleEndLongPress}
                      onKeyDown={(event) => {
                        event.preventDefault()
                        if(event.key === ' ') handleExpand(picture.id)
                      }}
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
                      {expanded === picture.id && (
                        <div
                          className="fixed inset-0 z-50 flex items-center justify-center bg-black transition-all duration-300 ease-in-out"
                          style={{ backgroundColor: closing ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.8)' }}
                        >
                          <div
                            ref={expandedRef}
                            className="relative w-screen h-screen transition-all duration-300 ease-in-out"
                            style={{
                              transformOrigin: 'center',
                              willChange: 'transform, opacity'
                            }}
                          >
                            <button 
                              className="absolute opacity-60 hover:cursor-pointer hover:opacity-85 pointer-events-auto"
                              onClick={() => handleClose(picture.id)}
                            >
                              <HiOutlineXCircle size={48} className="fill-white"/>
                            </button>
                            <img 
                              ref={expandedImageRef}
                              src={url.data?.[1]}
                              className="w-full max-h-screen object-contain rounded shadow-xl"
                              onLoad={(load) => {
                                const naturalRatio = load.currentTarget.naturalWidth / load.currentTarget.naturalHeight
                                
                                setExpandedDimensions(naturalRatio * load.currentTarget.clientHeight)
                              }}
                            />
                            {props.watermarkQuery && props.watermarkQuery.isLoading ? (
                              <CgSpinner 
                                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 inset-0 opacity-80 w-screen h-screen"
                                style={expandedDimensions ? { 
                                  maxWidth: `${expandedDimensions}px`
                                  } : { }}
                              />
                            ) : props.watermarkPath && (
                              <img 
                                ref={expandedWatermarkRef}
                                src={props.watermarkPath}
                                style={expandedDimensions ? { 
                                  maxWidth: `${expandedDimensions}px`
                                  } : { }}
                                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 inset-0 opacity-80 w-screen h-screen"
                              />
                            )}
                          </div>
                        </div>
                      )}
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