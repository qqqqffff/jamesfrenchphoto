import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { HiOutlineUpload } from "react-icons/hi";
import { ProgressMetric } from "../../common/ProgressMetric";
import { HiOutlineXMark } from "react-icons/hi2"
import Loading from "../../common/Loading";
import { formatFileSize } from "../../../utils";
import { Progress } from "flowbite-react";

export interface UploadToastProps {
  uploads: UploadData[],
  setUploads: Dispatch<SetStateAction<UploadData[]>>
}

export interface UploadData {
  id: string,
  state: 'inprogress' | 'done' | 'paused' | 'idle'
  progress: number
  currentItems: number,
  totalItems: number,
  totalSize: number,
  display: boolean,
}

export const UploadToast = (props: UploadToastProps) => {
  const [uploads, setUploads] = useState<UploadData[]>(props.uploads)

  useEffect(() => {
    setUploads(props.uploads)
  }, [props.uploads])

  return (
    <div className="flex flex-col fixed gap-4 right-5 bottom-5 z-20">
      {uploads.map((upload, index) => {
        const uploading = upload.state
        if(upload.state === 'idle') return undefined
        
        return (
          <div className=" p-4 rounded-lg shadow  flex flex-row items-center justify-between bg-white border border-gray-300" key={index}>
            <div className='flex flex-row items-center relative'>
              <HiOutlineUpload className={`${uploading === 'done' ? 'text-green-400' : 'animate-pulse'}`} size={24}/>
              <div className="flex flex-col justify-start min-w-[200px] ms-4 me-4">
                <div className="flex flex-row items-center justify-between">
                  { uploading === 'inprogress' || uploading === 'paused' ? (
                    <div className="flex flex-row gap-0">
                      <span className="text-sm">Uploading</span>
                      <Loading className="text-lg"/>
                    </div>
                  ) : (
                    <span className="text-sm text-green-600">Done</span>
                  )}
                  <div className={`flex flex-row gap-1 text-xs ${uploading === 'done' ? 'text-green-600' : ''}`}>
                    <span>
                      {`${formatFileSize(upload.totalSize * upload.progress, 0)} / ${formatFileSize(upload.totalSize, 0)}`}
                    </span>
                    {upload.totalItems && (
                      <>
                        <span>&bull;</span>
                        <span>
                          {`${upload.currentItems} / ${upload.totalItems}`}
                        </span>
                      </>
                    )}
                    { uploading === 'inprogress' && (
                      <>
                        <span>&bull;</span>
                        <ProgressMetric currentAmount={upload.progress * upload.totalSize}/>
                      </>
                    )}
                  </div>
                </div>
                {(uploading === 'inprogress' || uploading === 'paused') && (
                  <Progress 
                    progress={upload.progress * 100}
                    size="sm"
                  />
                )}
              </div>
            </div>
            <button 
              className="absolute right-2 top-2"
              onClick={() => {
                if(upload.state === 'done'){
                  props.setUploads((prev) => {
                    return prev.filter((prev) => prev.id !== upload.id)
                  })
                }
              }}
            >
              <HiOutlineXMark size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}