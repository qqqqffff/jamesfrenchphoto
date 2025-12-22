import { ComponentProps, useEffect, useRef, useState } from "react"
import { TableColumn } from "../../../types"
import { ParticipantFieldLinks, UserFieldLinks } from "../../modals/LinkUser"

interface ValueCellProps extends ComponentProps<'td'> {
  value: string,
  updateValue: (text: string) => void,
  column: TableColumn,
  userFieldLinks?: UserFieldLinks,
  participantFieldLinks: ParticipantFieldLinks[]
  rowIndex: number
}

export const ValueCell = (props: ValueCellProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [value, setValue] = useState('')

  useEffect(() => {
    if(props.value !== value){
      setValue(props.value)
    }
  }, [props.value])

  const specialField = 
    props.column.id === props.userFieldLinks?.email[1] ||
    props.column.id === props.userFieldLinks?.first?.[0] ||
    props.column.id === props.userFieldLinks?.sitting?.[0] ||
    props.column.id === props.userFieldLinks?.last?.[0] ||
    props.participantFieldLinks.some((link) => (
      link.first?.[0] === props.column.id ||
      link.last?.[0] === props.column.id ||
      link.email?.[0] === props.column.id ||
      link.middle?.[0] === props.column.id ||
      link.preferred?.[0] === props.column.id
    ))

  const userField = specialField && props.column.id === props.userFieldLinks?.email[1];

  const cellColoring = props.rowIndex % 2 ? 
    specialField && !userField ? 
      'bg-yellow-200 bg-opacity-40' 
    : 
      specialField  && userField ? 
        'bg-blue-200 bg-opacity-40' 
      : 
        'bg-gray-200 bg-opacity-40' 
  : 
    specialField && !userField ?
      'bg-yellow-100 bg-opacity-20'
    : 
      specialField && userField ?
        'bg-blue-100 bg-opacity-20'
      :
        '';

  //TODO: handle special case for sitting number (accept only numbers)

  return (
    <td className={`
      text-ellipsis border py-3 px-3 max-w-[150px] 
      ${cellColoring}
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