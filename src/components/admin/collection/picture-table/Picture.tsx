import { Dispatch, HTMLAttributes, SetStateAction, useEffect, useRef, useState, KeyboardEvent } from "react";
import { PhotoCollection, PhotoSet, PicturePath } from "../../../../types";
import { attachClosestEdge, extractClosestEdge, type Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { 
  useNavigate 
} from "@tanstack/react-router";
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { getPictureData, getPictureDropTargetData, isDraggingAPicture, isPictureData } from "./PictureData";
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { DropIndicator } from "../../../common/DropIndicator";
import { createPortal } from "react-dom";
import { useMutation, UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { DynamicStringEnumKeysOf, parsePathName } from "../../../../utils";
import { FlowbiteColors } from "flowbite-react";
import { LazyImage } from "../../../common/LazyImage";
import { PhotoSetService, DeleteImagesMutationParams, FavoriteImageMutationParams, ReorderPathsParams, UnfavoriteImageMutationParams } from "../../../../services/photoSetService";
import { HiOutlineDownload, HiOutlineHeart } from 'react-icons/hi'
import { DownloadImageMutationParams, PhotoPathService } from "../../../../services/photoPathService";
import { CgArrowsExpandRight, CgSpinner } from "react-icons/cg";
import { HiOutlineBarsArrowDown, HiOutlineBarsArrowUp, HiOutlineTrash, HiOutlineXCircle } from "react-icons/hi2";

type PictureState = 
  | {
    type: 'idle'
    }
  | {
    type: 'preview';
    container: HTMLElement
    dragging: DOMRect
    }
  | {
    type: 'is-dragging';
    }
  | {
    type: 'is-over';
    closestEdge: Edge | null
    dragging: DOMRect
  }

const outerStyles: { [Key in PictureState['type']]?: HTMLAttributes<HTMLDivElement>['className'] } = {
  'is-dragging': 'opacity-40',
}

const idle: PictureState = { type: 'idle' }

//TODO: validate dnd is implemented properly
interface PictureProps {
  PhotoPathService: PhotoPathService,
  PhotoSetService: PhotoSetService,
  index: number,
  paths: PicturePath[],
  set: PhotoSet,
  collection: PhotoCollection,
  picture: PicturePath,
  url?: UseQueryResult<[string | undefined, string] | undefined, Error>,
  parentUpdatePaths: Dispatch<SetStateAction<PicturePath[]>>,
  parentUpdateSet: Dispatch<SetStateAction<PhotoSet | undefined>>,
  parentUpdateCollection: Dispatch<SetStateAction<PhotoCollection | undefined>>,
  parentUpdateCollections: Dispatch<SetStateAction<PhotoCollection[]>>,
  pictureStyle: (id: string) => string,
  selectedPhotos: PicturePath[],
  setSelectedPhotos: (photos: PicturePath[]) => void,
  setDisplayPhotoControls: (id?: string) => void,
  controlsEnabled: (id: string, override: boolean) => string,
  displayTitleOverride: boolean,
  notify: (text: string, color: DynamicStringEnumKeysOf<FlowbiteColors>) => void,
  participantId?: string,
  reorderPaths: UseMutationResult<void, Error, ReorderPathsParams, unknown>,
  watermarkQuery?: UseQueryResult<[string | undefined, string] | undefined, Error>,
  watermarkPath?: string,
  parentIsDragging?: PicturePath,
  parentUpdateIsDragging: Dispatch<SetStateAction<PicturePath | undefined>>,
}

export const Picture = (props: PictureProps) => {
  const outerRef = useRef<HTMLDivElement | null>(null)
  const [state, setState] = useState<PictureState>(idle)
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [closing, setClosing] = useState(false)
  const expandedRef = useRef<HTMLDivElement | null>(null)
  const expandedImageRef = useRef<HTMLImageElement | null>(null)
  const expandedWatermarkRef = useRef<HTMLImageElement | null>(null)
  const [dimensions, setDimensions] = useState({
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0
  })
  const [expandedDimensions, setExpandedDimensions] = useState<number>()

  const handleExpand = () => {
    if (outerRef.current) {
      const thumbRect = outerRef.current.getBoundingClientRect();
      
      setDimensions({
        startX: thumbRect.left,
        startY: thumbRect.top,
        startWidth: thumbRect.width,
        startHeight: thumbRect.height
      });
      
      setExpanded(true);
      setClosing(false);
    }
  };

  // Handle closing animation
  const handleClose = () => {
    setClosing(true);
    
    // Wait for the animation to complete before removing from DOM
    setTimeout(() => {
      setExpanded(false);
      setClosing(false);
      outerRef.current?.focus()
    }, 300);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>, selectedPhotos: PicturePath[]) => {
    if(selectedPhotos[selectedPhotos.length - 1].id === props.picture.id) {
      if(event.key === ' ') handleExpand()
      if(event.ctrlKey && event.key.toLowerCase() == 'a') {
        props.setSelectedPhotos(props.set.paths)
      }
    }
  }

  useEffect(() => {
    if (expanded && expandedImageRef.current && expandedRef.current) {
      const expandedRect = expandedImageRef.current.getBoundingClientRect();
      const containerRect = expandedRef.current.getBoundingClientRect();
      
      const thumbnailCenterX = dimensions.startX + dimensions.startWidth / 2;
      const thumbnailCenterY = dimensions.startY + dimensions.startHeight / 2;
      const expandedCenterX = containerRect.left + containerRect.width / 2;
      const expandedCenterY = containerRect.top + containerRect.height / 2;
      
      const translateX = thumbnailCenterX - expandedCenterX;
      const translateY = thumbnailCenterY - expandedCenterY;
      
      const scaleX = dimensions.startWidth / expandedRect.width;
      const scaleY = dimensions.startHeight / expandedRect.height;
      const scale = Math.min(scaleX, scaleY);
      
      if (!closing) {
        expandedRef.current.style.transition = 'none'
        expandedRef.current.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        expandedRef.current.style.opacity = "0.7";
        
        expandedRef.current.offsetWidth
        
        expandedRef.current.style.transition = 'transform 300ms ease-out, opacity 300ms ease-out'
        expandedRef.current.style.transform = "translate(0, 0) scale(1)";
        expandedRef.current.style.opacity = "1";
      } else {
        expandedRef.current.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
        expandedRef.current.style.opacity = "0.7";
      }
    }
  }, [expanded, closing, dimensions]);

  useEffect(() => {
    const outer = outerRef.current
    
    if(!outer) {
      return
    }

    const isSelected = props.selectedPhotos.some((picture) => picture.id === props.picture.id)
    const isDraggingSelected = props.selectedPhotos.some((picture) => picture.id === props.parentIsDragging?.id)

    return combine(
      draggable({
        element: outer,
        getInitialData: ({ element })  => {
          return getPictureData({ picture: props.picture, rect: element.getBoundingClientRect() })
        },
        onGenerateDragPreview({ 
          // source, 
          nativeSetDragImage 
        }) {
          //TODO: maybe do something with the source
          // const data = source.data

          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: pointerOutsideOfPreview({
              x: '16px',
              y: '8px'
            }),
            render({ container }) {
              setState({ 
                type: 'preview', 
                container,
                dragging: outer.getBoundingClientRect()
              })
            }
          })
        },
        onDragStart() {
          setState({ type: 'is-dragging' })
          props.parentUpdateIsDragging(props.picture)
        },
        onDrop() {
          setState(idle)
          props.parentUpdateIsDragging(undefined)
        },
        canDrag: () => !expanded,
      }),
      dropTargetForElements({
        element: outer,
        getIsSticky: () => true,
        canDrop: isDraggingAPicture,
        getData({ input, element }) {
          const data = getPictureDropTargetData({ picture: props.picture })
          return attachClosestEdge(data, {
            element,
            input,
            allowedEdges: ['left', 'right']
          })
        },
        onDragEnter({ source, self }) {
          if(!isPictureData(source.data)) return
          if(source.data.picture.id === props.picture.id) return
          const closestEdge = extractClosestEdge(self.data)
          if(!closestEdge) return

          if((isDraggingSelected && !isSelected) || !isDraggingSelected) {
            setState({ type: 'is-over', dragging: source.data.rect, closestEdge })
          }
        },
        onDrag({ source, self }) {
          if(!isPictureData(source.data)) return
          if(source.data.picture.id === props.picture.id) return
          const closestEdge = extractClosestEdge(self.data)
          if(!closestEdge) return

          const proposed: PictureState = {
            type: 'is-over',
            dragging: source.data.rect,
            closestEdge,
          }
          setState((current) => {
            if((isDraggingSelected && !isSelected) || !isDraggingSelected) {
              if(current.type === 'is-over' && current.closestEdge === closestEdge) {
                return current
              }
              return proposed
            }
            return current
          })
        },
        onDragLeave({ source }) {
          if(!isPictureData(source.data)) return
          if(source.data.picture.id === props.picture.id) return;
          setState(idle)
        },
        onDrop() {
          setState(idle)
        }
      })
    )
  }, [props.picture, props.selectedPhotos, props.parentIsDragging ])

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

  const deletePath = useMutation({
    mutationFn: (params: DeleteImagesMutationParams) => props.PhotoSetService.deleteImagesMutation(params)
  })

  const favorite = useMutation({
    mutationFn: (params: FavoriteImageMutationParams) => props.PhotoSetService.favoriteImageMutation(params),
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
    mutationFn: (params: UnfavoriteImageMutationParams) => props.PhotoSetService.unfavoriteImageMutation(params)
  })

  const downloadImage = useMutation({
    mutationFn: (params: DownloadImageMutationParams) => props.PhotoPathService.downloadImageMutation(params),
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
      <div
        data-picture-id={props.picture.id}
        id='image-container'
        ref={outerRef}
        className={`
          ${props.pictureStyle(props.picture.id)} ${outerStyles[state.type] ?? ''} 
          ${props.parentIsDragging !== undefined && props.parentIsDragging.id !== props.picture.id && 
            props.selectedPhotos.some((picture) => props.parentIsDragging?.id === picture.id) && props.selectedPhotos.some((picture) => picture.id === props.picture.id) ? 
            'opacity-40' : ''}
        `}
        onClick={(event) => {
          const temp = [...props.selectedPhotos]
          if((event.target as HTMLElement).id.includes('image')){
            if(props.selectedPhotos.find((parentPath) => props.picture.id === parentPath.id) !== undefined){
              props.setSelectedPhotos(props.selectedPhotos.filter((parentPath) => parentPath.id !== props.picture.id))
            }
            else if(event.shiftKey && temp.length > 0){
              let minIndex = -1
              let maxIndex = props.index
              for(let i = 0; i < props.paths.length; i++){
                if(props.selectedPhotos.find((path) => path.id === props.paths[i].id) !== undefined){
                  minIndex = i
                  break
                }
              }
              for(let i = props.paths.length - 1; props.index < i; i--){
                if(props.selectedPhotos.find((path) => path.id === props.paths[i].id) !== undefined){
                  maxIndex = i
                  break
                }
              }
              minIndex = props.index < minIndex ? props.index : minIndex
              if(minIndex > -1){
                props.setSelectedPhotos(props.paths.filter((_, i) => i >= minIndex && i <= maxIndex))
              }
            }
            else{
              temp.push(props.picture)
              props.setSelectedPhotos(temp)
            }
          }
        }}
        onMouseEnter={() => {
          props.setDisplayPhotoControls(props.picture.id)
        }}  
        onMouseLeave={() => {
          props.setDisplayPhotoControls(undefined)
        }}
        onKeyDown={(e) => {
          e.preventDefault()
          if(props.selectedPhotos.length > 0) {
            if(!expanded) {
              handleKeyDown(e, props.selectedPhotos)
            }
          }
          else if(expanded || e.key === 'Escape') {
            handleClose()
          }
        }}
        tabIndex={0}
      >
        {props.url === undefined || props.url.isLoading ? (
          <div className="flex items-center justify-center w-[200px] h-[300px] bg-gray-300 rounded sm:w-96">
            <svg className="w-10 h-10 text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 18">
              <path d="M18 0H2a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2Zm-5.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm4.376 10.481A1 1 0 0 1 16 15H4a1 1 0 0 1-.895-1.447l3.5-7A1 1 0 0 1 7.468 6a.965.965 0 0 1 .9.5l2.775 4.757 1.546-1.887a1 1 0 0 1 1.618.1l2.541 4a1 1 0 0 1 .028 1.011Z"/>
            </svg>
          </div>
        ) : (
          <LazyImage 
            src={props.url} 
            className="
              object-cover rounded-lg w-[200px] h-[300px] justify-self-center 
              pointer-events-none duration-300 transition-transform ease-in-out
            " 
            id='image'
            loading='lazy'
            draggable={false}
            style={
              state.type === 'preview' ? {
                width: state.dragging.width,
                height: state.dragging.height
              } : undefined
            }
          />
        )}
        {expanded && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black transition-all duration-300 ease-in-out"
            style={{ backgroundColor: closing ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.8)' }}
            onClick={handleClose}
          >
            <div
              ref={expandedRef}
              className="relative w-screen h-screen transition-all duration-300 ease-in-out"
              style={{
                transformOrigin: 'center',
                willChange: 'transform, opacity'
              }}
            >
              <button className="absolute opacity-60 hover:cursor-pointer hover:opacity-85 pointer-events-auto">
                <HiOutlineXCircle size={48} className="fill-white"/>
              </button>
              <img 
                ref={expandedImageRef}
                src={props.url?.data?.[1]}
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
                    }
                  )
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
              else if(props.participantId && props.picture.favorite === undefined){
                favorite.mutate({
                  pathId: props.picture.id,
                  participantId: props.participantId,
                  collectionId: props.collection.id,
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
            title='Full Screen View'
            onClick={() =>
              navigate({
                to: `/photo-fullscreen`,
                search: {
                  set: props.set.id,
                  path: props.picture.id
                }
              })
            }
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
                set: props.set,
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
      {state.type === 'is-over' && state.closestEdge && (
        <DropIndicator edge={state.closestEdge} gap="8px" />
      )}
      {state.type === 'preview' && createPortal(<DragPreview item={props.picture} selectedPhotos={props.selectedPhotos} />, state.container)}
    </>
  )
}

function DragPreview({ item, selectedPhotos }: { item: PicturePath, selectedPhotos: PicturePath[] }) {
  return (
    <div className="border-solid rounded p-2 bg-white">
      {selectedPhotos.length === 0 || !selectedPhotos.some((photo) => photo.id === item.id) ? (
        <span>{parsePathName(item.path)}</span>
      ) : (
        <span>{`${selectedPhotos.length} Item${selectedPhotos.length === 1 ? '' : 's'}`}</span>
      )}
    </div>
  )
}