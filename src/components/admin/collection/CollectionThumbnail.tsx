import { ComponentProps, useCallback, useState } from "react"
import { PhotoCollection } from "../../../types"
import { Tooltip } from "flowbite-react"
import { useDropzone } from "react-dropzone"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { deleteCoverMutation, DeleteCoverParams, uploadCoverMutation, UploadCoverParams } from "../../../services/collectionService"
import { CgSpinner } from "react-icons/cg";
import { ConfirmationModal } from "../../modals"

interface CollectionThumbnailProps extends ComponentProps<'div'> {
  collection: PhotoCollection,
  coverPath?: string,
  onClick?: () => void,
  allowUpload?: boolean,
  contentChildren?: JSX.Element,
  parentLoading?: boolean
}

export const CollectionThumbnail= ({ 
  collection, coverPath, onClick, 
  key, allowUpload, contentChildren, 
  parentLoading 
}: CollectionThumbnailProps) => {
  const [loading, setLoading] = useState(parentLoading ?? false)
  const [hovering, setHovering] = useState(false)
  const [fileUpload, setFileUpload] = useState<File>()

  const router = useRouter()
  const client = useQueryClient()
  
  const uploadCover = useMutation({
    mutationFn: (params: UploadCoverParams) => uploadCoverMutation(params),
    onSettled: () => {
      setLoading(false)
      client.invalidateQueries({
          queryKey: ['path']
      })
      router.invalidate()
    }
  })

  const deleteCover = useMutation({
    mutationFn: (params: DeleteCoverParams) => deleteCoverMutation(params)
  })
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if(acceptedFiles.length > 0){
      setFileUpload(acceptedFiles[0])
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
        confirmAction={async () => {
          setLoading(true)
          if(coverPath){
            await deleteCover.mutateAsync({
              cover: coverPath,
              collectionId: collection.id
            })
          }
          if(fileUpload){
            uploadCover.mutate({
              cover: fileUpload,
              collectionId: collection.id
            })
          }  
        }}
        onClose={() => setFileUpload(undefined)}
        open={fileUpload !== undefined}
      />
      <div className="flex flex-col" key={key}>
        {loading ? (
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
                  {coverPath ? (
                      <img src={coverPath} className="h-[238px] w-[358px] rounded-lg"/>
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
              {coverPath ? (
                <>
                  <img src={coverPath} className="h-[238px] w-[358px] rounded-lg"/>
                  {hovering && (
                    <span className="absolute place-self-center">Click to upload</span>
                  )}
                </>
              ) : (
                <div className="absolute flex flex-col inset-0 place-self-center text-center items-center justify-center">
                  <p className={`font-thin opacity-90 text-2xl`}>No Cover</p>
                  <p className="font-thin opacity-50">{dropzone?.isDragActive ? 'Drop Here' : 'Cick or Drag to Upload'}</p>
                  <p className="text-xs text-gray-500">Image Files Supported (jpg, jpeg, png)</p>
                </div>
              )}
              <input id='dropzone-collection-thumbnail' type="file" className="hidden" {...dropzone?.getInputProps()}/>
            </label>
          )
        )}
        <div className="flex flex-row justify-between w-full mt-1">
          <div className="flex flex-row gap-1 font-thin opacity-90 items-center justify-start">
            <Tooltip content={(<p>Collection Has {collection.published ? 'Been Published' : 'Not Been Published'}</p>)}>
              <p className={`${collection.published ? 'text-green-400' : 'text-gray-600 italic'}`}>{collection.name}</p>
            </Tooltip>
            <p>&bull;</p>
            <p>Items: {collection.items}</p>
            <p>&bull;</p>
            <p>{new Date(collection.createdAt).toLocaleDateString('en-US', { timeZone: 'America/Chicago' })}</p>
          </div>
          {contentChildren}
        </div>
      </div>
    </>
  )
}
