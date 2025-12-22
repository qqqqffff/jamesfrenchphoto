import { ComponentProps, Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Participant, Table, Timeslot, UserData, UserProfile, UserTag } from "../../../types";
import { HiOutlineCalendar, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineTag, HiOutlineXMark } from "react-icons/hi2";
import { currentDate, DAY_OFFSET, defaultColumnColors, formatTime, textInputTheme } from "../../../utils";
import { formatParticipantName } from "../../../functions/clientFunctions";
import { UseMutationResult, useQueries, UseQueryResult } from "@tanstack/react-query";
import { TimeslotService, AdminRegisterTimeslotMutationParams } from "../../../services/timeslotService";
import { DateInput } from "../../common/DateInput";
import { formatTimeslotDates } from "../../../utils";
import { Dropdown, Label, Radio, TextInput, Tooltip } from "flowbite-react";
import NotificationComponent from "../../timeslot/NotificationComponent";
import { ConfirmationModal } from "../../modals";
import Loading from "../../common/Loading";
import validator from 'validator'

interface DateCellProps extends ComponentProps<'td'> {
  TimeslotService: TimeslotService
  value: string,
  updateValue: (text: string, skipLinks: boolean) => void,
  table: Table,
  linkedParticipantId?: string,
  userData: {
    users: UserProfile[]
    tempUsers: UserProfile[]
  }
  setUsers: Dispatch<SetStateAction<UserData[]>>
  setTempUsers: Dispatch<SetStateAction<UserProfile[]>>
  tempUsersQuery: UseQueryResult<UserProfile[] | undefined, Error>
  usersQuery: UseQueryResult<UserData[] | undefined, Error>
  timeslotsQuery: UseQueryResult<Timeslot[], Error>
  tagsQuery: UseQueryResult<UserTag[] | undefined, Error>
  selectedDate: Date,
  updateDateSelection: Dispatch<SetStateAction<Date>>
  updateTagSelection: Dispatch<SetStateAction<UserTag | undefined>>
  registerTimeslot: UseMutationResult<Timeslot | null, Error, AdminRegisterTimeslotMutationParams, unknown>
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
  const [notifyEmail, setNotifyEmail] = useState<string>('')
  const [additionalRecipients, setAdditionalRecipients] = useState<string[]>([])
  
  useEffect(() => {
    if(!props.registerTimeslot.isPending) {
      let parentValue = props.value !== value ? props.value : value
      let foundUser: { user: UserProfile, participant: Participant } | undefined = foundParticipant

      if(
        props.linkedParticipantId !== undefined && 
        (foundUser === undefined || foundUser.participant.id !== props.linkedParticipantId)
      ) {
        foundUser = (() => {
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
        })() 
      }

      //one directional validation of participant timeslots to cell value
      if(foundUser !== undefined) {
        let participantTimeslotIdMap = (foundUser.participant.timeslot ?? [])
          .reduce((prev, cur) => prev + ',' + cur.id, '')
        participantTimeslotIdMap = participantTimeslotIdMap.charAt(0) === ',' ? participantTimeslotIdMap.substring(1) : participantTimeslotIdMap
        if(participantTimeslotIdMap !== parentValue) {
          parentValue = participantTimeslotIdMap
          props.updateValue(participantTimeslotIdMap, true)
        }
      }

      setValue(prev => parentValue !== prev ? parentValue : prev)
      setFoundParticipant(prev => foundUser !== undefined ? foundUser : prev)
      setAvailableTimeslots(prev => props.timeslotsQuery.data ? props.timeslotsQuery.data : prev)
      setAvailableTags(prev => props.tagsQuery.data ? props.tagsQuery.data : prev)
    }
  }, [
    props.value,
    props.linkedParticipantId,
    props.timeslotsQuery.data,
    props.tagsQuery,
    props.registerTimeslot.isPending,
  ])
  
  // const updateParticipant = useMutation({
  //   mutationFn: (params: UpdateParticipantMutationParams) => updateParticipantMutation(params)
  // })

