import { useMutation, UseQueryResult } from "@tanstack/react-query"
import { HiOutlineChevronDown, HiOutlineChevronLeft, HiOutlinePlusCircle } from "react-icons/hi2"
import { createTableGroupMutation, CreateTableGroupParams, createTableMutation, CreateTableParams, deleteTableGroupMutation, DeleteTableGroupParams, updateTableGroupMutation, UpdateTableGroupParams } from "../../../services/tableService"
import { Table, TableGroup } from "../../../types"
import { Dispatch, SetStateAction, useRef, useState } from "react"
import { EditableTextField } from "../../common/EditableTextField"
import { HiOutlineDotsHorizontal } from "react-icons/hi"
import { Dropdown } from "flowbite-react"
import { ConfirmationModal } from "../../modals"
import { useNavigate } from "@tanstack/react-router"
import Loading from "../../common/Loading"
import { v4 } from 'uuid'

interface TableSidePanelParams {
  tableGroups: TableGroup[],
  tableGroupsQuery: UseQueryResult<TableGroup[] | undefined, Error>,
  parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  selectedTableGroups: TableGroup[],
  parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>,
  selectedTable?: Table,
  parentUpdateSelectedTable: Dispatch<SetStateAction<Table | undefined>> 
}

export const TableSidePanel = (props: TableSidePanelParams) => {
  const selectedGroupId = useRef<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState(false)
  const navigate = useNavigate()

  const createTableGroup = useMutation({
    mutationFn: (params: CreateTableGroupParams) => createTableGroupMutation(params)
  })
  
  const updateTableGroup = useMutation({
    mutationFn: (params: UpdateTableGroupParams) => updateTableGroupMutation(params)
  })

  const deleteTableGroup = useMutation({
    mutationFn: (params: DeleteTableGroupParams) => deleteTableGroupMutation(params)
  })

  const createTable = useMutation({
    mutationFn: (params: CreateTableParams) => createTableMutation(params),
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
      <div className="flex flex-col items-center border border-gray-400 gap-2 rounded-2xl p-4 max-w-[400px] min-w-[400px]">
        <div className="flex flex-row items-center w-full justify-between px-4 border-b pb-4 border-b-gray-400">
          <span className="text-2xl text-start">Tables</span>
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
        </div>
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
                                  header: 'Participant First',
                                  values: ['Jane', '', ''],
                                  type: 'value',
                                  display: true,
                                  tags: [],
                                  choices: ['', '', ''],
                                  tableId: tableId,
                                  order: 0,
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
                                  order: 0,
                                },
                                {
                                  id: v4(),
                                  header: 'Mother Name',
                                  values: ['Janette Doe', '', ''],
                                  type: 'value',
                                  display: true,
                                  tags: [],
                                  choices: ['', '', ''],
                                  tableId: tableId,
                                  order: 0,
                                },
                              ],
                              tableGroupId: group.id
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
                    <ol className="ps-10">
                      {group.tables.length === 0 ? (
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
                                  header: 'Participant First',
                                  values: ['Jane', '', ''],
                                  type: 'value',
                                  display: true,
                                  tags: [],
                                  choices: ['', '', ''],
                                  tableId: tableId,
                                  order: 0,
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
                                  order: 1,
                                },
                                {
                                  id: v4(),
                                  header: 'Mother Name',
                                  values: ['Janette Doe', '', ''],
                                  type: 'value',
                                  display: true,
                                  tags: [],
                                  choices: ['', '', ''],
                                  tableId: tableId,
                                  order: 2,
                                },
                              ],
                              tableGroupId: group.id
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
                        >
                          <li style={{ listStyleType: 'circle'}} />
                          <span className="italic">Click here or the three dots to add a table</span>
                        </button>
                      ) : (
                        group.tables
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((table, index) => {
                        const tableSelected = table.id === props.selectedTable?.id

                        //only editing textfield if table is temporary
                        return (table.temporary ? (
                          <div className="ps-6 pe-8 py-0.5" key={index}>
                            <EditableTextField
                              label={<li style={{ listStyleType: 'circle' }} className="text-sm -ms-4 -me-2" />}
                              className="min-w-full text-sm border-b-black focus:ring-0 focus:border-transparent focus:border-b-black me-3"
                              text={''} //text is empty since temporary means that it was just created
                              placeholder="Enter Table Name Here..."
                              onSubmitText={(text) => {
                                if(text !== '') {
                                  createTable.mutate({
                                    id: table.id,
                                    tableGroupId: group.id,
                                    name: text,
                                    columns: table.columns,
                                    options: {
                                      logging: true
                                    }
                                  })
                                  navigate({ to: '.', search: { table: table.id }})
                                }
                                
                                //if text is empty remove the table
                                const updateGroups = (prev: TableGroup[]): TableGroup[] => {
                                  return [
                                    ...prev
                                  ].map((parentGroup) => {
                                    if(parentGroup.id === group.id) {
                                      if (text !== '') {
                                        return ({
                                          ...group,
                                          tables: group.tables.map((groupTables) => {
                                            if(groupTables.id === table.id) {
                                              return ({
                                                ...table,
                                                name: text,
                                                temporary: false
                                              })
                                            }
                                            return groupTables
                                          })
                                        })
                                      } else {
                                        return ({
                                          ...group,
                                          tables: group.tables.filter((groupTables) => groupTables.id !== table.id)
                                        })
                                      }
                                    }
                                    return parentGroup
                                  })
                                }
                                //update state for selected groups, groups, and selectedTable
                                props.parentUpdateSelectedTable((prev) => (prev ? {
                                  ...prev,
                                  name: text,
                                  temporary: false
                                } : undefined))
                                props.parentUpdateSelectedTableGroups((prev) => updateGroups(prev))
                                props.parentUpdateTableGroups((prev) => updateGroups(prev))
                              }}
                              onCancel={() => {
                                const updateGroup = (prev: TableGroup[]) => {
                                  return [
                                    ...prev
                                  ].map((group) => ({
                                      ...group,
                                      tables: group.tables.filter((otherTables) => otherTables.id != table.id)
                                    })
                                  )
                                }

                                props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
                                props.parentUpdateTableGroups((prev) => updateGroup(prev))
                              }}
                              editting
                            />
                          </div>
                        ) : (
                          <div 
                            key={index}
                            onClick={() => {
                              if(!tableSelected) {
                                props.parentUpdateSelectedTable(table)
                                navigate({ to: '.', search: { table: table.id }})
                              }
                              else {
                                props.parentUpdateSelectedTable(undefined)
                                navigate({ to: '.', search: { table: undefined }})
                              }
                            }}
                            className={`
                              text-sm font-light border w-full hover:text-gray-500 hover:cursor-pointer rounded-md px-6 py-0.5 flex flex-row items-center
                              ${tableSelected ? 'border-gray-800 bg-gray-100 hover:bg-gray-200 hover:border-gray-600' : 'hover:border-gray-200 border-transparent'}
                            `}
                          >
                            <li style={{ listStyleType: 'circle'}} />
                            <span>{table.name}</span>
                          </div>
                        ))
                      }))}
                    </ol>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}