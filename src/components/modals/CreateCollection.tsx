import { Badge, Button, Dropdown, Label, Modal, Progress, TextInput, ToggleSwitch, Tooltip } from "flowbite-react"
import { FC, FormEvent, useState } from "react"
import { HiOutlineXMark, HiOutlineStar, HiOutlineCheckCircle } from "react-icons/hi2"
import { ModalProps } from "."
import { PhotoCollection, UserTag } from "../../types";
import { badgeColorThemeMap, formatFileSize, parsePathName, textInputTheme } from "../../utils";
import { FixedSizeList, ListChildComponentProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { GoTriangleDown, GoTriangleUp } from 'react-icons/go'
import { useMutation, useQuery } from "@tanstack/react-query";
import { createCollectionMutation, CreateCollectionParams, getPathsDataMapFromPathsQueryOptions, updateCollectionMutation, UpdateCollectionParams } from "../../services/collectionService";

interface CreateCollectionProps extends ModalProps {
  eventId: string;
  onSubmit: (collection: PhotoCollection) => void;
  availableTags: UserTag[]
  collection?: PhotoCollection
}

interface RowProps extends ListChildComponentProps {
  data: {
    data: RowData[],
    onDelete: (key: string) => void,
    cover: string | null,
    setCover: (cover: string | null) => void
  }
}

type RowData = {
  url: string,
  file: File,
  order: number
}

const Row: FC<RowProps> = ({ index, data, style }) => {
    const starClass = `${data.cover == data.data[index].file.name ? 'fill-yellow-300' : ''}`
    return (
      <div key={index} className="flex flex-row justify-between" style={style}>
        <Tooltip className='relative' content={<img src={data.data[index].url} loading='lazy' className="w-[200px] h-[300px] object-cover z-50"/>}>
          <span>{data.data[index].file.name}</span>
        </Tooltip>
        <div className="flex flex-row items-center gap-2">
          <span className="me-10">{data.data[index].order}</span>
          <span className="min-w-[80px]">{formatFileSize(data.data[index].file.size)}</span>
          <button 
            type='button'
            onClick={() => {
              if(data.cover === data.data[index].file.name){
                data.setCover(null)
              }
              else {
                data.setCover(data.data[index].file.name)
              }
            }}
          >
            <HiOutlineStar className={starClass} size={20} />
          </button>
          <button className="hover:border-gray-500 border border-transparent rounded-full p-0.5" type='button' onClick={() => data.onDelete(data.data[index].url)}>
            <HiOutlineXMark size={20}/>
          </button>
        </div>
      </div>
    )
}

export const CreateCollectionModal: FC<CreateCollectionProps> = ({ open, onClose, eventId, onSubmit, availableTags, collection }) => {
    const initialFiles = useQuery({
      ...getPathsDataMapFromPathsQueryOptions((collection?.paths ?? [])),
      enabled: collection !== undefined,
    })
    const [filesUpload, setFilesUpload] = useState<Map<string, {file: File, order: number}> | undefined>(initialFiles.data)

    const [name, setName] = useState('')
    const [cover, setCover] = useState<string | null>(null)
    const [downloadable, setDownloadable] = useState(false)
    const [selectedTags, setSelectedTags] = useState<UserTag[]>([])

    const [filteredResult, setFilteredResult] = useState<Map<string, {file: File, order: number}> | undefined>()
    const [sort, setSort] = useState<{col: 'file' | 'size' | 'order' | undefined, direction?: boolean, visible: boolean}>()

    const [submitting, setSubmitting] = useState(false)
    const [progress, setProgress] = useState<number | undefined>()
    const [loaded, setLoaded] = useState(false)

    if(!loaded && collection){
      setName(collection.name)
      setCover(collection.coverPath ? parsePathName(collection.coverPath) : null)
      setSelectedTags(collection.tags)
      setLoaded(true)
    }

    const createCollection = useMutation({
      mutationFn: (params: CreateCollectionParams) => createCollectionMutation(params),
      onSettled: (data) => {
        //TODO: error handling
        if(data) {
          onSubmit(data)
          clearState()
        }
      }
    })
    const updateCollection = useMutation({
      mutationFn: (params: UpdateCollectionParams) => updateCollectionMutation(params),
      onSettled: (data) => {
        if(data){
          onSubmit(data)
          clearState()
        }
      }
    })
    if(filesUpload === undefined && initialFiles.data && initialFiles.data.size > 0){
      setFilesUpload(initialFiles.data)
    }

    async function handleUploadPhotos(event: FormEvent){
      event.preventDefault()
      setSubmitting(true)

      if(!name){
        //TODO: throw error
        return
      }

      const convertedMap = new Map<string, File>()

      Array.from(((filesUpload ?? new Map<string, {file: File, order: number}>()).entries())).forEach((entry) => {
        convertedMap.set(entry[0], entry[1].file)
      })

      const createCollectionParams: CreateCollectionParams = {
        eventId,
        name,
        tags: selectedTags,
        cover,
        downloadable,
        paths: convertedMap,
        setProgress,
      }

      if(collection) {
        const updateCollectionParams: UpdateCollectionParams = {
          ...createCollectionParams,
          collection: collection,
        }
        console.log(Array.from((updateCollectionParams.paths ?? new Map<string, File>()).entries()).filter((entry) => entry[0].includes('blob')))
        // await updateCollection.mutateAsync(updateCollectionParams)
        setSubmitting(false)
      }
      else{
        await createCollection.mutateAsync(createCollectionParams)
      }
    }

    function filterFiles(term: string): undefined | void {
      if(!term) {
        setFilteredResult(undefined)
        return
      }
      const normalSearchTerm = term.trim().toLocaleLowerCase()

      const data = [...(filesUpload?.entries() ?? [])].filter((item) => {
          let filterResult = false
          try{
            filterResult = item[1].file.name.trim().toLocaleLowerCase().includes(normalSearchTerm)
          } catch(err){
            return false
          }
          return filterResult
      })
      const map = new Map<string, {file: File, order: number}>()
      data.forEach((entry) => {
        map.set(entry[0], entry[1])
      })
      setFilteredResult(map)
    }

    function clearState(){
      onClose()
      setFilesUpload(undefined)
      setFilteredResult(undefined)
      setName('')
      setCover(null)
      setSubmitting(false)
      setProgress(undefined)
      setSort(undefined)
      setLoaded(false)
    }

    return (
        <Modal 
          show={open} 
          size="2xl"
          className='font-main' 
          onClose={() => {
            clearState()
          }}
        >
          <Modal.Header>{collection ? 'Update' : 'Create'} Collection</Modal.Header>
          <Modal.Body>
            <form onSubmit={handleUploadPhotos}>
              <div className="flex flex-col">
                <div className="flex flex-row gap-4 items-center">
                  <div className="flex flex-col gap-2 mb-4 w-[60%]">
                      <Label className="ms-2 font-medium text-lg" htmlFor="name">Photo Collection Name:</Label>
                      <TextInput sizing='md' theme={textInputTheme} placeholder="Event Name" type="name" id="name" name="name" onChange={(event) => setName(event.target.value)} value={name}/>
                  </div>
                  <div className="flex flex-col gap-2 mb-4 w-[40%]">
                    <Label className="ms-2 font-medium text-lg" htmlFor="name">User Tag(s):</Label>
                    <Dropdown
                      label={availableTags.length > 0 ? 'Select' : 'None'} 
                      color='light' dismissOnClick={false} disabled={availableTags.length == 0}>
                      {availableTags.map((tag, index) => {
                        const selected = selectedTags.find((st) => st.id === tag.id)
                        return (
                          <Dropdown.Item key={index} 
                            as="button"
                            className="flex flex-row gap-2 text-left items-center"
                            onClick={() => {
                              if(selected){
                                setSelectedTags(selectedTags.filter((st) => st.id !== tag.id))
                              }
                              else {
                                setSelectedTags([...selectedTags, tag])
                              }
                            }}
                          >
                            {selected ? (
                              <HiOutlineCheckCircle className="text-green-400 mt-1 ms-2"/>
                            ) : (<p className="p-3"></p>)}
                              <span className={`${tag.color ? `text-${tag.color}` : ''}`}>{tag.name}</span>
                          </Dropdown.Item>
                          )
                        })}
                    </Dropdown>
                  </div>
                </div>
                <div className='flex flex-row gap-2 items-center justify-center mb-2'>
                    {
                      selectedTags.map((tag, index) => {
                        return (<Badge theme={badgeColorThemeMap} color={tag.color ? tag.color : 'light'} key={index} className="py-1 text-md">{tag.name}</Badge>)
                      })
                    }
                </div>
                <div className="grid grid-cols-2 justify-items-center">
                  <div className="flex flex-col items-center justify-center w-full h-full">
                    <Label className="self-start ms-[20%] font-medium text-lg" htmlFor="name">Upload:</Label>
                    <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-[75%] h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                        </svg>
                        <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span></p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Picture Files Supported</p>
                      </div>
                      <input id="dropzone-file" type="file" className="hidden" multiple onChange={(event) => {
                        if(event.target.files){
                          const files = event.target.files
                          async function createPreviews(files: File[]){
                            const map = new Map<string, {file: File, order: number}>(filesUpload)
                            let list = await Promise.all(files.map(async (file, index) => {
                              return { key: URL.createObjectURL(new Blob([await file.arrayBuffer()], { type: file.type})), value: file, order: (filesUpload?.size ?? 0) + index }
                            }))
                            list.forEach((entry) => {
                              map.set(entry.key, { file: entry.value, order: entry.order })
                            })
                            setFilesUpload(map)
                            setFilteredResult(undefined)
                          }
                          createPreviews(Array.from(files))
                        }
                      }}/>
                    </label>
                  </div>
                  <div className="flex flex-col items-center w-full h-full">
                    <Label className="self-start ms-[20%] font-medium text-lg" htmlFor="name">Cover Photo Preview:</Label>
                    {cover}
                  </div>
                </div>
                
                <div className="relative flex flex-row items-center justify-between mt-6 border-b-gray-100 border-b">
                    <div 
                      className="flex flex-row items-center gap-2" 
                      onMouseEnter={() => 
                        setSort({
                          col: 'file', 
                          direction: sort ? (sort.col !== 'file' ? undefined : sort.direction) : undefined, 
                          visible: true
                        })
                      }
                      onMouseLeave={() => {
                        if(sort && sort.direction !== undefined){
                          setSort({
                            ...sort,
                            visible: false
                          })
                        }
                        else{
                          setSort(undefined)
                        }
                      }}
                    >
                      <Label className="font-semibold text-xl" htmlFor="name">Files:</Label>
                      {sort?.col == 'file' && sort.visible && (filesUpload !== undefined || filteredResult !== undefined) &&
                      (<button 
                          onClick={() => {
                            setFilteredResult(new Map([
                              ...(filteredResult ?? filesUpload)!.entries()]
                                .sort((a, b) => {
                                  if(!(sort?.direction ?? false)){
                                    return a[1].file.name.localeCompare(b[1].file.name)
                                  }
                                  else {
                                    return b[1].file.name.localeCompare(a[1].file.name)
                                  }
                                })
                              )
                            )
                            setSort({col: 'file', direction: !(sort?.direction ?? false), visible: true})
                          }} 
                          type="button"
                        >
                          {sort.direction === undefined || sort.direction ? (
                            <GoTriangleDown className="text-lg"/>
                          ) : (
                            <GoTriangleUp className="text-lg"/>
                          )}
                      </button>)}
                    </div>
                  {filesUpload && filesUpload.size > 0 && 
                    <>
                      <div className="flex flex-row gap-4">
                        <div
                          className="flex flex-row gap-2 items-center text-lg"
                          onMouseEnter={() =>
                            setSort({
                              col: 'order', 
                              direction: sort ? (sort.col !== 'order' ? undefined : sort.direction) : undefined, 
                              visible: true
                            })
                          }
                          onMouseLeave={() => {
                            if(sort && sort.direction !== undefined){
                              setSort({
                                  ...sort,
                                  visible: false
                              })
                            }
                            else{
                              setSort(undefined)
                            }
                          }}
                        >
                          <span className="font-semibold">Order:</span>
                          {sort?.col == 'order' && sort.visible ? (
                            <button 
                              onClick={() => {
                                setFilteredResult(new Map([
                                  ...(filteredResult ?? filesUpload).entries()]
                                    .sort((a, b) => {
                                      if(!(sort?.direction ?? false)){
                                        return a[1].order - b[1].order
                                      }
                                      else {
                                        return b[1].order - a[1].order
                                      }
                                    })
                                  )
                                )
                                setSort({col: 'order', direction: !(sort?.direction ?? false), visible: true})
                              }} 
                              type="button">
                              {sort.direction === undefined || sort.direction ? (
                                <GoTriangleDown className="text-lg"/>
                              ) : (
                                <GoTriangleUp className="text-lg"/>
                              )}
                            </button>
                            ) : (
                              <div className="w-[18px]"/>
                            )
                          }
                        </div>
                        <div 
                          className="flex flex-row gap-2 items-center text-lg"
                          onMouseEnter={() =>
                            setSort({
                              col: 'size', 
                              direction: sort ? (sort.col !== 'size' ? undefined : sort.direction) : undefined, 
                              visible: true
                            })
                          }
                          onMouseLeave={() => {
                            if(sort && sort.direction !== undefined){
                              setSort({
                                  ...sort,
                                  visible: false
                              })
                            }
                            else{
                              setSort(undefined)
                            }
                          }}
                        >
                          <span className="font-semibold">Total:</span>
                          <span>
                            {formatFileSize([...filesUpload.values()]
                              .map((file) => file.file.size)
                              .reduce((prev, cur) => prev = prev + cur, 0))}
                          </span>
                          {sort?.col == 'size' && sort.visible ? (
                            <button 
                              onClick={() => {
                                setFilteredResult(new Map([
                                  ...(filteredResult ?? filesUpload).entries()]
                                    .sort((a, b) => {
                                      if(!(sort?.direction ?? false)){
                                        return a[1].file.size - b[1].file.size
                                      }
                                      else {
                                        return b[1].file.size - a[1].file.size
                                      }
                                    })
                                  )
                                )
                                setSort({col: 'size', direction: !(sort?.direction ?? false), visible: true})
                              }} 
                              type="button">
                              {sort.direction === undefined || sort.direction ? (
                                <GoTriangleDown className="text-lg"/>
                              ) : (
                                <GoTriangleUp className="text-lg"/>
                              )}
                            </button>
                            ) : (
                              <div className="w-[18px]"/>
                            )
                          }
                        </div>
                      </div>
                      <TextInput 
                        className="absolute inset-0 w-[30%] -top-4 right-48 justify-self-center" 
                        theme={textInputTheme} sizing='sm' placeholder="Filter" 
                        onChange={(event) => filterFiles(event.target.value)}
                      />
                    </>
                  }
                </div>
                {filesUpload && filesUpload.size > 0 ? (
                  <div className="h-full min-h-100">
                    <AutoSizer className="min-h-[320px] z-0">
                    {({ height, width }: { height: number; width: number }) => {
                      return (
                      <FixedSizeList
                        height={height}
                        itemCount={(filteredResult ?? filesUpload).size ?? 0}
                        itemSize={35}
                        width={width}
                        itemData={{
                          data: [...(filteredResult ?? filesUpload).entries()].map(([url, file]) => ({url: url, file: file.file, order: file.order})),
                          onDelete: (key) => {
                              const files = new Map<string, {file: File, order: number}>(filesUpload.entries())
                              const filteredFiles = filteredResult ? new Map<string, {file: File, order: number}>(filteredResult.entries()) : undefined
                              files.delete(key)
                              if(filteredFiles) filteredFiles.delete(key)
                              setFilesUpload(files)
                              setFilteredResult(filteredFiles)
                          },
                          cover,
                          setCover
                        }}
                      >
                        {Row}
                      </FixedSizeList>
                    )}}
                    </AutoSizer>
                  </div>
                ) : (
                  <span className=" italic text-sm ms-6">Upload files to preview them here!</span>
                )}
              </div>
              {progress ? (
                <div className="flex flex-col gap-1 mt-2">
                  <Label className="ms-2 text-lg">Upload Progress</Label>
                  <Progress progress={progress} />
                </div>
              ) : (<></>)}
              <div className="flex flex-row justify-end border-t gap-10 mt-4 items-center">
                <ToggleSwitch checked={downloadable} onChange={setDownloadable} label="Downloadable" className="mt-3"/>
                <Button className="text-xl w-[40%] max-w-[8rem] mt-4" type="submit" isProcessing={submitting}>{collection ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </Modal.Body>
        </Modal>
    )
}