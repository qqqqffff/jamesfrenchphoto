import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { Table, TableGroup } from "../../../types";
import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { CreateTableParams, ReorderTableGroupParams, TableService } from "../../../services/tableService";
import { v4 } from "uuid";
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { triggerPostMoveFlash } from '@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { isDraggingTableList, isTableListData } from "./TableListData";
import { flushSync } from "react-dom";
import { TableListItem } from "./TableListItem";

interface TableListProps {
  TableService: TableService
  tableGroup: TableGroup,
  tableSelected?: string
  parentUpdateSelectedTable: Dispatch<SetStateAction<Table | undefined>>
  parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  createTable: UseMutationResult<string | undefined, Error, CreateTableParams, unknown>
}

export const TableList = (props: TableListProps) => {
  const listRef = useRef<HTMLOListElement | null>(null)

  useEffect(() => {
    const element = listRef.current

    if(!element) {
      return
    }

    return combine(
      monitorForElements({
        canMonitor: isDraggingTableList,
        onDrop({ location, source }) {
          const target = location.current.dropTargets[0]
          if(!target) {
            return
          }

          const sourceData = source.data
          const targetData = target.data

          if(!isTableListData(sourceData) || !isTableListData(targetData)) {
            return
          }

          //TODO: expand me so that tables can be interchanged with other table groups
          const tables = props.tableGroup.tables.sort((a, b) => b.order - a.order)
          const indexOfSource = tables.findIndex((table) => table.id === sourceData.tableId)
          const indexOfTarget = tables.findIndex((table) => table.id === targetData.tableId)

          if(indexOfSource === -1 || indexOfTarget === -1 || indexOfSource === indexOfTarget) {
            return
          }

          const closestEdgeOfTarget = extractClosestEdge(targetData)

          const updatedTables: Table[] = []

          for(let i = 0; i < indexOfTarget + (closestEdgeOfTarget === 'top' ? 0 : 1); i++) {
            if(i === indexOfSource) continue
            updatedTables.push({
              ...tables[i],
              order: i
            })
          }
          updatedTables.push({
            ...tables[indexOfSource],
            order: indexOfTarget
          })
          for(let i = indexOfTarget + (closestEdgeOfTarget === 'top' ? 0 : 1); i < tables.length; i++) {
            if(i === indexOfSource) continue
            updatedTables.push({
              ...tables[i],
              order: i
            })
          }

          flushSync(() => {
            const updateGroup = (prev: TableGroup[]) => prev.map((parentGroup) => parentGroup.id === props.tableGroup.id ? ({
              ...parentGroup,
              tables: updatedTables
            }) : parentGroup)

            reorderTables.mutate({
              tables: updatedTables,
              options: {
                logging: true
              }
            })

            const selectedTable = tables.find((table) => table.id === props.tableSelected)
            props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
            props.parentUpdateTableGroups((prev) => updateGroup(prev))
            props.parentUpdateSelectedTable((prev) => selectedTable?.id === prev?.id ? selectedTable : prev)
          })

          const element = document.querySelector(`[data-table-list-id="${sourceData.tableId}"]`)
          if(element instanceof HTMLElement) {
            triggerPostMoveFlash(element)
          }
        }
      })
    )
  }, [props.tableGroup])

  const reorderTables = useMutation({
    mutationFn: (params: ReorderTableGroupParams) => props.TableService.reorderTableGroupMutation(params)
  })

  return (
    <ol className="ps-10" ref={listRef}>
      {props.tableGroup.tables.length === 0 ? (
        <button
          className="
            text-sm font-light w-full px-6 py-0.5 flex flex-row items-center 
            cursor-pointer hover:text-gray-500 hover:bg-gray-100 
            hover:border-gray-600 rounded-md hover:underline
          "
          onClick={() => {
            const tableId = v4()
            const newTable: Table = {
              id: tableId,
              temporary: true,
              createdAt: new Date().toISOString(),
              name: '',
              columns: [
                {
                  id: v4(),
                  header: 'Sitting Number',
                  values: ['1234', '', ''],
                  type: 'value',
                  display: true,
                  tags: [],
                  choices: ['', '', ''],
                  tableId: tableId,
                  order: 0,
                },
                {
                  id: v4(),
                  header: 'Participant First',
                  values: ['Jane', '', ''],
                  type: 'value',
                  display: true,
                  tags: [],
                  choices: ['', '', ''],
                  tableId: tableId,
                  order: 1,
                },
                {
                  id: v4(),
                  header: 'Participant Last',
                  values: ['Doe', '', ''],
                  type: 'value',
                  display: true,
                  tags: [],
                  choices: ['', '', ''],
                  tableId: tableId,
                  order: 2,
                },
              ],
              tableGroupId: props.tableGroup.id,
              order: props.tableGroup.tables.length,
            }
            
            const updateGroup = (prev: TableGroup[]) => {
              const temp = [
                ...prev
              ]
              //select the group when adding
              if(!temp.some((parentGroup) => props.tableGroup.id === parentGroup.id)) {
                temp.push(props.tableGroup)
              }

              return temp.map((parentGroup) => {
                if(parentGroup.id === props.tableGroup.id) {
                  return ({
                    ...parentGroup,
                    tables: [...parentGroup.tables, newTable]
                  })
                }
                return parentGroup
              })
            }

            props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
            props.parentUpdateTableGroups((prev) => updateGroup(prev))
            props.parentUpdateSelectedTable(newTable)
          }}
        >
          <li style={{ listStyleType: 'circle' }} />
          <span className="italic">Click here or the three dots to add a table</span>
        </button>
      ) : (
        props.tableGroup.tables
        .sort((a, b) => b.order - a.order)
        .map((table, index) => {
          return (
            <TableListItem 
              key={index}
              table={table}
              tableGroup={props.tableGroup}
              tableSelected={props.tableSelected}
              parentUpdateSelectedTable={props.parentUpdateSelectedTable}
              parentUpdateSelectedTableGroups={props.parentUpdateSelectedTableGroups}
              parentUpdateTableGroups={props.parentUpdateTableGroups}
              createTable={props.createTable}
            />
          )
        })
      )}
    </ol>
  )
}