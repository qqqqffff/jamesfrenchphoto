import { useNavigate } from "@tanstack/react-router"
import { Table, TableGroup } from "../../../types"
import { EditableTextField } from "../../common/EditableTextField"
import { UseMutationResult } from "@tanstack/react-query"
import { Dispatch, HTMLAttributes, SetStateAction, useEffect, useRef, useState } from "react"
import { CreateTableParams } from "../../../services/tableService"
import { attachClosestEdge, type Edge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import invariant from 'tiny-invariant';
import { getTableListData, isTableListData } from "./TableListData"
import { DropIndicator } from "../../common/DropIndicator"
import { createPortal } from "react-dom"

interface TableListItemProps {
  table: Table,
  tableGroup: TableGroup,
  tableSelected?: string,
  parentUpdateSelectedTable: Dispatch<SetStateAction<Table | undefined>>
  parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTemporarySelection: Dispatch<SetStateAction<boolean>>
  createTable: UseMutationResult<string | undefined, Error, CreateTableParams, unknown>
}

type TableState =
  | {
    type: 'idle'
    }
  | {
    type: 'preview'
    container: HTMLElement
    }
  | {
    type: 'is-dragging'
    }
  | {
    type: 'is-dragging-over'
    closestEdge: Edge | null
  }

const stateStyles: { [Key in TableState['type']]?: HTMLAttributes<HTMLDivElement>['className'] } = {
  'is-dragging': 'opcaity-40'
}

const idle: TableState = { type: 'idle' }

export const TableListItem = (props: TableListItemProps) => {
  const container = useRef<HTMLDivElement | null>(null)
  const [tableState, setTableState] = useState<TableState>(idle)
  const navigate = useNavigate()

  useEffect(() => {
    const element = container.current

    invariant(element)

    return combine(
      draggable({
        element,
        getInitialData() {
          return getTableListData(props.table)
        },
        canDrag: () => props.table.temporary === undefined || props.table.temporary === false,
        onGenerateDragPreview({ nativeSetDragImage }) {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: pointerOutsideOfPreview({
              x: '16px',
              y: '8px'
            }),
            render({ container, }) {
              setTableState({ type: 'preview', container })
            },
          })
        },
        onDragStart() { 
          setTableState({ type: 'is-dragging' })
        },
        onDrop() {
          setTableState(idle)
          props.parentUpdateTemporarySelection(false)
        },
      }),
      dropTargetForElements({
        element,
        canDrop({ source }) {
          if(source.element === element) return false
          return isTableListData(source.data)
        },
        getData({ input }) {
          const data = getTableListData(props.table)
          return attachClosestEdge(data, {
            element,
            input,
            allowedEdges: ['top', 'bottom']
          })
        },
        getIsSticky() {
          return true
        },
        onDragEnter({ self }) {
          const closestEdge = extractClosestEdge(self.data)
          setTableState((current) => {
            if(current.type === 'is-dragging-over' && current.closestEdge === closestEdge) {
              return current
            }
            return { type: 'is-dragging-over', closestEdge }
          })
        },
        onDragLeave() {
          setTableState(idle)
        },
        onDrop() {
          setTableState(idle)
        }
      })
    )
  }, [props.table])

  const selected = props.tableSelected === props.table.id

  return (
    <>
      <div className="w-full relative">
        {tableState.type === 'is-dragging-over' && tableState.closestEdge === 'top' && (
          <DropIndicator edge='top' gap="2px" />
        )}
      </div>
      <div 
        ref={container} 
        className={`${stateStyles[tableState.type]}`}
        data-table-list-id={props.table.id}
      >
      {(props.table.temporary ? (
        <div className="ps-6 pe-8 py-0.5">
          <EditableTextField 
            label={<li style={{ listStyleType: 'circle' }} className="text-sm -ms-4 -me-2" />}
            className="min-w-full text-sm border-b-black focus:ring-0 focus:border-transparent focus:border-b-black me-3"
            text={''}
            placeholder="Enter Table Name Here..."
            onSubmitText={(text) => {
              if(text !== '') {
                //TODO: complete async mutations
                props.createTable.mutateAsync({
                  id: props.table.id,
                  tableGroup: props.tableGroup,
                  name: text,
                  columns: props.table.columns,
                  options: {
                    logging: true
                  }
                }).then(() => {
                  
                }).catch(() => {

                })
                navigate({ to: '.', search: { table: props.table.id }})
              }

              //if text is empty remove the table
              const updateGroups = (prev: TableGroup[]): TableGroup[] => prev
              .map((parentGroup) => parentGroup.id === props.tableGroup.id ? ({
                ...parentGroup,
                tables: parentGroup.tables
                .filter((parentTable) => props.table.id === parentTable.id && text === '' ? false : true)
                .map(((parentTable) => parentTable.id === props.table.id ? ({
                  ...parentTable,
                  name: text,
                  temporary: false
                }) : parentTable))
              }) : parentGroup)

              //update state for selected groups, groups, and selectedTable
              props.parentUpdateSelectedTable((prev) => (prev !== undefined && prev.id === props.table.id ? {
                ...prev,
                name: text,
                temporary: false
              } : undefined))
              props.parentUpdateSelectedTableGroups((prev) => updateGroups(prev))
              props.parentUpdateTableGroups((prev) => updateGroups(prev))
            }}
            onCancel={() => {
              const updateGroup = (prev: TableGroup[]) => prev.map((group) => ({
                ...group,
                tables: group.tables.filter((parentTable) => parentTable.id !== props.table.id)
              }))

              props.parentUpdateSelectedTable(prev => prev && prev.id === props.table.id ? undefined : prev)
              props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
              props.parentUpdateTableGroups((prev) => updateGroup(prev))
            }}
          />
        </div>
      ) : (
        <div
          onClick={() => {
            if(!selected) {
              props.parentUpdateSelectedTable(props.table)
              navigate({ to: '.', search: { table: props.table.id }})
            }
            else {
              props.parentUpdateSelectedTable(undefined)
              navigate({ to: '.', search: { table: undefined }})
            }
          }}
          className={`
            text-sm font-light border w-full hover:text-gray-500 hover:cursor-pointer rounded-md px-6 py-0.5 flex flex-row items-center
            ${stateStyles[tableState.type] ?? ''}
            ${selected ? 'border-gray-800 bg-gray-100 hover:bg-gray-200 hover:border-gray-600' : 'hover:border-gray-200 border-transparent'}
          `}
        >
          <li style={{ listStyleType: 'circle' }} />
          <span>{props.table.name}</span>
        </div>
      ))}
      {tableState.type === 'preview' && createPortal(
        <DragPreview 
          table={props.table}
          containerWidth={container.current?.clientWidth}
        />, tableState.container
      )}
      </div>
      <div className="w-full relative">
        {tableState.type === 'is-dragging-over' && tableState.closestEdge === 'bottom' && (
          <DropIndicator edge='bottom' gap="2px" />
        )}
      </div>
    </>
    )
}

function DragPreview({ table, containerWidth }: { table: Table, containerWidth?: number }) {
  return (
    <div 
      className={`
        text-sm font-light border w-full rounded-md px-6 py-0.5 
        flex flex-row items-center min-w-max
      `}
      style={{
        width: containerWidth ? `${containerWidth}px` : 'auto'
      }}
    >
      <li style={{ listStyleType: 'circle' }} />
      <span>{table.name}</span>
    </div>
  )
}