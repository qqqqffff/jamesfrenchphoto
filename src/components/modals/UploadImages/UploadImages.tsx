import { Button, Label, Modal, TextInput } from "flowbite-react"
import { Dispatch, FC, FormEvent, SetStateAction, useEffect, useRef, useState } from "react"
import { ModalProps } from ".."
import { PhotoCollection, PhotoSet, PicturePath } from "../../../types";
import { formatFileSize, parsePathName, textInputTheme } from "../../../utils";
import { FixedSizeList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { UploadImagesMutationParams } from "../../../services/photoSetService";
import { ImagesRow, ImagesRowProps } from "./ImagesRow";
import { IssueNotifications, UploadIssue, UploadIssueType } from "./IssueNotifications";
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
  files: File[],
  createUpload: (params: UploadImagesMutationParams) => void,
  updateUpload: Dispatch<SetStateAction<UploadData[]>>
  updatePicturePaths: Dispatch<SetStateAction<PicturePath[]>>,
  parentUpdateSet: Dispatch<SetStateAction<PhotoSet | undefined>>
  parentUpdateCollection: Dispatch<SetStateAction<PhotoCollection | undefined>>
  parentUpdateCollections: Dispatch<SetStateAction<PhotoCollection[]>>
}

function validateFiles(
  files: File[],
  set: PhotoSet,
  setFilesPreview: Dispatch<SetStateAction<Map<string, { file: File, width: number, height: number }> | undefined>>,
  setFilesUpload: Dispatch<SetStateAction<Map<string, { file: File, width: number, height: number }>>>,
  setUploadIssues: Dispatch<SetStateAction<Map<UploadIssueType, UploadIssue[]>>>,
) {
  const filesArray = files.reduce((prev, cur) => {
    if(cur.type.includes('image')){
      prev.push(cur)
    }
    else {
      setUploadIssues(prev => {
        const temp = new Map(prev)
        temp.set(UploadIssueType["invalid-file"], [
          ...(temp.get(UploadIssueType["invalid-file"]) ?? []).filter((issue) => issue.id !== cur.name), 
          { id: cur.name, visible: true }
        ])
        return temp
      })
    }
    return prev
  }, [] as File[])

  filesArray.forEach(async (file) => {
    file.arrayBuffer().then((buffer) => {
      const url = URL.createObjectURL(new Blob([buffer], { type: file.type}))

      new Promise(
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
      ).then((dimensions) => {
        if(dimensions.width < 600 || dimensions.height < 400){
          setUploadIssues(prev => {
            const temp = new Map(prev)
            temp.set(UploadIssueType["small-file"], [
              ...(temp.get(UploadIssueType["small-file"]) ?? []).filter((issue) => issue.id !== file.name), 
              { id: file.name, visible: true }
            ])
            return temp
          })
        }

        setFilesPreview(prev => {
          const temp = new Map(prev)
          temp.set(url, { file: file, width: dimensions.width, height: dimensions.height })
          return temp
        })
        setFilesUpload(prev => {
          const temp = new Map(prev)
          temp.set(file.name, { file: file, width: dimensions.width, height: dimensions.height })
          return temp
        })
      })
    })

    const duplicate = set.paths.some((path) => {
      return (
        parsePathName(path.path) === file.name
      )
    })

    if(duplicate){
      setUploadIssues(prev => {
        const temp = new Map(prev)
        temp.set(UploadIssueType["duplicate"], [
          ...(temp.get(UploadIssueType["duplicate"]) ?? []).filter((issue) => issue.id !== file.name),
          { id: file.name, visible: true }
        ])
        return temp
      })
    }
  })
}

