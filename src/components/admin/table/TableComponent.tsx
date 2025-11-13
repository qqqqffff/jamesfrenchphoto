import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import { 
  ColumnColor, 
  Participant, 
  Table, 
  TableColumn, 
  TableGroup, 
  UserData, 
  UserProfile, 
  UserTag 
} from "../../../types"
import { 
  HiOutlinePlusCircle, 
} from 'react-icons/hi2'
import { Dropdown } from "flowbite-react"
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
import { ValueCell } from "./ValueCell"
import { currentDate, defaultColumnColors } from "../../../utils"
import { ConfirmationModal, CreateUserModal } from "../../modals"
import { DateCell } from "./DateCell"
import { ChoiceCell } from "./ChoiceCell"
import { TagCell } from "./TagCell"
import { FileCell } from "./FileCell"
import { AggregateCell } from "./AggregateCell"
import { v4 } from 'uuid'
import { validateMapField } from "../../../functions/tableFunctions"
import { TimeslotService } from "../../../services/timeslotService"
import { HiOutlineDotsHorizontal } from "react-icons/hi"
import { UserService, InviteUserParams } from "../../../services/userService"
import { PhotoPathService } from "../../../services/photoPathService"
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { isDraggingTableColumn, isTableColumnData } from "./TableColumnData"
import { flushSync } from "react-dom"
import { triggerPostMoveFlash } from '@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { TableHeaderComponent } from "./TableHeaderComponent"

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

  const updateValue = (id: string, text: string, i: number) => {
    const column = props.table.columns.find((column) => column.id === id)
    let newValue: string | undefined

    if(!column) {
      //TODO: handle error
      return
    }

    const updatedColumns: TableColumn[] = []
    if(
      column.type === 'value' && 
      column.choices?.[0] !== undefined && 
      props.table.columns.some((col) => column.choices?.[0] === col.id) &&
      column.choices?.[1] !== undefined &&
      validateMapField(column.choices[1])[0] !== null
    ) {
      const foundColumn = props.table.columns.find((col) => col.id === column.choices?.[0])

      if(!foundColumn){
        //TODO: handle error
        return
      } 
    }

    updateColumn.mutate({
      column: column,
      values: column.values.map((value, index) => {
        if(index === i) return newValue ? newValue : text
        return value
      }),
      options: {
        logging: true
      }
    })

    const temp: Table = {
      ...props.table,
      columns: props.table.columns.map((column) => {
        const updatedColumn = updatedColumns.find((col) => col.id === column.id)
        if(updatedColumn) return updatedColumn
        else if(column.id === id){
          const values = [...column.values]
          values[i] = newValue ? newValue : text
          return {
            ...column,
            values: values
          }
        }
        return column
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

    props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
    props.parentUpdateTableGroups((prev) => updateGroup(prev))
    props.parentUpdateTable(temp)
    props.parentUpdateTableColumns(temp.columns)
  }

  const updateChoices = (id: string, data: {choice: string, color: string}, mode: 'create' | 'delete') => {
    const column = props.table.columns.find((column) => column.id === id)
    
    if(!column){
      //TODO: handle error
      return
    } 

    if(mode === 'create') {
      const tempColor: ColumnColor = {
        id: v4(),
        textColor: defaultColumnColors[data.color].text,
        bgColor: defaultColumnColors[data.color].bg,
        value: data.choice,
        columnId: column.id,
      }

      createChoice.mutate({
        column: column,
        colorId: tempColor.id,
        choice: data.choice,
        color: data.color,
        options: {
          logging: true
        }
      })

      const temp: Table = {
        ...props.table,
        columns: props.table.columns.map((parentColumn) => {
          if(parentColumn.id === column.id) {
            return {
              ...parentColumn,
              choices: [...(parentColumn.choices ?? []), data.choice],
              color: [...(parentColumn.color ?? []), tempColor]
            }
          }
          return parentColumn
        })
      }

      const updateGroup = (prev: TableGroup[]) => {
        const pTemp: TableGroup[] = [...prev]
          .map((group) => {
            if(group.id === temp.tableGroupId) {
              return {
                ...group,
                tables: group.tables.map((table) => {
                  if(table.id === temp.id) return temp
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
  }

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
          <tbody>
            {tableRows.length > 0 && tableRows.map((row: [string, TableColumn['type'], string][], i: number) => {
                return (
                  <tr key={i} className="bg-white border-b">
                    {row.map(([v, t, id], j) => {
                      switch(t){
                        case 'date': {
                          return (
                            <DateCell
                              key={j}
                              value={v}
                              TimeslotService={props.TimeslotService}
                              //TODO: timeslot ids should be mutually exclusive -> need to convert cells from being an array of values to be its own dynamo for now will leave as is and avoid double registrations
                              updateValue={(text) => updateValue(id, text, i)}
                              table={props.table}
                              linkedParticipantId={(() => {
                                const foundColumn = props.table.columns.find((col) => col.id === id)
                                if(!foundColumn) return undefined
                                const foundParticipantChoice = foundColumn.choices?.[i]
                                if(
                                  !users.flatMap((data) => data.profile?.participant).filter((participant) => participant !== undefined).some((participant) => participant.id === foundParticipantChoice) &&
                                  !tempUsers.flatMap((data) => data.participant).some((participant) => participant.id === foundParticipantChoice)
                                ) return undefined
                                return foundParticipantChoice
                              })()}
                              timeslotsQuery={selectedTag !== undefined ? tagTimeslotQuery : timeslotsQuery}
                              tagsQuery={props.tagData}
                              userData={{
                                users: users.map((user) => user.profile).filter((profile) => profile !== undefined),
                                tempUsers: tempUsers
                              }}
                              usersQuery={props.userData}
                              tempUsersQuery={props.tempUsersData}
                              updateParticipant={(timeslot, participantId, userEmail, tempUser) => {
                                if(tempUser) {
                                  setTempUsers((prev) => prev.map((profile) => {
                                    return profile.email == userEmail ? ({
                                      ...profile,
                                      participant: profile.participant.map((participant) => (participant.id === participantId ? ({
                                        ...participant,
                                        timeslot: [...(participant.timeslot ?? []), timeslot]
                                      } as Participant) : participant))
                                    }) : profile
                                  }))
                                } else {
                                  setUsers((prev) => prev.map((data) => {
                                    return ({
                                      ...data,
                                      profile: data.profile && data.profile.email === userEmail ? ({
                                        ...data.profile,
                                        participant: data.profile.participant.map((participant) => (participant.id === participantId ? ({
                                          ...participant,
                                          timeslot: [...(participant.timeslot ?? []), timeslot]
                                        }) : participant))
                                      }) : data.profile
                                    })
                                  }))
                                }
                              }}
                              selectedDate={selectedDate}
                              updateDateSelection={setSelectedDate}
                              updateTagSelection={setSelectedTag}
                              rowIndex={i}
                              columnId={id}
                              
                            />
                          )
                        }
                        case 'choice': {
                          return (
                            <ChoiceCell
                              key={j}
                              value={v}
                              updateValue={(text) => updateValue(id, text, i)}
                              column={props.table.columns.find((col) => col.id === id)!}
                              updateParentTable={props.parentUpdateTable}
                              createChoice={(choice, color) => updateChoices(id, {choice: choice, color: color}, "create")}
                            />
                          )
                        }
                        case 'tag': {
                          return (
                            <TagCell
                              UserService={props.UserService}
                              key={j}
                              value={v}
                              updateValue={(text) => updateValue(id, text, i)}
                              tags={props.tagData}
                              table={props.table}
                              columnId={id}
                              rowIndex={i}
                              linkedParticipantId={(() => {
                                const foundColumn = props.table.columns.find((col) => col.id === id)
                                if(!foundColumn) return undefined
                                const foundParticipantChoice = foundColumn.choices?.[i]
                                if(
                                  !users.flatMap((data) => data.profile?.participant).filter((participant) => participant !== undefined).some((participant) => participant.id === foundParticipantChoice) &&
                                  !tempUsers.flatMap((data) => data.participant).some((participant) => participant.id === foundParticipantChoice)
                                ) return undefined
                                return foundParticipantChoice
                              })()}
                              userData={{
                                users: users.map((user) => user.profile).filter((profile) => profile !== undefined),
                                tempUsers: tempUsers
                              }}
                              usersQuery={props.userData}
                              tempUsersQuery={props.tempUsersData}
                              updateParticipant={(userTags, participantId, userEmail, tempUser) => {
                                if(tempUser) {
                                  setTempUsers((prev) => prev.map((profile) => {
                                    return profile.email === userEmail ? ({
                                      ...profile,
                                      particiant: profile.participant
                                        .map((participant) => (participant.id === participantId ? ({
                                          ...participant,
                                          userTags: userTags
                                        }) : participant))
                                    }) : profile
                                  }))
                                }
                                else {
                                  setUsers((prev) => prev.map((data) => {
                                    return ({
                                      ...data,
                                      profile: data.profile && data.profile.email === userEmail ? ({
                                        ...data.profile,
                                        particiant: data.profile.participant
                                          .map((participant) => (participant.id === participantId ? ({
                                            ...participant,
                                            userTags: userTags
                                          }) : participant))
                                      }) : data.profile 
                                    })
                                  }))
                                }
                              }}
                            />
                          )
                        }
                        case 'file': {
                          return (
                            <FileCell
                              TableService={props.TableService}
                              PhotoPathService={props.PhotoPathService}
                              key={j}
                              value={v}
                              updateValue={(text) => {
                                const tempTable: Table = {
                                  ...props.table,
                                  columns: props.table.columns.map((column) => {
                                    if(column.id === id) {
                                      const temp = [...column.values]
                                      temp[i] = text
                                      return {
                                        ...column,
                                        values: temp
                                      }
                                    }
                                    return column
                                  })
                                }

                                const updateGroup = (prev: TableGroup[]) => {
                                  const pTemp: TableGroup[] = [...prev]
                                    .map((group) => {
                                      if(group.id === tempTable.tableGroupId) {
                                        return {
                                          ...group,
                                          tables: group.tables.map((table) => {
                                            if(table.id === tempTable.id) {
                                              return tempTable
                                            }
                                            return table
                                          })
                                        }
                                      }
                                      return group
                                    })

                                  return pTemp
                                }

                                props.parentUpdateTable(tempTable)
                                props.parentUpdateTableGroups((prev) => updateGroup(prev))
                                props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
                                props.parentUpdateTableColumns(tempTable.columns)
                              }}
                              column={props.table.columns.find((column) => column.id === id)!}
                              rowIndex={i}
                            />
                          )
                        }
                        default: {
                          return (
                            <ValueCell
                              key={j} 
                              value={v}
                              updateValue={(text) => updateValue(id, text, i)}
                            />
                          )
                        }
                      }
                    })}
                    <td className="flex flex-row items-center justify-center py-3">
                      {/* TODO: put linked user icon with dropdown to view details */}
                      {/* TODO: implement revoke for temp users */}
                      <Dropdown
                        label={(<HiOutlineDotsHorizontal className="text-gray-600 hover:fill-gray-200 hover:text-gray-900" size={26} />)}
                        inline
                        arrowIcon={false}
                      >
                        <Dropdown.Item
                          onClick={() => {
                            setCreateUser(true)
                            refRow.current = i
                          }}
                        >Create User</Dropdown.Item>
                        <Dropdown.Item
                          // onClick={() => setCreateUser(true)}
                          // TODO: implement me please :)
                        >Link Participant</Dropdown.Item>
                        {/* TODO: implement me please */}
                        <Dropdown.Item>
                          Notify User
                        </Dropdown.Item>
                        <Dropdown.Item 
                          onClick={() => {
                            deleteRow.mutate({
                              table: props.table,
                              rowIndex: i,
                              options: {
                                logging: true
                              }
                            })

                            const temp: Table = {
                              ...props.table,
                              columns: props.table.columns.map((column) => {
                                const mappedColumn: TableColumn = {
                                  ...column,
                                  values: column.values.reduce((prev, cur, index) => {
                                    if(index === i) return prev
                                    prev.push(cur)
                                    return prev
                                  }, [] as string[])
                                }
                                return mappedColumn
                              })
                            }

                            const updateGroup = (prev: TableGroup[]) => {
                              const pTemp: TableGroup[] = [
                                ...prev
                              ].map((parentGroup) => {
                                if(parentGroup.id === props.table.tableGroupId){
                                  return {
                                    ...parentGroup,
                                    tables: parentGroup.tables.map((table) => {
                                      if(table.id === temp.id){
                                        return temp
                                      }
                                      return table
                                    })
                                  }
                                }
                                return parentGroup
                              })

                              return pTemp
                            }

                            props.parentUpdateTable(temp)
                            props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
                            props.parentUpdateTableGroups((prev) => updateGroup(prev))
                            props.parentUpdateTableColumns(temp.columns)
                          }}
                        >Delete Row</Dropdown.Item>
                      </Dropdown>
                    </td>
                  </tr>
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
                      appendRow.mutate({
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
        </table>
      </div>
    </>
  )
}