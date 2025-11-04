import { ComponentProps, Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Participant, Table, Timeslot, UserData, UserProfile, UserTag } from "../../../types";
import { HiOutlineCalendar, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineTag, HiOutlineXMark } from "react-icons/hi2";
import { currentDate, DAY_OFFSET, defaultColumnColors, formatTime, textInputTheme } from "../../../utils";
import { formatParticipantName } from "../../../functions/clientFunctions";
import { useMutation, useQueries, UseQueryResult } from "@tanstack/react-query";
import { getTimeslotByIdQueryOptions, registerTimeslotMutation, RegisterTimeslotMutationParams } from "../../../services/timeslotService";
import { DateInput } from "../../common/DateInput";
import { createTimeString } from "../../timeslot/Slot";
import { Dropdown, Radio, TextInput } from "flowbite-react";
import NotificationComponent from "../../timeslot/NotificationComponent";
import { ConfirmationModal } from "../../modals";
import Loading from "../../common/Loading";

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
  tagsQuery: UseQueryResult<UserTag[] | undefined, Error>
  updateParticipant: (
    timeslot: Timeslot,
    participantId: string,
    userEmail: string,
    tempUser: boolean
  ) => void,
  selectedDate: Date
  updateDateSelection: Dispatch<SetStateAction<Date>>
  updateTagSelection: Dispatch<SetStateAction<UserTag | undefined>>
  rowIndex: number,
  columnId: string,
}

