import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { Table, TableColumn, TableGroup, UserData, UserProfile, UserTag } from "../../../types"
import { useMutation, useQuery, UseQueryResult } from "@tanstack/react-query"
import { deleteTableMutation, DeleteTableParams, getTableQueryOptions, updateTableMutation, UpdateTableParams } from "../../../services/tableService"
import { EditableTextField } from "../../common/EditableTextField"
import { textInputTheme } from "../../../utils"
import { Dropdown, TextInput } from "flowbite-react"
import { HiOutlineCog6Tooth } from "react-icons/hi2"
import { TableComponent } from "./TableComponent"
import Loading from "../../common/Loading"

interface TablePanelProps {
  parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  selectedTable: Table
  parentUpdateSelectedTable: Dispatch<SetStateAction<Table | undefined>>
  tagsQuery: UseQueryResult<UserTag[] | undefined, Error>
  usersQuery: UseQueryResult<UserData[] | undefined, Error>
  tempUsersQuery: UseQueryResult<UserProfile[] | undefined, Error>
}

//TODO: fix row deletion
export const TablePanel = (props: TablePanelProps) => {
  const [searchText, setSearchText] = useState('')
  const [tableColumns, setTableColumns] = useState<TableColumn[]>([])

  const table = useQuery(getTableQueryOptions(props.selectedTable.id, { siUserTags: true, logging: true }))

  useEffect(() => {
    if(table.data?.columns) {
      setTableColumns(table.data.columns)
    }
    else {
      setTableColumns(props.selectedTable.columns)
    }
  }, [
    table.data, 
    props.selectedTable.columns
  ])

  console.log(tableColumns)
  
  const updateTable = useMutation({
      mutationFn: (params: UpdateTableParams) => updateTableMutation(params)
    })
  
  const deleteTable = useMutation({
    mutationFn: (params: DeleteTableParams) => deleteTableMutation(params)
  })

  return (
    <>
      <div className="flex flex-col w-full items-center border border-gray-400 rounded-2xl p-4">
          { table.isPending ? (
            <div className="flex flex-row">
              Loading<Loading />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 w-full">
                {props.selectedTable.temporary ? (
                  <span className="text-gray-500 italic text-lg">Finish entering table name to create</span>
                ) : (
                  <EditableTextField 
                    label={(<span>{'Table: '}</span>)}
                    text={props.selectedTable.name}
                    onSubmitText={(text) => {
                      if(text !== "" && text !== props.selectedTable.name) {
                        updateTable.mutate({
                          table: props.selectedTable,
                          name: text,
                          options: {
                            logging: true
                          }
                        })
                        
                        const updateGroups = (prev: TableGroup[]) => {
                          const temp = [...prev].map((group) => {
                            if(group.id === props.selectedTable.tableGroupId){
                              const mappedGroup: TableGroup = {
                                ...group,
                                tables: group.tables.map((table) => {
                                  if(table.id === props.selectedTable.id){
                                    return {
                                      ...table,
                                      name: text
                                    }
                                  }
                                  return table
                                })
                              }

                              return mappedGroup
                            }

                            return group
                          })

                          return temp
                        }

                        props.parentUpdateTableGroups((prev) => updateGroups(prev))
                        props.parentUpdateSelectedTableGroups((prev) => updateGroups(prev))
                        props.parentUpdateSelectedTable({
                          ...props.selectedTable,
                          name: text,
                          edit: false
                        })
                      }
                    }}
                    editting={false}
                  />
                )}
                
                <TextInput 
                  theme={textInputTheme} 
                  sizing="sm" 
                  className="w-full max-w-[400px] place-self-center" 
                  placeholder="Search"
                  onChange={(event) => {
                    setSearchText(event.target.value)
                  }}
                  value={searchText}
                />
                <div className="flex flex-row items-center place-self-end h-full">
                  <Dropdown 
                    dismissOnClick={false} 
                    label={(<HiOutlineCog6Tooth size={24} className="hover:text-gray-600"/>)} 
                    inline 
                    arrowIcon={false}
                  >
                    <Dropdown.Item
                      onClick={() => {
                        deleteTable.mutate({
                          table: props.selectedTable,
                          options: {
                            logging: true
                          }
                        })

                        const updateGroup = (prev: TableGroup[]) => {
                          const temp = [...prev]
                            .map((group) => {
                              if(group.id === props.selectedTable.tableGroupId) {
                                return {
                                  ...group,
                                  tables: group.tables.filter((table) => table.id !== props.selectedTable.id)
                                }
                              }
                              return group
                            })
                            return temp
                        }

                        props.parentUpdateSelectedTable(undefined)
                        props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
                        props.parentUpdateTableGroups((prev) => updateGroup(prev))
                      }}
                    >Delete Table</Dropdown.Item>
                  </Dropdown>
                </div>
              </div>
              <div className="w-full border border-gray-200 my-2"></div>
              <TableComponent 
                table={{
                  ...props.selectedTable,
                  columns: tableColumns,
                }}
                parentUpdateTable={props.parentUpdateSelectedTable}
                parentUpdateSelectedTableGroups={props.parentUpdateSelectedTableGroups}
                parentUpdateTableGroups={props.parentUpdateTableGroups}
                parentUpdateTableColumns={setTableColumns}
                userData={props.usersQuery}
                tagData={props.tagsQuery}
                tempUsersData={props.tempUsersQuery}
              />
            </>
          )}
      </div>
    </>
  )
}