import { useMutation, UseQueryResult } from "@tanstack/react-query"
import { Participant, Table, TableColumn, UserData, UserTag } from "../../../types"
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import { Tooltip } from "flowbite-react"
import { ParticipantPanel } from "../../common/ParticipantPanel"
import Loading from "../../common/Loading"
import { HiOutlinePlusCircle, HiOutlineXMark } from "react-icons/hi2"
import { CreateParticipantWindow } from "./CreateParticipantWindow"
import { createParticipantMutation, CreateParticipantParams } from "../../../services/userService"
import { formatParticipantName } from "../../../functions/clientFunctions"

interface ParticipantCellProps {
  userData: UserData[]
  userDataQuery: UseQueryResult<UserData[] | undefined, Error>
  updateValue: (text: string) => void
  value: string,
  table: Table,
  rowIndex: number,
  tagsQuery: UseQueryResult<UserTag[] | undefined, Error>
  updateUserProfiles: Dispatch<SetStateAction<UserData[]>>
  choiceColumn?: TableColumn
}

export const ParticipantCell = (props: ParticipantCellProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [value, setValue] = useState('')
  const [displayCreateParticipant, setDisplayCreateParticipant] = useState(false)

  useEffect(() => {
    setValue(props.value)
  }, [props.value])

  const createParticipant = useMutation({
    mutationFn: (params: CreateParticipantParams) => createParticipantMutation(params),
    onSettled: () => props.userDataQuery.refetch()
  })

  const participants: Record<string, Participant> = Object.fromEntries((props.userData)
    .map((data) => {
      if(!data.profile) return
      if(data.profile.participant && data.profile.participant.length > 0) {
        return data.profile.participant
      }
      return
    })
    .filter((data) => data !== undefined)
    .reduce((prev, cur) => {
      const temp = cur.filter((part) => !prev.some((p) => p.id === part.id))
      prev.push(...temp)
      return prev
    }, [] )
    .map((data) => ([data.id, data]))
  )

  const foundUser = participants[props.value] !== undefined && props.value === value && isFocused && !props.userDataQuery.isLoading
  const displaySearchResults = (participants[props.value] === undefined || props.value !== value) && isFocused && !props.userDataQuery.isLoading

  const filteredItems = Object.entries(participants)
    .filter((data) => (
      data[1].firstName.toLowerCase().trim().includes((value ?? '').trim().toLowerCase()) ||
      data[1].preferredName?.toLowerCase().trim().includes((value ?? '').trim().toLowerCase()) ||
      data[1].lastName.toLowerCase().trim().includes((value ?? '').trim().toLowerCase()) ||
      data[1].email?.toLowerCase().trim().includes((value ?? '').trim().toLowerCase())
    ))

  const displayNoResults = filteredItems.length === 0 && isFocused && !props.userDataQuery.isLoading

  return (
    <td className="text-ellipsis border py-3 px-3 max-w-[150px]">
      <input
        ref={inputRef}
        placeholder="Participant..."
        className={`
          font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 
          border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic
          ${!isFocused ? (
            participants[value] !== undefined ? 
              'text-purple-400' 
            :
              'text-red-500'
          ) : ''}
        `}
        
        onChange={(event) => {
          setValue(event.target.value)
        }}
        value={createParticipant.isPending ? (
          'Creating...'
        ) : (
          participants[value] !== undefined ? formatParticipantName(participants[value])
          : value
        )}
        onKeyDown={async (event) => {
          if(inputRef.current){
            if(event.key === 'Enter'){
              props.updateValue(value)
              setIsFocused(false)
              inputRef.current.blur()              
            }
            else if(event.key === 'Escape') {
              setValue(props.value)
              await new Promise(resolve => setTimeout(resolve, 1))
              inputRef.current.blur()
            }
          }
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          if(participants[value] !== undefined) {
            setTimeout(() => {
              setIsFocused(false)
            }, 1)
          }
        }}
      />

      {displaySearchResults && !displayCreateParticipant && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="flex flex-row p-1 justify-between w-full border-b gap-8">
            <span className="ms-2 whitespace-nowrap">Participants</span>
            <div className="flex flex-row items-center gap-1">
              <button
                onClick={() => setDisplayCreateParticipant(true)}
              >
                <HiOutlinePlusCircle size={16} className="text-gray-400 hover:text-gray-700" />
              </button>
              <button 
                onClick={() => setIsFocused(false)}
              >
                <HiOutlineXMark size={16} className="text-gray-400 hover:text-gray-700"/>
              </button>
            </div>
          </div>
          <ul className="max-h-60 overflow-y-auto py-1 min-w-max">
            {filteredItems.map((item, index) => {
              return (
                <Tooltip
                  theme={{ target: undefined }}
                  key={index}
                  content={(
                    <ParticipantPanel 
                      participant={item[1]} 
                    />
                  )}
                  style="light"
                >
                  <li
                    className={`px-4 py-2 hover:bg-gray-100 cursor-pointer`}
                    onClick={() => {
                      setValue(item[0])
                      props.updateValue(item[0])
                      setIsFocused(false)
                    }}
                  >
                    {item[1].preferredName !== undefined && item[1].preferredName !== '' ? item[1].preferredName : item[1].firstName}
                    {', '} 
                    {item[1].lastName}
                  </li>
                </Tooltip>
              )
            })}
          </ul>
        </div>
      )}

      {displayCreateParticipant && isFocused && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col gap-2">
          <div className="flex flex-row p-1 justify-between w-full border-b gap-8">
            <span className="ms-2 whitespace-nowrap">Create Participant</span>
            <button 
              className=""
              onClick={() => {
                setIsFocused(false)
                setDisplayCreateParticipant(false)
              }}
            >
              <HiOutlineXMark size={16} className="text-gray-400 hover:text-gray-700"/>
            </button>
          </div>
          <CreateParticipantWindow 
            userProfiles={props.userData}
            table={props.table}
            rowIndex={props.rowIndex}
            tagsQuery={props.tagsQuery}
            submit={(participant) => {
              if(participant) { 
                //TODO: handle the async logic
                createParticipant.mutate({
                  participant: participant,
                  authMode: 'userPool',
                  options: { 
                    logging: true
                  }
                })
                props.updateValue(participant.id)
                props.updateUserProfiles((prev) => {
                  return prev.map((data) => (data.email === participant.userEmail && data.profile ? ({
                    ...data,
                    profile: {
                      ...data.profile,
                      participant: [...(data.profile?.participant ?? []), participant]
                    }
                  }) : data))
                })
                setIsFocused(false)
                setDisplayCreateParticipant(false)
              }
            }}
            choiceColumn={props.choiceColumn}
          />
        </div>
      )}

      {props.userDataQuery.isLoading && isFocused && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          <p className="px-4 py-2 text-gray-500 flex flex-row">
            <span>Loading</span>
            <Loading />
          </p>
        </div>
      )}

      {displayNoResults && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          <p className="px-4 py-2 text-gray-500 whitespace-nowrap">No results found</p>
        </div>
      )}

      {foundUser && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col gap-2 px-2 py-1">
          <ParticipantPanel participant={participants[props.value]} />
        </div>
      )}
    </td>
  )
}