import { ComponentProps, useEffect, useState } from "react";
import { UserTag } from "../../../types";
import { Tooltip } from "flowbite-react";

interface TagCellProps extends ComponentProps<'td'> {
  value: string,
  updateValue: (text: string) => void,
  tags: UserTag[]
}

//TODO: continue implementing me
export const TagCell = (props: TagCellProps) => {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  
  useEffect(() => {
    if(props.value !== value){
      setValue(props.value)
    }
  }, [props.value])

  return (
    <td className="text-ellipsis border py-3 px-3 max-w-[150px]">
      <input
        placeholder="Pick Tag..."
        className="
          font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 
          border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic
          hover:cursor-pointer
        "
        value={value}
        onBlur={() => {
          setTimeout(() => {
            setIsFocused(false)
          }, 200)
        }}
        onFocus={() => setIsFocused(true)}
        readOnly
      />
      {isFocused && value === '' && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col min-w-[200px]">
          <div className="w-full whitespace-nowrap border-b py-1 px-2 mb-2 text-base self-center flex flex-row">
            <span>Choose A Tag</span>
          </div>
          <ul className="max-h-60 overflow-y-auto py-1 min-w-max">
            {props.tags.map((tag, index) => {
              return (
                <Tooltip
                  key={index}
                  content={(
                    <div className="flex flex-col">
                      <span className={`text-${tag.color ?? 'black'}`}>

                      </span>
                    </div>
                  )}
                >
                  <li>{tag.name}</li>
                </Tooltip>
              )
            })}
          </ul>
        </div>
      )}
    </td>
  )
}