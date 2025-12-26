import { Dropdown } from "flowbite-react"
import { Notification, Table, TableColumn, TableGroup, Timeslot, UserData, UserProfile, UserTag } from "../../../types"
import { TableColumnComponent } from "./TableColumnComponent"
import { UseMutationResult, UseQueryResult } from "@tanstack/react-query"
import { MutableRefObject, Dispatch, SetStateAction, useRef, useEffect } from "react"
import { CreateTableColumnParams, ReorderTableColumnsParams, TableService, UpdateTableColumnParams } from "../../../services/tableService"
import { HiOutlineCalendar, HiOutlineDocumentText, HiOutlineListBullet, HiOutlinePencil, HiOutlinePlusCircle, HiOutlineTag } from 'react-icons/hi2'
import { v4 } from 'uuid'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { isDraggingTableColumn, isTableColumnData } from "./TableColumnData"
import { flushSync } from "react-dom"
import { triggerPostMoveFlash } from '@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';

interface TableHeaderComponentProps {
  TableService: TableService
  table: Table
  refColumn: MutableRefObject<TableColumn | null>
  users: UserData[]
  tempUsers: UserProfile[]
  tagData: UseQueryResult<UserTag[] | undefined, Error>
  timeslots: Timeslot[]
  notifications: Notification[]
  createColumn: UseMutationResult<void, Error, CreateTableColumnParams, unknown>
  updateColumn: UseMutationResult<void, Error, UpdateTableColumnParams, unknown>
  reorderTableColumns: UseMutationResult<void, Error, ReorderTableColumnsParams, unknown>
  setDeleteColumnConfirmation: Dispatch<SetStateAction<boolean>>
  parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTable: Dispatch<SetStateAction<Table | undefined>>
  parentUpdateTableColumns: Dispatch<SetStateAction<TableColumn[]>>
}

export const TableHeaderComponent = (props: TableHeaderComponentProps) => {
  const tableHeadRef = useRef<HTMLTableSectionElement | null>(null)

  useEffect(() => {
    const element = tableHeadRef.current

    if(!element) {
      return
    }

    return combine(
      monitorForElements({
        canMonitor: isDraggingTableColumn,
        onDrop({ location, source }) {
          const target = location.current.dropTargets[0]
          if(!target){
            return
          }

          const sourceData = source.data
          const targetData = target.data

          if(!isTableColumnData(sourceData) || !isTableColumnData(targetData)) {
            return
          }

          const tableColumns = props.table.columns.sort((a, b) => a.order - b.order)

          const indexOfSource = tableColumns.findIndex((tableColumn) => tableColumn.id === sourceData.columnId)
          const indexOfTarget = tableColumns.findIndex((tableColumn) => tableColumn.id === targetData.columnId)

          if(indexOfTarget < 0 || indexOfSource < 0 || indexOfSource === indexOfTarget) {
            return
          }

          const closestEdgeOfTarget = extractClosestEdge(targetData)

          const updatedTableColumns: TableColumn[] = []

          for(let i = 0; i < indexOfTarget + (closestEdgeOfTarget === 'left' ? 0 : 1); i++) {
            if(i === indexOfSource) continue
            updatedTableColumns.push({
              ...props.table.columns[i],
              order: i
            })
          }
          updatedTableColumns.push({
            ...props.table.columns[indexOfSource],
            order: indexOfTarget
          })
          for(let i = indexOfTarget + (closestEdgeOfTarget === 'left' ? 0 : 1); i < props.table.columns.length; i++) {
            if(i === indexOfSource) continue
            updatedTableColumns.push({
              ...props.table.columns[i],
              order: i
            })
          }
          
          flushSync(() => {
            const updateGroup = (prev: TableGroup[]): TableGroup[] => {
              return prev.map((group) => group.tables.some((table) => table.id === props.table.id) ? ({
                ...group,
                tables: group.tables.map((table) => table.id === props.table.id ? ({
                  ...table,
                  columns: updatedTableColumns,
                }) : table)
              }) : group)
            }
            props.reorderTableColumns.mutate({
              tableColumns: updatedTableColumns,
              options: {
                logging: true
              }
            })
            props.parentUpdateTableColumns(updatedTableColumns)
            props.parentUpdateSelectedTableGroups(prev => updateGroup(prev))
            props.parentUpdateTableGroups(prev => updateGroup(prev))
            props.parentUpdateTable({
              ...props.table,
              columns: updatedTableColumns
            })
          })

          const element = document.querySelector(`[data-table-column-id="${sourceData.columnId}"]`);
          if(element instanceof HTMLElement) {
            triggerPostMoveFlash(element)
          }
        }
      })
    )
  }, [props.table])

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
      if(temp.choices && temp.type !== 'choice') {
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
    <thead className="text-xs text-gray-700 bg-gray-50 sticky top-0 z-10" ref={tableHeadRef}>
      <tr className="bg-gray-50">
        {props.table.columns
        .map((column) => {
          return (
            <TableColumnComponent 
              key={column.id}
              TableService={props.TableService}
              table={props.table}
              column={column}
              refColumn={props.refColumn}
              tags={props.tagData.data ?? []}
              notifications={props.notifications}
              timeslots={props.timeslots}
              users={props.users}
              tempUsers={props.tempUsers}
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
            bg-gray-50
            relative px-6 py-3 border-e border-e-gray-300 border-b border-b-gray-300
            w-full whitespace-normal break-words justify-center flex items-center
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
                    <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column hold timeslots related to participants.</span>
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
                <Dropdown.Item  
                  as='button'
                  className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                  onClick={() => pushColumn('notification')}
                >
                  <HiOutlineTag size={32} className="bg-purple-600 border-4 border-purple-600 rounded-lg"/>
                  <div className="flex flex-col">
                    <span className="whitespace-nowrap">Notes Column</span>
                    <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column holds notifications associated with participants.</span>
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
