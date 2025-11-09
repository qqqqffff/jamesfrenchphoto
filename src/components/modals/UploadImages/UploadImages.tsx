import { Button, Label, Modal, TextInput } from "flowbite-react"
import { Dispatch, FC, FormEvent, SetStateAction, useEffect, useState } from "react"
import { ModalProps } from ".."
import { PhotoCollection, PhotoSet, PicturePath } from "../../../types";
import { formatFileSize, parsePathName, textInputTheme } from "../../../utils";
import { FixedSizeList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { UploadImagesMutationParams } from "../../../services/photoSetService";
import Loading from "../../common/Loading";
import { ImagesRow } from "./ImagesRow";
import { IssueNotifications, UploadIssue } from "./IssueNotifications";
import { GoTriangleDown, GoTriangleUp } from "react-icons/go";
import { UploadData } from "./UploadToast";
import { v4 } from 'uuid'
import useWindowDimensions from "../../../hooks/windowDimensions";
import { useQuery } from "@tanstack/react-query";
import { CollectionService } from "../../../services/collectionService";

interface UploadImagesProps extends ModalProps {
  CollectionService: CollectionService,
  collection: PhotoCollection,
  set: PhotoSet;
  files: Map<string, { file: File, width: number, height: number }>,
  createUpload: (params: UploadImagesMutationParams) => void,
  updateUpload: Dispatch<SetStateAction<UploadData[]>>
  updatePicturePaths: Dispatch<SetStateAction<PicturePath[]>>,
  parentUpdateSet: Dispatch<SetStateAction<PhotoSet | undefined>>
  parentUpdateCollection: Dispatch<SetStateAction<PhotoCollection | undefined>>
  parentUpdateCollections: Dispatch<SetStateAction<PhotoCollection[]>>
}

async function validateFiles(
  files: File[],
  filesUpload: Map<string, { file: File, width: number, height: number }>,
  startIssues: UploadIssue[],
  set: PhotoSet,
  setFilesPreview: Dispatch<SetStateAction<Map<string, { file: File, width: number, height: number }> | undefined>>,
  setFilesUpload: Dispatch<SetStateAction<Map<string, { file: File, width: number, height: number }>>>,
  setUploadIssues: Dispatch<SetStateAction<UploadIssue[]>>,
  setTotalUpload: Dispatch<SetStateAction<number>>,
  setLoadingPreviews: Dispatch<SetStateAction<boolean>>,
  logging: boolean,
  filesPreviews?: Map<string,  { file: File, width: number, height: number }>,
) {
  setLoadingPreviews(true)
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

  
  //TODO: don't await all to load previews or find issues
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

    if(dimensions.width < 600 || dimensions.height < 400){
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
      file: file,
      width: dimensions.width,
      height: dimensions.height
    }  
  }))

  const done = new Date(new Date().getTime() - start)
  if(logging) console.log(`${done.getTime()}ms`)

  if(filesPreviews !== undefined){
    const previews = new Map<string, { file: File, width: number, height: number }>(filesPreviews)
    const uploads = new Map<string, { file: File, width: number, height: number }>(filesUpload)

    previewsMap
      .sort((a, b) => a.file.name.localeCompare(b.file.name))
      .forEach((preview) => {
        previews.set(preview.url, { file: preview.file, width: preview.width, height: preview.height })
        uploads.set(preview.file.name, { file: preview.file, width: preview.width, height: preview.height })
      })

    const total = [...previews.values()].reduce((prev, cur) => prev += cur.file.size, 0)

    setFilesPreview(previews)
    setFilesUpload(uploads)
    setUploadIssues(issues)
    setLoadingPreviews(false)
    setTotalUpload(total)
  } else {
    const previews = new Map<string, { file: File, width: number, height: number }>()

    previewsMap
    .sort((a, b) => a.file.name.localeCompare(b.file.name))
    .forEach((preview) => {
      previews.set(preview.url, { file: preview.file, width: preview.width, height: preview.height })
    })

    const total = [...previews.values()].reduce((prev, cur) => prev += cur.file.size, 0)

    setFilesPreview(previews)
    setUploadIssues(issues)
    setLoadingPreviews(false)
    setTotalUpload(total)
  }  
}

