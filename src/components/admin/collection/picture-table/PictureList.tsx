import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { ComponentProps, Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { isPictureData } from "./PictureData";
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { flushSync } from "react-dom";
import { reorderWithEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge';
import { triggerPostMoveFlash } from "@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash";
import { Picture } from "./Picture";
import { PhotoCollection, PhotoSet, PicturePath } from '../../../../types';
import { DynamicStringEnumKeysOf } from '../../../../utils';
import { FlowbiteColors } from 'flowbite-react';
import { InfiniteData, UseInfiniteQueryResult, useMutation, useQueries, UseQueryResult } from '@tanstack/react-query';
import { getPathQueryOptions } from '../../../../services/collectionService';
import { reorderPathsMutation, ReorderPathsParams } from '../../../../services/photoSetService';
import { UploadImagePlaceholder } from '../UploadImagePlaceholder';
import { GetInfinitePathsData } from '../../../../services/photoPathService';
import Loading from '../../../common/Loading';

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
  userEmail?: string,
  pathsQuery: UseInfiniteQueryResult<InfiniteData<GetInfinitePathsData, unknown>, Error>
}

export const PictureList = (props: PictureListProps) => {
  const [pictures, setPictures] = useState<PicturePath[]>(props.paths)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const picturesRef = useRef<[HTMLDivElement | null][]>([])

  const reorderPaths = useMutation({
    mutationFn: (params: ReorderPathsParams) => reorderPathsMutation(params)
  })

  useEffect(() => {
    setPictures(props.paths)

    return monitorForElements({
      canMonitor({ source }) {
        return isPictureData(source.data)
      },
      onDrop({ location, source }) {
        const target = location.current.dropTargets[0]
        if(!target) {
          return
        }

        const sourceData = source.data
        const targetData = target.data

        if(!isPictureData(sourceData) || !isPictureData(targetData)) {
          return
        }

        const indexOfSource = pictures.findIndex((picture) => picture.id === sourceData.pictureId)
        const indexOfTarget = pictures.findIndex((picture) => picture.id === targetData.pictureId)

        if(indexOfTarget < 0 || indexOfTarget < 0) {
          return
        }

        const updatedPaths = pictures.map((path) => {
          if(path.id === sourceData.pictureId) {
            return {
              ...path,
              order: indexOfTarget
            }
          }
          else if(path.id === targetData.pictureId) {
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
        })

        const element = document.querySelector(`[data-picture-id="${sourceData.pictureId}"]`)
        if(element instanceof HTMLElement) {
          triggerPostMoveFlash(element)
        }
      }
    })
  }, [props.paths])

  useEffect(() => {
    if(!observerRef.current) {
      observerRef.current = new IntersectionObserver((entries) => {
        const [entry] = entries

        if(entry.isIntersecting && props.pathsQuery.hasNextPage && !props.pathsQuery.isFetchingNextPage) {
          props.pathsQuery.fetchNextPage()
        }
      }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
      })
    }

    const loadingElement = document.getElementById('set-image-loading-trigger')
    if(loadingElement) {
      observerRef.current.observe(loadingElement)
    }

    return () => {
      if(observerRef.current && loadingElement) {
        observerRef.current.unobserve(loadingElement)
      }
      observerRef.current = null
    }
  }, [
    props.pathsQuery.fetchNextPage, 
    props.pathsQuery.hasNextPage, 
    props.pathsQuery.isFetchingNextPage,
  ])

  const urls: Record<string, UseQueryResult<[string | undefined, string], Error>> = 
    Object.fromEntries(
      useQueries({
        queries: pictures
          .map((path) => {
            return getPathQueryOptions(path.path, path.id)
          })
      })
      .map((query, index) => {
        return [
          pictures[index].id,
          query
        ]
      })
    )

    //TODO: observe an item of the second to last row (len - 4)
    //TODO: sorting the picture set by alphabetical
  return (
    <div className="pt-6 my-0 mx-auto max-h-[90vh] overflow-y-auto px-4">
      <div className="grid grid-cols-4 gap-4 bg-white rounded-lg shadow py-2" ref={}>
        {pictures.map((item, index) => {
          
          return (
            <Picture 
              ref={picturesRef.current[index]}
              key={index}
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
              userEmail={props.userEmail}
              reorderPaths={reorderPaths}
            />
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