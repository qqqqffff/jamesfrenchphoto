import { ComponentProps, useEffect, useRef, useState } from "react";
import { Participant, Table } from "../../../types";
import { Dropdown, ToggleSwitch } from "flowbite-react";
import { HiOutlineXMark } from "react-icons/hi2";

interface DateCellProps extends ComponentProps<'td'> {
  value: string,
  updateValue: (text: string) => void,
  table: Table,
  participants: Participant[],
  rowIndex: number,
  columnId: string,
}

//TODO: continue implementing me
export const DateCell = (props: DateCellProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [source, setSource] = useState<{id: string, header: string}>()
  const [mode, setMode] = useState<'column' | 'participant'>('column')
  
  useEffect(() => {
    if(props.value !== value){
      setValue(props.value)
    }
  }, [props.value])

  const participantSource = props.participants.find((participant) => participant.id === value)
  const undefinedSource = participantSource === undefined

  return (
    <td className="text-ellipsis border py-3 px-3 max-w-[150px]">
      <input
        ref={inputRef}
        placeholder="Pick Source..."
        className="
          font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 
          border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic
          hover:cursor-pointer
        "
        value={value}
        onBlur={() => {
          setTimeout(() => {
            if(!undefinedSource) setIsFocused(false)
          }, 200)
        }}
        onFocus={() => setIsFocused(true)}
        readOnly
      />
      {isFocused && undefinedSource && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col min-w-[200px]">
          <div className="w-full whitespace-nowrap border-b p-1 text-base self-center flex flex-row justify-between">
            <span className="font-light ms-2 text-sm">Select Source</span>
            <button 
              className=""
              onClick={() => {
                setIsFocused(false)
              }}
            >
              <HiOutlineXMark size={16} className="text-gray-400"/>
            </button>
          </div>
          <div className="flex flex-col px-2 py-2 gap-2">
            <div className="flex flex-row items-center self-center gap-2 border-b pb-2">
              <span className="font-light text-sm">Column</span>
              <ToggleSwitch 
                checked={mode === 'participant'} 
                onChange={() => {
                  setMode(mode === 'participant' ? 'column' : 'participant')
                  setSource(undefined)
                }}              
              />
              <span className="font-light text-sm">Participant</span>
            </div>
            
            {mode === 'column' ? (
              <div className="flex flex-row gap-2 items-center text-nowrap">
                <span>Column:</span>
                <Dropdown
                  inline
                  label={source?.header ?? 'Column'}
                >
                  {props.table.columns
                    .filter((column) => column.id !== props.columnId && column.type === 'user')
                    .map((column) => {
                      return (
                        <Dropdown.Item
                          onClick={() => setSource({id: column.id, header: column.header})}
                        >
                          {column.header}
                        </Dropdown.Item>
                      )
                    })

                  }
                </Dropdown>
              </div>
          ) : (
            <div className="flex flex-row gap-2 items-center text-nowrap">
              <span>Participant:</span>
              <Dropdown
                inline
                label={source?.header ?? 'Participant'}
              >
                {props.participants
                  .filter((participant) => participant.id !== source?.id && participant.email)
                  .map((participant) => {
                    return (
                      <Dropdown.Item
                        onClick={() => setSource({id: participant.id, header: participant.email! })}
                      >
                        {participant.email}
                      </Dropdown.Item>
                    )
                  })
                }
              </Dropdown>
            </div>
          )}
          </div>
        </div>
      )}
    </td>
  )
}