import { Dropdown } from "flowbite-react"
import { HiOutlineDotsHorizontal } from "react-icons/hi"
import { ColumnColor, Participant, Table, TableColumn, TableGroup, Timeslot, UserData, UserProfile, UserTag } from "../../../types"
import { ChoiceCell } from "./ChoiceCell"
import { DateCell } from "./DateCell"
import { FileCell } from "./FileCell"
import { TagCell } from "./TagCell"
import { ValueCell } from "./ValueCell"
import { TimeslotService } from "../../../services/timeslotService"
import { validateMapField } from "../../../functions/tableFunctions"
import { UseMutationResult, UseQueryResult } from "@tanstack/react-query"
import { Dispatch, HTMLAttributes, SetStateAction, useEffect, useRef, useState } from "react"
import { defaultColumnColors } from "../../../utils"
import { UpdateTableColumnParams, CreateChoiceParams, TableService, DeleteTableRowParams } from "../../../services/tableService"
import { v4 } from 'uuid'
import { CreateParticipantParams, UpdateParticipantMutationParams, UpdateUserAttributesMutationParams, UpdateUserProfileParams, UserService } from "../../../services/userService"
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
import validator from 'validator'
import { HiOutlineUserCircle } from "react-icons/hi2";
import { ParticipantPanel } from "../../common/ParticipantPanel"
import { LinkUserModal } from "../../modals/LinkUser"

interface TableRowComponentProps {
  TimeslotService: TimeslotService,
  UserService: UserService,
  TableService: TableService
  PhotoPathService: PhotoPathService
  row: [string, TableColumn['type'], string][]
  i: number
  table: Table
  users: UserData[],
  tempUsers: UserProfile[],
  selectedTag: UserTag | undefined,
  selectedDate: Date
  refRow: React.MutableRefObject<number>
  timeslotsQuery: UseQueryResult<Timeslot[], Error>
  tagTimeslotQuery: UseQueryResult<Timeslot[], Error>
  tagData: UseQueryResult<UserTag[] | undefined, Error>
  userData: UseQueryResult<UserData[] | undefined, Error>
  tempUsersData: UseQueryResult<UserProfile[] | undefined, Error>
  updateColumn: UseMutationResult<void, Error, UpdateTableColumnParams, unknown>
  deleteRow: UseMutationResult<void, Error, DeleteTableRowParams, unknown>
  createChoice: UseMutationResult<[string, string] | undefined, Error, CreateChoiceParams, unknown>
  updateUserAttribute: UseMutationResult<unknown, Error, UpdateUserAttributesMutationParams, unknown>
  updateUserProfile: UseMutationResult<void, Error, UpdateUserProfileParams, unknown>
  updateParticipant: UseMutationResult<void, Error, UpdateParticipantMutationParams, unknown>
  createParticipant: UseMutationResult<void, Error, CreateParticipantParams, unknown>
  setTempUsers: Dispatch<SetStateAction<UserProfile[]>>
  setUsers: Dispatch<SetStateAction<UserData[]>>
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
  const [linkedUserFields, setLinkedUserFields] = useState<{
    email: [string, string],
    first: [boolean, string],
    last: [boolean, string],
    sitting: [boolean, string],
  } | undefined>()
  const [linkedParticipantFields, setLinkedParticipantFields] = useState<{
    id: string
    first: [boolean, string], 
    last: [boolean, string],
    middle: [boolean, string] | null,
    preferred: [boolean, string] | null,
    email: [boolean, string] | null,
    tags: [boolean, string] | null,
  }[]>([])
  const [linkUserVisible, setLinkUserVisible] = useState(false)

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