export const DateCell = (props: DateCellProps) => {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [foundParticipant, setFoundParticipant] = useState<{ user: UserProfile, participant: Participant }  | undefined>()
  const [availableTimeslots, setAvailableTimeslots] = useState<Timeslot[]>(props.timeslotsQuery.data ?? [])
  const [availableTags, setAvailableTags] = useState<UserTag[]>(props.tagsQuery.data ?? [])
  const [filterOption, setFilterOption] = useState<'date' | 'tag'>('date')
  const [selectedTag, setSelectedTag] = useState<UserTag>()
  const [tagSearch, setTagSearch] = useState<string>('')
  const [registerConfirmationVisible, setRegisterConfirmationVisible] = useState(false)
  const selectedTimeslot = useRef<Timeslot | null>(null)
  const [notify, setNotify] = useState<boolean>(true)
  
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

  useEffect(() => {
    if(props.tagsQuery.data) {
      setAvailableTags(props.tagsQuery.data)
    }
  }, [
    props.tagsQuery
  ])

  // const updateParticipant = useMutation({
  //   mutationFn: (params: UpdateParticipantMutationParams) => updateParticipantMutation(params)
  // })

  const registerTimeslot = useMutation({
    mutationFn: (params: RegisterTimeslotMutationParams) => registerTimeslotMutation(params)
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

  const filteredTags = availableTags.filter((tag) => tag.name.trim().toLocaleLowerCase().includes(tagSearch.trim().toLocaleLowerCase()))
  const timeslotRecord: Record<number, Timeslot> = Object.fromEntries(availableTimeslots.map((timeslot) => [timeslot.start.getTime(), timeslot]))
  const selectedTimeslotParticipant = [...props.userData.users, ...props.userData.tempUsers]
    .reduce((prev, cur) => {
      if(!prev.some((profile) => profile.email === cur.email)) {
        prev.push(cur)
      }
      return prev
    }, [] as UserProfile[])
    .flatMap((profile) => profile.participant)
    .reduce((prev, cur) => {
      if(!prev.some((participant) => participant.id !== cur.id)) {
        prev.push(cur)
      }
      return prev
    }, [] as Participant[])
    .find((participant) => participant.id === selectedTimeslot.current?.participantId)

  return (
    <>
      {foundParticipant && (
        <ConfirmationModal 
          open={registerConfirmationVisible} 
          onClose={() => setRegisterConfirmationVisible(false)} 
          confirmText="Schedule"
          denyText="Back"
          confirmAction={() => {
            if(selectedTimeslot.current && foundParticipant) {
              registerTimeslot.mutateAsync({
                timeslot: {
                  ...selectedTimeslot.current,
                  register: foundParticipant.user.email,
                  participantId: foundParticipant.participant.id,
                },
                notify: notify,
                options: {
                  logging: true
                }
              })
              //update state
              props.updateParticipant(
                  selectedTimeslot.current,
                  foundParticipant.participant.id,
                  foundParticipant.user.email,
                  props.tempUsersQuery.data?.some((user) => user.email === foundParticipant.user.email) ?? false
                )
            }
          }}
          children={(<NotificationComponent setNotify={setNotify} email={foundParticipant?.user.email} notify={notify} />)}
          title="Confirm Timeslot Selection" 
          body={`<b>Registration for Timeslot: ${selectedTimeslot.current?.start.toLocaleDateString("en-us", { timeZone: 'America/Chicago' })} at ${formatTime(selectedTimeslot.current?.start, {timeString: true})} - ${formatTime(selectedTimeslot.current?.end, {timeString: true})}.</b>\nMake sure that this is the right timeslot for you, since you only have one!\nRescheduling is only allowed up until one day in advance.${selectedTimeslot.current?.register || selectedTimeslot.current?.participantId ? `\nThis timeslot is currently registered to ${
            selectedTimeslot.current.register ? 
              selectedTimeslot.current.register 
            : 
              selectedTimeslotParticipant !== undefined ? 
                formatParticipantName(selectedTimeslotParticipant) 
              : 
                'Unknown'
            }, continuing will override the current registrant.` : ""}`}
        />
      )}
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
                <span>Pick Timeslot(s)</span>
              )}
              <div className="flex flex-row gap-1 items-center">
                {filterOption === 'date' ? (
                  <button
                    onClick={() => {
                      setFilterOption('tag')
                      setSelectedTag(undefined)
                      props.updateTagSelection(undefined)
                    }}
                  >
                    <HiOutlineTag size={16} className="text-gray-400 hover:text-gray-800" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setFilterOption('date')
                      props.updateDateSelection(currentDate)
                      props.updateTagSelection(undefined)
                      setSelectedTag(undefined)
                    }}
                  >
                    <HiOutlineCalendar size={16} className="text-gray-400 hover:text-gray-800" />
                  </button>
                )}
                <button 
                  className=""
                  onClick={() => {
                    setIsFocused(false)
                  }}
                >
                  <HiOutlineXMark size={16} className="text-gray-400 hover:text-gray-800" />
                </button>
              </div>
            </div>
            {props.tagsQuery.isLoading || props.usersQuery.isLoading || props.tempUsersQuery.isLoading ? (  
              <div className="flex flex-row">
                <span>Loading</span>
                <Loading />
              </div>
            ) : ( 
              <>
                <div className="w-full px-2 py-2 flex flex-row gap-2 justify-between border-b">
                  {filterOption === 'tag' ? (
                    <>
                      <div />
                      {/* TODO: convert me to a tag picker */}
                        <Dropdown 
                          dismissOnClick={false}
                          // onChange={(event) => event.stopPropagation()}
                          label={selectedTag ? (
                            <span 
                              className={`
                                bg-${selectedTag.color ? defaultColumnColors[selectedTag.color].bg : 'white'} 
                                text-${selectedTag.color ? defaultColumnColors[selectedTag.color].text : 'black'}
                              `}
                            >{selectedTag.name}</span>
                          ) : (
                            'Pick Tag'
                          )}
                          size="xs"
                          color="light"
                          placement="left"
                        >
                          <div className="max-h-[150px] overflow-auto ">
                            <div className="py-1 px-2">
                              <TextInput 
                              // key press and stop the propegation
                                theme={textInputTheme}
                                sizing="sm"
                                type="text"
                                placeholder="Search..."
                                value={tagSearch}
                                onKeyDown={(event) => {
                                  event.stopPropagation()
                                }}
                                onChange={(event) => setTagSearch(event.target.value)}
                                className="w-full"
                              />
                            </div>
                            <Dropdown.Divider />
                            {filteredTags.length > 0 ? (
                              filteredTags.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                              .map((tag, index) => {
                                return (
                                  <Dropdown.Item 
                                    key={index} 
                                    onClick={() => {
                                      setSelectedTag(tag)
                                      props.updateTagSelection(tag)
                                    }} 
                                    className={`
                                      bg-${tag.color ? defaultColumnColors[tag.color].bg : 'white'} 
                                      text-${tag.color ? defaultColumnColors[tag.color].text : 'black'}
                                      ${tag.color ? defaultColumnColors[tag.color].hover : ''}
                                      flex flex-row items-center gap-2
                                    `}
                                  >
                                    <Radio readOnly onClick={() => {
                                      setSelectedTag(tag)
                                      props.updateTagSelection(tag)
                                    }} checked={selectedTag?.id === tag.id} className={`text-${tag.color ?? 'black'}`}/>
                                    <span>{tag.name}</span>
                                  </Dropdown.Item>
                                )
                              })
                            ) : (
                              <Dropdown.Item disabled>No Matching Tags</Dropdown.Item>
                            )}
                          </div>
                        </Dropdown>
                      <div />
                    </>
                  ) : (
                    <>
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
                      <DateInput 
                        value={props.selectedDate}
                        onChange={props.updateDateSelection}
                      />
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
                    </>
                  )}
                </div>
                <div className="flex flex-col gap-2 px-2 py-2 max-h-[150px] overflow-auto">
                  {availableTimeslots.length == 0 || (filterOption === 'tag' && selectedTag === undefined) ? (
                    <div className="flex flex-col w-full items-center py-1">
                      <span className="text-nowrap">{filterOption === 'tag' && selectedTag === undefined ? 
                        "Pick a Tag to View Timeslots" 
                      : 
                        `No Timeslots for this ${selectedTag ? 'Tag' : 'Date'}.`
                      }</span>
                    </div>
                  ) : (
                    filterOption === 'tag' ? (
                      availableTimeslots.flatMap((timeslot) => timeslot.start).sort((a, b) => {
                        const diffA = Math.abs(a.getTime() - currentDate.getTime());
                        const diffB = Math.abs(b.getTime() - currentDate.getTime());
                        return diffA - diffB;
                      }).map((date, index) => {
                        const timeslot = timeslotRecord[date.getTime()]
                        return (
                          <button 
                            className="flex flex-col border w-full rounded-lg items-center py-1 hover:bg-gray-100" 
                            key={index} 
                            onClick={() => {
                              if(foundParticipant) {
                                selectedTimeslot.current = timeslot
                                setRegisterConfirmationVisible(true)
                              } else {
                                props.updateValue(timeslot.id)
                                registerTimeslot.mutateAsync({
                                  timeslot: {
                                    ...timeslot,
                                    register: 'placeholder',
                                    participantId: undefined,
                                  },
                                  notify: notify,
                                  options: {
                                    logging: true
                                  }
                                })
                              }
                            }}
                          >
                            <span className={`whitespace-nowrap text-nowrap ${timeslot.participantId !== undefined || timeslot.register !== undefined ? 'line-through' : ''}`}>{formatTime(timeslot.start, {timeString: false})}</span>
                            <span className={`text-xs whitespace-nowrap text-nowrap ${timeslot.participantId != undefined || timeslot.register !== undefined ? 'line-through' : ''}`}>{createTimeString(timeslot)}</span>
                          </button>
                        )
                      })
                    ) : (
                      availableTimeslots.map((timeslot, index) => {
                        return (
                          <button 
                            className="flex flex-col border w-full rounded-lg items-center py-1" 
                            key={index} 
                            onClick={() => {
                              selectedTimeslot.current = timeslot
                              setRegisterConfirmationVisible(true)
                            }}
                          >
                            <span className={`whitespace-nowrap text-nowrap ${timeslot.participantId ? 'line-through' : ''}`}>{formatTime(timeslot.start, {timeString: false})}</span>
                            <span className={`text-xs whitespace-nowrap text-nowrap ${timeslot.participantId ? 'line-through' : ''}`}>{createTimeString(timeslot)}</span>
                          </button>
                        )
                      })
                    )
                  )}
                </div>
              </>
            )}
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
    </>
  )
}