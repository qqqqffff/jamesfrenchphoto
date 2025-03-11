import { useMutation } from "@tanstack/react-query"
import { HiOutlineChevronDown, HiOutlineChevronLeft, HiOutlinePlusCircle } from "react-icons/hi2"
import { createTableGroupMutation, CreateTableGroupParams, createTableMutation, CreateTableParams, deleteTableGroupMutation, DeleteTableGroupParams, updateTableGroupMutation, UpdateTableGroupParams } from "../../../services/tableService"
import { Table, TableGroup } from "../../../types"
import { Dispatch, SetStateAction, useRef } from "react"
import { EditableTextField } from "../../common/EditableTextField"
import { HiOutlineDotsHorizontal } from "react-icons/hi"
import { Dropdown } from "flowbite-react"

interface TableSidePannelParams {
  tableGroups: TableGroup[],
  parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  selectedTableGroups: TableGroup[],
  parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>,
  selectedTable?: Table,
  parentUpdateSelectedTable: Dispatch<SetStateAction<Table | undefined>> 
}

export const TableSidePannel = (props: TableSidePannelParams) => {
  const tableGroupName = useRef<string | null>(null)
  const tableName = useRef<string | null>(null)
  const selectedGroupId = useRef<string | null>(null)

  const createTableGroup = useMutation({
    mutationFn: (params: CreateTableGroupParams) => createTableGroupMutation(params),
    onSuccess: (data) => {
      if(data){
        console.log(tableGroupName.current)
        const updateGroup = (prev: TableGroup[]) => prev.map((group) => {
          if(group.id.includes('temp') && tableGroupName.current !== null){
            const tempGroup: TableGroup = {
              ...group,
              id: data,
              name: tableGroupName.current
            }
            return tempGroup
          }
          return group
        })
        props.parentUpdateTableGroups((prev) => updateGroup(prev))
      }
      tableGroupName.current = null
    }
  })
  
  const updateTableGroup = useMutation({
    mutationFn: (params: UpdateTableGroupParams) => updateTableGroupMutation(params)
  })

  const deleteTableGroup = useMutation({
    mutationFn: (params: DeleteTableGroupParams) => deleteTableGroupMutation(params)
  })

  const createTable = useMutation({
    mutationFn: (params: CreateTableParams) => createTableMutation(params),
    onSuccess: (data) => {
      if(data && tableName.current && selectedGroupId.current) {
        const updateGroup = (prev: TableGroup[]) => prev.map((group) => {
          if(group.id === selectedGroupId.current && tableName.current && selectedGroupId.current){
            const mappedTable: Table = {
              id: data,
              name: tableName.current,
              tableGroupId: group.id,
              columns: []
            }
            return {
              ...group,
              tables: [...group.tables, mappedTable].filter((table) => table.id !== 'temp')
            }
          }
          return group
        })
        props.parentUpdateTableGroups((prev) => updateGroup(prev))
        props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
        props.parentUpdateSelectedTable({
          id: data,
          name: tableName.current,
          tableGroupId: selectedGroupId.current,
          columns: []
        })
        tableName.current = null
        selectedGroupId.current = null
      }
    }
  })

  // TODO: move me
  // const updateTable = useMutation({
  //   mutationFn: (params: UpdateTableParams) => updateTableMutation(params)
  // })

  // const deleteTable = useMutation({
  //   mutationFn: (params: DeleteTableParams) => deleteTableMutation(params)
  // })

  return (
    <>
      <div className="flex flex-col items-center border border-gray-400 gap-2 rounded-2xl p-4 max-w-[400px] min-w-[400px]">
        <div className="flex flex-row items-center w-full justify-between px-4 border-b pb-4 border-b-gray-400">
          <span className="text-2xl text-start">Tables</span>
          <button 
            className="flex flex-row items-center gap-2 enabled:hover:text-gray-500 enabled:hover:bg-gray-100 px-3 py-1 border rounded-xl disabled:text-gray-400"
            disabled={props.tableGroups.find((group) => group.id === 'temp') !== undefined}
            onClick={() => {
              const temp = [
                ...props.tableGroups
              ]
              temp.push({
                id: 'temp',
                name: '',
                tables: []
              })

              props.parentUpdateTableGroups(temp)
            }}
          >
            <span>Create Group</span>
            <HiOutlinePlusCircle size={20}/>
          </button>
        </div>
        <div className="flex flex-col w-full">
          {props.tableGroups.map((group, index) => {
            const selected = props.selectedTableGroups.some((selectedGroup) => group.id === selectedGroup.id)
            if(group.id.includes('temp')){
              return (
                <div className="pe-16" key={index}>
                  <EditableTextField 
                    label={(<span>&bull;</span>)}
                    className="min-w-full text-lg border-b-black focus:ring-0 focus:border-transparent focus:border-b-black"
                    text={tableGroupName.current ?? ''} 
                    placeholder="Enter Group Name Here..."
                    onSubmitText={(text) => {
                      tableGroupName.current = text
                      createTableGroup.mutate({
                        name: text,
                        options: {
                          logging: true
                        }
                      })
                    }} 
                    onCancel={() => {
                      const temp = [
                        ...props.tableGroups
                      ].filter((group) => group.id !== 'temp')

                      props.parentUpdateTableGroups(temp)
                    }}
                  />
                </div>
              )
            }
            return (
              <div className="flex flex-col" key={index}>
                <div className="flex flex-row items-center w-full px-4">
                  <span className="text-2xl">&bull;</span>
                  <button 
                    className={`
                      flex flex-row gap-2 items-center w-full mx-1 px-1 justify-between border border-transparent rounded-lg
                    hover:text-gray-500 hover:border-gray-200
                    `}
                    onClick={() => {
                      if(selected){
                        const temp = [
                          ...props.selectedTableGroups
                        ]
                        .map((group) => ({
                          ...group,
                          tables: group.tables.filter((table) => table.id !== 'temp')
                        }))
                        .filter((selectedGroup) => selectedGroup.id !== group.id)

                        const tableGroups = [
                          ...props.tableGroups
                        ]
                        .map((parentGroup) => ({
                          ...parentGroup,
                          tables: parentGroup.id === group.id ? parentGroup.tables.filter((table) => table.id !== 'temp') : parentGroup.tables
                        }))

                        props.parentUpdateSelectedTableGroups(temp)
                        props.parentUpdateTableGroups(tableGroups)
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
                      onClick={() => {
                        const otherAddingTable = props.tableGroups.find((parentGroup) => 
                          parentGroup.tables.some((table) => table.id === 'temp')
                        )
                        
                        const updateGroup = (prev: TableGroup[]) => {
                          let temp: TableGroup[] = [
                            ...prev
                          ]

                          if(!temp.some((parentGroup) => parentGroup.id === group.id)){
                            temp.push(group)
                          }

                          temp = temp
                            .map((parentGroup) => {
                              if(otherAddingTable?.id === parentGroup.id){
                                const mappedGroup: TableGroup = {
                                  ...parentGroup,
                                  tables: parentGroup.tables.filter((table) => table.id !== 'temp')
                                }
                                return mappedGroup
                              }
                              else if(parentGroup.id === group.id) {
                                const newTable: Table = {
                                  id: 'temp',
                                  name: '',
                                  columns: [],
                                  tableGroupId: parentGroup.id
                                }
                                const mappedGroup: TableGroup = {
                                  ...parentGroup,
                                  tables: [...parentGroup.tables, newTable]
                                }

                                return mappedGroup
                              }
                              return parentGroup
                            })

                          return temp
                        }

                        selectedGroupId.current = group.id
                        props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
                        props.parentUpdateTableGroups((prev) => updateGroup(prev))
                      }}
                    >Add Table</Dropdown.Item>
                    <Dropdown.Item>Rename Group</Dropdown.Item>
                    <Dropdown.Item
                      onClick={() => {
                        deleteTableGroup.mutate({
                          id: group.id
                        })
                        props.parentUpdateSelectedTableGroups((prev) => {
                          const temp = [...prev].filter((parent) => parent.id !== group.id)
                          return temp
                        })
                        props.parentUpdateSelectedTableGroups((prev) => {
                          const temp = [...prev].filter((parent) => parent.id !== group.id)
                          return temp
                        })
                      }}
                    >Delete Group</Dropdown.Item>
                  </Dropdown>
                </div>
                {selected && (
                  <ol className="ps-10">
                    {group.tables.map((table, index) => {
                      const tableSelected = table.id === props.selectedTable?.id
                      if(table.id === 'temp') {
                        return (
                          <div className="ps-6 pe-8 py-0.5" key={index}>
                            <EditableTextField
                              label={<li style={{ listStyleType: 'circle' }} className="text-sm -ms-4 -me-2" />}
                              className="min-w-full text-sm border-b-black focus:ring-0 focus:border-transparent focus:border-b-black"
                              text={tableName.current ?? ''}
                              placeholder="Enter Table Name Here..."
                              onSubmitText={(text) => {
                                tableName.current = text
                                selectedGroupId.current = group.id
                                createTable.mutate({
                                  tableGroupId: group.id,
                                  name: text,
                                  options: {
                                    logging: true
                                  }
                                })
                              }}
                              onCancel={() => {
                                const updateGroup = (prev: TableGroup[]) => {
                                  let temp = [
                                    ...prev
                                  ].map((group) => ({
                                      ...group,
                                      tables: group.tables.filter((table) => table.id !== 'temp')
                                    })
                                  )

                                  return temp
                                }

                                props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
                                props.parentUpdateTableGroups((prev) => updateGroup(prev))
                              }}
                            />
                          </div>
                        )
                      }
                      
                      return (
                        <div 
                          key={index}
                          onClick={() => {
                            if(!tableSelected) {
                              props.parentUpdateSelectedTable(table)
                            }
                            else {
                              props.parentUpdateSelectedTable(undefined)
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
                      )
                    })}
                  </ol>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}