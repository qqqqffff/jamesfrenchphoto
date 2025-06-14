import { Participant, ParticipantFields, UserData, UserFields, UserProfile } from "../types";

export const mapParticipantField = (props: { field: ParticipantFields['type'], participant: Participant }): string => {
  switch(props.field) {
    case "first":
      return props.participant.firstName
    case "preferred":
      return props.participant.preferredName ?? ''
    case "middle":
      return props.participant.middleName ?? ''
    case "last":
      return props.participant.lastName
    default:
      return ''
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
