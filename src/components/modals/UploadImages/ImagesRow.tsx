import { Dispatch, FC, SetStateAction } from "react"
import { ListChildComponentProps } from "react-window"
import { UploadIssue } from "./IssueNotifications"
import { Tooltip } from "flowbite-react"
import { HiOutlineExclamationTriangle, HiOutlineTrash, HiOutlineXMark } from "react-icons/hi2"
import { invariant } from "@tanstack/react-router"
import { HiOutlineRefresh } from "react-icons/hi"
import { formatFileSize } from "../../../utils"
import { UseQueryResult } from "@tanstack/react-query"
import { LazyImage } from "../../common/LazyImage"
import Loading from '../../common/Loading'

interface ImagesRowProps extends ListChildComponentProps {
  data: {
    data: [string, File][],
    previews?: Record<string, string>, //record of filename, url
    loadingPreviews: boolean
    onDelete: (fileName: string) => void
    issues: UploadIssue[],
    updateIssues: Dispatch<SetStateAction<UploadIssue[]>>,
    watermarkQuery: UseQueryResult<[string | undefined, string], Error>
  }
}

export const ImagesRow: FC<ImagesRowProps> = ({ index, data, style }) => {
  const smallUpload = data.issues
    .find((issue) => issue.type === 'small-file')?.id
    .includes(data.data[index][0])
  const duplicate = data.issues
    .find((issue) => issue.type === 'duplicate')?.id
    .includes(data.data[index][0])

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
                  tempIssues[tempIndex].id = tempIssues[tempIndex].id.filter((id) => id !== data.data[index][0])
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
                tempIssues[tempIndex].id = tempIssues[tempIndex].id.filter((id) => id !== data.data[index][0])
                if(tempIssues[tempIndex].id.length === 0){
                  tempIssues = tempIssues.filter((issue) => issue.type !== 'duplicate')
                }

                data.updateIssues(tempIssues)
                data.onDelete(data.data[index][0])
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
            !data.loadingPreviews && data.previews?.[data.data[index][0]] !== undefined ? ( 
              <LazyImage 
                overrideSrc={data.previews[data.data[index][0]]}
                watermarkPath={data.watermarkQuery}
                className="max-w-[300px]"
              />
            ) : (
              <div className="flex flex-row gap-1">
                <span className="italic text-sm ms-6">Loading Previews</span>
                <Loading />
              </div>
            )
          )}
        >
          <span 
            className={`
              inline-block truncate max-w-[200px]
              ${duplicate ? 'text-red-500' : smallUpload ? 'text-yellow-300' : ''}
            `}
          >
            {data.data[index][0]}
          </span>
        </Tooltip>
      </div>
      <div className="justify-end items-center flex flex-row gap-2 -ml-[10%]">
        <span className="text-nowrap">{formatFileSize(data.data[index][1].size, 0)}</span>
        <button 
          className={`${duplicate ? 'text-transparent cursor-default' : 'hover:text-gray-500'} py-0.5 px-1.5 mt-0.5`}
          type='button' 
          disabled={duplicate}
          onClick={() => data.onDelete(data.data[index][0])}
        >
          <HiOutlineXMark size={16}/>
        </button>
      </div>
    </div>
  )
}