import { UseQueryResult } from "@tanstack/react-query";
import { ComponentProps, useEffect, useRef, useState } from "react";
import Loading from "../../common/Loading";
import { UserData } from "../../../types";
import { Tooltip } from "flowbite-react";

interface UserCellProps extends ComponentProps<'td'> {
  value: string,
  updateValue: (text: string) => void
  userData: UseQueryResult<UserData[] | undefined, Error>,
}

export const UserCell = (props: UserCellProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  
  useEffect(() => {
    if(props.value !== value){
      setValue(props.value)
    }
  }, [props.value])

  const users: [string, 'user'][] = (props.userData.data ?? [])
    .map((data) => ([data.email, 'user']))

  const participants: [string, 'participant'][] = (props.userData.data ?? [])
    .map((data) => {
      if(!data.profile) return
      if(data.profile.participant && data.profile.participant.length > 0) {
        return data.profile.participant.map((participant) => participant.email).filter((email) => email !== undefined)
      }
      return
    })
    .filter((data) => data !== undefined)
    .reduce((prev, cur) => {
      const temp = cur.filter((email) => !prev.some((p) => p === email))
      prev.push(...temp)
      return prev
    }, [])
    .filter((data) => !users.some((user) => user[0] === data))
    .map((data) => ([data, 'participant']))

  
  const mergedResults: Record<string, 'user' | 'participant'> = Object.fromEntries([...users, ...participants])

  const filteredItems = Object.entries(mergedResults)
    .filter((data) => (
      data[0].toLowerCase().trim().includes(value.toLowerCase())
    ))

  return (
    <td className="text-ellipsis border py-3 px-3 max-w-[150px] relative">
      <input
        ref={inputRef}
        placeholder="Enter Email..."
        className={`
          font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 
          border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic
          ${!isFocused ? (
            mergedResults[value] !== undefined ? (
              mergedResults[value] === 'participant' ? 'text-purple-400' : 'text-blue-400'
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
              inputRef.current.blur()
            }
            else if(event.key === 'Escape') {
              setValue(props.value)
              await new Promise(resolve => setTimeout(resolve, 1))
              inputRef.current.blur()
            }
          }
        }}
        //TODO: reenable me
        // onBlur={() => {
        //   if(props.value !== value){
        //     props.updateValue(value)
        //     setIsFocused(false)
        //     return
        //   }
        //   setIsFocused(false)
        // }}
        onFocus={() => setIsFocused(true)}
      />
      {isFocused && value && filteredItems && filteredItems.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg min-w-max">
          <ul className="max-h-60 overflow-y-auto py-1 min-w-max">
            {filteredItems.map((item, index) => {
              return (
                <Tooltip 
                  content={(
                    <span className={`${item[1] === 'participant' ? 'text-purple-400' : 'text-blue-400'}`}>
                      {item[1] === 'participant' ? 'Participant Email' : 'User Email'}
                    </span>
                  )}
                  style='light'
                  placement="bottom"
                >
                  <li
                    key={index}
                    className={`px-4 py-2 hover:bg-gray-100 cursor-pointer ${item[1] === 'participant' ? 'text-purple-400' : 'text-blue-400'}`}
                    onClick={() => {
                      console.log(item[0])
                      setValue(item[0])
                      // props.updateValue(item[0])
                      setIsFocused(false)
                      // setTimeout(() => inputRef.current?.blur(), 100)
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

      {props.userData.isLoading && isFocused && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          <p className="px-4 py-2 text-gray-500 flex flex-row">
            Loading
            <Loading />
          </p>
        </div>
      )}

      {!props.userData.isLoading && filteredItems && filteredItems.length === 0 && isFocused && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          <p className="px-4 py-2 text-gray-500">No results found</p>
        </div>
      )}
    </td>
  )
}