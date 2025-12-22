import { createFileRoute } from '@tanstack/react-router'
import { TableService } from '../../../services/tableService'
import { useEffect, useState } from 'react'
import { Table, TableGroup, UserData, UserProfile, Notification } from '../../../types'
import { TableSidePanel } from '../../../components/admin/table/TableSidePanel'
import { TablePanel } from '../../../components/admin/table/TablePanel'
import { useQuery } from '@tanstack/react-query'
import { UserService } from '../../../services/userService'
import { V6Client } from '@aws-amplify/api-graphql'
import { Schema } from '../../../../amplify/data/resource'
import { PhotoPathService } from '../../../services/photoPathService'
import { TimeslotService } from '../../../services/timeslotService'
import { TagService } from '../../../services/tagService'
import { NotificationService } from '../../../services/notificationService'

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
      UserService: new UserService(client),
      TagService: new TagService(client),
      NotificationService: new NotificationService(client),
      searchTable: context.table,
    }
  }
})

function RouteComponent() {
  const {
    PhotoPathService,
    TableService,
    TimeslotService,
    UserService,
    TagService,
    NotificationService,
    searchTable,
  } = Route.useLoaderData()
  const [tableGroups, setTableGroups] = useState<TableGroup[]>([])
  const [selectedGroups, setSelectedGroups] = useState<TableGroup[]>([])
  const [selectedTable, setSelectedTable] = useState<Table | undefined>()
  const [tempUsers, setTempUsers] = useState<UserProfile[]>([])
  const [users, setUsers] = useState<UserData[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [sidePanelExpanded, setSidePanelExpanded] = useState(true)

  const tableGroupsQuery = useQuery(TableService.getAllTableGroupsQueryOptions({ metrics: true }))

  const usersQuery = useQuery(UserService.getAuthUsersQueryOptions(undefined, { siProfiles: true, logging: true, metric: true }))
  
  const tagsQuery = useQuery(TagService.getAllUserTagsQueryOptions({ siCollections: true, siTimeslots: false }))

  const tempUsersQuery = useQuery(UserService.getAllTemporaryUsersQueryOptions({ siTags: true }))

  const notificationsQuery = useQuery(NotificationService.getAllNotificationsQueryOptions({ logging: true }))

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

  useEffect(() => {
    if(notificationsQuery.data) {
      setNotifications(notificationsQuery.data)
    }
  }, [notificationsQuery.data])

  useEffect(() => {
    if(tempUsersQuery.data) {
      setTempUsers(tempUsersQuery.data)
    }
  }, [tempUsersQuery.data])

  useEffect(() => {
    if(usersQuery.data) { 
      setUsers(usersQuery.data)
    }
  }, [usersQuery.data])

  return (
    <>
      <div className='flex flex-row mx-4 gap-4 h-[98vh] my-[1vh]'>
        <TableSidePanel 
          TableService={TableService}
          tableGroups={tableGroups}
          tableGroupsQuery={tableGroupsQuery}
          sidePanelExpanded={sidePanelExpanded}
          setSidePanelExpanded={setSidePanelExpanded}
          parentUpdateTableGroups={setTableGroups} 
          selectedTableGroups={selectedGroups}
          selectedTable={selectedTable}
          parentUpdateSelectedTableGroups={setSelectedGroups} 
          parentUpdateSelectedTable={setSelectedTable}
        />
        { selectedTable ? (
          <TablePanel
            UserService={UserService}
            TableService={TableService}
            TimeslotService={TimeslotService}
            PhotoPathService={PhotoPathService}
            NotificationService={NotificationService}
            selectedTable={selectedTable}
            tempUsers={tempUsers}
            users={users}
            notifications={notifications}
            sidePanelExpanded={sidePanelExpanded}
            setTempUsers={setTempUsers}
            setUsers={setUsers}
            setNotifications={setNotifications}
            parentUpdateSelectedTableGroups={setSelectedGroups}
            parentUpdateTableGroups={setTableGroups}
            parentUpdateSelectedTable={setSelectedTable}
            tagsQuery={tagsQuery}
            usersQuery={usersQuery}
            tempUsersQuery={tempUsersQuery}
            notificationsQuery={notificationsQuery}
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
