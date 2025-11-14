import { Table, TableColumn, TableGroup, Timeslot, UserData, UserProfile, UserTag } from "../../../types"
import { AggregateCell } from "./AggregateCell"
import { TimeslotService } from "../../../services/timeslotService"
import { Dispatch, SetStateAction } from "react"
import { UseMutationResult, UseQueryResult } from "@tanstack/react-query"
import { AppendTableRowParams, CreateChoiceParams, DeleteTableRowParams, TableService, UpdateTableColumnParams } from "../../../services/tableService"
import { UserService } from "../../../services/userService"
import { PhotoPathService } from "../../../services/photoPathService"
import { HiOutlinePlusCircle } from "react-icons/hi2"
import { TableRowComponent } from "./TableRowComponent"

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