  const updateValue = (id: string, text: string, i: number) => {
    const column = props.table.columns.find((column) => column.id === id)
    let newValue: string | undefined

    if(!column) {
      //TODO: handle error
      return
    }

    const updatedColumns: TableColumn[] = []
    if(
      column.type === 'value' && 
      column.choices?.[0] !== undefined && 
      props.table.columns.some((col) => column.choices?.[0] === col.id) &&
      column.choices?.[1] !== undefined &&
      validateMapField(column.choices[1])[0] !== null
    ) {
      const foundColumn = props.table.columns.find((col) => col.id === column.choices?.[0])

      if(!foundColumn){
        //TODO: handle error
        return
      } 
    }

    props.updateColumn.mutate({
      column: column,
      values: column.values.map((value, index) => {
        if(index === i) return newValue ? newValue : text
        return value
      }),
      options: {
        logging: true
      }
    })

    const temp: Table = {
      ...props.table,
      columns: props.table.columns.map((column) => {
        const updatedColumn = updatedColumns.find((col) => col.id === column.id)
        if(updatedColumn) return updatedColumn
        else if(column.id === id){
          const values = [...column.values]
          values[i] = newValue ? newValue : text
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

  const updateChoices = (id: string, data: {choice: string, color: string}, mode: 'create' | 'delete') => {
    const column = props.table.columns.find((column) => column.id === id)
    
    if(!column){
      //TODO: handle error
      return
    } 

    if(mode === 'create') {
      const tempColor: ColumnColor = {
        id: v4(),
        textColor: defaultColumnColors[data.color].text,
        bgColor: defaultColumnColors[data.color].bg,
        value: data.choice,
        columnId: column.id,
      }

      props.createChoice.mutate({
        column: column,
        colorId: tempColor.id,
        choice: data.choice,
        color: data.color,
        options: {
          logging: true
        }
      })

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
      props.parentUpdateTableColumns(temp.columns)
    }
  }

  //overriding means that what is from the database gets put into the columns
  //update means that the database gets updated from whats in the table
  //method field 2 is the column id
  //linking structure uses the choice array with the indexed value being a comma delimitted string of the following format:
  //participantId:--id--,field or userEmail:--email--,field
  //with field being any of the potentially mappable 
  const linkUser = (userProfile: UserProfile, method: ['override' | 'update', string]) => {

  }
  //added create method for participant -> creates new participant
  const linkParticipant = (participant: Participant, method: ['override' | 'update' | 'create', string]) => {

  }

  //user means that the user has been created and columns have been linked
  //temp means that invite user has been called and columns have been linked
  //potential means that a potential user can be created
  //unlinked means that a user exists but the columns have not been linked
  //false means none of the above are applicable
  /* finding participant code
  const choice = ((column.choices ?? [])?.[props.i] ?? '')
  const foundParticipant = choice.includes('participantId:')
  const endIndex = choice.indexOf(',') === -1 ? choice.length : choice.indexOf(',')
  if(foundParticipant) {
    const participantId = choice.substring(choice.indexOf(':') + 1, endIndex)
    return [
      ...props.users.flatMap((user) => user.profile?.participant).filter((participant) => participant !== undefined),
      ...props.tempUsers.flatMap((user) => user.participant)
    ].some((participant) => participant.id === participantId)
  }
  */
  const userDetection: ['user' | 'temp' | 'potential' | 'unlinked' | 'false', string] = (() => {
    //determine if the row already has a link
    for(let i = 0; i < props.table.columns.length; i++) {
      const choice = ((props.table.columns[i].choices ?? [])?.[props.i] ?? '')
        
      const foundUser = choice.includes('userEmail:')
      const endIndex = choice.indexOf(',') === -1 ? choice.length : choice.indexOf(',')
      if(foundUser) {
        const userEmail = choice.substring(choice.indexOf(':') + 1, endIndex)
        const foundTemp = props.tempUsers.find((user) => user.email === userEmail)
        if(foundTemp) {
          return ['temp', foundTemp.email]
        }
        const foundUser = props.users.find((user) => user.email === userEmail)
        if(foundUser) {
          return ['user', foundUser.email]
        }
      }
    }
    for(let i = 0; i < props.row.length; i++) {
      const foundColumn = props.table.columns.find((column) => column.id == props.row[i][2])
      if(!foundColumn) continue
      const normalHeader = foundColumn.header.toLocaleLowerCase()
      const normalizedValue = props.row[i][0].toLocaleLowerCase()
      if(
        validator.isEmail(normalizedValue) && 
        !normalHeader.includes('participant') &&
        !normalHeader.includes('duchess') &&
        !normalHeader.includes('deb') &&
        !normalHeader.includes('escort')
      ) {
        //comparision check against normalized values but return visual value for display purposes
        if(
          props.users.some((user) => user.email.toLocaleLowerCase() === normalizedValue) ||
          props.tempUsers.some((temp) => temp.email.toLocaleLowerCase() === normalizedValue)
        ) {
          return ['unlinked', props.row[i][0]]
        }
        return ['potential', props.row[i][0]]
      }
    }
    return ['false', '']
  })()
  const participantDetection: Participant[] = (() => {
    const participants: Participant[] = []
    for(let i = 0; i < props.table.columns.length; i++) {
      const column = props.table.columns[i]
      const choice = ((column.choices ?? [])?.[props.i] ?? '')
      const participantMapping = choice.includes('participantId:')
      const endIndex = choice.indexOf(',') === -1 ? choice.length : choice.indexOf(',')
      if(participantMapping) {
        const participantId = choice.substring(choice.indexOf(':') + 1, endIndex)
        const foundParticipant = [
          ...props.users.flatMap((user) => user.profile?.participant).filter((participant) => participant !== undefined),
          ...props.tempUsers.flatMap((user) => user.participant)
        ].find((participant) => participant.id === participantId)
        if(foundParticipant && !participants.some((participant) => participant.id === foundParticipant.id)) {
          participants.push(foundParticipant)
        }
      }
    }
    return participants
  })()

  //can only link to temp, user, or unlinked (user must exist to link a participant)
  const linkParticipantAvailable: Participant | undefined = (() => {
    if(
      (
        userDetection[0] === 'temp' || 
        userDetection[0] === 'unlinked' ||
        userDetection[0] === 'user'
      ) &&
      validator.isEmail(userDetection[1])
    ) {
      let foundFirst: string | undefined = undefined
      let foundLast: string | undefined = undefined
      let foundMiddle: string | undefined = undefined
      let foundPreferred: string | undefined = undefined
      let foundEmail: string | undefined = undefined
      let foundTags: UserTag[] = []
      //TODO: implement found timeslot

      for(let i = 0; i < props.row.length; i++) {
        const foundColumn = props.table.columns.find((column) => column.id == props.row[i][2])
        //below means that the column's field already has a mapped participant
        if(
          !foundColumn || 
          ((foundColumn.choices ?? [])?.[props.i] ?? '').includes('participantId:')
        ) continue
        const normalHeader = foundColumn.header.toLocaleLowerCase()
        if(
          foundColumn.type === 'value' &&
          (
            normalHeader.includes('participant') || 
            normalHeader.includes('duchess') || 
            normalHeader.includes('deb') || 
            normalHeader.includes('escort') 
          )
        ) {
          if(
            normalHeader.includes('first') &&
            props.row[i][0] !== ''
          ) {
            foundFirst = props.row[i][0]
          }
          else if(
            normalHeader.includes('last') &&
            props.row[i][0] !== ''
          ) {
            foundLast = props.row[i][0]
          }
          else if(
            normalHeader.includes('middle') &&
            props.row[i][0] !== ''
          ) {
            foundMiddle = props.row[i][0]
          }
          else if(
            normalHeader.includes('prefer') &&
            props.row[i][0] !== ''
          ) {
            foundPreferred = props.row[i][0]
          }
          else if(
            normalHeader.includes('email') &&
            props.row[i][0] !== ''
          ) {
            foundEmail = props.row[i][0]
          }
        }
        
        if(foundColumn.type === 'tag') {
          const value = foundColumn.values[props.i]
          const cellTags = (value.split(',') ?? [])
          .filter((tag) => tag !== '')
          .reduce((prev, tag) => {
            const foundTag = (props.tagData.data ?? []).find((uTag) => tag === uTag.id)
            if(foundTag !== undefined && !foundTags.some((uTag) => uTag.id === tag)) {
              prev.push(foundTag)
            }
            return prev
          }, [] as UserTag[])

          foundTags.push(...cellTags)
        }
      }

      if(
        foundFirst !== undefined && 
        foundLast !== undefined
      ) {
        const participant: Participant = {
          id: v4(),
          firstName: foundFirst,
          lastName: foundLast,
          createdAt: new Date().toISOString(),
          middleName: foundMiddle,
          preferredName: foundPreferred,
          email: foundEmail,
          userEmail: userDetection[1],
          userTags: foundTags,
          contact: false,
          //not required
          notifications: [],
          collections: [],
        }

        return participant
      }
    }
    return undefined
  })()

  const detectedUser = [
    ...props.users.flatMap((data) => data.profile).filter((profile) => profile !== undefined),
    ...props.tempUsers
  ].find((profile) => profile.email === userDetection[1])

  useEffect(() => {
    const linkedParticipants = [...linkedParticipantFields]
    const linkedUser = linkedUserFields ? {...linkedUserFields} : {
      email: ['' , ''] as [string, string],
      first: [false, ''] as [boolean, string],
      last: [false, ''] as [boolean, string],
      sitting: [false, ''] as [boolean, string],
    }
    if(
      participantDetection.length > 0 ||
      userDetection[0] === 'temp' ||
      userDetection[0] === 'user'
    ) {
      for(let i = 0; i < props.table.columns.length; i++) {
        const column = props.table.columns[i]
        const choice = (column.choices ?? [])?.[props.i]
        const endIndex = choice.indexOf(',') === -1 ? choice.length : choice.indexOf(',')
        if(choice.includes('participantId:')) {
          const mappedParticipant = choice.substring(choice.indexOf(':') + 1, endIndex)
          const foundParticipant = participantDetection.some((participant) => participant.id === mappedParticipant)
          if(!foundParticipant) continue
          const linkedIndex = linkedParticipants.findIndex((participant) => participant.id === mappedParticipant)
          if(linkedIndex === -1) {
            linkedParticipants.push({
              id: mappedParticipant,
              first: [false, ''],
              last: [false, ''],
              middle: null,
              preferred: null,
              email: null,
              tags: null
            })
          }
          const field = choice.substring(endIndex + 1)
          if(field === 'first') {
            linkedParticipants[linkedParticipants.length].first = [true, column.id]
          }
          else if(field === 'last') {
            linkedParticipants[linkedParticipants.length].last = [true, column.id]
          }
          else if(field === 'middle') {
            linkedParticipants[linkedParticipants.length].middle = [true, column.id]
          }
          else if(field === 'preferred') {
            linkedParticipants[linkedParticipants.length].preferred = [true, column.id]
          }
          else if(field === 'email') {
            linkedParticipants[linkedParticipants.length].email = [true, column.id]
          }
          else if(field === 'tags') {
            linkedParticipants[linkedParticipants.length].tags = [true, column.id]
          }
        }
        else if(choice.includes('userEmail:')) {
          const mappedUser = choice.substring(choice.indexOf(':') + 1, endIndex)
          if(userDetection[1] !== mappedUser && linkedUser.email[0] !== '') {
            //TODO: invalid mapping (two different users mapped in the same row) -> handle this event
            continue
          }
          else if(linkedUser.email[0] === '' && userDetection[1] === mappedUser) {
            linkedUser.email[0] = mappedUser
          }

          const field = choice.substring(endIndex + 1)
          if(field === 'first') {
            linkedUser.first = [true, column.id]
          }
          else if(field === 'last') {
            linkedUser.last = [true, column.id]
          }
          else if(field === 'sitting') {
            linkedUser.sitting = [true, column.id]
          }
          else if(field === 'email') {
            linkedUser.email = [linkedUser.email[0], column.id]
          }
        }
      }
    }
    
    setLinkedParticipantFields(prev => 
      JSON.stringify(prev) !== JSON.stringify(linkedParticipants) ? linkedParticipants : prev
    )
    setLinkedUserFields(prev => 
      JSON.stringify(prev) !== JSON.stringify(linkedUser) ? linkedUser : prev
    )
  }, [
    userDetection,
    participantDetection,
    linkedParticipantFields,  
    linkedUserFields,  
    props.table.columns, 
    props.i  
  ])

  return (
    <>
      {userDetection[0] === 'unlinked' && detectedUser !== undefined && (
        <LinkUserModal 
          UserService={props.UserService}
          open={linkUserVisible}
          onClose={() => setLinkUserVisible(false)}
          userProfile={detectedUser}
          rowIndex={props.i}
          tags={props.tagData}
          tableColumns={props.table.columns.filter((column) => {
            const choice = (column.choices ?? [])?.[props.i]
            return choice === undefined || (!choice.includes('userEmail') && !choice.includes('participantId'))
          })}
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
      <tr className={`bg-white border-b ${stateStyles[rowState.type]}`} ref={ref}>
        {props.row.map(([v, t, id], j) => {
          switch(t){
            case 'date': {
              return (
                <DateCell
                  key={j}
                  value={v}
                  TimeslotService={props.TimeslotService}
                  //TODO: timeslot ids should be mutually exclusive -> need to convert cells from being an array of values to be its own dynamo for now will leave as is and avoid double registrations
                  updateValue={(text) => updateValue(id, text, props.i)}
                  table={props.table}
                  linkedParticipantId={(() => {
                    const foundColumn = props.table.columns.find((col) => col.id === id)
                    if(!foundColumn) return undefined
                    const foundParticipantChoice = foundColumn.choices?.[props.i]
                    if(
                      !props.users.flatMap((data) => data.profile?.participant).filter((participant) => participant !== undefined).some((participant) => participant.id === foundParticipantChoice) &&
                      !props.tempUsers.flatMap((data) => data.participant).some((participant) => participant.id === foundParticipantChoice)
                    ) return undefined
                    return foundParticipantChoice
                  })()}
                  timeslotsQuery={props.selectedTag !== undefined ? props.tagTimeslotQuery : props.timeslotsQuery}
                  tagsQuery={props.tagData}
                  userData={{
                    users: props.users.map((user) => user.profile).filter((profile) => profile !== undefined),
                    tempUsers: props.tempUsers
                  }}
                  usersQuery={props.userData}
                  tempUsersQuery={props.tempUsersData}
                  updateParticipant={(timeslot, participantId, userEmail, tempUser) => {
                    if(tempUser) {
                      props.setTempUsers((prev) => prev.map((profile) => {
                        return profile.email == userEmail ? ({
                          ...profile,
                          participant: profile.participant.map((participant) => (participant.id === participantId ? ({
                            ...participant,
                            timeslot: [...(participant.timeslot ?? []), timeslot]
                          } as Participant) : participant))
                        }) : profile
                      }))
                    } else {
                      props.setUsers((prev) => prev.map((data) => {
                        return ({
                          ...data,
                          profile: data.profile && data.profile.email === userEmail ? ({
                            ...data.profile,
                            participant: data.profile.participant.map((participant) => (participant.id === participantId ? ({
                              ...participant,
                              timeslot: [...(participant.timeslot ?? []), timeslot]
                            }) : participant))
                          }) : data.profile
                        })
                      }))
                    }
                  }}
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
                  updateValue={(text) => updateValue(id, text, props.i)}
                  column={props.table.columns.find((col) => col.id === id)!}
                  createChoice={(choice, color) => updateChoices(id, {choice: choice, color: color}, "create")}
                />
              )
            }
            case 'tag': {
              return (
                <TagCell
                  UserService={props.UserService}
                  key={j}
                  value={v}
                  updateValue={(text) => updateValue(id, text, props.i)}
                  tags={props.tagData}
                  table={props.table}
                  columnId={id}
                  rowIndex={props.i}
                  linkedParticipantId={(() => {
                    const foundColumn = props.table.columns.find((col) => col.id === id)
                    if(!foundColumn) return undefined
                    const foundParticipantChoice = foundColumn.choices?.[props.i]
                    if(
                      !props.users.flatMap((data) => data.profile?.participant).filter((participant) => participant !== undefined).some((participant) => participant.id === foundParticipantChoice) &&
                      !props.tempUsers.flatMap((data) => data.participant).some((participant) => participant.id === foundParticipantChoice)
                    ) return undefined
                    return foundParticipantChoice
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
            case 'file': {
              return (
                <FileCell
                  TableService={props.TableService}
                  PhotoPathService={props.PhotoPathService}
                  key={j}
                  value={v}
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
                  updateValue={(text) => updateValue(id, text, props.i)}
                  column={props.table.columns.find((column) => column.id === id)!}
                  rowIndex={props.i}
                  tempUsersData={props.tempUsersData}
                  userData={props.userData}
                  updateUserAttribute={props.updateUserAttribute}
                  updateUserProfile={props.updateUserProfile}
                  updateParticipant={props.updateParticipant}
                />
              )
            }
          }
        })}
        <td 
          className={`
            flex flex-row items-center justify-center py-3 
            ${stateStyles[rowState.type] ?? ''} px-2 gap-2
          `}
          onMouseEnter={() => setAllowDragging(true)}
          onMouseLeave={() => setAllowDragging(false)}
        >
          {/* TODO: put linked user icon with dropdown to view details */}
          {/* TODO: implement revoke for temp users */}
          {(userDetection[0] === 'user' || userDetection[0] === 'temp' || userDetection[0] === 'unlinked') && detectedUser !== undefined && (
            <Dropdown
              label={(
                <HiOutlineUserCircle 
                  className={`
                    ${userDetection[0] === 'temp' ? 'text-orange-300' : userDetection[0] === 'unlinked' ? 'text-red-400' : 'text-black'} 
                    hover:fill-gray-400 hover:cursor-pointer
                  `} size={26} 
                />
              )}
              inline
              arrowIcon={false}
              placement="bottom-end"
            >
              <div className="px-4 py-2 flex flex-col">
                <span className="font-medium whitespace-nowrap text-lg text-blue-400">User Info{
                userDetection[0] === 'temp' ? (
                  ' - Temporary'
                ) : (
                  userDetection[0] === 'unlinked' ? (
                    ' - Unlinked'
                  ) : (
                    ''
                  )
                )}
                </span>
                <div className="flex flex-col px-2 text-xs">
                  <div className="flex flex-row gap-2 items-center text-nowrap">
                    <span>Sitting Number:</span>
                    <span className="italic">{detectedUser.sittingNumber}</span>
                  </div>
                  <div className="flex flex-row gap-2 items-center text-nowrap">
                    <span>First Name:</span>
                    <span className="italic">{detectedUser.firstName}</span>
                  </div>
                  <div className="flex flex-row gap-2 items-center text-nowrap">
                    <span>Last Name:</span>
                    <span className="italic">{detectedUser.lastName}</span>
                  </div>
                  <div className="flex flex-row gap-2 items-center text-nowrap">
                    <span>Email:</span>
                    <span className="italic">{detectedUser.email}</span>
                  </div>
                  <div className="border mt-2"/>
                  {detectedUser.participant
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((participant, index) => {
                    // TODO: implement admin options to delete participants
                    return (
                      <div key={index}>
                        <ParticipantPanel 
                          participant={participant}
                        />
                        <div className="border"/>
                      </div>
                    )
                  })}
                </div>
                <div className="flex flex-row justify-end mt-2 me-1">
                  {userDetection[0] === 'unlinked' && (
                    <button 
                      className="border px-2 py-1 rounded-lg text-sm hover:bg-gray-200 bg-white"
                      onClick={() => {
                        setLinkUserVisible(true)
                      }}
                    >
                      <span>Link User</span>
                    </button>
                  )}
                  {(userDetection[0] === 'temp' || props.tempUsers.some((user) => user.email === userDetection[1])) && (
                    <>
                      <button 
                        className="border px-2 py-1 rounded-lg text-sm hover:bg-gray-200 bg-white"
                        onClick={() => {
                          //TODO: implement me
                        }}
                      >
                        <span>Send Invite</span>
                      </button>
                      <button 
                        className="border px-2 py-1 rounded-lg text-sm hover:bg-gray-200 bg-white"
                        onClick={() => {
                          //TODO: implement me
                        }}
                      >
                        <span>Copy Invite Link</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </Dropdown>
          )}
          <Dropdown
            label={(<HiOutlineDotsHorizontal className="text-gray-600 hover:fill-gray-200 hover:text-gray-900 hover:cursor-pointer" size={26} />)}
            inline
            arrowIcon={false}
            placement="bottom-end"
          >
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
                // onClick={() => setCreateUser(true)}
                // TODO: implement me please :)
              >Link Participant</Dropdown.Item>
            )}
            {userDetection[0] === 'unlinked' && (
              <Dropdown.Item
                className="whitespace-nowrap flex flex-row justify-center w-full"
                //TODO: implement me please
              >Link User</Dropdown.Item>
            )}
            {/* TODO: implement me please */}
            <Dropdown.Item
              className="whitespace-nowrap flex flex-row justify-center w-full"
            >
              Notify User
            </Dropdown.Item>
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

  console.log(formattedRow)
  
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