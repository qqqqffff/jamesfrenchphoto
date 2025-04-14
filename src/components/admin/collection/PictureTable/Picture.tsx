import { Dispatch, FC, HTMLAttributes, SetStateAction, useEffect, useRef, useState } from "react";
import { PhotoCollection, PhotoSet, PicturePath } from "../../../../types";
import { attachClosestEdge, extractClosestEdge, type Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { invariant, useNavigate } from "@tanstack/react-router";
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { getPictureData, isPictureData } from "./PictureData";
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { DropIndicator } from "../../../common/DropIndicator";
import { createPortal } from "react-dom";
import { useMutation, UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { DynamicStringEnumKeysOf, parsePathName } from "../../../../utils";
import { FlowbiteColors } from "flowbite-react";
import { LazyImage } from "../../../common/LazyImage";
import { deleteImagesMutation, DeleteImagesMutationParams, favoriteImageMutation, FavoriteImageMutationParams, ReorderPathsParams, unfavoriteImageMutation, UnfavoriteImageMutationParams } from "../../../../services/photoSetService";
import { HiOutlineDownload, HiOutlineHeart } from 'react-icons/hi'
import { downloadImageMutation, DownloadImageMutationParams } from "../../../../services/photoPathService";
import { CgArrowsExpandRight } from "react-icons/cg";
import { HiOutlineBarsArrowDown, HiOutlineBarsArrowUp, HiOutlineTrash } from "react-icons/hi2";

type PictureState = 
  | {
    type: 'idle'
    }
  | {
    type: 'preview';
    container: HTMLElement
    }
  | {
    type: 'is-dragging';
    }
  | {
    type: 'is-dragging-over';
    closestEdge: Edge | null
  }

const stateStyles: { [Key in PictureState['type']]?: HTMLAttributes<HTMLDivElement>['className'] } = {
  'is-dragging': 'opacity-40',
}

const idle: PictureState = { type: 'idle' }

interface PictureProps {
  index: number,
  paths: PicturePath[]
  set: PhotoSet
  collection: PhotoCollection
  picture: PicturePath
  url: UseQueryResult<[string | undefined, string], Error>
  parentUpdatePaths: Dispatch<SetStateAction<PicturePath[]>>
  parentUpdateSet: Dispatch<SetStateAction<PhotoSet | undefined>>
  parentUpdateCollection: Dispatch<SetStateAction<PhotoCollection | undefined>>
  parentUpdateCollections: Dispatch<SetStateAction<PhotoCollection[]>>
  pictureStyle: (id: string) => string
  selectedPhotos: PicturePath[]
  setSelectedPhotos: (photos: PicturePath[]) => void
  setDisplayPhotoControls: (id?: string) => void
  controlsEnabled: (id: string, override: boolean) => string
  displayTitleOverride: boolean
  notify: (text: string, color: DynamicStringEnumKeysOf<FlowbiteColors>) => void,
  setFilesUploading: Dispatch<SetStateAction<Map<string, File> | undefined>>
  userEmail?: string,
  reorderPaths: UseMutationResult<void, Error, ReorderPathsParams, unknown>
}

export const Picture: FC<PictureProps> = (props: PictureProps) => {
  const ref = useRef<HTMLDivElement | null>(null)
  const [state, setState] = useState<PictureState>(idle)
  const navigate = useNavigate()

  useEffect(() => {
    const element = ref.current
    invariant(element)
    return combine(
      draggable({
        element,
        getInitialData() {
          return getPictureData(props.picture)
        },
        canDrag: () => true,
        onGenerateDragPreview({ nativeSetDragImage }) {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: pointerOutsideOfPreview({
              x: '16px',
              y: '8px'
            }),
            render({ container }) {
              setState({ type: 'preview', container })
            }
          })
        },
        onDragStart() {
          setState({ type: 'is-dragging' })
        },
        onDrop() {
          setState(idle)
        }
      }),
      dropTargetForElements({
        element,
        canDrop({ source }) {
          if(source.element === element) {
            return false
          }

          return isPictureData(source.data)
        },
        getData({ input }) {
          const data = getPictureData(props.picture)
          return attachClosestEdge(data, {
            element,
            input,
            allowedEdges: ['left', 'right']
          })
        },
        getIsSticky(){
          return true
        },
        onDragEnter({ self }) {
          const closestEdge = extractClosestEdge(self.data)
          setState({ type: 'is-dragging-over', closestEdge })
        },
        onDrag({ self }) {
          const closestEdge = extractClosestEdge(self.data)

          setState((current) => {
            if(current.type === 'is-dragging-over' && current.closestEdge === closestEdge) {
              return current
            }
            return { type: 'is-dragging-over', closestEdge }
          })
        },
        onDragLeave() {
          setState(idle)
        },
        onDrop() {
          setState(idle)
        }
      })
    )
  }, [props.picture])

  const deletePath = useMutation({
    mutationFn: (params: DeleteImagesMutationParams) => deleteImagesMutation(params)
  })

  const favorite = useMutation({
    mutationFn: (params: FavoriteImageMutationParams) => favoriteImageMutation(params),
    onSettled: (favorite) => {
      if(favorite) {
        props.parentUpdatePaths(props.paths.map((path) => {
          if(path.id === favorite[1]){
            return ({
              ...path,
              favorite: favorite[0]
            })
          }
          return path
        }))
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
      <div className="relative" id='image-parent-container'>
        <div
          data-picture-id={props.picture.id}
          id='image-container'
          ref={ref}
          className={`
            ${props.pictureStyle(props.picture.id)} ${stateStyles[state.type] ?? ''}
          `}
          // onClick={(event) => {
          //   const temp = [...props.selectedPhotos]
          //   if((event.target as HTMLElement).id.includes('image')){
          //     if(props.selectedPhotos.find((parentPath) => props.picture.id === parentPath.id) !== undefined){
          //       props.setSelectedPhotos(props.selectedPhotos.filter((parentPath) => parentPath.id !== props.picture.id))
          //     }
          //     else if(event.shiftKey && temp.length > 0){
          //       let minIndex = -1
          //       let maxIndex = props.index
          //       for(let i = 0; i < props.paths.length; i++){
          //         if(props.selectedPhotos.find((path) => path.id === props.paths[i].id) !== undefined){
          //           minIndex = i
          //           break
          //         }
          //       }
          //       for(let i = props.paths.length - 1; props.index < i; i--){
          //         if(props.selectedPhotos.find((path) => path.id === props.paths[i].id) !== undefined){
          //           maxIndex = i
          //           break
          //         }
          //       }
          //       minIndex = props.index < minIndex ? props.index : minIndex
          //       if(minIndex > -1){
          //         props.setSelectedPhotos(props.paths.filter((_, i) => i >= minIndex && i <= maxIndex))
          //       }
          //     }
          //     else{
          //       temp.push(props.picture)
          //       props.setSelectedPhotos(temp)
          //     }
          //   }
          // }}
          onMouseEnter={() => {
            props.setDisplayPhotoControls(props.picture.id)
          }}  
          onMouseLeave={() => {
            props.setDisplayPhotoControls(undefined)
          }}
        >
          {props.url.isLoading ? (
            <div className="flex items-center justify-center w-[200px] h-[300px] bg-gray-300 rounded sm:w-96">
              <svg className="w-10 h-10 text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
                <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
              </svg>
            </div>
          ) : (
            <LazyImage 
              src={props.url.data?.[1]} 
              className="object-cover rounded-lg w-[200px] h-[300px] justify-self-center pointer-events-none" 
              id='image'
              loading='lazy'
              draggable={false}
            />
          )}
          <div className={`absolute bottom-0 inset-x-0 pb-1 justify-end flex-row gap-1 me-3 ${props.controlsEnabled(props.picture.id, false)}`}>
            <button 
              title={`${props.picture.favorite !== undefined ? 'Unfavorite' : 'Favorite'}`} 
              className="" 
              onClick={() => {
                if(props.picture.favorite !== undefined && props.picture.favorite !== 'temp'){
                  unfavorite.mutate({
                    id: props.picture.favorite,
                    options: {
                      logging: true
                    }
                  })

                  const temp = props.paths.map((parentPath) => {
                    if(props.picture.id === parentPath.id) {
                      return ({
                        ...parentPath,
                        favorite: undefined
                      })
                    }
                    return parentPath
                  })
                  
                  const updatedSet: PhotoSet = {
                    ...props.set,
                    paths: temp
                  }

                  const updatedCollection: PhotoCollection = {
                    ...props.collection,
                    sets: props.collection.sets.map((set) => {
                      if(set.id === updatedSet.id) return updatedSet
                      return set
                    })
                  }

                  props.parentUpdatePaths(temp)
                  props.parentUpdateSet(updatedSet)
                  props.parentUpdateCollection(updatedCollection)
                  props.parentUpdateCollections((prev) => {
                    const pTemp = [...prev]

                    return pTemp.map((col) => {
                      if(col.id === updatedCollection.id) return updatedCollection
                      return col
                    })
                  })
                }
                else if(props.userEmail && props.picture.favorite === undefined){
                  favorite.mutate({
                    pathId: props.picture.id,
                    user: props.userEmail,
                    options: {
                      logging: true
                    }
                  })

                  const temp = props.paths.map((parentPath) => {
                    if(props.picture.id === parentPath.id){
                      return ({
                        ...parentPath,
                        favorite: 'temp'
                      })
                    }
                    return parentPath
                  })
                  
                  const updatedSet: PhotoSet = {
                    ...props.set,
                    paths: temp
                  }

                  const updatedCollection: PhotoCollection = {
                    ...props.collection,
                    sets: props.collection.sets.map((set) => {
                      if(set.id === updatedSet.id) return updatedSet
                      return set
                    })
                  }

                  props.parentUpdatePaths(temp)
                  props.parentUpdateSet(updatedSet)
                  props.parentUpdateCollection(updatedCollection)
                  props.parentUpdateCollections((prev) => {
                    const temp = [...prev]

                    return temp.map((col) => {
                      if(col.id === updatedCollection.id) return updatedCollection
                      return col
                    })
                  })
                }
              }}
            >
              <HiOutlineHeart size={20} className={`${props.picture.favorite !== undefined ? 'fill-red-400' : ''}`}/>
            </button>
            <button 
              title='Download' 
              className={`${downloadImage.isPending ? 'cursor-wait' : ''}`} 
              onClick={() => {
                if(!downloadImage.isPending){
                  downloadImage.mutate({
                    path: props.picture.path
                  })
                }
              }}
            >
              <HiOutlineDownload size={20} />
            </button>
            <button
              title='Preview Fullscreen'
              onClick={() => {
                navigate({
                  to: `/photo-fullscreen`,
                  search: {
                    set: props.set.id,
                    path: props.picture.id
                  }
                })
              }}
            >
              <CgArrowsExpandRight size={20} />
            </button>
            <button 
              title='Move to Top' 
              className="" 
              onClick={() => {
                const temp = [props.picture, ...props.paths.filter((p) => p.id !== props.picture.id)].map((path, index) => {
                  return {
                    ...path,
                    order: index,
                  }
                })

                props.reorderPaths.mutate({
                  paths: temp,
                })

                const updatedSet: PhotoSet = {
                  ...props.set,
                  paths: temp
                }

                const updatedCollection: PhotoCollection = {
                  ...props.collection,
                  sets: props.collection.sets.map((set) => {
                    if(set.id === updatedSet.id) return updatedSet
                    return set
                  })
                }

                props.parentUpdatePaths(temp)
                props.parentUpdateSet(updatedSet)
                props.parentUpdateCollection(updatedCollection)
                props.parentUpdateCollections((prev) => {
                  const temp = [...prev]

                  return temp.map((col) => {
                    if(col.id === updatedCollection.id) return updatedCollection
                    return col
                  })
                })
              }}
            >
              <HiOutlineBarsArrowUp size={20} />
            </button>
            <button 
              title='Move to Bottom'
              className="" 
              onClick={() => {
                const temp = [...props.paths.filter((p) => p.id !== props.picture.id), props.picture].map((path, index) => {
                  return {
                    ...path,
                    order: index,
                  }
                })

                props.reorderPaths.mutate({
                  paths: temp,
                })

                const updatedSet: PhotoSet = {
                  ...props.set,
                  paths: temp
                }

                const updatedCollection: PhotoCollection = {
                  ...props.collection,
                  sets: props.collection.sets.map((set) => {
                    if(set.id === updatedSet.id) return updatedSet
                    return set
                  })
                }

                props.parentUpdatePaths(temp)
                props.parentUpdateSet(updatedSet)
                props.parentUpdateCollection(updatedCollection)
                props.parentUpdateCollections((prev) => {
                  const pTemp = [...prev]

                  return pTemp.map((col) => {
                    if(col.id === updatedCollection.id) return updatedCollection
                    return col
                  })
                })
              }}
            >
              <HiOutlineBarsArrowDown size={20} />
            </button>
            <button 
              title='Delete' 
              className="" 
              onClick={() => {
                deletePath.mutate({
                  picturePaths: [props.picture],
                  collection: props.collection,
                  options: {
                    logging: true
                  }
                })

                const updatedPaths = props.paths.filter((p) => p.id !== props.picture.id)

                const updatedSet: PhotoSet = {
                  ...props.set,
                  paths: updatedPaths
                }

                const updatedCollection: PhotoCollection = {
                  ...props.collection,
                  sets: props.collection.sets.map((set) => {
                    if(set.id === updatedSet.id) return updatedSet
                    return set
                  })
                }

                props.parentUpdatePaths(updatedPaths)
                props.parentUpdateSet(updatedSet)
                props.parentUpdateCollection(updatedCollection)
                props.parentUpdateCollections((prev) => {
                  const temp = [...prev]

                  return temp.map((col) => {
                    if(col.id === updatedCollection.id) return updatedCollection
                    return col
                  })
                })
              }}
            >
              <HiOutlineTrash size={20} />
            </button>
          </div>
          <div className={`absolute top-1 inset-x-0 justify-center flex-row ${props.controlsEnabled(props.picture.id, props.displayTitleOverride)}`}>
            <p id="image-name">{parsePathName(props.picture.path)}</p>
          </div>
        </div>
        {state.type === 'is-dragging-over' && state.closestEdge && (
          <DropIndicator edge={state.closestEdge} gap='8px' />
        )}
      </div>
      {state.type === 'preview' && createPortal(<DragPreview item={props.picture} />, state.container)}
    </>
  )
}

function DragPreview({ item }: { item: PicturePath }) {
  return <div className="border-solid rounded p-2 bg-white">{parsePathName(item.path)}</div>
}