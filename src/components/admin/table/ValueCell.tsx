import { ComponentProps, useEffect, useRef, useState } from "react"
import { TableColumn } from "../../../types"
import { ParticipantRowFieldLinks, UserRowFieldLinks } from "./TableRowComponent"

interface ValueCellProps extends ComponentProps<'td'> {
  value: string,
  updateValue: (text: string) => void,
  column: TableColumn,
  // TODO: handle on the parent side
  // tempUsersData: UseQueryResult<UserProfile[] | undefined, Error>
  // userData: UseQueryResult<UserData[] | undefined, Error>
  // updateUserAttribute: UseMutationResult<unknown, Error, UpdateUserAttributesMutationParams, unknown>
  // updateUserProfile: UseMutationResult<void, Error, UpdateUserProfileParams, unknown>
  // updateParticipant: UseMutationResult<void, Error, UpdateParticipantMutationParams, unknown>
  userRowFieldLinks?: UserRowFieldLinks,
  participantRowFieldLinks: ParticipantRowFieldLinks[]
}

export const ValueCell = (props: ValueCellProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [value, setValue] = useState('')

  //TODO: add conditional rendering for the border if the cell is linked
  useEffect(() => {
    if(props.value !== value){
      setValue(props.value)
    }
  }, [props.value])

  const specialField = 
    props.column.id === props.userRowFieldLinks?.email[1] ||
    props.column.id === props.userRowFieldLinks?.first[1] ||
    props.column.id === props.userRowFieldLinks?.sitting[1] ||
    props.column.id === props.userRowFieldLinks?.last[1] ||
    props.participantRowFieldLinks.some((link) => (
      link.first[1] === props.column.id ||
      link.last[1] === props.column.id ||
      link.email?.[1] === props.column.id ||
      link.middle?.[1] === props.column.id ||
      link.preferred?.[1] === props.column.id
    ))

  //TODO: handle special case for sitting number (accept only numbers)

  return (
    <td className={`
      text-ellipsis border py-3 px-3 max-w-[150px]
      ${specialField ? 'bg-yellow-50 bg-opacity-40' : ''}
    `}>
      <input
        ref={inputRef}
        placeholder="Enter Value..."
        className="
          font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 
          border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic bg-transparent
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