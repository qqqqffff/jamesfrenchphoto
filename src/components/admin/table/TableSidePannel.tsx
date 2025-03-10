import { useMutation } from "@tanstack/react-query"
import { HiOutlinePlusCircle } from "react-icons/hi2"
import { createTableGroupMutation, CreateTableGroupParams, createTableMutation, CreateTableParams, deleteTableGroupMutation, DeleteTableGroupParams, deleteTableMutation, DeleteTableParams, updateTableGroupMutation, UpdateTableGroupParams, updateTableMutation, UpdateTableParams } from "../../../services/tableService"
import { Table, TableGroup } from "../../../types"
import { Dispatch, SetStateAction, useState } from "react"

interface TableSidePannelParams {
  tableGroups: TableGroup[],
  parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  selectedTableGroups: TableGroup[],
  parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>,
  selectedTable?: Table,
  parentUpdateSelectedTable: Dispatch<SetStateAction<Table | undefined>> 
}

export const TableSidePannel = (props: TableSidePannelParams) => {
  const [tableGroupName, setTableGroupName] = useState<string>()
  const [tableName, setTableName] = useState<string>()
  const [selectedGroupId, setSelectedGroupId] = useState<string>()

  const createTableGroup = useMutation({
    mutationFn: (params: CreateTableGroupParams) => createTableGroupMutation(params),
    onSuccess: (data) => {
      if(data){
        props.parentUpdateTableGroups((prev) => prev.map((group) => {
          if(group.id === 'temp'){
            return {
              ...group,
              id: data,
            }
          }
          return group
        }))
        setTableGroupName('')
      }
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
      if(data && tableName && selectedGroupId) {
        props.parentUpdateTableGroups((prev) => prev.map((group) => {
          if(group.id === selectedGroupId){
            const mappedTable: Table = {
              id: data,
              name: tableName,
              tableGroupId: group.id,
              columns: []
            }
            return {
              ...group,
              tables: [...group.tables, mappedTable]
            }
          }
          return group
        }))
        props.parentUpdateSelectedTable((prev) => {
          if(prev?.id === 'temp'){
            return {
              ...prev,
              id: data
            }
          }
          else {
            return {
              id: data,
              name: tableName,
              tableGroupId: selectedGroupId,
              columns: []
            }
          }
        })
        setTableName('')
      }
    }
  })

  const updateTable = useMutation({
    mutationFn: (params: UpdateTableParams) => updateTableMutation(params)
  })

  const deleteTable = useMutation({
    mutationFn: (params: DeleteTableParams) => deleteTableMutation(params)
  })


  return (
    <>
      <div className="flex flex-col items-center border border-gray-400 gap-2 rounded-2xl p-4 max-w-[400px] min-w-[400px]">
        <div className="flex flex-row items-center w-full justify-between px-4 border-b pb-4 border-b-gray-400">
          <span className="text-2xl text-start">Tables</span>
          <button>
            <HiOutlinePlusCircle size={24}/>
          </button>
        </div>
        <div className="flex flex-col w-full gap-2">
          {props.tableGroups.map((group) => {
            return (
              <div>{group.name}</div>
            )
          })}
        </div>
      </div>
    </>
  )
}