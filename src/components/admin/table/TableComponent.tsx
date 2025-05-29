import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import { ColumnColor, Participant, Table, TableColumn, TableGroup, UserData, UserProfile, UserTag } from "../../../types"
import { 
  HiOutlineCalendar, 
  HiOutlineDocumentText, 
  HiOutlineListBullet, 
  HiOutlinePencil, 
  HiOutlinePlusCircle, 
  HiOutlineTag, 
  HiOutlineUserCircle, 
  HiOutlineXCircle 
} from 'react-icons/hi2'
import { Dropdown } from "flowbite-react"
import { useMutation, UseQueryResult } from "@tanstack/react-query"
import { 
  appendTableRowMutation,
  AppendTableRowParams,
  createChoiceMutation,
  CreateChoiceParams,
  createTableColumnMutation, 
  CreateTableColumnParams, 
  deleteTableColumnMutation, 
  DeleteTableColumnParams, 
  deleteTableRowMutation, 
  DeleteTableRowParams, 
  UpdateTableColumnParams, 
  updateTableColumnsMutation 
} from "../../../services/tableService"
import { EditableTextField } from "../../common/EditableTextField"
import { ValueCell } from "./ValueCell"
import { defaultColumnColors, getColumnTypeColor } from "../../../utils"
import { ConfirmationModal } from "../../modals"
import { UserCell } from "./UserCell"
import { DateCell } from "./DateCell"
import { ChoiceCell } from "./ChoiceCell"
import { TagCell } from "./TagCell"
import { FileCell } from "./FileCell"
import { invariant } from "@tanstack/react-router"
import { AggregateCell } from "./AggregateCell"
import { ColorComponent } from "../../common/ColorComponent"

interface TableComponentProps {
  table: Table,
  parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTable: Dispatch<SetStateAction<Table | undefined>>
  parentDeleteColumns: Dispatch<SetStateAction<TableColumn[]>>
  userData: UseQueryResult<UserData[] | undefined, Error>
  tagData: UseQueryResult<UserTag[] | undefined, Error>
  tempUsersData: UseQueryResult<UserProfile[] | undefined, Error>
}

