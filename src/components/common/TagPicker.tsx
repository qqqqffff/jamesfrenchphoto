import { useEffect, useRef, useState } from "react"
import { UserTag } from "../../types"
import { Checkbox, Radio } from "flowbite-react"
import { HiOutlineTag, HiOutlineXMark } from "react-icons/hi2"
import { UseInfiniteQueryResult, InfiniteData } from "@tanstack/react-query"
import { GetAllUserTagsData } from "../../services/tagService"

interface TagPickerProps {
  tags: UserTag[],
  parentPickTag: (tag?: UserTag) => void
  disabled?: boolean
  tagQuery?: UseInfiniteQueryResult<InfiniteData<GetAllUserTagsData, unknown>, Error>
  pickedTag?: UserTag[],
  placeholder?: string
  placement?: 'start' | 'end'
  allowMultiple?: boolean
  allowClear?: boolean
  hideTag?: boolean,
  small?: boolean
}

export const TagPicker = (props: TagPickerProps) => {
  const windowRef = useRef<HTMLDivElement | null>(null)
  const [search, setSearch] = useState<string>('')
  const [focused, setFocused] = useState(false)
  const tagItems = useRef<Map<string, HTMLDivElement | null>>(new Map())
  const bottomObserver = useRef<IntersectionObserver | null>(null)

  const filteredItems = props.tags.filter((tag) => tag.name.toLowerCase().trim().includes((search ?? '').toLowerCase().trim()))

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if(
        focused &&
        windowRef.current &&
        !windowRef.current.contains(event.target as Node)
      ) {
        setFocused(false)
      }
    }

    if(
      filteredItems.length < 16 && 
      props.tagQuery?.hasNextPage &&
      !props.tagQuery.isFetching
    ) {
      props.tagQuery.fetchNextPage()
    }

    if(focused) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [
    props.tagQuery, 
    search,
    focused
  ])

  useEffect(() => {
    if(!bottomObserver.current) {
      bottomObserver.current = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const foundKey = Array.from(tagItems.current.keys()).findIndex((id) => entry.target.id === id)
          const validIndex = foundKey >= tagItems.current.size - 3
          if(
            entry.isIntersecting &&
            validIndex &&
            props.tagQuery && (
              props.tagQuery.hasNextPage &&
              !props.tagQuery.isFetching
            )
          ) {
            props.tagQuery.fetchNextPage()
          }
        })
      }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
      })
    }

    const bottomRef = tagItems.current.size - 3
    if(bottomRef >= 0 && bottomObserver.current) {
      const el = tagItems.current.get(Array.from(tagItems.current.keys())[bottomRef])
      if(el !== undefined && el !== null) {
        bottomObserver.current.observe(el)
      }
    }

    return () => {
      if(bottomObserver.current) {
        bottomObserver.current.disconnect()
      }
    }
  }, [
    props.tagQuery?.hasNextPage,
    props.tagQuery?.isFetching,
    bottomObserver.current,
    tagItems.current.size
  ])

  return (
    <div className="relative w-full" ref={windowRef}>
      {props.small ? (
        <div className="flex justify-center">
          <button
            className="
              border rounded-lg enabled:cursor-pointer enabled:hover:border-gray-400 
              focus:outline-none focus:ring-2 disabled:opacity-60 disabled:cursor-not-allowed
            "
            onClick={() => setFocused(!focused)}
            disabled={props.disabled}
          >
            <div className="p-1">
              <HiOutlineTag size={24} className={props.pickedTag && props.pickedTag.length === 1 && props.pickedTag[0].color !== undefined ? `text-${props.pickedTag[0].color}` : 'text-gray-900'}/>
            </div>
          </button>
        </div>
      ) : (
        <input 
          placeholder={props.placeholder ?? 'Pick User Tag...'}
          className={`
            text-${!props.pickedTag || props.pickedTag.length === 0 ? 'black' : props.pickedTag[0].color} 
            enabled:hover:cursor-pointer w-full px-4 py-2 border rounded-lg enabled:hover:border-gray-400 focus:outline-none  
            text-xs disabled:opacity-60 disabled:hover:cursor-not-allowed focus:ring-2 
          `}
          disabled={props.disabled}
          value={!props.pickedTag || props.pickedTag.length === 0 || props.hideTag ? '' : 
            props.pickedTag.length === 1 ? props.pickedTag[0].name : 'Multiple Tags'}
          onFocus={() => { if(!props.disabled) setFocused(true); }}
          readOnly
        />
      )}
      {(
        props.allowClear && 
        (props.pickedTag ?? []).length > 0 && 
        (
          props.small === undefined ||
          !props.small
        )
      ) && (
        <button 
          className="absolute right-0 self-center hover:text-black text-gray-500 p-1 pe-2"
          onClick={() => props.parentPickTag(undefined)}
        >
          <HiOutlineXMark size={20} />
        </button>
      )}
      {focused && (
        <div 
        className={`
          absolute z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg 
          flex flex-col max-w-[250px] 
          ${props?.placement === 'end' ? 'right-0' : 'left-0'}
        `}>
          <div className="w-full whitespace-nowrap border-b py-1 px-2 text-base self-center flex flex-row justify-between">
            <span>Pick Tag</span>
            <button 
              className=""
              onClick={() => setFocused(false)}
            >
              <HiOutlineXMark size={16} className="text-gray-400 hover:text-gray-800"/>
            </button>
          </div>
          <div className="w-full px-2 py-2 flex flex-row gap-2 border-b">
            <input 
              placeholder="Search for a tag"
              className="font-thin py-1 px-2 text-xs ring-transparent w-full border rounded-md focus:outline-none placeholder:text-gray-400 placeholder:italic"
              onChange={(event) => setSearch(event.target.value)}
              value={search}
            />
          </div>
          <div className="max-h-60 overflow-y-auto py-1 min-w-max">
            {filteredItems.length > 0 ? (
              filteredItems
              .sort((a, b) => {
                const aSelected = props.pickedTag?.some((pTag) => pTag.id === a.id)
                const bSelected = props.pickedTag?.some((pTag) => pTag.id === b.id)

                if(aSelected && bSelected) return a.name.localeCompare(b.name)
                else if(aSelected && !bSelected) return -1
                else if(!aSelected && bSelected) return 1
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              })
              .map((tag, index) => {
                const selected = props.pickedTag?.some((pTag) => pTag.id === tag.id)
                
                return (
                  <div 
                    className="flex flex-row justify-start items-center pe-2 w-full" 
                    key={index}
                    ref={el => tagItems.current.set(tag.id, el)}
                    id={tag.id}
                  >
                    <button 
                      className="flex flex-row w-full items-center gap-2 py-2 ps-2 me-2 hover:bg-gray-100 cursor-pointer disabled:hover:cursor-wait" 
                      onClick={(event) => {
                        event.stopPropagation()
                        props.parentPickTag(tag)
                        if(!props.allowMultiple) setFocused(false)
                      }}
                    >
                      {props.allowMultiple ? (
                        <Checkbox 
                          readOnly
                          checked={selected}
                          onClick={() => props.parentPickTag(tag)}
                        />
                      ) : (
                        <Radio
                          readOnly
                          checked={selected === true}
                          onClick={() => props.parentPickTag(tag)}
                        />
                      )}
                      <span className={`text-${tag.color ?? 'black'} truncate max-w-[210px]`}>{tag.name}</span>
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
          {props.allowClear && (
            <div className="w-full justify-end flex flex-row px-2 py-1 border-t">
              <button
                className="rounded-lg border py-0.5 px-2 hover:bg-gray-50"
                onClick={() => props.parentPickTag(undefined)}
              >
                <span>Clear</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}