import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { ComponentProps, Dispatch, MutableRefObject, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { isDraggingAPicture, isPictureData, isPictureDropTargetData } from "./PictureData";
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { flushSync } from "react-dom";
import { triggerPostMoveFlash } from "@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash";
import { Picture } from "./Picture";
import { PhotoCollection, PhotoSet, PicturePath } from '../../../../types';
import { DynamicStringEnumKeysOf } from '../../../../utils';
import { FlowbiteColors } from 'flowbite-react';
import { useMutation, useQueries, useQuery, UseQueryResult } from '@tanstack/react-query';
import { CollectionService } from '../../../../services/collectionService';
import { PhotoSetService, ReorderPathsParams } from '../../../../services/photoSetService';
import { UploadImagePlaceholder } from '../UploadImagePlaceholder';
import { PhotoPathService } from '../../../../services/photoPathService';
import Loading from '../../../common/Loading';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import useWindowDimensions from '../../../../hooks/windowDimensions';
import { FavoriteService } from '../../../../services/favoriteService';

interface PictureListProps extends ComponentProps<'div'> {
  CollectionService: CollectionService,
  PhotoPathService: PhotoPathService,
  PhotoSetService: PhotoSetService,
  FavoriteService: FavoriteService,
  set: PhotoSet,
  collection: PhotoCollection
  paths: PicturePath[],
  parentUpdatePaths: Dispatch<SetStateAction<PicturePath[]>>
  parentUpdateSet: Dispatch<SetStateAction<PhotoSet | undefined>>
  parentUpdateCollection: Dispatch<SetStateAction<PhotoCollection | undefined>>
  parentUpdateCollections: Dispatch<SetStateAction<PhotoCollection[]>>
  selectedPhotos: PicturePath[]
  setSelectedPhotos: Dispatch<SetStateAction<PicturePath[]>>
  displayTitleOverride: boolean
  notify: (text: string, color: DynamicStringEnumKeysOf<FlowbiteColors>) => void,
  setFilesUploading: Dispatch<SetStateAction<File[] | undefined>>

  uploadInputRef: MutableRefObject<HTMLInputElement | null>

  participantId?: string,
  pathsQuery: UseQueryResult<PhotoSet | null, Error>
}

export const PictureList = (props: PictureListProps) => {
  const { width } = useWindowDimensions()
  const bottomObserverRef = useRef<IntersectionObserver | null>(null)
  const topObserverRef = useRef<IntersectionObserver | null>(null)
  const topIndex = useRef<number>(-1)
  const bottomIndex = useRef<number>(-1)
  const picturesRef = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const [isDragging, setIsDragging] = useState<PicturePath>()
  const [watermarkPath, setWatermarkPath] = useState<string>()
  const listRef = useRef<HTMLDivElement | null>(null)

  const reorderPaths = useMutation({
    mutationFn: (params: ReorderPathsParams) => props.PhotoSetService.reorderPathsMutation(params)
  })

  const watermarkQuery = useQuery(
    props.CollectionService.getPathQueryOptions(props.set.watermarkPath ?? props.collection.watermarkPath, props.collection.id)
  )

  useEffect(() => {
    if(topIndex.current === -1) {
      topIndex.current = 0
    }
    if(bottomIndex.current === -1) {
      bottomIndex.current = props.paths.length - 1 < 16 ? props.paths.length - 1 : 15
    }
    const element = listRef.current
    
    if(!element) {
      return
    }

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
            const indexOfSource = props.paths.findIndex((picture) => picture.id === sourceData.picture.id)
            const indexOfTarget = props.paths.findIndex((picture) => picture.id === targetData.picture.id)
  
            //should be a reorder with edge instead of a swap
            if(indexOfSource < 0 || indexOfTarget < 0) {
              return
            }

            const closestEdgeOfTarget = extractClosestEdge(targetData)
  
            const updatedPaths: PicturePath[] = []
  
            for(let i = 0; i < indexOfTarget + (closestEdgeOfTarget === 'left' ? 0 : 1); i++) {
              if(i === indexOfSource) continue
              updatedPaths.push({
                ...props.paths[i],
                order: i
              })
            }
            updatedPaths.push({
              ...props.paths[indexOfSource],
              order: indexOfTarget
            })
            for(let i = indexOfTarget + (closestEdgeOfTarget === 'left' ? 0 : 1); i < props.paths.length; i++) {
              if(i === indexOfSource) continue
              updatedPaths.push({
                ...props.paths[i],
                order: i
              })
            }
  
            flushSync(() => {
              props.parentUpdatePaths(updatedPaths)
              props.parentUpdateSet({
                ...props.set,
                paths: updatedPaths
              })
              props.parentUpdateCollection({
                ...props.collection,
                sets: props.collection.sets.map((set) => set.id === props.set.id ? ({ ...props.set, paths: updatedPaths }) : set)
              })
              reorderPaths.mutate({
                paths: updatedPaths,
                options: {
                  logging: true
                }
              })
            })
  
            const element = document.querySelector(`[data-picture-id="${sourceData.picture.id}"]`)
            if(element instanceof HTMLElement) {
              triggerPostMoveFlash(element)
            }
          }
          //if the dnd-ed object is in the set of selected photos
          //TODO: validate updated logic
          else {
            const targetIndex = props.paths.findIndex((picture) => picture.id == targetData.picture.id)
            if(targetIndex < 0) return;

            const closestEdgeOfTarget = extractClosestEdge(targetData)
            const set: Set<number> = new Set(props.selectedPhotos.map((picture) => picture.order))
            const updatedPaths: PicturePath[] = []

            const rightTarget = targetIndex + (closestEdgeOfTarget === 'left' ? 0 : 1)
            for(let i = 0; i < rightTarget; i++) {
              if(set.has(i)) continue
              updatedPaths.push({
                ...props.paths[i],
                order: i
              })
            }
            const leftLength = updatedPaths.length
            for(let i = 0; i < props.selectedPhotos.length; i++) {
              updatedPaths.push({
                ...props.selectedPhotos[i],
                order: leftLength + i
              })
            }
            
            for(let i = rightTarget; i < props.paths.length; i++) {
              if(set.has(i)) continue
              updatedPaths.push({
                ...props.paths[i],
                order: leftLength + props.selectedPhotos.length + i - targetIndex - (closestEdgeOfTarget === 'left' ? 1 : 0)
              })
            }

            // const filteredFirstSlice: PicturePath[] = props.paths
            //   .slice(0, targetIndex)
            //   .filter((picture) => !props.selectedPhotos.some((sPicture) => sPicture.id === picture.id))

            // const filteredSecondSlice: PicturePath[] = props.paths
            //   .slice(targetIndex)
            //   .filter((picture) => !props.selectedPhotos.some((sPicture) => sPicture.id === picture.id))

            // const mergedArray: PicturePath[] = [
            //   ...filteredFirstSlice,
            //   ...props.selectedPhotos.sort((a, b) => a.order - b.order),
            //   ...filteredSecondSlice
            // ].map((picture, index) => ({...picture, order: index}))

            flushSync(() => {
              reorderPaths.mutate({
                paths: updatedPaths,
                options: {
                  logging: true
                }
              })
    
              props.setSelectedPhotos([...props.selectedPhotos].map((picture) => {
                return {
                  ...picture,
                  order: updatedPaths.findIndex((pPicture) => pPicture.id === picture.id)
                }
              }))
              props.parentUpdatePaths(updatedPaths)
              props.parentUpdateSet({
                ...props.set,
                paths: updatedPaths
              })
              props.parentUpdateCollection({
                ...props.collection,
                sets: props.collection.sets.map((set) => set.id === props.set.id ? ({...props.set, paths: updatedPaths}) : set)
              })
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
    if(!bottomObserverRef.current) {  
      bottomObserverRef.current = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const path = props.paths.find((path) => path.id === entry.target.id)
          if(
            entry.isIntersecting && 
            path !== undefined &&
            path.order >= bottomIndex.current - 4 &&
            bottomIndex.current < props.paths.length - 1
          ) {
            const countOffset = ((props.paths.length - 1) > (bottomIndex.current + 4) ? 4 : props.paths.length - 1)

            topIndex.current = topIndex.current + countOffset
            bottomIndex.current = bottomIndex.current + countOffset
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
          const path = props.paths.find((path) => path.id)
          if(
            entry.isIntersecting &&
            path !== undefined &&
            path.order <= topIndex.current + 4 &&
            topIndex.current > 0
          ) {
            const countOffset = (topIndex.current - 4) > 0 ? 4 : topIndex.current

            topIndex.current = topIndex.current - countOffset
            bottomIndex.current = bottomIndex.current - countOffset
          }
        })
      })
    }

    const bottomElement = picturesRef.current.get(props.paths[bottomIndex.current]?.id ?? '')
    const topElement = picturesRef.current.get(props.paths[topIndex.current]?.id ?? '')
    if(bottomElement && bottomObserverRef.current) {
      bottomObserverRef.current.observe(bottomElement)
    }
    if(topElement && topObserverRef.current) {
      topObserverRef.current.observe(topElement)
    }
    if(bottomIndex.current - topIndex.current <= 8) {
      bottomIndex.current = topIndex.current + 8 < props.paths.length - 1 ? topIndex.current + 8 : props.paths.length - 1
      topIndex.current = bottomIndex.current - 8 >= 0 ? bottomIndex.current - 8 : 0
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
    props.pathsQuery,
    bottomIndex.current,
    topIndex.current
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
      queries: props.paths
        .slice(topIndex.current > 0 ? topIndex.current : 0, bottomIndex.current + 1)
        .map((path) => {
          return props.CollectionService.getPathQueryOptions(path.path, path.id)
        })
    })
    .map((query, index) => {
      return [
        props.paths[index + (topIndex.current > 0 ? topIndex.current : 0)].id,
        query
      ]
    })
  )

  // console.log(topIndex.current, bottomIndex.current)

  const gridClassName = ` 
    grid-cols-${width > 1500 ? '4' : width > 1200 ? '3' : '2'} 
    grid gap-4 bg-white rounded-lg shadow py-2 px-2 overflow-y-scroll max-h-[88vh]
  `

  return (
    <div className="pt-6 my-0 mx-auto h-[90vh] px-4">
      <div className={gridClassName} ref={listRef}>
        {props.paths.map((item, index) => {
          return (
            <div 
              className="relative" 
              ref={el => setItemRef(el, item.id)}
              key={index}
              id={item.id}
            >
              <Picture 
                PhotoSetService={props.PhotoSetService}
                PhotoPathService={props.PhotoPathService}
                FavoriteService={props.FavoriteService}
                index={index}
                set={props.set}
                collection={props.collection}
                paths={props.paths}
                picture={item}
                url={urls[item.id]}
                parentUpdatePaths={props.parentUpdatePaths}
                parentUpdateSet={props.parentUpdateSet}
                parentUpdateCollection={props.parentUpdateCollection}
                parentUpdateCollections={props.parentUpdateCollections}
                selectedPhotos={props.selectedPhotos}
                setSelectedPhotos={props.setSelectedPhotos}
                displayTitleOverride={props.displayTitleOverride}
                notify={props.notify}
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
        {props.pathsQuery.isLoading && (
          <div id="set-picture-loading-trigger" className="h-5 my-3 text-center text-sm text-gray-500">
            <span>Loading</span>
            <Loading />
          </div>
        )}
        <UploadImagePlaceholder
          setFilesUploading={props.setFilesUploading}
          uploadInputRef={props.uploadInputRef}
          className="h-full place-self-center w-full"
        />
      </div>
    </div>
  )
}