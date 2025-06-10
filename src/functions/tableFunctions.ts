import { Participant, ParticipantFields, UserFields, UserProfile } from "../types";

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