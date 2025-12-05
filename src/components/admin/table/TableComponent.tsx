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
  ReorderTableColumnsParams,
  ReorderTableRowsParams
} from "../../../services/tableService"
import { currentDate } from "../../../utils"
import { ConfirmationModal, CreateUserModal } from "../../modals"
import { AdminRegisterTimeslotMutationParams, TimeslotService } from "../../../services/timeslotService"
import { UserService, InviteUserParams, CreateParticipantParams, UpdateParticipantMutationParams, UpdateUserAttributesMutationParams, UpdateUserProfileParams } from "../../../services/userService"
import { PhotoPathService } from "../../../services/photoPathService"
import { TableHeaderComponent } from "./TableHeaderComponent"
import { TableBodyComponent } from "./TableBodyComponent"

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
 
  const refColumn = useRef<TableColumn | null>(null)
  const refRow = useRef<number>(-1)

  //value, type, id
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

  const reorderTableRows = useMutation({
    mutationFn: (params: ReorderTableRowsParams) => props.TableService.reorderTableRowsMutation(params)
  })

  const link = window.location.href
    .replace(new RegExp(/admin.*/g), 'register')

  const updateUserAttribute = useMutation({
    mutationFn: (params: UpdateUserAttributesMutationParams) => props.UserService.updateUserAttributeMutation(params)
  })

  const updateUserProfile = useMutation({
    mutationFn: (params: UpdateUserProfileParams) => props.UserService.updateUserProfileMutation(params)
  })

  const updateParticipant = useMutation({
    mutationFn: (params: UpdateParticipantMutationParams) => props.UserService.updateParticipantMutation(params)
  })

  const createParticipant = useMutation({
    mutationFn: (params: CreateParticipantParams) => props.UserService.createParticipantMutation(params)
  })

  const registerTimeslot = useMutation({
    mutationFn: (params: AdminRegisterTimeslotMutationParams) => props.TimeslotService.adminRegisterTimeslotMutation(params)
  })

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
        UserService={props.UserService}
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
      <div className="relative shadow-md ">
        <table className="w-full text-sm text-left text-gray-600">
          <TableHeaderComponent 
            table={props.table}
            refColumn={refColumn}
            tagData={props.tagData}
            users={users}
            tempUsers={tempUsers}
            createColumn={createColumn}
            updateColumn={updateColumn}
            reorderTableColumns={reorderTableColumns}
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
            baseLink={link}
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
            reorderTableRows={reorderTableRows}
            updateUserAttribute={updateUserAttribute}
            updateUserProfile={updateUserProfile}
            updateParticipant={updateParticipant}
            createParticipant={createParticipant}
            registerTimeslot={registerTimeslot}
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