import { createFileRoute } from '@tanstack/react-router'
import { TableService } from '../../../services/tableService'
import { useEffect, useState } from 'react'
import { Table, TableGroup } from '../../../types'
import { TableSidePanel } from '../../../components/admin/table/TableSidePanel'
import { TablePanel } from '../../../components/admin/table/TablePanel'
import { useQuery } from '@tanstack/react-query'
import { getAuthUsersQueryOptions, getAllUserTagsQueryOptions, getAllTemporaryUsersQueryOptions } from '../../../services/userService'
import { V6Client } from '@aws-amplify/api-graphql'
import { Schema } from '../../../../amplify/data/resource'
import { PhotoPathService } from '../../../services/photoPathService'
import { TimeslotService } from '../../../services/timeslotService'

interface ManagementTablesSearchParams {
  table?: string,
}

export const Route = createFileRoute('/_auth/admin/dashboard/table')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): ManagementTablesSearchParams => ({
    table: (search.table as string) || undefined,
  }),
  beforeLoad: ({ search }) => search,
  loader: ({ context }) => {
    const client = context.client as V6Client<Schema>

    return {
      PhotoPathService: new PhotoPathService(client),
      TableService: new TableService(client),
      TimeslotService: new TimeslotService(client),
      searchTable: context.table,
    }
  }
})

function RouteComponent() {
  const {
    PhotoPathService,
    TableService,
    TimeslotService,
    searchTable,
  } = Route.useLoaderData()
  const [tableGroups, setTableGroups] = useState<TableGroup[]>([])
  const [selectedGroups, setSelectedGroups] = useState<TableGroup[]>([])
  const [selectedTable, setSelectedTable] = useState<Table | undefined>()

  const tableGroupsQuery = useQuery(TableService.getAllTableGroupsQueryOptions({ metrics: true }))

  const usersQuery = useQuery(getAuthUsersQueryOptions(undefined, { siProfiles: true, logging: true, metric: true }))
  
  const tagsQuery = useQuery(getAllUserTagsQueryOptions({ siCollections: true, siTimeslots: false }))

  const tempUsersQuery = useQuery(getAllTemporaryUsersQueryOptions({ siTags: true }))

  useEffect(() => {
    if(tableGroupsQuery.data && tableGroupsQuery.data.length > 0) {
      setTableGroups(tableGroupsQuery.data)
      if(searchTable) {
        const foundGroup = tableGroupsQuery.data.find((group) => group.tables.some((table) => searchTable === table.id))
        const foundTable = foundGroup?.tables.find((table) => table.id === searchTable)
        setSelectedGroups(foundGroup ? [foundGroup] : [])
        setSelectedTable(foundTable)
      }
    }
  }, [tableGroupsQuery.data])

  return (
    <>
      <div className='flex flex-row mx-4 gap-4 h-[98vh] my-[1vh]'>
        <TableSidePanel 
          TableService={TableService}
          tableGroups={tableGroups}
          tableGroupsQuery={tableGroupsQuery}
          parentUpdateTableGroups={setTableGroups} 
          selectedTableGroups={selectedGroups}
          selectedTable={selectedTable}
          parentUpdateSelectedTableGroups={setSelectedGroups} 
          parentUpdateSelectedTable={setSelectedTable}
        />
        { selectedTable ? (
          <TablePanel
            TableService={TableService}
            TimeslotService={TimeslotService}
            PhotoPathService={PhotoPathService}
            parentUpdateSelectedTableGroups={setSelectedGroups}
            parentUpdateTableGroups={setTableGroups}
            parentUpdateSelectedTable={setSelectedTable}
            selectedTable={selectedTable}
            tagsQuery={tagsQuery}
            usersQuery={usersQuery}
            tempUsersQuery={tempUsersQuery}
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
