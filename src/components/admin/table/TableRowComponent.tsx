import { Dropdown } from "flowbite-react"
import { HiOutlineDotsHorizontal } from "react-icons/hi"
import { ColumnColor, Participant, Table, TableColumn, TableGroup, Timeslot, UserData, UserProfile, UserTag } from "../../../types"
import { ChoiceCell } from "./ChoiceCell"
import { DateCell } from "./DateCell"
import { FileCell } from "./FileCell"
import { TagCell } from "./TagCell"
import { ValueCell } from "./ValueCell"
import { TimeslotService } from "../../../services/timeslotService"
import { validateMapField } from "../../../functions/tableFunctions"
import { UseMutationResult, UseQueryResult } from "@tanstack/react-query"
import { Dispatch, HTMLAttributes, SetStateAction, useEffect, useRef, useState } from "react"
import { defaultColumnColors } from "../../../utils"
import { UpdateTableColumnParams, CreateChoiceParams, TableService, DeleteTableRowParams } from "../../../services/tableService"
import { v4 } from 'uuid'
import { UserService } from "../../../services/userService"
import { PhotoPathService } from "../../../services/photoPathService"
import {
  attachClosestEdge,
  type Edge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import invariant from 'tiny-invariant';
import { getTableRowData, isTableRowData } from "./TableRowData"

interface TableRowComponentProps {
  TimeslotService: TimeslotService,
  UserService: UserService,
  TableService: TableService
  PhotoPathService: PhotoPathService
  row: [string, TableColumn['type'], string][]
  i: number
  table: Table
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
  updateColumn: UseMutationResult<void, Error, UpdateTableColumnParams, unknown>
  deleteRow: UseMutationResult<void, Error, DeleteTableRowParams, unknown>
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

type TableRowState = 
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
      closestEdge: Edge | null;
    };

const stateStyles: { [Key in TableRowState['type']]?: HTMLAttributes<HTMLDivElement>['className'] } = {
  'is-dragging': 'opacity-40',
};

const idle: TableRowState = { type: 'idle' };

export const TableRowComponent = (props: TableRowComponentProps) => {
  const ref = useRef<HTMLTableRowElement | null>(null)
  const [rowState, setRowState] = useState<TableRowState>(idle)
  const [allowDragging, setAllowDragging] = useState(false)

  useEffect(() => {
    const element = ref.current
    invariant(element)
    return combine(
      draggable({
        element,
        getInitialData() {
          return getTableRowData(props.i)
        },
        canDrag: () => allowDragging,
        onGenerateDragPreview({ nativeSetDragImage }) {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: pointerOutsideOfPreview({
              x: '16px',
              y: '8px'
            }),
            render({ container }) {
              setRowState({ type: 'preview', container })
            }
          })
        },
        onDragStart() {
          setRowState({ type: 'is-dragging' })
        },
        onDrop() {
          setRowState(idle)
          setAllowDragging(false)
        }
      }),
      dropTargetForElements({
        element,
        canDrop({ source }) {
          if(source.element === element) {
            return false
          }
          return isTableRowData(source.data)
        },
        getData({ input }) {
          const data = getTableRowData(props.i)
          return attachClosestEdge(data, {
            element,
            input,
            allowedEdges: ['top', 'bottom']
          })
        },
        getIsSticky() {
          return true;
        },
        onDragEnter({ self }) {
          const closestEdge = extractClosestEdge(self.data)
          setRowState({ type: 'is-dragging-over', closestEdge })
        },
        onDrag({ self }) {
          const closestEdge = extractClosestEdge(self.data)

          setRowState((current) => {
            if(current.type === 'is-dragging-over' && current.closestEdge === closestEdge) {
              return current
            }
            return { type: 'is-dragging-over', closestEdge}
          })
        },
        onDragLeave() {
          setRowState(idle)
        },
        onDrop() {
          setRowState(idle)
        }
      })
    )
  }, [props.row, allowDragging])

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

    props.updateColumn.mutate({
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

      props.createChoice.mutate({
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
  
  return (
    <>
      {rowState.type === 'is-dragging-over' && rowState.closestEdge === 'top' && (
        <tr className="h-1">
        </tr>
      )}
      <tr className="bg-white border-b" ref={ref}>
        {props.row.map(([v, t, id], j) => {
          switch(t){
            case 'date': {
              return (
                <DateCell
                  key={j}
                  value={v}
                  TimeslotService={props.TimeslotService}
                  //TODO: timeslot ids should be mutually exclusive -> need to convert cells from being an array of values to be its own dynamo for now will leave as is and avoid double registrations
                  updateValue={(text) => updateValue(id, text, props.i)}
                  table={props.table}
                  linkedParticipantId={(() => {
                    const foundColumn = props.table.columns.find((col) => col.id === id)
                    if(!foundColumn) return undefined
                    const foundParticipantChoice = foundColumn.choices?.[props.i]
                    if(
                      !props.users.flatMap((data) => data.profile?.participant).filter((participant) => participant !== undefined).some((participant) => participant.id === foundParticipantChoice) &&
                      !props.tempUsers.flatMap((data) => data.participant).some((participant) => participant.id === foundParticipantChoice)
                    ) return undefined
                    return foundParticipantChoice
                  })()}
                  timeslotsQuery={props.selectedTag !== undefined ? props.tagTimeslotQuery : props.timeslotsQuery}
                  tagsQuery={props.tagData}
                  userData={{
                    users: props.users.map((user) => user.profile).filter((profile) => profile !== undefined),
                    tempUsers: props.tempUsers
                  }}
                  usersQuery={props.userData}
                  tempUsersQuery={props.tempUsersData}
                  updateParticipant={(timeslot, participantId, userEmail, tempUser) => {
                    if(tempUser) {
                      props.setTempUsers((prev) => prev.map((profile) => {
                        return profile.email == userEmail ? ({
                          ...profile,
                          participant: profile.participant.map((participant) => (participant.id === participantId ? ({
                            ...participant,
                            timeslot: [...(participant.timeslot ?? []), timeslot]
                          } as Participant) : participant))
                        }) : profile
                      }))
                    } else {
                      props.setUsers((prev) => prev.map((data) => {
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
                  selectedDate={props.selectedDate}
                  updateDateSelection={props.setSelectedDate}
                  updateTagSelection={props.setSelectedTag}
                  rowIndex={props.i}
                  columnId={id}
                />
              )
            }
            case 'choice': {
              return (
                <ChoiceCell
                  key={j}
                  value={v}
                  updateValue={(text) => updateValue(id, text, props.i)}
                  column={props.table.columns.find((col) => col.id === id)!}
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
                  updateValue={(text) => updateValue(id, text, props.i)}
                  tags={props.tagData}
                  table={props.table}
                  columnId={id}
                  rowIndex={props.i}
                  linkedParticipantId={(() => {
                    const foundColumn = props.table.columns.find((col) => col.id === id)
                    if(!foundColumn) return undefined
                    const foundParticipantChoice = foundColumn.choices?.[props.i]
                    if(
                      !props.users.flatMap((data) => data.profile?.participant).filter((participant) => participant !== undefined).some((participant) => participant.id === foundParticipantChoice) &&
                      !props.tempUsers.flatMap((data) => data.participant).some((participant) => participant.id === foundParticipantChoice)
                    ) return undefined
                    return foundParticipantChoice
                  })()}
                  userData={{
                    users: props.users.map((user) => user.profile).filter((profile) => profile !== undefined),
                    tempUsers: props.tempUsers
                  }}
                  usersQuery={props.userData}
                  tempUsersQuery={props.tempUsersData}
                  updateParticipant={(userTags, participantId, userEmail, tempUser) => {
                    if(tempUser) {
                      props.setTempUsers((prev) => prev.map((profile) => {
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
                      props.setUsers((prev) => prev.map((data) => {
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
                          temp[props.i] = text
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
                  rowIndex={props.i}
                />
              )
            }
            default: {
              return (
                <ValueCell
                  key={j} 
                  value={v}
                  updateValue={(text) => updateValue(id, text, props.i)}
                />
              )
            }
          }
        })}
        <td 
          className={`
            flex flex-row items-center justify-center py-3 sticky right-0 z-10 hover:cursor-grab
            ${stateStyles[rowState.type] ?? ''}
          `}
          onMouseEnter={() => setAllowDragging(true)}
          onMouseLeave={() => setAllowDragging(false)}
        >
          {/* TODO: put linked user icon with dropdown to view details */}
          {/* TODO: implement revoke for temp users */}
          <Dropdown
            label={(<HiOutlineDotsHorizontal className="text-gray-600 hover:fill-gray-200 hover:text-gray-900 hover:cursor-pointer" size={26} />)}
            inline
            arrowIcon={false}
          >
            <Dropdown.Item
              onClick={() => {
                props.setCreateUser(true)
                props.refRow.current = props.i
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
                props.deleteRow.mutate({
                  table: props.table,
                  rowIndex: props.i,
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
                        if(index === props.i) return prev
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
      {rowState.type === 'is-dragging-over' && rowState.closestEdge === 'bottom' && (
        <tr className="h-1">
        </tr>
      )}
    </>
  )
}