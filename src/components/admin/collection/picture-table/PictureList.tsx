import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { ComponentProps, Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { isDraggingAPicture, isPictureData, isPictureDropTargetData } from "./PictureData";
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { flushSync } from "react-dom";
import { reorderWithEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge';
import { triggerPostMoveFlash } from "@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash";
import { Picture } from "./Picture";
import { PhotoCollection, PhotoSet, PicturePath } from '../../../../types';
import { DynamicStringEnumKeysOf } from '../../../../utils';
import { FlowbiteColors } from 'flowbite-react';
import { InfiniteData, UseInfiniteQueryResult, useMutation, UseMutationResult, useQueries, useQuery, UseQueryResult } from '@tanstack/react-query';
import { getPathQueryOptions, RepairItemCountsParams } from '../../../../services/collectionService';
import { reorderPathsMutation, ReorderPathsParams } from '../../../../services/photoSetService';
import { UploadImagePlaceholder } from '../UploadImagePlaceholder';
import { GetInfinitePathsData } from '../../../../services/photoPathService';
import Loading from '../../../common/Loading';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { invariant } from '@tanstack/react-router';
import useWindowDimensions from '../../../../hooks/windowDimensions';

interface PictureListProps extends ComponentProps<'div'> {
  set: PhotoSet,
  collection: PhotoCollection
  paths: PicturePath[],
  parentUpdatePaths: Dispatch<SetStateAction<PicturePath[]>>
  parentUpdateSet: Dispatch<SetStateAction<PhotoSet | undefined>>
  parentUpdateCollection: Dispatch<SetStateAction<PhotoCollection | undefined>>
  parentUpdateCollections: Dispatch<SetStateAction<PhotoCollection[]>>
  pictureStyle: (id: string) => string,
  selectedPhotos: PicturePath[]
  setSelectedPhotos: (photos: PicturePath[]) => void
  setDisplayPhotoControls: (id?: string) => void
  controlsEnabled: (id: string, override: boolean) => string
  displayTitleOverride: boolean
  notify: (text: string, color: DynamicStringEnumKeysOf<FlowbiteColors>) => void,
  setFilesUploading: Dispatch<SetStateAction<Map<string, File> | undefined>>
  participantId?: string,
  pathsQuery: UseInfiniteQueryResult<InfiniteData<GetInfinitePathsData, unknown>, Error>
  repairItemCounts: UseMutationResult<PhotoCollection | undefined, Error, RepairItemCountsParams, unknown>
}

export const PictureList = (props: PictureListProps) => {
  const { width } = useWindowDimensions()
  const [pictures, setPictures] = useState<PicturePath[]>(props.paths)
  const bottomObserverRef = useRef<IntersectionObserver | null>(null)
  const topObserverRef = useRef<IntersectionObserver | null>(null)
  const currentOffsetIndex = useRef<number | undefined>()
  const topIndex = useRef<number>(0)
  const bottomIndex = useRef<number>(props.paths.length - 1)
  const picturesRef = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const [isDragging, setIsDragging] = useState<PicturePath>()
  const [watermarkPath, setWatermarkPath] = useState<string>()
  const listRef = useRef<HTMLDivElement | null>(null)

  const reorderPaths = useMutation({
    mutationFn: (params: ReorderPathsParams) => reorderPathsMutation(params)
  })

  const watermarkQuery = useQuery(
    getPathQueryOptions(props.set.watermarkPath ?? props.collection.watermarkPath, props.collection.id)
  )

  const getTriggerItems = useCallback((allItems: PicturePath[], offset?: number): {
    bottom: PicturePath, 
    top?: PicturePath,
  } => {
    //38 = 2.5 pages for indexes
    //32 = 2 pages for trigger
    if(offset) {
      bottomIndex.current = (offset) + ((offset + 38) >= allItems.length ? allItems.length - offset - 1 : 38)
      topIndex.current = (offset) - ((offset - 38) > 0 ? 38 : offset)
      return {
        bottom: allItems[(offset) + ((offset + 32) >= allItems.length ? allItems.length - offset - 1 : 32)],
        top: allItems[(offset) - ((offset - 32) > 0 ? 32 : offset)]
      }
    }
    //when downward scrolling 4 pages up will remain rendered (64 pictures )
    //first row of bottom page will trigger
    bottomIndex.current = allItems.length - 1
    topIndex.current = allItems.length - 65
    return {
      bottom: allItems[allItems.length - allItems.length % 4 - 4],
      top: allItems?.[allItems.length - allItems.length % 4 - 61],
    }
  }, [])

  useEffect(() => {
    setPictures(props.paths)
    const element = listRef.current
    invariant(element)

    return combine(
      monitorForElements({
        canMonitor: isDraggingAPicture,
        onDrop({ location, source }) {
          const target = location.current.dropTargets[0]
          if(!target) {
            return
          }
          const sourceData = source.data
          const targetData = target.data

          if(!isPictureData(sourceData) || !isPictureDropTargetData(targetData)) {
            return
          }

          //if the dnd-ed object is the single selected photo or if it is not a selected photo
          const draggingSelected = props.selectedPhotos.some((picture) => picture.id === sourceData.picture.id)
          if(props.selectedPhotos.length == 1 && !draggingSelected) {
            const indexOfSource = pictures.findIndex((picture) => picture.id === sourceData.picture.id)
            const indexOfTarget = pictures.findIndex((picture) => picture.id === targetData.picture.id)
  
            if(indexOfTarget < 0 || indexOfTarget < 0) {
              return
            }
  
            const updatedPaths = pictures.map((path) => {
              if(path.id === sourceData.picture.id) {
                return {
                  ...path,
                  order: indexOfTarget
                }
              }
              else if(path.id === targetData.picture.id) {
                return {
                  ...path,
                  order: indexOfSource
                }
              }
              return path
            })
  
            reorderPaths.mutate({
              paths: updatedPaths,
              options: {
                logging: true
              }
            })
  
            const closestEdgeOfTarget = extractClosestEdge(targetData)
  
            flushSync(() => {
              const newPictures = reorderWithEdge({
                list: updatedPaths,
                startIndex: indexOfSource,
                indexOfTarget,
                closestEdgeOfTarget,
                axis: 'horizontal'
              })
              setPictures(newPictures)
              props.parentUpdatePaths(newPictures)
              props.parentUpdateSet({
                ...props.set,
                paths: newPictures
              })
              props.parentUpdateCollection({
                ...props.collection,
                sets: props.collection.sets.map((set) => set.id === props.set.id ? ({...props.set, paths: newPictures}) : set)
              })
            })
  
            const element = document.querySelector(`[data-picture-id="${sourceData.picture.id}"]`)
            if(element instanceof HTMLElement) {
              triggerPostMoveFlash(element)
            }
          }
          //if the dnd-ed object is in the set of selected photos
          else {
            const targetIndex = pictures.findIndex((picture) => picture.id == targetData.picture.id)
            if(targetIndex < 0) return;

            const filteredFirstSlice: PicturePath[] = pictures
              .slice(0, targetIndex)
              .filter((picture) => !props.selectedPhotos.some((sPicture) => sPicture.id === picture.id))

            const filteredSecondSlice: PicturePath[] = pictures
              .slice(targetIndex)
              .filter((picture) => !props.selectedPhotos.some((sPicture) => sPicture.id === picture.id))

            const mergedArray: PicturePath[] = [
              ...filteredFirstSlice,
              ...props.selectedPhotos.sort((a, b) => a.order - b.order),
              ...filteredSecondSlice
            ].map((picture, index) => ({...picture, order: index}))

            reorderPaths.mutate({
              paths: mergedArray,
              options: {
                logging: true
              }
            })
  
            setPictures(mergedArray)
            props.setSelectedPhotos([...props.selectedPhotos].map((picture) => {
              return {
                ...picture,
                order: mergedArray.findIndex((pPicture) => pPicture.id === picture.id)
              }
            }))
            props.parentUpdatePaths(mergedArray)
            props.parentUpdateSet({
              ...props.set,
              paths: mergedArray
            })
            props.parentUpdateCollection({
              ...props.collection,
              sets: props.collection.sets.map((set) => set.id === props.set.id ? ({...props.set, paths: mergedArray}) : set)
            })

            props.selectedPhotos
              .map((picture) => document.querySelector(`[data-picture-id="${picture.id}"]`))
              .forEach((element) => {
                if(element instanceof HTMLElement) {
                  triggerPostMoveFlash(element)
                }
              })
          }
        }
      }),
      autoScrollForElements({
        canScroll({ source }) {
          return isDraggingAPicture({ source })
        },
        element
      })
    )
  }, [
    props.paths, 
    props.selectedPhotos
  ])

  useEffect(() => {
    if(props.paths.length == 0) return

    if(!bottomObserverRef.current) {
      bottomObserverRef.current = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if(entry.isIntersecting && 
            currentOffsetIndex.current &&
            currentOffsetIndex.current + 32 > pictures.length
          ) {
            currentOffsetIndex.current = undefined
          }
          else if(entry.isIntersecting &&
            currentOffsetIndex.current &&
            currentOffsetIndex.current + 32 < pictures.length
          ) {
            currentOffsetIndex.current = pictures.findIndex((path) => path.id === entry.target.getAttribute('data-id'))
          }
          if(entry.isIntersecting && 
            props.pathsQuery.hasNextPage && 
            !props.pathsQuery.isFetchingNextPage &&
            !currentOffsetIndex.current
          ) {
            props.pathsQuery.fetchNextPage()
          }
          
          else if(
            entry.isIntersecting && 
            !props.pathsQuery.hasNextPage && 
            props.paths.length !== props.set.items &&
            !props.repairItemCounts.isPending
          ) {
            props.repairItemCounts.mutate({
              collection: props.collection,
              options: {
                logging: true
              }
            })
          }
        })
      }, {
        root: null,
        rootMargin: '0px',
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

    const triggerReturn = getTriggerItems(props.paths, currentOffsetIndex.current)
    // console.log(triggerReturn, bottomIndex.current, topIndex.current, props.paths.length)

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
      if(bottomObserverRef.current){
        bottomObserverRef.current.disconnect()
      }
      if(topObserverRef.current) {
        topObserverRef.current.disconnect()
      }
      topObserverRef.current = null
      bottomObserverRef.current = null
    }
  }, [
    props.paths,
    currentOffsetIndex,
    props.pathsQuery.fetchNextPage, 
    props.pathsQuery.hasNextPage, 
    props.pathsQuery.isFetchingNextPage,
    getTriggerItems,
    props.repairItemCounts.isPending,
  ])

  useEffect(() => {
    if(watermarkQuery.data) {
      setWatermarkPath(watermarkQuery.data[1])
    }
  }, [watermarkQuery.data])

  const setItemRef = useCallback((el: HTMLDivElement | null, id: string) => {
    if(el) {
      picturesRef.current.set(id, el)
    }
  }, [])

  const urls: Record<string, UseQueryResult<[string | undefined, string], Error>> = 
  Object.fromEntries(
    useQueries({
      queries: pictures
        .slice(topIndex.current > 0 ? topIndex.current : 0, bottomIndex.current + 1)
        .map((path) => {
          return getPathQueryOptions(path.path, path.id)
        })
    })
    .map((query, index) => {
      return [
        pictures[index + (topIndex.current > 0 ? topIndex.current : 0)].id,
        query
      ]
    })
  )

  

  const gridClassName = ` 
    grid-cols-${width > 1500 ? '4' : width > 1200 ? '3' : '2'} 
    grid gap-4 bg-white rounded-lg shadow py-2 px-2 overflow-y-scroll max-h-[88vh]
  `

  return (
    <div className="pt-6 my-0 mx-auto h-[90vh] px-4">
      <div className={gridClassName} ref={listRef}>
        {pictures.map((item, index) => {
          return (
            <div 
              className="relative" 
              ref={el => setItemRef(el, item.id)}
              key={index}
            >
              <Picture 
                index={index}
                set={props.set}
                collection={props.collection}
                paths={pictures}
                picture={item}
                url={urls[item.id]}
                parentUpdatePaths={props.parentUpdatePaths}
                parentUpdateSet={props.parentUpdateSet}
                parentUpdateCollection={props.parentUpdateCollection}
                parentUpdateCollections={props.parentUpdateCollections}
                pictureStyle={props.pictureStyle}
                selectedPhotos={props.selectedPhotos}
                setSelectedPhotos={props.setSelectedPhotos}
                setDisplayPhotoControls={props.setDisplayPhotoControls}
                controlsEnabled={props.controlsEnabled}
                displayTitleOverride={props.displayTitleOverride}
                notify={props.notify}
                setFilesUploading={props.setFilesUploading}
                participantId={props.participantId}
                reorderPaths={reorderPaths}
                watermarkQuery={watermarkQuery}
                watermarkPath={watermarkPath}
                parentIsDragging={isDragging}
                parentUpdateIsDragging={setIsDragging}
              />
            </div>
          )
        })}
        {props.pathsQuery.hasNextPage && (
          <div id="set-picture-loading-trigger" className="h-5 my-3 text-center text-sm text-gray-500">
            {props.pathsQuery.isFetchingNextPage && (
              <>
                <span>Loading</span>
                <Loading />
              </>
            )}
          </div>
        )}
        <UploadImagePlaceholder
          setFilesUploading={props.setFilesUploading}
          className="h-full place-self-center w-full"
        />
      </div>
    </div>
  )
}