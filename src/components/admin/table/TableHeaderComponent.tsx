import { Dropdown } from "flowbite-react"
import { Table, TableColumn, TableGroup } from "../../../types"
import { TableColumnComponent } from "./TableColumnComponent"
import { UseMutationResult } from "@tanstack/react-query"
import { MutableRefObject, Dispatch, SetStateAction } from "react"
import { CreateTableColumnParams, UpdateTableColumnParams } from "../../../services/tableService"
import { HiOutlineCalendar, HiOutlineDocumentText, HiOutlineListBullet, HiOutlinePencil, HiOutlinePlusCircle, HiOutlineTag } from 'react-icons/hi2'
import { v4 } from 'uuid'

interface TableHeaderComponentProps {
  table: Table
  refColumn: MutableRefObject<TableColumn | null>
  createColumn: UseMutationResult<void, Error, CreateTableColumnParams, unknown>
  updateColumn: UseMutationResult<void, Error, UpdateTableColumnParams, unknown>
  setDeleteColumnConfirmation: Dispatch<SetStateAction<boolean>>
  parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTable: Dispatch<SetStateAction<Table | undefined>>
  parentUpdateTableColumns: Dispatch<SetStateAction<TableColumn[]>>
}

export const TableHeaderComponent = (props: TableHeaderComponentProps) => {
  const pushColumn = (type: TableColumn['type']) => {
    const temp: TableColumn = {
      id: v4(),
      values: [],
      choices: [],
      display: true,
      header: '',
      type: type,
      tags: [],
      order: props.table.columns.length,
      tableId: props.table.id,
      temporary: true
    }

    for(let i = 0; i < props.table.columns[0].values.length; i++) {
      temp.values.push('')
      if(temp.choices) {
        temp.choices.push('')
      }
    }

    const table: Table = {
      ...props.table,
      columns: [...props.table.columns, temp]
    }

    const updateGroup = (prev: TableGroup[]) => {
      const pTemp = [...prev]
        .map((group) => {
          if(group.id === table.tableGroupId){
            return {
              ...group,
              tables: group.tables.map((pTable) => (pTable.id === table.id ? table : pTable))
            }
          }
          return group
        })

      return pTemp
    }

    props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
    props.parentUpdateTableGroups((prev) => updateGroup(prev))
    props.parentUpdateTable(table)
    props.parentUpdateTableColumns(table.columns)
  }

  return (
    <thead className="text-xs text-gray-700 bg-gray-50 sticky top-0 z-10">
      <tr>
        {props.table.columns
        .map((column) => {
          // if(state === undefined) return (<></>)
          return (
            <TableColumnComponent 
              key={column.id}
              table={props.table}
              column={column}
              refColumn={props.refColumn}
              createColumn={props.createColumn}
              updateColumn={props.updateColumn}
              setDeleteColumnConfirmation={props.setDeleteColumnConfirmation}
              parentUpdateSelectedTableGroups={props.parentUpdateSelectedTableGroups}
              parentUpdateTableGroups={props.parentUpdateTableGroups}
              parentUpdateTable={props.parentUpdateTable}
              parentUpdateTableColumns={props.parentUpdateTableColumns}
            />
          )
        })}
        <th
          className="
            relative px-6 py-3 border-e border-e-gray-300 border-b border-b-gray-300
            min-w-[50px] max-w-[50px] whitespace-normal break-words place-items-center
            items-center
          "
        >
          <Dropdown
            inline
            arrowIcon={false}
            label={(<HiOutlinePlusCircle className="text-gray-600 hover:fill-gray-200 hover:text-gray-900" size={24}/>)}
          >
            <div className="w-max bg-white z-20">
              <span className="whitespace-nowrap px-4 border-b pb-0.5 text-base w-full flex justify-center">Add a Column</span>
              <div className="grid grid-cols-2 p-1 gap-x-2">
                <Dropdown.Item 
                  as='button'
                  className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                  onClick={() => pushColumn('value')}
                >
                  <HiOutlinePencil size={32} className="bg-orange-400 border-4 border-orange-400 rounded-lg"/>
                  <div className="flex flex-col">
                    <span className="whitespace-nowrap">Value Column</span>
                    <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column holds simple values</span>
                  </div>
                </Dropdown.Item>
                <Dropdown.Item  
                  as='button'
                  className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                  onClick={() => pushColumn('choice')}
                >
                  <HiOutlineListBullet size={32} className="bg-blue-500 border-4 border-blue-500 rounded-lg"/>
                  <div className="flex flex-col">
                    <span className="whitespace-nowrap">Choice Column</span>
                    <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column can have different choices to pick.</span>
                  </div>
                </Dropdown.Item >
                <Dropdown.Item  
                  as='button'
                  className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                  onClick={() => pushColumn('date')}
                >
                  <HiOutlineCalendar size={32} className="bg-pink-400 border-4 border-pink-400 rounded-lg"/>
                  <div className="flex flex-col">
                    <span className="whitespace-nowrap">Timeslot Column</span>
                    <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column hold timeslots available to participants.</span>
                  </div>
                </Dropdown.Item >
                <Dropdown.Item  
                  as='button'
                  className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                  onClick={() => pushColumn('file')}
                >
                  <HiOutlineDocumentText size={32} className="bg-red-500 border-4 border-red-500 rounded-lg"/>
                  <div className="flex flex-col">
                    <span className="whitespace-nowrap">File Column</span>
                    <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column holds files uploaded by the user.</span>
                  </div>
                </Dropdown.Item>
                <Dropdown.Item  
                  as='button'
                  className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                  onClick={() => pushColumn('tag')}
                >
                  <HiOutlineTag size={32} className="bg-fuchsia-600 border-4 border-fuchsia-600 rounded-lg"/>
                  <div className="flex flex-col">
                    <span className="whitespace-nowrap">Tag Column</span>
                    <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column holds tags associated with participants.</span>
                  </div>
                </Dropdown.Item >
              </div>
            </div>
          </Dropdown>
        </th>
      </tr>
    </thead>
  )
}
