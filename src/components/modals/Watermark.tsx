import { Button, ButtonGroup, Dropdown, Label, Modal, Progress, Tooltip } from "flowbite-react"
import { FC, FormEvent, useState } from "react"
import { HiOutlineXMark } from "react-icons/hi2"
import { ModalProps } from "."
import { PhotoCollection, PicturePath, Watermark } from "../../types";
import { formatFileSize } from "../../utils";
import { FixedSizeList, ListChildComponentProps } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { HiOutlineArrowLeft, HiOutlineArrowRight } from "react-icons/hi2";
import testPhoto from '../../assets/home-carousel/carousel-1.jpg'
import { useMutation } from "@tanstack/react-query";
import { uploadWatermarksMutation, WatermarkUploadParams } from "../../services/watermarkService";
import { updateCollectionMutation, UpdateCollectionParams } from "../../services/collectionService";

interface WatermarkProps extends ModalProps {
    collection: PhotoCollection;
    onCollectionSubmit: (collection: PhotoCollection) => void,
    onWatermarkUpload: (paths: Watermark[]) => void,
    paths: PicturePath[],
    watermarks: Watermark[]
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

//TODO: convert paths to covers, and implement individual set watermarking
export const WatermarkModal: FC<WatermarkProps> = ({ open, onClose, collection, paths, onCollectionSubmit, onWatermarkUpload, watermarks }) => {
    const [pictureCollection, setPictureCollection] = useState(collection)
    const [filesUpload, setFilesUpload] = useState<Map<string, File> | undefined>()
    const [progress, setProgress] = useState<number>()
    const [watermarkUrls, setWatermarkUrls] = useState<Watermark[]>(watermarks)
    const [state, setState] = useState<'upload' | 'pick'>('upload')
    const [submitting, setSubmitting] = useState(false)
    const [selectedWatermark, setSelectedWatermark] = useState<Watermark | undefined>(
        watermarks.find((watermark) => collection.watermarkPath === watermark.path)
    )

    const uploadWatermarks = useMutation({
        mutationFn: (params: WatermarkUploadParams) => uploadWatermarksMutation(params),
        onSettled: () => {
            setSubmitting(false)
        }
    })

    const updateCollection = useMutation({
        mutationFn: (params: UpdateCollectionParams) => updateCollectionMutation(params),
        onSettled: (collection) => {
            if(collection){
                setPictureCollection(collection)
                onCollectionSubmit(collection)
            }
            setSubmitting(false)
            //TODO: error handling
        }
    })

    async function handleUploadPhotos(event: FormEvent){
        event.preventDefault()
        setSubmitting(true)

        let watermarks: Watermark[] = []
        if(filesUpload) {
            uploadWatermarks.mutate({
                filesUpload,
                progressStep(number){
                    setProgress(number)
                },
            })
        }

        const changedPaths = [...watermarkUrls, ...watermarks]
        setWatermarkUrls(changedPaths)
        onWatermarkUpload(changedPaths)
        setFilesUpload(undefined)
        setProgress(undefined)
        setSubmitting(false)
    }

    function parseName(path: string){
        return path.substring(path.lastIndexOf('_') + 1)
    }

    return (
        <Modal size='xl' show={open} className='font-main' onClose={() => {
            setFilesUpload(undefined)
            setProgress(undefined)
            onClose()
        }}>
            <Modal.Header>Watermarks</Modal.Header>
            <Modal.Body className="overflow-x-hidden">
                <div className="flex flex-col items-center mb-2">
                    <ButtonGroup className="">
                        <Button color="light" onClick={() => setState('upload')} className={`${state == 'upload' ? 'border border-black' : ''}`}>Upload</Button>
                        <Button color="light" onClick={() => setState('pick')} className={`${state == 'pick' ? 'border border-black' : ''}`}>Picker</Button>
                    </ButtonGroup>
                </div>
                
                {state == 'upload' ? (
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
                                {filesUpload && filesUpload.size > 0 ? (
                                    <>
                                        <span className="font-semibold">Total:</span>
                                        <span>{formatFileSize([...filesUpload.values()].map((file) => file.size).reduce((prev, cur) => prev = prev + cur, 0))}</span>
                                    </>
                                ) : (<></>)}
                                </div>
                            </div>
                            
                            {filesUpload && filesUpload.size > 0 ? (
                                <div className="h-full min-h-100">
                                    <AutoSizer className="min-h-[290px] z-0">
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
                        
                        {progress ? (
                            <div className="flex flex-col gap-1 mt-2">
                                <Label className="ms-2 text-lg">Upload Progress</Label>
                                <Progress progress={progress} />
                            </div>
                        ) : (<></>)}
                        <div className="flex flex-row justify-end border-t mt-4 gap-3">
                            <Button className="text-xl w-[40%] max-w-[6rem] mt-4" type="submit" isProcessing={submitting}>Upload</Button>
                            <Button className="text-xl w-[40%] max-w-[6rem] mt-4" type="button" onClick={() => {
                                onClose()
                                onCollectionSubmit(pictureCollection)
                                setSelectedWatermark(undefined)
                                setProgress(undefined)
                            }}>Save</Button>
                        </div>
                    </form>
                ) : (
                    <div className="flex flex-col items-center justify-center">
                        <div className='flex flex-row gap-2 mb-2'>
                            <button onClick={() => {
                                let index = watermarkUrls.findIndex((item) => item === selectedWatermark)
                                index = index == -1  || index == 0 ? watermarkUrls.length - 1 : index - 1
                                setSelectedWatermark(watermarkUrls[index])
                            }}>
                                <HiOutlineArrowLeft size={20} />
                            </button>
                            <Dropdown 
                                color='light'
                                label={selectedWatermark ? parseName(selectedWatermark.path) : 'None'}
                            >
                                <Dropdown.Item onClick={() =>setSelectedWatermark(undefined)}>None</Dropdown.Item>
                                {watermarkUrls
                                    .sort((a, b) => parseName(a.path)
                                    .localeCompare(parseName(b.path))).map((url, index) => {
                                    return (
                                        <Dropdown.Item key={index} onClick={() => setSelectedWatermark(url)}>{parseName(url.path)}</Dropdown.Item>
                                    )
                                })}
                            </Dropdown>
                            <button onClick={() => {
                                let index = watermarkUrls.findIndex((item) => item === selectedWatermark)
                                index = index == -1  || index == watermarkUrls.length - 1 ? 0 : index + 1
                                setSelectedWatermark(watermarkUrls[index])
                            }}>
                                <HiOutlineArrowRight size={20} />

                            </button>
                        </div>
                        <div className="relative px-2 py-2 border rounded-lg pointer-events-none">
                            <img 
                                src={paths[0].url != '' ? paths[0].url : testPhoto} 
                                className="object-cover rounded-lg w-[200px] h-[300px] justify-self-center"
                                
                            />
                            {selectedWatermark && (
                                <img 
                                    src={selectedWatermark.url}
                                    className="absolute inset-0 max-w-[200px] max-h-[300px] top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 object-cover opacity-75"
                                />
                            )}
                        </div>
                        <div className="flex flex-row w-full justify-end border-t mt-4 gap-2">
                            <Button className="text-xl mt-4" isProcessing={submitting}
                                disabled={collection.watermarkPath === selectedWatermark?.path}
                                onClick={async () => {
                                    setSubmitting(true)

                                    updateCollection.mutate({
                                        watermark: selectedWatermark ?? null,
                                        published: collection.published,
                                        collection: collection,
                                    })                                    
                                }}
                            >Select</Button>
                            <Button className="text-xl mt-4" type="button" onClick={() => {
                                onClose()
                                onCollectionSubmit(pictureCollection)
                                setSelectedWatermark(undefined)
                                setProgress(undefined)
                            }}>Save</Button>
                        </div>
                    </div>
                )}
                
            </Modal.Body>
        </Modal>
    )
}