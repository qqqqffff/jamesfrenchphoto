import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { HiOutlineDownload } from "react-icons/hi"
import Loading from "./Loading"
import { Progress } from "flowbite-react"
import { HiOutlineXMark } from "react-icons/hi2"

export interface DownloadToastProps {
  downloads: DownloadData[],
  setDownloads: Dispatch<SetStateAction<DownloadData[]>>
}

export interface DownloadData {
  id: string,
  state: 'inprogress' | 'done' | 'paused' | 'idle'
  progress: number,
  totalItems: number,
  display: boolean,
}

export const DownloadToast = (props: DownloadToastProps) => {
  const [downloads, setDownloads] = useState<DownloadData[]>(props.downloads)

  useEffect(() => {
    setDownloads(props.downloads)
  }, [props.downloads])

  return (
    <div className="flex flex-col fixed gap-4 left-5 bottom-5 z-20">
      {downloads.map((download, index) => {
        const downloading = download.state
        if(downloading === 'idle') return undefined

        return (
          <div className="p-4 rounded-lg shadow flex flex-row items-center justify-between bg-white border border-gray-300" key={index}>
            <div className="flex flex-row items-center relative">
              <HiOutlineDownload className={`${downloading === 'done' ? 'text-green-400' : 'animate-pulse'}`} size={24} />
              <div className="flex flex-col justify-start min-w-[200px] mx-4">
                { downloading === 'inprogress' || downloading === 'paused' ? (
                  <>
                    <span className="text-sm">Downloading</span>
                    <Loading className="text-lg"/>
                  </>
                ) : (
                  <span className="text-sm text-green-600">Done</span>
                )}
                <div className={`flex flex-row gap-1 text-xs ${downloading === 'done' ? 'text-green-600' : ''}`}>
                {download.totalItems && (
                    <span>
                      {`${download.progress} / ${download.totalItems}`}
                    </span>
                )}
                </div>
              </div>
              {(downloading === 'inprogress' || downloading === 'paused') && (
                <Progress 
                  progress={(download.progress / download.totalItems) * 100}
                  size="sm"
                />
              )}
            </div>
            <button 
              className="absolute right-2 top-2"
              onClick={() => {
                if(downloading === 'done'){
                  props.setDownloads((prev) => {
                    return prev.filter((prev) => prev.id !== download.id)
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