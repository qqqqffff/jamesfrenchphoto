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
      className="fixed py-1.5 px-4 rounded-lg shadow inset-x-0 bottom-0 ml-2 mb-2 border place-self-center z-50 bg-white flex flex-row gap-1"
    >
      <Tooltip content={'Unselect All'}>
        <button 
          className={componentClass}
          onClick={() => {
            props.parentUpdateSelectedPhotos([])
          }}
        >
          <HiOutlineCheckCircle size={24} />
        </button>
      </Tooltip>
      <Tooltip content={'Delete all'}>
        <button 
          className={componentClass}
          onClick={() => {
            const mappedSelectedPhotos = props.selectedPhotos.map((path) => path.id)

            deletePhotos.mutate({
              collection: props.collection,
              picturePaths: props.selectedPhotos,
            })

            const newPaths = props.paths.filter((path) => 
              !mappedSelectedPhotos.some((removed) => removed === path.id)
            )

            const tempSet: PhotoSet = {
              ...props.set,
              paths: newPaths
            }
            
            props.parentUpdatePaths(newPaths)
            props.parentUpdateSet(tempSet)
            props.parentUpdateCollection((prev) => {
              if(prev) {
                const temp: PhotoCollection = {
                  ...prev,
                  sets: prev.sets.map((set) => {
                    if(set.id === tempSet.id) {
                      return tempSet
                    }
                    return set
                  }),
                  items: prev.items - props.selectedPhotos.length
                }
                return temp
              }
              return prev
            })
            props.parentUpdateSelectedPhotos([])
          }}
        >
          <HiOutlineTrash size={24} />
        </button>
      </Tooltip>
      <Tooltip content={'Move to top'}>
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

            props.parentUpdatePaths(updatedPhotos)
            props.parentUpdateSet(tempSet)
            props.parentUpdateCollection((prev) => {
              if(prev) {
                const temp: PhotoCollection = {
                  ...prev,
                  sets: prev.sets.map((set) => {
                    if(set.id === tempSet.id) {
                      return tempSet
                    }
                    return set
                  }),
                }
                return temp
              }
              return prev
            })
          }}
        >
          <HiOutlineBarsArrowUp size={24} />
        </button>
      </Tooltip>
      <Tooltip className="w-[129px]" content={'Move to bottom'}>
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

            props.parentUpdatePaths(updatedPhotos)
            props.parentUpdateSet(tempSet)
            props.parentUpdateCollection((prev) => {
              if(prev) {
                const temp: PhotoCollection = {
                  ...prev,
                  sets: prev.sets.map((set) => {
                    if(set.id === tempSet.id) {
                      return tempSet
                    }
                    return set
                  }),
                }
                return temp
              }
              return prev
            })
          }}
        >
          <HiOutlineBarsArrowDown size={24} />
        </button>
      </Tooltip>
    </div>
  )
}