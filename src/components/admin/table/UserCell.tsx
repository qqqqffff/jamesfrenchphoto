import { useMutation, UseQueryResult } from "@tanstack/react-query";
import { ComponentProps, Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import Loading from "../../common/Loading";
import { Table, UserData, UserProfile, UserTag } from "../../../types";
import { Tooltip } from "flowbite-react";
import { HiOutlineXMark } from 'react-icons/hi2'
import validator from 'validator'
import { InviteUserWindow } from "./InviteUserWindow";
import { revokeUserInviteMutation, RevokeUserInviteMutationParams } from "../../../services/userService";
import { UserProfileWindow } from "../../common/UserProfileWindow";

interface UserCellProps extends ComponentProps<'td'> {
  value: string,
  updateValue: (text: string) => void
  userData: UserData[]
  userDataQuery: UseQueryResult<UserData[] | undefined, Error>,
  tagsData: UseQueryResult<UserTag[] | undefined, Error>,
  tempUsers: UserProfile[],
  parentUpdateTempUsers: Dispatch<SetStateAction<UserProfile[]>>
  tempUsersQuery: UseQueryResult<UserProfile[] | undefined, Error>,
  table: Table,
  rowIndex: number,
  columnId: string,
}

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

  const revokeUserInvite = useMutation({
    mutationFn: (params: RevokeUserInviteMutationParams) => revokeUserInviteMutation(params),
    onSuccess: () => props.tempUsersQuery.refetch()
  })

  const tempUsers: [string, 'tempUser'][] = props.tempUsers
    .map((data) => ([data.email, 'tempUser']))

  if(tempProfile){
    tempUsers.push([tempProfile.email, 'tempUser'])
  }

  const users: [string, 'user'][] = (props.userData)
    .map((data) => ([data.email, 'user']))

  const mergedResults: Record<string, 'user' | 'tempUser'> = Object.fromEntries([...users, ...tempUsers])

  const filteredItems = Object.entries(mergedResults)
    .filter((data) => (
      (data[0] ?? '').toLowerCase().trim().includes((value ?? '').toLowerCase())
    ))

  const foundUser: 'user' | 'tempUser' | undefined = mergedResults[props.value]

  const displayUserPanel = foundUser !== undefined && props.value === value && isFocused
  const displayNoResults = foundUser === undefined && props.value !== value && !validator.isEmail(value) && filteredItems && filteredItems.length === 0 && isFocused
  const displayInvite = foundUser === undefined && props.value === value && isFocused && validator.isEmail(props.value)
  const displaySearchResults = isFocused && ((props.value !== value || foundUser === undefined) && !validator.isEmail(value)) && filteredItems && filteredItems.length > 0

  function userPanel(type: 'user' | 'tempUser', value: string): JSX.Element | undefined {
    let profile: UserData | undefined
    if(type === 'user'){
      profile = props.userData.find((data) => data.email === value)
      if(!profile) return
    }
    else if(type === 'tempUser') {
      let userProfile = props.tempUsers.find((data) => data.email === value)

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
      <UserProfileWindow 
        profile={profile}
        children={type === 'tempUser' ? (
          <button 
            className="self-end px-4 py-1 border rounded-lg mb-2 hover:bg-gray-100"
            onClick={() => {
              props.parentUpdateTempUsers((prev) => prev.filter((user) => user.email !== profile.email))
              revokeUserInvite.mutate({
                userEmail: profile.email,
                options: {
                  logging: true,
                  metric: true
                }
              })
            }}
          >Revoke Invite</button>
        ) : undefined}
      />
    ) : undefined
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
              mergedResults[value] === 'tempUser' ? 'text-orange-400' : 'text-blue-400'
            ) : 'text-red-500'
          ) : ''}
        `}
        
        onChange={(event) => {
          setValue(event.target.value)
        }}
        value={value}
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
              return (
                <Tooltip 
                  key={index}
                  content={(
                    <div className="flex flex-col">
                      <span className={`${item[1] === 'tempUser' ? 'text-orange-400' : 'text-blue-400'}`}>
                        {item[1] === 'tempUser' ? 'Pending User' : 'User'}
                      </span>
                      {userPanel(item[1], item[0])}
                    </div>
                  )}
                  style='light'
                  placement="bottom"
                >
                  <li
                    className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${item[1] === 'tempUser' ? 'text-orange-400' : 'text-blue-400'}`}
                    onClick={() => {
                      setValue(item[0])
                      props.updateValue(item[0])
                      setIsFocused(false)
                    }}
                  >
                    {item[0]}
                  </li>
                </Tooltip>
              )
            })}
          </ul>
        </div>
      )}

      {props.userDataQuery.isLoading && isFocused && (
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
            <span className={`${foundUser === 'tempUser' ? 'text-orange-400' : 'text-blue-400'} ms-2`}>
              {foundUser === 'tempUser' ? 'Pending User' : 'User'}
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
            tagsQuery={props.tagsData}
          />
        </div>
      )}
    </td>
  )
}