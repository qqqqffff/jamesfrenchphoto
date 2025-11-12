import { Dispatch, HTMLAttributes, SetStateAction, useEffect, useRef, useState } from "react"
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
  HiOutlineCalendar, 
  HiOutlineDocumentText, 
  HiOutlineListBullet, 
  HiOutlinePencil, 
  HiOutlinePlusCircle, 
  HiOutlineTag, 
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
import { EditableTextField } from "../../common/EditableTextField"
import { ValueCell } from "./ValueCell"
import { currentDate, defaultColumnColors, getColumnTypeColor } from "../../../utils"
import { ConfirmationModal, CreateUserModal } from "../../modals"
import { DateCell } from "./DateCell"
import { ChoiceCell } from "./ChoiceCell"
import { TagCell } from "./TagCell"
import { FileCell } from "./FileCell"
import { AggregateCell } from "./AggregateCell"
import { ColorComponent } from "../../common/ColorComponent"
import { v4 } from 'uuid'
import { validateMapField } from "../../../functions/tableFunctions"
import { TimeslotService } from "../../../services/timeslotService"
import { HiOutlineDotsHorizontal } from "react-icons/hi"
import { UserService, InviteUserParams } from "../../../services/userService"
import { PhotoPathService } from "../../../services/photoPathService"
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { getTableColumnData, isDraggingTableColumn, isTableColumnData } from "./TableColumnData"
import { flushSync } from "react-dom"
import { triggerPostMoveFlash } from '@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
  attachClosestEdge,
  type Edge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import type { CleanupFn } from '@atlaskit/pragmatic-drag-and-drop/types';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { DropIndicator } from "../../common/DropIndicator"

// import { createParticipantMutation, CreateParticipantParams, updateParticipantMutation, UpdateParticipantMutationParams, updateUserAttributeMutation, UpdateUserAttributesMutationParams, updateUserProfileMutation, UpdateUserProfileParams } from "../../../services/userService"


type TableColumnState = 
  | {
      type: 'idle';
    }
  | {
      type: 'preview';
      container: HTMLElement;
    }
  | {
      type: 'is-dragging';
    }
  | {
      type: 'is-dragging-over';
      closestEdge: Edge | null
    };

const stateStyles: { [Key in TableColumnState['type']]?: HTMLAttributes<HTMLDivElement>['className'] } = {
  'is-dragging': 'opacity-40',
}

