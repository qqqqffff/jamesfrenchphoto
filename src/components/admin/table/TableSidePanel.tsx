import { useMutation, UseQueryResult } from "@tanstack/react-query"
import { HiOutlineChevronRight, HiOutlinePlusCircle } from "react-icons/hi2"
import { TableService, CreateTableGroupParams, CreateTableParams, DeleteTableGroupParams, UpdateTableGroupParams, ReorderTableGroupParams } from "../../../services/tableService"
import { Table, TableGroup } from "../../../types"
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import { HiOutlineMinusCircle } from "react-icons/hi"
import { ConfirmationModal } from "../../modals"
import Loading from "../../common/Loading"
import { v4 } from 'uuid'
import { TableList } from "./TableList"
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { isTableGroupData, isTableListData } from "./TableListData"
import { tableItemOnDrop } from "../../../functions/tableFunctions"

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

export const TableSidePanel = (props: TableSidePanelParams) => {
  const selectedGroupId = useRef<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState(false)

  useEffect(() => {
    return monitorForElements({
      canMonitor({ source }) {
        return isTableListData(source.data) || isTableGroupData(source.data)
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

        tableItemOnDrop({
          sourceData: sourceData,
          targetData: targetData,
          tableGroups: props.tableGroups,
          selectedTable: props.selectedTable,
          mutations: {
            parentUpdateSelectedTable: props.parentUpdateSelectedTable,
            parentUpdateTableGroups: props.parentUpdateTableGroups,
            parentUpdateSelectedTableGroups: props.parentUpdateSelectedTableGroups,
            reorderTables: reorderTables,
          }
        })
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
                <TableList 
                  key={index} 
                  tableGroup={group}
                  tableGroups={props.tableGroups}
                  selectedTableGroups={props.selectedTableGroups}
                  tableGroupSelected={selected}
                  tableSelected={props.selectedTable?.id}
                  selectedGroupId={selectedGroupId}
                  parentUpdateSelectedTable={props.parentUpdateSelectedTable}
                  parentUpdateSelectedTableGroups={props.parentUpdateSelectedTableGroups}
                  parentUpdateTableGroups={props.parentUpdateTableGroups}
                  setDeleteConfirmation={setDeleteConfirmation}
                  createTable={createTable}
                  createTableGroup={createTableGroup}
                  updateTableGroup={updateTableGroup}
                />
              )
            })
          )}
          </div>
        )}
      </div>
    </>
  )
}