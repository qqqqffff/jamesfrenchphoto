import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Table, TableGroup } from "../../../types";
import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { CreateTableParams, ReorderTableGroupParams, TableService } from "../../../services/tableService";
import { v4 } from "uuid";
import { dropTargetForElements, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { triggerPostMoveFlash } from '@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { getTableGroupData, isTableGroupData, isTableListData } from "./TableListData";
import { flushSync } from "react-dom";
import { TableListItem } from "./TableListItem";
import invariant from 'tiny-invariant';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';

interface TableListProps {
  TableService: TableService
  tableGroup: TableGroup,
  selectedGroups: TableGroup[]
  tableSelected?: string
  parentUpdateSelectedTable: Dispatch<SetStateAction<Table | undefined>>
  parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  createTable: UseMutationResult<string | undefined, Error, CreateTableParams, unknown>
}

export const TableList = (props: TableListProps) => {
  const listRef = useRef<HTMLOListElement | null>(null)
  const [temporarySelectedGroups, setTemporarySelectedGroups] = useState<TableGroup[]>([])

  useEffect(() => {
    const element = listRef.current

    invariant(element)

    return dropTargetForElements({
      element,
      canDrop({ source }) {
        if(source.element === element) return false
        return isTableListData(source.data)
      },
      getData() {
        const data = getTableGroupData(props.tableGroup)
        return data
      }
    })

  }, [props.tableGroup])


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