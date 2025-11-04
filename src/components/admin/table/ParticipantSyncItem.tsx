import { Dropdown } from "flowbite-react"
import { Table, TableColumn, UserData } from "../../../types"

interface ParticipantSyncItemProps {
  table: Table,
  column: TableColumn,
  users: UserData[],
  syncColumn: (id: string, choice: string | null, updatedValues: string[]) => void
}

export const ParticipantSyncItem = (props: ParticipantSyncItemProps) => {
  return (
    <Dropdown.Item
      className={`justify-center ${props.column.choices?.[0] !== undefined ? 'bg-gray-100' : ''}`}
      as='div'
    >
      <Dropdown
        label={(<span className="w-full px-10">{props.column.choices?.[0] !== undefined ? 'Sync Active' : 'Sync'}</span>)}
        inline
        arrowIcon={false}
        trigger="hover"
        placement="right"
      >
        <div className="flex flex-col">
        {props.table.columns.some((col) => col.id === props.column.choices?.[0]) ? (
          <span className="px-4 pt-2 font-normal text-xs whitespace-nowrap border-b">
            Selected Column: {props.table.columns.find((col) => col.id === props.column.choices?.[0])?.header}
          </span>
        ) : (
          <span className="px-4 pt-2 font-normal text-base whitespace-nowrap border-b text-center">Available Columns</span>
        )}
        {props.table.columns.filter((col) => col.id !== props.column.choices?.[0]).length > 0 ? (
          props.table.columns
            .filter((col) => col.id !== props.column.choices?.[0])
            .map((col) => {
              return (
                <Dropdown.Item
                  className="justify-center"
                  onClick={() => {
                    const values: string[] = []
                    for(let i = 0; i < col.values.length; i++) {
                      const foundParticipant = props.users.find((data) => data.email === col.values[i])?.profile?.participant[0]
                      if(foundParticipant) {
                        values.push(foundParticipant.id)
                      }
                      else {
                        values.push('')
                      }
                    }
                    props.syncColumn(props.column.id, col.id, values)
                  }}
                >{col.header}</Dropdown.Item>
              )
            })
        ) : (
          <span className="px-4 py-2 font-normal text-base whitespace-nowrap text-center">No Available Columns</span>
        )}
        {props.table.columns.some((col) => col.id === props.column.choices?.[0]) && (
          <Dropdown.Item
            onClick={() => props.syncColumn(props.column.id, null, props.column.values)}
          >Unsync</Dropdown.Item>
        )}
        </div>
      </Dropdown>
    </Dropdown.Item>
  )
}