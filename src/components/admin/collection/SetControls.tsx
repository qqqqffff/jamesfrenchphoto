import { HiOutlineCheckCircle } from "react-icons/hi";
import { Tooltip } from "flowbite-react"
import { HiOutlineBarsArrowDown, HiOutlineBarsArrowUp, HiOutlineTrash } from "react-icons/hi2";
import { ComponentProps, RefObject } from "react";
import { PhotoCollection, PicturePath } from "../../../types";
import { useMutation } from "@tanstack/react-query";
import { deleteImagesMutation, DeleteImagesMutationParams, reorderPathsMutation, ReorderPathsParams } from "../../../services/photoSetService";
import { FixedSizeGrid } from "react-window";

interface SetControlsProps extends ComponentProps<'div'> {
  collection: PhotoCollection
  photos: PicturePath[],
  setPhotos: (photos: PicturePath[]) => void
  selectedPhotos: PicturePath[],
  setSelectedPhotos: (photos: PicturePath[]) => void,
  gridRef: RefObject<FixedSizeGrid>
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
      className="fixed py-1.5 px-4 rounded-lg shadow inset-x-0 bottom-0 left-[400px] ml-2 mb-2 border place-self-center z-50 bg-white flex flex-row gap-1"
    >
      <Tooltip content={'Unselect All'}>
        <button 
          className={componentClass}
          onClick={() => {
            props.setSelectedPhotos([])
          }}
        >
          <HiOutlineCheckCircle size={24} />
        </button>
      </Tooltip>
      <Tooltip content={'Delete all'}>
        <button 
          className={componentClass}
          onClick={() => {
            //TODO: connect api

            const mappedSelectedPhotos = props.selectedPhotos.map((path) => path.id)

            deletePhotos.mutate({
              collection: props.collection,
              picturePaths: props.selectedPhotos,
            })
            
            props.setPhotos(props.photos.filter((path) => 
              !mappedSelectedPhotos.includes(path.id)
            ))
            props.setSelectedPhotos([])
          }}
        >
          <HiOutlineTrash size={24} />
        </button>
      </Tooltip>
      <Tooltip content={'Move to top'}>
        <button 
          className={componentClass}
          onClick={() => {
            //TODO: connect api
            const mappedSelectedPhotos = props.selectedPhotos.map((path) => path.id)

            const partialPhotos = props.photos.filter((path) => 
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

            props.setPhotos(updatedPhotos)
            props.gridRef.current?.scrollToItem({
              rowIndex: 0
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
            //TODO: connect api
            const mappedSelectedPhotos = props.selectedPhotos.map((path) => path.id)

            const partialPhotos = props.photos.filter((path) => 
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

            props.setPhotos(updatedPhotos)
            props.gridRef.current?.scrollToItem({
              rowIndex: props.photos.length / 4
            })
          }}
        >
          <HiOutlineBarsArrowDown size={24} />
        </button>
      </Tooltip>
    </div>
  )
}