export const TableComponent = (props: TableComponentProps) => {
  const [deleteColumnConfirmation, setDeleteColumnConfirmation] = useState(false)
  const [tempUsers, setTempUsers] = useState<UserProfile[]>([])

  const columnType = useRef<'value' | 'user' | 'date' | 'choice' | 'tag' | 'file' | null>(null)
  const refColumn = useRef<TableColumn | null>()

  const tableRows: [string, 'value' | 'user' | 'date' | 'choice' | 'tag' | 'file', string][][] = []

  if(props.table.columns.length > 0) { 
    for(let i = 0; i < props.table.columns[0].values.length; i++){
      const row: [string, 'value' | 'user' | 'date' | 'choice' | 'tag' | 'file', string][] = []
      for(let j = 0; j < props.table.columns.length; j++){
        row.push([props.table.columns[j].values[i], props.table.columns[j].type, props.table.columns[j].id])
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

  const updateColumn = useMutation({
    mutationFn: (params: UpdateTableColumnParams) => updateTableColumnsMutation(params),
  })

  const appendRow = useMutation({
    mutationFn: (params: AppendTableRowParams) => appendTableRowMutation(params)
  })

  const deleteRow = useMutation({
    mutationFn: (params: DeleteTableRowParams) => deleteTableRowMutation(params)
  })

  const deleteColumn = useMutation({
    mutationFn: (params: DeleteTableColumnParams) => deleteTableColumnMutation(params)
  })

  const createChoice = useMutation({
    mutationFn: (params: CreateChoiceParams) => createChoiceMutation(params),
    onSuccess: (data) => {
      if(data) {
        const temp: Table = {
          ...props.table,
          columns: props.table.columns.map((column) => {
            if(column.id === data[1]){
              return {
                ...column,
                color: column.color?.map((color) => {
                  if(color.id === 'temp') return { ...color, id: data[0] }
                  return color
                })
              }
            }
            return column
          })
        }

        const updateGroup = (prev: TableGroup[]) => {
          const pTemp: TableGroup[] = [...prev]
            .map((group) => {
              if(group.id === temp.tableGroupId) {
                return {
                  ...group,
                  tables: group.tables.map((table) => {
                    if(table.id === temp.id) return temp
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
      }
    }
  })

  useEffect(() => {
    if(props.table.columns.length > 0) {
      let max = 0
      for(let i = 0; i < props.table.columns.length; i++){
        if(props.table.columns[i].values.length > max){
          max = props.table.columns[i].values.length
        }
      }
      if(props.table.columns.some((col) => col.values.length !== max)) {
        appendRow.mutate({
          table: props.table,
          length: max,
          options: {
            logging: true
          }
        })

        const temp: Table = {
          ...props.table,
          columns: props.table.columns.map((col) => {
            const temp = [...col.values]
            while(temp.length < max){
              temp.push('')
            }
            return {
              ...col,
              values: temp,
            }
          })
        }

        const updateGroup = (prev: TableGroup[]) => {
          const pTemp: TableGroup[] = [...prev]
            .map((group) => {
              if(group.id === temp.tableGroupId){
                return {
                  ...group,
                  tables: group.tables.map((table) => {
                    if(table.id === temp.id) return temp
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
      }
    }
  }, [props.table])

  useEffect(() => {
    if(props.tempUsersData.data && props.tempUsersData.data.length > 0) {
      setTempUsers(props.tempUsersData.data)
    }
  }, [props.tempUsersData.data])

  const pushColumn = (type: 'value' | 'user' | 'date' | 'choice' | 'tag' | 'file') => {
    const temp: TableColumn = {
      id: 'temp',
      values: [],
      display: true,
      header: '',
      type: type,
      tags: [],
      order: props.table.columns.length,
      tableId: props.table.id
    }

    columnType.current = type

    const table: Table = {
      ...props.table,
      columns: [...props.table.columns, temp]
    }

    props.parentUpdateTable(table)
  }

  const updateValue = (id: string, text: string, i: number) => {
    const column = props.table.columns.find((column) => column.id === id)

    invariant(column !== undefined)

    updateColumn.mutate({
      column: column,
      values: column.values.map((value, index) => {
        if(index === i) return text
        return value
      }),
      options: {
        logging: true
      }
    })

    const temp: Table = {
      ...props.table,
      columns: props.table.columns.map((column) => {
        if(column.id === id){
          const values = [...column.values]
          values[i] = text
          return {
            ...column,
            values: values
          }
        }
        return column
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

    props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
    props.parentUpdateTableGroups((prev) => updateGroup(prev))
    props.parentUpdateTable(temp)
  }

  const updateChoices = (id: string, data: {choice: string, color: string}, mode: 'create' | 'delete') => {
    const column = props.table.columns.find((column) => column.id === id)
    invariant(column !== undefined)

    if(mode === 'create') {
      createChoice.mutate({
        column: column,
        choice: data.choice,
        color: data.color,
        options: {
          logging: true
        }
      })

      const tempColor: ColumnColor = {
        id: 'temp',
        textColor: defaultColumnColors[data.color].text,
        bgColor: defaultColumnColors[data.color].bg,
        value: data.choice,
        columnId: column.id
      }

      const temp: Table = {
        ...props.table,
        columns: props.table.columns.map((parentColumn) => {
          if(parentColumn.id === column.id) {
            return {
              ...parentColumn,
              choices: [...(parentColumn.choices ?? []), data.choice],
              color: [...(parentColumn.color ?? []), tempColor]
            }
          }
          return parentColumn
        })
      }

      const updateGroup = (prev: TableGroup[]) => {
        const pTemp: TableGroup[] = [...prev]
          .map((group) => {
            if(group.id === temp.tableGroupId) {
              return {
                ...group,
                tables: group.tables.map((table) => {
                  if(table.id === temp.id) return temp
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
    }
  }

  return (
    <>
      <ConfirmationModal
        title="Delete Column"
        body="This action will <b>DELETE</b> this column <b>AND</b> all of its values. This action cannot be undone!"
        denyText="Cancel"
        confirmText="Delete"
        confirmAction={() => {
          if(refColumn.current){
            const column: TableColumn = refColumn.current

            deleteColumn.mutate({
              table: props.table,
              column: column,
              options: {
                logging: true
              }
            })

            const temp: Table = {
              ...props.table,
              columns: props.table.columns.filter((parentColumn) => parentColumn.id !== column.id)
            }

            const updateGroup = (prev: TableGroup[]) => {
              const pTemp: TableGroup[] = [...prev]
                .map((group) => {
                  if(group.id === temp.tableGroupId){
                    return {
                      ...group,
                      tables: group.tables.map((table) => {
                        if(table.id === temp.id) {
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
            props.parentDeleteColumns((prev) => {
              const col = [...prev]
              col.push(column)

              return col
            })
          }
        }}
        onClose={() => setDeleteColumnConfirmation(false)}
        open={deleteColumnConfirmation}
      />
      {/* overflow-x-auto overflow-y-auto */}
      <div className="relative shadow-md overflow-scroll max-w-[60vw] max-h-[85vh]">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 bg-gray-50 sticky">
            <tr>
              {props.table.columns.map((column) => {
                return (
                  <th
                    onMouseEnter={() => {}}
                    key={column.id}
                    className="
                      relative border-x border-x-gray-300 border-b border-b-gray-300 
                      min-w-[150px] max-w-[150px] whitespace-normal break-words place-items-center
                      items-center
                    "
                  >
                    {column.id === 'temp' || column.id.includes('edit') ? (
                      <div className="w-full pe-10">
                        <EditableTextField 
                          className="text-xs border-b-black focus:ring-0 focus:border-transparent focus:border-b-black min-w-full bg-transparent"
                          text={column.header ?? ''}
                          placeholder="Enter Column Name..."
                          onSubmitText={(text) => {
                            if(columnType.current !== null){
                              createColumn.mutate({
                                header: text,
                                tableId: props.table.id,
                                type: columnType.current,
                                values: props.table.columns.length > 0 && props.table.columns[0].values.length > 0 ?
                                  props.table.columns[0].values.fill('') : undefined,
                                order: props.table.columns.length,
                                options: {
                                  logging: true
                                }
                              })
                              const temp: Table = {
                                ...props.table,
                                columns: props.table.columns
                                  .map((column) => {
                                    if(column.id === 'temp') {
                                      return {
                                        ...column,
                                        header: text
                                      }
                                    }
                                    return column
                                  })
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
                            }
                            else if(column.id.includes('edit') && text !== column.header) {
                              updateColumn.mutate({
                                column: {
                                  ...column,
                                  id: column.id.replace('edit', '')
                                },
                                values: column.values,
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
                                    id: parentColumn.id === column.id ? column.id.replace('edit', 'edited') : parentColumn.id.replace('edit', ''),
                                    header: parentColumn.id === column.id ? text : parentColumn.header,
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
                            }
                          }}
                          onCancel={() => {
                            const temp: Table = {
                              ...props.table,
                              columns: props.table.columns
                                .filter((column) => column.id !== 'temp')
                                .map((column) => ({...column, id: column.id.replace('edit', '')}))
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
                          }}
                        />
                      </div>
                    ) : (
                      <Dropdown 
                        className="max-w-[140px]"
                        label={(<span className="hover:underline underline-offset-2">{column.header}</span>)}
                        arrowIcon={false}
                        inline
                      >
                        <div className="w-max flex flex-col">
                          <span className="whitespace-nowrap px-4 border-b pb-0.5 font-semibold text-base">
                            <span>Type:</span>
                            <ColorComponent 
                              customText={' ' + column.type[0].toUpperCase() + column.type.substring(1)} 
                              activeColor={getColumnTypeColor(column.type)}
                            />
                          </span>
                          <Dropdown.Item 
                            className="justify-center"
                            onClick={() => {
                              const temp: Table = {
                                ...props.table,
                                columns: props.table.columns.map((parentColumn) => {
                                  if(parentColumn.id === column.id){
                                    return {
                                      ...parentColumn,
                                      id: 'edit' + column.id
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
                            }}
                          >Rename</Dropdown.Item>
                          <Dropdown.Item 
                            className="justify-center"
                            onClick={() => {
                              refColumn.current = column
                              setDeleteColumnConfirmation(true)
                            }}
                          >Delete</Dropdown.Item>
                        </div>
                      </Dropdown>
                    )}
                  </th>
                )
              })}
              <th
                className="
                  relative px-6 py-3 border-e border-e-gray-300 border-b border-b-gray-300
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
                    <span className="whitespace-nowrap px-4 border-b pb-0.5 text-base">Add a Column</span>
                    <div className="grid grid-cols-2 p-1 gap-x-2">
                      <Dropdown.Item 
                        as='button'
                        className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                        onClick={() => pushColumn('value')}
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
                        onClick={() => pushColumn('user')}
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
                        onClick={() => pushColumn('choice')}
                      >
                        <HiOutlineListBullet size={32} className="bg-blue-500 border-4 border-blue-500 rounded-lg"/>
                        <div className="flex flex-col">
                          <span className="whitespace-nowrap">Choice Column</span>
                          <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column can have different choices to pick.</span>
                        </div>
                      </Dropdown.Item >
                      <Dropdown.Item  
                        as='button'
                        className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                        onClick={() => pushColumn('date')}
                      >
                        <HiOutlineCalendar size={32} className="bg-cyan-400 border-4 border-cyan-400 rounded-lg"/>
                        <div className="flex flex-col">
                          <span className="whitespace-nowrap">Timeslot Column</span>
                          <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column syncs with a participant's timeslot.</span>
                        </div>
                      </Dropdown.Item >
                      <Dropdown.Item  
                        as='button'
                        className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                        onClick={() => pushColumn('file')}
                      >
                        <HiOutlineDocumentText size={32} className="bg-purple-600 border-4 border-purple-600 rounded-lg"/>
                        <div className="flex flex-col">
                          <span className="whitespace-nowrap">File Column</span>
                          <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column holds files uploaded by the user.</span>
                        </div>
                      </Dropdown.Item>
                      <Dropdown.Item  
                        as='button'
                        className="p-1 flex flex-row w-fit gap-1 items-center border-transparent border hover:border-gray-600 hover:bg-gray-100 rounded-lg"
                        onClick={() => pushColumn('tag')}
                      >
                        <HiOutlineTag size={32} className="bg-fuchsia-600 border-4 border-fuchsia-600 rounded-lg"/>
                        <div className="flex flex-col">
                          <span className="whitespace-nowrap">Tag Column</span>
                          <span className="text-xs text-gray-600 font-light italic max-w-[150px] min-w-[150px]">This column syncs with a participant's tags.</span>
                        </div>
                      </Dropdown.Item >
                    </div>
                  </div>
                </Dropdown>
              </th>
            </tr>
          </thead>
          <tbody>
            {tableRows.length > 0 && tableRows.map((row: [string, "value" | "user" | "date" | "choice" | "tag" | "file", string][], i: number) => {
                return (
                  <tr key={i} className="bg-white border-b">
                    {row.map(([v, t, id], j) => {
                      //TODO: continue implementation 'file'
                      switch(t){
                        case 'user': {
                          return (
                            <UserCell
                              key={j}
                              value={v ?? ''}
                              updateValue={(text) => updateValue(id, text, i)}
                              userData={props.userData}
                              table={props.table}
                              rowIndex={i}
                              columnId={id}
                              tagsData={props.tagData}
                              tempUsers={tempUsers}
                              parentUpdateTempUsers={setTempUsers}
                              tempUsersQuery={props.tempUsersData}
                            />
                          )
                        }
                        case 'date': {
                          return (
                            <DateCell
                              key={j}
                              value={v}
                              updateValue={(text) => updateValue(id, text, i)}
                              table={props.table}
                              participants={props.userData.data
                                ?.map((data) => {
                                  if(data.profile?.participant) return data.profile.participant
                                  return [] as Participant[]
                                })
                                .reduce((prev, cur) => {
                                  prev.push(...cur.filter((part) => !prev.some((prevPart) => prevPart.id === part.id)))
                                  return prev
                                }, []) ?? []
                              }
                              rowIndex={i}
                              columnId={id}
                            />
                          )
                        }
                        case 'choice': {
                          return (
                            <ChoiceCell
                              key={j}
                              value={v}
                              updateValue={(text) => updateValue(id, text, i)}
                              column={props.table.columns.find((col) => col.id === id)!}
                              updateParentTable={props.parentUpdateTable}
                              createChoice={(choice, color) => updateChoices(id, {choice: choice, color: color}, "create")}
                            />
                          )
                        }
                        case 'tag': {
                          return (
                            <TagCell
                              key={j}
                              value={v}
                              updateValue={(text) => updateValue(id, text, i)}
                              tags={props.tagData.data ?? []}
                              refetchTags={() => props.tagData.refetch()}
                              table={props.table}
                              columnId={id}
                              rowIndex={i}
                              participants={props.userData.data
                                ?.map((data) => {
                                  if(data.profile?.participant) return data.profile.participant
                                  return [] as Participant[]
                                })
                                .reduce((prev, cur) => {
                                  prev.push(...cur.filter((part) => !prev.some((prevPart) => prevPart.id === part.id)))
                                  return prev
                                }, []) ?? []
                              }
                            />
                          )
                        }
                        case 'file': {
                          return (
                            <FileCell
                              key={j}
                              value={v}
                              updateValue={(text) => {
                                const tempTable: Table = {
                                  ...props.table,
                                  columns: props.table.columns.map((column) => {
                                    if(column.id === id) {
                                      const temp = [...column.values]
                                      temp[i] = text
                                      return {
                                        ...column,
                                        values: temp
                                      }
                                    }
                                    return column
                                  })
                                }

                                const updateGroup = (prev: TableGroup[]) => {
                                  const pTemp: TableGroup[] = [...prev]
                                    .map((group) => {
                                      if(group.id === tempTable.tableGroupId) {
                                        return {
                                          ...group,
                                          tables: group.tables.map((table) => {
                                            if(table.id === tempTable.id) {
                                              return tempTable
                                            }
                                            return table
                                          })
                                        }
                                      }
                                      return group
                                    })

                                  return pTemp
                                }

                                props.parentUpdateTable(tempTable)
                                props.parentUpdateTableGroups((prev) => updateGroup(prev))
                                props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
                              }}
                              column={props.table.columns.find((column) => column.id === id)!}
                              rowIndex={i}
                            />
                          )
                        }
                        default: {
                          return (
                            <ValueCell
                              key={j} 
                              value={v}
                              updateValue={(text) => updateValue(id, text, i)}
                            />
                          )
                        }
                      }
                    })}
                    <td className="flex flex-row items-center justify-center py-3">
                      <button
                        onClick={() => {
                          deleteRow.mutate({
                            table: props.table,
                            rowIndex: i,
                            options: {
                              logging: true
                            }
                          })

                          const temp: Table = {
                            ...props.table,
                            columns: props.table.columns.map((column) => {
                              const mappedColumn: TableColumn = {
                                ...column,
                                values: column.values.reduce((prev, cur, index) => {
                                  if(index === i) return prev
                                  prev.push(cur)
                                  return prev
                                }, [] as string[])
                              }
                              return mappedColumn
                            })
                          }

                          const updateGroup = (prev: TableGroup[]) => {
                            const pTemp: TableGroup[] = [
                              ...prev
                            ].map((parentGroup) => {
                              if(parentGroup.id === props.table.tableGroupId){
                                return {
                                  ...parentGroup,
                                  tables: parentGroup.tables.map((table) => {
                                    if(table.id === temp.id){
                                      return temp
                                    }
                                    return table
                                  })
                                }
                              }
                              return parentGroup
                            })

                            return pTemp
                          }

                          props.parentUpdateTable(temp)
                          props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
                          props.parentUpdateTableGroups((prev) => updateGroup(prev))
                        }}
                      >
                        <HiOutlineXCircle className="text-gray-600 hover:fill-gray-200 hover:text-gray-900" size={26} />
                      </button>
                    </td>
                  </tr>
                )
              })
            }
            {props.table.columns.some((column) => column.type === 'choice') && (
              <tr className="bg-white border-b">
                {props.table.columns.map((col, index) => {
                  if(col.type === 'choice') {
                    return (
                      <AggregateCell
                        key={index}
                        column={col}
                      />
                    )
                  }
                  return (<td key={index} className="text-ellipsis border py-3 px-3 max-w-[150px]" />)
                })}
              </tr>
            )}
            {props.table.columns.length > 0 && (
              <tr className="bg-white w-full">
                <td className="text-ellipsis flex flex-row items-center justify-center w-full p-1 border-x border-b">
                  <button
                    onClick={() => {
                      appendRow.mutate({
                        table: props.table,
                        length: props.table.columns[0].values.length + 1,
                        options: {
                          logging: true
                        }
                      })

                      const temp: Table = {
                        ...props.table,
                        columns: props.table.columns.map((column) => {
                          const values = column.values
                          values.push('')
                          return {
                            ...column,
                            values: values
                          }
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
                    }}
                  >
                    <HiOutlinePlusCircle className="text-gray-600 hover:fill-gray-200 hover:text-gray-900" size={24}/>
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}