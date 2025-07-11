import { ComponentProps, Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react"
import { useDropzone } from "react-dropzone"
import { useMutation, UseMutationResult, UseQueryResult } from "@tanstack/react-query"
import { deleteCoverMutation, DeleteCoverParams, PublishCollectionParams, uploadCoverMutation, UploadCoverParams } from "../../../services/collectionService"
import { CgSpinner } from "react-icons/cg";
import { ConfirmationModal } from "../../modals"
import { PhotoCollection } from "../../../types";

//TODO: consolidate cover uploader
interface CollectionThumbnailProps extends ComponentProps<'div'> {
  collectionId: string,
  cover?: UseQueryResult<[string | undefined, string] | undefined, Error>,
  onClick?: () => void,
  allowUpload?: boolean,
  contentChildren?: JSX.Element,
  parentLoading?: boolean,
  updateParentCollection?: Dispatch<SetStateAction<PhotoCollection | undefined>>
  updateParentCollections?: Dispatch<SetStateAction<PhotoCollection[]>>
  updatePublishStatus?: UseMutationResult<string | undefined, Error, PublishCollectionParams, unknown>
}

export const CollectionThumbnail= ({ 
  collectionId, onClick, cover, allowUpload, 
  contentChildren, updateParentCollection,
  updatePublishStatus, updateParentCollections
}: CollectionThumbnailProps) => {
  const [hovering, setHovering] = useState(false)
  const fileUpload = useRef<File | null>(null)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const coverRef = useRef<HTMLImageElement | null>(null)
  const [roundImage, setRoundImage] = useState(false)

  useEffect(() => {
    if(coverRef.current) {
      setRoundImage(coverRef.current.clientWidth >= 350)
    }
  }, [coverRef.current])
  
  const uploadCover = useMutation({
    mutationFn: (params: UploadCoverParams) => uploadCoverMutation(params),
    onSuccess: (path) => {
      let temp: PhotoCollection | undefined
      updateParentCollection!((prev) => {
        if(prev) {
          temp = {
            ...prev,
            coverPath: path,
            published: false,
            publicCoverPath: undefined
          }
          if(prev.published) {
            updatePublishStatus!.mutate({
              collectionId: prev.id,
              publishStatus: false,
              path: prev.publicCoverPath ?? '',
              name: '',
              options: {
                logging: true
              }
            })
          }
          return temp
        }
        
        return prev
      })
      updateParentCollections!((prev) => {
        const pTemp = [...prev]

        return pTemp.map((col) => {
          if(col.id === temp?.id) return temp
          return col
        })
      })
    },
    onSettled: () => fileUpload.current = null
  })

  const deleteCover = useMutation({
    mutationFn: (params: DeleteCoverParams) => deleteCoverMutation(params),
    onSettled: () => {
      if(fileUpload.current) {
        uploadCover.mutate({
          cover: fileUpload.current,
          collectionId: collectionId,
        })
      }
    }
  })
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if(acceptedFiles.length > 0){
      fileUpload.current = acceptedFiles[0]
      setConfirmationOpen(true)
    }
  }, [])

  const dropzone = allowUpload ? useDropzone({
    accept: {
      'image/jpg': ['.jpg', '.jpeg', '.jfif', '.pjpeg', '.pjp'],
      'image/png': ['.png'],
      'image/avif': ['.avif']
    },
    noClick: true,
    onDrop,
    multiple: false
  }) : null

  const confirmationBody = cover?.data ? (
    `This action will <b>Replace</b> the previous cover for this collection with the selected file.\nPress continue or cancel to proceed.`
  ) : (
    `This action will <b>Set</b> the cover for this collection to the selected file.\nPress continue or cancel to proceed.`
  )

  return (
    <>
      <ConfirmationModal 
        title={cover?.data ? 'Replace Collection Cover' : 'Set Collection Cover'}
        body={confirmationBody}
        denyText="Cancel"
        confirmText="Continue"
        confirmAction={() => {
          setConfirmationOpen(false)
          if(fileUpload.current){
            if(cover?.data){
              deleteCover.mutate({
                cover: cover.data[1],
                collectionId: collectionId,
              })
            } else {
              uploadCover.mutate({
                cover: fileUpload.current,
                collectionId: collectionId,
              })
            }
          }
        }}
        onClose={() => setConfirmationOpen(false)}
        open={confirmationOpen}
      />
      <div className="flex flex-col">
        {(cover?.isLoading || uploadCover.isPending || deleteCover.isPending) && cover !== undefined ? (
          <div className="flex flex-col justify-center items-center rounded-lg bg-gray-200 border border-black w-[360px] h-[240px] cursor-wait">
            <CgSpinner size={64} className="animate-spin text-gray-600"/>
          </div>
        ) : (
          !dropzone ? (
            <button 
              className={`
                flex flex-row relative justify-center items-center rounded-lg bg-gray-200 bg-opacity-60 border 
                border-black w-[360px] h-[240px] 
                ${onClick !== undefined ? 'hover:bg-gray-300 hover:text-gray-500' : 'pointer-events-none cursor-default'}
              `}
              onClick={() => {if(onClick !== undefined) onClick()}}
              onMouseEnter={() => setHovering(true)}
              onMouseLeave={() => setHovering(false)}
            >
              {/* TODO: add a ref to chect if the image is at max with and  */}
              {(cover && cover.data && cover.data[1] !== '') ? (
                <img ref={coverRef} src={cover.data[1]} className={`h-[238px] max-w-[358px] ${roundImage ? 'rounded-lg' : ''}`}/>
              ) : (
                <div className="absolute flex flex-col inset-0 place-self-center text-center items-center justify-center">
                  <p className={`font-thin opacity-90 text-2xl`}>No Cover</p>
                </div>
              )}
            </button>
          ) : (
            <label 
              htmlFor="dropzone-collection-thumbnail"
              className={`flex flex-row relative justify-center items-center rounded-lg bg-gray-200 bg-opacity-60 border 
                 w-[360px] h-[240px] 
                ${dropzone.isDragActive ? 'animate-pulse border-dashed border-2 border-gray-500' : 'border-black'}
                ${onClick !== undefined ? 'hover:bg-gray-300 hover:text-gray-500' : 'pointer-events-none cursor-default'}
              `}
              {...dropzone?.getRootProps()}
              onMouseEnter={() => setHovering(true)}
              onMouseLeave={() => setHovering(false)}
            >
              {cover?.data?.[1] && cover?.data?.[1] !== '' ? (
                <>
                  <img ref={coverRef} src={cover.data[1]} className={`h-[238px] max-w-[358px] ${roundImage ? 'rounded-lg' : ''}`}/>
                  {hovering && (
                    <span className="absolute place-self-center">Click to upload</span>
                  )}
                  {dropzone.isDragActive && (
                    <span className="absolute place-self-center text-gray-500">Drop Image File here</span>
                  )}
                </>
              ) : (
                <div className="absolute flex flex-col inset-0 place-self-center text-center items-center justify-center">
                  <p className={`font-thin opacity-90 text-2xl`}>No Cover</p>
                  <p className="font-thin opacity-50">{dropzone.isDragActive ? 'Drop Here' : 'Cick or Drag to Upload'}</p>
                  <p className="text-xs text-gray-500">Image Files Supported (jpg, jpeg, png)</p>
                </div>
              )}
              <input 
                id='dropzone-collection-thumbnail' 
                type="file" 
                className="hidden" 
                {...dropzone?.getInputProps()}
                onChange={(event) => {
                  if(event.target.files){
                    onDrop(Array.from(event.target.files))
                  }
                }}
                multiple={false}
              />
            </label>
          )
        )}
        <div className="flex flex-row w-full mt-1">
          {contentChildren}
        </div>
      </div>
    </>
  )
}
