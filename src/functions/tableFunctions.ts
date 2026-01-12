import { UseMutationResult } from "@tanstack/react-query";
import { ParticipantFieldLinks, UserFieldLinks } from "../components/modals/LinkUser";
import { ColumnColor, Notification, Participant, ParticipantFields, Table, TableColumn, TableGroup, Timeslot, UserData, UserFields, UserProfile, UserTag } from "../types";
import { defaultColumnColors, parsePathName } from "../utils";
import { UpdateParticipantMutationParams, UpdateUserProfileParams } from "../services/userService";
import { Dispatch, SetStateAction } from "react";
import { v4 } from 'uuid'
import { TablePanelNotification } from "../components/admin/table/TablePanel";
import { formatParticipantName, formatUserName } from "./clientFunctions";
import validator from 'validator'
import { isTableGroupData, isTableListData, TableGroupData, TableListData } from "../components/admin/table/TableListData";
import { CreateChoiceParams, DeleteChoiceParams, ReorderTableGroupParams, UpdateChoiceParams } from "../services/tableService";
import { flushSync } from "react-dom";
import { triggerPostMoveFlash } from '@atlaskit/pragmatic-drag-and-drop-flourish/trigger-post-move-flash';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';

export const mapParticipantField = (props: { field: ParticipantFields['type'], participant: Participant }): string => {
  switch(props.field) {
    case "first":
      return props.participant.firstName
    case "preferred":
      return props.participant.preferredName ?? ''
    case "middle":
      return props.participant.middleName ?? ''
    case 'email':
      return props.participant.email ?? ''
    case "last":
      return props.participant.lastName
    default:
      return ''
  }
}

export const reorderRows = (
  order: 'ASC' | 'DSC', 
  column: TableColumn, 
  table: Table, 
  tags: UserTag[], 
  timeslots: Timeslot[], 
  notifications: Notification[]
): Record<string, { values: string[], choices: string[] }> => {
  const values = [...column.values]
  //cherry pick all blank columns
  const filteredBlanks: number[] = [...values]
    .map((v, i) => ({ v: v, i: i}))
    .filter((v) => v.v === '')
    .map((v) => v.i)

  const sortedValues: Record<string, string[]> = order === 'ASC' ? 
    Object.fromEntries(table.columns.map((tableColumn) => [
      tableColumn.id,
      tableColumn.id === column.id ? 
        sortColumnValues(tableColumn, tags, timeslots, notifications) 
      : 
        tableColumn.values
    ]))
  : 
    Object.fromEntries(table.columns.map((tableColumn) => [
      tableColumn.id,
      tableColumn.id === column.id ? 
        sortColumnValues(tableColumn, tags, timeslots, notifications).reverse() 
      : 
        tableColumn.values
    ])
  )
    

  try {
    const sortMapping: { previousIndex: number, newIndex: number }[] = []
    for(let i = 0; i < values.length; i++) {
      if(values[i] === '') continue
      let foundIndex = sortedValues[column.id].findIndex((value) => values[i] === value)
      
      let offset = foundIndex;
      while(
        sortMapping.some((item) => item.newIndex === foundIndex) && 
        offset < sortedValues[column.id].length &&
        foundIndex !== -1
      ) {
        offset++;
        foundIndex = sortedValues[column.id]
          .filter((_, j) => j > offset)
          .findIndex((value) => values[i] === value) + offset
      }

      if(foundIndex === -1) throw new Error('Failed to index sorted array')
      sortMapping.push({ previousIndex: i, newIndex: foundIndex })
    }
    const initialLength = sortMapping.length
    for(let i = 0; i < filteredBlanks.length; i++) {
      sortMapping.push({ previousIndex: filteredBlanks[i], newIndex: initialLength + i })
    }

    const ret: Record<string, { values : string[], choices: string[] }> = Object.fromEntries(table.columns.map((col) => [col.id, { values: [], choices: [] }]))

    for(let i = 0; i < table.columns.length; i++) {
      const currentColumnId = table.columns[i].id
      if(table.columns[i].type === 'choice') {
        ret[currentColumnId].choices = table.columns[i].choices ?? []
      }
      for(let j = 0; j < sortMapping.length; j++) {
        ret[currentColumnId].values[sortMapping[j].newIndex] = currentColumnId === column.id ? 
          values[sortMapping[j].previousIndex] 
        : 
          sortedValues[currentColumnId][sortMapping[j].previousIndex]
        if(table.columns[i].type !== 'choice') {
          ret[currentColumnId].choices[sortMapping[j].newIndex] = (table.columns[i].choices ?? [])?.[sortMapping[j].previousIndex] ?? ''
        }
      }
    }

    return ret
  } catch(e) {
    return {}
  }
}

const createUserArray = (tempUsers: UserProfile[], users: UserData[]): (UserProfile & { temp: boolean})[] => {
  return [
    ...tempUsers.map((profile) => ({ ...profile, temp: true })),
    ...users.map((data) => data.profile).filter((profile) => profile !== undefined).map((profile) => ({ ...profile, temp: false }))
  ].reduce((prev, cur) => {
    if(!prev.some((profile) => profile.email.toLowerCase() === cur.email.toLowerCase())) {
      prev.push(cur)
    }
    return prev
  }, [] as (UserProfile & { temp: boolean })[])
}

const createParticipantArray = (
  userArray?: (UserProfile & { temp: boolean })[],
  tempUsers?: UserProfile[],
  users?: UserData[]
): (Participant & { temp: boolean })[] => {
  const participantArray: (Participant & { temp: boolean })[] = []

  if(userArray) {
    participantArray.push(...userArray.flatMap((profile) => {
      const participant: (Participant & { temp: boolean })[] = profile.participant.map((participant) => ({
        ...participant, 
        temp: profile.temp
      }))
      return participant
    })
    .reduce((prev, cur) => {
      if(!prev.some((participant) => participant.id === cur.id)) {
        prev.push(cur)
      }
      return prev
    }, [] as (Participant & { temp: boolean })[]))
  }
  else if(tempUsers && users) {
    participantArray.push(...createUserArray(tempUsers, users).flatMap((profile) => {
      const participant: (Participant & { temp: boolean })[] = profile.participant.map((participant) => ({
        ...participant, 
        temp: profile.temp
      }))
      return participant
    })
    .reduce((prev, cur) => {
      if(!prev.some((participant) => participant.id === cur.id)) {
        prev.push(cur)
      }
      return prev
    }, [] as (Participant & { temp: boolean })[]))
  }

  return participantArray
}

