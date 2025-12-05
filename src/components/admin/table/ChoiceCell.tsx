import { ComponentProps, useEffect, useRef, useState } from "react";
import { BiSolidSquareRounded } from "react-icons/bi";
import { HiOutlinePlusCircle, HiOutlineXMark } from 'react-icons/hi2'
import { defaultColors, defaultColumnColors } from "../../../utils";
import { Label } from "flowbite-react";
import { ColumnColor, TableColumn } from "../../../types";
import { ColorComponent } from "../../common/ColorComponent";
import { ColorWheelPicker } from "../../common/ColorWheel";


interface ChoiceCellProps extends ComponentProps<'td'> {
  value: string,
  updateValue: (text: string) => void,
  column: TableColumn,
  createChoice: (choice: string, color: string, customColor?: [string, string]) => void,
}

export const ChoiceCell = (props: ChoiceCellProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [creatingOption, setCreatingOption] = useState(false)
  const [activeColor, setActiveColor] = useState<string>('black')
  const [customColor, setCustomColor] = useState<[string, string]>()
  const [choiceName, setChoiceName] = useState<string>('')
  
  useEffect(() => {
    if(props.value !== value){
      setValue(props.value)
    }
  }, [props.value])

  const valueColor: ColumnColor | undefined = props.column.color?.find((color) => color.value === value)

  return (
    <td 
      className={`
        text-ellipsis border py-3 px-3 max-w-[150px] 
        ${valueColor && (!valueColor.bgColor || !valueColor.bgColor.includes('#')) ? `bg-${valueColor.bgColor ?? 'transparent'}` : ''}
      `}
      style={{
        backgroundColor: valueColor?.bgColor && valueColor.bgColor.includes('#') ? valueColor.bgColor : undefined,
      }}
    >
      <input 
        ref={inputRef}
        className={`
          font-thin w-full border-b-gray-400 border-b py-0.5 flex flex-row 
          placeholder:italic focus:outline-none hover:cursor-pointer
          ${valueColor && 
            (!valueColor.bgColor || !valueColor.bgColor.includes('#')) &&
            (!valueColor.textColor || !valueColor.textColor.includes('#'))
          ? `bg-${valueColor.bgColor ?? 'transparent'} text-${valueColor.textColor ?? 'black'}` : ''}
        `}
        style={{
          backgroundColor: valueColor?.bgColor && valueColor.bgColor.includes('#') ? valueColor.bgColor : undefined,
          color: valueColor?.textColor && valueColor.textColor.includes('#') ? valueColor.textColor + 'bb' : undefined
        }}
        onFocus={() => setIsFocused(true)}
        value={value}
        placeholder="Pick An Option"
        readOnly
        onBlur={() => {
          if(!creatingOption) {
            setTimeout(() => setIsFocused(false), 200)
          }
        }}
      />
      {isFocused && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col">
          <span className="whitespace-nowrap px-4 border-b pb-0.5 text-base self-center">Column Choices</span>
          {!creatingOption && (
            <div className="grid grid-cols-2 py-2 p-1 gap-x-2 min-w-max">
              {props.column.choices?.map((choice, index) => {
                const color: ColumnColor | undefined = props.column.color?.find((color) => color.value === choice)
                //TODO: special handling for custom colors
                return (
                  <button 
                    key={index}
                    onClick={() => {
                      props.updateValue(choice)
                      setValue(choice)
                    }}
                    className={`
                      opacity-75 hover:opacity-100 border-transparent border hover:border-gray-500 
                      rounded-md flex flex-row items-center ${color && 
                        (!color.bgColor || !color.bgColor.includes('#')) &&
                        (!color.textColor || !color.textColor.includes('#')) ? `text-${color.textColor ?? 'black'} bg-${color.bgColor ?? 'white'}` : ''}
                      px-4 text-nowrap justify-center
                    `}
                    style={{
                      backgroundColor: color?.bgColor && color.bgColor.includes('#') ? color.bgColor : undefined,
                      color: color?.textColor && color.textColor.includes('#') ? color.textColor + 'bb' : undefined
                    }}
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
                setIsFocused(true)
                if(inputRef.current) inputRef.current.focus()
              }}
            >
              <HiOutlineXMark size={16} className="text-gray-400"/>
            </button>
          </div>
          <div className="px-2 py-2 flex flex-col gap-1">
            <div className="flex flex-row gap-2 items-center text-nowrap">
              <span className="text-sm">Choice:</span>
              <input
                className={`
                  font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 
                  border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic
                  ${activeColor ? `text-${activeColor}` : 'text-black'}
                `}
                style={{
                  color: customColor ? customColor[0] : undefined
                }}
                placeholder="Choice..."
                onChange={(event) => setChoiceName(event.target.value)}
                value={choiceName}
              />
            </div>
            <Label className="text-sm mt-2">Color: {customColor !== undefined ? (
              <span
                className="px-2 py-1"
                style={{
                  color: customColor[0],
                  backgroundColor: customColor[1] + 'bb'
                }}
              >Custom</span>
            ) : (
              <ColorComponent activeColor={activeColor} />
            )}
            </Label>
            <div className="flex flex-row w-full justify-center py-2">
              <div className="grid grid-cols-5 gap-y-2 gap-x-4">
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
                            setCustomColor(undefined)
                          } else {
                            setActiveColor('black')
                            setCustomColor(undefined)
                          }
                        }}
                      />
                    )
                  })}
              </div>
            </div>
            <ColorWheelPicker 
              size={200}
              binding={{
                setSelectedColor: setCustomColor
              }}
            />
            <div className="flex flex-row justify-end gap-2 me-2 mt-2">
              <button
                className="border rounded-md px-2 py-0.5 hover:bg-gray-100"
                onClick={() => {
                  setCreatingOption(false)
                  setIsFocused(true)
                  if(inputRef.current) inputRef.current.focus()
                }}
              >Back</button>
              <button 
                className="border rounded-md px-2 py-0.5 disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:bg-gray-100"
                disabled={props.column.choices?.some((choice) => choice === choiceName) || choiceName === ''}
                onClick={() => {
                  props.createChoice(choiceName, activeColor, customColor)
                  setChoiceName('')
                  setActiveColor('black')
                  setCreatingOption(false)
                  if(inputRef.current) inputRef.current.focus()
                }}
              >Create</button>
            </div>
          </div>
        </div>
      )}
    </td>
  )
}