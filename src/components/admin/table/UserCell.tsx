import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { ComponentProps, useEffect, useRef, useState } from "react";
import Loading from "../../common/Loading";
import { Participant, Table, UserData, UserProfile } from "../../../types";
import { Tooltip } from "flowbite-react";
import { HiOutlineXMark } from 'react-icons/hi2'
import validator from 'validator'
import { InviteUserWindow } from "./InviteUserWindow";
import { getAllTemporaryUsersQueryOptions } from "../../../services/userService";

interface UserCellProps extends ComponentProps<'td'> {
  value: string,
  updateValue: (text: string) => void
  userData: UseQueryResult<UserData[] | undefined, Error>,
  table: Table,
  rowIndex: number,
  columnId: string,
}

//TODO: fix users with same email
export const UserCell = (props: UserCellProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [tempProfile, setTempProfile] = useState<UserProfile>()
  
  useEffect(() => {
    if(props.value !== value){
      setValue(props.value)
    }
  }, [props.value])

  const tempUsersQuery = useQuery(getAllTemporaryUsersQueryOptions())

  const tempUsers: [string, 'tempUser'][] = (tempUsersQuery.data ?? [])
    .map((data) => ([data.email, 'tempUser']))

  if(tempProfile){
    tempUsers.push([tempProfile.email, 'tempUser'])
  }

  const users: [string, 'user'][] = (props.userData.data ?? [])
    .map((data) => ([data.email, 'user']))

  const participants: Record<string, Participant> = Object.fromEntries((props.userData.data ?? [])
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
    .map((data) => ([data.id, data])))

  const participantResults: [string, 'participant'][] = Object.entries(participants).map((participant) => ([participant[0], 'participant']))

  const mergedResults: Record<string, 'user' | 'participant' | 'tempUser'> = Object.fromEntries([...users, ...participantResults, ...tempUsers])

  const filteredItems = Object.entries(mergedResults)
    .filter((data) => (
      (data[0] ?? '').toLowerCase().trim().includes((value ?? '').toLowerCase())
    ))

  const foundUser: 'user' | 'participant' | 'tempUser' | undefined = mergedResults[props.value]

  const displayUserPanel = foundUser !== undefined && props.value === value && isFocused
  const displayNoResults = foundUser === undefined && props.value !== value && !validator.isEmail(value) && filteredItems && filteredItems.length === 0 && isFocused
  const displayInvite = foundUser === undefined && props.value === value && isFocused && validator.isEmail(props.value) && isFocused
  const displaySearchResults = isFocused && ((props.value !== value || foundUser === undefined) && !validator.isEmail(value)) && filteredItems && filteredItems.length > 0

  function userPanel(type: 'user' | 'participant' | 'tempUser', value: string): JSX.Element | undefined {
    let profile: UserData | undefined
    let participant: Participant | undefined
    if(type === 'user'){
      profile = props.userData.data?.find((data) => data.email === value)
      if(!profile) return
    }
    else if(type === 'participant'){
      participant = participants[value]
      if(!participant) return
    }
    else if(type === 'tempUser') {
      let userProfile = tempUsersQuery.data?.find((data) => data.email === value)

      if(!userProfile && tempProfile) {
        userProfile = tempProfile
      }
      if(!userProfile) return

      profile = {
        email: value,
        verified: false,
        first: userProfile.firstName ?? 'Undefined',
        last: userProfile.lastName ?? 'Undefined',
        userId: 'N/A',
        status: 'N/A',
        profile: userProfile
      }
    }
    return (type === 'user' || type === 'tempUser') && profile ? (
      <div className="flex flex-col px-2 text-xs">
        <div className="flex flex-row gap-2 items-center text-nowrap">
          <span>First Name:</span>
          <span className="italic">{profile.first}</span>
        </div>
        <div className="flex flex-row gap-2 items-center text-nowrap">
          <span>Last Name:</span>
          <span className="italic">{profile.last}</span>
        </div>
        {profile.created && (
          <div className="flex flex-row gap-2 items-center text-nowrap">
            <span>Created:</span>
            <span className="italic">
            {
              profile.created.toLocaleString('en-US', { timeZone: 'America/Chicago' })
              .replace('T', ' ')
              .replace(/[.].*/g, '')
            }
            </span>
          </div>
        )}
        <div className="border-gray-300 border mb-1"/>
        {profile.profile?.participant.map((participant, index) => {
          return (
            <div className="flex flex-col" key={index}>
              <span className="underline">Participant:</span>
              <div className="flex flex-row gap-2 items-center text-nowrap">
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
          )
        })}
      </div>
    ) : (
      type === 'participant' && participant ? (
        <div className="flex flex-col text-xs px-2 pb-1">
          <div className="flex flex-row gap-2 items-center max-w-[200px] overflow-hidden whitespace-nowrap text-ellipsis">
            <span>First Name:</span>
            <span className="italic">{participant.id}</span>
          </div>
          <div className="flex flex-row gap-2 items-center text-nowrap">
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
          {participant.userEmail && (
            <div className="flex flex-row gap-2 items-center text-nowrap">
              <span>User Email:</span>
              <span className="italic">{participant.userEmail}</span>
            </div>
          )}
        </div>
      ) : undefined
    )
  }

  return (
    <td className="text-ellipsis border py-3 px-3 max-w-[150px]">
      <input
        ref={inputRef}
        placeholder="Enter Email..."
        className={`
          font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 
          border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic
          ${!isFocused ? (
            mergedResults[value] !== undefined ? (
              mergedResults[value] === 'participant' ? 'text-purple-400' : 
              mergedResults[value] === 'tempUser' ? 'text-orange-400' : 'text-blue-400'
            ) : 'text-red-500'
          ) : ''}
        `}
        
        onChange={(event) => {
          setValue(event.target.value)
        }}
        value={foundUser === 'participant' ? (
          `${participants[value]?.firstName}, ${participants[value]?.lastName}`
        ) : value}
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
        onBlur={() => {
          setTimeout(() => {
            if(!displayInvite){
              if(props.value !== value) {
                setIsFocused(false)
                props.updateValue(value)
                return
              }
              setIsFocused(false)
            }
          }, 250)
        }}
        onFocus={() => setIsFocused(true)}
      />

      {displaySearchResults  && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          <ul className="max-h-60 overflow-y-auto py-1 min-w-max">
            {filteredItems.map((item, index) => {
              let participant: Participant | undefined
              let duplicateEmails: boolean = false
              if(item[1] === 'participant') {
                participant = participants[item[0]]
                const email = participant.email
                duplicateEmails = !Object.entries(participants)
                  .filter((participant) => participant[0] !== item[0])
                  .reduce((prev, cur) => {
                    if(!prev) return prev
                    if(cur[1].email === email) {
                      return false
                    }
                    return prev
                  }, true)

                if(!participant) return
              }
              
              return (
                <Tooltip 
                  key={index}
                  content={(
                    <div className="flex flex-col">
                      <span className={`${item[1] === 'participant' ? 'text-purple-400' : item[1] === 'tempUser' ? 'text-orange-400' : 'text-blue-400'}`}>
                        {item[1] === 'participant' ? 'Participant' : 'User'}
                      </span>
                      {userPanel(item[1], item[0])}
                    </div>
                  )}
                  style='light'
                  placement="bottom"
                >
                  <li
                    className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${item[1] === 'participant' ? 'text-purple-400' : item[1] === 'tempUser' ? 'text-orange-400' : 'text-blue-400'}`}
                    onClick={() => {
                      setValue(item[0])
                      props.updateValue(item[0])
                      setIsFocused(false)
                    }}
                  >
                    {item[1] === 'participant' ? (
                      `${participants[item[0]].firstName}, ${participants[item[0]].lastName}`
                    ) : (
                      item[0]
                    )}
                  </li>
                </Tooltip>
              )
            })}
          </ul>
        </div>
      )}

      {props.userData.isLoading && isFocused && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          <p className="px-4 py-2 text-gray-500 flex flex-row">
            Loading
            <Loading />
          </p>
        </div>
      )}

      {displayNoResults && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          <p className="px-4 py-2 text-gray-500">No results found</p>
        </div>
      )}

      {displayUserPanel && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col gap-2 ">
          <div className="flex flex-row p-1 justify-between w-full border-b">
            <span className={`${foundUser === 'participant' ? 'text-purple-400' : foundUser === 'tempUser' ? 'text-orange-400' : 'text-blue-400'} ms-2`}>
              {foundUser === 'participant' ? 'Participant' : foundUser === 'tempUser' ? 'Pending User' : 'User'}
            </span>
            <button 
              className=""
              onClick={() => {
                setIsFocused(false)
              }}
            >
              <HiOutlineXMark size={16} className="text-gray-400"/>
            </button>
          </div>
          {userPanel(foundUser, props.value)}
        </div>
      )}

      {displayInvite && (
        <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col gap-2">
          <div className="flex flex-row p-1 justify-between w-full border-b">
            <span className="ms-2">Invite User</span>
            <button 
              className=""
              onClick={() => {
                setIsFocused(false)
              }}
            >
              <HiOutlineXMark size={16} className="text-gray-400"/>
            </button>
          </div>
          <InviteUserWindow 
            email={props.value}
            table={{
              ...props.table,
              columns: props.table.columns.filter((column) => column.id !== props.columnId)
            }}
            rowIndex={props.rowIndex}
            submit={setTempProfile}
          />
        </div>
      )}
    </td>
  )
}