export const processTableLinks = (
  column: TableColumn, 
  text: string,
  index: number,
  tempUsers: UserProfile[],
  users: UserData[],
  userLinks: UserFieldLinks | undefined,
  participantLinks: ParticipantFieldLinks[],
  mutations: {
    updateUserProfile: UseMutationResult<void, Error, UpdateUserProfileParams, unknown>
    updateParticipant: UseMutationResult<void, Error, UpdateParticipantMutationParams, unknown>
    setTableNotifications: Dispatch<SetStateAction<TablePanelNotification[]>>
    setTempUsers: Dispatch<SetStateAction<UserProfile[]>>
    setUsers: Dispatch<SetStateAction<UserData[]>>
  }
) => {
  const userLink = ((column.choices ?? [])[index] ?? '').includes('userEmail')
  const participantLink = ((column.choices ?? [])[index] ?? '').includes('participantId')

  const field = column.type === 'value' && (participantLink || userLink) ? 
    evaluateField(column.choices?.[index]) : undefined

  const userArray: (UserProfile & { temp: boolean })[] = createUserArray(tempUsers, users)

  const participantArray = createParticipantArray(userArray)

  if(
    (
      tempUsers.some((profile) => profile.email.toLowerCase() === userLinks?.email[0].toLowerCase()) ||
      users.some((user) => user.email.toLowerCase() === userLinks?.email[0].toLowerCase())
    ) &&
    userLink &&
    field !== undefined
  ) {
    const foundUser: UserProfile & { temp: boolean } | undefined = userArray
    .find((profile) => profile.email.toLowerCase() === userLinks?.email[0].toLowerCase())

    if(foundUser === undefined) return

    if(column.id === userLinks?.email[1]) {
      //TODO: figure out how to handle
    }
    else if(userLinks?.first && column.id === userLinks.first[0] && field === 'first') {
      mutations.updateUserProfile.mutateAsync({
        profile: foundUser,
        first: text,
        options: {
          logging: true
        }
      }).then(() => {
        const notificationId = v4()
        mutations.setTableNotifications(prev => [...prev, {
          id: notificationId,
          message: `Successfully updated first name of ${formatUserName({...foundUser, firstName: text})}.`,
          status: 'Success',
          createdAt: new Date(),
          autoClose: setTimeout(() => mutations.setTableNotifications(prev.filter((notification) => notification.id !== notificationId)), 5000)
        }])
      }).catch(() => {
        mutations.setTableNotifications(prev => [...prev, {
          id: v4(),
          message: `Failed to update the first name of ${formatUserName(foundUser)}.`,
          status: 'Error',
          createdAt: new Date(),
          autoClose: null
        }])
      })

      if(foundUser.temp) {
        mutations.setTempUsers(prev => prev.map((profile) => profile.email === foundUser.email ? ({
          ...profile,
          firstName: text
        }) : profile))
      }
      else {
        mutations.setUsers(prev => prev.map((data) => data.email === foundUser.email ? ({
          ...data,
          profile: ({
            ...foundUser,
            firstName: text
          })
        }) : data))
      }
    }
    else if(userLinks?.last && column.id === userLinks.last[0] && field === 'last') {
      mutations.updateUserProfile.mutateAsync({
        profile: foundUser,
        last: text,
        options: {
          logging: true
        }
      }).then(() => {
        const notificationId = v4()
        mutations.setTableNotifications(prev => [...prev, {
          id: notificationId,
          message: `Successfully updated the last name of ${formatUserName({...foundUser, lastName: text})}.`,
          status: 'Success',
          createdAt: new Date(),
          autoClose: setTimeout(() => mutations.setTableNotifications(prev.filter((notification) => notification.id !== notificationId)), 5000)
        }])
      }).catch(() => {
        mutations.setTableNotifications(prev => [...prev, {
          id: v4(),
          message: `Failed to update the last name ${formatUserName(foundUser)}.`,
          status: 'Error',
          createdAt: new Date(),
          autoClose: null
        }])
      })

      if(foundUser.temp) {
        mutations.setTempUsers(prev => prev.map((profile) => profile.email === foundUser.email ? ({
          ...profile,
          lastName: text
        }) : profile))
      }
      else {
        mutations.setUsers(prev => prev.map((data) => data.email === foundUser.email ? ({
          ...data,
          profile: ({
            ...foundUser,
            lastName: text
          })
        }) : data))
      }
    }
    else if(userLinks?.sitting && column.id === userLinks.sitting[0] && field === 'sitting') {
      if(isNaN(Number(text))) {
        mutations.setTableNotifications(prev => [...prev, {
          id: v4(),
          message: `Sitting number must be a number.`,
          status: 'Error',
          createdAt: new Date(),
          autoClose: null
        }])
        return
      }
      mutations.updateUserProfile.mutateAsync({
        profile: foundUser,
        sitting: Number(text),
        options: {
          logging: true
        }
      }).then(() => {
        const notificationId = v4()
        mutations.setTableNotifications(prev => [...prev, {
          id: notificationId,
          message: `Successfully updated the sitting number of ${formatUserName(foundUser)}.`,
          status: 'Success',
          createdAt: new Date(),
          autoClose: setTimeout(() => mutations.setTableNotifications(prev.filter((notification) => notification.id !== notificationId)), 5000)
        }])
      }).catch(() => {
        mutations.setTableNotifications(prev => [...prev, {
          id: v4(),
          message: `Failed to update the sitting number of ${formatUserName(foundUser)}.`,
          status: 'Error',
          createdAt: new Date(),
          autoClose: null
        }])
      })

      if(foundUser.temp) {
        mutations.setTempUsers(prev => prev.map((profile) => profile.email === foundUser.email ? ({
          ...profile,
          sittingNumber: Number(text)
        }) : profile))
      }
      else {
        mutations.setUsers(prev => prev.map((data) => data.email === foundUser.email ? ({
          ...data,
          profile: ({
            ...foundUser,
            sittingNumber: Number(text)
          })
        }) : data))
      }
    }
  }
  else if(participantLink) {
    if(participantLinks.some((link) => link.first && link.first[0] === column.id) && field === 'first') {
      participantLinks.forEach((link) => {
        const foundParticipant = participantArray.find((participant) => participant.id === link.id)
        if(foundParticipant !== undefined) {
          mutations.updateParticipant.mutateAsync({
            participant: foundParticipant,
            firstName: text,
            lastName: foundParticipant.lastName,
            contact: foundParticipant.contact,
            userTags: foundParticipant.userTags,
            options: {
              logging: true
            }
          }).then(() => {
            const notificationId = v4()
            mutations.setTableNotifications(prev => [...prev, {
              id: notificationId,
              message: `Successfully updated the first name of ${formatParticipantName({...foundParticipant, firstName: text})}.`,
              status: 'Success',
              createdAt: new Date(),
              autoClose: setTimeout(() => mutations.setTableNotifications(prev.filter((notification) => notification.id !== notificationId)), 5000)
            }])
          }).catch(() => {
            mutations.setTableNotifications(prev => [...prev, {
              id: v4(),
              message: `Failed to update the first name of ${formatParticipantName(foundParticipant)}.`,
              status: 'Error',
              createdAt: new Date(),
              autoClose: null
            }])
          })
          if(foundParticipant.temp) {
            mutations.setTempUsers(prev => prev.map((profile) => profile.participant.some((participant) => participant.id === foundParticipant.id) ? ({
              ...profile,
              participant: profile.participant.map((participant) => participant.id === foundParticipant.id ? ({
                ...participant,
                firstName: text
              }) : participant)
            }) : profile))
          }
          else {
            mutations.setUsers(prev => prev.map((data) => (
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
    else if(participantLinks.some((link) => link.last && link.last[0] === column.id) && field === 'last') {
      participantLinks.forEach((link) => {
        const foundParticipant = participantArray.find((participant) => participant.id === link.id)
        if(foundParticipant !== undefined) {
          mutations.updateParticipant.mutateAsync({
            participant: foundParticipant,
            lastName: text,
            firstName: foundParticipant.firstName,
            contact: foundParticipant.contact,
            userTags: foundParticipant.userTags,
            options: {
              logging: true
            }
          }).then(() => {
            const notificationId = v4()
            mutations.setTableNotifications(prev => [...prev, {
              id: notificationId,
              message: `Successfully updated the last name of ${formatParticipantName({...foundParticipant, lastName: text})}.`,
              status: 'Success',
              createdAt: new Date(),
              autoClose: setTimeout(() => mutations.setTableNotifications(prev.filter((notification) => notification.id !== notificationId)), 5000)
            }])
          }).catch(() => {
            mutations.setTableNotifications(prev => [...prev, {
              id: v4(),
              message: `Failed to update the last name of ${formatParticipantName(foundParticipant)}.`,
              status: 'Error',
              createdAt: new Date(),
              autoClose: null
            }])
          })
          if(foundParticipant.temp) {
            mutations.setTempUsers(prev => prev.map((profile) => profile.participant.some((participant) => participant.id === foundParticipant.id) ? ({
              ...profile,
              participant: profile.participant.map((participant) => participant.id === foundParticipant.id ? ({
                ...participant,
                lastName: text
              }) : participant)
            }) : profile))
          }
          else {
            mutations.setUsers(prev => prev.map((data) => (
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
    else if(participantLinks.some((link) => link.preferred && link.preferred[0] === column.id) && field === 'preferred') {
      participantLinks.forEach((link) => {
        const foundParticipant = participantArray.find((participant) => participant.id === link.id)
        if(foundParticipant !== undefined) {
          mutations.updateParticipant.mutateAsync({
            participant: foundParticipant,
            lastName: foundParticipant.lastName,
            preferredName: text,
            firstName: foundParticipant.firstName,
            contact: foundParticipant.contact,
            userTags: foundParticipant.userTags,
            options: {
              logging: true
            }
          }).then(() => {
            const notificationId = v4()
            mutations.setTableNotifications(prev => [...prev, {
              id: notificationId,
              message: `Successfully updated the preferred name of ${formatParticipantName({...foundParticipant, preferredName: text})}.`,
              status: 'Success',
              createdAt: new Date(),
              autoClose: setTimeout(() => mutations.setTableNotifications(prev.filter((notification) => notification.id !== notificationId)), 5000)
            }])
          }).catch(() => {
            mutations.setTableNotifications(prev => [...prev, {
              id: v4(),
              message: `Failed to update the preferred name of ${formatParticipantName(foundParticipant)}.`,
              status: 'Error',
              createdAt: new Date(),
              autoClose: null
            }])
          })
          if(foundParticipant.temp) {
            mutations.setTempUsers(prev => prev.map((profile) => profile.participant.some((participant) => participant.id === foundParticipant.id) ? ({
              ...profile,
              participant: profile.participant.map((participant) => participant.id === foundParticipant.id ? ({
                ...participant,
                preferredName: text
              }) : participant)
            }) : profile))
          }
          else {
            mutations.setUsers(prev => prev.map((data) => (
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
    else if(participantLinks.some((link) => link.middle && link.middle[0] === column.id) && field === 'middle') {
      participantLinks.forEach((link) => {
        const foundParticipant = participantArray.find((participant) => participant.id === link.id)
        if(foundParticipant !== undefined) {
          mutations.updateParticipant.mutateAsync({
            participant: foundParticipant,
            middleName: text,
            lastName: foundParticipant.lastName,
            firstName: foundParticipant.firstName,
            contact: foundParticipant.contact,
            userTags: foundParticipant.userTags,
            options: {
              logging: true
            }
          }).then(() => {
            const notificationId = v4()
            mutations.setTableNotifications(prev => [...prev, {
              id: notificationId,
              message: `Successfully updated the middle name of ${formatParticipantName(foundParticipant)}.`,
              status: 'Success',
              createdAt: new Date(),
              autoClose: setTimeout(() => mutations.setTableNotifications(prev.filter((notification) => notification.id !== notificationId)), 5000)
            }])
          }).catch(() => {
            mutations.setTableNotifications(prev => [...prev, {
              id: v4(),
              message: `Failed to update the middle name of ${formatParticipantName(foundParticipant)}.`,
              status: 'Error',
              createdAt: new Date(),
              autoClose: null
            }])
          })
          if(foundParticipant.temp) {
            mutations.setTempUsers(prev => prev.map((profile) => profile.participant.some((participant) => participant.id === foundParticipant.id) ? ({
              ...profile,
              participant: profile.participant.map((participant) => participant.id === foundParticipant.id ? ({
                ...participant,
                middleName: text
              }) : participant)
            }) : profile))
          }
          else {
            mutations.setUsers(prev => prev.map((data) => (
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
    else if(participantLinks.some((link) => link.email && link.email[0] === column.id) && field === 'email') {
      participantLinks.forEach((link) => {
        const foundParticipant = participantArray.find((participant) => participant.id === link.id)
        if(foundParticipant !== undefined) {
          if(!validator.isEmail(text)) {
            mutations.setTableNotifications(prev => [...prev, {
              id: v4(),
              message: `Email must be valid.`,
              status: 'Error',
              createdAt: new Date(),
              autoClose: null
            }])
          }
          mutations.updateParticipant.mutateAsync({
            participant: foundParticipant,
            email: text,
            lastName: foundParticipant.lastName,
            firstName: foundParticipant.firstName,
            contact: foundParticipant.contact,
            userTags: foundParticipant.userTags,
            options: {
              logging: true
            }
          }).then(() => {
            const notificationId = v4()
            mutations.setTableNotifications(prev => [...prev, {
              id: notificationId,
              message: `Successfully updated the email of ${formatParticipantName(foundParticipant)}.`,
              status: 'Success',
              createdAt: new Date(),
              autoClose: setTimeout(() => mutations.setTableNotifications(prev.filter((notification) => notification.id !== notificationId)), 5000)
            }])
          }).catch(() => {
            mutations.setTableNotifications(prev => [...prev, {
              id: v4(),
              message: `Failed to update the email of ${formatParticipantName(foundParticipant)}.`,
              status: 'Error',
              createdAt: new Date(),
              autoClose: null
            }])
          })
          if(foundParticipant.temp) {
            mutations.setTempUsers(prev => prev.map((profile) => profile.participant.some((participant) => participant.id === foundParticipant.id) ? ({
              ...profile,
              participant: profile.participant.map((participant) => participant.id === foundParticipant.id ? ({
                ...participant,
                email: text
              }) : participant)
            }) : profile))
          }
          else {
            mutations.setUsers(prev => prev.map((data) => (
              data.profile && 
              (data.profile?.participant ?? [])
              .some((participant) => participant.id === foundParticipant.id)) 
            ? ({
              ...data,
              profile: ({
                ...data.profile,
                participant: (data.profile?.participant ?? []).map((participant) => participant.id === foundParticipant.id ?({
                  ...participant,
                  email: text
                }) : participant)
              })
            }) : data))
          }
        }
      })
    }
  }
}

export const generateTableLinks = (
  userDetection: [UserDetection, string],
  participantDetection: Participant[],
  table: Table,
  index: number,
  participantFieldLinks: ParticipantFieldLinks[],
  userFieldLinks?: UserFieldLinks,
): [UserFieldLinks, ParticipantFieldLinks[]] => {
  const linkedParticipants = [...participantFieldLinks]
  const linkedUser: UserFieldLinks = userFieldLinks ? {
    ...userFieldLinks
  } : {
    email: ['', ''],
    first: null,
    last: null,
    sitting: null
  }

  //detected participant means that there are participant ids in this row
  //temp or user means the same
  if(
    participantDetection.length > 0 ||
    userDetection[0] === 'temp' ||
    userDetection[0] === 'user'
  ) {
    for(let i = 0; i < table.columns.length; i++) {
      const column = table.columns[i]
      const choice = (column.choices ?? [])?.[index]
      if(choice === undefined || choice === null) continue
      const endIndex = choice.indexOf(',') === -1 ? choice.length : choice.indexOf(',')
      if(choice.includes('participantId:')) {
        const mappedParticipant = choice.substring(choice.indexOf(':') + 1, endIndex)
        const foundParticipant = participantDetection.some((participant) => participant.id === mappedParticipant)
        if(!foundParticipant) continue
        const linkedIndex = linkedParticipants.findIndex((link) => link.id === mappedParticipant)
        let participantIndex = linkedIndex === -1 ? linkedParticipants.length : linkedIndex
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
            notifications: null
          })
        }
        switch(evaluateField(choice)){
          case 'first': {
            linkedParticipants[participantIndex].first = [column.id, 'update']
            break;
          }
          case 'last': {
            linkedParticipants[participantIndex].last = [column.id, 'update']
            break;
          }
          case 'middle': {
            linkedParticipants[participantIndex].middle = [column.id, 'update']
            break;
          }
          case 'preferred': {
            linkedParticipants[participantIndex].preferred = [column.id, 'update']
            break;
          }
          case 'email': {
            linkedParticipants[participantIndex].email = [column.id, 'update']
            break;
          }
          default: {
            if(column.type === 'tag') {
              linkedParticipants[participantIndex].tags = [column.id, 'update']
            }
            else if(column.type === 'date') {
              linkedParticipants[participantIndex].timeslot = [column.id, 'update']
            }
            else if(column.type === 'notification') {
              linkedParticipants[participantIndex].notifications = [column.id, 'update']
            }
            break;
          }
        }
      }
      else if(choice.includes('userEmail:')) {
        const mappedUser = choice.substring(choice.indexOf(':') + 1, endIndex)
        if(userDetection[1] !== mappedUser && linkedUser.email[0] !== '') {
          continue
        }

        const field = evaluateField(choice)

        if(
          linkedUser.email[0] === '' && 
          userDetection[1] === mappedUser &&
          field === 'email'
        ) {
          linkedUser.email = [mappedUser, column.id]
        }
        else if(
          linkedUser.first === null &&
          field === 'first'
        ) {
          linkedUser.first = [column.id, 'update']
        }
        else if(
          linkedUser.last === null &&
          field === 'last'
        ) {
          linkedUser.last = [column.id, 'update']
        }
        else if(
          linkedUser.sitting === null &&
          field === 'sitting'
        ) {
          linkedUser.sitting = [column.id, 'update']
        }
      }
    }
  }


  return [linkedUser, linkedParticipants]
}

const evaluateField = (choice: string | undefined): 'first' | 'last' | 'sitting' | 'email' | 'preferred' | 'middle' | undefined => {
  if(!choice) return undefined
  const field = choice.substring(choice.indexOf(',') + 1)
  switch(field) {
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
}

type UserDetection = 'user' | 'temp' | 'potential' | 'unlinked' | 'false'


export const tableUserDetection = (
  table: Table,
  row: [string, TableColumn['type'], string][],
  index: number,
  tempUsers: UserProfile[],
  users: UserData[]
) : [UserDetection, string] => {
  for(let i = 0; i < table.columns.length; i++) {
    const choice = ((table.columns[i].choices ?? [])?.[index] ?? '')
      
    const foundUser = choice.includes('userEmail:')
    const endIndex = choice.indexOf(',') === -1 ? choice.length : choice.indexOf(',')
    if(foundUser) {
      const userEmail = choice.substring(choice.indexOf(':') + 1, endIndex)
      const foundTemp = tempUsers.find((user) => user.email === userEmail)
      if(foundTemp) {
        return ['temp', foundTemp.email]
      }
      const foundUser = users.find((user) => user.email === userEmail)
      if(foundUser) {
        return ['user', foundUser.email]
      }
    }
  }
  for(let i = 0; i < row.length; i++) {
    const foundColumn = table.columns.find((column) => column.id == row[i][2])
    if(!foundColumn) continue
    const normalHeader = foundColumn.header.toLocaleLowerCase()
    const normalizedValue = row[i][0].toLocaleLowerCase()
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
        users.some((user) => user.email.toLocaleLowerCase() === normalizedValue) ||
        tempUsers.some((temp) => temp.email.toLocaleLowerCase() === normalizedValue)
      ) {
        return ['unlinked', row[i][0]]
      }
      return ['potential', row[i][0]]
    }
  }
  return ['false', '']
}

export const tableParticipantDetection = (
  table: Table,
  index: number,
  tempUsers: UserProfile[],
  users: UserData[]
): Participant[] => {
  const participants: Participant[] = []
  const participantMap = createParticipantArray(undefined, tempUsers, users)

  for(let i = 0; i < table.columns.length; i++) {
    const column = table.columns[i]
    const choice = ((column.choices ?? [])?.[index] ?? '')
    const participantMapping = choice.includes('participantId:')
    const endIndex = choice.indexOf(',') === -1 ? choice.length : choice.indexOf(',')
    if(participantMapping) {
      const participantId = choice.substring(choice.indexOf(':') + 1, endIndex)
      const foundParticipant = participantMap.find((participant) => participant.id === participantId)
      if(foundParticipant && !participants.some((participant) => participant.id === foundParticipant.id)) {
        participants.push(foundParticipant)
      }
    }
  }

  return participants
}

export const rowLinkParticipantAvailable = (
  userDetection: [UserDetection, string],
  row: [string, TableColumn['type'], string][],
  table: Table,
  index: number,
  data: {
    tags: UserTag[],
    timeslots: Timeslot[],
    notifications: Notification[]
  }
): Participant | undefined => {
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
    let foundTimeslots: Timeslot[] = []
    let foundNotifications: Notification[] = []

    for(let i = 0; i < row.length; i++) {
      const foundColumn = table.columns.find((column) => column.id === row[i][2])
      if(
        !foundColumn || 
        ((foundColumn.choices ?? [])?.[index] ?? '').includes('participantId:')
      ) continue;
      const normalHeader = foundColumn.header.toLocaleLowerCase()
      if(
        foundColumn.type === 'value' &&
        (
          normalHeader.includes('participant') ||
          normalHeader.includes('duchess') ||
          normalHeader.includes('deb') ||
          normalHeader.includes('escort') ||
          normalHeader.includes('daughter') ||
          normalHeader.includes('son') ||
          normalHeader.includes('child')
        )
      ) {
        if(
          normalHeader.includes('first') &&
          row[i][0] !== ''
        ) {
          foundFirst = row[i][0]
        }
        else if(
          normalHeader.includes('last') &&
          row[i][0] !== ''
        ) {
          foundLast = row[i][0]
        }
        else if(
          normalHeader.includes('middle') &&
          row[i][0] !== ''
        ) {
          foundMiddle = row[i][0]
        }
        else if(
          normalHeader.includes('prefer') &&
          row[i][0] !== ''
        ) {
          foundPreferred = row[i][0]
        }
        else if(
          normalHeader.includes('email') &&
          validator.isEmail(row[i][0])
        ) {
          foundEmail = row[i][0]
        }
      }
      else if(foundColumn.type === 'tag') {
        const value = foundColumn.values[index]
        const cellTags = (value.split(',') ?? [])
        .filter((tag) => tag !== '')
        .reduce((prev, tag) => {
          const foundTag = data.tags.find((uTag) => tag === uTag.id)
          if(foundTag !== undefined && !foundTags.some((uTag) => uTag.id === tag)) {
            prev.push(foundTag)
          }
          return prev
        }, [] as UserTag[])

        foundTags.push(...cellTags)
      }
      else if(foundColumn.type === 'date') {
        const value = foundColumn.values[index]
        const timeslots = (value.split(',') ?? [])
        .filter((timeslot) => timeslot !== '')
        .reduce((prev, timeslot) => {
          const foundTimeslot = data.timeslots.find((ts) => timeslot === ts.id)
          if(foundTimeslot !== undefined && !foundTimeslots.some((ts) => ts.id === timeslot)) {
            prev.push(foundTimeslot)
          }
          return prev
        }, [] as Timeslot[])

        foundTimeslots.push(...timeslots)
      }
      else if(foundColumn.type === 'notification') {
        const value = foundColumn.values[index]
        const cellNotification = data.notifications.find((notification) => notification.id === value)
        if(
          cellNotification !== undefined && 
          !foundNotifications.some((notification) => notification.id === cellNotification.id)
        ) {
          foundNotifications.push(cellNotification)
        }
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
        notifications: foundNotifications,
        timeslot: foundTimeslots,
        collections: [],
      }
      return participant
    }
  }
  return undefined
}

export const sortColumnValues = (
  column: TableColumn, 
  tags: UserTag[], 
  timeslots: Timeslot[], 
  notifications: Notification[]
): string[] => {
  return [...column.values]
    .filter((v) => v !== '')
    .sort((a, b) => {
      if(column.type === 'tag') {
        let tagValueA = a.split(',')
          .map((tagId) => tags.find((tag) => tag.id === tagId)?.name)
          .filter((tagName) => tagName !== undefined)
          .sort((c, d) => c.localeCompare(d))
          .reduce((prev, cur) => prev + ',' + cur, '')
        tagValueA = tagValueA.charAt(0) === ',' ? tagValueA.substring(1) : tagValueA

        let tagValueB = a.split(',')
          .map((tagId) => tags.find((tag) => tag.id === tagId)?.name)
          .filter((tagName) => tagName !== undefined)
          .sort((c, d) => c.localeCompare(d))
          .reduce((prev, cur) => prev + ',' + cur, '')
        tagValueB = tagValueB.charAt(0) === ',' ? tagValueB.substring(1) : tagValueB

        
        //higher number of tags is sorted first
        const commasA = a.split('').filter((char) => char === ',')
        const commasB = b.split('').filter((char) => char === ',')
        if(commasA.length < commasB.length) return -1
        else if(commasB.length > commasA.length) return 1
        if(commasA.length === 0 && commasB.length === 0) return 0
        else {
          const splitA = tagValueA.split(',')
          const splitB = tagValueB.split(',')
          let index = 0
          for(index; index < splitA.length && index < splitB.length; index++) {
            if(splitA[index].localeCompare(splitB[index]) !== 0) break
          }
          index = splitA.length >= index ? index - 1 : index
          return splitA[index].localeCompare(splitB[index])
        }
      }
      else if(column.type === 'date') {
        const commasA = a.split(',')
          .map((timeslotId) => timeslots.find((timeslot) => timeslot.id === timeslotId))
          .filter((timeslot) => timeslot !== undefined)
          .sort((a, b) => a.start.getTime() - b.start.getTime())
        const commasB = a.split(',')
          .map((timeslotId) => timeslots.find((timeslot) => timeslot.id === timeslotId))
          .filter((timeslot) => timeslot !== undefined)
          .sort((a, b) => a.start.getTime() - b.start.getTime())

        let index = 0
        while(
          commasA[index]?.start !== undefined && 
          commasB[index]?.start !== undefined &&
          commasA[index].start.getTime() === commasB[index].start.getTime() && 
          index < commasA.length && 
          index < commasB.length
        ) {
          index++
        }
        if(commasA[index]?.start === undefined && commasB[index]?.start === undefined) return 0
        else if(commasA[index]?.start === undefined) return 1
        else if(commasB[index]?.start === undefined) return -1
        else if(commasA[index].start.getTime() < commasB[index].start.getTime()) {
          return -1
        }
        else if(commasA[index].start.getTime() > commasB[index].start.getTime()) {
          return 1
        }
        return 0
      }
      else if(column.type === 'notification') {
        const foundNotificationA = notifications.find((notification) => notification.id === a)
        const foundNotificationB = notifications.find((notification) => notification.id === b)

        if(!foundNotificationA && !foundNotificationB) return 0
        else if(!foundNotificationA && foundNotificationB) return 1
        else if(foundNotificationA && !foundNotificationB) return -1
        else if(foundNotificationA && foundNotificationB) {
          return foundNotificationA.content.localeCompare(foundNotificationB.content)
        }
      }
      else if(column.type === 'file') {
        return parsePathName(a).localeCompare(parsePathName(b))
      }
      //fine for choice and value columns
      return a.localeCompare(b)
    })
}

export const rowUnlinkAvailable = (participantLinks: ParticipantFieldLinks[], userLinks: UserFieldLinks | undefined, columns: TableColumn[]): boolean => {
  return participantLinks.some((link) => (
    (link.email !== null && columns.some((column) => column.id === link.email?.[0])) || 
    (link.first !== null && columns.some((column) => column.id === link.first?.[0])) ||
    (link.last !== null && columns.some((column) => column.id === link.last?.[0])) ||
    (link.middle !== null && columns.some((column) => column.id === link.middle?.[0])) ||
    (link.preferred !== null && columns.some((column) => column.id === link.preferred?.[0])) ||
    (link.notifications !== null && columns.some((column) => column.id === link.notifications?.[0]))  ||
    (link.tags !== null && columns.some((column) => column.id === link.tags?.[0])) ||
    (link.timeslot !== null && columns.some((column) => column.id === link.timeslot?.[0]))
  )) || userLinks !== undefined && (
    (userLinks.email !== null && columns.some((column) => column.id === userLinks.email?.[1])) || 
    (userLinks.first !== null && columns.some((column) => column.id === userLinks.first?.[0])) ||
    (userLinks.last !== null && columns.some((column) => column.id === userLinks.last?.[0])) ||
    (userLinks.sitting !== null && columns.some((column) => column.id === userLinks.sitting?.[0]))
  )
}

export const possibleLinkDetection = (userProfile: UserProfile, rowIndex: number, tableColumns: TableColumn[]): ({ userLinks: UserFieldLinks, participantLinks: ParticipantFieldLinks[] }) => {
  const linkedUser: UserFieldLinks = {
    email: [userProfile.email, ''],
    first: null,
    last: null,
    sitting: null
  }

  const linkedParticipants: ParticipantFieldLinks[] = userProfile.participant.map((participant) => {
    return ({
      id: participant.id,
      first: null,
      last: null,
      middle: null,
      preferred: null,
      email: null,
      tags: null,
      timeslot: null,
      notifications: null,
    })
  })

  for(let i = 0; i < tableColumns.length; i++) {
    const column = tableColumns[i]
    const foundChoice = (column.choices ?? [])?.[rowIndex]
    //skip if mapping already exits for this column
    if(foundChoice !== undefined && foundChoice !== null && (foundChoice.includes('userEmail') || foundChoice.includes('participantId'))) continue
    const normalHeader = column.header.toLocaleLowerCase()
    if(
      column.type === 'value' &&
      !(
        normalHeader.includes('participant') || 
        normalHeader.includes('duchess') || 
        normalHeader.includes('deb') || 
        normalHeader.includes('escort') ||
        normalHeader.includes('daughter') ||
        normalHeader.includes('son') ||
        normalHeader.includes('child')
      )
    ) {
      if(
        normalHeader.includes('first') &&
        linkedUser.first === null
      ) {
        linkedUser.first = [
          column.id, 
          column.values[rowIndex] === '' ? 'override' : 'update'
        ]
      }
      else if(
        normalHeader.includes('last') &&
        linkedUser.last === null
      ) {
        linkedUser.last = [
          column.id, 
          column.values[rowIndex] === '' ? "override" : 'update'
        ]
      }
      else if(
        normalHeader.includes('sitting') &&
        linkedUser.sitting === null
      ) {
        linkedUser.sitting = [
          column.id, 
          column.values[rowIndex] === '' ? 'override' : 'update'
        ]
      }
      else if(
        normalHeader.includes('email') &&
        linkedUser.email[0] === column.values[rowIndex] &&
        linkedUser.email[1] === ''
      ) {
        linkedUser.email = [linkedUser.email[0], column.id]
      }
    }
    else if(
      (
        normalHeader.includes('participant') || 
        normalHeader.includes('duchess') || 
        normalHeader.includes('deb') || 
        normalHeader.includes('escort') ||
        column.type === 'tag' ||
        column.type === 'date' ||
        column.type === 'notification' 
      ) &&
      linkedParticipants.length > 0
    ) {
      if(
        normalHeader.includes('first') &&
        linkedParticipants[0].first === null
      ) {
        linkedParticipants[0].first = [
          column.id, 
          column.values[rowIndex] === '' ? 'override' : 'update'
        ]
      }
      else if(
        normalHeader.includes('last') &&
        linkedParticipants[0].last === null
      ) {
        linkedParticipants[0].last = [
          column.id, 
          column.values[rowIndex] === '' ? 'override' : 'update'
        ]
      }
      else if(
        normalHeader.includes('middle') &&
        linkedParticipants[0].middle === null
      ) {
        linkedParticipants[0].middle = [
          column.id, 
          column.values[rowIndex] === '' ? 'override' : 'update'
        ]
      }
      else if(
        normalHeader.includes('prefer') &&
        linkedParticipants[0].preferred === null
      ) {
        linkedParticipants[0].preferred = [
          column.id, 
          column.values[rowIndex] === '' ? 'override' : 'update'
        ]
      }
      else if(
        normalHeader.includes('email') &&
        linkedParticipants[0].email === null
      ) {
        linkedParticipants[0].email = [
          column.id, 
          column.values[rowIndex] === '' ? 'override' : 'update'
        ]
      }
      else if(
        column.type === 'tag' &&
        linkedParticipants[0].tags === null
      ) {
        linkedParticipants[0].tags = [
          column.id,
          column.values[rowIndex] === '' ? 'override' : 'update'
        ]
      }
      else if(
        column.type === 'date' &&
        linkedParticipants[0].timeslot === null
      ) {
        linkedParticipants[0].timeslot = [
          column.id,
          column.values[rowIndex] === '' ? 'override' : 'update'
        ]
      }
      else if(
        column.type === 'notification' &&
        linkedParticipants[0].notifications === null
      ) {
        linkedParticipants[0].notifications = [
          column.id,
          column.values[rowIndex] === '' ? 'override' : 'update'
        ]
      }
    }
  }

  return {
    userLinks: linkedUser,
    participantLinks: linkedParticipants
  }
}

export const mapUserField = (props: { field: UserFields['type'], user: UserProfile }): string => {
  switch(props.field) {
    case "first":
      return props.user.firstName ?? ''
    case "last":
      return props.user.lastName ?? ''
    case 'sitting':
      return String(props.user.sittingNumber) ?? ''
    default:
      return ''
  }
}

export const validateMapField = (field: string, participant?: { participant: Participant, value: string }, user?: { user: UserData, value: string }): [
  UserFields['type'] | ParticipantFields['type'] | null, 
  Participant | UserData | undefined
] => {
  switch(field) {
    case 'first':
      return [
        'first',
        participant ? {
          ...participant.participant,
          firstName: participant.value
        } : user ? {
          ...user.user,
          first: user.value,
          profile: {
            ...user.user.profile,
            firstName: user.value,
            sittingNumber: user.user.profile?.sittingNumber ?? -1,
            email: user.user.email,
            userTags: [],
            preferredContact: user.user.profile?.preferredContact ?? 'EMAIL',
            participant: user.user.profile?.participant ?? []
          }
        } : undefined
      ]
    case 'middle':
      return [
        'middle',
        participant ? {
          ...participant.participant,
          middleName: participant.value
        } : undefined
      ]
    case 'preferred':
      return [
        'preferred',
        participant ? {
          ...participant.participant,
          preferredName: participant.value
        } : undefined
      ]
    case 'sitting':
      return [
        'sitting',
        user ? {
          ...user.user,
          profile: {
            ...user.user.profile,
            firstName: user.value,
            sittingNumber: !isNaN(parseInt(user.value)) ? parseInt(user.value) : user.user.profile?.sittingNumber ?? -1,
            email: user.user.email,
            userTags: [],
            preferredContact: user.user.profile?.preferredContact ?? 'EMAIL',
            participant: user.user.profile?.participant ?? []
          }
        } : undefined
      ]
    case 'last':
      return [
        'last',
        participant ? {
          ...participant.participant,
          lastName: participant.value
        } : user ? {
          ...user.user,
          last: user.value,
          profile: {
            ...user.user.profile,
            lastName: user.value,
            sittingNumber: user.user.profile?.sittingNumber ?? -1,
            email: user.user.email,
            userTags: [],
            preferredContact: user.user.profile?.preferredContact ?? 'EMAIL',
            participant: user.user.profile?.participant ?? []
          }
        } : undefined
      ]
    default:
      return [null, undefined]
  }
}

export const tableItemOnDrop = (props: {
  sourceData: TableListData,
  targetData: TableListData | TableGroupData,
  tableGroups: TableGroup[],
  selectedTable?: Table
  mutations: {
    parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>,
    parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>,
    parentUpdateSelectedTable: Dispatch<SetStateAction<Table | undefined>>,
    reorderTables: UseMutationResult<void, Error, ReorderTableGroupParams, unknown>
  }
}) => {
  const foundTargetGroup = isTableListData(props.targetData) ? 
    props.tableGroups.find((group) => group.tables.some((table) => table.id === (props.targetData as TableListData).tableId))
  :
    props.tableGroups.find((group) => group.id === (props.targetData as TableGroupData).tableGroupId)

  if(!foundTargetGroup) return

  const sourceTableGroup = props.tableGroups.find((group) => group.tables.some((table) => table.id === props.sourceData.tableId))
  if(!sourceTableGroup) return

  if(isTableGroupData(props.targetData)) {
    const foundTable = sourceTableGroup.tables.find((table) => table.id === props.sourceData.tableId)
    if(!foundTable) return

    foundTable.order = foundTargetGroup.tables.length
    foundTable.tableGroupId = foundTargetGroup.id

    if(sourceTableGroup.id === props.targetData.tableGroupId) return

    const updatedTargetTables: Table[] = [...foundTargetGroup.tables, foundTable]
    const updatedSourceTables: Table[] = sourceTableGroup.tables
    .filter((table) => table.id !== props.sourceData.tableId)
    .sort((a, b) => a.order - b.order)
    .map((table, index) => ({ ...table, order: index }))

    flushSync(() => {
      const updateGroups = (prev: TableGroup[]) => prev.map((parentGroup) => {
        if(parentGroup.id === foundTargetGroup.id) {
          return {
            ...parentGroup,
            tables: updatedTargetTables
          }
        }
        else if(parentGroup.id === sourceTableGroup.id) {
          return {
            ...parentGroup,
            tables: updatedSourceTables
          }
        }
        return parentGroup
      })

      props.mutations.reorderTables.mutate({
        tables: updatedTargetTables,
        originalTables: foundTargetGroup.tables,
        options: {
          logging: true
        }
      })

      props.mutations.reorderTables.mutate({
        tables: updatedSourceTables,
        originalTables: sourceTableGroup.tables,
        options: {
          logging: true
        }
      })

      props.mutations.parentUpdateSelectedTableGroups((prev) => updateGroups(prev))
      props.mutations.parentUpdateTableGroups((prev) => updateGroups(prev))
      props.mutations.parentUpdateSelectedTable((prev) => prev?.id === foundTable.id ? foundTable : prev)
    })

    const element = document.querySelector(`[data-table-list-id="${props.sourceData.tableId}"]`)
    if(element instanceof HTMLElement) {
      triggerPostMoveFlash(element)
    }
    return
  }

  else if(sourceTableGroup.id !== foundTargetGroup.id) {
    const tables = foundTargetGroup.tables.sort((a, b) => a.order - b.order)
    const indexOfTarget = tables.findIndex((table) => table.id === (props.targetData as TableListData).tableId)
    const foundTable = sourceTableGroup.tables.find((table) => table.id === props.sourceData.tableId)
    if(indexOfTarget === -1 || foundTable === undefined) return
    const closestEdgeOfTarget = extractClosestEdge(props.targetData)

    const updatedTables: Table[] = []
    const updatedSourceTables: Table[] = sourceTableGroup.tables
    .filter((table) => table.id !== props.sourceData.tableId)
    .sort((a, b) => a.order - b.order)
    .map((table, index) => ({ ...table, order: index }))

    for(let i = 0; i < indexOfTarget + (closestEdgeOfTarget === 'top' ? 0 : 1); i++) {
      updatedTables.push({
        ...tables[i],
        order: i
      })
    }
    updatedTables.push({
      ...foundTable,
      order: indexOfTarget,
      tableGroupId: foundTargetGroup.id
    })
    for(let i = indexOfTarget + (closestEdgeOfTarget === 'top' ? 0 : 1); i < tables.length; i++) {
      updatedTables.push({
        ...tables[i],
        order: i
      })
    }

    flushSync(() => {
      const updateGroup = (prev: TableGroup[]) => prev.map((parentGroup) => {
        if(parentGroup.id === foundTargetGroup.id) {
          return ({
            ...parentGroup,
            tables: updatedTables
          })
        }
        else if(parentGroup.id === sourceTableGroup.id) {
          return ({
            ...parentGroup,
            tables: updatedSourceTables
          })
        }
        return parentGroup
      })

      props.mutations.reorderTables.mutate({
        tables: updatedTables,
        originalTables: foundTargetGroup.tables,
        options: {
          logging: true
        }
      })

      props.mutations.reorderTables.mutate({
        tables: updatedSourceTables,
        originalTables: sourceTableGroup.tables,
        options: {
          logging: true
        }
      })

      const selectedTable = updatedTables.find((table) => table.id === props.sourceData.tableId)
      props.mutations.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
      props.mutations.parentUpdateTableGroups((prev) => updateGroup(prev))
      props.mutations.parentUpdateSelectedTable((prev) => selectedTable?.id === prev?.id ? selectedTable : prev)
    })

    const element = document.querySelector(`[data-table-list-id="${props.sourceData.tableId}"]`)
    if(element instanceof HTMLElement) {
      triggerPostMoveFlash(element)
    }
    return
  }
  
  else {
    const tables = foundTargetGroup.tables.sort((a, b) => a.order - b.order)
    const indexOfSource = tables.findIndex((table) => table.id === props.sourceData.tableId)
    const indexOfTarget = tables.findIndex((table) => table.id === (props.targetData as TableListData).tableId)

    if(indexOfSource === -1 || indexOfTarget === -1 || indexOfSource === indexOfTarget) {
      return
    }

    const closestEdgeOfTarget = extractClosestEdge(props.targetData)

    const updatedTables: Table[] = []

    for(let i = 0; i < indexOfTarget + (closestEdgeOfTarget === 'top' ? 0 : 1); i++) {
      if(i === indexOfSource) continue
      updatedTables.push({
        ...tables[i],
        order: i
      })
    }
    updatedTables.push({
      ...tables[indexOfSource],
      order: indexOfTarget
    })
    for(let i = indexOfTarget + (closestEdgeOfTarget === 'top' ? 0 : 1); i < tables.length; i++) {
      if(i === indexOfSource) continue
      updatedTables.push({
        ...tables[i],
        order: i
      })
    }

    flushSync(() => {
      const updateGroup = (prev: TableGroup[]) => prev.map((parentGroup) => parentGroup.id === foundTargetGroup.id ? ({
        ...parentGroup,
        tables: updatedTables
      }) : parentGroup)

      props.mutations.reorderTables.mutate({
        tables: updatedTables,
        originalTables: foundTargetGroup.tables,
        options: {
          logging: true
        }
      })

      const selectedTable = updatedTables.find((table) => table.id === props.sourceData.tableId)
      props.mutations.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
      props.mutations.parentUpdateTableGroups((prev) => updateGroup(prev))
      props.mutations.parentUpdateSelectedTable((prev) => selectedTable?.id === prev?.id ? selectedTable : prev)
    })

    const element = document.querySelector(`[data-table-list-id="${props.sourceData.tableId}"]`)
    if(element instanceof HTMLElement) {
      triggerPostMoveFlash(element)
    }
  } 
}

export const updateChoices = (props: {
  table: Table,
  id: string, 
  data: { choice: string, color: string, customColor?: [string, string], id?: string }, 
  mode: 'create' | 'delete' | 'update'
  mutations: {
    createChoice: UseMutationResult<void, Error, CreateChoiceParams, unknown>
    updateChoice: UseMutationResult<void, Error, UpdateChoiceParams, unknown>
    deleteChoice: UseMutationResult<void, Error, DeleteChoiceParams, unknown>
    setTableNotification: Dispatch<SetStateAction<TablePanelNotification[]>>
    parentUpdateSelectedTableGroups: Dispatch<SetStateAction<TableGroup[]>>
    parentUpdateTableGroups: Dispatch<SetStateAction<TableGroup[]>>
    parentUpdateTable: Dispatch<SetStateAction<Table | undefined>>
    parentUpdateTableColumns: Dispatch<SetStateAction<TableColumn[]>>
  }
}) => {
    const column = props.table.columns.find((column) => column.id === props.id)
    
    if(!column){
      return
    } 

    if(props.mode === 'create') {
      const tempColor: ColumnColor = {
        id: v4(),
        textColor: props.data.customColor !== undefined ? props.data.customColor[0] : defaultColumnColors[props.data.color].text,
        bgColor: props.data.customColor !== undefined ? props.data.customColor[1] : defaultColumnColors[props.data.color].bg,
        value: props.data.choice,
        columnId: column.id,
      }

      props.mutations.createChoice.mutateAsync({
        column: column,
        colorId: tempColor.id,
        choice: props.data.choice,
        color: props.data.color,
        customColor: props.data.customColor,
        options: {
          logging: true
        }
      }).then(() => {
        const notificationId = v4()
        props.mutations.setTableNotification(prev => [...prev, {
          id: notificationId,
          message: `Successfully created new choice: ${props.data.choice}`,
          status: 'Success',
          createdAt: new Date(),
          autoClose: setTimeout(() => props.mutations.setTableNotification(prev => prev.filter((notification) => notification.id !== notificationId)), 5000)
        }])
      }).catch(() => {
        props.mutations.setTableNotification(prev => [...prev, {
          id: v4(),
          message: `Failed to create new choice: ${props.data.choice}.`,
          status: 'Error',
          createdAt: new Date(),
          autoClose: null
        }])
      })

      const temp: Table = {
        ...props.table,
        columns: props.table.columns.map((parentColumn) => {
          if(parentColumn.id === column.id) {
            return {
              ...parentColumn,
              choices: [...(parentColumn.choices ?? []), props.data.choice],
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

      props.mutations.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
      props.mutations.parentUpdateTableGroups((prev) => updateGroup(prev))
      props.mutations.parentUpdateTable(temp)
      props.mutations.parentUpdateTableColumns(temp.columns)
    }
    else if(
      props.mode === 'delete' && 
      props.data.id !== undefined && 
      (column.color ?? []).some((choice) => choice.id === props.data.id) &&
      (column.choices ?? []).some((choice) => choice === props.data.choice)
    ) {
      const foundChoice = (column.color ?? []).find((choice) => choice.id === props.data.id)
      if(foundChoice === undefined) {
        props.mutations.setTableNotification(prev => [...prev, {
          id: v4(),
          message: `Failed to delete choice: ${props.data.choice}.`,
          status: 'Error',
          createdAt: new Date(),
          autoClose: null
        }])
        return
      }
      const updatedChoices = (column.choices ?? []).filter((choice) => choice !== foundChoice.value)
      const previousChoice = foundChoice.value
      //data.choice => color id
      props.mutations.deleteChoice.mutateAsync({
        columnId: column.id,
        choiceId: props.data.choice,
        choices: updatedChoices,
        tableValues: column.values.map((value => value === previousChoice ? '' : value)), 
        options: {
          logging: true
        }
      }).then(() => {
        const notificationId = v4()
        props.mutations.setTableNotification(prev => [...prev, {
          id: notificationId,
          message: `Successfully deleted choice: ${props.data.choice}`,
          status: 'Success',
          createdAt: new Date(),
          autoClose: setTimeout(() => props.mutations.setTableNotification(prev => prev.filter((notification) => notification.id !== notificationId)), 5000)
        }])
      }).catch(() => {
        props.mutations.setTableNotification(prev => [...prev, {
          id: v4(),
          message: `Failed to delete choice: ${props.data.choice}.`,
          status: 'Error',
          createdAt: new Date(),
          autoClose: null
        }])
      })

      const temp: Table = {
        ...props.table,
        columns: props.table.columns.map((parentColumn) => (parentColumn.id === column.id ? ({
          ...parentColumn,
          choices: updatedChoices,
          values: parentColumn.values.map((value) => (value === previousChoice ? '' : value))
        }) : parentColumn))
      }

      const updateGroup = (prev: TableGroup[]) => prev.map((group) => group.id === temp.tableGroupId ? ({
        ...group,
        tables: group.tables.map((table) => (table.id === temp.id ? temp : table))
      }) : group)

      props.mutations.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
      props.mutations.parentUpdateTableGroups((prev) => updateGroup(prev))
      props.mutations.parentUpdateTable(temp)
      props.mutations.parentUpdateTableColumns(temp.columns)
    }
    else if(
      props.mode === 'update' && 
      props.data.id && 
      (column.color ?? []).some((choice) => choice.id === props.data.id)
    ) {
      const foundChoice = (column.color ?? []).find((choice) => choice.id === props.data.id)
      if(foundChoice === undefined) {
        props.mutations.setTableNotification(prev => [...prev, {
          id: v4(),
          message: `Failed to update choice: ${props.data.choice}.`,
          status: 'Error',
          createdAt: new Date(),
          autoClose: null
        }])
        return
      }
      const choiceIndex = (column.choices ?? []).findIndex((choice) => choice === foundChoice.value)
      if(choiceIndex === -1) {
        props.mutations.setTableNotification(prev => [...prev, {
          id: v4(),
          message: `Failed to update choice: ${props.data.choice}.`,
          status: 'Error',
          createdAt: new Date(),
          autoClose: null
        }])
        return
      }
      const updatedChoices = [...(column.choices ?? [])]
      const previousChoice = updatedChoices[choiceIndex]
      updatedChoices[choiceIndex] = props.data.choice

      props.mutations.updateChoice.mutateAsync({
        column: { ...column, choices: updatedChoices },
        choice: foundChoice,
        color: props.data.color,
        customColor: props.data.customColor,
        tableValues: column.values.map((value => value === previousChoice ? props.data.choice : value)),
        value: props.data.choice,
        options: {
          logging: true
        }
      }).then(() => {
        const notificationId = v4()
        props.mutations.setTableNotification(prev => [...prev, {
          id: notificationId,
          message: `Successfully updated choice: ${props.data.choice}`,
          status: 'Success',
          createdAt: new Date(),
          autoClose: setTimeout(() => props.mutations.setTableNotification(prev => prev.filter((notification) => notification.id !== notificationId)), 5000)
        }])
      }).catch(() => {
        props.mutations.setTableNotification(prev => [...prev, {
          id: v4(),
          message: `Failed to update choice: ${props.data.choice}.`,
          status: 'Error',
          createdAt: new Date(),
          autoClose: null
        }])
      })

      const temp: Table = {
        ...props.table,
        columns: props.table.columns.map((parentColumn) => (parentColumn.id === column.id ? ({
          ...parentColumn,
          choices: updatedChoices,
          values: parentColumn.values.map((value) => (value === previousChoice ? props.data.choice : value))
        }) : parentColumn))
      }

      const updateGroup = (prev: TableGroup[]) => prev.map((group) => group.id === temp.tableGroupId ? ({
        ...group,
        tables: group.tables.map((table) => (table.id === temp.id ? temp : table))
      }) : group)

      props.mutations.parentUpdateSelectedTableGroups((prev) => updateGroup(prev))
      props.mutations.parentUpdateTableGroups((prev) => updateGroup(prev))
      props.mutations.parentUpdateTable(temp)
      props.mutations.parentUpdateTableColumns(temp.columns)
    }
  }
