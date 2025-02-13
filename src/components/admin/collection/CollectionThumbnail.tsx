import { ComponentProps, Dispatch, SetStateAction, useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { useMutation, useQuery } from "@tanstack/react-query"
import { deleteCoverMutation, DeleteCoverParams, getPathQueryOptions, uploadCoverMutation, UploadCoverParams } from "../../../services/collectionService"
import { CgSpinner } from "react-icons/cg";
import { ConfirmationModal } from "../../modals"

interface CollectionThumbnailProps extends ComponentProps<'div'> {
  collectionId: string,
  cover?: string,
  onClick?: () => void,
  allowUpload?: boolean,
  contentChildren?: JSX.Element,
  parentLoading?: boolean,
  setCover?: Dispatch<SetStateAction<string | undefined>>
}

export const CollectionThumbnail= ({ 
  collectionId, onClick, 
  cover, allowUpload, 
  contentChildren, parentLoading,
  setCover
}: CollectionThumbnailProps) => {
  const [loading, setLoading] = useState(parentLoading ?? false)
  const [hovering, setHovering] = useState(false)
  const [fileUpload, setFileUpload] = useState<File>()
  const [confirmationOpen, setConfirmationOpen] = useState(false)

  const coverPath = useQuery(getPathQueryOptions(cover ?? ''))
  
  const uploadCover = useMutation({
    mutationFn: (params: UploadCoverParams) => uploadCoverMutation(params),
    onSuccess: (path) => {
      setLoading(false)
      setFileUpload(undefined)
      setCover!(path)
    },
    onError: () => {
      setFileUpload(undefined)
      setLoading(false)
    }
  })

  const deleteCover = useMutation({
    mutationFn: (params: DeleteCoverParams) => deleteCoverMutation(params),
    onSettled: () => {
      if(fileUpload) {
        uploadCover.mutate({
          cover: fileUpload,
          collectionId: collectionId,
        })
      }
    }
  })
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if(acceptedFiles.length > 0){
      setFileUpload(acceptedFiles[0])
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

  const confirmationBody = coverPath ? (
    `This action will <b>Replace</b> the previous cover for this collection with the selected file.\nPress continue or cancel to proceed.`
  ) : (
    `This action will <b>Set</b> the cover for this collection to the selected file.\nPress continue or cancel to proceed.`
  )

  return (
    <>
      <ConfirmationModal 
        title={coverPath ? 'Replace Collection Cover' : 'Set Collection Cover'}
        body={confirmationBody}
        denyText="Cancel"
        confirmText="Continue"
        confirmAction={() => {
          setLoading(true)
          setConfirmationOpen(false)
          if(fileUpload){
            if(coverPath){
              deleteCover.mutateAsync({
                cover: cover,
                collectionId: collectionId,
              })
            } else {
              uploadCover.mutate({
                cover: fileUpload,
                collectionId: collectionId,
              })
            }
          }
        }}
        onClose={() => setConfirmationOpen(false)}
        open={confirmationOpen}
      />
      <div className="flex flex-col">
        {(loading || coverPath.isLoading) ? (
            <div className="flex flex-col justify-center items-center rounded-lg bg-gray-200 border border-black w-[360px] h-[240px] cursor-wait">
                <CgSpinner size={64} className="animate-spin text-gray-600"/>
            </div>
        ) : (
          !dropzone ? (
              <button 
                  className={`flex flex-row relative justify-center items-center rounded-lg bg-gray-200 border border-black w-[360px] h-[240px] ${onClick !== undefined ? 'hover:bg-gray-300 hover:text-gray-500' : 'pointer-events-none cursor-default'}`}
                  onClick={() => {if(onClick !== undefined) onClick()}}
                  onMouseEnter={() => setHovering(true)}
                  onMouseLeave={() => setHovering(false)}
              >
                  {(coverPath && coverPath.data) ? (
                      <img src={coverPath.data[1]} className="h-[238px] max-w-[358px] rounded-lg"/>
                  ) : (
                      <div className="absolute flex flex-col inset-0 place-self-center text-center items-center justify-center">
                          <p className={`font-thin opacity-90 text-2xl`}>No Cover</p>
                      </div>
                  )}
              </button>
          ) : (
            <label 
              htmlFor="dropzone-collection-thumbnail"
              className={`flex flex-row relative justify-center items-center rounded-lg bg-gray-200 border border-black w-[360px] h-[240px] ${onClick !== undefined ? 'hover:bg-gray-300 hover:text-gray-500' : 'pointer-events-none cursor-default'}`}
              {...dropzone?.getRootProps()}
              onMouseEnter={() => setHovering(true)}
              onMouseLeave={() => setHovering(false)}
            >
              {coverPath && coverPath.data ? (
                <>
                  <img src={coverPath.data[1]} className="h-[238px] max-w-[358px] rounded-lg"/>
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
