import { Button, Label, Modal, Progress } from "flowbite-react"
import { Dispatch, FC, FormEvent, SetStateAction, useEffect, useState } from "react"
import { HiOutlineXMark } from "react-icons/hi2"
import { ModalProps } from ".."
import { PhotoCollection, PhotoSet } from "../../../types";
import { formatFileSize, parsePathName } from "../../../utils";
import { FixedSizeList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { useMutation } from "@tanstack/react-query";
import { uploadImagesMutation, UploadImagesMutationParams } from "../../../services/photoSetService";
import { HiOutlineUpload } from "react-icons/hi";
import Loading from "../../common/Loading";
import { ProgressMetric } from "../../common/ProgressMetric";
import { invariant } from "@tanstack/react-router";
import { ImagesRow } from "./ImagesRow";
import { IssueNotifications, UploadIssue } from "./IssueNotifications";


//TODO: add updating live

interface UploadImagesProps extends ModalProps {
  collection: PhotoCollection,
  set: PhotoSet;
  files: Map<string, File>
}

async function validateFiles(
  files: File[],
  filesUpload: Map<string, File>,
  startIssues: UploadIssue[],
  set: PhotoSet,
  setFilesPreview: Dispatch<SetStateAction<Map<string, File> | undefined>>,
  setFilesUpload: Dispatch<SetStateAction<Map<string, File>>>,
  setUploadIssues: Dispatch<SetStateAction<UploadIssue[]>>,
  setTotalUpload: Dispatch<SetStateAction<number>>,
  setLoadingPreviews: Dispatch<SetStateAction<boolean>>,
  logging: boolean,
  filesPreviews?: Map<string, File>,
){
  const start = new Date().getTime()
  const issues: UploadIssue[] = [...startIssues]
  const filesArray = files.reduce((prev, cur) => {
    if(cur.type.includes('image')){
      prev.push(cur)
    }
    else {
      const fileTypeIssue = issues.findIndex((issue) => issue.type === 'invalid-file')
      if(fileTypeIssue === -1){
        issues.push({
          type: 'invalid-file',
          message: 'Invalid files have been automatically removed!',
          color: 'red',
          id: [cur.name],
          visible: true
        })
      }
      else {
        issues[fileTypeIssue] = {
          ...issues[fileTypeIssue],
          id: [
            ...issues[fileTypeIssue].id,
            cur.name
          ]
        }
      }
    }
    return prev
  }, [] as File[])

  
  const previewsMap = await Promise.all(filesArray.map(async (file) => {
    const url = URL.createObjectURL(new Blob([await file.arrayBuffer()], { type: file.type}))
    const dimensions = await new Promise(
      (resolve: (item: {width: number, height: number}) => void) => {
        const image: HTMLImageElement = document.createElement('img')
        image.src = url
        image.onload = () => {
          resolve({
            width: image.naturalWidth, 
            height: image.naturalHeight
          })
        }
      }
    )

    if(dimensions.width < 1280 || dimensions.height < 720){
      const dimensionIssue = issues.findIndex((issue) => issue.type === 'small-file')
      if(dimensionIssue === -1){
        issues.push({
          type: 'small-file',
          message: 'Uploaded image(s) may be small and display poorly',
          color: 'yellow',
          id: [file.name],
          visible: true
        })
      }
      else {
        issues[dimensionIssue] = {
          ...issues[dimensionIssue],
          id: [
            ...issues[dimensionIssue].id,
            file.name,
          ]
        }
      }
    }

    const duplicate = set.paths.findIndex((path) => parsePathName(path.path) === file.name)

    if(duplicate !== -1){
      const duplicateIssue = issues.findIndex((issue) => issue.type === 'duplicate')
      if(duplicateIssue === -1){
        issues.push({
          type: 'duplicate',
          message: 'Duplicate files uploaded',
          color: 'red',
          id: [file.name],
          visible: true
        })
      }
      else {
        issues[duplicateIssue] = {
          ...issues[duplicateIssue],
          id: [
            ...issues[duplicateIssue].id,
            file.name
          ]
        }
      }
    }

    return {
      url: url,
      file: file
    }  
  }))

  const done = new Date(new Date().getTime() - start)
  if(logging) console.log(`${done.getTime()}ms`)

  if(filesPreviews !== undefined){
    const previews = new Map<string, File>(filesPreviews)
    const uploads = new Map<string, File>(filesUpload)

    previewsMap.forEach((preview) => {
      previews.set(preview.url, preview.file)
      uploads.set(preview.file.name, preview.file)
    })

    const total = [...previews.values()].reduce((prev, cur) => prev += cur.size, 0)

    setFilesPreview(previews)
    setFilesUpload(uploads)
    setUploadIssues(issues)
    setLoadingPreviews(false)
    setTotalUpload(total)
  } else {
    const previews = new Map<string, File>()

    previewsMap.forEach((preview) => {
      previews.set(preview.url, preview.file)
    })

    const total = [...previews.values()].reduce((prev, cur) => prev += cur.size, 0)

    setFilesPreview(previews)
    setUploadIssues(issues)
    setLoadingPreviews(false)
    setTotalUpload(total)
  }  
}

export const UploadImagesModal: FC<UploadImagesProps> = ({ open, onClose, collection, set, files }) => {
  const [filesUpload, setFilesUpload] = useState<Map<string, File>>(files)
  const [filesPreview, setFilesPreview] = useState<Map<string, File>>()
  const [uploading, setUploading] = useState<'inprogress' | 'done' | 'paused' | 'idle'>('idle')
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [totalUpload, setTotalUpload] = useState<number>(
    [...filesUpload.values()].reduce((prev, cur) => prev += cur.size, 0)
  )
  const [totalItems, setTotalItems] = useState<{items: number, total: number}>()
  const [uploadIssues, setUploadIssues] = useState<UploadIssue[]>([])
  const [loadingPreviews, setLoadingPreviews] = useState(false)

  useEffect(() => {
    if(open){
      validateFiles(
        [...files.values()],
        filesUpload,
        [],
        set,
        setFilesPreview,
        setFilesUpload,
        setUploadIssues,
        setTotalUpload,
        setLoadingPreviews,
        true,
        undefined
      )
    }
  }, [files])

  const uploadImages = useMutation({
    mutationFn: (params: UploadImagesMutationParams) => uploadImagesMutation(params),
    onSettled: () => {
      setUploading('done')
    }
  })

  async function handleUploadPhotos(event: FormEvent){
    event.preventDefault()

    //TODO: preform form validation
    if(filesUpload) {
      uploadImages.mutate({
        collection: collection,
        set: set,
        files: filesUpload,
        progressStep: setUploadProgress,
        totalUpload: totalUpload,
        updateItems: setTotalItems,
        options: {
          logging: true
        }
      })

      setTotalItems({ items: 0, total: filesUpload.size })
      setUploading('inprogress')
      setTotalUpload(totalUpload)
      onClose()
    }
  }

  return (
    <>
      {(uploading === 'inprogress' || uploading === 'done' || uploading === 'paused') && (
        <div className="fixed p-4 rounded-lg shadow right-5 bottom-5 flex flex-row items-center justify-between z-20 bg-white border border-gray-300">
          <div className='flex flex-row items-center relative'>
            <HiOutlineUpload className={`${uploading === 'done' ? 'text-green-400' : 'animate-pulse'}`} size={24}/>
            <div className="flex flex-col justify-start min-w-[200px] ms-4 me-4">
              <div className="flex flex-row items-center justify-between">
                { uploading === 'inprogress' || uploading === 'paused' ? (
                  <>
                    <span className="text-sm">Uploading</span>
                    <Loading className="text-lg"/>
                  </>
                ) : (
                  <span className="text-sm text-green-600">Done</span>
                )}
                <div className={`flex flex-row gap-1 text-xs ${uploading === 'done' ? 'text-green-600' : ''}`}>
                  <span>
                    {`${formatFileSize(totalUpload * uploadProgress, 0)} / ${formatFileSize(totalUpload, 0)}`}
                  </span>
                  {totalItems && (
                    <>
                      <span>&bull;</span>
                      <span>
                        {`${totalItems.items} / ${totalItems.total}`}
                      </span>
                    </>
                  )}
                  { uploading === 'inprogress' && (
                    <>
                      <span>&bull;</span>
                      <ProgressMetric currentAmount={uploadProgress * totalUpload}/>
                    </>
                  )}
                </div>
              </div>
              {(uploading === 'inprogress' || uploading === 'paused') && (
                <Progress 
                  progress={uploadProgress * 100}
                  size="sm"
                />
              )}
            </div>
          </div>
          <button 
            className="absolute right-2 top-2"
            onClick={() => {
              setUploading((prev) => {
                if(prev === 'done') {
                  return 'idle'
                }
                return prev
              })
            }}
          >
            <HiOutlineXMark size={16} />
          </button>
        </div>
      )}
      <Modal 
        size='xl' 
        show={open} 
        className='font-main' 
        onClose={() => {
          onClose()
        }}
      >
          <Modal.Header>Upload Picture(s)</Modal.Header>
          <Modal.Body className="overflow-x-hidden">
            <div className="relative z-10 w-full flex flex-row items-center justify-center">
              <IssueNotifications 
                issues={uploadIssues}
                setIssues={setUploadIssues}
              />
            </div>
            <form onSubmit={handleUploadPhotos}>
              <div className="flex flex-col">
                <div className="flex flex-row items-center justify-between">
                  <Label className="ms-2 font-semibold text-xl" htmlFor="name">Files:</Label>
                  <div className="flex flex-row gap-2 items-center text-xl">
                    {filesUpload && filesUpload.size > 0 && (
                      <>
                        <span className="font-semibold">Total:</span>
                        <span>{formatFileSize(totalUpload, 2)}</span>
                      </>
                    )}
                  </div>
                </div>
                {filesPreview && filesPreview.size > 0 ? (
                  <div className="h-full">
                    <AutoSizer className="min-h-[340px] z-0">
                    {({ height, width }: { height: number; width: number }) => (
                      <FixedSizeList
                        height={height}
                        itemCount={filesPreview?.size ?? 0}
                        itemSize={35}
                        width={width}
                        itemData={{
                          data: [...filesPreview.entries()].map(([url, file]) => ({url: url, file: file})),
                          onDelete: (key, fileName) => {
                            const previews = new Map<string, File>([...filesPreview.entries()].filter((entry) => entry[0] !== fileName))
                            const files = new Map<string, File>([...filesUpload.entries()].filter((entry) => entry[0] !== key))
                            
                            previews.delete(key)
                            files.delete(fileName)

                            const totalUpload = [...files.values()].reduce((prev, cur) => prev += cur.size, 0)

                            setFilesUpload(files)
                            setFilesPreview(previews)
                            setTotalUpload(totalUpload)
                          },
                          issues: uploadIssues,
                          updateIssues: setUploadIssues,
                        }}
                      >
                        {ImagesRow}
                      </FixedSizeList>
                    )}
                    </AutoSizer>
                  </div>
                ) : (
                  loadingPreviews ? (
                    <Loading />
                  ) : (
                    <span className=" italic text-sm ms-6">Uploaded files will preview here!</span>
                  )
                )}
              </div>
              <div className="flex flex-row justify-end border-t mt-4 gap-4">
                { uploadIssues.some((issue) => issue.type === 'duplicate') && 
                  filesPreview !== undefined &&(
                  <>
                    <Button 
                      type='button' 
                      className="text-xl mt-4" 
                      color="light"
                      onClick={() => {
                        const tempIssues = [...uploadIssues].filter((issue) => issue.type !== 'duplicate')
                        setUploadIssues(tempIssues)
                      }}
                    >
                      Replace All
                    </Button>
                    <Button 
                      type="button" 
                      className="text-xl mt-4" 
                      color='red'
                      onClick={() => {
                        const foundIssueSet = uploadIssues.find((issue) => issue.type === 'duplicate')?.id
                        invariant(foundIssueSet)
                        const tempPreview = new Map<string, File>(filesPreview)
                        const tempUpload = new Map<string, File>(filesUpload)
                        const previewKeys = [...filesPreview.entries()]
                          .map((entry) => {
                            if(foundIssueSet.some((id) => id === entry[1].name)){
                              return entry[0]
                            }
                            return undefined
                          })
                          .filter((item) => item !== undefined)
                        previewKeys.forEach((preview) => {
                          tempPreview.delete(preview)
                        })
                        foundIssueSet.forEach((id) => {
                          tempUpload.delete(id)
                        })
                        const tempIssues = [...uploadIssues].filter((issue) => issue.type !== 'duplicate')

                        setFilesPreview(tempPreview)
                        setFilesUpload(tempUpload)
                        setUploadIssues(tempIssues)
                      }}
                    >
                      Delete All
                    </Button>
                  </>
                )}
                <Button type="button" className="text-xl mt-4" color="light">
                  <label htmlFor="modal-upload-file">
                    Add Files
                    <input 
                      id='modal-upload-file' 
                      className="hidden"
                      multiple
                      type="file"
                      accept="image/*"
                      onChange={async (event) => {
                        if(event.target.files){
                          validateFiles(
                            Array.from(event.target.files),
                            filesUpload,
                            uploadIssues,
                            set,
                            setFilesPreview,
                            setFilesUpload,
                            setUploadIssues,
                            setTotalUpload,
                            setLoadingPreviews,
                            true,
                            filesPreview,
                          )
                        }
                      }}
                    />
                  </label>
                </Button>
                <Button className="text-xl mt-4" type="submit">Upload</Button>
              </div>
            </form>
          </Modal.Body>
        </Modal>
      </>
  )
}