const idle: TableColumnState = { type: 'idle' }

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
  const [tableColumnState, setTableColumnState] = useState<Map<TableColumn, TableColumnState>>(new Map(props.table.columns.map((column) => ([column, idle]))))

  const timeslotsQuery = useQuery(props.TimeslotService.getAllTimeslotsByDateQueryOptions(selectedDate))
  const tagTimeslotQuery = useQuery({
    ...props.TimeslotService.getAllTimeslotsByUserTagQueryOptions(selectedTag?.id),
    enabled: selectedTag !== undefined
  })
 
  const tableRef = useRef<HTMLTableElement | null>(null)
  const tableColumnRef = useRef<Map<TableColumn, HTMLTableCellElement | null>>(new Map())
  const refColumn = useRef<TableColumn | null>()
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

  console.log(tableColumnState)

  useEffect(() => {
    if(
      Array.from(tableColumnState.keys()).some((key) => !props.table.columns.some((column) => column.id === key.id)) ||
      props.table.columns.some((column) => !Array.from(tableColumnState.keys()).some((key) => key.id === column.id))
    ) {
      const temp = new Map(props.table.columns.map((column) => ([column, idle])))
      setTableColumnState(temp)
    }

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

          const indexOfSource = props.table.columns.find((tableColumn) => tableColumn.id === sourceData.columnId)?.order ?? -1
          const indexOfTarget = props.table.columns.find((tableColumn) => tableColumn.id === targetData.columnId)?.order ?? -1

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

          flushSync(() => {
            const newTableColumns = updatedTableColumns.filter((column) => column.order !== indexOfSource).map((column, index) => ({ ...column, order: index }))

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

  useEffect(() => {
    const functions: CleanupFn[] = []

    const elementsArray = Array.from(tableColumnRef.current.entries())
    for(let i = 0; i < elementsArray.length; i++) {
      const entry = elementsArray[i]
      if(entry[1] === null) continue
      const element = entry[1]

      functions.push(draggable({
        element,
        getInitialData(){
          return getTableColumnData(entry[0])
        },
        canDrag: () => true,
        onGenerateDragPreview({ nativeSetDragImage }) {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: pointerOutsideOfPreview({
              x: '16px',
              y: '8px'
            }),
            render({ container }) {
              const temp = new Map(tableColumnState)
              temp.set(entry[0], { type: 'preview', container })
              setTableColumnState(temp)
            }
          })
        },
        onDragStart() {
          const temp = new Map(tableColumnState)
          temp.set(entry[0], { type: 'is-dragging' })
          setTableColumnState(temp)
        },
        onDrop() {
          const temp = new Map(tableColumnState)
          temp.set(entry[0], { type: 'idle' })
          setTableColumnState(temp)
        }
      }))

      functions.push(dropTargetForElements({
        element,
        canDrop({ source }) {
          if(source.element === element) {
            return false
          }
          return isTableColumnData(source.data)
        },
        getData({ input }) {
          const data = getTableColumnData(entry[0])
          return attachClosestEdge(data, {
            element,
            input,
            allowedEdges: ['left', 'right']
          })
        },
        getIsSticky() {
          return true
        },
        onDragEnter({ self }) {
          const closestEdge = extractClosestEdge(self.data)
          const temp = new Map(tableColumnState)
          temp.set(entry[0], { type: 'is-dragging-over', closestEdge })
          setTableColumnState(temp)
        },
        onDrag({ self }) {
          const closestEdge = extractClosestEdge(self.data)
          const currentColumn = tableColumnState.get(entry[0])

          if(
            currentColumn && 
            currentColumn.type === 'is-dragging-over' && 
            currentColumn.closestEdge !== closestEdge
          ) {
            const temp = new Map(tableColumnState)
            temp.set(entry[0], { type: 'is-dragging-over', closestEdge })
            setTableColumnState(temp)
          }
        },
        onDragLeave() {
          const temp = new Map(tableColumnState)
          temp.set(entry[0], idle)
          setTableColumnState(temp)
        },
        onDrop() {
          const temp = new Map(tableColumnState)
          temp.set(entry[0], idle)
          setTableColumnState(temp)
        }
      }))
    }

    return combine(
      ...functions
    )
  }, [tableColumnRef.current])

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
          <thead className="text-xs text-gray-700 bg-gray-50 sticky">
            <tr>
              {props.table.columns
              .map((column) => {
                const state = tableColumnState.get(column)
                // if(state === undefined) return (<></>)
                return (
                  <>
                    <th
                      data-table-column-id={column.id}
                      ref={el => tableColumnRef.current.set(column, el)}
                      // onMouseEnter={() => {}}
                      key={column.id}
                      className={`
                        relative border-x border-x-gray-300 border-b border-b-gray-300 
                        min-w-[150px] max-w-[150px] whitespace-normal break-words place-items-center
                        items-center ${stateStyles[state?.type ?? 'idle'] ?? ''}
                      `}
                    >
                      {state !== undefined && state.type === 'is-dragging-over' && state.closestEdge && state.closestEdge === 'left' && (
                        <DropIndicator edge={state.closestEdge} gap={'8px'} />
                      )}
                      {column.temporary || column.edit ? (
                        <div className="w-full pe-10">
                          <EditableTextField 
                            className="text-xs border-b-black focus:ring-0 focus:border-transparent focus:border-b-black min-w-full bg-transparent"
                            text={column.header ?? ''}
                            placeholder="Enter Column Name..."
                            onSubmitText={(text) => {
                              if(column.temporary && text !== ''){
                                const valuesArray = []
                                for(let i = 0; i < props.table.columns[0].values.length; i++) {
                                  valuesArray.push('')
                                }
                                const tempColumn: TableColumn = {
                                  id: column.id,
                                  display: true,
                                  tags: [],
                                  header: text,
                                  tableId: props.table.id,
                                  type: column.type,
                                  values: valuesArray,
                                  order: props.table.columns.length,
                                }
                                createColumn.mutate({
                                  column: tempColumn,
                                  options: {
                                    logging: true
                                  }
                                })
                                const temp: Table = {
                                  ...props.table,
                                  columns: props.table.columns
                                    .map((pColumn) => (pColumn.id === tempColumn.id ? tempColumn : pColumn))
                                }

                                const updateGroup = (prev: TableGroup[]) => {
                                  const pTemp: TableGroup[] = [...prev]
                                    .map((group) => {
                                      if(group.id === props.table.tableGroupId){
                                        return {
                                          ...group,
                                          tables: group.tables.map((table) => {
                                            if(table.id === props.table.id){
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
                              else if(column.edit && text !== column.header && text !== '') {
                                updateColumn.mutate({
                                  column: column,
                                  values: column.values,
                                  header: text,
                                  options: {
                                    logging: true
                                  }
                                })

                                const temp: Table = {
                                  ...props.table,
                                  columns: props.table.columns
                                    .map((parentColumn) => ({
                                      ...parentColumn, 
                                      header: parentColumn.id === column.id ? text : parentColumn.header,
                                      edit: parentColumn.id === column.id ? false : parentColumn.edit,
                                    }))
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
                            }}
                            onCancel={() => {
                              const temp: Table = {
                                ...props.table,
                                columns: props.table.columns
                                  .filter((col) => col.temporary === undefined || col.temporary === false)
                                  .map((col) => (col.id === column.id ? ({
                                    ...col,
                                    edit: false
                                  }) : col))
                              }

                              const updateGroup = (prev: TableGroup[]) => {
                                const pTemp = [...prev]
                                  .map((group) => group.id === props.table.tableGroupId ? ({
                                      ...group,
                                      tables: group.tables.map((table) => table.id === temp.id ? temp : table)
                                    }) : group
                                  )

                                return pTemp
                              }

                              props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
                              props.parentUpdateTableGroups((prev) => updateGroup(prev))
                              props.parentUpdateTable(temp)
                              props.parentUpdateTableColumns(temp.columns)
                            }}
                            editting
                          />
                        </div>
                      ) : (
                        <Dropdown 
                          className="min-w-max"
                          label={(<span className="hover:underline underline-offset-2">{column.header}</span>)}
                          arrowIcon={false}
                          placement="bottom"
                          inline
                        >
                          <div className="w-max flex flex-col">
                            <span className="whitespace-nowrap px-4 border-b pb-0.5 font-semibold text-base text-center w-full">
                              <span>Type:</span>
                              <ColorComponent 
                                customText={' ' + column.type[0].toUpperCase() + column.type.substring(1)} 
                                activeColor={getColumnTypeColor(column.type)}
                              />
                            </span>
                            <Dropdown.Item 
                              className="justify-center"
                              onClick={() => {
                                const temp: Table = {
                                  ...props.table,
                                  columns: props.table.columns.map((parentColumn) => {
                                    if(parentColumn.id === column.id){
                                      return {
                                        ...parentColumn,
                                        edit: true
                                      }
                                    }
                                    return parentColumn
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
                                props.parentUpdateTableColumns(temp.columns)
                              }}
                            >Rename</Dropdown.Item>
                            <Dropdown.Item 
                              className="justify-center"
                              onClick={() => {
                                refColumn.current = column
                                setDeleteColumnConfirmation(true)
                              }}
                            >Delete</Dropdown.Item>
                          </div>
                        </Dropdown>
                      )}
                      {state !== undefined && state.type === 'is-dragging-over' && state.closestEdge && state.closestEdge === 'right' && (
                        <DropIndicator edge={state.closestEdge} gap={'8px'} />
                      )}
                    </th>
                  </>
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
                  <div className="w-max">
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