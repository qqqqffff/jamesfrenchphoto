import { Button, Label, Modal, Tooltip } from "flowbite-react"
import { FC, FormEvent, useState } from "react"
import { HiOutlineXMark } from "react-icons/hi2"
import { ModalProps } from "."
import { PhotoCollection, PhotoSet } from "../../types";
import { formatFileSize } from "../../utils";
import { FixedSizeList, ListChildComponentProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { useMutation } from "@tanstack/react-query";
import { uploadImagesMutation, UploadImagesMutationParams } from "../../services/photoSetService";


interface UploadImagesProps extends ModalProps {
    collection: PhotoCollection,
    set: PhotoSet;
    onSubmit: () => void,
    progressStep: (progress: number) => void
}

interface RowProps extends ListChildComponentProps {
    data: {
        data: { url: string, file: File}[],
        onDelete: (key: string) => void
    }
}

const Row: FC<RowProps> = ({ index, data, style }) => {

    return (
        <div key={index} className="flex flex-row justify-between" style={style}>
            <Tooltip className='relative z-10' content={<img src={data.data[index].url} loading='lazy' className="w-[200px] h-[300px] object-cover"/>}>
                <span>{data.data[index].file.name}</span>
            </Tooltip>
            <div className="flex flex-row gap-2">
                <span>{formatFileSize(data.data[index].file.size)}</span>
                <button className="hover:border-gray-500 border border-transparent rounded-full p-0.5" type='button' onClick={() => data.onDelete(data.data[index].url)}>
                    <HiOutlineXMark size={20}/>
                </button>
            </div>
        </div>
    )
}

export const UploadImagesModal: FC<UploadImagesProps> = ({ open, onClose, collection, set, onSubmit, progressStep }) => {
    const [filesUpload, setFilesUpload] = useState<Map<string, File> | undefined>()

    const uploadImages = useMutation({
        mutationFn: (params: UploadImagesMutationParams) => uploadImagesMutation(params),
        onSettled: () => onSubmit()
    })

    async function handleUploadPhotos(event: FormEvent){
        event.preventDefault()

        //TODO: preform form validation
        if(filesUpload) {
            uploadImages.mutate({
                collection: collection,
                set: set,
                files: filesUpload,
                progressStep: progressStep,
                options: {
                    logging: true
                }
            })
            onClose()
        }
    }

    return (
        <Modal size='xl' show={open} className='font-main' onClose={() => {
            setFilesUpload(undefined)
            onClose()
        }}>
            <Modal.Header>Upload Picture(s)</Modal.Header>
            <Modal.Body className="overflow-x-hidden">
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
                                <input id="dropzone-file" type="file" className="hidden" multiple onChange={async (event) => {
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
                                        await createPreviews(Array.from(files))
                                    }
                                }}/>
                            </label>
                        </div>
                        
                        <div className="flex flex-row items-center justify-between">
                            <Label className="ms-2 font-semibold text-xl" htmlFor="name">Files:</Label>
                            <div className="flex flex-row gap-2 items-center text-xl">
                                {filesUpload && filesUpload.size > 0 && (
                                    <>
                                        <span className="font-semibold">Total:</span>
                                        <span>{formatFileSize([...filesUpload.values()].map((file) => file.size).reduce((prev, cur) => prev = prev + cur, 0))}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        
                        {filesUpload && filesUpload.size > 0 ? (
                            <div className="h-full min-h-100">
                                <AutoSizer className="min-h-[340px] z-0">
                                {({ height, width }: { height: number; width: number }) => (
                                    <FixedSizeList
                                        height={height}
                                        itemCount={filesUpload?.size ?? 0}
                                        itemSize={35}
                                        width={width}
                                        itemData={{
                                            data: [...filesUpload.entries()].map(([url, file]) => ({url: url, file: file})),
                                            onDelete: (key) => {
                                                const files = new Map<string, File>(filesUpload.entries())
                                                files.delete(key)
                                                console.log(files)
                                                setFilesUpload(files)
                                            }
                                        }}
                                    >
                                        {Row}
                                    </FixedSizeList>
                                )}
                                </AutoSizer>
                            </div>
                        ) : (
                            <span className=" italic text-sm ms-6">Upload files to preview them here!</span>
                        )
                        
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