import { Alert, Button, FlowbiteColors, Label, Modal, Progress, Tooltip } from "flowbite-react"
import { Dispatch, FC, FormEvent, SetStateAction, useEffect, useState } from "react"
import { HiOutlineExclamationTriangle, HiOutlineTrash, HiOutlineXMark } from "react-icons/hi2"
import { ModalProps } from "."
import { PhotoCollection, PhotoSet } from "../../types";
import { DynamicStringEnumKeysOf, formatFileSize, parsePathName } from "../../utils";
import { FixedSizeList, ListChildComponentProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { useMutation } from "@tanstack/react-query";
import { uploadImagesMutation, UploadImagesMutationParams } from "../../services/photoSetService";
import { HiOutlineRefresh, HiOutlineUpload } from "react-icons/hi";
import Loading from "../common/Loading";
import { ProgressMetric } from "../common/ProgressMetric";
import { invariant } from "@tanstack/react-router";


//TODO: add updating live

export interface UploadIssue {
  message: string, 
  type: 'duplicate' | 'invalid-file' | 'small-file', 
  color: DynamicStringEnumKeysOf<FlowbiteColors>,
  id: string[],
  visible: boolean
}

interface UploadImagesProps extends ModalProps {
  collection: PhotoCollection,
  set: PhotoSet;
  files: Map<string, File>
}

interface RowProps extends ListChildComponentProps {
  data: {
    data: { url: string, file: File}[],
    onDelete: (key: string, fileName: string) => void
    issues: UploadIssue[],
    updateIssues: Dispatch<SetStateAction<UploadIssue[]>>
  }
}

const Row: FC<RowProps> = ({ index, data, style }) => {
  const smallUpload = data.issues
    .find((issue) => issue.type === 'small-file')?.id
    .includes(data.data[index].file.name)
  const duplicate = data.issues
    .find((issue) => issue.type === 'duplicate')?.id
    .includes(data.data[index].file.name)
  return (
    <div key={index} className="flex flex-row items-center justify-between border-b w-full gap-2" style={style}>
      <div className="flex flex-row w-[80%] overflow-hidden mt-1 items-center gap-2">
        {smallUpload && (
          <Tooltip
            style="light"
            placement="bottom-start"
            arrow={false}
            content={(
              <span className="whitespace-nowrap">Small File</span>
            )}
          >
            <HiOutlineExclamationTriangle size={16} className="text-yellow-300"/>
          </Tooltip>
        )}
        { duplicate && (
          <>
            <Tooltip
              style="light"
              placement="bottom-start"
              arrow={false}
              content={(
                <span>Replace</span>
              )}
            >
              <button
                onClick={() => {
                  let tempIssues: UploadIssue[] = [
                    ...data.issues
                  ]
                  
                  const tempIndex = tempIssues.findIndex((isuse) => isuse.type === 'duplicate')
                  invariant(tempIndex !== -1)
                  tempIssues[tempIndex].id = tempIssues[tempIndex].id.filter((id) => id !== data.data[index].file.name)
                  if(tempIssues[tempIndex].id.length === 0){
                    tempIssues = tempIssues.filter((issue) => issue.type !== 'duplicate')
                  }
  
                  data.updateIssues(tempIssues)
                }}
              >
                <HiOutlineRefresh size={16} className="text-red-500" />  
              </button>
            </Tooltip>
            <Tooltip
              style="light"
              placement="bottom-start"
              arrow={false}
              content={(
                <span>Delete</span>
              )}
            >
              <button onClick={() => {
                let tempIssues: UploadIssue[] = [
                  ...data.issues
                ]
                
                const tempIndex = tempIssues.findIndex((isuse) => isuse.type === 'duplicate')
                invariant(tempIndex !== -1)
                tempIssues[tempIndex].id = tempIssues[tempIndex].id.filter((id) => id !== data.data[index].file.name)
                if(tempIssues[tempIndex].id.length === 0){
                  tempIssues = tempIssues.filter((issue) => issue.type !== 'duplicate')
                }

                data.updateIssues(tempIssues)
                data.onDelete(data.data[index].url, data.data[index].file.name)
              }}>
                <HiOutlineTrash size={16} className="text-red-500" />  
              </button>
            </Tooltip>
          </>
        )}
        <Tooltip 
          style="light"
          placement='bottom-start'
          arrow={false}
          content={(
            <img src={data.data[index].url} loading='lazy' className="h-[240px] object-cover rounded-lg"/>
          )}
        >
          <span 
            className={`
              inline-block truncate 
              ${duplicate ? 'text-red-500' : smallUpload ? 'text-yellow-300' : ''}
            `}
          >
            {data.data[index].file.name}
          </span>
        </Tooltip>
      </div>
      <div className="justify-end items-center flex flex-row gap-2 -ml-[10%]">
        <span className="text-nowrap">{formatFileSize(data.data[index].file.size, 0)}</span>
        <button 
          className="hover:text-gray-500 py-0.5 px-1.5 mt-0.5" 
          type='button' 
          onClick={() => data.onDelete(data.data[index].url, data.data[index].file.name)}
        >
          <HiOutlineXMark size={16}/>
        </button>
      </div>
    </div>
  )
}

const NotificationComponent = (props: {issues: UploadIssue[], setIssues: Dispatch<SetStateAction<UploadIssue[]>>}) => {
  return (
    <div className="relative z-10 w-full flex flex-col gap-2 items-center justify-center mt-2">
      {props.issues.map((issue) => {
        if(!issue.visible) return undefined
        return (
          <Alert 
            color={issue.color} 
            className="w-[90%] absolute opacity-75"
            onDismiss={() => {
              const foundIssue = props.issues.findIndex((i) => i.type === issue.type)
              invariant(foundIssue !== -1)
              const tempIssues = [...props.issues]
              tempIssues[foundIssue].visible = false
              props.setIssues(tempIssues)
            }}
          >
            {issue.message}
          </Alert>
        )
      })}
    </div>
  )
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
      (async () => {
        setLoadingPreviews(true)
        const now = new Date().getTime()
        const issues: UploadIssue[] = []
        const filesArray = [...files.values()].reduce((prev, cur) => {
          console.log(cur.type)
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

        console.log(filesArray)

        const previews = new Map<string, File>()
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
  
        previewsMap.forEach((preview) => {
          previews.set(preview.url, preview.file)
        })

        const done = new Date(new Date().getTime() - now)
        console.log(`${done.getTime()}ms`)
  
        setFilesPreview(previews)
        setUploadIssues(issues)
        setLoadingPreviews(false)
      })()
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
              <NotificationComponent 
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
                        <span>{formatFileSize(totalUpload, 0)}</span>
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
                        {Row}
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

                        setFilesPreview(tempPreview)
                        setFilesUpload(tempUpload)
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
                          const previewsMap = await Promise.all(Array.from(event.target.files).map(async (file) => {
                            return {
                              url: URL.createObjectURL(new Blob([await file.arrayBuffer()], { type: file.type})),
                              file: file
                            }  
                          }))
                          const previews = new Map<string, File>(filesPreview)
                          const files = new Map<string, File>(filesUpload)
                          previewsMap.forEach((preview) => {
                            previews.set(preview.url, preview.file)
                            files.set(preview.file.name, preview.file)
                          })
                          const total = [...previews.values()].reduce((prev, cur) => prev += cur.size, 0)

                          setFilesPreview(previews)
                          setFilesUpload(files)
                          setTotalUpload(total)
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