export const UploadImagesModal: FC<UploadImagesProps> = ({ 
  CollectionService,
  open, onClose, collection, set, files, 
  createUpload, updateUpload, updatePicturePaths,
  parentUpdateSet, parentUpdateCollection,
  parentUpdateCollections
}) => {
  const { height } = useWindowDimensions()
  const [filesUpload, setFilesUpload] = useState<Map<string, { file: File, width: number, height: number }>>(files)
  const [filesPreview, setFilesPreview] = useState<Map<string, { file: File, width: number, height: number }>>()
  const [totalUpload, setTotalUpload] = useState<number>(
    [...filesUpload.values()].reduce((prev, cur) => prev += cur.file.size, 0)
  )
  
  const [uploadIssues, setUploadIssues] = useState<UploadIssue[]>([])
  const [loadingPreviews, setLoadingPreviews] = useState(false)

  const [filterText, setFilterText] = useState<string>('')
  const [sort, setSort] = useState<{
    type: 'name' | 'size',
    visible: boolean,
    order?: 'ASC' | 'DSC', 
  }>()
  const [watermarkPath, setWatermarkPath] = useState<string>()

  const watermarkQuery = useQuery({
    ...CollectionService.getPathQueryOptions(collection.watermarkPath ?? set.watermarkPath),
    enabled: collection.watermarkPath !== undefined || set.watermarkPath !== undefined
  })
  
  useEffect(() => {
    if(open){
      validateFiles(
        [...files.values()].map((file) => file.file),
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

  useEffect(() => {
    if(watermarkQuery.data) {
      setWatermarkPath(watermarkQuery.data[1])
    }
  }, [watermarkQuery.data])

  async function handleUploadPhotos(event: FormEvent){
    event.preventDefault()

    if(filesUpload) {
      createUpload({
        uploadId: v4(),
        collection: collection,
        set: set,
        files: filesUpload,
        updateUpload: updateUpload,
        updatePaths: updatePicturePaths,
        parentUpdateSet: parentUpdateSet,
        parentUpdateCollection: parentUpdateCollection,
        parentUpdateCollections: parentUpdateCollections,
        totalUpload: totalUpload,
        duplicates: Object.fromEntries(set.paths
          .filter((path) => filesUpload.get(parsePathName(path.path)) !== undefined)
          .map((path) => [parsePathName(path.path), path])),
        options: {
          logging: true
        }
      })

      
      onClose()
    }
  }

  const filteredPreviews =  (() => {
    const tempPreviews = new Map<string, { file: File, width: number, height: number }>()
    
    if(filterText !== ''){
      const trimmedText = filterText.trim().toLocaleLowerCase()

      Array.from(filesUpload.entries()).forEach((entry) => {
        try{
          const filtered = entry[0]
            .trim()
            .toLowerCase()
            .includes(trimmedText)
          
          if(filtered){
            tempPreviews.set(entry[0], entry[1])
          }
        } catch(err) {
          
        }
      })
    }
    else {
      Array.from(filesUpload.entries()).forEach((entry) => tempPreviews.set(entry[0], entry[1]))
    }


    if(sort && sort.order){
      if(sort.type === 'name'){
        const sortedPreviews = new Map<string, { file: File, width: number, height: number }>()
        const sortedUploads = new Map<string, { file: File, width: number, height: number }>()
        Array.from(filesUpload.entries()).sort((a, b) => {
          if(sort.order === 'DSC') return b[0].localeCompare(a[0])
          return a[0].localeCompare(b[0])
        })
        .forEach((entry) => {
          sortedUploads.set(entry[0], entry[1])
          if(tempPreviews.has(entry[0])) sortedPreviews.set(entry[0], entry[1])
        })

        setFilesUpload(sortedUploads)
        return sortedPreviews
      }
      else {
        const sortedPreviews = new Map<string, { file: File, width: number, height: number }>()
        const sortedUploads = new Map<string, { file: File, width: number, height: number }>()
        Array.from(filesUpload.entries()).sort((a, b) => {
          if(sort.order === 'DSC') return b[1].file.size - a[1].file.size
          return a[1].file.size - b[1].file.size
        }).forEach((entry) => {
          sortedUploads.set(entry[0], entry[1])
          if(tempPreviews.has(entry[0])) sortedPreviews.set(entry[0], entry[1])
        })

        setFilesUpload(sortedUploads)
        return sortedPreviews
      }
    }

    return tempPreviews
  })()

  return (
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
            <div className="flex flex-row w-full mb-1 items-center justify-between">
              <div 
                className="flex flex-row items-center justify-start w-[25%]"
                onMouseEnter={() => setSort((prev) => {
                  if(prev?.type == 'size'){
                    return {
                      type: 'name',
                      order: undefined,
                      visible: true
                    }
                  }
                  return {...sort, type: 'name', visible: true}
                })}
                onMouseLeave={() => setSort({...sort, type: 'name', visible: false})}
              >
                <Label className="text-xl" htmlFor="name">
                  <span className="font-semibold mr-1">Files</span>
                  <span>({filesUpload.size})</span>
                  <span>:</span>
                </Label>
                <div className="mt-1">
                  {(sort?.visible && sort.type === 'name') ? (
                    (sort.order === 'ASC' || sort.order === undefined) ? (
                      <button 
                        type="button"
                        onClick={() => {
                          setSort({
                            ...sort,
                            order: 'DSC'
                          })
                        }}
                      >
                        <GoTriangleDown size={16}/>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSort({
                            ...sort,
                            order: 'ASC'
                          })
                        }}
                      >
                        <GoTriangleUp size={16}/>
                      </button>
                    )
                  ) : (
                    <GoTriangleDown size={16} className="text-transparent" />
                  )}
                </div>
              </div>
              <TextInput 
                theme={textInputTheme} 
                sizing="sm" 
                className="mt-1 text-opacity-90 max-w-[30%] min-w-max" 
                placeholder="Search Files..."
                onChange={(event) => {
                  setFilterText(event.target.value)
                }}
                value={filterText}
              />
              <div 
                className="flex flex-row gap-1 items-center text-xl justify-end max-w-[35%]"
                onMouseEnter={() => setSort((prev) => {
                  if(prev?.type == 'name'){
                    return {
                      type: 'size',
                      order: undefined,
                      visible: true
                    }
                  }
                  return {...sort, type: 'size', visible: true}
                })}
                onMouseLeave={() => setSort({...sort, type: 'size', visible: false})}
              >
                {filesUpload && filesUpload.size > 0 && (
                  <>
                    <span className="font-semibold">Total:</span>
                    <span className="">{formatFileSize(totalUpload, 2)}</span>
                    <div className="-ml-1">
                      {(sort?.visible && sort.type === 'size') ? (
                        (sort.order === 'ASC' || sort.order === undefined) ? (
                          <button 
                            type="button"
                            onClick={() => {
                              setSort({
                                ...sort,
                                order: 'DSC'
                              })
                            }}
                          >
                            <GoTriangleDown size={16}/>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSort({
                                ...sort,
                                order: 'ASC'
                              })
                            }}
                          >
                            <GoTriangleUp size={16}/>
                          </button>
                        )
                      ) : (
                        <GoTriangleDown size={16} className="text-transparent" />
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            {filesUpload.size > 0 ? (
              <div className="h-full">
                <AutoSizer className="z-0" style={{ minHeight: `${height - 350}px`}}>
                  {({ height, width }: { height: number; width: number }) => (
                    <FixedSizeList
                      height={height}
                      itemCount={filteredPreviews.size}
                      itemSize={35}
                      width={width}
                      itemData={{
                        data: Array.from(filteredPreviews.entries()).map((file) => { return [file[0], file[1].file] as [string, File] }),
                        previews: Object.fromEntries(
                          Array.from(filesPreview?.entries() ?? []).map((entry) => [entry[1].file.name, entry[0]])
                        ),
                        loadingPreviews: loadingPreviews,
                        onDelete: (fileName) => {
                          const files = new Map<string, { file: File, width: number, height: number }>(
                            Array.from(filesUpload.entries()).filter((entry) => entry[0] !== fileName)
                          )
                          
                          files.delete(fileName)

                          const totalUpload = [...files.values()].reduce((prev, cur) => prev += cur.file.size, 0)

                          validateFiles(
                            [...files.values()].map((file) => file.file),
                            files,
                            uploadIssues,
                            set,
                            setFilesPreview,
                            setFilesUpload,
                            setUploadIssues,
                            setTotalUpload,
                            setLoadingPreviews,
                            true,
                            undefined
                          )

                          setTotalUpload(totalUpload)
                          setFilesUpload(files)
                        },
                        issues: uploadIssues,
                        updateIssues: setUploadIssues,
                        watermarkQuery: watermarkQuery,
                        watermarkPath: watermarkPath
                      }}
                    >
                      {ImagesRow}
                    </FixedSizeList>
                  )}
                </AutoSizer>
              </div>
            ) : (
              loadingPreviews ? (
                <div className="flex flex-row gap-1">
                  <span className="italic text-sm ms-6">Loading Previews</span>
                  <Loading />
                </div>
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

                    if(!foundIssueSet) { 
                      //TODO: handle error
                      return
                    }
                    const tempPreview = new Map<string, { file: File, width: number, height: number }>(filesPreview)
                    const tempUpload = new Map<string, { file: File, width: number, height: number }>(filesUpload)
                    const previewKeys = [...filesPreview.entries()]
                      .map((entry) => {
                        if(foundIssueSet.some((id) => id === entry[1].file.name)){
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

                    let total = Array.from(tempPreview.values()).reduce((prev, cur) => prev += cur.file.size, 0)
                    
                    const tempIssues = [...uploadIssues].filter((issue) => issue.type !== 'duplicate')

                    setFilesPreview(tempPreview)
                    setFilesUpload(tempUpload)
                    setUploadIssues(tempIssues)
                    setTotalUpload(total)
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
                      setFilterText('')
                      setSort(undefined)
                    }
                  }}
                />
              </label>
            </Button>
            <Button 
              className="text-xl mt-4" 
              type="submit" 
              disabled={uploadIssues.some((issue) => 
                issue.type === 'duplicate' || issue.type === 'invalid-file')}
            >
              Upload
            </Button>
          </div>
        </form>
      </Modal.Body>
    </Modal>
  )
}