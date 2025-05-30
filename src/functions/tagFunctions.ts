import { Participant, PhotoCollection, Timeslot, UserTag } from "../types";

export const evaluateTagDif = (oldTag: UserTag, newTag: UserTag): boolean => {
  const newCollections: PhotoCollection[] = (oldTag.collections ?? [])
    .filter((collection) => !newTag.collections?.some((pCollection) => pCollection.id === collection.id))
  
  const removedCollections = (newTag.collections ?? [])
    .filter((collection) => !oldTag.collections?.some((pCollection) => pCollection.id === collection.id))
  
  const newTimeslots: Timeslot[] = (newTag.timeslots ?? [])
    .filter((timeslot) => !oldTag.timeslots?.some((pTimeslot) => pTimeslot.id === timeslot.id))
  
  const removedTimeslots = (oldTag.timeslots ?? [])
    .filter((timeslot) => !newTag.timeslots?.some((pTimeslot) => pTimeslot.id === timeslot.id))

  const newParticipants: Participant[] = newTag.participants
    .filter((participant) => !oldTag.participants.some((pParticipant) => pParticipant.id === participant.id))
  
  const removedParticipants = oldTag.participants
    .filter((participant) => !newTag.participants.some((pParticipant) => pParticipant.id === participant.id))

  if(
    newCollections.length > 0 ||
    removedCollections.length > 0 ||
    newTimeslots.length > 0 ||
    removedTimeslots.length > 0 ||
    newParticipants.length > 0 ||
    removedParticipants.length > 0
  ) {
    return true
  }

  return (
    newTag.name !== oldTag.name ||
    newTag.color !== oldTag.color
  )
}