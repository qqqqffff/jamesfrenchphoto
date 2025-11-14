import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import { 
  Table, 
  TableColumn, 
  TableGroup, 
  UserData, 
  UserProfile, 
  UserTag 
} from "../../../types"
import { useMutation, useQuery, UseQueryResult } from "@tanstack/react-query"
import { 
  TableService,
  AppendTableRowParams,
  CreateChoiceParams, 
  CreateTableColumnParams, 
  DeleteTableColumnParams, 
  DeleteTableRowParams, 
  UpdateTableColumnParams, 
  ReorderTableColumnsParams
} from "../../../services/tableService"
import { currentDate } from "../../../utils"
import { ConfirmationModal, CreateUserModal } from "../../modals"
import { TimeslotService } from "../../../services/timeslotService"
import { UserService, InviteUserParams } from "../../../services/userService"
import { PhotoPathService } from "../../../services/photoPathService"
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { isDraggingTableColumn, isTableColumnData } from "./TableColumnData"
import { flushSync } from "react-dom"
import { triggerPostMoveFlash } from '@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { TableHeaderComponent } from "./TableHeaderComponent"
import { TableBodyComponent } from "./TableBodyComponent"

// import { createParticipantMutation, CreateParticipantParams, updateParticipantMutation, UpdateParticipantMutationParams, updateUserAttributeMutation, UpdateUserAttributesMutationParams, updateUserProfileMutation, UpdateUserProfileParams } from "../../../services/userService"

interface TableComponentProps {
  TableService: TableService,
  TimeslotService: TimeslotService,
  UserService: UserService,
  table: Table,
  PhotoPathService: PhotoPathService,
  parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTable: Dispatch<SetStateAction<Table | undefined>>
  parentUpdateTableColumns: Dispatch<SetStateAction<TableColumn[]>>
  userData: UseQueryResult<UserData[] | undefined, Error>
  tagData: UseQueryResult<UserTag[] | undefined, Error>
  tempUsersData: UseQueryResult<UserProfile[] | undefined, Error>
}

