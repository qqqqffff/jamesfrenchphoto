import { Dispatch, FC, SetStateAction } from "react"
import { ListChildComponentProps } from "react-window"
import { UploadIssue } from "./IssueNotifications"
import { Tooltip } from "flowbite-react"
import { HiOutlineExclamationTriangle, HiOutlineTrash, HiOutlineXMark } from "react-icons/hi2"
import { invariant } from "@tanstack/react-router"
import { HiOutlineRefresh } from "react-icons/hi"
import { formatFileSize } from "../../../utils"

interface ImagesRowProps extends ListChildComponentProps {
  data: {
    data: { url: string, file: File}[],
    onDelete: (key: string, fileName: string) => void
    issues: UploadIssue[],
    updateIssues: Dispatch<SetStateAction<UploadIssue[]>>
  }
}

export const ImagesRow: FC<ImagesRowProps> = ({ index, data, style }) => {
  const smallUpload = data.issues
    .find((issue) => issue.type === 'small-file')?.id
    .includes(data.data[index].file.name)
  const duplicate = data.issues
    .find((issue) => issue.type === 'duplicate')?.id
    .includes(data.data[index].file.name)
  return (
    <div key={index} className="flex flex-row items-center justify-between border-b w-full gap-2" style={style}>
      <div className="flex flex-row w-[80%] overflow-hidden mt-1 items-center gap-2">
        {smallUpload && (
          <Tooltip
            style="light"
            placement="bottom-start"
            arrow={false}
            content={(
              <span className="whitespace-nowrap">Small File</span>
            )}
          >
            <HiOutlineExclamationTriangle size={16} className="text-yellow-300"/>
          </Tooltip>
        )}
        { duplicate && (
          <>
            <Tooltip
              style="light"
              placement="bottom-start"
              arrow={false}
              content={(
                <span>Replace</span>
              )}
            >
              <button
                onClick={() => {
                  let tempIssues: UploadIssue[] = [
                    ...data.issues
                  ]
                  
                  const tempIndex = tempIssues.findIndex((isuse) => isuse.type === 'duplicate')
                  invariant(tempIndex !== -1)
                  tempIssues[tempIndex].id = tempIssues[tempIndex].id.filter((id) => id !== data.data[index].file.name)
                  if(tempIssues[tempIndex].id.length === 0){
                    tempIssues = tempIssues.filter((issue) => issue.type !== 'duplicate')
                  }
  
                  data.updateIssues(tempIssues)
                }}
              >
                <HiOutlineRefresh size={16} className="text-red-500" />  
              </button>
            </Tooltip>
            <Tooltip
              style="light"
              placement="bottom-start"
              arrow={false}
              content={(
                <span>Delete</span>
              )}
            >
              <button onClick={() => {
                let tempIssues: UploadIssue[] = [
                  ...data.issues
                ]
                
                const tempIndex = tempIssues.findIndex((isuse) => isuse.type === 'duplicate')
                invariant(tempIndex !== -1)
                tempIssues[tempIndex].id = tempIssues[tempIndex].id.filter((id) => id !== data.data[index].file.name)
                if(tempIssues[tempIndex].id.length === 0){
                  tempIssues = tempIssues.filter((issue) => issue.type !== 'duplicate')
                }

                data.updateIssues(tempIssues)
                data.onDelete(data.data[index].url, data.data[index].file.name)
              }}>
                <HiOutlineTrash size={16} className="text-red-500" />  
              </button>
            </Tooltip>
          </>
        )}
        <Tooltip 
          style="light"
          placement='bottom-start'
          arrow={false}
          content={(
            <img src={data.data[index].url} loading='lazy' className="h-[240px] object-cover rounded-lg"/>
          )}
        >
          <span 
            className={`
              inline-block truncate 
              ${duplicate ? 'text-red-500' : smallUpload ? 'text-yellow-300' : ''}
            `}
          >
            {data.data[index].file.name}
          </span>
        </Tooltip>
      </div>
      <div className="justify-end items-center flex flex-row gap-2 -ml-[10%]">
        <span className="text-nowrap">{formatFileSize(data.data[index].file.size, 0)}</span>
        <button 
          className={`${duplicate ? 'text-transparent cursor-default' : 'hover:text-gray-500'} py-0.5 px-1.5 mt-0.5`}
          type='button' 
          disabled={duplicate}
          onClick={() => data.onDelete(data.data[index].url, data.data[index].file.name)}
        >
          <HiOutlineXMark size={16}/>
        </button>
      </div>
    </div>
  )
}