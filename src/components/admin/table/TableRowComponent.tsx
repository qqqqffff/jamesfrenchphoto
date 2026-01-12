import { Button, Dropdown, Tooltip } from "flowbite-react"
import { HiOutlineDotsHorizontal } from "react-icons/hi"
import { Notification, Participant, Table, TableColumn, TableGroup, Timeslot, UserData, UserProfile, UserTag } from "../../../types"
import { ChoiceCell } from "./ChoiceCell"
import { DateCell } from "./DateCell"
import { FileCell } from "./FileCell"
import { TagCell } from "./TagCell"
import { ValueCell } from "./ValueCell"
import { AdminRegisterTimeslotMutationParams, TimeslotService } from "../../../services/timeslotService"
import { useMutation, UseMutationResult, UseQueryResult } from "@tanstack/react-query"
import { Dispatch, HTMLAttributes, SetStateAction, useEffect, useRef, useState } from "react"
import { UpdateTableColumnParams, CreateChoiceParams, TableService, DeleteTableRowParams, UpdateChoiceParams, DeleteChoiceParams } from "../../../services/tableService"
import { v4 } from 'uuid'
import { 
  CreateParticipantParams, 
  LinkParticipantMutationParams, 
  LinkUserMutationParams, 
  UpdateParticipantMutationParams, 
  UpdateUserAttributesMutationParams, 
  UpdateUserProfileParams, 
  UserService, 
  SendUserInviteEmailParams, 
  UnlinkUserRowMutationParams 
} from "../../../services/userService"
import { PhotoPathService } from "../../../services/photoPathService"
import {
  attachClosestEdge,
  type Edge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import invariant from 'tiny-invariant';
import { getTableRowData, isTableRowData } from "./TableRowData"
import { createPortal } from "react-dom"
import { LinkUserModal, ParticipantFieldLinks, UserFieldLinks } from "../../modals/LinkUser"
import { LinkParticipantModal } from "../../modals/LinkParticipant"
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";
import { NotificationCell } from "./NotificationCell"
import { NotificationService } from "../../../services/notificationService"
import { generateTableLinks, possibleLinkDetection, processTableLinks, rowLinkParticipantAvailable, rowUnlinkAvailable, tableParticipantDetection, tableUserDetection, updateChoices } from "../../../functions/tableFunctions"
import { CgSpinner } from "react-icons/cg"
import { TablePanelNotification } from "./TablePanel"
import { formatParticipantName } from "../../../functions/clientFunctions"
import { UserPanel } from "../../common/UserPanel"

interface TableRowComponentProps {
  TimeslotService: TimeslotService,
  UserService: UserService,
  TableService: TableService,
  PhotoPathService: PhotoPathService,
  NotificationService: NotificationService

  row: [string, TableColumn['type'], string][]
  i: number
  table: Table

  search: string,
  selectedTag: UserTag | undefined,
  selectedDate: Date
  baseLink: string
  refRow: React.MutableRefObject<number>

  users: UserData[],
  tempUsers: UserProfile[],
  notifications: Notification[]  
  
  allTableTimeslotsQuery: UseQueryResult<Timeslot | null, Error>[]
  timeslotsQuery: UseQueryResult<Timeslot[], Error>
  tagTimeslotQuery: UseQueryResult<Timeslot[], Error>
  tagData: UseQueryResult<UserTag[] | undefined, Error>
  userData: UseQueryResult<UserData[] | undefined, Error>
  tempUsersData: UseQueryResult<UserProfile[] | undefined, Error>
  notificationData: UseQueryResult<Notification[], Error>

  updateColumn: UseMutationResult<void, Error, UpdateTableColumnParams, unknown>
  deleteRow: UseMutationResult<void, Error, DeleteTableRowParams, unknown>
  createChoice: UseMutationResult<void, Error, CreateChoiceParams, unknown>
  updateChoice: UseMutationResult<void, Error, UpdateChoiceParams, unknown>
  deleteChoice: UseMutationResult<void, Error, DeleteChoiceParams, unknown>
  updateUserAttribute: UseMutationResult<unknown, Error, UpdateUserAttributesMutationParams, unknown>
  updateUserProfile: UseMutationResult<void, Error, UpdateUserProfileParams, unknown>
  updateParticipant: UseMutationResult<void, Error, UpdateParticipantMutationParams, unknown>
  createParticipant: UseMutationResult<void, Error, CreateParticipantParams, unknown>
  adminRegisterTimeslot: UseMutationResult<Timeslot | null, Error, AdminRegisterTimeslotMutationParams, unknown>

  setTempUsers: Dispatch<SetStateAction<UserProfile[]>>
  setUsers: Dispatch<SetStateAction<UserData[]>>
  setNotifications: Dispatch<SetStateAction<Notification[]>>
  setTableNotification: Dispatch<SetStateAction<TablePanelNotification[]>>

  setSelectedDate: Dispatch<SetStateAction<Date>>
  setSelectedTag: Dispatch<SetStateAction<UserTag | undefined>>

  setCreateUser: Dispatch<SetStateAction<boolean>>
  
  parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>
  parentUpdateTable: Dispatch<SetStateAction<Table | undefined>>
  parentUpdateTableColumns: Dispatch<SetStateAction<TableColumn[]>>
}

type TableRowState = 
  | {
      type: 'idle';
    }
  | {
      type: 'preview';
      container: HTMLElement;
    }
  | {
      type: 'is-dragging';
    }
  | {
      type: 'is-dragging-over';
      closestEdge: Edge | null;
    };

const stateStyles: { [Key in TableRowState['type']]?: HTMLAttributes<HTMLDivElement>['className'] } = {
  'is-dragging': 'opacity-40',
};

const idle: TableRowState = { type: 'idle' };

export const TableRowComponent = (props: TableRowComponentProps) => {
  const ref = useRef<HTMLTableRowElement | null>(null)
  const [rowState, setRowState] = useState<TableRowState>(idle)
  const [allowDragging, setAllowDragging] = useState(false)
  const [linkedUserFields, setLinkedUserFields] = useState<UserFieldLinks>()
  const [linkedParticipantFields, setLinkedParticipantFields] = useState<ParticipantFieldLinks[]>([])
  const [linkUserVisible, setLinkUserVisible] = useState(false)
  const [linkParticipantVisible, setLinkParticipantVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    invariant(element)
    return combine(
      draggable({
        element,
        getInitialData() {
          return getTableRowData(props.i)
        },
        canDrag: () => allowDragging,
        onGenerateDragPreview({ nativeSetDragImage }) {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: pointerOutsideOfPreview({
              x: '16px',
              y: '8px'
            }),
            render({ container }) {
              setRowState({ type: 'preview', container })
            }
          })
        },
        onDragStart() {
          setRowState({ type: 'is-dragging' })
        },
        onDrop() {
          setRowState(idle)
          setAllowDragging(false)
        }
      }),
      dropTargetForElements({
        element,
        canDrop({ source }) {
          if(source.element === element) {
            return false
          }
          return isTableRowData(source.data)
        },
        getData({ input }) {
          const data = getTableRowData(props.i)
          return attachClosestEdge(data, {
            element,
            input,
            allowedEdges: ['top', 'bottom']
          })
        },
        getIsSticky() {
          return true;
        },
        onDragEnter({ self }) {
          const closestEdge = extractClosestEdge(self.data)
          setRowState({ type: 'is-dragging-over', closestEdge })
        },
        onDrag({ self }) {
          const closestEdge = extractClosestEdge(self.data)

          setRowState((current) => {
            if(current.type === 'is-dragging-over' && current.closestEdge === closestEdge) {
              return current
            }
            return { type: 'is-dragging-over', closestEdge}
          })
        },
        onDragLeave() {
          setRowState(idle)
        },
        onDrop() {
          setRowState(idle)
        }
      })
    )
  }, [props.row, allowDragging])

  const updateValue = (id: string, text: string, i: number, skipLinks?: boolean) => {
    const column = props.table.columns.find((column) => column.id === id)

    if(!column) {
      //TODO: handle error
      return
    }

    if(!skipLinks) {
      processTableLinks(
        column,
        text,
        i,
        props.tempUsers,
        props.users,
        linkedUserFields,
        linkedParticipantFields,
        {
          updateUserProfile: props.updateUserProfile,
          updateParticipant: props.updateParticipant,
          setTableNotifications: props.setTableNotification,
          setTempUsers: props.setTempUsers,
          setUsers: props.setUsers
        }
      )
    }
    

    props.updateColumn.mutate({
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
    props.parentUpdateTableColumns(temp.columns)
  }

  const updateTableChoices = (
    id: string, 
    data: { choice: string, color: string, customColor?: [string, string], id?: string }, 
    mode: 'create' | 'delete' | 'update'
  ) => updateChoices({
    table: props.table,
    id: id,
    data: data,
    mode: mode,
    mutations: {
      createChoice: props.createChoice,
      updateChoice: props.updateChoice,
      deleteChoice: props.deleteChoice,
      setTableNotification: props.setTableNotification,
      parentUpdateSelectedTableGroups: props.parentUpdateSelectedTableGroups,
      parentUpdateTable: props.parentUpdateTable,
      parentUpdateTableColumns: props.parentUpdateTableColumns,
      parentUpdateTableGroups: props.parentUpdateTableGroups
    }
  })

  //user means that the user has been created and columns have been linked
  //temp means that invite user has been called and columns have been linked
  //potential means that a potential user can be created
  //unlinked means that a user exists but the columns have not been linked
  //false means none of the above are applicable
  
  const userDetection = tableUserDetection(props.table, props.row, props.i, props.tempUsers, props.users)

  const participantDetection: Participant[] = tableParticipantDetection(props.table, props.i, props.tempUsers, props.users)

  //can only link to temp, user, or unlinked (user must exist to link a participant)
  const linkParticipantAvailable = rowLinkParticipantAvailable(
    userDetection, 
    props.row, 
    props.table, 
    props.i, 
    {
      tags: props.tagData.data ?? [],
      timeslots: props.allTableTimeslotsQuery.map((query) => query.data).filter((timeslot) => timeslot !== undefined && timeslot !== null),
      notifications: props.notifications
    }
  )

  const detectedUser = [
    ...props.users.flatMap((data) => data.profile).filter((profile) => profile !== undefined),
    ...props.tempUsers
  ].find((profile) => profile.email === userDetection[1])

  useEffect(() => {
    const linkResult = generateTableLinks(
      userDetection,
      participantDetection,
      props.table,
      props.i,
      linkedParticipantFields,
      linkedUserFields,
    )
    
    setLinkedParticipantFields(prev => 
      JSON.stringify(prev) !== JSON.stringify(linkResult[1]) ? linkResult[1] : prev
    )
    setLinkedUserFields(prev => 
      JSON.stringify(prev) !== JSON.stringify(linkResult[0]) ? linkResult[0] : prev
    )
  }, [
    userDetection,
    participantDetection,
    linkedParticipantFields,  
    linkedUserFields,  
    props.table, 
    props.i
  ])

  const linkUser = useMutation({
    mutationFn: (params: LinkUserMutationParams) => props.UserService.linkUserMutation(params),
    onSuccess: (data) => {
      if(data.columns.length > 0) {
        const notificationId = v4()
        const updateGroup = (prev: TableGroup[]): TableGroup[] => prev.map((group) => group.tables.some((table) => table.id === data.columns[0].tableId) ? ({
          ...group,
          tables: group.tables.map((table) => table.id === data.columns[0].tableId ? ({
            ...table,
            columns: data.columns
          }) : table)
        }) : group)

        props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
        props.parentUpdateTableGroups((prev) => updateGroup(prev))
        props.parentUpdateTable((prev) => prev !== undefined ? ({
          ...prev,
          columns: data.columns
        }) : prev)
        props.parentUpdateTableColumns(data.columns)
        props.setTableNotification(prev => [...prev, {
          id: notificationId,
          message: `Successfully linked user: ${data.user.email}`,
          createdAt: new Date(),
          status: 'Success' as 'Success',
          autoClose: setTimeout(() => props.setTableNotification(prev => prev.filter((notification) => notification.id !== notificationId)), 5000)
        }])
      }
      else {
        props.setTableNotification(prev => [...prev, {
          id: v4(),
          message: 'Failed to link user.',
          createdAt: new Date(),
          status: 'Error',
          autoClose: null
        }])
      }
    },
    onError: () => {
      props.setTableNotification(prev => [...prev, {
        id: v4(),
        message: 'Failed to link user.',
        createdAt: new Date(),
        status: 'Error',
        autoClose: null
      }])
    }
  })

  const linkParticipant = useMutation({
    mutationFn: (params: LinkParticipantMutationParams) => props.UserService.linkParticipantMutation(params),
    onSuccess: (data) => {
      if(data.columns.length > 0) {
        const notificationId = v4()
        const updateGroup = (prev: TableGroup[]): TableGroup[] => prev.map((group) => group.tables.some((table) => table.id === data.columns[0].tableId) ? ({
          ...group,
          tables: group.tables.map((table) => table.id === data.columns[0].tableId ? ({
            ...table,
            columns: data.columns
          }) : table)
        }) : group)

        props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
        props.parentUpdateTableGroups((prev) => updateGroup(prev))
        props.parentUpdateTable((prev) => prev !== undefined ? ({
          ...prev,
          columns: data.columns
        }) : prev)
        props.parentUpdateTableColumns(data.columns)
        props.setTableNotification(prev => [...prev, {
          id: notificationId,
          message: `Successfully linked participant: ${formatParticipantName(data.participant)}`,
          createdAt: new Date(),
          status: 'Success' as 'Success',
          autoClose: setTimeout(() => props.setTableNotification(prev => prev.filter((notification) => notification.id !== notificationId)), 5000)
        }])
      }
      else {
        props.setTableNotification(prev => [...prev, {
          id: v4(),
          message: 'Failed to link participant.',
          createdAt: new Date(),
          status: 'Error',
          autoClose: null
        }])
      }
    },
    onError: () => {
      props.setTableNotification(prev => [...prev, {
        id: v4(),
        message: 'Failed to link participant.',
        createdAt: new Date(),
        status: 'Error',
        autoClose: null
      }])
    }
  })

  const unlinkUserRow = useMutation({
    mutationFn: (params: UnlinkUserRowMutationParams) => props.UserService.unlinkUserRowMutation(params),
    onSuccess: (data) => {
      if(data.columns.length > 0) {
        const notificationId = v4()

        const updateGroup = (prev: TableGroup[]): TableGroup[] => prev.map((group) => group.tables.some((table) => table.id === data.columns[0].tableId) ? ({
          ...group,
          tables: group.tables.map((table) => table.id === data.columns[0].tableId ? ({
            ...table,
            columns: data.columns
          }) : table)
        }) : group)

        props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
        props.parentUpdateTableGroups((prev) => updateGroup(prev))
        props.parentUpdateTable((prev) => prev !== undefined ? ({
          ...prev,
          columns: data.columns
        }) : prev)
        props.parentUpdateTableColumns(data.columns)
        setLinkedParticipantFields([])
        setLinkedUserFields(undefined)
        props.setTableNotification(prev => [...prev, {
          id: notificationId,
          message: `Successfully unlinked user: ${data.user.email}`,
          createdAt: new Date(),
          status: 'Success' as 'Success',
          autoClose: setTimeout(() => props.setTableNotification(prev => prev.filter((notification) => notification.id !== notificationId)), 5000)
        }])
      }
      else {
        props.setTableNotification(prev => [...prev, {
          id: v4(),
          message: 'Failed to unlink user.',
          createdAt: new Date(),
          status: 'Error',
          autoClose: null
        }])
      }
    },
    onError: () => {
      props.setTableNotification(prev => [...prev, {
        id: v4(),
        message: 'Failed to unlink user.',
        createdAt: new Date(),
        status: 'Error',
        autoClose: null
      }])
    }
  })

  const sendInviteEmail = useMutation({
    mutationFn: (params: SendUserInviteEmailParams) => props.UserService.sendUserInviteEmail(params),
    onSuccess: (data) => {
      if(data.success) {
        const notificationId = v4()
        props.setTableNotification(prev => [...prev, {
          id: notificationId,
          message: `Successfully sent invite to user: ${data.email}`,
          createdAt: new Date(),
          status: 'Success' as 'Success',
          autoClose: setTimeout(() => props.setTableNotification(prev => prev.filter((notification) => notification.id !== notificationId)), 5000)
        }])
      } else {
        props.setTableNotification(prev => [...prev, {
          id: v4(),
          message: 'Failed to invite user.',
          createdAt: new Date(),
          status: 'Error',
          autoClose: null
        }])
      }
    },
    onError: () => {
      props.setTableNotification(prev => [...prev, {
        id: v4(),
        message: 'Failed to invite user.',
        createdAt: new Date(),
        status: 'Error',
        autoClose: null
      }])
    }
  })

  const unlinkAvailable = rowUnlinkAvailable(linkedParticipantFields, linkedUserFields, props.table.columns)
  const linkAvailable = !unlinkAvailable && detectedUser !== undefined && (
    (() => {
        const linkDetection = possibleLinkDetection(detectedUser, props.i, props.table.columns)
        return rowUnlinkAvailable(linkDetection.participantLinks, linkDetection.userLinks, props.table.columns)
      })
    )

  return (
    <>
      {userDetection[0] === 'unlinked' && detectedUser !== undefined && (
        <LinkUserModal 
          UserService={props.UserService}
          TimeslotService={props.TimeslotService}
          open={linkUserVisible}
          onClose={() => setLinkUserVisible(false)}
          userProfile={{
            ...detectedUser,
            temp: props.tempUsers.some((temp) => temp.email === detectedUser.email)
          }}
          notifications={props.notifications}
          rowIndex={props.i}
          tags={props.tagData}
          linkUser={linkUser}
          tableColumns={props.table.columns.filter((column) => {
            const choice = (column.choices ?? [])?.[props.i]
            return choice === undefined || choice === null || (!choice.includes('userEmail') && !choice.includes('participantId'))
          })}
        />
      )}
      {linkParticipantAvailable !== undefined && (
        <LinkParticipantModal
          UserService={props.UserService}
          TimeslotService={props.TimeslotService}
          open={linkParticipantVisible}
          onClose={() => setLinkParticipantVisible(false)}
          participant={linkParticipantAvailable}
          rowIndex={props.i}
          tags={props.tagData}
          tableColumns={props.table.columns.filter((column) => {
            const choice = (column.choices ?? [])?.[props.i]
            return choice === undefined || (!choice.includes('userEmail') && !choice.includes('participantId'))
          })}
          linkParticipant={linkParticipant}
          notifications={props.notifications}
        />
      )}
      {rowState.type === 'is-dragging-over' && rowState.closestEdge === 'top' && (
        <tr className="h-2">
          {props.row.map((_, index) => {
            return (
              <td className="bg-blue-700" key={index} />
            )
          })}
        </tr>
      )}
      <tr className={`bg-white ${stateStyles[rowState.type]}`} ref={ref}>
        {props.row.map(([v, t, id], j) => {
          switch(t){
            case 'date': {
              return (
                <DateCell
                  key={j}
                  value={v}
                  search={props.search}
                  TimeslotService={props.TimeslotService}
                  //TODO: timeslot ids should be mutually exclusive -> need to convert cells from being an array of values to be its own dynamo for now will leave as is and avoid double registrations
                  updateValue={(text, skipLinks) => updateValue(id, text, props.i, skipLinks)}
                  table={props.table}
                  linkedParticipantId={(() => {
                    const foundColumn = props.table.columns.find((col) => col.id === id)
                    if(!foundColumn) return undefined
                    const foundParticipantChoice = (foundColumn.choices?.[props.i] ?? '')

                    if(foundParticipantChoice !== '') {
                      const searchString = foundParticipantChoice.substring(foundParticipantChoice.indexOf(':') + 1)
                      if(
                        !props.users.flatMap((data) => data.profile?.participant).filter((participant) => participant !== undefined).some((participant) => participant.id === searchString) &&
                        !props.tempUsers.flatMap((data) => data.participant).some((participant) => participant.id === searchString)
                      ) return undefined
                      return searchString
                    }
                  })()}
                  timeslotsQuery={props.selectedTag !== undefined ? props.tagTimeslotQuery : props.timeslotsQuery}
                  tagsQuery={props.tagData}
                  userData={{
                    users: props.users.map((user) => user.profile).filter((profile) => profile !== undefined),
                    tempUsers: props.tempUsers
                  }}
                  registerTimeslot={props.adminRegisterTimeslot}
                  setUsers={props.setUsers}
                  setTempUsers={props.setTempUsers}
                  usersQuery={props.userData}
                  tempUsersQuery={props.tempUsersData}
                  selectedDate={props.selectedDate}
                  updateDateSelection={props.setSelectedDate}
                  updateTagSelection={props.setSelectedTag}
                  rowIndex={props.i}
                  columnId={id}
                />
              )
            }
            case 'choice': {
              return (
                <ChoiceCell
                  key={j}
                  value={v}
                  selectedSearch={props.search !== '' && v.toLowerCase().includes(props.search.toLowerCase())}
                  rowIndex={props.i}
                  updateValue={(text) => updateValue(id, text, props.i)}
                  column={props.table.columns.find((col) => col.id === id)!}
                  modifyChoice={(choice, color, action, customColor, colorId) => updateTableChoices(id, { choice: choice, color: color, customColor: customColor, id: colorId }, action,)}
                />
              )
            }
            case 'tag': {
              return (
                <TagCell
                  UserService={props.UserService}
                  key={j}
                  value={v}
                  search={props.search}
                  updateValue={(text) => updateValue(id, text, props.i)}
                  tags={props.tagData}
                  table={props.table}
                  columnId={id}
                  rowIndex={props.i}
                  linkedParticipantId={(() => {
                    const foundColumn = props.table.columns.find((col) => col.id === id)
                    if(!foundColumn) return undefined
                    const foundParticipantChoice = (foundColumn.choices?.[props.i] ?? '')

                    if(foundParticipantChoice !== '') {
                      const searchString = foundParticipantChoice.substring(foundParticipantChoice.indexOf(':') + 1)
                      if(
                        !props.users.flatMap((data) => data.profile?.participant).filter((participant) => participant !== undefined).some((participant) => participant.id === searchString) &&
                        !props.tempUsers.flatMap((data) => data.participant).some((participant) => participant.id === searchString)
                      ) return undefined
                      return searchString
                    }
                  })()}
                  userData={{
                    users: props.users.map((user) => user.profile).filter((profile) => profile !== undefined),
                    tempUsers: props.tempUsers
                  }}
                  usersQuery={props.userData}
                  tempUsersQuery={props.tempUsersData}
                  updateParticipant={(userTags, participantId, userEmail, tempUser) => {
                    if(tempUser) {
                      props.setTempUsers((prev) => prev.map((profile) => {
                        return profile.email === userEmail ? ({
                          ...profile,
                          particiant: profile.participant
                            .map((participant) => (participant.id === participantId ? ({
                              ...participant,
                              userTags: userTags
                            }) : participant))
                        }) : profile
                      }))
                    }
                    else {
                      props.setUsers((prev) => prev.map((data) => {
                        return ({
                          ...data,
                          profile: data.profile && data.profile.email === userEmail ? ({
                            ...data.profile,
                            particiant: data.profile.participant
                              .map((participant) => (participant.id === participantId ? ({
                                ...participant,
                                userTags: userTags
                              }) : participant))
                          }) : data.profile 
                        })
                      }))
                    }
                  }}
                />
              )
            }
            case 'notification': {
              return (
                <NotificationCell
                  key={j}
                  value={v}
                  search={props.search}
                  rowIndex={props.i}
                  NotificationService={props.NotificationService}
                  notifications={props.notifications}
                  setTableNotification={props.setTableNotification}
                  setNotifications={props.setNotifications}
                  updateValue={(value) => updateValue(id, value, props.i)}
                  linkedParticipantId={(() => {
                    const foundColumn = props.table.columns.find((col) => col.id === id)
                    if(!foundColumn) return undefined
                    const foundParticipantChoice = (foundColumn.choices?.[props.i] ?? '')

                    if(foundParticipantChoice !== '') {
                      const searchString = foundParticipantChoice.substring(foundParticipantChoice.indexOf(':') + 1)
                      if(
                        !props.users.flatMap((data) => data.profile?.participant).filter((participant) => participant !== undefined).some((participant) => participant.id === searchString) &&
                        !props.tempUsers.flatMap((data) => data.participant).some((participant) => participant.id === searchString)
                      ) return undefined
                      return searchString
                    }
                  })()}
                  userData={{
                    users: props.users.map((user) => user.profile).filter((profile) => profile !== undefined),
                    tempUsers: props.tempUsers
                  }}
                  usersQuery={props.userData}
                  tempUsersQuery={props.tempUsersData}
                  notificationQuery={props.notificationData}
                />
              )
            }
            case 'file': {
              return (
                <FileCell
                  TableService={props.TableService}
                  PhotoPathService={props.PhotoPathService}
                  key={j}
                  value={v}
                  search={props.search}
                  updateValue={(text) => {
                    const tempTable: Table = {
                      ...props.table,
                      columns: props.table.columns.map((column) => {
                        if(column.id === id) {
                          const temp = [...column.values]
                          temp[props.i] = text
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
                    props.parentUpdateTableColumns(tempTable.columns)
                  }}
                  column={props.table.columns.find((column) => column.id === id)!}
                  rowIndex={props.i}
                />
              )
            }
            default: {
              return (
                <ValueCell
                  key={j} 
                  value={v}
                  selectedSearch={props.search !== '' && v.toLowerCase().includes(props.search.toLowerCase())}
                  rowIndex={props.i}
                  updateValue={(text) => updateValue(id, text, props.i)}
                  column={props.table.columns.find((column) => column.id === id)!}
                  participantFieldLinks={linkedParticipantFields}
                  userFieldLinks={linkedUserFields}
                />
              )
            }
          }
        })}
        <td 
          className={`
            flex flex-row items-center justify-center py-3 
            ${stateStyles[rowState.type] ?? ''} pe-3
          `}
          onMouseEnter={() => setAllowDragging(true)}
          onMouseLeave={() => setAllowDragging(false)}
        >
          {/* TODO: put linked user icon with dropdown to view details */}
          {/* TODO: implement revoke for temp users */}
          {(linkAvailable !== unlinkAvailable) && detectedUser !== undefined && (
            <Tooltip
              placement="bottom"
              style="light"
              content={(<span className="whitespace-nowrap text-xs italic">{linkAvailable ? "Link User: " : "Unlink User: "}{detectedUser.email}</span>)}
            >
              <Button
                disabled={linkUser.isPending || unlinkUserRow.isPending}
                color=""
                className="
                  enabled:text-black enabled:hover:text-gray-400 enabled:hover:cursor-pointer p-0 
                  disabled:text-gray-500 disabled:hover:cursor-not-allowed
                "
                onClick={() => {
                  if(linkAvailable) {
                    const links = possibleLinkDetection(detectedUser, props.i, props.table.columns)
                    linkUser.mutate({
                      tableColumns: props.table.columns,
                      rowIndex: props.i,
                      userProfile: detectedUser,
                      participantFieldLinks: links.participantLinks,
                      userFieldLinks: links.userLinks,
                      availableTags: props.tagData.data ?? [],
                      options: {
                        logging: true
                      }
                    })
                  }
                  else if(unlinkAvailable) {
                    unlinkUserRow.mutate({
                      tableColumns: props.table.columns,
                      rowIndex: props.i,
                      userProfile: detectedUser,
                      options:{
                        logging: true
                      }
                    })
                  }
                }}
              >
                {linkUser.isPending || unlinkUserRow.isPending ? (
                  <CgSpinner className="animate-spin" size={20} />
                ) : (
                  linkAvailable ? (
                    <HiOutlineLockOpen 
                      size={20} 
                    />
                  ) : (
                    <HiOutlineLockClosed
                      size={20}
                    />
                  )
                )}
              </Button>
            </Tooltip>
          )}
          <Dropdown
            label={(<HiOutlineDotsHorizontal className="text-black hover:text-gray-400 hover:cursor-pointer" size={26} />)}
            inline
            className=""
            arrowIcon={false}
            placement="bottom-end"
            dismissOnClick={false}
          >
            {detectedUser && (
              <Dropdown.Item 
                as='div'
                className="flex flex-row justify-center"
              >
                <Dropdown
                  label='View User Info'
                  placement="left-start"
                  arrowIcon={false}
                  inline
                  dismissOnClick={false}
                >
                  <UserPanel 
                    userProfile={detectedUser}
                    userType={userDetection}
                  />
                </Dropdown>
              </Dropdown.Item>
            )}
            {userDetection[0] === 'potential' && (
              <Dropdown.Item
                className="whitespace-nowrap flex flex-row justify-center w-full"
                onClick={() => {
                  props.setCreateUser(true)
                  props.refRow.current = props.i
                }}
              >Create User</Dropdown.Item>
            )}
            {linkParticipantAvailable !== undefined && (
              <Dropdown.Item
                className="whitespace-nowrap flex flex-row justify-center w-full"
                onClick={() => setLinkParticipantVisible(true)}
              >Link Participant</Dropdown.Item>
            )}
            {userDetection[0] === 'unlinked' && detectedUser !== undefined && (
              <Dropdown.Item
                className="whitespace-nowrap flex flex-row justify-center w-full"
                onClick={() => setLinkUserVisible(true)}
              >Link User</Dropdown.Item>
            )}
            {(userDetection[0] === 'temp' || props.tempUsers.some((user) => user.email === userDetection[1])) && detectedUser && (
              <>
                <Dropdown.Item 
                  className="whitespace-nowrap flex flex-row justify-center w-full"
                  onClick={() => {
                    sendInviteEmail.mutate({
                      profile: detectedUser,
                      baseLink: props.baseLink,
                      options: {
                        logging: true
                      }
                    })
                  }}
                >Send Invite</Dropdown.Item>
                {detectedUser.temporary !== undefined && (
                  <Dropdown.Item  
                    className="whitespace-nowrap flex flex-row justify-center w-full"
                    onClick={() => {
                      const notificationId = v4()
                      navigator.clipboard.writeText(props.baseLink + `?token=${detectedUser.temporary}`)
                      props.setTableNotification((prev) => [...prev, {
                        id: notificationId,
                        message: 'Link copied successfully',
                        status: 'Success',
                        createdAt: new Date(),
                        autoClose: setTimeout(() => props.setTableNotification(prev => prev.filter((notification) => notification.id !== notificationId)))
                      }])
                    }}
                  >Copy Invite Link
                  </Dropdown.Item>
                )}
              </>
            )}
            <Dropdown.Item 
              className="whitespace-nowrap flex flex-row justify-center w-full"
              onClick={() => {
                props.deleteRow.mutate({
                  table: props.table,
                  rowIndex: props.i,
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
                        if(index === props.i) return prev
                        prev.push(cur)
                        return prev
                      }, [] as string[]),
                      choices: (column.choices ?? []).reduce((prev, cur, index) => {
                        if(index === props.i) return prev
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
                props.parentUpdateTableColumns(temp.columns)
              }}
            >Delete Row</Dropdown.Item>
          </Dropdown>
        </td>
        {rowState.type === 'preview' && createPortal(
          <DragPreview 
            index={props.i} 
            columns={props.table.columns.sort((a, b) => a.order - b.order)} 
            tags={props.tagData.data ?? []}
          />, rowState.container
        )}
      </tr>
      {rowState.type === 'is-dragging-over' && rowState.closestEdge === 'bottom' && (
        <tr className="h-2">
          {props.row.map((_, index) => {
            return (
              <td className="bg-blue-700" key={index} />
            )
          })}
        </tr>
      )}
    </>
  )
}

function DragPreview({ index, columns, tags } : { index: number, columns: TableColumn[], tags: UserTag[]}) {
  const formattedRow: Map<TableColumn, string> = new Map()

  for(let i = 0; i < columns.length; i++) {
    if(i > 6) break;
    formattedRow.set(columns[i], columns[i].values[index] ?? '')
  }
  
  return (
    <table>
      <tbody>
        <tr className="bg-white border-b">
          {Array.from(formattedRow.entries()).map((entry, i) => {
            let displayValue = entry[1]
            if(entry[0].type === 'tag') {
              displayValue = tags.find((tag) => tag.id === entry[1])?.name ?? ''
            }
            return (
              <td className='text-ellipsis border py-3 px-3 w-[150px]' key={i}>
                <span className={`
                  font-thin p-0 text-sm border-transparent ring-transparent w-full 
                  border-b-gray-400 border py-0.5 ${entry[0].type === 'tag' ? `text-${tags.find((tag) => tag.id === entry[1])?.color ?? 'black'}`: ''}
                `}>{displayValue === '' ? 'Enter Value...' : displayValue}</span>
              </td>
            )
          })}
        </tr>
      </tbody>
    </table>
  )
}