import { ComponentProps, useCallback, useState } from "react"
import { useDropzone } from 'react-dropzone'
import { HiOutlineUpload } from "react-icons/hi";
import Loading from "../../common/Loading";
import { PhotoCollection, PhotoSet } from "../../../types";
import { useMutation } from "@tanstack/react-query";
import { uploadImagesMutation, UploadImagesMutationParams } from "../../../services/photoSetService";
import { ProgressMetric } from "../../common/ProgressMetric";
import { Progress } from "flowbite-react";
import { formatFileSize } from "../../../utils";

interface UploadComponentProps extends ComponentProps<'div'> {
    set: PhotoSet,
    collection: PhotoCollection,
}

export const UploadImagePlaceholder = (props: UploadComponentProps) => {
    const [displayProgress, setDisplayProgress] = useState(false)
    const [totalUpload, setTotalUpload] = useState<number>()
    const [uploadProgress, setUploadProgress] = useState<number>(0)

    const uploadImages = useMutation({
        mutationFn: (params: UploadImagesMutationParams) => uploadImagesMutation(params),
        onSettled: () => setDisplayProgress(false)
    })
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        setDisplayProgress(true)

        const filesMap = new Map<string, File>()
        let totalUpload = 0

        acceptedFiles.forEach((file) => {
            filesMap.set(file.name, file)
            totalUpload += file.size
        })

        console.log(totalUpload, 'totalUpload')
        setTotalUpload(totalUpload)

        uploadImages.mutate({
            set: props.set,
            collection: props.collection,
            files: filesMap,
            progressStep: (progress) => setUploadProgress(progress),
            options: {
                logging: true
            }
        })
    }, [])

    const {getRootProps, getInputProps, isDragActive} = useDropzone({noClick: true, onDrop})

    return (
        <div {...props}>
            {displayProgress && uploadProgress && totalUpload && (
                <div className="fixed min-w-64 max-w-xs p-4 rounded-lg shadow right-5 bottom-5 flex flex-row items-center justify-between">
                    <div className='flex flex-row items-center'>
                        <HiOutlineUpload className="animate-pulse" size={24}/>
                        <div className="flex flex-col justify-start min-w-[150px] mx-2">
                            <div className="flex flex-row items-center ">
                                <span className="text-sm">Uploading</span>
                                <Loading className="text-lg"/>
                            </div>
                            <Progress 
                                progress={uploadProgress * 100}
                                textLabel={`${formatFileSize(totalUpload * uploadProgress, 0)} / ${formatFileSize(totalUpload, 0)}`}
                                size="sm"
                                textLabelPosition="outside"
                            />
                        </div>
                    </div>
                    <div>
                        <ProgressMetric currentAmount={uploadProgress * totalUpload} className="text-sm"/>
                    </div>
                </div>
            )}
            <div 
                className="flex items-center justify-center w-full h-full rounded-lg " 
                {...getRootProps()} 
            >
                <label htmlFor="dropzone-set-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                        </svg>
                        <p className="mb-2 text-sm text-gray-500 text-center">
                            {!isDragActive ? (
                                <span>
                                    <span className="font-semibold">
                                        {`Click to upload`}
                                    </span> 
                                    {` or drag and drop`}
                                </span>
                            ) : (
                                <span className="font-semibold">
                                    {`Drop here!`}
                                </span>
                            )}
                        </p>
                        <p className="text-xs text-gray-500 text-center">Image Files Supported (jpg, jpeg, png)</p>
                    </div>
                    <input id="dropzone-set-file" type="file" className="hidden" {...getInputProps()} multiple />
                </label>
            </div> 
        </div>
        
    )
}