  const cellTimeslotIds = (value.split(',') ?? []).filter((timeslotId) => timeslotId !== '')
  const cellTimeslotQueries = useQueries({
    queries: cellTimeslotIds.map((timeslotId) => {
      return props.TimeslotService.getTimeslotByIdQueryOptions(timeslotId, { siTag: true })
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
  const filteredTimeslots = availableTimeslots.filter((timeslot) => {
    if(filterOption === 'date') {
      const timeslotDate = new Date(timeslot.start)
      return (
        timeslotDate.getFullYear() === props.selectedDate.getFullYear() &&
        timeslotDate.getMonth() === props.selectedDate.getMonth() &&
        timeslotDate.getDate() === props.selectedDate.getDate()
      )
    }
    else if(filterOption === 'tag' && selectedTag !== undefined) {
      return timeslot.tag?.id === selectedTag.id
    }
    else if(filterOption === 'tag' && selectedTag === undefined) {
      return timeslot.tag === undefined
    }
  })
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

  const cellColoring = props.rowIndex % 2 ? foundParticipant ? 'bg-yellow-200 bg-opacity-40' : 'bg-gray-200 bg-opacity-40' : foundParticipant ? 'bg-yellow-100 bg-opacity-20' : '';

  return (
    <>
      {selectedTimeslot.current && (
        //if the cell does not own the selected ts id the register for it
      !cellTimeslotIds.some((id) => id === selectedTimeslot.current?.id) ? 
      (
        <ConfirmationModal 
          open={registerConfirmationVisible} 
          onClose={() => setRegisterConfirmationVisible(false)} 
          confirmText="Schedule"
          denyText="Back"
          confirmAction={() => {
            //TODO: search for other areas with the edge case of having a register but no participantId
            if(selectedTimeslot.current && foundParticipant) {
              props.registerTimeslot.mutate({
                timeslot: selectedTimeslot.current.id,
                userEmail: foundParticipant.user.email,
                participantId: foundParticipant.participant.id,
                additionalRecipients: foundParticipant.participant.contact && foundParticipant.participant.email ? [foundParticipant.participant.email] : [],
                unregister: false,
                notify: notify && 
                  ((
                    !foundParticipant && 
                    validator.isEmail(notifyEmail)
                  ) || foundParticipant !== undefined),
                options: {
                  logging: true
                }
              })


              
              //update state
              let newValue = cellTimeslotIds
                .filter((id) => id !== selectedTimeslot.current?.id)
                .reduce((prev, cur) => {
                  return prev + ',' + cur
                }, '')

              props.updateValue((newValue.charAt(0) === ',' ? newValue.substring(1) : newValue) + (cellTimeslotIds.length > 0 ? ',' : '') + selectedTimeslot.current.id, false)
            }
          }}
          children={!foundParticipant ? (
            <div className="flex flex-row items-center gap-2 mt-2">
              <Label>Person to notify:</Label>
              <TextInput 
                theme={textInputTheme}
                placeholder="Parent's email"
                sizing="sm"
                className="w-[256px]"
                onChange={(event) => setNotifyEmail(event.target.value)}
                value={notifyEmail}
              />
            </div>
          ) : (
            <NotificationComponent 
              setNotify={setNotify} 
              email={foundParticipant.user.email} 
              notify={notify} 
              recipients={additionalRecipients} 
              setRecipients={setAdditionalRecipients} 
            />
          )}
          title="Confirm Timeslot Selection" 
          body={`<b>Registration for Timeslot: ${selectedTimeslot.current.start.toLocaleDateString("en-us", { timeZone: 'America/Chicago' })} at ${formatTime(selectedTimeslot.current.start, {timeString: true})} - ${formatTime(selectedTimeslot.current.end, {timeString: true})}.</b>\nMake sure that this is the right timeslot for you, since you only have one!\nRescheduling is only allowed up until one day in advance.${selectedTimeslot.current.register || selectedTimeslot.current.participantId ? `\nThis timeslot is currently registered to ${
            selectedTimeslot.current.register ? 
              selectedTimeslot.current.register 
            : 
              selectedTimeslotParticipant !== undefined ? 
                formatParticipantName(selectedTimeslotParticipant) 
              : 
                'Unknown'
            }, continuing will override the current registrant.` : ""}`}
        />
      ) : (
        //otherwise remove registration
        <ConfirmationModal
          open={registerConfirmationVisible}
          onClose={() => setRegisterConfirmationVisible(false)}
          confirmText="Confirm"
          denyText="Back"
          confirmAction={async () => {
            //removing register/participant association
            if(selectedTimeslot.current) {
              props.registerTimeslot.mutate({
                timeslot: selectedTimeslot.current.id,
                notify: false,
                unregister: true,
                participantId: '',
                userEmail: '',
                additionalRecipients: [],
                options: {
                  logging: true
                }
              })


              
              //update state
              let newValue = cellTimeslotIds
                .filter((id) => id !== selectedTimeslot.current?.id)
                .reduce((prev, cur) => {
                  return prev + ',' + cur
                }, '')

              props.updateValue(newValue.charAt(0) === ',' ? newValue.substring(1) : newValue, true)
            }
          }}
          title="Confirm Unregistration"
          body={`<b>Unregistration for Timeslot: ${selectedTimeslot.current.start.toLocaleDateString("en-us", { timeZone: 'America/Chicago' })} at ${formatTime(selectedTimeslot.current.start, {timeString: true})} - ${formatTime(selectedTimeslot.current.end, {timeString: true})}.</b>\nAre you sure you want to unregister from this timeslot?`}
        />
      )
      )}
      <td className={`
        text-ellipsis border py-3 px-3 max-w-[150px]
        
        ${cellColoring}
      `}>
        <input
          placeholder="Pick Timeslots..."
          className={`
            font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 
            border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic
            hover:cursor-pointer bg-transparent
          `}
          value={timeslotValue}
          onFocus={() => setIsFocused(true)}
          readOnly
        />
        {isFocused && (
          <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col min-w-[200px]">
            <div className="w-full whitespace-nowrap border-b p-1 text-base self-center flex flex-row justify-between">
              {foundParticipant ? (
                <span className="me-2">Linked with: {formatParticipantName(foundParticipant.participant)}</span>
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
            {props.tagsQuery.isLoading || props.usersQuery.isLoading || props.tempUsersQuery.isLoading || cellTimeslotQueries.some((query) => query.isLoading) ? (  
              <div className="flex flex-row">
                <span>Loading</span>
                <Loading />
              </div>
            ) : ( 
              <>
                <div className="w-full px-2 py-2 flex flex-row gap-2 justify-center border-b">
                  {filterOption === 'tag' ? (
                      // {/* TODO: convert me to a tag picker */}
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
                          filteredTags.sort((a, b) => a.name.localeCompare(b.name))
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
                  {(availableTimeslots.length == 0 || (filterOption === 'tag' && selectedTag === undefined)) && (
                    <div className="flex flex-col w-full items-center py-1">
                      <span className="text-nowrap">{filterOption === 'tag' && selectedTag === undefined ? 
                        "Pick a Tag to View Timeslots" 
                      : 
                        `No Timeslots for this ${selectedTag ? 'Tag' : 'Date'}.`
                      }</span>
                    </div>
                  )}
                  {cellTimeslotQueries.map((query) => query.data).filter((query) => query !== null && query !== undefined).map((timeslot, index) => {
                    return (
                      <button 
                        disabled={props.registerTimeslot.isPending}
                        className="
                          flex flex-col border w-full rounded-lg items-center py-1 
                          enabled:hover:bg-gray-100 bg-gray-300 
                          disabled:bg-gray-200 disabled:cursor-not-allowed
                        "
                        key={index} 
                        onClick={() => {
                          selectedTimeslot.current = timeslot
                          setRegisterConfirmationVisible(true)
                        }}
                      >
                        <span className={`whitespace-nowrap text-nowrap font-semibold`}>{formatTime(timeslot.start, {timeString: false})}</span>
                        <span className={`text-xs whitespace-nowrap text-nowrap font-semibold`}>{formatTimeslotDates(timeslot)}</span>
                      </button>
                    )
                  })}
                  {filteredTimeslots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                    .filter((timeslot) => !cellTimeslotQueries.flatMap((query) => query.data)
                      .filter((timeslot) => timeslot !== null && timeslot !== undefined)
                      .some((cellTimeslot) => cellTimeslot.id === timeslot.id)
                    ).map((timeslot, index) => {
                      const register = [
                        ...props.userData.users,
                        ...props.userData.tempUsers
                      ].find((user) => (
                        user.email === timeslot.register || 
                        user.participant.some((participant) => participant.id === timeslot.participantId))
                      )
                      const foundRegisterParticipant = register !== undefined ? register.participant.find((participant) => participant.id === timeslot.participantId) : undefined
                      const tag = availableTags.find((tag) => tag.id === timeslot.tag?.id)

                      return (
                        <Tooltip
                          key={index}
                          style="light"
                          theme={{ target: undefined }}
                          content={(
                            <div className="text-xs italic text-gray-700 whitespace-nowrap flex flex-col">
                              {register !== undefined && (<span>{foundRegisterParticipant ? formatParticipantName(foundRegisterParticipant) : register.email}</span>)}
                              {tag !== undefined ? (
                                <span className={`text-${tag.color ?? 'black'}`}>{tag.name}</span>
                              ) : (
                                <span>No Tag</span>
                              )}
                            </div>
                          )}
                        >
                          <button 
                            disabled={props.registerTimeslot.isPending}
                            className={`
                              flex flex-col border w-full rounded-lg items-center py-1 enabled:hover:bg-gray-100
                              disabled:bg-gray-200 disabled:cursor-not-allowed
                              text-${tag?.color ?? 'black'}
                            `}
                            onClick={() => {
                              selectedTimeslot.current = timeslot
                              setRegisterConfirmationVisible(true)
                            }}
                          >
                            <span className={`whitespace-nowrap text-nowrap ${timeslot.participantId !== undefined || timeslot.register !== undefined ? 'line-through' : ''}`}>{formatTime(timeslot.start, {timeString: false})}</span>
                            <span className={`text-xs whitespace-nowrap text-nowrap ${timeslot.participantId != undefined || timeslot.register !== undefined ? 'line-through' : ''}`}>{formatTimeslotDates(timeslot)}</span>
                          </button>
                        </Tooltip>
                      )
                    })
                  }
                </div>
              </>
            )}
          </div>
        )}
      </td>
    </>
  )
}