import { Button, Label, Modal, TextInput } from "flowbite-react"
import { Dispatch, FC, FormEvent, SetStateAction, useEffect, useState } from "react"
import { ModalProps } from ".."
import { PhotoCollection, PhotoSet, PicturePath } from "../../../types";
import { formatFileSize, parsePathName, textInputTheme } from "../../../utils";
import { FixedSizeList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { UploadImagesMutationParams } from "../../../services/photoSetService";
import Loading from "../../common/Loading";
import { invariant } from "@tanstack/react-router";
import { ImagesRow } from "./ImagesRow";
import { IssueNotifications, UploadIssue } from "./IssueNotifications";
import { GoTriangleDown, GoTriangleUp } from "react-icons/go";
import { UploadData } from "./UploadToast";
import { v4 } from 'uuid'

interface UploadImagesProps extends ModalProps {
  collection: PhotoCollection,
  set: PhotoSet;
  files: Map<string, File>,
  createUpload: (params: UploadImagesMutationParams) => void,
  updateUpload: Dispatch<SetStateAction<UploadData[]>>
  updatePicturePaths: Dispatch<SetStateAction<PicturePath[]>>,
  parentUpdateSet: Dispatch<SetStateAction<PhotoSet | undefined>>
  parentUpdateCollection: Dispatch<SetStateAction<PhotoCollection | undefined>>
  parentUpdateCollections: Dispatch<SetStateAction<PhotoCollection[]>>
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

export const UploadImagesModal: FC<UploadImagesProps> = ({ 
  open, onClose, collection, set, files, 
  createUpload, updateUpload, updatePicturePaths,
  parentUpdateSet, parentUpdateCollection,
  parentUpdateCollections
}) => {
  const [filesUpload, setFilesUpload] = useState<Map<string, File>>(files)
  const [filesPreview, setFilesPreview] = useState<Map<string, File>>()
  const [totalUpload, setTotalUpload] = useState<number>(
    [...filesUpload.values()].reduce((prev, cur) => prev += cur.size, 0)
  )
  
  const [uploadIssues, setUploadIssues] = useState<UploadIssue[]>([])
  const [loadingPreviews, setLoadingPreviews] = useState(false)

  const [filteredPreviews, setFilteredPreviews] = useState<{url: string, file: File}[]>()
  const [filterText, setFilterText] = useState<string>('')
  const [sort, setSort] = useState<{
    type: 'name' | 'size',
    visible: boolean,
    order?: 'ASC' | 'DSC', 
  }>()
  
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

  function sortPreviews(text?: string){
    const tempPreviews = new Map<string, File>(filesPreview)
    const tempFilter: {url: string, file: File}[] = []
    
    if(filterText || text){
      const trimmedText = (text ?? filterText).trim().toLocaleLowerCase()

      Array.from(tempPreviews.entries()).forEach((entry) => {
        try{
          const filtered = entry[1]
            .name
            .trim()
            .toLowerCase()
            .includes(trimmedText)
          
          if(filtered){
            tempFilter.push({
              url: entry[0],
              file: entry[1]
            })
          }
        } catch(err) {
          
        }
      })
    }
    else {
      Array.from(tempPreviews.entries()).forEach((entry) => tempFilter.push({ url: entry[0], file: entry[1] }))
    }

    if(sort && sort.order){
      if(sort.type === 'name'){
        tempFilter.sort((a, b) => {
          if(sort.order === 'DSC') return b.file.name.localeCompare(a.file.name)
          return a.file.name.localeCompare(b.file.name)
        })
      }
      else {
        tempFilter.sort((a, b) => {
          if(sort.order === 'DSC') return b.file.size - a.file.size
          return a.file.size - b.file.size
        })
      }
    }

    setFilteredPreviews(tempFilter)
  }

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
            <div className="grid grid-cols-3 mb-1">
              <div 
                className="flex flex-row items-center justify-start"
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
                <Label className="font-semibold text-xl" htmlFor="name">Files:</Label>
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
                          sortPreviews()
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
                          sortPreviews()
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
                className="mt-1 text-opacity-90" 
                placeholder="Search Files..."
                onChange={(event) => {
                  setFilterText(event.target.value)
                  sortPreviews(event.target.value)
                }}
                value={filterText}
              />
              <div 
                className="flex flex-row gap-2 items-center text-xl justify-end"
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
                    <span>{formatFileSize(totalUpload, 2)}</span>
                    <div className="-ml-2">
                      {(sort?.visible && sort.type === 'size') ? (
                        (sort.order === 'ASC' || sort.order === undefined) ? (
                          <button 
                            type="button"
                            onClick={() => {
                              setSort({
                                ...sort,
                                order: 'DSC'
                              })
                              sortPreviews()
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
                              sortPreviews()
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
            {filesPreview && filesPreview.size > 0 ? (
              <div className="h-full">
                <AutoSizer className="min-h-[340px] z-0">
                  {({ height, width }: { height: number; width: number }) => (
                    <FixedSizeList
                      height={height}
                      itemCount={filteredPreviews?.length ?? filesPreview?.size ?? 0}
                      itemSize={35}
                      width={width}
                      itemData={{
                        data: filteredPreviews ?? [...filesPreview.entries()].map(([url, file]) => ({url: url, file: file})),
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

                    let total = Array.from(tempPreview.values()).reduce((prev, cur) => prev += cur.size, 0)
                    
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