import { Button, Label, Modal, Tooltip } from "flowbite-react"
import { FC, FormEvent, useState } from "react"
import { HiOutlineXMark } from "react-icons/hi2"
import { ModalProps } from "."
import { uploadData } from "aws-amplify/storage";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";

const client = generateClient<Schema>()

interface UploadImagesProps extends ModalProps {
    collectionId: string;
    eventId: string;
    offset: number;
    subcategoryId: string;
}

export const UploadImagesModal: FC<UploadImagesProps> = ({ open, onClose, collectionId, subcategoryId, eventId, offset }) => {
    const [filesUpload, setFilesUpload] = useState<Map<string, File> | undefined>()

    async function handleUploadPhotos(event: FormEvent){
        event.preventDefault()

        //TODO: preform form validation
        //TODO: progress bar
        let paths = []
        if(filesUpload) {
            paths = await Promise.all(
                [...filesUpload.values()].map(async (file) => {
                    const result = await uploadData({
                        path: `photo-collections/${eventId}_${subcategoryId}_${file.name}`,
                        data: file,
                    }).result
                    await new Promise(resolve => setTimeout(resolve, 500))
                    console.log(result)
                    return result.path
                })
            )
            paths.forEach(async (path, index) => {
                const response = await client.models.PhotoPaths.create({
                    path: path,
                    order: index + offset,
                    collectionId: collectionId
                })
                console.log(response)
            })
        }
        
        setFilesUpload(undefined)
        onClose()
    }


    return (
        <Modal show={open} className='font-main' onClose={() => {
            setFilesUpload(undefined)
            onClose()
        }}>
            <Modal.Header>Upload Picture(s)</Modal.Header>
            <Modal.Body>
                <form onSubmit={handleUploadPhotos}>
                    <div className="flex flex-col">
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
                                            console.log(map)
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
                                    <div className="flex flex-row ms-6 justify-between me-16">
                                        <span className="underline font-semibold">File Name:</span>
                                        <span className="underline font-semibold">Size:</span>
                                    </div>
                                    {[...filesUpload.entries()].map(([url, file], index) => {
                                        return (
                                                <div key={index} className="flex flex-row ms-6 justify-between me-6">
                                                    <Tooltip content={<img src={url} className="w-[200px] h-[300px] object-cover"/>}>
                                                        <span>{file.name}</span>
                                                    </Tooltip>
                                                    <div className="flex flex-row gap-2">
                                                        <span>{(file.size * 0.000001).toFixed(4)} MB</span>
                                                        <button className="hover:border-gray-500 border border-transparent rounded-full p-0.5" type='button' onClick={() => {
                                                            const files = new Map<string, File>(filesUpload.entries())
                                                            files.delete(url)
                                                            console.log(files)
                                                            setFilesUpload(files)
                                                        }}><HiOutlineXMark size={20}/></button>
                                                    </div>
                                                </div>
                                        )
                                    })}
                                </div>
                                
                            </>) 
                            : 
                            (<>
                                <span className=" italic text-sm ms-6">Upload files to preview them here!</span>
                            </>)
                        }
                    </div>
                    <div className="flex flex-row justify-end border-t mt-4">
                        <Button className="text-xl w-[40%] max-w-[8rem] mt-4" type="submit" >Upload</Button>
                    </div>
                </form>
            </Modal.Body>
        </Modal>
    )
}