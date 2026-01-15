import { Dispatch, FC, SetStateAction } from "react"
import { ListChildComponentProps } from "react-window"
import { UploadIssue, UploadIssueType } from "./IssueNotifications"
import { Tooltip } from "flowbite-react"
import { HiOutlineExclamationTriangle, HiOutlineTrash, HiOutlineXMark } from "react-icons/hi2"
import { HiOutlineRefresh } from "react-icons/hi"
import { formatFileSize } from "../../../utils"
import { UseQueryResult } from "@tanstack/react-query"
import { LazyImage } from "../../common/LazyImage"
import Loading from '../../common/Loading'

interface ImagesRowProps extends ListChildComponentProps {
  data: {
    data: [string, File][],
    previews?: Record<string, string>, //record of filename, url
    onDelete: (fileName: string) => void
    issues: Map<UploadIssueType, UploadIssue[]>,
    updateIssues: Dispatch<SetStateAction<Map<UploadIssueType, UploadIssue[]>>>,
    watermarkPath?: string
    watermarkQuery: UseQueryResult<[string | undefined, string], Error>
  }
}

export const ImagesRow: FC<ImagesRowProps> = ({ index, data, style }) => {
  const smallUpload = (data.issues.get(UploadIssueType['small-file']) ?? [])
    .find((issue) => issue.id === data.data[index][0])
  const duplicate = (data.issues.get(UploadIssueType['duplicate']) ?? [])
    .find((issue) => issue.id === data.data[index][0])

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
                  data.updateIssues(prev => {
                    const temp = new Map(prev)
                    temp.set(
                      UploadIssueType['duplicate'], 
                      (temp.get(UploadIssueType['duplicate']) ?? [])
                      .filter((i) => i.id === data.data[index][0])
                    )
                    return temp
                  })
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
                data.updateIssues(prev => {
                  const temp = new Map(prev)
                  temp.set(
                    UploadIssueType['duplicate'], 
                    (temp.get(UploadIssueType['duplicate']) ?? [])
                    .filter((i) => i.id === data.data[index][0])
                  )
                  return temp
                })
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
            data.previews?.[data.data[index][0]] !== undefined ? ( 
              <LazyImage 
                overrideSrc={data.previews[data.data[index][0]]}
                watermarkPath={data.watermarkPath}
                watermarkQuery={data.watermarkQuery}
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
          disabled={duplicate !== undefined}
          onClick={() => data.onDelete(data.data[index][0])}
        >
          <HiOutlineXMark size={16}/>
        </button>
      </div>
    </div>
  )
}