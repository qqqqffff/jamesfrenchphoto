import { ComponentProps, useEffect, useState } from "react";
import { Participant, Table, TableColumn, UserData, UserProfile } from "../../../types";
import { Dropdown, Tooltip } from "flowbite-react";
import { HiOutlineArrowPath, HiOutlineXMark } from "react-icons/hi2";
import { createTimeString } from "../../timeslot/Slot";
import { formatTime } from "../../../utils";
import { formatParticipantName } from "../../../functions/clientFunctions";
import { ParticipantPanel } from "../../common/ParticipantPanel";
import { UseQueryResult } from "@tanstack/react-query";

interface DateCellProps extends ComponentProps<'td'> {
  value: string,
  updateValue: (text: string) => void,
  userQuery: UseQueryResult<UserData[] | undefined, Error>,
  tempUserQuery: UseQueryResult<UserProfile[] | undefined, Error>,
  table: Table,
  participants: Participant[],
  choiceColumn?: TableColumn
  rowIndex: number,
  columnId: string,
}

export const DateCell = (props: DateCellProps) => {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [source, setSource] = useState<string>()
  
  useEffect(() => {
    if(props.value !== value){
      setValue(props.value)
    }
  }, [props.value])

  const participantSource = props.participants.find((participant) => participant.id === value)
  const undefinedSource = participantSource === undefined

  const tempSource = props.participants.find((participant) => participant.id === source)

  const inputValue = (() => {
    if((props.userQuery.isLoading || props.tempUserQuery.isLoading) && undefinedSource) return 'Loading...'
    if(props.choiceColumn && props.value === '') return 'No Participant'
    if(props.choiceColumn && props.value !== '' && undefinedSource) return 'Broken Source'
    if(!props.choiceColumn && props.value !== '' && undefinedSource) return 'Invalid Source'
    if(participantSource && (participantSource.timeslot ?? []).length == 0) return 'No Timeslots'
    if(participantSource && (participantSource.timeslot ?? []).length > 0) {
      return `Timeslots: ${(participantSource.timeslot ?? []).length}`
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
            <div className="flex flex-row gap-2 items-center text-nowrap">
              <span>Participant:</span>
              <Dropdown
                inline
                label={tempSource ? formatParticipantName(tempSource) : 'Pick Participant'}
              >
                {props.participants
                  .filter((participant) => participant.id !== source)
                  .map((participant, index) => {
                    return (
                      <Tooltip 
                        key={index}
                        style="light"
                        content={(
                          <ParticipantPanel 
                            participant={participant}
                            showOptions={{
                              timeslot: true
                            }}
                            hiddenOptions={{
                              tags: true
                            }}
                          />
                        )}                        
                      >
                        <Dropdown.Item
                          onClick={() => setSource(participant.id)}
                        >
                          {formatParticipantName(participant)}
                        </Dropdown.Item>
                      </Tooltip> 
                    )
                  })
                }
              </Dropdown>
            </div>
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
                    setSource(undefined)
                    setValue(tempSource.id)
                    props.updateValue(tempSource.id)
                  }
                }}
              >
                <span>Sync</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {isFocused && participantSource && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col min-w-[200px]">
          <div className="w-full whitespace-nowrap border-b py-1 px-2 mb-2 text-base self-center flex flex-row justify-between">
            <span className="">{formatParticipantName(participantSource)}</span>
            <div className="flex flex-row gap-1">
              {!props.choiceColumn && (
                <button
                  title="Update Connection"
                  onClick={() => setValue('')}
                >
                  <HiOutlineArrowPath size={16} className="text-gray-400"/>
                </button>
              )}
              <button 
                className=""
                onClick={() => setIsFocused(false)}
              >
                <HiOutlineXMark size={16} className="text-gray-400"/>
              </button>
            </div>
          </div>
          <div className="px-2 mb-2">
            {(participantSource.timeslot ?? []).length > 0 ? (
              <div className="flex flex-col gap-2 px-2 border rounded-lg py-2">
                <span>Found Timeslot{(participantSource.timeslot ?? []).length > 1 ? 's' : ''}:</span>
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