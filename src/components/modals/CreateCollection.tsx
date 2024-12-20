import { Badge, Button, Dropdown, Label, Modal, Progress, TextInput, Tooltip } from "flowbite-react"
import { FC, FormEvent, useState } from "react"
import { HiOutlineXMark, HiOutlineStar, HiOutlineCheckCircle } from "react-icons/hi2"
import { ModalProps } from "."
import { uploadData } from "aws-amplify/storage";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import { PhotoCollection, PicturePath, UserTag } from "../../types";
import { v4 } from 'uuid'
import { badgeColorThemeMap, formatFileSize, textInputTheme } from "../../utils";

const client = generateClient<Schema>()

interface UploadImagesProps extends ModalProps {
    eventId: string;
    onSubmit: (collection: PhotoCollection) => void;
    availableTags: UserTag[]
}

export const CreateCollectionModal: FC<UploadImagesProps> = ({ open, onClose, eventId, onSubmit, availableTags }) => {
    const [filesUpload, setFilesUpload] = useState<Map<string, File> | undefined>()
    const [name, setName] = useState('')
    const [cover, setCover] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [progress, setProgress] = useState<number | undefined>()
    const [selectedTags, setSelectedTags] = useState<UserTag[]>([])

    async function handleUploadPhotos(event: FormEvent){
        event.preventDefault()
        setSubmitting(true)

        //TODO: preform form validation
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
                        if(cover && file.name === cover){
                            const collectionUpdate = await client.models.PhotoCollection.update({
                                id: collectionResponse.data!.id,
                                coverPath: result.path
                            })
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
            
            onSubmit({
                ...collectionResponse.data,
                paths: paths,
                coverPath: undefined,
                tags: selectedTags,
                downloadable: false, //TODO: implement me
                watermarkPath: undefined, //TODO: implement me
            })
            setSubmitting(false)
            setProgress(undefined)
            setFilesUpload(undefined)
            setName('')
            setCover('')
            onClose()
        }
    }

    const displayTags = selectedTags
        .map((tag, index, arr) => {
            return (
                <p className={`${tag.color ? `text-${tag.color}` : ''} me-1`} key={index} >{tag.name + (arr.length - 1 != index ? ',' : '')}</p>
            )
        })
        .filter((item) => item !== undefined)

    return (
        <Modal show={open} className='font-main' onClose={() => {
            setFilesUpload(undefined)
            onClose()
        }}>
            <Modal.Header>Create Collection</Modal.Header>
            <Modal.Body>
                <form onSubmit={handleUploadPhotos}>
                    <div className="flex flex-col">
                        <div className="flex flex-row gap-4 items-center">
                            <div className="flex flex-col gap-2 mb-4 w-[60%]">
                                <Label className="ms-2 font-medium text-lg" htmlFor="name">Photo Collection Name:</Label>
                                <TextInput sizing='md' theme={textInputTheme} placeholder="Event Name" type="name" id="name" name="name" onChange={(event) => setName(event.target.value)} value={name}/>
                            </div>
                            <div className="flex flex-col gap-2 mb-4 w-[40%]">
                                <Label className="ms-2 font-medium text-lg" htmlFor="name">Package Tag:</Label>
                                <Dropdown
                                    label={availableTags.length > 0 ? (
                                        displayTags.length > 0 ? displayTags : 'Select'
                                    ) : 'None'} 
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
                        <div className='flex flex-row gap-2 items-center justify-center mb-4'>
                            {
                                selectedTags.map((tag, index) => {
                                    return (<Badge theme={badgeColorThemeMap} color={tag.color ? tag.color : 'light'} key={index} className="py-1 text-md">{tag.name}</Badge>)
                                })
                            }
                        </div>
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
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
                        <Label className="ms-2 font-semibold text-xl mt-3" htmlFor="name">Files:</Label>
                        {filesUpload && filesUpload.size > 0? 
                            (<>
                                <div className="flex flex-col gap-1">
                                    <div className="flex flex-row ms-6 justify-between me-24">
                                        <span className="underline font-semibold">File Name:</span>
                                        <span className="underline font-semibold">Size:</span>
                                    </div>
                                    {[...filesUpload.entries()].map(([url, file], index) => {
                                        const starClass = `${cover == file.name ? 'fill-yellow-300' : ''}`
                                        return (
                                                <div key={index} className="flex flex-row ms-6 justify-between me-6">
                                                    <Tooltip content={<img src={url} className="w-[200px] h-[300px] object-cover"/>}>
                                                        <span>{file.name}</span>
                                                    </Tooltip>
                                                    <div className="flex flex-row gap-2">
                                                        <span>{formatFileSize(file.size)}</span>
                                                        <button 
                                                            type='button'
                                                            onClick={() => {
                                                                if(cover === file.name){
                                                                    setCover('')
                                                                }
                                                                else {
                                                                    setCover(file.name)
                                                                }
                                                            }}
                                                        >
                                                            <HiOutlineStar className={starClass} size={20} />
                                                        </button>
                                                        <button className="hover:border-gray-500 border border-transparent rounded-full p-0.5" type='button' onClick={() => {
                                                            const files = new Map<string, File>(filesUpload.entries())
                                                            files.delete(url)

                                                            const c = file.name == cover ? '' : cover

                                                            setFilesUpload(files)
                                                            setCover(c)
                                                        }}>
                                                            <HiOutlineXMark size={20}/>
                                                        </button>
                                                    </div>
                                                </div>
                                        )
                                    })}
                                    <div className="flex flex-row items-center justify-end gap-2 me-10">
                                        <span className="underline font-semibold">Total:</span>
                                        <span>{formatFileSize([...filesUpload.values()].map((file) => file.size).reduce((prev, cur) => prev = prev + cur, 0))}</span>
                                    </div>
                                </div>
                                
                            </>) 
                            : 
                            (<>
                                <span className="italic text-sm ms-6">Upload files to preview them here!</span>
                            </>)
                        }
                    </div>
                    {progress ? (
                        <div className="flex flex-col gap-1 mt-2">
                            <Label className="ms-2 text-lg">Upload Progress</Label>
                            <Progress progress={progress} />
                        </div>
                    ) : (<></>)}
                    <div className="flex flex-row justify-end border-t mt-4">
                        <Button className="text-xl w-[40%] max-w-[8rem] mt-4" type="submit" isProcessing={submitting}>Upload</Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    )
}