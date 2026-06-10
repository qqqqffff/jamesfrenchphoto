import { Participant, PhotoCollection, UserProfile, UserTag } from "../types";

export const getUserCollectionList = (collections?: PhotoCollection[], tags?: UserTag[]) => {
  return [
    ...(collections ?? []),
    ...(tags?.flatMap((tag) => tag.collections ?? []) ?? [])
  ].reduce((prev, cur) => {
    if(!prev.some((col) => col.id === cur.id)) {
      prev.push(cur)
    }
    return prev
  }, [] as PhotoCollection[])
  .filter((collection) => collection.published)
}

export const formatParticipantName = (participant: Participant): string => {
  return `${participant.preferredName !== undefined && participant.preferredName !== '' ? 
    participant.preferredName : participant.firstName}, ${participant.lastName}`
}

export const formatUserName = (user?: UserProfile): string => {
  if(!user) return ''
  if(
    user.firstName !== undefined &&
    user.firstName !== ''
  ) {
    if(
      user.lastName !== undefined &&
      user.lastName !== ''
    ) {
      return `${user.firstName} ${user.lastName}`
    }
    return `${user.firstName}`
  }
  return ''
}