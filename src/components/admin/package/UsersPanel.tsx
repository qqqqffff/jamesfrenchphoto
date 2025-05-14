import { UseQueryResult } from "@tanstack/react-query"
import { Participant } from "../../../types"

interface UserPanelProps {
  parentParticipantQuery: UseQueryResult<Participant[] | undefined, Error>
  participantQuery: UseQueryResult<Participant[] | undefined, Error>
}

export const UsersPanel = (props: UserPanelProps) => {
  return (
    <div className="grid grid-cols-2">
      {props.participantQuery.data?.map((participant) => {
        return (
          <div>{participant.firstName}{participant.lastName}</div>
        )
      })}
      {props.parentParticipantQuery.data?.map((participant) => {
        return (
          <div>{participant.firstName}{participant.lastName}</div>
        )
      })}
    </div>
  )
}