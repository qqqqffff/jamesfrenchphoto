import { useMutation, UseQueryResult } from "@tanstack/react-query"
import { HiOutlineChevronDown, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlinePlusCircle } from "react-icons/hi2"
import { TableService, CreateTableGroupParams, CreateTableParams, DeleteTableGroupParams, UpdateTableGroupParams, ReorderTableGroupParams } from "../../../services/tableService"
import { Table, TableGroup } from "../../../types"
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import { EditableTextField } from "../../common/EditableTextField"
import { HiOutlineDotsHorizontal, HiOutlineMinusCircle } from "react-icons/hi"
import { Dropdown } from "flowbite-react"
import { ConfirmationModal } from "../../modals"
import Loading from "../../common/Loading"
import { v4 } from 'uuid'
import { TableList } from "./TableList"
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { isTableGroupData, isTableListData } from "./TableListData"
import { triggerPostMoveFlash } from '@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { flushSync } from "react-dom"

interface TableSidePanelParams {
  TableService: TableService,
  tableGroups: TableGroup[],
  tableGroupsQuery: UseQueryResult<TableGroup[] | undefined, Error>,
  sidePanelExpanded: boolean,
  setSidePanelExpanded: Dispatch<SetStateAction<boolean>>,
  parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>,
  selectedTableGroups: TableGroup[],
  parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>,
  selectedTable?: Table,
  parentUpdateSelectedTable: Dispatch<SetStateAction<Table | undefined>>,
}