export const UploadImagesModal: FC<UploadImagesProps> = ({ 
  CollectionService, open, 
  onClose, collection, set, files, 
  createUpload, updateUpload, updatePicturePaths,
  parentUpdateSet, parentUpdateCollection,
  parentUpdateCollections
}) => {
  const { height } = useWindowDimensions()
  const [filesUpload, setFilesUpload] = useState<Map<string, { file: File, width: number, height: number }>>(new Map())
  const [filesPreview, setFilesPreview] = useState<Map<string, { file: File, width: number, height: number }>>()
  const fileUploadRef = useRef<HTMLInputElement | null>(null)
  const [uploadIssues, setUploadIssues] = useState<Map<UploadIssueType, UploadIssue[]>>(new Map())

  const [filterText, setFilterText] = useState<string>('')
  const [sort, setSort] = useState<{
    type: 'name' | 'size',
    visible: boolean,
    order?: 'ASC' | 'DSC', 
  }>()
  const [watermarkPath, setWatermarkPath] = useState<string>()

  const listRef = useRef<FixedSizeList<ImagesRowProps['data']> | null>(null)
  const [navigateToIndex, setNavigateToIndex] = useState<{ index: number, timeout: NodeJS.Timeout } | null>(null)

  const watermarkQuery = useQuery({
    ...CollectionService.getPathQueryOptions(collection.watermarkPath ?? set.watermarkPath),
    enabled: collection.watermarkPath !== undefined || set.watermarkPath !== undefined
  })
  
  useEffect(() => {
    if(open){
      validateFiles(
        files,
        set,
        setFilesPreview,
        setFilesUpload,
        setUploadIssues,
      )
    }
  }, [files])

  useEffect(() => {
    if(watermarkQuery.data) {
      setWatermarkPath(watermarkQuery.data[1])
    }
  }, [watermarkQuery.data])

  const filesUploadSize = Array.from(filesUpload.values()).reduce((prev, cur) => prev += cur.file.size, 0)

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
        totalUpload: filesUploadSize,
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
            navigateTo={(id) => {
              const rowIndex = Array.from(filteredPreviews.entries()).map((file) => { return [file[0], file[1].file] as [string, File] })
              .findIndex((file) => file[0] === id)
              if(rowIndex !== -1 && listRef.current){
                listRef.current.scrollToItem(rowIndex, 'start')
                if(navigateToIndex !== null) {
                  clearTimeout(navigateToIndex.timeout)
                }
                setNavigateToIndex({ 
                  index: rowIndex, 
                  timeout: setTimeout(() => {
                      setNavigateToIndex(null)
                    }, 3000)
                })
              }
            }}
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
                  {(sort?.visible && sort.type === 'name') && (
                    <button 
                      type="button"
                      className="hover:bg-gray-100 p-1"
                      onClick={() => {
                        setSort({
                          ...sort,
                          order: (sort.order === 'ASC' || sort.order === undefined) ? 'DSC' : 'ASC'
                        })
                      }}
                    >
                      {(sort.order === 'ASC' || sort.order === undefined) ? (
                        <GoTriangleDown size={16}/>
                      ) : (
                        <GoTriangleUp size={16}/>
                      )}
                    </button>
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
                    <span className="">{formatFileSize(filesUploadSize, 2)}</span>
                    <div className="-ml-1">
                      {(sort?.visible && sort.type === 'size') && (
                          <button 
                            type="button"
                            className="hover:bg-gray-100 p-1"
                            onClick={() => {
                              setSort({
                                ...sort,
                                order: (sort.order === 'ASC' || sort.order === undefined) ? 'DSC' : 'ASC'
                              })
                            }}
                          >
                            {(sort.order === 'ASC' || sort.order === undefined) ? (
                              <GoTriangleDown size={16}/>
                            ) : (
                              <GoTriangleUp size={16}/>
                            )}
                          </button>
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
                      ref={listRef}
                      height={height}
                      itemCount={filteredPreviews.size}
                      itemSize={35}
                      width={width}
                      itemData={{
                        data: Array.from(filteredPreviews.entries()).map((file) => { return [file[0], file[1].file] as [string, File] }),
                        previews: Object.fromEntries(
                          Array.from(filesPreview?.entries() ?? []).map((entry) => [entry[1].file.name, entry[0]])
                        ),
                        onDelete: (fileName: string) => {
                          const files = new Map<string, { file: File, width: number, height: number }>(
                            Array.from(filesUpload.entries()).filter((entry) => entry[0] !== fileName)
                          )
                          
                          files.delete(fileName)

                          validateFiles(
                            [...files.values()].map((file) => file.file),
                            set,
                            setFilesPreview,
                            setFilesUpload,
                            setUploadIssues,
                          )

                          setUploadIssues(prev => {
                            const temp = new Map(prev)
                            for(const key of temp.keys()) {
                              const issues = temp.get(key)
                              if(issues){
                                const filteredIssues = issues.filter((issue) => issue.id !== fileName)
                                temp.set(key, filteredIssues)
                              }
                            }
                            return temp
                          })
                          setFilesUpload(files)
                        },
                        issues: uploadIssues,
                        updateIssues: setUploadIssues,
                        watermarkQuery: watermarkQuery,
                        watermarkPath: watermarkPath,
                        navigatedIndex: navigateToIndex?.index ?? null
                      }}
                    >
                      {ImagesRow}
                    </FixedSizeList>
                  )}
                </AutoSizer>
              </div>
            ) : (
              <span className=" italic text-sm ms-6">Uploaded files will preview here!</span>
            )}
          </div>
          <div className="flex flex-row justify-end border-t mt-4 gap-4">
            { Array.from(uploadIssues.entries()).some((entry) => entry[0] === 'duplicate' && entry[1].length > 0) && 
              filesPreview !== undefined &&(
              <>
                <Button 
                  type='button' 
                  className="text-xl mt-4" 
                  color="light"
                  onClick={() => {
                    setUploadIssues(prev => {
                      const temp = new Map(prev)
                      temp.delete(UploadIssueType["duplicate"])
                      return temp
                    })
                  }}
                >
                  Replace All
                </Button>
                <Button 
                  type="button" 
                  className="text-xl mt-4" 
                  color='red'
                  onClick={() => {
                    const foundIssueSet = uploadIssues.get(UploadIssueType["duplicate"])

                    if(!foundIssueSet) { 
                      //TODO: handle error
                      return
                    }
                    const tempPreview = new Map<string, { file: File, width: number, height: number }>(filesPreview)
                    const tempUpload = new Map<string, { file: File, width: number, height: number }>(filesUpload)
                    const previewKeys = [...filesPreview.entries()]
                      .map((entry) => {
                        if(foundIssueSet.some((issue) => issue.id === entry[1].file.name)){
                          return entry[0]
                        }
                        return undefined
                      })
                      .filter((item) => item !== undefined)
                    previewKeys.forEach((preview) => {
                      tempPreview.delete(preview)
                    })
                    foundIssueSet.forEach((issue) => {
                      tempUpload.delete(issue.id)
                    })

                    setFilesPreview(tempPreview)
                    setFilesUpload(tempUpload)
                    setUploadIssues(prev => {
                      const temp = new Map(prev)
                      temp.delete(UploadIssueType["duplicate"])
                      return temp
                    })
                  }}
                >
                  Remove All
                </Button>
              </>
            )}
            <Button type="button" className="text-xl mt-4" color="light">
              <label htmlFor="file-upload">Add Files</label>
              <input 
                id="file-upload"
                ref={fileUploadRef}
                className="hidden"
                multiple
                type="file"
                accept="image/*"
                onChange={(event) => {
                  if(event.target.files){
                    validateFiles(
                      Array.from(event.target.files),
                      set,
                      setFilesPreview,
                      setFilesUpload,
                      setUploadIssues,
                    )
                    setFilterText('')
                    setSort(undefined)
                    setTimeout(() => {
                      if(fileUploadRef.current){
                        fileUploadRef.current.value = ''
                      }
                    }, 100)
                  }
                }}
              />
            </Button>
            <Button 
              className="text-xl mt-4" 
              type="submit" 
              disabled={
                (uploadIssues.get(UploadIssueType["duplicate"]) ?? []).length > 0 || 
                (uploadIssues.get(UploadIssueType["invalid-file"]) ?? []).length > 0
              }
            >
              Upload
            </Button>
          </div>
        </form>
      </Modal.Body>
    </Modal>
  )
}