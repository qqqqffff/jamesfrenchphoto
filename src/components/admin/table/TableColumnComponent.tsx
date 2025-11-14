import {
  type Edge,
  extractClosestEdge,
  attachClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { Table, TableColumn, TableGroup } from '../../../types';
import { Dispatch, HTMLAttributes, MutableRefObject, SetStateAction, useEffect, useRef, useState } from 'react';
import { Dropdown } from 'flowbite-react';
import { getColumnTypeColor } from '../../../utils';
import { ColorComponent } from '../../common/ColorComponent';
import { DropIndicator } from '../../common/DropIndicator';
import { EditableTextField } from '../../common/EditableTextField';
import { UseMutationResult } from '@tanstack/react-query';
import { CreateTableColumnParams, UpdateTableColumnParams } from '../../../services/tableService';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import invariant from 'tiny-invariant';
import { getTableColumnData, isTableColumnData } from './TableColumnData';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { createPortal } from 'react-dom';


interface TableColumnProps {
  table: Table
  column: TableColumn
  refColumn: MutableRefObject<TableColumn | null>
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

  return (
    <th
      data-table-column-id={props.column.id}
      ref={tableColumnRef}
      className={`
        relative border-x border-x-gray-300 border-b border-b-gray-300 
        min-w-[150px] max-w-[150px] whitespace-normal break-words place-items-center
        items-center ${stateStyles[columnState.type] ?? ''}
      `}
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
                const valuesArray = []
                for(let i = 0; i < props.table.columns[0].values.length; i++) {
                  valuesArray.push('')
                }
                const tempColumn: TableColumn = {
                  id: props.column.id,
                  display: true,
                  tags: [],
                  header: text,
                  tableId: props.table.id,
                  type: props.column.type,
                  values: valuesArray,
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
          label={(<span className="hover:underline underline-offset-2">{props.column.header}</span>)}
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
      {columnState.type === 'is-dragging-over' && columnState.closestEdge && columnState.closestEdge === 'right' && (
        <DropIndicator edge={columnState.closestEdge} gap={'8px'} />
      )}
      {columnState.type === 'preview' && createPortal(<DragPreview column={props.column} />, columnState.container)}
    </th>
  )
}

function DragPreview({ column }: { column: TableColumn}) {
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
        {/* TODO: special logic for date/tag/file cell types */}
        {column.values.map((value, index) => {
          if(index > 6) return null 
          return (
            <tr className="bg-white border-b w-full" key={index}>
              <td className='text-ellipsis border py-3 px-3 max-w-[150px] w-full'>
                <span className='font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 border py-0.5'>{value === '' ? 'Enter Value...' : value}</span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}