import { ComponentProps, useEffect, useState } from "react";
import { UserTag } from "../../../types";
import { Checkbox } from "flowbite-react";
import { HiOutlinePencil, HiOutlinePlusCircle, HiOutlineXMark } from "react-icons/hi2";
import { CreateTagModal } from "../../modals";

interface TagCellProps extends ComponentProps<'td'> {
  value: string,
  updateValue: (text: string) => void,
  tags: UserTag[],
  refetchTags: () => void
}

export const TagCell = (props: TagCellProps) => {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [search, setSearch] = useState<string>('')
  const [createTagVisible, setCreateTagVisible] = useState(false)
  const [selectedTag, setSelectedTag] = useState<UserTag>()
  const [tags, setTags] = useState<UserTag[]>(props.tags)
  
  useEffect(() => {
    if(props.value !== value){
      setValue(props.value)
    }
    if(props.tags.some((tag) => !tags.some((parentTag) => parentTag.id === tag.id))) {
      setTags(props.tags)
    }
  }, [props.value, props.tags])

  const splitValue = value.split(';')
  const foundTag = splitValue.length === 1 ? tags.find((tag) => tag.id === splitValue[0]) : undefined

  const tagValue = (() => {
    if(splitValue.length < 0) {
      return ''
    }
    else if(splitValue.length == 1) {
      return foundTag?.name ?? ''
    }
    else {
      return 'Multiple Tags'
    }
  })()

  return (
    <>
      <CreateTagModal 
        onSubmit={(tag) => (
          setTags((prev) => {
            const temp = [...prev]
            if(!temp.some((pTag) => tag.id === pTag.id)) {
              temp.push(tag)
              return temp
            }
            return temp.map((pTag) => {
              if(pTag.id === tag.id) {
                return tag
              }
              return pTag
            })
          }
          )
        )}
        existingTag={selectedTag}
        open={createTagVisible} 
        onClose={() => setCreateTagVisible(false)}      
      />
      <td className="text-ellipsis border py-3 px-3 max-w-[150px]">
        <input
          placeholder="Pick Tag..."
          className={`
            font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 
            border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic
            hover:cursor-pointer ${foundTag ? `text-${foundTag.color ?? 'black'}` : ''}
          `}
          value={tagValue}
          onFocus={() => setIsFocused(true)}
          readOnly
        />
        {isFocused && (
          <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col min-w-[200px]">
            <div className="w-full whitespace-nowrap border-b py-1 px-2 text-base self-center flex flex-row justify-between">
              <span>Pick Tags</span>
              <button 
                className=""
                onClick={() => {
                  setIsFocused(false)
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
              <button
                onClick={() => setCreateTagVisible(true)}
              >
                <HiOutlinePlusCircle size={16} className="text-gray-400 hover:text-gray-800" />
              </button>
            </div>
            
            <div className="max-h-60 overflow-y-auto py-1 min-w-max">
              {tags
                .filter((tag) => tag.name.toLowerCase().trim().includes((search ?? '').toLowerCase()))
                .sort((a, b) => {
                  const aSelected = splitValue.includes(a.id)
                  const bSelected = splitValue.includes(b.id)

                  if(aSelected && !bSelected) return -1
                  if(!aSelected && bSelected) return 1

                  return 0
                })
                .map((tag, index) => {
                  return (
                    <div 
                      className="flex flex-row justify-between items-center pe-2" 
                      key={index}
                    >
                      <div 
                        className="flex flex-row w-full items-center gap-2 py-2 ps-2 me-2 hover:bg-gray-100 cursor-pointer" 
                        onClick={() => {
                          if(!splitValue.includes(tag.id)){
                            setValue(value !== '' ? value + ';' + tag.id : tag.id)
                            props.updateValue(value !== '' ? value + ';' + tag.id : tag.id)
                          }
                          else {
                            const newValue = splitValue
                              .filter((oldTag) => oldTag !== tag.id)
                              .reduce((prev, cur) => (prev !== '' ? prev + ';' + cur : cur), '')
                            
                            setValue(newValue)
                            props.updateValue(newValue)
                          }
                        }}
                      >
                        <Checkbox 
                          readOnly
                          checked={value.split(';').some((value) => value === tag.id)}
                        />
                        <span className={`text-${tag.color ?? 'black'} text-ellipsis`}>{tag.name}</span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedTag(tag)
                          setCreateTagVisible(true)
                        }}
                      >
                        <HiOutlinePencil size={16} className="text-gray-400 hover:text-gray-800"/>
                      </button>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </td>
    </>
  )
}