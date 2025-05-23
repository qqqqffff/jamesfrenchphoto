import { Dispatch, SetStateAction, useState } from "react"
import { UserTag } from "../../../types"
import { TextInput } from "flowbite-react"
import { textInputTheme } from "../../../utils"
import { HiOutlineXMark } from "react-icons/hi2"

interface TagPickerProps {
  tags: UserTag[],
  parentUpdateTags: Dispatch<SetStateAction<UserTag[]>>
  parentPickTag: (tag: UserTag) => void
  pickedTag?: UserTag,
  placeholder?: string
}

export const TagPicker = (props: TagPickerProps) => {
  const [search, setSearch] = useState<string>('')
  const [focused, setFocused] = useState(false)

  return (
    <>
      <div className="relative">
        <TextInput
          theme={textInputTheme}
          placeholder={props.placeholder ?? 'Pick User Tag...'}
          color={props.pickedTag?.color ?? 'gray'}
          className={`
            max-w-[400px] min-w-[400px] placeholder:italic 
          `}
          value={props.pickedTag?.name ?? ''}
          onFocus={() => setFocused(true)}
          readOnly
        />
        {focused && (
          <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col min-w-[200px]">
            <div className="w-full whitespace-nowrap border-b py-1 px-2 text-base self-center flex flex-row justify-between">
              <span>Pick Tag</span>
              <button 
                className=""
                onClick={() => {
                  setFocused(false)
                }}
              >
                <HiOutlineXMark size={16} className="text-gray-400 hover:text-gray-800"/>
              </button>
            </div>
            <div className="w-full px-2 py-2 flex flex-row gap-2">
              <input 
                placeholder="Search for a tag"
                className="font-thin py-1 px-2 text-xs ring-transparent w-full border rounded-md focus:outline-none placeholder:text-gray-400 placeholder:italic"
                onChange={(event) => setSearch(event.target.value)}
                value={search}
              />
            </div>
            <div className="max-h-60 overflow-y-auto py-1 min-w-max">
              {props.tags.filter((tag) => tag.name.toLowerCase().trim().includes((search ?? '').toLowerCase())).length > 0 ? (
                props.tags
                  .filter((tag) => tag.name.toLowerCase().trim().includes((search ?? '').toLowerCase()))
                  .map((tag, index) => {
                    return (
                      <div 
                        className="flex flex-row justify-start items-center pe-2" 
                        key={index}
                      >
                        <button 
                          className="flex flex-row w-full items-center gap-2 py-2 ps-2 me-2 hover:bg-gray-100 cursor-pointer disabled:hover:cursor-wait" 
                          onClick={() => {
                            setFocused(false)
                            props.parentPickTag(tag)
                          }}
                        >
                          <span className={`text-${tag.color ?? 'black'} truncate max-w-[500px]`}>{tag.name}</span>
                        </button>
                      </div>
                    )
                  })
              ) : (
                <div className="flex flex-row justify-between items-center pe-2">
                  <span className="flex flex-row w-full items-center gap-2 py-2 ps-2 me-2 font-light italic">No Available Tags</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}