import { ComponentProps, Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { BiSolidSquareRounded } from "react-icons/bi";
import { HiOutlinePlusCircle, HiOutlineXMark } from 'react-icons/hi2'
import { defaultColors, defaultColumnColors, GetColorComponent } from "../../../utils";
import { Label } from "flowbite-react";
import { ColumnColor, Table, TableColumn } from "../../../types";


interface ChoiceCellProps extends ComponentProps<'td'> {
  value: string,
  updateValue: (text: string) => void,
  column: TableColumn,
  updateParentTable: Dispatch<SetStateAction<Table | undefined>>
  createChoice: (choice: string, color: string) => void,
}

//TODO: continue implementing me
export const ChoiceCell = (props: ChoiceCellProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [creatingOption, setCreatingOption] = useState(false)
  const [activeColor, setActiveColor] = useState<string>('black')
  const [choiceName, setChoiceName] = useState<string>('')
  
  useEffect(() => {
    if(props.value !== value){
      setValue(props.value)
    }
  }, [props.value])

  const valueColor: ColumnColor | undefined = props.column.color?.find((color) => color.value === value)

  return (
    <td className={`text-ellipsis border py-3 px-3 max-w-[150px] ${valueColor ? `bg-${valueColor.bgColor ?? 'transparent'}` : ''}`}>
      <input 
        ref={inputRef}
        className={`
          font-thin w-full border-b-gray-400 border-b py-0.5 flex flex-row 
          placeholder:italic focus:outline-none hover:cursor-pointer
          ${valueColor ? `bg-${valueColor.bgColor ?? 'transparent'} text-${valueColor.textColor ?? 'black'}` : ''}
        `}
        onFocus={() => setIsFocused(true)}
        value={value}
        placeholder="Pick An Option"
        readOnly
        onBlur={() => {
          setTimeout(() => setIsFocused(false), 200)
        }}
      />
      {isFocused && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col">
          <span className="whitespace-nowrap px-4 border-b pb-0.5 text-base self-center">Column Choices</span>
          {!creatingOption && (
            <div className="grid grid-cols-2 py-2 p-1 gap-x-2 min-w-max">
              {props.column.choices?.map((choice, index) => {
                const color: ColumnColor | undefined = props.column.color?.find((color) => color.value === choice)
                return (
                  <button 
                    key={index}
                    onClick={() => {
                      props.updateValue(choice)
                      setValue(choice)
                    }}
                    className={`
                      opacity-75 hover:opacity-100 border-transparent border hover:border-gray-500 
                      rounded-md flex flex-row items-center ${color ? `text-${color.textColor ?? 'black'} bg-${color.bgColor ?? 'white'}` : ''}
                      px-4 text-nowrap justify-center
                    `}
                  >
                    <span>{choice}</span>
                  </button>
                )
              })}
              <button 
                onClick={() => setCreatingOption(true)}
                className="px-4 gap-2 py-2 hover:bg-gray-100 border hover:border-gray-500 rounded-md flex flex-row items-center"
              >
                <HiOutlinePlusCircle size={22} className=""/>
                <span>Create Choice</span>
              </button>
            </div>
          )}
        </div>
      )}
      {creatingOption && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col min-w-[200px] ">
          <div className="w-full whitespace-nowrap border-b p-1 text-base self-center flex flex-row justify-between">
            <span className="font-light ms-2 text-sm">Create Choice</span>
            <button 
              className=""
              onClick={() => {
                setCreatingOption(false)
              }}
            >
              <HiOutlineXMark size={16} className="text-gray-400"/>
            </button>
          </div>
          <div
            className="px-2 py-2 flex flex-col gap-1"
          >
            <div className="flex flex-row gap-2 items-center text-nowrap">
              <span className="text-sm">Choice:</span>
              <input
                className={`
                  font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 
                  border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic
                  ${activeColor ? `text-${activeColor}` : 'text-black'}
                `}
                placeholder="Choice..."
                onChange={(event) => setChoiceName(event.target.value)}
                value={choiceName}
              />
            </div>
            <Label className="text-sm mt-2">Color: <GetColorComponent activeColor={activeColor} /></Label>
            <div className="grid grid-cols-5 gap-1">
              {defaultColors
                .filter((color) => !props.column.color?.some((colColor) => {
                  return colColor.bgColor === defaultColumnColors[color].bg
                }))
                .map((color, index) => {
                  const className = 'fill-' + color + ' cursor-pointer'
                  return (
                    <BiSolidSquareRounded 
                      key={index} 
                      size={24} 
                      className={className} 
                      onClick={() => {
                        if(color !== activeColor) { 
                          setActiveColor(color) 
                        } else {
                          setActiveColor('black')
                        }
                      }}
                    />
                  )
                })}
            </div>
            <button 
              className="self-end me-2 border rounded-md px-2 py-0.5 mt-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={props.column.choices?.some((choice) => choice === choiceName)}
              onClick={() => {
                props.createChoice(choiceName, activeColor)
                setChoiceName('')
                setActiveColor('black')
                setCreatingOption(false)
                if(inputRef.current) inputRef.current.focus()
              }}
            >Create</button>
          </div>
        </div>
      )}
    </td>
  )
}