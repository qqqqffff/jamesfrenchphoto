import {
  type Edge,
  extractClosestEdge,
  attachClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { Notification, Participant, Table, TableColumn, TableGroup, Timeslot, UserData, UserProfile, UserTag } from '../../../types';
import { Dispatch, HTMLAttributes, MutableRefObject, SetStateAction, useEffect, useRef, useState } from 'react';
import { Dropdown } from 'flowbite-react';
import { getColumnTypeColor } from '../../../utils';
import { ColorComponent } from '../../common/ColorComponent';
import { DropIndicator } from '../../common/DropIndicator';
import { EditableTextField } from '../../common/EditableTextField';
import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { CreateTableColumnParams, ReorderTableMutationParams, TableService, UpdateTableColumnParams } from '../../../services/tableService';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import invariant from 'tiny-invariant';
import { getTableColumnData, isTableColumnData } from './TableColumnData';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { createPortal } from 'react-dom';
import { GoTriangleDown, GoTriangleUp } from 'react-icons/go'
import { reorderRows, sortColumnValues } from '../../../functions/tableFunctions';


interface TableColumnProps {
  TableService: TableService
  table: Table
  column: TableColumn
  refColumn: MutableRefObject<TableColumn | null>
  tags: UserTag[]
  timeslots: Timeslot[]
  notifications: Notification[]
  users: UserData[]
  tempUsers: UserProfile[]
  createColumn: UseMutationResult<void, Error, CreateTableColumnParams, unknown>
  updateColumn: UseMutationResult<void, Error, UpdateTableColumnParams, unknown>
  setDeleteColumnConfirmation: Dispatch<SetStateAction<boolean>>
  parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTable: Dispatch<SetStateAction<Table | undefined>>
  parentUpdateTableColumns: Dispatch<SetStateAction<TableColumn[]>>
}

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

const stateStyles: { [Key in TableColumnState['type']]?: HTMLAttributes<HTMLTableCellElement>['className'] } = {
  'is-dragging': 'opacity-40',
}

const idle: TableColumnState = { type: 'idle' }

export const TableColumnComponent = (props: TableColumnProps) => {
  const tableColumnRef = useRef<HTMLTableCellElement | null>(null)
  const [columnState, setColumnState] = useState<TableColumnState>(idle)
  const [mouseHover, setMouseHover] = useState(false)

  useEffect(() => {
    const element = tableColumnRef.current
    invariant(element)
    return combine(
      draggable({
        element,
        getInitialData(){
          return getTableColumnData(props.column)
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
              setColumnState({ type: 'preview', container })
            }
          })
        },
        onDragStart() {
          setColumnState({ type: 'is-dragging' })
        },
        onDrop() {
          setColumnState(idle)
        }
      }),
      dropTargetForElements({
        element,
        canDrop({ source }) {
          if(source.element === element) {
            return false
          }
          return isTableColumnData(source.data)
        },
        getData({ input }) {
          const data = getTableColumnData(props.column)
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
          setColumnState({ type: 'is-dragging-over', closestEdge })
        },
        onDrag({ self }) {
          const closestEdge = extractClosestEdge(self.data)

          setColumnState((current) => {
            if(current.type === 'is-dragging-over' && current.closestEdge === closestEdge) {
              return current
            }
            return { type: 'is-dragging-over', closestEdge }
          })
        },
        onDragLeave() {
          setColumnState(idle)
        },
        onDrop() {
          setColumnState(idle)
        }
      })
    )
  }, [
    props.column
  ])

  const sortOrder: 'ASC' | 'DSC' | null = (() => {
    const values = [...props.column.values]
    
    const sortedValuesASC = sortColumnValues(props.column, props.tags, props.timeslots, props.notifications)
    const sortedValuesDSC = [...sortedValuesASC].reverse()

    let sortedASC = true
    let sortedDSC = true

    for(let i = 0, j = 0; i < values.length; i++) {
      if(values[i] === '') continue
      
      if(sortedValuesASC[j] !== values[i]) {
        sortedASC = false
      }
      else if(sortedValuesDSC[j] !== values[i]) {
        sortedDSC = false
      }

      j++
      if(!sortedASC && !sortedDSC) return null
    }

    if(sortedASC && sortedDSC) return null
    else if(sortedASC) return 'ASC'
    else if(sortedDSC) return 'DSC'
    return null
  })()

  const reorderTable = useMutation({
    mutationFn: (params: ReorderTableMutationParams) => props.TableService.reorderTableMutation(params)
  })
  return (
    <th
      data-table-column-id={props.column.id}
      ref={tableColumnRef}
      className={`
        relative border-x border-x-gray-300 border-b border-b-gray-300 
        min-w-[150px] max-w-[150px] whitespace-normal break-words 
        place-items-center bg-gray-50
        ${stateStyles[columnState.type] ?? ''}
      `}
      onMouseEnter={() => setMouseHover(true)}
      onMouseLeave={() => setMouseHover(false)}
    >
      {columnState.type === 'is-dragging-over' && columnState.closestEdge && columnState.closestEdge === 'left' && (
        <DropIndicator edge={columnState.closestEdge} gap={'8px'} />
      )}
      {props.column.temporary || props.column.edit ? (
        <div className="w-full pe-10">
          <EditableTextField 
            className="text-xs border-b-black focus:ring-0 focus:border-transparent focus:border-b-black min-w-full bg-transparent"
            text={props.column.header ?? ''}
            placeholder="Enter Column Name..."
            onSubmitText={(text) => {
              if(props.column.temporary && text !== ''){
                const valuesArray = [...props.column.values]
                const choiceArray = [...(props.column.choices ?? [])]

                const normalText = text.toLowerCase()
                const participant = 
                  normalText.includes('participant') ||
                  normalText.includes('duchess') ||
                  normalText.includes('deb') ||
                  normalText.includes('escort') ||
                  normalText.includes('daughter') ||
                  normalText.includes('son') ||
                  normalText.includes('child') ||
                  props.column.type === 'date' ||
                  props.column.type === 'notification' ||
                  props.column.type === 'tag'
                
                const field: 'first' | 'last' | 'sitting' | 'email' | 'preferred' | 'middle' | undefined = props.column.type === 'value' ? (() => {
                  if(normalText.includes('first')) {
                    return 'first'
                  }
                  else if(normalText.includes('last')) {
                    return 'last'
                  }
                  else if(normalText.includes('sitting')) {
                    return 'sitting'
                  }
                  else if(normalText.includes('email')) {
                    return 'email'
                  }
                  else if(normalText.includes('preferred')) {
                    return 'preferred'
                  }
                  else if(normalText.includes('middle')) {
                    return 'middle'
                  }
                  return undefined
                })(): undefined 

                //check existing links for duplicates
                let existingLink: { link: boolean, user: { user: boolean, id: string } | null }[] = [];
                existingLink = existingLink.fill({ link: false, user: null }, 0, props.table.columns[0].values.length);
                  
                //value & choice injection
                if(
                  (
                    field || 
                    props.column.type === 'date' || 
                    props.column.type === 'tag' ||
                    props.column.type === 'notification'
                  )
                ) {
                  //search for the existing links
                  for(let i = 0; i < choiceArray.length; i++) {
                    for(let j = 0; j < props.table.columns.length; j++) {
                      const parsedChoice = (props.table.columns[j].choices ?? [])[i]
                      if(participant && parsedChoice !== undefined && parsedChoice.includes('participantId:')) {
                        existingLink[i] = {
                          link: true,
                          user: {
                            user: false,
                            id: parsedChoice.substring(
                              parsedChoice.indexOf(':') + 1, 
                              parsedChoice.indexOf(',') === -1 ? 
                                parsedChoice.length 
                              : 
                                parsedChoice.indexOf(',')
                            )
                          }
                        }
                        break;
                      }
                      else if(!participant && parsedChoice !== undefined && parsedChoice.includes('userEmail:')) {
                        existingLink[i] = {
                          link: true,
                          user: {
                            user: true,
                            id: parsedChoice.substring(
                              parsedChoice.indexOf(':') + 1,
                              parsedChoice.indexOf(',') === -1 ?
                                parsedChoice.length
                              :
                                parsedChoice.indexOf(',')
                            )
                          }
                        }
                        break;
                      }
                    }
                  }

                  //update the values array
                  for(let i = 0; i < valuesArray.length; i++) {
                    const existingChoice = existingLink[i]
                    if(existingChoice !== undefined && existingChoice.link && existingChoice.user !== null && !existingChoice.user.user) {
                      const foundId = existingChoice.user.id
                      const foundParticipant = [
                        ...props.users.map((user) => user.profile).filter((profile) => profile !== undefined).flatMap((profile) => profile.participant),
                        ...props.tempUsers.flatMap((profile) => profile.participant)
                      ].reduce((prev, cur) => {
                        if(!prev.some((participant) => participant.id === cur.id)) {
                          prev.push(cur)
                        }
                        return prev
                      }, [] as Participant[])
                      .find((participant) => participant.id === foundId)

                      if(foundParticipant === undefined) continue;

                      choiceArray[i] = 'participantId:' + foundId + (field ? (',' + field) : '')
                      
                      //inject the values since cells should not be editable 
                      //TODO: make the cells not editable while the column is temporary
                      switch(field) {
                        case 'first':
                          valuesArray[i] = foundParticipant.firstName
                          break;
                        case 'last':
                          valuesArray[i] = foundParticipant.lastName
                          break;
                        case 'middle':
                          valuesArray[i] = foundParticipant.middleName ?? ''
                          break;
                        case 'email':
                          valuesArray[i] = foundParticipant.email ?? ''
                          break;
                        case 'preferred':
                          valuesArray[i] = foundParticipant.preferredName ?? ''
                          break;
                        default:
                          if(props.column.type === 'date') {
                            const dateValue = (foundParticipant.timeslot ?? [])
                              .map((timeslot) => timeslot.id)
                              .reduce((prev, cur) => {
                                return prev + ',' + cur
                              }, '')
                            valuesArray[i] = dateValue.charAt(0) === ',' ? dateValue.substring(0) : dateValue
                          }
                          else if(props.column.type === 'tag'){
                            const tagValue = foundParticipant.userTags
                              .map((timeslot) => timeslot.id)
                              .reduce((prev, cur) => {
                                return prev + ',' + cur
                              }, '')
                            valuesArray[i] = tagValue.charAt(0) === ',' ? tagValue.substring(0) : tagValue
                          }
                          else if(props.column.type === 'notification') {
                            const notificationValue = foundParticipant.notifications[0]?.id ?? ''
                            valuesArray[i] = notificationValue
                          }

                          break;
                      }
                    }
                    else if(existingChoice !== undefined && existingChoice.link && existingChoice.user !== null && existingChoice.user.user) {
                      const foundEmail = existingChoice.user.id.toLowerCase()
                      const foundUser = [
                        ...props.users.map((user) => user.profile).filter((profile) => profile !== undefined),
                        ...props.tempUsers
                      ]
                      .reduce((prev, cur) => {
                        if(!prev.some((user) => user.email.toLowerCase() === cur.email.toLowerCase())) {
                          prev.push(cur)
                        }
                        return prev
                      }, [] as UserProfile[])
                      .find((user) => user.email.toLowerCase() === foundEmail)

                      if(foundUser === undefined) continue

                      choiceArray[i] = 'userEmail:' + foundEmail + ',' + field
                      
                      //inject the values since cells should not be editable 
                      //TODO: make the cells not editable while the column is temporary
                      switch(field) {
                        case 'first':
                          valuesArray[i] = foundUser.firstName ?? ''
                          break;
                        case 'last':
                          valuesArray[i] = foundUser.lastName ?? ''
                          break;
                        case 'sitting':
                          valuesArray[i] = String(foundUser.sittingNumber) ?? ''
                          break;
                        case 'email':
                          //idk how this case will work but ill leave it
                          valuesArray[i] = foundUser.email
                          break;
                      }
                    }
                  }
                }
                
                const tempColumn: TableColumn = {
                  id: props.column.id,
                  display: true,
                  tags: [],
                  header: text,
                  tableId: props.table.id,
                  type: props.column.type,
                  values: valuesArray,
                  choices: choiceArray,
                  order: props.table.columns.length,
                }

                props.createColumn.mutate({
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
              else if(props.column.edit && text !== props.column.header && text !== '') {
                props.updateColumn.mutate({
                  column: props.column,
                  values: props.column.values,
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
                      header: parentColumn.id === props.column.id ? text : parentColumn.header,
                      edit: parentColumn.id === props.column.id ? false : parentColumn.edit,
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
                  .map((col) => (col.id === props.column.id ? ({
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
          label={(<span className="hover:underline underline-offset-2 whitespace-normal break-words min-w-[145px] max-w-[145px]">{props.column.header}</span>)}
          arrowIcon={false}
          placement="bottom"
          inline
        >
          <div className="w-max flex flex-col">
            <span className="whitespace-nowrap px-4 border-b pb-0.5 font-semibold text-base text-center w-full">
              <span>Type:</span>
              <ColorComponent 
                customText={' ' + props.column.type[0].toUpperCase() + props.column.type.substring(1)} 
                activeColor={getColumnTypeColor(props.column.type)}
              />
            </span>
            <Dropdown.Item 
              className="justify-center"
              onClick={() => {
                const temp: Table = {
                  ...props.table,
                  columns: props.table.columns.map((parentColumn) => {
                    if(parentColumn.id === props.column.id){
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
                props.refColumn.current = props.column
                props.setDeleteColumnConfirmation(true)
              }}
            >Delete</Dropdown.Item>
          </div>
        </Dropdown>
      )}
      {(
        mouseHover && 
        !props.column.temporary && 
        !props.column.edit
      ) && (
        <button 
          className='absolute right-0 top-3 p-1 hover:bg-gray-200 text-gray-500 hover:text-black'
          onClick={() => {
            let reorderedRows: Record<string, { values: string[], choices: string[] }> = {}
            if(sortOrder === 'DSC' || sortOrder === null) {
              reorderedRows = reorderRows('ASC', props.column, props.table, props.tags, props.timeslots, props.notifications)
            }
            else {
              reorderedRows = reorderRows('DSC', props.column, props.table, props.tags, props.timeslots, props.notifications)
            }

            reorderTable.mutate({
              tableColumns: props.table.columns.map((column) => ({
                ...column,
                values: reorderedRows[column.id].values,
                choices: reorderedRows[column.id].choices,
              })),
              options: {
                logging: true
              }
            })

            const updateGroups = (prev: TableGroup[]) => prev.map((group) => props.table.tableGroupId === group.id ? ({
              ...group,
              tables: group.tables.map((table) => table.id === props.table.id ? ({
                ...table,
                columns: table.columns.map((column) => ({
                  ...column,
                  values: reorderedRows[column.id].values,
                  choices: reorderedRows[column.id].choices
                }))
              }) : table)
            }) : group)

            props.parentUpdateSelectedTableGroups(prev => updateGroups(prev))
            props.parentUpdateTableGroups(prev => updateGroups(prev))
            props.parentUpdateTable(prev => prev !== undefined ? ({
              ...prev,
              columns: prev.columns.map((column) => ({
                ...column,
                values: reorderedRows[column.id].values,
                choices: reorderedRows[column.id].choices
              }))
            }) : prev)
            props.parentUpdateTableColumns(prev => prev.map((column) => ({
              ...column,
              values: reorderedRows[column.id].values,
              choices: reorderedRows[column.id].choices
            })))
          }}
        >
          {sortOrder === 'DSC' || sortOrder === null ? (
            <GoTriangleDown size={16} />
          ) : (
            <GoTriangleUp size={16} />
          )}
        </button>
      )}
      {columnState.type === 'is-dragging-over' && columnState.closestEdge && columnState.closestEdge === 'right' && (
        <DropIndicator edge={columnState.closestEdge} gap={'8px'} />
      )}
      {columnState.type === 'preview' && createPortal(<DragPreview column={props.column} tags={props.tags} />, columnState.container)}
    </th>
  )
}

function DragPreview({ column, tags }: { column: TableColumn, tags: UserTag[]}) {
  return (
    <table className="w-full text-sm text-left text-gray-600">
      <thead className="text-xs text-gray-700 bg-gray-50">
        <tr>
          <th
            className={`
              relative border-x border-x-gray-300 border-b border-b-gray-300 
              min-w-[150px] max-w-[150px] whitespace-normal break-words place-items-center
              items-center
            `}
          >
            {column.header}
          </th>
        </tr>
      </thead>
      <tbody>
        {/* TODO: special logic for date/file cell types */}
        {column.values.map((value, index) => {
          let displayValue = value
          if(index > 6) return null 
          if(column.type === 'tag') {
            displayValue = tags.find((tag) => tag.id === value)?.name ?? ''
          }
          return (
            <tr className="bg-white border-b w-full" key={index}>
              <td className='text-ellipsis border py-3 px-3 max-w-[150px] w-full'>
                <span className={`
                  font-thin p-0 text-sm border-transparent ring-transparent w-full 
                  border-b-gray-400 border py-0.5 ${column.type === 'tag' ? `text-${tags.find((tag) => tag.id === value)?.color ?? 'black'}`: ''}
                `}>{displayValue === '' ? 'Enter Value...' : displayValue}</span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}