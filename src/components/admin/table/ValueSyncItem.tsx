import { Dropdown } from "flowbite-react"
import { ParticipantFields, Table, TableColumn, UserData, UserFields } from "../../../types"
import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { HiOutlineArrowCircleLeft, HiOutlineArrowCircleRight } from "react-icons/hi"
import { mapParticipantField, mapUserField } from "../../../functions/tableFunctions"

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

  const choiceList = ['first', 'preferred', 'middle', 'last', 'sitting']

  const filteredItems = props.table.columns
    .filter((col) => (
      (
        col.type === 'user' ||
        col.type === 'participant'
      ) && 
      col.id !== props.column.choices?.[0] &&
      col.id !== selectedColumn?.id
    ))

  const filteredChoices = choiceList.filter((choice) => (
    !props.table.columns.some((col) => (
      col.choices?.[0] === selectedColumn?.id && 
      col.choices?.[1] === choice
    ))
  ))

  const userChoices = filteredChoices
    .filter((choice) => (
      choice !== 'preferred' &&
      choice !== 'middle'
    ))

  const participantChoices = filteredChoices
    .filter((choice) => (
      choice !== 'sitting' 
    ))


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
            <div className="px-4 py-1 font-normal text-xs border-b flex flex-col">
              <span className="whitespace-nowrap">Selected Column: {selectedColumn?.header}</span>
              <span className="whitespace-nowrap">Selected Field: {selectedType ? (selectedType[0].toUpperCase() ?? '') + (selectedType.substring(1) ?? '') : 'None'}</span>
            </div>
          ) : (
            <span className="px-4 pt-2 font-normal text-base whitespace-nowrap border-b text-center">Available Columns</span>
          )}
          {/* TODO: more advanced column filtering for columns that already sync the preselected type */}
          {filteredItems.length > 0 ? (
            filteredItems
            .map((col, index) => {
              return (
                <Dropdown.Item
                  key={index}
                  className="justify-center"
                  onClick={() => {
                    setSelectedColumn(col)
                    setSelectedType(undefined)
                  }}
                >{col.header}</Dropdown.Item>
              )
            })
          ) : (
            <span className="px-4 py-2 font-normal text-base whitespace-nowrap text-center">No Available Columns</span>
          )}
          {selectedColumn && (
            <div className="border-t">
                {filteredChoices.length > 0 ? (
                  <div className="flex flex-row gap-2 justify-center items-center py-1 border-b">
                    <button onClick={() => {
                      if(selectedColumn.type === 'user') {
                        const foundIndex = userChoices.findIndex((choice) => choice == selectedType)

                        const nextIndex = foundIndex <= 0 ? userChoices.length - 1 : foundIndex - 1
                        setSelectedType(userChoices[nextIndex] as UserFields['type'])
                      }
                      else {
                        const foundIndex = participantChoices.findIndex((choice) => choice == selectedType)

                        const nextIndex = foundIndex <= 0 ? participantChoices.length - 1 : foundIndex - 1
                        setSelectedType(participantChoices[nextIndex] as ParticipantFields['type'])
                      }
                    }}>
                      <HiOutlineArrowCircleLeft size={20} className='text-gray-500 hover:text-gray-900'/>
                    </button>
                    <span>{selectedType ? (selectedType[0].toUpperCase() ?? '') + (selectedType.substring(1) ?? '') : 'None'}</span>
                    <button onClick={() => {
                      if(selectedColumn.type === 'user') {
                        const foundIndex = userChoices.findIndex((choice) => choice == selectedType)

                        const nextIndex = foundIndex >= userChoices.length - 1 ? 0 : foundIndex + 1
                        setSelectedType(userChoices[nextIndex] as UserFields['type'])
                      }
                      else {
                        const foundIndex = participantChoices.findIndex((choice) => choice == selectedType)

                        const nextIndex = foundIndex >= participantChoices.length - 1 ? 0 : foundIndex + 1
                        setSelectedType(participantChoices[nextIndex] as ParticipantFields['type'])
                      }
                    }}>
                      <HiOutlineArrowCircleRight size={20} className='text-gray-500 hover:text-gray-900'/>
                    </button>
                  </div>
                ) : (
                  <span className="px-4 py-2 font-normal text-base whitespace-nowrap text-center">No Available Fields</span>
                )}
              <div className="flex flex-row w-full justify-end gap-2 py-2 pe-2">
                <Dropdown.Item 
                  className="border rounded-lg px-2 py-1 hover:bg-gray-100" 
                  onClick={() => {
                    if(props.column.choices?.[0] !== undefined) {
                      props.syncColumn(props.column.id, null, props.column.values)
                    }
                    else {
                      setSelectedColumn(props.table.columns.find((col) => col.id === props.column.choices?.[0]))
                      setSelectedType(props.column.choices?.[1] !== undefined ? 
                        props.column.choices?.[1] as (ParticipantFields['type'] | UserFields['type']) 
                      : 
                        undefined
                      )
                    }
                  }}
                >{props.column.choices?.[0] !== undefined ? 'Unsync' : 'Cancel'}</Dropdown.Item>
                <button
                  className="border rounded-lg px-2 py-1 enabled:hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed" 
                  disabled={
                    selectedColumn.id === props.table.columns.find((col) => col.id === props.column.choices?.[0])?.id && 
                    (
                      selectedType === undefined ||
                      props.column.choices?.[1] === selectedType
                    )
                  }
                  onClick={() => {
                    if(selectedType) {
                      const values: string[] = []
                      for(let i = 0; i < props.column.values.length; i++) {
                        if(selectedColumn.type === 'user') {
                          const foundUser = props.users.find((user) => user.email === selectedColumn.values[i])
                          console.log(foundUser?.profile)

                          if(foundUser?.profile) {
                            values.push(mapUserField({ 
                              field: selectedType as UserFields['type'], 
                              user: {
                                ...foundUser.profile,
                                firstName: foundUser.first,
                                lastName: foundUser.last
                              } 
                            }))
                          }
                          else {
                            values.push('')
                          }
                        }
                        else {
                          const foundUser = props.users.find((user) => user.profile?.participant.some((participant) => participant.id === selectedColumn.values[i]))
                          const participant = foundUser?.profile?.participant.find((participant) => participant.id === selectedColumn.values[i])

                          if(participant) {
                            values.push(mapParticipantField({ field: selectedType as ParticipantFields['type'], participant: participant }))
                          }
                          else {
                            values.push('')
                          }
                        }
                      }
                      console.log(values)
                      props.syncColumn(props.column.id, [selectedColumn.id, selectedType], values)
                    }
                  }}
                >Confirm</button>
              </div>
            </div>
          )}
        </div>
      </Dropdown>
    </Dropdown.Item>
  )
}