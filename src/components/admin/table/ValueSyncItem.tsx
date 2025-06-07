import { Dropdown } from "flowbite-react"
import { ParticipantFields, Table, TableColumn, UserData, UserFields } from "../../../types"
import { Dispatch, SetStateAction, useEffect, useState } from "react"

interface ValueSyncItemProps {
  table: Table,
  column: TableColumn,
  users: UserData[],
  syncColumn: (
    id: string, 
    choice: [string, ParticipantFields['type'] | UserFields['type']] | null, 
    updatedValues: string[]
  ) => void
  setHovering: Dispatch<SetStateAction<boolean>>
}

export const ValueSyncItem = (props: ValueSyncItemProps) => {
  const [selectedColumn, setSelectedColumn] = useState<TableColumn | undefined>(props.table.columns.find((col) => col.id === props.column.choices?.[0]))
  const [selectedType, setSelectedType] = useState<ParticipantFields['type'] | UserFields['type'] | undefined>(
    props.column.choices?.[1] !== undefined ? 
      props.column.choices?.[1] as (ParticipantFields['type'] | UserFields['type']) 
    : 
      undefined
  )

  useEffect(() => {
    const foundColumn = props.table.columns.find((col) => col.id === props.column.choices?.[0])
    if(foundColumn) {
      const selectedType = props.column.choices?.[1] !== undefined ? 
        props.column.choices?.[1] as (ParticipantFields['type'] | UserFields['type']) 
      : 
        undefined
      
      setSelectedType(selectedType)
      setSelectedColumn(selectedColumn)
    }
  }, [props.column.choices])

  return (
    <Dropdown.Item
      className={`justify-center ${props.column.choices?.[0] !== undefined ? 'bg-gray-100' : ''}`}
      as='div'
      onMouseEnter={() => props.setHovering(true)}
      onMouseLeave={() => props.setHovering(false)}
    >
      <Dropdown
        label={(<span className="w-full px-10">{props.column.choices?.[0] !== undefined ? 'Sync Active' : 'Sync'}</span>)}
        inline
        arrowIcon={false}
        trigger="hover"
        placement="right"
        dismissOnClick={false}
      >
        <div className="flex flex-col">
          {selectedColumn ? (
            <div className="px-4 pt-2 font-normal text-xs border-b">
              <span className="whitespace-nowrap">Selected Column: {selectedColumn?.header}</span>
              <span className="whitespace-nowrap">Selected Field: {selectedType ? (selectedType[0].toUpperCase() ?? '') + (props.column.choices?.[1].substring(1) ?? '') : 'None'}</span>
            </div>
          ) : (
            <span className="px-4 pt-2 font-normal text-base whitespace-nowrap border-b text-center">Available Columns</span>
          )}
          {/* TODO: more advanced column filtering for columns that already sync the preselected type */}
          {props.table.columns.filter((col) => col.type === 'user' && col.id !== props.column.choices?.[0]).length > 0 ? (
            props.table.columns
              .filter((col) => (
                (
                  col.type === 'user' ||
                  col.type === 'participant'
                ) && 
                col.id !== props.column.choices?.[0]
              ))
              .map((col) => {
                return (
                  <Dropdown.Item
                    className="justify-center"
                    onClick={() => {
                      setSelectedColumn(col)
                      // const values: string[] = []
                      // for(let i = 0; i < col.values.length; i++) {
                      //   const foundParticipant = props.users.find((data) => data.email === col.values[i])?.profile?.participant[0]
                      //   if(foundParticipant) {
                      //     values.push(foundParticipant.id)
                      //   }
                      //   else {
                      //     values.push('')
                      //   }
                      // }
                      // props.syncColumn(props.column.id, [col.id, 'email'], values)
                    }}
                  >{col.header}</Dropdown.Item>
                )
              })
          ) : (
            <span className="px-4 py-2 font-normal text-base whitespace-nowrap text-center">No Available Columns</span>
          )}
        </div>
      </Dropdown>
    </Dropdown.Item>
  )
}