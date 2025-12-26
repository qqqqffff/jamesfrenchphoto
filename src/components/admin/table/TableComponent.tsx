import { Dispatch, SetStateAction, useRef, useState } from "react"
import { 
  Table, 
  TableColumn, 
  TableGroup, 
  UserData, 
  UserProfile, 
  UserTag,
  Notification,
  Timeslot
} from "../../../types"
import { useMutation, useQueries, useQuery, UseQueryResult } from "@tanstack/react-query"
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
import { NotificationService } from "../../../services/notificationService"
import { TablePanelNotification } from "./TablePanel"

interface TableComponentProps {
  TableService: TableService,
  TimeslotService: TimeslotService,
  UserService: UserService,
  table: Table,
  search: string
  PhotoPathService: PhotoPathService,
  NotificationService: NotificationService,
  tempUsers: UserProfile[],
  users: UserData[],
  notifications: Notification[],
  sidePanelExpanded: boolean,
  setTempUsers: Dispatch<SetStateAction<UserProfile[]>>
  setUsers: Dispatch<SetStateAction<UserData[]>>
  setNotifications: Dispatch<SetStateAction<Notification[]>>
  setTableNotifications: Dispatch<SetStateAction<TablePanelNotification[]>>
  parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTable: Dispatch<SetStateAction<Table | undefined>>
  parentUpdateTableColumns: Dispatch<SetStateAction<TableColumn[]>>
  userData: UseQueryResult<UserData[] | undefined, Error>
  tagData: UseQueryResult<UserTag[] | undefined, Error>
  tempUsersData: UseQueryResult<UserProfile[] | undefined, Error>
  notificationsData: UseQueryResult<Notification[], Error>
}

export const TableComponent = (props: TableComponentProps) => {
  const [deleteColumnConfirmation, setDeleteColumnConfirmation] = useState(false)
  
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate)
  const [selectedTag, setSelectedTag] = useState<UserTag | undefined>()
  const [createUser, setCreateUser] = useState(false)

  //TODO: remove redundancy
  const timeslotsQuery = useQuery(props.TimeslotService.getAllTimeslotsByDateQueryOptions(selectedDate))
  const allTableTimeslots: UseQueryResult<Timeslot | null, Error>[] = useQueries({
    queries: props.table.columns
      .filter((column) => column.type === 'date')
      .flatMap((column) => column.values)
      .filter((value) => value !== '')
      .flatMap((value) => value.split(','))
      .reduce((prev, cur) => {
        if(!prev.some((timeslotId) => timeslotId === cur)) {
          prev.push(cur)
        }
        return prev
      }, [] as string[])
      .map((timeslotId) => props.TimeslotService.getTimeslotByIdQueryOptions(timeslotId, { siTag: false }))
  })
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
      if(
        props.search === '' ||
        row.some((value) => (
          (
            (
              value[1] === 'value' ||
              value[1] === 'choice' ||
              value[1] === 'file'
            ) && value[0].toLowerCase().includes(props.search.toLowerCase())) ||
            (value[1] === 'notification' && props.notifications.find((notification) => notification.content.toLowerCase().includes(props.search.toLowerCase()))) ||
            (value[1] === 'date' && allTableTimeslots
              .map((query) => query.data)
              .filter((timeslot) => timeslot !== undefined && timeslot !== null)
              .filter((timeslot) => value[0].includes(timeslot.id))
              .some((timeslot) => (
                new Date(timeslot.start).toLocaleString('en-us', { timeZone: 'America/Chicago' }).toLowerCase().includes(props.search.toLowerCase()) ||
                new Date(timeslot.end).toLocaleString('en-us', { timeZone: 'America/Chicago' }).toLowerCase().includes(props.search.toLowerCase())
              ))
            ) ||
            (value[1] === 'tag' && (props.tagData.data ?? [])
              .filter((tag) => value[0].includes(tag.id))
              .some((tag) => tag.name.toLowerCase().includes(props.search.toLowerCase()))
            )
        ))
      ) {
        tableRows.push(row)
      }
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

  const adminRegisterTimeslot = useMutation({
    mutationFn: (params: AdminRegisterTimeslotMutationParams) => props.TimeslotService.adminRegisterTimeslotMutation(params)
  })

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

          props.setTempUsers((prev) => [...prev, userProfile])
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
      <div className="relative shadow-md overflow-auto max-h-full max-w-full">
        <table 
          className={`text-sm w-full h-full`}
        >
          <TableHeaderComponent 
            TableService={props.TableService}
            table={props.table}
            refColumn={refColumn}
            tagData={props.tagData}
            users={props.users}
            notifications={props.notifications}
            timeslots={allTableTimeslots.map((data) => data.data).filter((timeslot) => timeslot !== undefined && timeslot !== null)}
            tempUsers={props.tempUsers}
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
            NotificationService={props.NotificationService}
            table={props.table}
            tableRows={tableRows}
            search={props.search}
            users={props.users}
            tempUsers={props.tempUsers}
            notifications={props.notifications}
            selectedTag={selectedTag}
            selectedDate={selectedDate}
            baseLink={link}
            refRow={refRow}
            allTableTimeslotsQuery={allTableTimeslots}
            timeslotsQuery={timeslotsQuery}
            tagTimeslotQuery={tagTimeslotQuery}
            tagData={props.tagData}
            userData={props.userData}
            tempUsersData={props.tempUsersData}
            notificationsData={props.notificationsData}
            deleteRow={deleteRow}
            appendRow={appendRow}
            updateColumn={updateColumn}
            createChoice={createChoice}
            reorderTableRows={reorderTableRows}
            updateUserAttribute={updateUserAttribute}
            updateUserProfile={updateUserProfile}
            updateParticipant={updateParticipant}
            createParticipant={createParticipant}
            adminRegisterTimeslot={adminRegisterTimeslot}
            setTempUsers={props.setTempUsers}
            setUsers={props.setUsers}
            setSelectedDate={setSelectedDate}
            setSelectedTag={setSelectedTag}
            setCreateUser={setCreateUser}
            setNotifications={props.setNotifications}
            setTableNotifications={props.setTableNotifications}
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