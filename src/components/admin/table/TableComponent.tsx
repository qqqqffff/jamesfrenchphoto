import { Dispatch, SetStateAction, useRef } from "react"
import { Table, TableColumn, TableGroup } from "../../../types"
import { HiOutlineCalendar, HiOutlineListBullet, HiOutlinePencil, HiOutlinePlusCircle, HiOutlineUserCircle } from 'react-icons/hi2'
import { Dropdown } from "flowbite-react"
import { useMutation } from "@tanstack/react-query"
import { createTableColumnMutation, CreateTableColumnParams } from "../../../services/tableService"
import { EditableTextField } from "../../common/EditableTextField"

interface TableComponentProps {
  table: Table,
  parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTable: Dispatch<SetStateAction<Table | undefined>>
}

export const TableComponent = (props: TableComponentProps) => {
  const columnType = useRef<'value' | 'user' | 'date' | 'choice' | 'tag' | 'file' | null>(null)

  const tableRows: [string, 'value' | 'user' | 'date' | 'choice' | 'tag' | 'file'][][] = []

  if(props.table.columns.length > 0) { 
    for(let i = 0; i < props.table.columns[0].values.length; i++){
      const row: [string, 'value' | 'user' | 'date' | 'choice' | 'tag' | 'file'][] = []
      for(let j = 0; j < props.table.columns.length; j++){
        row.push([props.table.columns[i].values[j], props.table.columns[i].type])
      }
      tableRows.push(row)
    }
  }

  const createColumn = useMutation({
    mutationFn: (params: CreateTableColumnParams) => createTableColumnMutation(params),
    onSuccess: (data) => {
      if(data){
        const temp: Table = {
          ...props.table,
          columns: props.table.columns.map((column) => {
            if(column.id === 'temp'){
              return {
                ...column,
                id: data
              }
            }
            return column
          })
        }
        
        const updateGroups = (prev: TableGroup[]) => {
          const temp = [...prev]
            .map((group) => {
              if(group.id === props.table.tableGroupId){
                return {
                  ...group,
                  tables: group.tables.map((table) => {
                    if(table.id === props.table.id){
                      return {
                        ...table,
                        columns: table.columns.map((column) => {
                          if(column.id === 'temp'){
                            return {
                              ...column,
                              id: data
                            }
                          }
                          return column
                        })
                      }
                    }
                    return table
                  })
                }
              }
              return group
            })

          return temp
        }

        props.parentUpdateSelectedTableGroups((prev) => updateGroups(prev))
        props.parentUpdateTableGroups((prev) => updateGroups(prev))
        props.parentUpdateTable(temp)
      }
    }

  })


  return (
    // overflow-x-auto overflow-y-auto
    <div className="relative  shadow-md">
      <table className="w-full text-sm text-left text-gray-600">
        <thead className="text-xs text-gray-700 bg-gray-50 sticky">
          <tr>
            {props.table.columns.map((column) => {
              return (
                <th
                  onMouseEnter={() => {}}
                  key={column.id}
                  className="
                    relative px-6 py-3 border-x border-x-gray-300 border-b border-b-gray-300 
                    min-w-[150px] max-w-[150px] whitespace-normal overflow-hidden break-words text-center 
                    items-center uppercase
                  "
                >
                  {column.id === 'temp' || column.id.includes('edit') ? (
                    <EditableTextField 
                      className="text-sm w-full border-b-black focus:ring-0 focus:border-transparent focus:border-b-black"
                      text={column.header ?? ''}
                      placeholder="Enter Column Name..."
                      onSubmitText={(text) => {
                        if(columnType.current !== null){
                          //TODO: improve logic and finish implementing me
                          createColumn.mutate({
                            header: text,
                            tableId: props.table.id,
                            type: columnType.current,
                            options: {
                              logging: true
                            }
                          })
                        }
                      }}
                      onCancel={() => {
                        const temp: Table = {
                          ...props.table,
                          columns: props.table.columns
                            .filter((column) => column.id === 'temp')
                            .map((column) => ({...column, id: column.id.replace('edit', '')}))
                        }

                        const updateGroup = (prev: TableGroup[]) => {
                          const pTemp = [...prev]
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
                      }}
                    />
                  ) : (
                    <button 
                      className="hover:underline underline-offset-2 max-w-[140px]"
                      onClick={() => {}}
                    >
                      {column.header}
                    </button>
                  )}
                </th>
              )
            })}
            <th
              className="
                relative px-6 py-3 border-x border-x-gray-300 border-b border-b-gray-300
                min-w-[50px] max-w-[50px] whitespace-normal break-words text-center
                items-center flex flex-row justify-center
              "
            >
              <Dropdown
                inline
                arrowIcon={false}
                label={(<HiOutlinePlusCircle className="text-gray-600 hover:fill-gray-200 hover:text-gray-900" size={24}/>)}
              >
                <div className="w-max">
                  <span className="whitespace-nowrap px-4 border-b pb-0.5">Add a Column</span>
                  <div className="grid grid-cols-2 p-1 gap-x-2">
                    <Dropdown.Item 
                      as='button'
                      className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                      onClick={() => {
                        const temp: TableColumn = {
                          id: 'temp',
                          values: [],
                          display: true,
                          header: '',
                          type: 'value',
                          tags: [],
                          tableId: props.table.id
                        }

                        columnType.current = 'value'

                        props.parentUpdateTable({
                          ...props.table,
                          columns: [...props.table.columns, temp]
                        })
                      }}
                    >
                      <HiOutlinePencil size={32} className="bg-orange-400 border-4 border-orange-400 rounded-lg"/>
                      <div className="flex flex-col">
                        <span className="whitespace-nowrap">Value Column</span>
                        <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column holds simple values</span>
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Item 
                      as='button'
                      className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <HiOutlineUserCircle size={32} className="bg-red-500 border-4 border-red-500 rounded-lg"/>
                      <div className="flex flex-col">
                        <span className="whitespace-nowrap">User Column</span>
                        <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column syncs with user's emails.</span>
                      </div>
                    </Dropdown.Item>
                    <Dropdown.Item  
                      as='button'
                      className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <HiOutlineCalendar size={32} className="bg-sky-400 border-4 border-sky-400 rounded-lg"/>
                      <div className="flex flex-col">
                        <span className="whitespace-nowrap">Date Column</span>
                        <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column auto formats dates.</span>
                      </div>
                    </Dropdown.Item >
                    <Dropdown.Item  
                      as='button'
                      className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <HiOutlineListBullet size={32} className="bg-cyan-400 border-4 border-cyan-400 rounded-lg"/>
                      <div className="flex flex-col">
                        <span className="whitespace-nowrap">Choice Column</span>
                        <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column has multiple expected values to choose from.</span>
                      </div>
                    </Dropdown.Item >
                    <Dropdown.Item  
                      as='button'
                      className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <HiOutlineUserCircle size={32} className="bg-fuchsia-600 border-4 border-fuchsia-600 rounded-lg"/>
                      <div className="flex flex-col">
                        <span className="whitespace-nowrap">Tag Column</span>
                        <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column syncs with tags.</span>
                      </div>
                    </Dropdown.Item >
                    <Dropdown.Item  
                      as='button'
                      className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      <HiOutlineUserCircle size={32} className="bg-purple-600 border-4 border-purple-600 rounded-lg"/>
                      <div className="flex flex-col">
                        <span className="whitespace-nowrap">File Column</span>
                        <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column holds files.</span>
                      </div>
                    </Dropdown.Item>
                  </div>
                </div>
              </Dropdown>
            </th>
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row, i) => {
            return (
              <tr key={i} className="bg-white border-b">
                {row.map(([v, t], j) => {
                  //TODO: column type mapping 'value' | 'user' | 'date' | 'choice' | 'tag' | 'file'
                  switch(t){
                    // case 'user': {

                    // }
                    // case 'date': {

                    // }
                    // case 'choice': {

                    // }
                    // case 'tag': {

                    // }
                    // case 'file': {

                    // }
                    default: {
                      return (
                        <td className="text-ellipsis px-6 py-4 border" key={j}>
                          {v}
                        </td>
                      )
                    }
                  }
                })}
              </tr>
            )
          })}
          {tableRows.length > 0 && (
            <tr className="bg-white border-b">
              <td className="text-ellipsis px-6 py-4 border">
                <button className="">
                  <HiOutlinePlusCircle className="text-gray-600 hover:fill-gray-200 hover:text-gray-900" size={24}/>
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}