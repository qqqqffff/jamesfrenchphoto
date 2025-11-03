import { ComponentProps, Dispatch, SetStateAction, useEffect, useState } from "react";
import { Participant, Table, Timeslot, UserData, UserProfile } from "../../../types";
import { HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineXMark } from "react-icons/hi2";
import { DAY_OFFSET, formatTime } from "../../../utils";
import { formatParticipantName } from "../../../functions/clientFunctions";
import { useMutation, useQueries, UseQueryResult } from "@tanstack/react-query";
import { updateParticipantMutation, UpdateParticipantMutationParams } from "../../../services/userService";
import { getTimeslotByIdQueryOptions } from "../../../services/timeslotService";

interface DateCellProps extends ComponentProps<'td'> {
  value: string,
  updateValue: (text: string) => void,
  table: Table,
  linkedParticipantId?: string,
  tempUsersQuery: UseQueryResult<UserProfile[] | undefined, Error>
  userData: {
    users: UserProfile[]
    tempUsers: UserProfile[]
  }
  usersQuery: UseQueryResult<UserData[] | undefined, Error>
  timeslotsQuery: UseQueryResult<Timeslot[], Error>
  updateParticipant: (
    timeslot: Timeslot,
    participantId: string,
    userEmail: string,
    tempUser: boolean
  ) => void,
  selectedDate: Date
  updateDateSelection: Dispatch<SetStateAction<Date>>
  rowIndex: number,
  columnId: string,
}

export const DateCell = (props: DateCellProps) => {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [foundParticipant, setFoundParticipant] = useState<{ user: UserProfile, participant: Participant }  | undefined>()
  const [availableTimeslots, setAvailableTimeslots] = useState<Timeslot[]>(props.timeslotsQuery.data ?? [])
  
  useEffect(() => {
    if(props.value !== value){
      setValue(props.value)
    }
  }, [props.value])

  useEffect(() => {
    setFoundParticipant((_) => {
      if(!props.linkedParticipantId) return undefined
      let user: UserProfile | undefined
      let participant = props.userData.users
        .flatMap((user) => user.participant)
        .find((participant) => participant.id === props.linkedParticipantId)
      if(!participant) {
        participant = props.userData.tempUsers
          .flatMap((user) => user.participant)
          .find((participant) => participant.id === props.linkedParticipantId)

        if(participant) {
          user = props.userData.tempUsers.find((profile) => profile.email === participant?.userEmail)!
          return ({
            participant: participant,
            user: user
          })
        }
      }
      else {
        user = props.userData.users.find((profile) => profile.email === participant?.userEmail)!
        return ({
          participant: participant,
          user: user
        })
      }
      return undefined
    })
  }, [
    props.linkedParticipantId
  ])

  useEffect(() => {
    if(props.timeslotsQuery.data) {
      setAvailableTimeslots(props.timeslotsQuery.data)
    }
  }, [
    props.timeslotsQuery.data
  ])

  const updateParticipant = useMutation({
    mutationFn: (params: UpdateParticipantMutationParams) => updateParticipantMutation(params)
  })

  const cellTimeslotIds = (value.split(',') ?? []).filter((timeslotId) => timeslotId !== '')
  const cellTimeslotQueries = useQueries({
    queries: cellTimeslotIds.map((timeslotId) => {
      return getTimeslotByIdQueryOptions(timeslotId, { siTag: true })
    })
  })

  const timeslotValue = (() => {
    if(cellTimeslotQueries.some((query) => query.isLoading)) return 'Loading...'
    if(cellTimeslotIds.length == 0) return 'No Timeslots'
    if(cellTimeslotIds.length > 0) {
      return `Timeslots: ${cellTimeslotQueries
        .map((query) => query.data)
        .filter((query) => query !== null && query !== undefined).length
      }`
    }
    return ''
  })()

  return (
    <td className="text-ellipsis border py-3 px-3 max-w-[150px]">
      <input
        placeholder="Pick Timeslots..."
        className="
          font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 
          border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic
          hover:cursor-pointer
        "
        value={timeslotValue}
        onFocus={() => setIsFocused(true)}
        readOnly
      />
      {isFocused && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col min-w-[200px]">
          <div className="w-full whitespace-nowrap border-b p-1 text-base self-center flex flex-row justify-between">
            {foundParticipant ? (
              <span>Linked with: {formatParticipantName(foundParticipant.participant)}</span>
            ) : (
              <span>Pick Tag(s)</span>
            )}
            <div className="flex flex-row gap-1 items-center">
              <button 
                className=""
                onClick={() => {
                  setIsFocused(false)
                }}
              >
                <HiOutlineXMark size={16} className="text-gray-400 hover:text-gray-800"/>
              </button>
            </div>
          </div>
          <div className="w-full px-2 py-2 flex flex-row gap-2 justify-between border-b">
            <div className="flex flex-row"> 
              <button
                // one month back
                title="Go Back One Month"
                onClick={() => {
                  const result = new Date(props.selectedDate)
                  const date = result.getDate()
                  result.setDate(1)
                  result.setMonth(result.getMonth() - 1)
                  result.setDate(Math.min(date, new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()))

                  props.updateDateSelection(result)
                }}
              >
                <HiOutlineChevronLeft />
              </button>
              <button
                // one week back
                title="Go Back One Week"
                onClick={() => {
                  props.updateDateSelection(new Date(props.selectedDate.getTime() - (DAY_OFFSET * 7)))
                }}
              >
                <HiOutlineChevronLeft />
              </button>
              <button
              // one day back
                title="Go Back One Day"
                onClick={() => {
                  props.updateDateSelection(new Date(props.selectedDate.getTime() - DAY_OFFSET))
                }}
              >
                <HiOutlineChevronLeft />
              </button>
            </div>
            {/* TODO: change me to use DateInput */}
            <span>{formatTime(props.selectedDate, {timeString: false})}</span> 
            <div className="flex flex-row"> 
              <button
                //one day forward
                title="Go Forward One Day"
                onClick={() => {
                  props.updateDateSelection(new Date(props.selectedDate.getTime() + DAY_OFFSET))
                }}
              >
                <HiOutlineChevronRight />
              </button>
              <button
                //one week forward
                title="Go Forward One Week"
                onClick={() => {
                  props.updateDateSelection(new Date(props.selectedDate.getTime() + (DAY_OFFSET * 7)))
                }}
              >
                <HiOutlineChevronRight />
              </button>
              <button
                //one month
                title="Go Forward One Month"
                onClick={() => {
                  const result = new Date(props.selectedDate)
                  const date = result.getDate()
                  result.setDate(1)
                  result.setMonth(result.getMonth() + 1)
                  result.setDate(Math.min(date, new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()))
                  
                  props.updateDateSelection(result)
                }}
              >
                <HiOutlineChevronRight />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* {isFocused && participantSource && (
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
      )} */}
    </td>
  )
}