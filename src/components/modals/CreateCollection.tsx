import { Badge, Button, Dropdown, Label, Modal, Progress, TextInput, Tooltip } from "flowbite-react"
import { FC, FormEvent, useEffect, useState } from "react"
import { HiOutlineXMark, HiOutlineStar, HiOutlineCheckCircle } from "react-icons/hi2"
import { ModalProps } from "."
import { downloadData, uploadData } from "aws-amplify/storage";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import { PhotoCollection, PicturePath, UserTag } from "../../types";
import { v4 } from 'uuid'
import { badgeColorThemeMap, formatFileSize, textInputTheme } from "../../utils";
import { FixedSizeList, ListChildComponentProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { GoTriangleDown, GoTriangleUp } from 'react-icons/go'

const client = generateClient<Schema>()

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
    file: File
}

const Row: FC<RowProps> = ({ index, data, style }) => {
    const starClass = `${data.cover == data.data[index].file.name ? 'fill-yellow-300' : ''}`
    return (
        <div key={index} className="flex flex-row justify-between" style={style}>
            <Tooltip className='relative' content={<img src={data.data[index].url} loading='lazy' className="w-[200px] h-[300px] object-cover z-50"/>}>
                <span>{data.data[index].file.name}</span>
            </Tooltip>
            <div className="flex flex-row items-center gap-2">
                <span>{formatFileSize(data.data[index].file.size)}</span>
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

function parseName(path: string): string {
    return path.substring(path.indexOf('_') + 1)
}

export const CreateCollectionModal: FC<CreateCollectionProps> = ({ open, onClose, eventId, onSubmit, availableTags, collection }) => {
    const [filesUpload, setFilesUpload] = useState<Map<string, File> | undefined>()
    const [name, setName] = useState(collection?.name ?? '')
    const [cover, setCover] = useState<string | null>(collection && collection.coverPath ? parseName(collection.coverPath) : null)
    const [submitting, setSubmitting] = useState(false)
    const [progress, setProgress] = useState<number | undefined>()
    const [selectedTags, setSelectedTags] = useState<UserTag[]>(collection ? collection.tags : [])
    const [apiCall, setApiCall] = useState(false)
    const [filteredResult, setFilteredResult] = useState<Map<string, File> | undefined>()
    const [sort, setSort] = useState<{col: 'file' | 'size' | undefined, direction: boolean, visible: boolean}>()

    useEffect(() => {
        async function api(){
            console.log('api')
            if(collection){
                const map = new Map<string, File>()
                const mappedFiles: Record<string, File> = Object.fromEntries((await Promise.all(collection.paths.map(async (path) => {
                    const file = await (await downloadData({
                        path: path.path
                    }).result).body.blob()
                    return [
                        path.url,
                        new File([file], parseName(path.path), { type: file.type })
                    ]
                }))).sort((a, b) => (a[1] as File).name.localeCompare((b[1] as File).name)))
                Object.entries(mappedFiles).forEach((entry) => {
                    map.set(entry[0], entry[1])
                })

                setFilesUpload(map)
            }
        }
        if(!apiCall && open){
            api()
            setApiCall(true)
        }
    }, [apiCall, open])

    async function handleUploadPhotos(event: FormEvent){
        event.preventDefault()
        setSubmitting(true)

        let returnedCollection: PhotoCollection | undefined
        if(collection) {
            let coverPath: string | undefined
            let paths: PicturePath[] = []
            //TODO:
            //find added
            //find removed
            //update name and cover
            //update order

            returnedCollection = {
                ...collection,
                name: name,
                coverPath: coverPath,
                paths: paths //updatedPaths
            }
        }
        else{
            const collectionResponse = await client.models.PhotoCollection.create({
                eventId: eventId,
                name: name,
            })
            console.log(collectionResponse)
    
            if(collectionResponse.data !== null){
                //collection tag mapping
                const collectionTagResponse = await Promise.all(selectedTags.map(async (tag) => {
                    const taggingResponse = await client.models.CollectionTag.create({
                        collectionId: collectionResponse.data!.id,
                        tagId: tag.id
                    })
                    return taggingResponse
                }))
    
                console.log(collectionTagResponse)
    
                let paths: PicturePath[] = []
                let coverPath: string | undefined
                if(filesUpload) {
                    paths = (await Promise.all((await Promise.all(
                        [...filesUpload.values()].map(async (file, index, arr) => {
                            const result = await uploadData({
                                path: `photo-collections/${eventId}/${collectionResponse.data!.id}/${v4()}_${file.name}`,
                                data: file,
                            }).result
                            console.log(result)
    
                            setProgress((index + 1 / arr.length) * 100)
                            //updating cover
                            if(cover !== null && file.name === cover){
                                const collectionUpdate = await client.models.PhotoCollection.update({
                                    id: collectionResponse.data!.id,
                                    coverPath: result.path
                                })
                                coverPath = result.path
                                console.log(collectionUpdate)
                            }
                            return result.path
                        })
                    )).map(async (path, index) => {
                        const response = await client.models.PhotoPaths.create({
                            path: path,
                            order: index,
                            collectionId: collectionResponse.data!.id
                        })
                        if(!response || !response.data) return
                        const returnPath: PicturePath = {
                            ...response.data,
                            url: ''
                        }
                        return returnPath
                    }))).filter((item) => item !== undefined)
                }
                returnedCollection = {
                    ...collectionResponse.data,
                    paths: paths,
                    coverPath: coverPath,
                    tags: selectedTags,
                    downloadable: false, //TODO: implement me
                    watermarkPath: undefined, //TODO: implement me
                }
            }
        }
        //TODO: preform form validation
        
        onSubmit(returnedCollection!)
        setSubmitting(false)
        setProgress(undefined)
        setFilesUpload(undefined)
        setName('')
        setCover(null)
        onClose()
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
                filterResult = item[1].name.trim().toLocaleLowerCase().includes(normalSearchTerm)
            } catch(err){
                return false
            }
            return filterResult
        })
        const map = new Map<string, File>()
        data.forEach((entry) => {
            map.set(entry[0], entry[1])
        })
        setFilteredResult(map)
    }

    return (
        <Modal show={open} className='font-main' onClose={() => {
            setFilesUpload(undefined)
            setApiCall(false)
            setFilteredResult(undefined)
            onClose()
        }}>
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
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-[50%] h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
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
                                            const map = new Map<string, File>(filesUpload)
                                            let list = await Promise.all(files.map(async (file) => {
                                                return { key: URL.createObjectURL(new Blob([await file.arrayBuffer()], { type: file.type})), value: file }
                                            }))
                                            list.forEach((entry) => {
                                                map.set(entry.key, entry.value)
                                            })
                                            setFilesUpload(map)
                                        }
                                        createPreviews(Array.from(files))
                                    }
                                }}/>
                            </label>
                        </div>
                        <div className="relative flex flex-row items-center justify-between mt-2">
                            <div className="flex flex-row items-center gap-2" 
                                onMouseEnter={() => setSort({
                                    col: 'file', 
                                    direction: sort?.direction ?? true, 
                                    visible: true
                                })}
                                onMouseLeave={() => setSort(undefined)}
                            >
                                <Label className="ms-2 font-semibold text-xl" htmlFor="name">Files:</Label>
                                {sort?.col == 'file' && sort.visible && 
                                (<button onClick={() => console.log('you clicked me')} type="button">
                                    {sort.direction ? (<GoTriangleDown className="text-lg"/>) : (<GoTriangleUp className="text-lg"/>)}
                                </button>)}
                            </div>
                            {filesUpload && filesUpload.size > 0 && 
                                <>
                                    <div className="flex flex-row gap-2 items-center text-xl">
                                        <span className="font-semibold">Total:</span>
                                        <span>{formatFileSize([...filesUpload.values()].map((file) => file.size).reduce((prev, cur) => prev = prev + cur, 0))}</span>
                                    </div>
                                    <TextInput 
                                        className="absolute inset-0 w-[40%] justify-self-center" 
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
                                            data: [...(filteredResult ?? filesUpload).entries()].map(([url, file]) => ({url: url, file: file})),
                                            onDelete: (key) => {
                                                const files = new Map<string, File>(filesUpload.entries())
                                                const filteredFiles = filteredResult ? new Map<string, File>(filteredResult.entries()) : undefined
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
                        )
                        
                        }
                    </div>
                    {progress ? (
                        <div className="flex flex-col gap-1 mt-2">
                            <Label className="ms-2 text-lg">Upload Progress</Label>
                            <Progress progress={progress} />
                        </div>
                    ) : (<></>)}
                    <div className="flex flex-row justify-end border-t mt-4">
                        <Button className="text-xl w-[40%] max-w-[8rem] mt-4" type="submit" isProcessing={submitting}>{collection ? 'Update' : 'Create'}</Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    )
}