import { Dropdown } from "flowbite-react"
import { HiOutlineDotsHorizontal } from "react-icons/hi"
import { ColumnColor, Participant, Table, TableColumn, TableGroup, Timeslot, UserData, UserProfile, UserTag } from "../../../types"
import { ChoiceCell } from "./ChoiceCell"
import { DateCell } from "./DateCell"
import { FileCell } from "./FileCell"
import { TagCell } from "./TagCell"
import { ValueCell } from "./ValueCell"
import { AdminRegisterTimeslotMutationParams, TimeslotService } from "../../../services/timeslotService"
import { useMutation, UseMutationResult, UseQueryResult, useQueries } from "@tanstack/react-query"
import { Dispatch, HTMLAttributes, SetStateAction, useEffect, useRef, useState } from "react"
import { defaultColumnColors } from "../../../utils"
import { UpdateTableColumnParams, CreateChoiceParams, TableService, DeleteTableRowParams } from "../../../services/tableService"
import { v4 } from 'uuid'
import { CreateParticipantParams, LinkParticipantMutationParams, LinkUserFieldMutationParams, LinkUserMutationParams, UpdateParticipantMutationParams, UpdateUserAttributesMutationParams, UpdateUserProfileParams, UserService, SendUserInviteEmailParams } from "../../../services/userService"
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
import { LinkUserModal, ParticipantFieldLinks, UserFieldLinks } from "../../modals/LinkUser"
import { LinkParticipantModal } from "../../modals/LinkParticipant"
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";

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
  baseLink: string
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
  registerTimeslot: UseMutationResult<Timeslot | null, Error, AdminRegisterTimeslotMutationParams, unknown>
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
  const [linkedUserFields, setLinkedUserFields] = useState<UserFieldLinks>()
  const [linkedParticipantFields, setLinkedParticipantFields] = useState<ParticipantFieldLinks[]>([])
  const [linkUserVisible, setLinkUserVisible] = useState(false)
  const [linkParticipantVisible, setLinkParticipantVisible] = useState(false)

  const timeslotQueries = useQueries({
    queries: linkedParticipantFields[0]?.timeslot?.[0] === undefined ? [props.TimeslotService.getTimeslotByIdQueryOptions('', { siTag: false })] :
    (props.table.columns.find((column) => column.id === linkedParticipantFields[0]?.timeslot?.[0])
    ?.values[props.i] ?? '').split(',').filter((value) => value !== '')
    .reduce((prev, cur) => {
      if(!prev.some((timeslotId) => timeslotId === cur)) {
        prev.push(cur)
      }
      return prev
    }, [] as string[])
    .map((timeslotId) => props.TimeslotService.getTimeslotByIdQueryOptions(timeslotId, { siTag: false }))
  })


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

    if(!column) {
      //TODO: handle error
      return
    }

    const userLink = ((column.choices ?? [])[i] ?? '').includes('userEmail')
    const participantLink = ((column.choices ?? [])[i] ?? '').includes('participantId')

    const field: 'first' | 'last' | 'sitting' | 'email' | 'preferred' | 'middle' | undefined = (column.type === 'value' && (participantLink || userLink)) ? (() => {
      const foundChoice = column.choices?.[i]
      if(foundChoice === undefined) return undefined
      const foundField = foundChoice.substring(foundChoice.indexOf(',') + 1)
      switch(foundField) {
        case 'first':
          return 'first'
        case 'last':
          return 'last'
        case 'sitting':
          return 'sitting'
        case 'email':
          return 'email'
        case 'preferred':
          return 'preferred'
        case 'middle':
          return 'middle'
        default:
          return undefined
      }
    })(): undefined 

    //processing the link
    if(
      (
        props.tempUsers.some((profile) => profile.email.toLowerCase() === linkedUserFields?.email[0].toLowerCase()) ||
        props.users.some((user) => user.email.toLowerCase() === linkedUserFields?.email[0].toLowerCase())
      ) &&
      userLink &&
      field !== undefined
    ) {
      const foundUser: UserProfile & { temp: boolean } | undefined = [
        ...props.tempUsers.map((profile) => ({...profile, temp: true})),
        ...props.users.map((user) => user.profile).filter((profile) => profile !== undefined).map((profile) => ({...profile, temp: true}))
      ].find((user) => user.email.toLowerCase() === linkedUserFields?.email[0].toLowerCase())
      if(foundUser !== undefined) {
        if(column.id === linkedUserFields?.email[1]) {
          //TODO: investigate how to handle this, since cognito email needs to be changed as well with the attribute update: for now disabled
        }
        else if(linkedUserFields?.first && column.id === linkedUserFields.first[0] && field === 'first') {
          props.updateUserProfile.mutate({
            profile: foundUser,
            first: text,
            options: {
              logging: true
            }
          })
          if(foundUser.temp) {
            props.setTempUsers(prev => prev.map((profile) => profile.email === foundUser.email ? ({
              ...profile,
              first: text
            }) : profile))
          }
          else {
            props.setUsers(prev => prev.map((data) => data.email === foundUser.email ? ({
              ...data,
              profile: ({
                ...foundUser,
                first: text
              })
            }) : data))
          }
        }
        else if(linkedUserFields?.last && column.id === linkedUserFields.last[0] && field === 'last') {
          props.updateUserProfile.mutate({
            profile: foundUser,
            last: text,
            options: {
              logging: true
            }
          })
          if(foundUser.temp) {
            props.setTempUsers(prev => prev.map((profile) => profile.email === foundUser.email ? ({
              ...profile,
              last: text
            }) : profile))
          }
          else {
            props.setUsers(prev => prev.map((data) => data.email === foundUser.email ? ({
              ...data,
              profile: ({
                ...foundUser,
                last: text
              })
            }) : data))
          }
        }
        else if(linkedUserFields?.sitting && column.id === linkedUserFields.sitting[0] && !isNaN(Number(text)) && field === 'sitting') {
          props.updateUserProfile.mutate({
            profile: foundUser,
            sitting: Number(text)
          })
          if(foundUser.temp) {
            props.setTempUsers(prev => prev.map((profile) => profile.email === foundUser.email ? ({
              ...profile,
              sittingNumber: Number(text)
            }) : profile))
          }
          else {
            props.setUsers(prev => prev.map((data) => data.email === foundUser.email ? ({
              ...data,
              profile: ({
                ...foundUser,
                sittingNumber: Number(text)
              })
            }) : data))
          }
        }
      }
    }
    
    if(participantLink) {
      if(linkedParticipantFields.some((link) => link.first && link.first[0] === column.id) && field === 'first') {
        linkedParticipantFields.forEach((link) => {
          const foundParticipant: Participant & { temp: boolean } | undefined = [
            ...props.tempUsers.flatMap((profile) => profile.participant).map((participant) => ({...participant, temp: true})),
            ...props.users.map((user) => user.profile).filter((profile) => profile !== undefined).flatMap((profile) => profile.participant).map((participant) => ({...participant, temp: false}))
          ].find((participant) => participant.id === link.id)
          if(foundParticipant !== undefined) {
            props.updateParticipant.mutate({
              participant: foundParticipant,
              firstName: text,
              lastName: foundParticipant.lastName,
              contact: foundParticipant.contact,
              userTags: foundParticipant.userTags,
              options: {
                logging: true
              }
            })
            if(foundParticipant.temp) {
              props.setTempUsers(prev => prev.map((profile) => profile.participant.some((participant) => participant.id === foundParticipant.id) ? ({
                ...profile,
                participant: profile.participant.map((participant) => participant.id === foundParticipant.id ? ({
                  ...participant,
                  firstName: text
                }) : participant)
              }) : profile))
            }
            else {
              props.setUsers(prev => prev.map((data) => (
                data.profile && 
                (data.profile?.participant ?? [])
                .some((participant) => participant.id === foundParticipant.id)) 
              ? ({
                ...data,
                profile: ({
                  ...data.profile,
                  participant: (data.profile?.participant ?? []).map((participant) => participant.id === foundParticipant.id ?({
                    ...participant,
                    firstName: text
                  }) : participant)
                })
              }) : data))
            }
          }
        })
      }
      else if(linkedParticipantFields.some((link) => link.last && link.last[0] === column.id) && field === 'last') {
        linkedParticipantFields.forEach((link) => {
          const foundParticipant: Participant & { temp: boolean } | undefined = [
            ...props.tempUsers.flatMap((profile) => profile.participant).map((participant) => ({...participant, temp: true})),
            ...props.users.map((user) => user.profile).filter((profile) => profile !== undefined).flatMap((profile) => profile.participant).map((participant) => ({...participant, temp: false}))
          ].find((participant) => participant.id === link.id)
          if(foundParticipant !== undefined) {
            props.updateParticipant.mutate({
              participant: foundParticipant,
              lastName: text,
              firstName: foundParticipant.firstName,
              contact: foundParticipant.contact,
              userTags: foundParticipant.userTags,
            })
            if(foundParticipant.temp) {
              props.setTempUsers(prev => prev.map((profile) => profile.participant.some((participant) => participant.id === foundParticipant.id) ? ({
                ...profile,
                participant: profile.participant.map((participant) => participant.id === foundParticipant.id ? ({
                  ...participant,
                  lastName: text
                }) : participant)
              }) : profile))
            }
            else {
              props.setUsers(prev => prev.map((data) => (
                data.profile && 
                (data.profile?.participant ?? [])
                .some((participant) => participant.id === foundParticipant.id)) 
              ? ({
                ...data,
                profile: ({
                  ...data.profile,
                  participant: (data.profile?.participant ?? []).map((participant) => participant.id === foundParticipant.id ?({
                    ...participant,
                    lastName: text
                  }) : participant)
                })
              }) : data))
            }
          }
        })
      }
      else if(linkedParticipantFields.some((link) => link.preferred && link.preferred[0] === column.id) && field === 'preferred') {
        linkedParticipantFields.forEach((link) => {
          const foundParticipant: Participant & { temp: boolean } | undefined = [
            ...props.tempUsers.flatMap((profile) => profile.participant).map((participant) => ({...participant, temp: true})),
            ...props.users.map((user) => user.profile).filter((profile) => profile !== undefined).flatMap((profile) => profile.participant).map((participant) => ({...participant, temp: false}))
          ].find((participant) => participant.id === link.id)
          if(foundParticipant !== undefined) {
            props.updateParticipant.mutate({
              participant: foundParticipant,
              preferredName: text,
              firstName: foundParticipant.firstName,
              lastName: foundParticipant.lastName,
              contact: foundParticipant.contact,
              userTags: foundParticipant.userTags,
            })
            if(foundParticipant.temp) {
              props.setTempUsers(prev => prev.map((profile) => profile.participant.some((participant) => participant.id === foundParticipant.id) ? ({
                ...profile,
                participant: profile.participant.map((participant) => participant.id === foundParticipant.id ? ({
                  ...participant,
                  preferredName: text
                }) : participant)
              }) : profile))
            }
            else {
              props.setUsers(prev => prev.map((data) => (
                data.profile && 
                (data.profile?.participant ?? [])
                .some((participant) => participant.id === foundParticipant.id)) 
              ? ({
                ...data,
                profile: ({
                  ...data.profile,
                  participant: (data.profile?.participant ?? []).map((participant) => participant.id === foundParticipant.id ?({
                    ...participant,
                    preferredName: text
                  }) : participant)
                })
              }) : data))
            }
          }
        })
      }
      else if(linkedParticipantFields.some((link) => link.middle && link.middle[0] === column.id) && field === 'middle') {
        linkedParticipantFields.forEach((link) => {
          const foundParticipant: Participant & { temp: boolean } | undefined = [
            ...props.tempUsers.flatMap((profile) => profile.participant).map((participant) => ({...participant, temp: true})),
            ...props.users.map((user) => user.profile).filter((profile) => profile !== undefined).flatMap((profile) => profile.participant).map((participant) => ({...participant, temp: false}))
          ].find((participant) => participant.id === link.id)
          if(foundParticipant !== undefined) {
            props.updateParticipant.mutate({
              participant: foundParticipant,
              firstName: foundParticipant.firstName,
              lastName: foundParticipant.lastName,
              middleName: text,
              contact: foundParticipant.contact,
              userTags: foundParticipant.userTags,
            })
            if(foundParticipant.temp) {
              props.setTempUsers(prev => prev.map((profile) => profile.participant.some((participant) => participant.id === foundParticipant.id) ? ({
                ...profile,
                participant: profile.participant.map((participant) => participant.id === foundParticipant.id ? ({
                  ...participant,
                  middleName: text
                }) : participant)
              }) : profile))
            }
            else {
              props.setUsers(prev => prev.map((data) => (
                data.profile && 
                (data.profile?.participant ?? [])
                .some((participant) => participant.id === foundParticipant.id)) 
              ? ({
                ...data,
                profile: ({
                  ...data.profile,
                  participant: (data.profile?.participant ?? []).map((participant) => participant.id === foundParticipant.id ?({
                    ...participant,
                    middleName: text
                  }) : participant)
                })
              }) : data))
            }
          }
        })
      }
      else if(linkedParticipantFields.some((link) => link.email && link.email[0] === column.id) && field === 'email') {
        linkedParticipantFields.forEach((link) => {
          const foundParticipant: Participant & { temp: boolean } | undefined = [
            ...props.tempUsers.flatMap((profile) => profile.participant).map((participant) => ({...participant, temp: true})),
            ...props.users.map((user) => user.profile).filter((profile) => profile !== undefined).flatMap((profile) => profile.participant).map((participant) => ({...participant, temp: false}))
          ].find((participant) => participant.id === link.id)
          if(foundParticipant !== undefined && validator.isEmail(text)) {
            props.updateParticipant.mutate({
              participant: foundParticipant,
              email: text.toLowerCase(),
              firstName: foundParticipant.firstName,
              lastName: foundParticipant.lastName,
              contact: foundParticipant.contact,
              userTags: foundParticipant.userTags,
            })
            if(foundParticipant.temp) {
              props.setTempUsers(prev => prev.map((profile) => profile.participant.some((participant) => participant.id === foundParticipant.id) ? ({
                ...profile,
                participant: profile.participant.map((participant) => participant.id === foundParticipant.id ? ({
                  ...participant,
                  email: text.toLowerCase()
                }) : participant)
              }) : profile))
            }
            else {
              props.setUsers(prev => prev.map((data) => (
                data.profile && 
                (data.profile?.participant ?? [])
                .some((participant) => participant.id === foundParticipant.id)) 
              ? ({
                ...data,
                profile: ({
                  ...data.profile,
                  participant: (data.profile?.participant ?? []).map((participant) => participant.id === foundParticipant.id ?({
                    ...participant,
                    email: text.toLowerCase()
                  }) : participant)
                })
              }) : data))
            }
          }
        })
      }
      else if(linkedParticipantFields.some((link) => link.tags && link.tags[0] === column.id) && column.type === 'tag') {
        linkedParticipantFields.forEach((link) => {
          const foundParticipant: Participant & { temp: boolean } | undefined = [
            ...props.tempUsers.flatMap((profile) => profile.participant).map((participant) => ({...participant, temp: true})),
            ...props.users.map((user) => user.profile).filter((profile) => profile !== undefined).flatMap((profile) => profile.participant).map((participant) => ({...participant, temp: false}))
          ].find((participant) => participant.id === link.id)
          if(foundParticipant !== undefined) {
            const filteredTags = text.split(',')
            .map((tagId) => (props.tagData.data ?? []).find((tag) => tag.id === tagId))
            .filter((tag) => tag !== undefined)
            props.updateParticipant.mutate({
              participant: foundParticipant,
              firstName: foundParticipant.firstName,
              lastName: foundParticipant.lastName,
              userTags: filteredTags,
              contact: foundParticipant.contact,
            })
            if(foundParticipant.temp) {
              props.setTempUsers(prev => prev.map((profile) => profile.participant.some((participant) => participant.id === foundParticipant.id) ? ({
                ...profile,
                participant: profile.participant.map((participant) => participant.id === foundParticipant.id ? ({
                  ...participant,
                  userTags: filteredTags
                }) : participant)
              }) : profile))
            }
            else {
              props.setUsers(prev => prev.map((data) => (
                data.profile && 
                (data.profile?.participant ?? [])
                .some((participant) => participant.id === foundParticipant.id)) 
              ? ({
                ...data,
                profile: ({
                  ...data.profile,
                  participant: (data.profile?.participant ?? []).map((participant) => participant.id === foundParticipant.id ?({
                    ...participant,
                    tags: filteredTags
                  }) : participant)
                })
              }) : data))
            }
          }
        })
      }
      else if(linkedParticipantFields.some((link) => link.timeslot && link.timeslot[0] === column.id) && column.type === 'date') {
        linkedParticipantFields.forEach((link) => {
          const foundParticipant: Participant & { temp: boolean } | undefined = [
            ...props.tempUsers.flatMap((profile) => profile.participant).map((participant) => ({...participant, temp: true})),
            ...props.users.map((user) => user.profile).filter((profile) => profile !== undefined).flatMap((profile) => profile.participant).map((participant) => ({...participant, temp: false}))
          ].find((participant) => participant.id === link.id)
          if(foundParticipant !== undefined) {
            Promise.all(
              text.split(',')
              .filter((timeslotId) => (foundParticipant.timeslot ?? [])
              .some((timeslot) => timeslot.id === timeslotId))
              .map(async (timeslotId) => {
                return props.registerTimeslot.mutateAsync({
                  timeslotId: timeslotId,
                  userEmail: foundParticipant.userEmail,
                  participantId: foundParticipant.id,
                  notify: false,
                  options: {
                    logging: true
                  }
                })
              })
            ).then((value) => {
              if(foundParticipant.temp) {
                props.setTempUsers(prev => prev.map((profile) => profile.participant.some((participant) => participant.id === foundParticipant.id) ? ({
                  ...profile,
                  participant: profile.participant.map((participant) => participant.id === foundParticipant.id ? ({
                    ...participant,
                    timeslot: [
                      ...(foundParticipant.timeslot ?? []),
                      ...value.filter((timeslot) => timeslot !== null)
                    ].reduce((prev, cur) => {
                      if(!prev.some((timeslot) => timeslot.id === cur.id)) {
                        prev.push(cur)
                      }
                      return prev
                    }, [] as Timeslot[])
                  }) : participant)
                }) : profile))
              }
              else {
                props.setUsers(prev => prev.map((data) => (
                  data.profile && 
                  (data.profile?.participant ?? [])
                  .some((participant) => participant.id === foundParticipant.id)) 
                ? ({
                  ...data,
                  profile: ({
                    ...data.profile,
                    participant: (data.profile?.participant ?? []).map((participant) => participant.id === foundParticipant.id ?({
                      ...participant,
                      timeslot: [
                        ...(foundParticipant.timeslot ?? []),
                        ...value.filter((timeslot) => timeslot !== null)
                      ].reduce((prev, cur) => {
                        if(!prev.some((timeslot) => timeslot.id === cur.id)) {
                          prev.push(cur)
                        }
                        return prev
                      }, [] as Timeslot[])
                    }) : participant)
                  })
                }) : data))
              }
            })
          }
        })
      }
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

  //TODO: handle custom colors -> split colors with hashtags into text and bg colors
  const updateChoices = (id: string, data: { choice: string, color: string, customColor?: [string, string] }, mode: 'create' | 'delete') => {
    const column = props.table.columns.find((column) => column.id === id)
    
    if(!column){
      //TODO: handle error
      return
    } 

    if(mode === 'create') {
      const tempColor: ColumnColor = {
        id: v4(),
        textColor: data.customColor !== undefined ? data.customColor[0] : defaultColumnColors[data.color].text,
        bgColor: data.customColor !== undefined ? data.customColor[1] : defaultColumnColors[data.color].bg,
        value: data.choice,
        columnId: column.id,
      }

      props.createChoice.mutate({
        column: column,
        colorId: tempColor.id,
        choice: data.choice,
        color: data.color,
        customColor: data.customColor,
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


  //user means that the user has been created and columns have been linked
  //temp means that invite user has been called and columns have been linked
  //potential means that a potential user can be created
  //unlinked means that a user exists but the columns have not been linked
  //false means none of the above are applicable
  
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
        !normalHeader.includes('escort') &&
        !normalHeader.includes('daughter') &&
        !normalHeader.includes('son') &&
        !normalHeader.includes('child')
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
    const linkedParticipants: ParticipantFieldLinks[] = [...linkedParticipantFields]
    const linkedUser: UserFieldLinks = linkedUserFields ? {...linkedUserFields} : {
      email: ['' , ''] as [string, string],
      first: null,
      last: null,
      sitting: null,
    }
    if(
      participantDetection.length > 0 ||
      userDetection[0] === 'temp' ||
      userDetection[0] === 'user'
    ) {
      for(let i = 0; i < props.table.columns.length; i++) {
        const column = props.table.columns[i]
        const choice = (column.choices ?? [])?.[props.i]
        if(choice === undefined || choice === null) continue
        const endIndex = choice.indexOf(',') === -1 ? choice.length : choice.indexOf(',')
        if(choice.includes('participantId:')) {
          const mappedParticipant = choice.substring(choice.indexOf(':') + 1, endIndex)
          const foundParticipant = participantDetection.some((participant) => participant.id === mappedParticipant)
          if(!foundParticipant) continue
          const linkedIndex = linkedParticipants.findIndex((participant) => participant.id === mappedParticipant)
          if(linkedIndex === -1) {
            linkedParticipants.push({
              id: mappedParticipant,
              first: null,
              last: null,
              middle: null,
              preferred: null,
              email: null,
              tags: null,
              timeslot: null,
            })
          }
          const field = choice.substring(endIndex + 1)
          if(field === 'first') {
            linkedParticipants[linkedParticipants.length - 1].first = [column.id, 'update']
          }
          else if(field === 'last') {
            linkedParticipants[linkedParticipants.length - 1].last = [column.id, 'update']
          }
          else if(field === 'middle') {
            linkedParticipants[linkedParticipants.length - 1].middle = [column.id, 'update']
          }
          else if(field === 'preferred') {
            linkedParticipants[linkedParticipants.length - 1].preferred = [column.id, 'update']
          }
          else if(field === 'email') {
            linkedParticipants[linkedParticipants.length - 1].email = [column.id, 'update']
          }
          else if(column.type === 'tag') {
            linkedParticipants[linkedParticipants.length - 1].tags = [column.id, 'update']
          }
          else if(column.type === 'date') {
            linkedParticipants[linkedParticipants.length - 1].timeslot = [column.id, 'update']
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
            linkedUser.first = [column.id, 'update']
          }
          else if(field === 'last') {
            linkedUser.last = [column.id, 'update']
          }
          else if(field === 'sitting') {
            linkedUser.sitting = [column.id, 'update']
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

  const filteredColumns = props.table.columns.filter((column) => {
    if(column.type !== 'tag' && column.type !== 'date' && column.type !== 'value') return false
    return (
      linkedUserFields === undefined || (
        (linkedUserFields.first === null || linkedUserFields.first[0] !== column.id) &&
        (linkedUserFields.last === null || linkedUserFields.last[0] !== column.id) &&
        (linkedUserFields.sitting === null || linkedUserFields.sitting[0] !== column.id) &&
        (linkedUserFields.email[1] !== column.id) &&
        linkedParticipantFields.every((participantLink) => {
          return (
            (participantLink.first === null || participantLink.first[0] !== column.id) &&
            (participantLink.last === null || participantLink.last[0] !== column.id) &&
            (participantLink.email === null || participantLink.email[0] !== column.id) &&
            (participantLink.middle === null || participantLink.middle[0] !== column.id) &&
            (participantLink.preferred === null || participantLink.preferred[0] !== column.id) &&
            (participantLink.tags === null || participantLink.tags[0] !== column.id) &&
            (participantLink.timeslot === null || participantLink.timeslot[0] !== column.id)
          )
        })
      )
    )
  })

  const linkUser = useMutation({
    mutationFn: (params: LinkUserMutationParams) => props.UserService.linkUserMutation(params),
    onSuccess: (data) => {
      if(data.length > 0) {
        const updateGroup = (prev: TableGroup[]): TableGroup[] => prev.map((group) => group.tables.some((table) => table.id === data[0].tableId) ? ({
          ...group,
          tables: group.tables.map((table) => table.id === data[0].tableId ? ({
            ...table,
            columns: data
          }) : table)
        }) : group)

        props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
        props.parentUpdateTableGroups((prev) => updateGroup(prev))
        props.parentUpdateTable((prev) => prev !== undefined ? ({
          ...prev,
          columns: data
        }) : prev)
        props.parentUpdateTableColumns(data)
      }
    }
  })

  const linkParticipant = useMutation({
    mutationFn: (params: LinkParticipantMutationParams) => props.UserService.linkParticipantMutation(params),
    onSuccess: (data) => {
      if(data.length > 0) {
        const updateGroup = (prev: TableGroup[]): TableGroup[] => prev.map((group) => group.tables.some((table) => table.id === data[0].tableId) ? ({
          ...group,
          tables: group.tables.map((table) => table.id === data[0].tableId ? ({
            ...table,
            columns: data
          }) : table)
        }) : group)

        props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
        props.parentUpdateTableGroups((prev) => updateGroup(prev))
        props.parentUpdateTable((prev) => prev !== undefined ? ({
          ...prev,
          columns: data
        }) : prev)
        props.parentUpdateTableColumns(data)
      }
    }
  })

  const linkUserField = useMutation({
    mutationFn: (params: LinkUserFieldMutationParams) => props.UserService.linkUserFieldMutation(params),
    onSuccess: (data) => {
      const newColumn = data[0]
      const newProfile = data[1]
      const temp = props.tempUsers.some((profile) => profile.email === newProfile.email)

      
      const updateGroup = (prev: TableGroup[]): TableGroup[] => prev.map((group) => group.tables.some((table) => table.id === newColumn.tableId) ? ({
        ...group,
        tables: group.tables.map((table) => table.id === newColumn.tableId ? ({
          ...table,
          columns: table.columns.map((column) => column.id === newColumn.id ? newColumn : column)
        }) : table)
      }) : ( 
        group 
      ))


      props.setTempUsers((prev) => temp ? prev.map((profile) => profile.email === newProfile.email ? newProfile : profile) : prev)
      props.setUsers((prev) => !temp ? prev.map((user) => user.email === newProfile.email ? ({...user, profile: newProfile}) : user) : prev)
      props.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
      props.parentUpdateTableGroups((prev) => updateGroup(prev))
      props.parentUpdateTable((prev) => prev !== undefined ? ({
        ...prev,
        columns: prev.columns.map((column) => column.id === newColumn.id ? newColumn : column)
      }) : prev)
      props.parentUpdateTableColumns((prev) => prev.map((column) => column.id === newColumn.id ? newColumn : column))
    }
  })

  const sendInviteEmail = useMutation({
    mutationFn: (params: SendUserInviteEmailParams) => props.UserService.sendUserInviteEmail(params)
  })

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
                  createChoice={(choice, color, customColor) => updateChoices(id, {choice: choice, color: color, customColor: customColor}, "create")}
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
                <div className="border mb-2"/>
                <div className="flex flex-col text-xs">
                  <div className="px-3">
                    <div className="flex flex-row items-center text-nowrap justify-between w-full border-y py-1 px-2 min-h-[36px]">
                      <div className="flex flex-row gap-2 items-center">
                        <span>Sitting Number:</span>
                        <span className="italic">{detectedUser.sittingNumber}</span>
                      </div>
                      {userDetection[0] !== 'unlinked' && (
                        <div className="me-2">
                          <Dropdown
                            inline
                            arrowIcon={false}
                            label={(
                              linkedUserFields?.sitting !== null && 
                              props.table.columns.some((column) => column.id === linkedUserFields?.sitting?.[0])
                            ) ? (
                              <HiOutlineLockClosed size={16} className="hover:text-gray-300" />
                            ) : (
                              <HiOutlineLockOpen size={16} className="hover:text-gray-300" />
                            )}
                          >
                            {linkedUserFields?.sitting !== null &&
                            props.table.columns.some((column) => column.id === linkedUserFields?.sitting?.[0]) && (
                              <Dropdown.Item
                                className="bg-gray-200 hover:bg-transparent"
                                onClick={() => {
                                  const column = props.table.columns.find((column) => column.id === linkedUserFields?.first?.[0])
                                  invariant(column)

                                  const fieldLink: UserFieldLinks = {
                                    ...linkedUserFields === undefined ? {
                                      sitting: null,
                                      email: [detectedUser.email, ''],
                                      first: null,
                                      last: null
                                    } : {
                                      ...linkedUserFields,
                                      sitting: null,
                                    }
                                  }

                                  linkUserField.mutate({
                                    tableColumn: column,
                                    rowIndex: props.i,
                                    userFieldLinks: fieldLink,
                                    field: 'first',
                                    userProfile: detectedUser,
                                    options: {
                                      logging: true
                                    }
                                  })

                                  setLinkedUserFields(fieldLink)
                                }}
                              >{props.table.columns.find((column) => column.id === linkedUserFields?.sitting?.[0])?.header}</Dropdown.Item>
                            )}
                            {filteredColumns.filter((column) => column.type === 'value' && !isNaN(Number(column.values[props.i]))).length === 0 ? (
                              <Dropdown.Item disabled>No available columns</Dropdown.Item>
                            ) : (filteredColumns.filter((column) => column.type === 'value' && !isNaN(Number(column.values[props.i]))).map((column) => {
                              return (
                                <Dropdown.Item
                                  key={column.id}
                                  onClick={() => {
                                    const fieldLink: UserFieldLinks = {
                                      ...linkedUserFields === undefined ? {
                                        sitting: [column.id, column.values[props.i] === undefined || column.values[props.i] === '' ? 'override' : 'update'],
                                        email: [detectedUser.email, ''],
                                        first: null,
                                        last: null
                                      } : {
                                        ...linkedUserFields,
                                        sitting: [column.id, column.values[props.i] === undefined || column.values[props.i] === '' ? 'override' : 'update'],
                                      }
                                    }

                                    linkUserField.mutate({
                                      tableColumn: column,
                                      rowIndex: props.i,
                                      userFieldLinks: fieldLink,
                                      field: 'sitting',
                                      userProfile: detectedUser,
                                      options: {
                                        logging: true
                                      }
                                    })

                                    setLinkedUserFields(fieldLink)
                                  }}
                                >{column.header}</Dropdown.Item>
                              )})
                            )}
                          </Dropdown>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-row items-center text-nowrap justify-between w-full border-b py-1 px-2 min-h-[36px]">
                      <div className="flex flex-row gap-2 items-center">
                        <span>First Name:</span>
                        <span className="italic">{detectedUser.firstName}</span>
                      </div>
                      {userDetection[0] !== 'unlinked' && (
                        <div className="me-2">
                          <Dropdown
                            inline
                            arrowIcon={false}
                            label={(
                              linkedUserFields?.first !== null && 
                              props.table.columns.some((column) => column.id === linkedUserFields?.first?.[0])
                            ) ? (
                              <HiOutlineLockClosed size={16} className="hover:text-gray-300" />
                            ) : (
                              <HiOutlineLockOpen size={16} className="hover:text-gray-300" />
                            )}
                          >
                            {linkedUserFields?.first !== null &&
                            props.table.columns.some((column) => column.id === linkedUserFields?.first?.[0]) && (
                              <Dropdown.Item
                                className="bg-gray-200 hover:bg-transparent"
                                onClick={() => {
                                  const column = props.table.columns.find((column) => column.id === linkedUserFields?.first?.[0])
                                  invariant(column)

                                  const fieldLink: UserFieldLinks = {
                                    ...linkedUserFields === undefined ? {
                                      sitting: null,
                                      email: [detectedUser.email, ''],
                                      first: null,
                                      last: null
                                    } : {
                                      ...linkedUserFields,
                                      first: null,
                                    }
                                  }

                                  linkUserField.mutate({
                                    tableColumn: column,
                                    rowIndex: props.i,
                                    userFieldLinks: fieldLink,
                                    field: 'first',
                                    userProfile: detectedUser,
                                    options: {
                                      logging: true
                                    }
                                  })

                                  setLinkedUserFields(fieldLink)
                                }}
                              >{props.table.columns.find((column) => column.id === linkedUserFields?.first?.[0])?.header}</Dropdown.Item>
                            )}
                            {filteredColumns.filter((column) => column.type === 'value').length === 0 ? (
                              <Dropdown.Item disabled>No available columns</Dropdown.Item>
                            ) : (filteredColumns.filter((column) => column.type === 'value').map((column) => {
                              return (
                                <Dropdown.Item
                                  key={column.id}
                                  onClick={() => {
                                    const fieldLink: UserFieldLinks = {
                                      ...linkedUserFields === undefined ? {
                                        first: [column.id, column.values[props.i] === undefined || column.values[props.i] === '' ? 'override' : 'update'],
                                        email: [detectedUser.email, ''],
                                        sitting: null,
                                        last: null
                                      } : {
                                        ...linkedUserFields,
                                        first: [column.id, column.values[props.i] === undefined || column.values[props.i] === '' ? 'override' : 'update'],
                                      }
                                    }

                                    linkUserField.mutate({
                                      tableColumn: column,
                                      rowIndex: props.i,
                                      userFieldLinks: fieldLink,
                                      field: 'first',
                                      userProfile: detectedUser,
                                      options: {
                                        logging: true
                                      }
                                    })

                                    setLinkedUserFields(fieldLink)
                                  }}
                                >{column.header}</Dropdown.Item>
                              )})
                            )}
                          </Dropdown>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-row items-center text-nowrap justify-between w-full border-b py-1 px-2 min-h-[36px]">
                      <div className="flex flex-row gap-2 items-center">
                        <span>Last Name:</span>
                        <span className="italic">{detectedUser.lastName}</span>
                      </div>
                      {userDetection[0] !== 'unlinked' && (
                          <div className="me-2">
                            <Dropdown
                              inline
                              arrowIcon={false}
                              label={(
                                linkedUserFields?.last !== null && 
                                props.table.columns.some((column) => column.id === linkedUserFields?.last?.[0])
                              ) ? (
                                <HiOutlineLockClosed size={16} className="hover:text-gray-300" />
                              ) : (
                                <HiOutlineLockOpen size={16} className="hover:text-gray-300" />
                              )}
                            >
                              {linkedUserFields?.last !== null &&
                              props.table.columns.some((column) => column.id === linkedUserFields?.last?.[0]) && (
                                <Dropdown.Item
                                  className="bg-gray-200 hover:bg-transparent"
                                  onClick={() => {
                                    const column = props.table.columns.find((column) => column.id === linkedUserFields?.last?.[0])
                                    invariant(column)

                                    const fieldLink: UserFieldLinks = {
                                      ...linkedUserFields === undefined ? {
                                        sitting: null,
                                        email: [detectedUser.email, ''],
                                        first: null,
                                        last: null
                                      } : {
                                        ...linkedUserFields,
                                        last: null,
                                      }
                                    }

                                    linkUserField.mutate({
                                      tableColumn: column,
                                      rowIndex: props.i,
                                      userFieldLinks: fieldLink,
                                      field: 'last',
                                      userProfile: detectedUser,
                                      options: {
                                        logging: true
                                      }
                                    })

                                    setLinkedUserFields(fieldLink)
                                  }}
                                >{props.table.columns.find((column) => column.id === linkedUserFields?.last?.[0])?.header}</Dropdown.Item>
                              )}
                              {filteredColumns.filter((column) => column.type === 'value').length === 0 ? (
                                <Dropdown.Item disabled>No available columns</Dropdown.Item>
                              ) : (filteredColumns.filter((column) => column.type === 'value').map((column) => {
                                return (
                                  <Dropdown.Item
                                    key={column.id}
                                    onClick={() => {
                                      const fieldLink: UserFieldLinks = {
                                        ...linkedUserFields === undefined ? {
                                          last: [column.id, column.values[props.i] === undefined || column.values[props.i] === '' ? 'override' : 'update'],
                                          email: [detectedUser.email, ''],
                                          sitting: null,
                                          first: null
                                        } : {
                                          ...linkedUserFields,
                                          last: [column.id, column.values[props.i] === undefined || column.values[props.i] === '' ? 'override' : 'update'],
                                        }
                                      }

                                      linkUserField.mutate({
                                        tableColumn: column,
                                        rowIndex: props.i,
                                        userFieldLinks: fieldLink,
                                        field: 'last',
                                        userProfile: detectedUser,
                                        options: {
                                          logging: true
                                        }
                                      })

                                      setLinkedUserFields(fieldLink)
                                    }}
                                  >{column.header}</Dropdown.Item>
                                )})
                              )}
                            </Dropdown>
                          </div>
                        )}
                    </div>
                    <div className="flex flex-row items-center text-nowrap justify-between w-full border-b py-1 px-2 min-h-[36px]">
                      <div className="flex flex-row gap-2 items-center">
                        <span>Email:</span>
                        <span className="italic">{detectedUser.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="border mt-2"/>
                  {detectedUser.participant
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((participant, index) => {
                    // TODO: implement admin options to delete participants
                    const linkedParticipant = linkedParticipantFields.find((link) => link.id === participant.id)

                    return (
                      <div key={index}>
                        <div className="px-3">
                          <ParticipantPanel 
                            //removing redundant userEmail
                            participant={{ ...participant, userEmail: ''}}
                            showOptions={{
                              timeslot: true,
                              linkedFields: linkedParticipant ? {
                                participantLinks: linkedParticipant,
                                toggleField: setLinkedParticipantFields,
                                availableOptions: filteredColumns,
                                allColumns: props.table.columns,
                                tags: props.tagData.data ?? [],
                                timeslotQueries: timeslotQueries,
                                rowIndex: props.i,
                                noColumnModification: true
                              } : undefined
                            }}
                          />
                        </div>
                        <div className="border"/>
                      </div>
                    )
                  })}
                </div>
                <div className="flex flex-col mt-2 gap-2">
                  {userDetection[0] === 'unlinked' && (
                    <div className="flex flex-row justify-end gap-2">
                      <button 
                        className="border px-2 py-1 rounded-lg text-xs hover:bg-gray-200 bg-white"
                        onClick={() => {
                          setLinkUserVisible(true)
                        }}
                      >
                        <span>Link User</span>
                      </button>
                      {linkParticipantAvailable && (
                        <button 
                          className="border px-2 py-1 rounded-lg text-xs hover:bg-gray-200 bg-white"
                          onClick={() => {
                            setLinkParticipantVisible(true)
                          }}
                        >
                          <span>Link Participant</span>
                        </button>
                      )}
                    </div>
                  )}
                  {(userDetection[0] === 'temp' || props.tempUsers.some((user) => user.email === userDetection[1])) && (
                    <div className="flex flex-row gap-2 justify-end">
                      <button 
                        className="border px-2 py-1 rounded-lg text-xs hover:bg-gray-200 bg-white"
                        onClick={() => {
                          sendInviteEmail.mutate({
                            profile: detectedUser,
                            baseLink: props.baseLink,
                            options: {
                              logging: true
                            }
                          })
                        }}
                      >
                        <span>Send Invite</span>
                      </button>
                      {detectedUser.temporary !== undefined && (
                        <button 
                          className="border px-2 py-1 rounded-lg text-xs hover:bg-gray-200 bg-white"
                          onClick={() => {
                            navigator.clipboard.writeText(props.baseLink + `?token=${detectedUser.temporary}`)
                          }}
                        >
                          <span>Copy Invite Link</span>
                        </button>
                      )}
                    </div>
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
                      navigator.clipboard.writeText(props.baseLink + `?token=${detectedUser.temporary}`)
                    }}
                  >Copy Invite Link
                  </Dropdown.Item>
                )}
              </>
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