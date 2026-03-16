import { ComponentProps, useEffect, useRef, useState } from "react";
import { BiSolidEraser, BiSolidSquareRounded } from "react-icons/bi";
import { HiOutlineArrowUturnLeft, HiOutlineCheck, HiOutlinePencil, HiOutlinePlusCircle, HiOutlineXMark } from 'react-icons/hi2'
import { defaultColors, defaultColumnColors } from "../../../utils";
import { ColumnColor, TableColumn } from "../../../types";
import { ColorComponent } from "../../common/ColorComponent";
import { ColorWheelPicker } from "../../common/ColorWheel";

interface ChoiceCellProps extends ComponentProps<'td'> {
  value: string,
  updateValue: (text: string) => void,
  column: TableColumn,
  modifyChoice: (
    choice: string, 
    color: string, 
    action: 'create' | 'update' | 'delete', 
    customColor?: [string, string], 
    id?: string
  ) => void,
  rowIndex: number
  selectedSearch: boolean
}

//TODO: delete choice does not remove it from existing values
export const ChoiceCell = (props: ChoiceCellProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const actionWindowRef = useRef<HTMLDivElement | null>(null)
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [choiceHovering, setChoiceHovering] = useState<string>()

  const [actionWindowMode, setActionWindowMode] = useState<'default' | 'create' | 'update' | 'update-pick' | 'delete'>('default')
  const [activeColor, setActiveColor] = useState<string>('black')
  const [customColor, setCustomColor] = useState<[string, string]>()
  const [choiceName, setChoiceName] = useState<string>('')
  const [color, setColor] = useState<ColumnColor>()
  
  useEffect(() => {
    if(props.value !== value){
      setValue(props.value)
    }
  }, [props.value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if(
        isFocused &&
        actionWindowRef.current &&
        inputRef.current &&
        !actionWindowRef.current.contains(event.target as Node) &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false)
        setActionWindowMode('default')
      }
    }

    if(isFocused) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isFocused])

  const valueColor: ColumnColor | undefined = props.column.color?.find((color) => color.value === value)
  const columnChoices = props.column.choices ?? []

  return (
    <td 
      className={`
        text-ellipsis border py-3 px-3 max-w-[150px] 
        ${props.selectedSearch ? 'outline outline-green-400' : ''}
        ${valueColor && (!valueColor.bgColor || !valueColor.bgColor.includes('#')) ? 
          `bg-${valueColor.bgColor ? `${valueColor.bgColor} ${props.rowIndex % 2 ? '' : 'bg-opacity-60'}` : props.rowIndex % 2 ? 'bg-gray-200 bg-opacity-40' : ''}` : props.rowIndex % 2 ? 'bg-gray-200 bg-opacity-40' : ''}
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
          bg-transparent
          ${valueColor && 
            (!valueColor.textColor || !valueColor.textColor.includes('#'))
          ? `text-${valueColor.textColor ?? 'black'}` : ''}
        `}
        style={{
          // backgroundColor: valueColor?.bgColor && valueColor.bgColor.includes('#') ? valueColor.bgColor : undefined,
          color: valueColor?.textColor && valueColor.textColor.includes('#') ? valueColor.textColor + 'bb' : undefined
        }}
        onFocus={() => setIsFocused(true)}
        value={value}
        placeholder="Pick An Option"
        readOnly
      />
      {isFocused && (
        <div 
          ref={actionWindowRef}
          className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col"
        >
          {actionWindowMode === 'default' || actionWindowMode === 'delete' || actionWindowMode === 'update-pick' ? (
            <>
              <div className="w-full whitespace-nowrap border-b p-1 gap-4 text-base self-center flex flex-row justify-between">
                <span className="font-light ms-2 text-sm">{actionWindowMode === 'delete' ? 'Delete' : 'Select'} Choice</span>
                <div className="flex flex-row gap-2 me-2">
                  {columnChoices.length > 0 && (
                    <>
                      <button
                        onClick={() => setActionWindowMode(actionWindowMode !== 'update-pick' ? 'update-pick' : 'default')}
                        className={`
                          hover:bg-gray-100 p-1 
                          ${actionWindowMode === 'update-pick' ? 'text-black hover:text-gray-500' : 'text-gray-400 hover:text-black'}
                        `}
                      >
                        <HiOutlinePencil size={16}/>
                      </button>
                      <button
                        onClick={() => setActionWindowMode(actionWindowMode !== 'delete' ? 'delete' : 'default')}
                        className={`
                          hover:bg-gray-100 p-1
                          ${actionWindowMode === 'delete' ? 'text-black hover:text-gray-500' : 'text-gray-400 hover:text-black'}
                        `}
                      >
                        {actionWindowMode === 'default' || actionWindowMode === 'update-pick' ? (
                          <BiSolidEraser size={16} />
                        ) : (
                          <HiOutlineCheck size={16} />
                        )}
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => {
                      setIsFocused(false)
                    }}
                    className="text-gray-400 hover:text-black hover:bg-gray-100 p-1"
                  >
                    <HiOutlineXMark size={16} className="text-gray-400 hover:text-black"/>
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 py-2 p-1 gap-x-2  gap-y-2 min-w-max">
                {columnChoices.length > 0 ? (
                  columnChoices.map((choice, index) => {
                    const color: ColumnColor | undefined = props.column.color?.find((color) => color.value === choice)
                    return (
                      <button 
                        key={index}
                        onClick={() => {
                          if(actionWindowMode === 'default') {
                            props.updateValue(choice)
                            setValue(choice)
                          }
                          else if(actionWindowMode === 'delete' && color) {
                            props.modifyChoice(color.value, '', 'delete', customColor, color.id)
                          }
                          else if(actionWindowMode === 'update-pick' && color) {
                            if(
                              color.bgColor && 
                              color.textColor &&
                              color.bgColor.includes('#') && 
                              color.textColor.includes('#')
                            ) {
                              setCustomColor([color.bgColor, color.textColor])
                              setChoiceName(color.value)
                              setActionWindowMode('update')
                              setColor(color)
                            }
                            else {
                              setActiveColor(color.bgColor ?? 'black')
                              setChoiceName(color.value)
                              setActionWindowMode('update')
                              setColor(color)
                            }
                          }
                        }}
                        className={`
                          opacity-75 hover:opacity-100 border-transparent border hover:border-gray-500 
                          rounded-md flex flex-row items-center ${color && 
                            (!color.bgColor || !color.bgColor.includes('#')) &&
                            (!color.textColor || !color.textColor.includes('#')) ? `text-${color.textColor ?? 'black'} bg-${color.bgColor ?? 'white'}` : ''}
                          px-4 text-nowrap justify-center py-2 gap-2
                          ${actionWindowMode === 'delete' ? 'hover:line-through hover:font-semibold' : ''}
                        `}
                        style={{
                          backgroundColor: color?.bgColor && color.bgColor.includes('#') ? color.bgColor : undefined,
                          color: color?.textColor && color.textColor.includes('#') ? color.textColor + 'bb' : undefined
                        }}
                        onMouseEnter={() => setChoiceHovering(color?.id)}
                        onMouseLeave={() => setChoiceHovering(undefined)}
                      >
                        {actionWindowMode === 'update-pick' && choiceHovering === color?.id && (<HiOutlinePencil size={16} className="text-black" />)}
                        <span>{choice}</span>
                      </button>
                    )
                  })
                ) : (
                  <span 
                    className="border rounded-mb flex flex-row items-center px-4 text-nowrap justify-center py-2"
                  >No Choices</span>
                )}
                {valueColor !== undefined && (
                  <button
                    className="px-4 gap-2 py-2 hover:bg-gray-100 border hover:border-gray-500 rounded-md flex flex-row justify-center"
                    onClick={() => props.updateValue('')}
                  >
                    <span>Clear</span>
                  </button>
                )}
                <button 
                  onClick={() => setActionWindowMode('create')}
                  className="px-4 gap-2 py-2 hover:bg-gray-100 border hover:border-gray-500 rounded-md flex flex-row items-center"
                >
                  <HiOutlinePlusCircle size={22} className=""/>
                  <span>Create Choice</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-full whitespace-nowrap border-b p-1 text-base self-center flex flex-row justify-between">
                <span className="font-light ms-2 text-sm">Create Choice</span>
                <button 
                  className=""
                  onClick={() => {
                    setActionWindowMode('default')
                  }}
                >
                  <HiOutlineArrowUturnLeft size={16} className="text-gray-400 hover:text-black"/>
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
                <span className="text-sm mt-2">Color: {customColor !== undefined ? (
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
                </span>
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
                    onClick={() => setActionWindowMode('default')}
                  >Back</button>
                  <button 
                    className="border rounded-md px-2 py-0.5 disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:bg-gray-100"
                    disabled={
                      props.column.choices?.some((choice) => choice === choiceName) || 
                      choiceName === '' ||
                      color !== undefined && (
                        //could not find existing color
                        !props.column.color?.some((choice) => choice.id === color.id) || 
                        (
                          //value not updated
                          color.value === choiceName && 
                          //color not updated
                          (
                            //undefined custom color
                            (customColor === undefined && color.bgColor === activeColor) || 
                            (
                              customColor !== undefined &&
                              //if not un-updated custom color
                              color.bgColor == customColor[0] &&
                              color.textColor === customColor[1]
                            )
                          )
                        )
                      )
                    }
                    onClick={() => {
                      if(actionWindowMode === 'create') {
                        props.modifyChoice(choiceName, activeColor, 'create', customColor)
                        setChoiceName('')
                        setActiveColor('black')
                        setActionWindowMode('default')
                      } else {
                        props.modifyChoice(choiceName, activeColor, 'update', customColor, color?.id)
                        setActionWindowMode('default')
                      }
                    }}
                  >{actionWindowMode === 'create' ? 'Create' : 'Update'}</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </td>
  )
}