import { Dropdown } from "flowbite-react"
import { Participant, Table, TableColumn } from "../../../types"

interface TagSyncItemProps {
  column: TableColumn,
  table: Table,
  syncColumn: (id: string, choice: string | null, updatedValues: string[]) => void,
  participants: Participant[]
}

export const TagSyncItem = (props: TagSyncItemProps) => {
  const filteredItems = props.table.columns.filter((col) => col.type === 'participant' && col.id !== props.column.choices?.[0])
  return (
    <Dropdown.Item 
      as='div' 
      className={`justify-center ${props.column.choices?.[0] !== undefined ? 'bg-gray-100' : ''}`}
    >
      <Dropdown
        inline
        label={<span className="w-full px-4">{props.column.choices?.[0] !== undefined ? 'Column Linked' : 'Link'}</span>}
        arrowIcon={false}
        placement="left"
        trigger="hover"
      >
        <div className="flex flex-col">
        {props.table.columns.some((col) => col.id === props.column.choices?.[0]) ? (
          <span className="px-4 pt-2 font-normal text-xs whitespace-nowrap border-b">
            Selected Column: {props.table.columns.find((col) => col.id === props.column.choices?.[0])?.header}
          </span>
        ) : (
          <span className="px-4 pt-2 font-normal text-base whitespace-nowrap border-b text-center">Available Columns</span>
        )}
        {filteredItems.length > 0 ? (
          filteredItems.map((col, index) => {
            return (
              <Dropdown.Item
                key={index}
                className="justify-center"
                onClick={() => {
                  const values: string[] = []
                  for(let i = 0; i < col.values.length; i++) {
                    const foundParticipant = props.participants.find((participant) => participant.id === col.values[i])
                    if(foundParticipant) { 
                      values.push(foundParticipant.id)
                    }
                    else {
                      values.push('')
                    }
                  }
                  props.syncColumn(props.column.id, col.id, values)
                }}
              >
                {col.header}
              </Dropdown.Item>
            )
          })
        ) : (
          <span className="px-4 py-2 font-normal text-base whitespace-nowrap text-center">No Available Columns</span>
        )}
        {props.table.columns.some((col) => col.id === props.column.choices?.[0]) && (
          <Dropdown.Item
            onClick={() => props.syncColumn(props.column.id, null, props.column.values)}
          >Unlink</Dropdown.Item>
        )}
        </div>
      </Dropdown>
    </Dropdown.Item>
  )
}