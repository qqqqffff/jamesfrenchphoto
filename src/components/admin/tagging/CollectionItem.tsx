import { Tooltip } from "flowbite-react"
import { Dispatch, SetStateAction } from "react"
import { PhotoCollection, UserTag } from "../../../types"
import { formatTime } from "../../../utils"

export const CollectionItem = (props: {
  collection: PhotoCollection, 
  selected: boolean, 
  selectedTag: UserTag, 
  parentUpdateTag?: Dispatch<SetStateAction<UserTag | undefined>>
}) => {
  return (
    <div className="w-full">
      <Tooltip
        theme={{ target: undefined }}
        style="light"
        placement="bottom-start"
        arrow={false}
        content={(
          <div className="flex flex-col gap-1">
            <span className="font-semibold ms-2">Collection Details:</span>
            <div className="border" />
            <span className="flex flex-row gap-1"> 
              <span className="text-sm">Name:</span>
              <span className="text-sm font-light">{props.collection.name}</span>
            </span>
            <span className="flex flex-row gap-1"> 
              <span className="text-sm">Created At:</span>
              <span className="text-sm font-light">{formatTime(new Date(props.collection.createdAt), { timeString: false })}</span>
            </span>
            <span className="flex flex-row gap-1"> 
              <span className="text-sm">Item Count:</span>
              <span className="text-sm font-light">{props.collection.items}</span>
            </span>
            <span className="flex flex-row gap-1"> 
              <span className="text-sm">Published:</span>
              <span className="text-sm">{String(props.collection.published)}</span>
            </span>
            <span className="flex flex-row gap-1"> 
              <span className="text-sm">Downloadable:</span>
              <span className="text-sm">{String(props.collection.downloadable)}</span>
            </span>
          </div>
        )}
      >
        <button
          className={`
            px-4 py-2 border rounded-lg text-start 
            flex flex-row font-light gap-2 w-full
            ${props.parentUpdateTag !== undefined ? (
              props.selected ? 
                'bg-gray-200 hover:bg-gray-100' : 
                'hover:bg-gray-100'
            ) : (
              'hover:cursor-default'
            )}`
          }
          onClick={() => {
            if(props.parentUpdateTag) {
              const tempTag = {
                ...props.selectedTag
              }
              if(props.selected) {
                tempTag.collections = [...(tempTag.collections ?? [])].filter((col) => col.id !== props.collection.id)
              }
              else {
                tempTag.collections = [...(tempTag.collections ?? []), props.collection]
              }

              props.parentUpdateTag(tempTag)
            }
          }}
        >
          <span className="truncate">{props.collection.name}</span>
        </button>
      </Tooltip>
    </div>
  )
}