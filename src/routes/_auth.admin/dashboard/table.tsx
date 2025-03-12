import { createFileRoute } from '@tanstack/react-router'
import { getAllTableGroupsQueryOptions } from '../../../services/tableService'
import { useState } from 'react'
import { Table, TableGroup } from '../../../types'
import { TableSidePannel } from '../../../components/admin/table/TableSidePannel'
import { TablePannel } from '../../../components/admin/table/TablePannel'

interface ManagementTablesSearchParams {
  table?: string,
}

export const Route = createFileRoute('/_auth/admin/dashboard/table')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): ManagementTablesSearchParams => ({
    table: (search.table as string) || undefined,
  }),
  beforeLoad: ({ search }) => search,
  loader: async ({ context }) => {
    const tableGroups = await context.queryClient.ensureQueryData(getAllTableGroupsQueryOptions())
    let selectedTable: Table | undefined

    tableGroups.forEach((group) => {
      if(!selectedTable) {
        selectedTable = group.tables.find((table) => table.id === context.table)
      }
    })

    return {
      searchTableGroups: tableGroups,
      searchGroup: tableGroups.find((group) => group.id === selectedTable?.tableGroupId),
      searchTable: selectedTable,
    }
  }
})

function RouteComponent() {
  const {
    searchTableGroups,
    searchGroup,
    searchTable,
  } = Route.useLoaderData()
  // const navigate = Route.useNavigate()

  const [tableGroups, setTableGroups] = useState<TableGroup[]>(searchTableGroups)
  const [selectedGroups, setSelectedGroups] = useState<TableGroup[]>(searchGroup ? [searchGroup] : [])
  const [selectedTable, setSelectedTable] = useState<Table | undefined>(searchTable)

  return (
    <>
      <div className='flex flex-row mx-4 gap-4 h-[98vh] my-[1vh]'>
        <TableSidePannel 
          tableGroups={tableGroups} 
          parentUpdateTableGroups={setTableGroups} 
          selectedTableGroups={selectedGroups}
          selectedTable={selectedTable}
          parentUpdateSelectedTableGroups={setSelectedGroups} 
          parentUpdateSelectedTable={setSelectedTable}
        />
        { selectedTable ? (
          <TablePannel
            parentUpdateSelectedTableGroups={setSelectedGroups}
            parentUpdateTableGroups={setTableGroups}
            parentUpdateSelectedTable={setSelectedTable}
            selectedTable={selectedTable}
          />
        ) : (
          <div className="flex flex-col w-full items-center border border-gray-400 gap-2 rounded-2xl p-4">
            <span className='font-light text-2xl italic'>Pick a table or create one to show up here!</span>
          </div>
        )}
      </div>
    </>
  )
}