export const TableComponent = (props: TableComponentProps) => {
  const [deleteColumnConfirmation, setDeleteColumnConfirmation] = useState(false)
  const [tempUsers, setTempUsers] = useState<UserProfile[]>([])
  const [users, setUsers] = useState<UserData[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate)
  const [selectedTag, setSelectedTag] = useState<UserTag | undefined>()
  const [createUser, setCreateUser] = useState(false)

  const timeslotsQuery = useQuery(props.TimeslotService.getAllTimeslotsByDateQueryOptions(selectedDate))
  const tagTimeslotQuery = useQuery({
    ...props.TimeslotService.getAllTimeslotsByUserTagQueryOptions(selectedTag?.id),
    enabled: selectedTag !== undefined
  })
 
  const tableRef = useRef<HTMLTableElement | null>(null)
  const refColumn = useRef<TableColumn | null>(null)
  const refRow = useRef<number>(-1)

  const tableRows: [string, TableColumn['type'], string][][] = []

  if(props.table.columns.length > 0) { 
    for(let i = 0; i < props.table.columns[0].values.length; i++){
      const row: [string, TableColumn['type'], string][] = []
      for(let j = 0; j < props.table.columns.length; j++){
        row.push([props.table.columns[j].values[i], props.table.columns[j].type, props.table.columns[j].id])
      }
      tableRows.push(row)
    }
  }

  const createColumn = useMutation({
    mutationFn: (params: CreateTableColumnParams) => props.TableService.createTableColumnMutation(params),
  })

  const updateColumn = useMutation({
    mutationFn: (params: UpdateTableColumnParams) => props.TableService.updateTableColumnsMutation(params),
  })

  const appendRow = useMutation({
    mutationFn: (params: AppendTableRowParams) => props.TableService.appendTableRowMutation(params)
  })

  const deleteRow = useMutation({
    mutationFn: (params: DeleteTableRowParams) => props.TableService.deleteTableRowMutation(params)
  })

  const deleteColumn = useMutation({
    mutationFn: (params: DeleteTableColumnParams) => props.TableService.deleteTableColumnMutation(params)
  })

  const createChoice = useMutation({
    mutationFn: (params: CreateChoiceParams) => props.TableService.createChoiceMutation(params),
  })

  const inviteUser = useMutation({
    mutationFn: (params: InviteUserParams) => props.UserService.inviteUserMutation(params),
  })

  const reorderTableColumns = useMutation({
    mutationFn: (params: ReorderTableColumnsParams) => props.TableService.reorderTableColumnsMutation(params)
  })

  const link = window.location.href
    .replace(new RegExp(/admin.*/g), 'register')

  // const updateUserAttribute = useMutation({
  //   mutationFn: (params: UpdateUserAttributesMutationParams) => updateUserAttributeMutation(params)
  // })

  // const updateUserProfile = useMutation({
  //   mutationFn: (params: UpdateUserProfileParams) => updateUserProfileMutation(params)
  // })

  // const updateParticipant = useMutation({
  //   mutationFn: (params: UpdateParticipantMutationParams) => updateParticipantMutation(params)
  // })

  // const createParticipant = useMutation({
  //   mutationFn: (params: CreateParticipantParams) => createParticipantMutation(params)
  // })

  useEffect(() => {
    if(props.tempUsersData.data && props.tempUsersData.data.length > 0) {
      setTempUsers(props.tempUsersData.data)
    }
  }, [props.tempUsersData.data])

  useEffect(() => {
    if(props.userData.data) {
      setUsers(props.userData.data)
    }
  }, [props.userData.data])

  useEffect(() => {
    const element = tableRef.current

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

          if(indexOfTarget < 0 || indexOfSource < 0) {
            return
          }

          const closestEdgeOfTarget = extractClosestEdge(targetData)

          const updatedTableColumns: TableColumn[] = []

          if(closestEdgeOfTarget === 'left') {
            updatedTableColumns.push(
              ...props.table.columns.slice(0, indexOfTarget)
            )
            updatedTableColumns.push({...props.table.columns[indexOfSource], order: indexOfTarget })
            updatedTableColumns.push(
              ...props.table.columns.slice(indexOfTarget)
            )
          }
          else if(closestEdgeOfTarget === 'right') {
            updatedTableColumns.push(
              ...props.table.columns.slice(0, indexOfTarget + 1)
            )
            updatedTableColumns.push({ ...props.table.columns[indexOfSource], order: indexOfTarget })
            updatedTableColumns.push(
              ...props.table.columns.slice(indexOfTarget + 1)
            )
          }

          const newTableColumns = updatedTableColumns.filter((column) => column.order !== indexOfSource).map((column, index) => ({ ...column, order: index }))
          
          flushSync(() => {
            const updateGroup = (prev: TableGroup[]): TableGroup[] => {
              return prev.map((group) => group.tables.some((table) => table.id === props.table.id) ? ({
                ...group,
                tables: group.tables.map((table) => table.id === props.table.id ? ({
                  ...table,
                  columns: newTableColumns,
                }) : table)
              }) : group)
            }
            reorderTableColumns.mutate({
              tableColumns: newTableColumns,
              options: {
                logging: true
              }
            })
            props.parentUpdateTableColumns(newTableColumns)
            props.parentUpdateSelectedTableGroups(prev => updateGroup(prev))
            props.parentUpdateTableGroups(prev => updateGroup(prev))
            props.parentUpdateTable({
              ...props.table,
              columns: newTableColumns
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

  //TODO: implement me
  // const linkUserProfile = (
  //   userProfile: UserProfile, 
  //   rowIndex: number,
  //   linkedColumns: { 
  //     columnId: string, 
  //     field: 'first' | 'last' | 'middle' | 'email' | 'sitting' | 'preferred', 
  //     participant: boolean
  //   }[]
  // ) => {
  //   // only value, tag or date columns will be affected by linked participant
  //   //append [*participantId*<id>, field] to values columns
  //   //append [*participantId*<id>] to tag or date columns
  // }

  console.log(props.table.columns)

  return (
    <>
      <ConfirmationModal
        title="Delete Column"
        body="This action will <b>DELETE</b> this column <b>AND</b> all of its values. This action cannot be undone!"
        denyText="Cancel"
        confirmText="Delete"
        confirmAction={() => {
          if(refColumn.current){
            const column: TableColumn = refColumn.current

            deleteColumn.mutate({
              table: props.table,
              column: column,
              options: {
                logging: true
              }
            })

            const temp: Table = {
              ...props.table,
              columns: props.table.columns.filter((parentColumn) => parentColumn.id !== column.id)
            }

            const updateGroup = (prev: TableGroup[]) => {
              const pTemp: TableGroup[] = [...prev]
                .map((group) => {
                  if(group.id === temp.tableGroupId){
                    return {
                      ...group,
                      tables: group.tables.map((table) => {
                        if(table.id === temp.id) {
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

            props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
            props.parentUpdateTableGroups((prev) => updateGroup(prev))
            props.parentUpdateTable(temp)
            props.parentUpdateTableColumns(temp.columns)
          }
        }}
        onClose={() => setDeleteColumnConfirmation(false)}
        open={deleteColumnConfirmation}
      />
      <CreateUserModal 
        createUser={(userProfile) => {
          //TODO: retroactively register the participant for the selected timeslots
          //TODO: also handle errors too
          inviteUser.mutate({
            sittingNumber: userProfile.sittingNumber,
            email: userProfile.email,
            firstName: userProfile.firstName!,
            lastName: userProfile.lastName!,
            participants: userProfile.participant,
            baseLink: link,
            options: {
              logging: true
            }
          })

          tempUsers.push(userProfile)
        }}
        tableColumns={props.table.columns}
        rowNumber={refRow.current}
        tags={props.tagData}
        open={createUser}
        onClose={() => {
          setCreateUser(false)
          refRow.current = -1
        }}
      />
      {/* overflow-x-auto overflow-y-auto */}
      <div className="relative shadow-md overflow-scroll max-w-[60vw] max-h-[85vh]">
        <table className="w-full text-sm text-left text-gray-600" ref={tableRef}>
          <TableHeaderComponent 
            table={props.table}
            refColumn={refColumn}
            createColumn={createColumn}
            updateColumn={updateColumn}
            setDeleteColumnConfirmation={setDeleteColumnConfirmation}
            parentUpdateSelectedTableGroups={props.parentUpdateSelectedTableGroups}
            parentUpdateTableGroups={props.parentUpdateTableGroups}
            parentUpdateTable={props.parentUpdateTable}
            parentUpdateTableColumns={props.parentUpdateTableColumns}
          />
          <TableBodyComponent 
            TimeslotService={props.TimeslotService}
            UserService={props.UserService}
            TableService={props.TableService}
            PhotoPathService={props.PhotoPathService}
            table={props.table}
            tableRows={tableRows}
            users={users}
            tempUsers={tempUsers}
            selectedTag={selectedTag}
            selectedDate={selectedDate}
            refRow={refRow}
            timeslotsQuery={timeslotsQuery}
            tagTimeslotQuery={tagTimeslotQuery}
            tagData={props.tagData}
            userData={props.userData}
            tempUsersData={props.tempUsersData}
            deleteRow={deleteRow}
            appendRow={appendRow}
            updateColumn={updateColumn}
            createChoice={createChoice}
            setTempUsers={setTempUsers}
            setUsers={setUsers}
            setSelectedDate={setSelectedDate}
            setSelectedTag={setSelectedTag}
            setCreateUser={setCreateUser}
            parentUpdateSelectedTableGroups={props.parentUpdateSelectedTableGroups}
            parentUpdateTableGroups={props.parentUpdateTableGroups}
            parentUpdateTable={props.parentUpdateTable}
            parentUpdateTableColumns={props.parentUpdateTableColumns}
          />
        </table>
      </div>
    </>
  )
}