import { Dispatch, MutableRefObject, SetStateAction, useEffect, useRef, useState } from "react";
import { Table, TableGroup } from "../../../types";
import { UseMutationResult } from "@tanstack/react-query";
import { v4 } from "uuid";
import { TableListItem } from "./TableListItem";
import { CreateTableGroupParams, CreateTableParams, UpdateTableGroupParams } from "../../../services/tableService";
import { HiOutlineChevronDown, HiOutlineChevronLeft } from "react-icons/hi2"
import { Dropdown } from "flowbite-react";
import { HiOutlineDotsHorizontal } from "react-icons/hi";
import { EditableTextField } from "../../common/EditableTextField";
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import invariant from 'tiny-invariant';
import { getTableGroupData, isTableListData } from "./TableListData";
import { attachClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';

interface TableListProps {
  tableGroup: TableGroup,
  tableGroups: TableGroup[]
  selectedTableGroups: TableGroup[]
  tableGroupSelected: boolean
  tableSelected?: string
  selectedGroupId: MutableRefObject<string | null>
  parentUpdateSelectedTable: Dispatch<SetStateAction<Table | undefined>>
  parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  setDeleteConfirmation: Dispatch<SetStateAction<boolean>>
  createTable: UseMutationResult<string | undefined, Error, CreateTableParams, unknown>
  createTableGroup: UseMutationResult<void, Error, CreateTableGroupParams, unknown>
  updateTableGroup: UseMutationResult<void, Error, UpdateTableGroupParams, unknown>
}

export const TableList = (props: TableListProps) => {
  const container = useRef<HTMLDivElement | null>(null)
  const [temporarySelection, setTemporarySelection] = useState(false)

  useEffect(() => {
    const element = container.current

    invariant(element)

    return dropTargetForElements({
      element,
      canDrop({ source }){
        return isTableListData(source.data)
      },
      getData({ input }) {
        const data = getTableGroupData(props.tableGroup)
        return attachClosestEdge(data, {
          element,
          input,
          allowedEdges: ['top', 'bottom']
        })
      },
      getIsSticky() {
        return true
      },
      onDragEnter() {
        if(!props.selectedTableGroups.some((group) => group.id === props.tableGroup.id)) {
          setTemporarySelection(true)
          props.parentUpdateSelectedTableGroups(prev => [...prev, props.tableGroup])
        }
      },
      onDragLeave() {
        props.parentUpdateSelectedTableGroups(prev => temporarySelection ? (
          prev.filter((group) => group.id !== props.tableGroup.id)
        ) : (
          prev
        ))
        setTemporarySelection(false)
      },
      onDrop() {
        setTemporarySelection(false)
      }
    })
  }, [
    props.tableGroup,
    temporarySelection,
    props.selectedTableGroups
  ])

  return (
    <div className={`flex flex-col ${temporarySelection ? 'border border-dashed border-blue-200' : ''}`} ref={container}>
      {props.tableGroup.edit || props.tableGroup.temporary ? (
        <div className="pe-16">
          <EditableTextField 
            label={(<span>&bull;</span>)}
            className="min-w-full me-3 text-lg border-b-black focus:ring-0 focus:border-transparent focus:border-b-black"
            text={props.tableGroup.name ?? ''} 
            placeholder="Enter Group Name Here..."
            onSubmitText={(text) => {
              //TODO: add an on submit error for empty field
              if(props.tableGroup.temporary && text !== ''){
                props.createTableGroup.mutate({
                  id: props.tableGroup.id,
                  name: text,
                  options: {
                    logging: true
                  }
                })

                const updateGroup = (prev: TableGroup[]) => {
                  const temp = [...prev]
                  
                  if(!temp.some((parentGroup) => props.tableGroup.id === parentGroup.id)) {
                    temp.push(props.tableGroup)
                  }

                  return temp.map((parentGroup) => {
                    if(parentGroup.id == props.tableGroup.id){
                      const tempGroup: TableGroup = {
                        ...parentGroup,
                        name: text,
                        edit: false,
                        temporary: false
                      }

                      return tempGroup
                    }
                    return parentGroup
                  })
                }

                props.parentUpdateTableGroups((prev) => updateGroup(prev))
                props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
              }
              else if(props.tableGroup.edit && props.tableGroup.name !== '' && props.tableGroup.name !== text){
                props.updateTableGroup.mutate({
                  group: props.tableGroup,
                  name: text,
                  options: {
                    logging: true
                  }
                })

                const updateGroup = (prev: TableGroup[]) => prev.map((parentGroup) => {
                  if(parentGroup.id == props.tableGroup.id){
                    const tempGroup: TableGroup = {
                      ...parentGroup,
                      name: text,
                      edit: false,
                      temporary: false
                    }

                    return tempGroup
                  }
                  return parentGroup
                })
                props.parentUpdateTableGroups((prev) => updateGroup(prev))
                props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
              }
            }} 
            onCancel={() => {
              const temp = [
                ...props.tableGroups
              ]
              .filter((group) => !group.temporary)
              .map((group) => ({...group, edit: false}))

              props.parentUpdateTableGroups(temp)
            }}
            editting
          />
        </div>
      ) : (
        <div className="flex flex-row items-center w-full px-4">
          <span className="text-2xl">&bull;</span>
          <button 
            className={`
              flex flex-row gap-2 items-center w-full mx-1 px-1 justify-between border border-transparent rounded-lg
            hover:text-gray-500 hover:border-gray-200
            `}
            onClick={() => {
              //arent able to unselect groups with temp table -> user needs to finish creating before deselecting
              if(props.tableGroupSelected && !props.tableGroup.tables.some((table) => table.temporary)){
                //when unselecting remove all temporary tables and filter out the group from the selected groups
                const updateGroups = (tableGroups: TableGroup[]): TableGroup[] => {
                  return [
                    ...tableGroups
                  ]
                  .map((group) => ({
                    ...group,
                    tables: group.tables.filter((table) => !table.temporary)
                  }))
                  
                }

                props.parentUpdateSelectedTableGroups(
                  updateGroups(props.selectedTableGroups)
                  .filter((selectedGroup) => selectedGroup.id !== props.tableGroup.id)
                )
                props.parentUpdateTableGroups(updateGroups(props.tableGroups))
              }
              else {
                const temp = [
                  ...props.selectedTableGroups,
                  props.tableGroup
                ]

                props.parentUpdateSelectedTableGroups(temp)
              }
            }}
          >
            <div className="flex flex-row items-center text-lg font-light gap-2">
              <span>{props.tableGroup.name}</span>
            </div>
            {props.tableGroupSelected ? (
              <HiOutlineChevronDown size={20} />
            ) : (
              <HiOutlineChevronLeft size={20} />
            )}
          </button>
          <Dropdown
            label={(
              <HiOutlineDotsHorizontal size={20} className="hover:text-gray-500" />
            )}
            inline
            arrowIcon={false}
          >
            <Dropdown.Item 
              // cannot add multiple temporary tables to a group
              disabled={props.tableGroup.tables.some((table) => table.temporary)}
              onClick={() => {
                const tableId = v4()
                const newTable: Table = {
                  id: tableId,
                  temporary: true,
                  createdAt: new Date().toISOString(),
                  name: '',
                  columns: [
                    {
                      id: v4(),
                      header: 'Sitting Number',
                      values: ['1234', '', ''],
                      type: 'value',
                      display: true,
                      tags: [],
                      choices: ['', '', ''],
                      tableId: tableId,
                      order: 0,
                    },
                    {
                      id: v4(),
                      header: 'Participant First',
                      values: ['Jane', '', ''],
                      type: 'value',
                      display: true,
                      tags: [],
                      choices: ['', '', ''],
                      tableId: tableId,
                      order: 1,
                    },
                    {
                      id: v4(),
                      header: 'Participant Last',
                      values: ['Doe', '', ''],
                      type: 'value',
                      display: true,
                      tags: [],
                      choices: ['', '', ''],
                      tableId: tableId,
                      order: 2,
                    },
                  ],
                  tableGroupId: props.tableGroup.id,
                  order: props.tableGroup.tables.length,
                }
                
                const updateGroup = (prev: TableGroup[]) => {
                  const temp = [
                    ...prev
                  ]
                  //select the group when adding
                  if(!temp.some((parentGroup) => props.tableGroup.id === parentGroup.id)) {
                    temp.push(props.tableGroup)
                  }

                  return temp.map((parentGroup) => {
                    if(parentGroup.id === props.tableGroup.id) {
                      return ({
                        ...parentGroup,
                        tables: [...parentGroup.tables, newTable]
                      })
                    }
                    return parentGroup
                  })
                }

                props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
                props.parentUpdateTableGroups((prev) => updateGroup(prev))
                props.parentUpdateSelectedTable(newTable)
              }}
            >Add Table</Dropdown.Item>
            <Dropdown.Item
              onClick={() => {
                const updateGroup = (prev: TableGroup[]) => {
                  let temp = [...prev]
                  //select the group when updating the name
                  if(!temp.some((parentGroup) => parentGroup.id === props.tableGroup.id)){
                    temp.push(props.tableGroup)
                  }

                  return temp.map((parentGroup) => {
                    if(parentGroup.id === props.tableGroup.id) {
                      return {
                        ...parentGroup,
                        edit: true
                      }
                    }
                    return parentGroup
                  })
                }

                props.parentUpdateTableGroups((prev) => updateGroup(prev))
                props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
              }}
            >Rename Group</Dropdown.Item>
            <Dropdown.Item
              onClick={() => {
                props.setDeleteConfirmation(true)
                props.selectedGroupId.current = props.tableGroup.id
              }}
            >Delete Group</Dropdown.Item>
          </Dropdown>
        </div>
      )}
      {props.tableGroupSelected && !props.tableGroup.temporary && (
        <ol className="ps-10">
          {props.tableGroup.tables.length === 0 ? (
            <button
              className="
                text-sm font-light w-full px-6 py-0.5 flex flex-row items-center 
                cursor-pointer hover:text-gray-500 hover:bg-gray-100 
                hover:border-gray-600 rounded-md hover:underline
              "
              onClick={() => {
                const tableId = v4()
                const newTable: Table = {
                  id: tableId,
                  temporary: true,
                  createdAt: new Date().toISOString(),
                  name: '',
                  columns: [
                    {
                      id: v4(),
                      header: 'Sitting Number',
                      values: ['1234', '', ''],
                      type: 'value',
                      display: true,
                      tags: [],
                      choices: ['', '', ''],
                      tableId: tableId,
                      order: 0,
                    },
                    {
                      id: v4(),
                      header: 'Participant First',
                      values: ['Jane', '', ''],
                      type: 'value',
                      display: true,
                      tags: [],
                      choices: ['', '', ''],
                      tableId: tableId,
                      order: 1,
                    },
                    {
                      id: v4(),
                      header: 'Participant Last',
                      values: ['Doe', '', ''],
                      type: 'value',
                      display: true,
                      tags: [],
                      choices: ['', '', ''],
                      tableId: tableId,
                      order: 2,
                    },
                  ],
                  tableGroupId: props.tableGroup.id,
                  order: props.tableGroup.tables.length,
                }
                
                const updateGroup = (prev: TableGroup[]) => {
                  const temp = [
                    ...prev
                  ]
                  //select the group when adding
                  if(!temp.some((parentGroup) => props.tableGroup.id === parentGroup.id)) {
                    temp.push(props.tableGroup)
                  }

                  return temp.map((parentGroup) => {
                    if(parentGroup.id === props.tableGroup.id) {
                      return ({
                        ...parentGroup,
                        tables: [...parentGroup.tables, newTable]
                      })
                    }
                    return parentGroup
                  })
                }

                props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
                props.parentUpdateTableGroups((prev) => updateGroup(prev))
                props.parentUpdateSelectedTable(newTable)
              }}
            >
              <li style={{ listStyleType: 'circle' }} />
              <span className="italic">Click here or the three dots to add a table</span>
            </button>
          ) : (
            props.tableGroup.tables
            .sort((a, b) => b.order - a.order)
            .map((table, index) => {
              return (
                <TableListItem 
                  key={index}
                  table={table}
                  tableGroup={props.tableGroup}
                  tableSelected={props.tableSelected}
                  parentUpdateSelectedTable={props.parentUpdateSelectedTable}
                  parentUpdateSelectedTableGroups={props.parentUpdateSelectedTableGroups}
                  parentUpdateTableGroups={props.parentUpdateTableGroups}
                  createTable={props.createTable}
                  parentUpdateTemporarySelection={setTemporarySelection}
                />
              )
            })
          )}
        </ol>
      )}
    </div>
  )
}