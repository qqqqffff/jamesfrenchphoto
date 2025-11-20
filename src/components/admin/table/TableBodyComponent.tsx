import { Table, TableColumn, TableGroup, Timeslot, UserData, UserProfile, UserTag } from "../../../types"
import { AggregateCell } from "./AggregateCell"
import { AdminRegisterTimeslotMutationParams, TimeslotService } from "../../../services/timeslotService"
import { Dispatch, SetStateAction, useEffect } from "react"
import { UseMutationResult, UseQueryResult } from "@tanstack/react-query"
import { AppendTableRowParams, CreateChoiceParams, DeleteTableRowParams, ReorderTableRowsParams, TableService, UpdateTableColumnParams } from "../../../services/tableService"
import { CreateParticipantParams, UpdateParticipantMutationParams, UpdateUserAttributesMutationParams, UpdateUserProfileParams, UserService } from "../../../services/userService"
import { PhotoPathService } from "../../../services/photoPathService"
import { HiOutlinePlusCircle } from "react-icons/hi2"
import { TableRowComponent } from "./TableRowComponent"
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { triggerPostMoveFlash } from '@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash';
import { isTableRowData } from "./TableRowData"
import { flushSync } from "react-dom"

interface TableBodyComponentProps {
  TimeslotService: TimeslotService,
  UserService: UserService,
  TableService: TableService
  PhotoPathService: PhotoPathService
  table: Table
  tableRows: [string, TableColumn['type'], string][][],
  users: UserData[],
  tempUsers: UserProfile[],
  selectedTag: UserTag | undefined,
  selectedDate: Date
  refRow: React.MutableRefObject<number>
  timeslotsQuery: UseQueryResult<Timeslot[], Error>
  tagTimeslotQuery: UseQueryResult<Timeslot[], Error>
  tagData: UseQueryResult<UserTag[] | undefined, Error>
  userData: UseQueryResult<UserData[] | undefined, Error>
  tempUsersData: UseQueryResult<UserProfile[] | undefined, Error>
  deleteRow: UseMutationResult<void, Error, DeleteTableRowParams, unknown>
  appendRow: UseMutationResult<void, Error, AppendTableRowParams, unknown>
  updateColumn: UseMutationResult<void, Error, UpdateTableColumnParams, unknown>
  createChoice: UseMutationResult<[string, string] | undefined, Error, CreateChoiceParams, unknown>
  reorderTableRows: UseMutationResult<void, Error, ReorderTableRowsParams, unknown>
  updateUserAttribute: UseMutationResult<unknown, Error, UpdateUserAttributesMutationParams, unknown>
  updateUserProfile: UseMutationResult<void, Error, UpdateUserProfileParams, unknown>
  updateParticipant: UseMutationResult<void, Error, UpdateParticipantMutationParams, unknown>
  createParticipant: UseMutationResult<void, Error, CreateParticipantParams, unknown>
  registerTimeslot: UseMutationResult<Timeslot | null, Error, AdminRegisterTimeslotMutationParams, unknown>
  setTempUsers: Dispatch<SetStateAction<UserProfile[]>>
  setUsers: Dispatch<SetStateAction<UserData[]>>
  setSelectedDate: Dispatch<SetStateAction<Date>>
  setSelectedTag: Dispatch<SetStateAction<UserTag | undefined>>
  setCreateUser: Dispatch<SetStateAction<boolean>>
  parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTable: Dispatch<SetStateAction<Table | undefined>>
  parentUpdateTableColumns: Dispatch<SetStateAction<TableColumn[]>>
}

