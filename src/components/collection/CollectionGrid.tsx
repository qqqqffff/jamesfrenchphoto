import { useInfiniteQuery, useQueries, UseQueryResult } from "@tanstack/react-query"
import { Dispatch, LegacyRef, SetStateAction, Suspense, useCallback, useEffect, useRef, useState } from "react"
import useWindowDimensions from "../../hooks/windowDimensions"
import { PhotoPathService } from "../../services/photoPathService"
import { PhotoCollection, PhotoSet, PicturePath, UserProfile } from "../../types"
import { AuthContext } from "../../auth"
import { CollectionService } from "../../services/collectionService"
import { PhotoControls } from "./PhotoControls"

interface CollectionGridProps {
  CollectionService: CollectionService,
  PhotoPathService: PhotoPathService,
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
  resetOffsets: boolean, //TODO: implement me with use effect
  completeOffsetReset: Dispatch<SetStateAction<boolean>> //TODO: implement me
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
    props.PhotoPathService.getInfinitePathsQueryOptions(props.set.id, {
      unauthenticated: props.data.token !== undefined,
      participantId: props.data.auth.user?.profile.activeParticipant?.id ?? props.tempUser?.activeParticipant?.id,
      maxItems: Math.ceil(3 * (columnMultiplier) * 1.5)
    })
  )

  const [pictures, setPictures] = useState<PicturePath[]>(pathsQuery.data ? pathsQuery.data.pages[pathsQuery.data.pages.length - 1].memo : [])
  const [pictureColumns, setPictureColumns] = useState<PicturePath[][]>([])
  const [currentControlDisplay, setCurrentControlDisplay] = useState<string>()
  const topIndex = useRef<number>(0)
  const bottomIndex = useRef<number>(columnMultiplier * 6) //initial load 6 rows
  const columnsRef = useRef<(HTMLDivElement | null)[]>([])
  const picturesRef = useRef<Map<string, HTMLDivElement>>(new Map())

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
    //4 rows per page * 3 pages
    const pageMultiplier = Math.ceil(4 * 3 * columnMultiplier)
    if(offset) {
      //bottom index = offset + (offset + multiplier >= length ? length - offset - 1 : multiplier)
      //if offset + multiplier >= length set to length otherwise add multiplier to offset
      bottomIndex.current = offset + ((offset + pageMultiplier) >= allItems.length ? allItems.length - offset - 1 : pageMultiplier)
      //top index = offset - (offset - multiplier > 0 ? multiplier : offset)
      //if offset - multiplier < 0 then set to 0 otherwise subtract mutiplier from offset
      topIndex.current = offset - ((offset - pageMultiplier) < 0 ? offset : pageMultiplier)
      //halfway until the bottom/top
      const halfMultiplier = (pageMultiplier - (columnMultiplier * 2))
      const bottomMidpoint = offset + ((offset + halfMultiplier) >= allItems.length ? allItems.length - offset - 1 : halfMultiplier)
      const topMidpoint = offset - ((offset - halfMultiplier) < 0 ? offset : halfMultiplier)
      return {
        bottom: allItems[bottomMidpoint],
        top: allItems[topMidpoint]
      }
    }
    //if no offset
    bottomIndex.current = allItems.length - 1
    topIndex.current = allItems.length - ((allItems.length - pageMultiplier) < 0 ? allItems.length : pageMultiplier)

    const bottomMidpoint = allItems.length - (allItems.length / 4)
    const topMidpoint = allItems.length / 4
    return {
      bottom: allItems[bottomMidpoint],
      top: allItems[topMidpoint]
    }
  }, [])

  const a = Object.fromEntries(useQueries({
    queries: pictures
      .slice(
        topIndex.current > 0 ? topIndex.current : 0, 
        (bottomIndex.current + 1) > pictures.length ? undefined : bottomIndex.current + 1)
      .map((path) => {
        return props.CollectionService.getPathQueryOptions(path.path, path.id)
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

  const setPicturesRef = useCallback((el: HTMLDivElement | null, id: string) => {
    if(el) {
      picturesRef.current.set(id, el)
    }
  }, [])

  // useQuery(getPathQueryOptions())
  
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

  //if columnmultiplier changes
  useEffect(() => {
    if(pictureColumns.flatMap((pictures) => pictures).length > 0) {
      setPictureColumns([])
    }
  }, [columnMultiplier])

  //if there is some picture that is in the data list but not in the columns add it to the columns
  const flatDisplayPictures = pictureColumns.flatMap((pictures) => pictures)
  if(
    !pictures
      .some((parentPicture) => flatDisplayPictures.some((picture) => picture.id === parentPicture.id))
  ) {
    const newPictures = pictures
      .filter((parentPicture) => !flatDisplayPictures.some((picture) => parentPicture.id === picture.id))
      .sort((a, b) => a.order - b.order)
    const columnMap = columnsRef.current
      .filter((column) => column != null)
      .map((column) => ({height: column.clientHeight, column: column}))
      .sort((a, b) => Number(a.column.id) - Number(b.column.id))
      .map((column, index) => ({ height: column.height, pictureColumn: pictureColumns[index], index: index }))

    if(columnMap.length === 0) {
      //fill columnMap
      for(let i = 0; i < columnMultiplier; i++) {
        columnMap.push({
          height: 0,
          pictureColumn: [],
          index: i
        })
      }

      //greedily add to smallest column
      for(let i = 0; i < newPictures.length; i++) {
        const shortestColumn = columnMap.reduce((prev, cur) => {
          if(cur.height < prev.height) {
            return cur
          }
          return prev
        })

        columnMap[shortestColumn.index] = {
          ...shortestColumn,
          height: columnMap[shortestColumn.index].height + newPictures[i].height + 4, //4px gap on bottom
          pictureColumn: [...shortestColumn.pictureColumn, newPictures[i]]
        }
      }
    }
    else {
      for(let i = 0; i < newPictures.length; i++) {
        const shortestColumn = columnMap.reduce((prev, cur) => {
          if(cur.height < prev.height) {
            return cur
          }
          return prev
        })

        columnMap[shortestColumn.index] = {
          ...shortestColumn,
          height: columnMap[shortestColumn.index].height + newPictures[i].height + 4, //4px gap on bottom
          pictureColumn: [...shortestColumn.pictureColumn, newPictures[i]]
        }
      }
    }

    setPictureColumns(columnMap
        .sort((a, b) => a.index - b.index)
        .map((columns) => columns.pictureColumn)
      )
  }

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
                className="flex flex-col gap-4"
                ref={el => columnsRef.current[i] = el}
                id={String(i)}
              >
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
                        width: `${picture.width}px`,
                        height: `${picture.height}px`
                      }}
                    >
                      <svg className="text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
                        <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
                      </svg>
                    </div>
                  )

                  return (
                    <div
                      ref={el => setPicturesRef(el, picture.id)}
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
                        />
                        <img 
                          src={props.watermarkPath}
                          className="absolute inset-0 w-full top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 object-cover opacity-80"
                          style={{ 
                            maxWidth: `${picture.height}px`
                          }}
                        />
                      </Suspense>
                      <PhotoControls 
                        PhotoPathService={props.PhotoPathService}
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