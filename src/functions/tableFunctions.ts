import { ParticipantFieldLinks, UserFieldLinks } from "../components/modals/LinkUser";
import { Notification, Participant, ParticipantFields, Table, TableColumn, Timeslot, UserData, UserFields, UserProfile, UserTag } from "../types";
import { parsePathName } from "../utils";

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

    //TODO: record based on id for whole table
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
        column.type === 'date'
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