//TODO: add monitor for table groups
export const TableSidePanel = (props: TableSidePanelParams) => {
  const selectedGroupId = useRef<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState(false)

  useEffect(() => {
    return monitorForElements({
      canMonitor({ source }) {
        return isTableListData(source.data)
      },
      onDropTargetChange(args) {
        console.log(args.location)
      },
      onDrop({ location, source }) {
        const target = location.current.dropTargets[0]
        if(!target) {
          return
        }

        const sourceData = source.data
        const targetData = target.data

        //allow droping onto a table group
        if(
          !isTableListData(sourceData) || 
          (!isTableListData(targetData) && !isTableGroupData(targetData))
        ) {
          return
        }

        const foundTableGroup = isTableListData(targetData) ? 
          props.tableGroups.find((group) => group.tables.some((table) => table.id === targetData.tableId))
        :
          props.tableGroups.find((group) => group.id === targetData.tableGroupId)

        if(!foundTableGroup) return

        if(isTableGroupData(targetData)) {
          const sourceTableGroup = props.tableGroups.find((group) => group.tables.some((table) => table.id === sourceData.tableId))
          if(!sourceTableGroup) return
          const foundTable = sourceTableGroup.tables.find((table) => table.id === sourceData.tableId)
          if(!foundTable) return

          foundTable.order = foundTableGroup.tables.length
          foundTable.tableGroupId = foundTableGroup.id

          if(sourceTableGroup.id === targetData.tableGroupId) return

          const updatedTargetTables: Table[] = [...foundTableGroup.tables, foundTable]
          const updatedSourceTables: Table[] = sourceTableGroup.tables.filter((table) => table.id !== sourceData.tableId)

          flushSync(() => {
            const updateGroups = (prev: TableGroup[]) => prev.map((parentGroup) => {
              if(parentGroup.id === foundTableGroup.id) {
                return {
                  ...parentGroup,
                  tables: updatedTargetTables
                }
              }
              else if(parentGroup.id === sourceTableGroup.id) {
                return {
                  ...parentGroup,
                  tables: updatedSourceTables
                }
              }
              return parentGroup
            })

            //TODO: implement api call

            props.parentUpdateSelectedTableGroups((prev) => updateGroups(prev))
            props.parentUpdateTableGroups((prev) => updateGroups(prev))
            props.parentUpdateSelectedTable((prev) => prev?.id === foundTable.id ? foundTable : prev)
          })

          const element = document.querySelector(`[data-table-list-id="${sourceData.tableId}"]`)
          if(element instanceof HTMLElement) {
            triggerPostMoveFlash(element)
          }
          return
        }
        
        const tables = foundTableGroup.tables.sort((a, b) => a.order - b.order)
        const indexOfSource = tables.findIndex((table) => table.id === sourceData.tableId)
        const indexOfTarget = tables.findIndex((table) => table.id === targetData.tableId)

        if(indexOfSource === -1 || indexOfTarget === -1 || indexOfSource === indexOfTarget) {
          return
        }

        const closestEdgeOfTarget = extractClosestEdge(targetData)

        const updatedTables: Table[] = []

        for(let i = 0; i < indexOfTarget + (closestEdgeOfTarget === 'top' ? 0 : 1); i++) {
          if(i === indexOfSource) continue
          updatedTables.push({
            ...tables[i],
            order: i
          })
        }
        updatedTables.push({
          ...tables[indexOfSource],
          order: indexOfTarget
        })
        for(let i = indexOfTarget + (closestEdgeOfTarget === 'top' ? 0 : 1); i < tables.length; i++) {
          if(i === indexOfSource) continue
          updatedTables.push({
            ...tables[i],
            order: i
          })
        }

        flushSync(() => {
          const updateGroup = (prev: TableGroup[]) => prev.map((parentGroup) => parentGroup.id === foundTableGroup.id ? ({
            ...parentGroup,
            tables: updatedTables
          }) : parentGroup)

          reorderTables.mutate({
            tables: updatedTables,
            options: {
              logging: true
            }
          })

          const selectedTable = tables.find((table) => table.id === props.selectedTable?.id)
          props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
          props.parentUpdateTableGroups((prev) => updateGroup(prev))
          props.parentUpdateSelectedTable((prev) => selectedTable?.id === prev?.id ? selectedTable : prev)
        })

        const element = document.querySelector(`[data-table-list-id="${sourceData.tableId}"]`)
        if(element instanceof HTMLElement) {
          triggerPostMoveFlash(element)
        }
      },
    })
  }, [props.tableGroups])

  const reorderTables = useMutation({
    mutationFn: (params: ReorderTableGroupParams) => props.TableService.reorderTableGroupMutation(params)
  })

  const createTableGroup = useMutation({
    mutationFn: (params: CreateTableGroupParams) => props.TableService.createTableGroupMutation(params)
  })
  
  const updateTableGroup = useMutation({
    mutationFn: (params: UpdateTableGroupParams) => props.TableService.updateTableGroupMutation(params)
  })

  const deleteTableGroup = useMutation({
    mutationFn: (params: DeleteTableGroupParams) => props.TableService.deleteTableGroupMutation(params)
  })

  const createTable = useMutation({
    mutationFn: (params: CreateTableParams) => props.TableService.createTableMutation(params),
  })

  return (
    <>
      <ConfirmationModal 
        title='Delete Group'
        body='This action will <b>DELETE</b> this group <b>AND</b> any associated tables. This action cannot be undone!'
        denyText="Cancel"
        confirmText="Delete"
        confirmAction={() => {
          const foundGroup = props.tableGroups.find((group) => group.id === selectedGroupId.current)
          if(foundGroup){
            deleteTableGroup.mutate({
              group: foundGroup,
              options: {
                logging: true
              }
            })
            setDeleteConfirmation(false)
            props.parentUpdateTableGroups((prev) => {
              return prev.filter((group) => group.id !== selectedGroupId.current)
            })
            props.parentUpdateSelectedTableGroups((prev) => {
              return prev.filter((group) => group.id !== selectedGroupId.current)
            })
            props.parentUpdateSelectedTable((prev) => {
              if(prev?.tableGroupId === selectedGroupId.current) return undefined
              return prev
            })
            selectedGroupId.current = null
          }
        }}
        onClose={() => setDeleteConfirmation(false)}
        open={deleteConfirmation}
      />
      <div className={`flex flex-col items-center border border-gray-400 gap-2 rounded-2xl ${props.sidePanelExpanded ? 'min-w-[400px] p-4 w-[400px]' : 'w-[50px] max-w-[50px]'} transition-all duration-300 ease-in-out`}>
        <div className={`flex flex-row items-center w-full justify-between ${props.sidePanelExpanded ? 'border-b  border-b-gray-400 pb-2' : ''}`}>
          <span className={`text-2xl text-start ${props.sidePanelExpanded ? 'ps-4 pe-2' : 'rotate-90 mt-8 -ms-1.5'} transition-all duration-300 ease-in-out`}>Tables</span>
          {props.sidePanelExpanded && (
            <div className="flex flex-row gap-2">
              <button 
                className="flex flex-row items-center gap-2 enabled:hover:text-gray-500 enabled:hover:bg-gray-100 px-3 py-1 border rounded-xl disabled:text-gray-400"
                disabled={props.tableGroups.some((group) => group.temporary)}
                onClick={() => {
                  const temp = [
                    ...props.tableGroups
                  ]
                  temp.push({
                    id: v4(),
                    name: '',
                    tables: [],
                    temporary: true,
                    createdAt: new Date().toISOString()
                  })

                  props.parentUpdateTableGroups(temp)
                }}
              >
                <span>Create Group</span>
                <HiOutlinePlusCircle size={20}/>
              </button>
              <button
                className="hover:text-gray-500 rounded-full"
                onClick={() => props.setSidePanelExpanded(!props.sidePanelExpanded)}
              >
                <HiOutlineMinusCircle size={20} />
              </button>
            </div>
          )}
        </div>
        {!props.sidePanelExpanded && (
          <button 
            className="mt-4"
            onClick={() => {
              props.setSidePanelExpanded(true)
            }}
          >
            <HiOutlineChevronRight size={24} />
          </button>
        )}
        {props.sidePanelExpanded && (
          <div className="flex flex-col w-full">
          {props.tableGroupsQuery.isLoading ? (
            <span className="flex flex-row text-start gap-1 italic font-light ms-4">
              <span>Loading</span>
              <Loading />
            </span>
          ) : (
            props.tableGroups
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((group, index) => {
              const selected = props.selectedTableGroups.some((selectedGroup) => group.id === selectedGroup.id)
              return (
                <div className="flex flex-col" key={index}>
                  {group.edit || group.temporary ? (
                    <div className="pe-16" key={index}>
                      <EditableTextField 
                        label={(<span>&bull;</span>)}
                        className="min-w-full me-3 text-lg border-b-black focus:ring-0 focus:border-transparent focus:border-b-black"
                        text={group.name ?? ''} 
                        placeholder="Enter Group Name Here..."
                        onSubmitText={(text) => {
                          //TODO: add an on submit error for empty field
                          if(group.temporary && text !== ''){
                            createTableGroup.mutate({
                              id: group.id,
                              name: text,
                              options: {
                                logging: true
                              }
                            })

                            const updateGroup = (prev: TableGroup[]) => {
                              const temp = [...prev]
                              
                              if(!temp.some((parentGroup) => group.id === parentGroup.id)) {
                                temp.push(group)
                              }

                              return temp.map((parentGroup) => {
                                if(parentGroup.id == group.id){
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
                          else if(group.edit && group.name !== '' && group.name !== text){
                            updateTableGroup.mutate({
                              group: group,
                              name: text,
                              options: {
                                logging: true
                              }
                            })

                            const updateGroup = (prev: TableGroup[]) => prev.map((parentGroup) => {
                              if(parentGroup.id == group.id){
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
                          if(selected && !group.tables.some((table) => table.temporary)){
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
                              .filter((selectedGroup) => selectedGroup.id !== group.id)
                            )
                            props.parentUpdateTableGroups(updateGroups(props.tableGroups))
                          }
                          else {
                            const temp = [
                              ...props.selectedTableGroups,
                              group
                            ]

                            props.parentUpdateSelectedTableGroups(temp)
                          }
                        }}
                      >
                        <div className="flex flex-row items-center text-lg font-light gap-2">
                          <span>{group.name}</span>
                        </div>
                        {selected ? (
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
                          disabled={group.tables.some((table) => table.temporary)}
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
                              tableGroupId: group.id,
                              order: group.tables.length,
                            }
                            
                            const updateGroup = (prev: TableGroup[]) => {
                              const temp = [
                                ...prev
                              ]
                              //select the group when adding
                              if(!temp.some((parentGroup) => group.id === parentGroup.id)) {
                                temp.push(group)
                              }

                              return temp.map((parentGroup) => {
                                if(parentGroup.id === group.id) {
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
                              if(!temp.some((parentGroup) => parentGroup.id === group.id)){
                                temp.push(group)
                              }

                              return temp.map((parentGroup) => {
                                if(parentGroup.id === group.id) {
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
                            setDeleteConfirmation(true)
                            selectedGroupId.current = group.id
                          }}
                        >Delete Group</Dropdown.Item>
                      </Dropdown>
                    </div>
                  )}
                  {selected && !group.temporary && (
                    <TableList 
                      TableService={props.TableService}
                      tableGroup={group}
                      tableSelected={props.selectedTable?.id}
                      selectedGroups={props.selectedTableGroups}
                      parentUpdateSelectedTable={props.parentUpdateSelectedTable}
                      parentUpdateSelectedTableGroups={props.parentUpdateSelectedTableGroups}
                      parentUpdateTableGroups={props.parentUpdateTableGroups}
                      createTable={createTable}
                    />
                  )}
                </div>
              )
            })
          )}
          </div>
        )}
      </div>
    </>
  )
}