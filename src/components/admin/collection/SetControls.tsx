import { HiOutlineCheckCircle } from "react-icons/hi";
import { Tooltip } from "flowbite-react"
import { HiOutlineBarsArrowDown, HiOutlineBarsArrowUp, HiOutlineTrash } from "react-icons/hi2";
import { ComponentProps, Dispatch, SetStateAction } from "react";
import { PhotoCollection, PhotoSet, PicturePath } from "../../../types";
import { useMutation } from "@tanstack/react-query";
import { deleteImagesMutation, DeleteImagesMutationParams, reorderPathsMutation, ReorderPathsParams } from "../../../services/photoSetService";

interface SetControlsProps extends ComponentProps<'div'> {
  collection: PhotoCollection,
  set: PhotoSet,
  paths: PicturePath[],
  parentUpdatePaths: Dispatch<SetStateAction<PicturePath[]>>,
  parentUpdateSet: Dispatch<SetStateAction<PhotoSet | undefined>>,
  parentUpdateCollection: Dispatch<SetStateAction<PhotoCollection | undefined>>,
  parentUpdateCollections: Dispatch<SetStateAction<PhotoCollection[]>>
  selectedPhotos: PicturePath[],
  parentUpdateSelectedPhotos: Dispatch<SetStateAction<PicturePath[]>>,
}

export const SetControls = (props: SetControlsProps) => {
  const componentClass = 'rounded-xl p-1.5 hover:text-gray-600 hover:border-gray-400 hover:bg-gray-200 border border-transparent'
  
  const deletePhotos = useMutation({
    mutationFn: (params: DeleteImagesMutationParams) => deleteImagesMutation(params)
  })

  const reorderPaths = useMutation({
    mutationFn: (params: ReorderPathsParams) => reorderPathsMutation(params)
  })

  return (
    <div 
      className="fixed py-1.5 px-4 rounded-lg shadow inset-x-0 bottom-0 ml-2 mb-2 border place-self-center z-50 bg-white  left-[380px]"
    >
      <div className="w-full justify-center flex flex-col items-center">
        <div className="text-sm flex flex-row gap-1 border-b px-4">
          <span className="font-light">Items Selected:</span>
          <span className="font-bold italic">{props.selectedPhotos.length}</span>
        </div>
        <div className="flex flex-row gap-1">
          <Tooltip content={<span className="whitespace-nowrap">Unselect All</span>} style="light">
            <button 
              className={componentClass}
              onClick={() => {
                props.parentUpdateSelectedPhotos([])
              }}
            >
              <HiOutlineCheckCircle size={24} />
            </button>
          </Tooltip>
          <Tooltip content={<span className="whitespace-nowrap">Delete all</span>} style="light">
            <button 
              className={componentClass}
              onClick={() => {
                const mappedSelectedPhotos = props.selectedPhotos.map((path) => path.id)

                deletePhotos.mutate({
                  collection: props.collection,
                  set: props.set,
                  picturePaths: props.selectedPhotos,
                })

                const newPaths = props.paths.filter((path) => 
                  !mappedSelectedPhotos.some((removed) => removed === path.id)
                )

                const tempSet: PhotoSet = {
                  ...props.set,
                  paths: newPaths
                }

                const tempCollection: PhotoCollection = {
                  ...props.collection,
                  sets: props.collection.sets.map((set) => {
                    if(set.id === tempSet.id) return tempSet
                    return set
                  }),
                  items: props.collection.items - props.selectedPhotos.length
                }
                
                props.parentUpdatePaths(newPaths)
                props.parentUpdateSet(tempSet)
                props.parentUpdateCollection(tempCollection)
                props.parentUpdateCollections((prev) => {
                  const temp = [...prev]

                  return temp.map((col) => {
                    if(col.id === tempCollection.id) return tempCollection
                    return col
                  })
                })
                props.parentUpdateSelectedPhotos([])
              }}
            >
              <HiOutlineTrash size={24} />
            </button>
          </Tooltip>
          <Tooltip content={<span className="whitespace-nowrap">Move to top</span>} style="light">
            <button 
              className={componentClass}
              onClick={() => {
                const mappedSelectedPhotos = props.selectedPhotos.map((path) => path.id)

                const partialPhotos = props.paths.filter((path) => 
                  !mappedSelectedPhotos.includes(path.id)
                )

                const updatedPhotos = [...props.selectedPhotos, ...partialPhotos].map((path, index) => {
                  return {
                    ...path,
                    order: index
                  }
                })

                reorderPaths.mutate({
                  paths: updatedPhotos,
                })

                const tempSet: PhotoSet = {
                  ...props.set,
                  paths: updatedPhotos
                }

                const tempCollection: PhotoCollection = {
                  ...props.collection,
                  sets: props.collection.sets.map((set) => {
                    if(set.id === tempSet.id) {
                      return tempSet
                    }
                    return set
                  }),
                }

                props.parentUpdatePaths(updatedPhotos)
                props.parentUpdateSet(tempSet)
                props.parentUpdateCollection(tempCollection)
                props.parentUpdateCollections((prev) => {
                  const temp = [...prev]

                  return temp.map((col) => {
                    if(col.id === tempCollection.id) return tempCollection
                    return col
                  })
                })
              }}
            >
              <HiOutlineBarsArrowUp size={24} />
            </button>
          </Tooltip>
          <Tooltip content={<span className="whitespace-nowrap">Move to bottom</span>} style="light">
            <button 
              className={componentClass}
              onClick={() => {
                const mappedSelectedPhotos = props.selectedPhotos.map((path) => path.id)

                const partialPhotos = props.paths.filter((path) => 
                  !mappedSelectedPhotos.includes(path.id)
                )

                const updatedPhotos = [...partialPhotos, ...props.selectedPhotos].map((path, index) => {
                  return {
                    ...path,
                    order: index
                  }
                })

                reorderPaths.mutate({
                  paths: updatedPhotos,
                  options: {
                    logging: true
                  }
                })

                const tempSet: PhotoSet = {
                  ...props.set,
                  paths: updatedPhotos
                }

                const tempCollection: PhotoCollection = {
                  ...props.collection,
                  sets: props.collection.sets.map((set) => {
                    if(set.id === tempSet.id) {
                      return tempSet
                    }
                    return set
                  }),
                }

                props.parentUpdatePaths(updatedPhotos)
                props.parentUpdateSet(tempSet)
                props.parentUpdateCollection(tempCollection)
                props.parentUpdateCollections((prev) => {
                  const temp = [...prev]

                  return temp.map((col) => {
                    if(col.id === tempCollection.id) return tempCollection
                    return col
                  })
                })
              }}
            >
              <HiOutlineBarsArrowDown size={24} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}