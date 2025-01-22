import { FC, useCallback, useState } from "react"
import { useDropzone } from 'react-dropzone'
import { HiOutlineUpload } from "react-icons/hi";
import Loading from "../../common/Loading";
import { PhotoSet } from "../../../types";
import { useMutation } from "@tanstack/react-query";
import { uploadImagesMutation, UploadImagesMutationParams } from "../../../services/photoSetService";

interface UploadComponentProps{
    setId: string
}

const component: FC<UploadComponentProps> = ({ setId }) => {
    const [displayProgress, setDisplayProgress] = useState(true)

    const uploadMutation = useMutation({
        mutationFn: (params: UploadImagesMutationParams) => uploadImagesMutation(params)
    })
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        setDisplayProgress(true)
        console.log(acceptedFiles)
        
        setDisplayProgress(false)
    }, [])

    const {getRootProps, getInputProps, isDragActive} = useDropzone({noClick: true, onDrop})

    return (
        <>
            {displayProgress && (
                <div className="fixed min-w-64 max-w-xs p-4 rtl:divide-x-reverse rounded-lg shadow right-5 bottom-5 flex flex-row items-center justify-between">
                    <div className='flex flex-row items-center'>
                        <HiOutlineUpload className="animate-pulse" size={24}/>
                        <span className="text-sm ml-2">Uploading</span>
                        <Loading className="text-lg"/>
                    </div>
                    <div>
                        
                    </div>
                </div>
            )}
            <div 
                className="flex items-center justify-center w-[200px] h-[300px] rounded-lg " 
                {...getRootProps()} 
            >
                <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
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
                    <input id="dropzone-file" type="file" className="hidden" {...getInputProps()} multiple />
                </label>
            </div> 
        </>
        
    )
}

export default component