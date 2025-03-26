import { ComponentProps, useEffect, useState } from "react";
import { Participant, Table } from "../../../types";
import { Dropdown, ToggleSwitch, Tooltip } from "flowbite-react";
import { HiOutlineArrowPath, HiOutlineExclamationTriangle, HiOutlineXMark } from "react-icons/hi2";
import { createTimeString } from "../../timeslot/Slot";
import { formatTime } from "../../../utils";

interface DateCellProps extends ComponentProps<'td'> {
  value: string,
  updateValue: (text: string) => void,
  table: Table,
  participants: Participant[],
  rowIndex: number,
  columnId: string,
}

export const DateCell = (props: DateCellProps) => {
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

  const tempSource = props.participants.find((participant) => {
    if(mode === 'column' && source) {
      const columnSource = props.table.columns.find((column) => column.id === source.id)
      if(!columnSource) return
      return participant.email === columnSource.values[props.rowIndex]
    }
    else if(source) {
      return participant.id === source.id
    }
  })

  const inputValue = (() => {
    if(participantSource) {
      return `Timeslots: ${participantSource.timeslot?.reduce((prev) => (prev += 1), 0) ?? 0}`
    }
    return ''
  })()

  return (
    <td className="text-ellipsis border py-3 px-3 max-w-[150px]">
      <input
        placeholder="Pick Source..."
        className="
          font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 
          border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic
          hover:cursor-pointer
        "
        value={inputValue}
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
                    .map((column, index) => {
                      return (
                        <Dropdown.Item
                          key={index}
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
                    .map((participant, index) => {
                      return (
                        <Tooltip 
                          style="light"
                          content={(
                            <div className="flex flex-col" key={index}>
                              <span className="underline text-sm">Participant:</span>
                              <div className="flex flex-row gap-2 items-center text-nowrap text-sm">
                                <span>First Name:</span>
                                <span className="italic">{participant.firstName}</span>
                              </div>
                              {participant.preferredName && (
                                <div className="flex flex-row gap-2 items-center text-nowrap">
                                  <span>Preferred Name:</span>
                                  <span className="italic">{participant.preferredName}</span>
                                </div>
                              )}
                              <div className="flex flex-row gap-2 items-center text-nowrap">
                                <span>Last Name:</span>
                                <span className="italic">{participant.lastName}</span>
                              </div>
                              {participant.email && (
                                <div className="flex flex-row gap-2 items-center text-nowrap">
                                  <span>Email:</span>
                                  <span className="italic">{participant.email}</span>
                                </div>
                              )}
                              <div className="border-gray-300 border mb-1"/>
                            </div>
                          )}                        
                        >
                          <Dropdown.Item
                          onClick={() => setSource({id: participant.id, header: participant.email! })}
                          >
                            {participant.email}
                          </Dropdown.Item>
                        </Tooltip> 
                      )
                    })
                  }
                </Dropdown>
              </div>
            )}
            {tempSource && mode === 'column' && tempSource.email ? (
              <span className="italic underline underline-offset-2">{tempSource.email}</span>
            ) : (
              !tempSource && source && (
                <div className="flex flex-row items-center gap-1">
                  <HiOutlineExclamationTriangle size={20} className="text-red-400"/>
                  <span className="italic text-red-400">Invalid Participant</span>
                </div>
              )
            )}
            {source && (
              tempSource && (tempSource.timeslot ?? []).length > 0 ? (
                <div className="flex flex-col gap-2 px-2 border rounded-lg py-2">
                  <span>Found Timeslots:</span>
                  {tempSource.timeslot?.map((timelsot, index) => {
                    return (
                      <div className="flex flex-col border w-full rounded-lg items-center py-1" key={index}>
                        <span className="whitespace-nowrap text-nowrap">{formatTime(timelsot.start, {timeString: false})}</span>
                        <span className="text-xs whitespace-nowrap text-nowrap">{createTimeString(timelsot)}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div>
                  <span>No Timeslots Found.</span>
                </div>
              )
            )}
            <div className="flex flex-row self-end gap-2 items-center me-2">
              {props.value !== '' && (
                <button
                  className="border rounded-lg px-3 py-0.5 enabled:hover:bg-gray-100 enabled:hover:border-gray-300"
                  onClick={() => {
                    setMode('column')
                    setSource(undefined)
                    setValue(props.value)
                  }}
                >
                  <span>Cancel</span>
                </button>
              )}
              <button
                className="border rounded-lg px-3 py-0.5 enabled:hover:bg-gray-100 enabled:hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-75"
                disabled={!tempSource}
                onClick={() => {
                  if(tempSource) {
                    setMode('column')
                    setSource(undefined)
                    setValue(tempSource.id)
                    props.updateValue(tempSource.id)
                  }
                }}
              >
                <span>Create</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {isFocused && participantSource && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col min-w-[200px]">
          <div className="w-full whitespace-nowrap border-b py-1 px-2 mb-2 text-base self-center flex flex-row justify-between">
            <span className="">{participantSource.firstName} {participantSource.lastName}</span>
            <div className="flex flex-row gap-1">
              <button
                title="Update Connection"
                onClick={() => setValue('')}
              >
                <HiOutlineArrowPath size={16} className="text-gray-400"/>
              </button>
              <button 
                className=""
                onClick={() => {
                  setIsFocused(false)
                }}
              >
                <HiOutlineXMark size={16} className="text-gray-400"/>
              </button>
            </div>
          </div>
          <div className="px-2 mb-2">
            {(participantSource.timeslot ?? []).length > 0 ? (
              <div className="flex flex-col gap-2 px-2 border rounded-lg py-2">
                <span>Found Timeslots:</span>
                {participantSource.timeslot?.map((timelsot, index) => {
                  return (
                    <div className="flex flex-col border w-full rounded-lg items-center py-1" key={index}>
                      <span className="whitespace-nowrap text-nowrap">{formatTime(timelsot.start, {timeString: false})}</span>
                      <span className="text-xs whitespace-nowrap text-nowrap">{createTimeString(timelsot)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div>
                <span>No Timeslots Found.</span>
              </div>
            )}
          </div>
          
        </div>
      )}
    </td>
  )
}