import { Dispatch, SetStateAction, useState } from "react"
import { UserTag } from "../../../types"
import { Badge, Dropdown, TextInput, Tooltip } from "flowbite-react"
import { badgeColorThemeMap, badgeColorThemeMap_hoverable, defaultColors, textInputTheme } from "../../../utils"
import { BiSolidSquareRounded } from "react-icons/bi"
import { invariant } from "@tanstack/react-router"

interface DetailsPanelProps {
  selectedTag: UserTag
  parentUpdateTag: Dispatch<SetStateAction<UserTag | undefined>>
}

export const DetailsPanel = (props: DetailsPanelProps) => {
  const [badgeSize, setBadgeSize] = useState<'xs' | 'sm' | 'md'>('xs')
  return (
    <div className="grid grid-cols-2 px-10 place-items-center gap-x-10">
      <div className="flex flex-col gap-1 border rounded-lg p-4 w-full h-full">
        <span className="text-xl font-light ms-2 flex flex-row">
          <span>Tag Name:</span>
          <Tooltip 
            content={(<span className="whitespace-nowrap text-red-500 italic text-sm">Required Field</span>)}
            style="light"
          >
            <span className="italic text-red-500"><sup>*</sup></span>
          </Tooltip>
        </span>
        <TextInput
          theme={textInputTheme} 
          placeholder="Enter Tag Name Here..."
          className="max-w-[400px] min-w-[400px] placeholder:italic"
          sizing="md" 
          onChange={(event) => {
            const tempTag: UserTag = {
              ...props.selectedTag,
              name: event.target.value
            }
            props.parentUpdateTag(tempTag)
          }}
          value={props.selectedTag.name}
          name="PackageName"
          id="PackageName"
        />
      </div>
      <div className="flex flex-col gap-1 border rounded-lg p-4 w-full h-full">
        <span className="text-xl font-light ps-2 mb-1 me-[30%] flex flex-row items-center gap-6 border-b">
          <span>Tag Color:</span>
        </span>
        <div className="grid grid-cols-6 gap-x-2 gap-y-2 max-w-[250px]">
          {defaultColors.map((color, index) => {
            const className = 'fill-' + color + ' cursor-pointer'
            return (
              <BiSolidSquareRounded 
                key={index} 
                size={24} 
                className={className} 
                onClick={() => {
                  let tempTag: UserTag | undefined
                  if(color !== props.selectedTag.color) { 
                    tempTag = {
                      ...props.selectedTag,
                      color: color
                    }
                  } else {
                    tempTag = {
                      ...props.selectedTag,
                      color: undefined
                    }
                  }
                  invariant(tempTag)
                  props.parentUpdateTag(tempTag)
                  
                }}
              />
            )
          })}
          <BiSolidSquareRounded 
            size={24}
            className="fill-gray-400 cursor-pointer"
            onClick={() => {
              let tempTag: UserTag | undefined
              if('black' !== props.selectedTag.color) { 
                tempTag = {
                  ...props.selectedTag,
                  color: 'black'
                }
              } else {
                tempTag = {
                  ...props.selectedTag,
                  color: undefined
                }
              }
              invariant(tempTag)
              props.parentUpdateTag(tempTag)
            }}
          />
        </div>
        <span className="text-xl font-light ps-2 pb-2 mb-1 me-[20%] flex flex-row items-center gap-6 border-b">
          <span>Tag Badge Preview:</span>
          <Dropdown
            color="gray"
            size="xs"
            label={(<span className="text-xs">Badge Size</span>)}
            placement="bottom-start"
          >
            <Dropdown.Item onClick={() => badgeSize !== 'xs' ? setBadgeSize('xs') : undefined}>Default</Dropdown.Item>
            <Dropdown.Item onClick={() => badgeSize !== 'sm' ? setBadgeSize('sm') : undefined}>Small</Dropdown.Item>
            <Dropdown.Item onClick={() => badgeSize !== 'md' ? setBadgeSize('md') : undefined}>Medium</Dropdown.Item>
          </Dropdown>
        </span>
        <div className="flex flex-col gap-2">
          <div className="flex flex-row gap-4">
            <span className="font-light">Default:</span>
            <Badge theme={badgeColorThemeMap} size={badgeSize} color={props.selectedTag.color ?? 'black'}>{props.selectedTag.name}</Badge>
          </div>
          <div className="flex flex-row gap-4">
            <span className="font-light">Button:</span>
            <button className="enabled:hover:cursor-pointer disabled:hover:cursor-not-allowed disabled:opacity-65">
              <Badge theme={badgeColorThemeMap_hoverable} size={badgeSize} color={props.selectedTag.color ?? 'black'} >{props.selectedTag.name}</Badge>
            </button>
          </div>
          <div className="flex flex-row gap-4">
            <span className="font-light">Button (disabled):</span>
            <button disabled className="enabled:hover:cursor-pointer disabled:hover:cursor-not-allowed disabled:opacity-65">
              <Badge theme={badgeColorThemeMap_hoverable} size={badgeSize} color={props.selectedTag.color ?? 'black'} >{props.selectedTag.name}</Badge>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}