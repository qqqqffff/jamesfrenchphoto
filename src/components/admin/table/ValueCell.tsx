import { ComponentProps, useEffect, useRef, useState } from "react"
import { TableColumn, UserData, UserProfile } from "../../../types"
import { UseMutationResult, UseQueryResult } from "@tanstack/react-query"
import { UpdateParticipantMutationParams, UpdateUserAttributesMutationParams, UpdateUserProfileParams } from "../../../services/userService"

interface ValueCellProps extends ComponentProps<'td'> {
  value: string,
  updateValue: (text: string) => void,
  column: TableColumn
  tempUsersData: UseQueryResult<UserProfile[] | undefined, Error>
  userData: UseQueryResult<UserData[] | undefined, Error>
  updateUserAttribute: UseMutationResult<unknown, Error, UpdateUserAttributesMutationParams, unknown>
  updateUserProfile: UseMutationResult<void, Error, UpdateUserProfileParams, unknown>
  updateParticipant: UseMutationResult<void, Error, UpdateParticipantMutationParams, unknown>
}

export const ValueCell = (props: ValueCellProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [value, setValue] = useState('')

  useEffect(() => {
    if(props.value !== value){
      setValue(props.value)
    }
  }, [props.value])

  return (
    <td className="text-ellipsis border py-3 px-3 max-w-[150px]">
      <input
        ref={inputRef}
        placeholder="Enter Value..."
        className="
          font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 
          border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic
        "
        
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
        onBlur={() => {
          if(props.value !== value){
            props.updateValue(value)
          }
        }}
      />
    </td>
  )
}