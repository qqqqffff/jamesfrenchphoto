import { ParticipantFieldLinks, UserFieldLinks } from "../components/modals/LinkUser";
import { Participant, ParticipantFields, TableColumn, UserData, UserFields, UserProfile } from "../types";

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