export const TableBodyComponent = (props: TableBodyComponentProps) => {
  useEffect(() => {
    return monitorForElements({
      canMonitor({ source }) {
        return isTableRowData(source.data)
      },
      onDrop({ location, source }) {
        const target = location.current.dropTargets[0]
        if(!target) {
          return
        }

        const sourceData = source.data
        const targetData = target.data

        if(!isTableRowData(sourceData) || !isTableRowData(targetData)) {
          return
        }
        
        const indexOfSource = sourceData.rowIndex
        const indexOfTarget = targetData.rowIndex

        if(indexOfSource < 0 || indexOfTarget < 0 || indexOfSource === indexOfTarget) {
          return
        }

        const closestEdgeOfTarget = extractClosestEdge(targetData)

        //id, values[]
        const updatedValues: Map<string, string[]> = new Map()

        for(let i = 0; i < indexOfTarget + (closestEdgeOfTarget === 'top' ? 0 : 1); i++) {
          if(i === indexOfSource) continue
          for(let j = 0; j < props.table.columns.length; j++){
            updatedValues.set(
              props.table.columns[j].id, 
              [...(updatedValues.get(props.table.columns[j].id) ?? []), props.table.columns[j].values[i]]
            )
          }
        }
        for(let j = 0; j < props.table.columns.length; j++) {
          updatedValues.set(
            props.table.columns[j].id,
            [...(updatedValues.get(props.table.columns[j].id) ?? []), props.table.columns[j].values[indexOfSource]]
          )
        }
        for(let i = indexOfTarget + (closestEdgeOfTarget === 'top' ? 0 : 1); i < props.table.columns[0].values.length; i++) {
          if(i === indexOfSource) continue
          for(let j = 0; j < props.table.columns.length; j++) {
            updatedValues.set(
              props.table.columns[j].id, 
              [...(updatedValues.get(props.table.columns[j].id) ?? []), props.table.columns[j].values[i]]
            )
          }
        }

        flushSync(() => {
          const temp: Table = {
            ...props.table,
            columns: props.table.columns.map((column) => {
              const newValues = updatedValues.get(column.id)
              return newValues ? ({
                ...column,
                values: newValues
              }) : column
            })
          }

          const updateGroup = (prev: TableGroup[]) => {
            return prev.map((group) => group.tables.some((table) => table.id === temp.id) ? ({
              ...group,
              tables: group.tables.map((table) => table.id === temp.id ? temp : table)
            }) : group)
          }

          props.reorderTableRows.mutate({
            tableColumns: temp.columns,
            options: {
              logging: true
            }
          })

          props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
          props.parentUpdateTableGroups((prev) => updateGroup(prev))
          props.parentUpdateTable(temp)
          props.parentUpdateTableColumns(temp.columns)
        })

        const element = document.querySelector(`[data-table-row-index="${sourceData.rowIndex}"]`);
        if(element instanceof HTMLElement) {
          triggerPostMoveFlash(element)
        }
      }
    })
  }, [props.tableRows])

  return (
    <tbody>
      {props.tableRows.length > 0 && props.tableRows.map((row: [string, TableColumn['type'], string][], i: number) => {
          return (
            <TableRowComponent 
              key={i}
              TimeslotService={props.TimeslotService}
              UserService={props.UserService}
              TableService={props.TableService}
              PhotoPathService={props.PhotoPathService}
              row={row}
              i={i}
              table={props.table}
              users={props.users}
              tempUsers={props.tempUsers}
              selectedTag={props.selectedTag}
              selectedDate={props.selectedDate}
              refRow={props.refRow}
              timeslotsQuery={props.timeslotsQuery}
              tagTimeslotQuery={props.tagTimeslotQuery}
              tagData={props.tagData}
              userData={props.userData}
              tempUsersData={props.tempUsersData}
              updateColumn={props.updateColumn}
              deleteRow={props.deleteRow}
              createChoice={props.createChoice}
              updateUserAttribute={props.updateUserAttribute}
              updateUserProfile={props.updateUserProfile}
              updateParticipant={props.updateParticipant}
              createParticipant={props.createParticipant}
              registerTimeslot={props.registerTimeslot}
              setTempUsers={props.setTempUsers}
              setUsers={props.setUsers}
              setSelectedDate={props.setSelectedDate}
              setSelectedTag={props.setSelectedTag}
              setCreateUser={props.setCreateUser}
              parentUpdateSelectedTableGroups={props.parentUpdateSelectedTableGroups}
              parentUpdateTableGroups={props.parentUpdateTableGroups}
              parentUpdateTable={props.parentUpdateTable}
              parentUpdateTableColumns={props.parentUpdateTableColumns}
            />
          )
        })
      }
      {props.table.columns.some((column) => column.type === 'choice') && (
        <tr className="bg-white border-b">
          {props.table.columns.map((col, index) => {
            if(col.type === 'choice') {
              return (
                <AggregateCell
                  key={index}
                  column={col}
                />
              )
            }
            return (<td key={index} className="text-ellipsis border py-3 px-3 max-w-[150px]" />)
          })}
        </tr>
      )}
      {props.table.columns.length > 0 && (
        <tr className="bg-white w-full">
          <td className="text-ellipsis flex flex-row items-center justify-center w-full p-1 border-x border-b">
            <button
              onClick={() => {
                props.appendRow.mutate({
                  table: props.table,
                  length: props.table.columns[0].values.length + 1,
                  options: {
                    logging: true
                  }
                })

                const temp: Table = {
                  ...props.table,
                  columns: props.table.columns.map((column) => {
                    const values = column.values
                    values.push('')
                    return {
                      ...column,
                      values: values
                    }
                  })
                }

                const updateGroup = (prev: TableGroup[]) => {
                  const pTemp = [...prev]
                    .map((group) => {
                      if(group.id === temp.tableGroupId){
                        return {
                          ...group,
                          tables: group.tables.map((table) => {
                            if(table.id === temp.id){
                              return temp
                            }
                            return table
                          })
                        }
                      }
                      return group
                    })

                  return pTemp
                }

                props.parentUpdateTable(temp)
                props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
                props.parentUpdateTableGroups((prev) => updateGroup(prev))
              }}
            >
              <HiOutlinePlusCircle className="text-gray-600 hover:fill-gray-200 hover:text-gray-900" size={24}/>
            </button>
          </td>
        </tr>
      )}
    </tbody>
  )
}