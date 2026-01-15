import { ComponentProps, Dispatch, MutableRefObject, SetStateAction, useCallback, useEffect, useRef, useState } from "react"
import { DropzoneState, useDropzone } from "react-dropzone"
import { useMutation, UseMutationResult, UseQueryResult } from "@tanstack/react-query"
import { CollectionService, DeleteCoverParams, PublishCollectionParams, UploadCoverParams } from "../../../services/collectionService"
import { CgSpinner } from "react-icons/cg";
import { ConfirmationModal } from "../../modals"
import { PhotoCollection } from "../../../types";
import { Cover } from "../../collection/Cover";

//TODO: consolidate cover uploader
interface CollectionThumbnailProps extends ComponentProps<'div'> {
  CollectionService: CollectionService
  collection: PhotoCollection,
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
  collection, onClick, cover, allowUpload, 
  contentChildren, updateParentCollection,
  updatePublishStatus, updateParentCollections,
  CollectionService
}: CollectionThumbnailProps) => {
  const fileUpload = useRef<File | null>(null)
  const [imagePreviewSRC, setImagePreviewSRC] = useState<string>()
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const coverRef = useRef<HTMLImageElement | null>(null)
  const [roundImage, setRoundImage] = useState(false)

  const coverPath = cover?.data?.[1] !== undefined && cover.data[1] !== '' ? cover.data[1] : undefined

  useEffect(() => {
    if(coverRef.current) {
      setRoundImage(coverRef.current.clientWidth >= 350)
    }
  }, [coverRef.current])

  useEffect(() => {
    if(fileUpload.current !== null) {
      fileUpload.current.arrayBuffer().then((arrayBuffer) => {
        if(fileUpload.current) {
          setImagePreviewSRC(URL.createObjectURL(new Blob([arrayBuffer], { type: fileUpload.current.type})))
        }
      })
      
    }
  }, [fileUpload.current])
  
  const uploadCover = useMutation({
    mutationFn: (params: UploadCoverParams) => CollectionService.uploadCoverMutation(params),
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
    mutationFn: (params: DeleteCoverParams) => CollectionService.deleteCoverMutation(params),
    onSettled: () => {
      if(fileUpload.current) {
        uploadCover.mutate({
          cover: fileUpload.current,
          collectionId: collection.id,
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
    onDrop,
    multiple: false
  }) : null

  const confirmationBody = coverPath !== undefined ? (
    `This action will <b>REPLACE</b> the previous cover for this collection with the selected file.\nPress continue or cancel to proceed.\nPreview Below:`
  ) : (
    `This action will <b>SET</b> the cover for this collection to the selected file.\nPress continue or cancel to proceed.\nPreview Below:`
  )

  return (
    <>
      <ConfirmationModal 
        title={coverPath ? 'Replace Collection Cover' : 'Set Collection Cover'}
        body={confirmationBody}
        denyText="Cancel"
        confirmText="Continue"
        confirmAction={() => {
          setConfirmationOpen(false)
          setImagePreviewSRC(undefined)
          if(fileUpload.current){
            if(cover?.data){
              deleteCover.mutate({
                cover: cover.data[1],
                collectionId: collection.id,
              })
            } else {
              uploadCover.mutate({
                cover: fileUpload.current,
                collectionId: collection.id,
              })
            }
          }
        }}
        onClose={() => {
          setConfirmationOpen(false)
          setImagePreviewSRC(undefined)
        }}
        open={confirmationOpen}
        children={fileUpload.current && imagePreviewSRC !== undefined ? (
          <div className="border border-black">
            <Cover 
              collection={collection}
              path={imagePreviewSRC}
              style={{
                maxHeight: '50vh',
                height: 'fit-content',
              }}
            />
          </div>
        ) : undefined}
      />
      <div className="flex flex-col">
        {cover !== undefined && (cover.isLoading || uploadCover.isPending || deleteCover.isPending) ? (
          <div className="flex flex-col justify-center items-center rounded-lg bg-gray-100 border border-black w-[360px] h-[240px] cursor-wait">
            <CgSpinner size={64} className="animate-spin text-gray-600"/>
          </div>
        ) : (
          !dropzone ? (
            <button 
              className={`
                flex flex-row relative justify-center items-center rounded-lg bg-gray-100 bg-opacity-60 border 
                border-black w-[360px] h-[240px] 
                ${onClick !== undefined ? 'hover:bg-gray-200 hover:text-gray-500' : 'pointer-events-none cursor-default'}
              `}
              onClick={onClick !== undefined ? () => onClick() : undefined}
            >
              {coverPath !== undefined ? (
                <img ref={coverRef} src={coverPath} className={`h-[238px] max-w-[358px] ${roundImage ? 'rounded-lg' : ''}`}/>
              ) : (
                <div className="absolute flex flex-col inset-0 place-self-center text-center items-center justify-center">
                  <p className={`font-thin opacity-90 text-2xl`}>No Cover</p>
                </div>
              )}
            </button>
          ) : (
            <ThumbnailDropzone 
              dropzone={dropzone}
              onClick={onClick}
              cover={coverPath}
              coverRef={coverRef}
              roundImage={roundImage}
              onDrop={onDrop}
            />
          )
        )}
        <div className="flex flex-row w-full mt-1">
          {contentChildren}
        </div>
      </div>
    </>
  )
}

const ThumbnailDropzone = (props: {
  dropzone: DropzoneState
  onClick?: () => void
  cover?: string
  coverRef: MutableRefObject<HTMLImageElement | null>
  roundImage: boolean
  onDrop: (files: File[]) => void
}) => {
  const [hovering, setHovering] = useState(false)

  return (
    <div
      className={`
        flex flex-row relative justify-center items-center rounded-lg bg-gray-100 bg-opacity-60 border 
          w-[360px] h-[240px] hover:bg-gray-200 hover:text-gray-500 hover:cursor-pointer
        ${props.dropzone.isDragActive ? 'animate-pulse border-dashed border-2 border-gray-500' : 'border-black'}
      `}
      {...props.dropzone.getRootProps()}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {props.cover !== undefined ? (
        <>
          <img ref={props.coverRef} src={props.cover} className={`h-[238px] max-w-[358px] ${props.roundImage ? 'rounded-lg' : ''}`}/>
          {hovering && (
            <span className="absolute place-self-center">Click to upload</span>
          )}
          {props.dropzone.isDragActive && (
            <span className="absolute place-self-center text-gray-500">Drop Image File here</span>
          )}
        </>
      ) : (
        <div className="absolute flex flex-col inset-0 place-self-center text-center items-center justify-center">
          <p className={`font-thin opacity-90 text-2xl`}>No Cover</p>
          <p className="font-thin opacity-50">{props.dropzone.isDragActive ? 'Drop Here' : hovering ? 'Click Here to Upload' : 'Cick or Drag to Upload'}</p>
          <p className="text-xs text-gray-500">Image Files Supported (jpg, jpeg, png)</p>
        </div>
      )}
      <input 
        type="file" 
        className="hidden" 
        {...props.dropzone.getInputProps()}
        multiple={false}
      />
    </div>
  )
}
