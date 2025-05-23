import { UseQueryResult } from "@tanstack/react-query"
import { Participant } from "../../../types"
import { ParticipantPanel } from "../../common/ParticipantPanel"
import { Tooltip } from "flowbite-react"
import Loading from "../../common/Loading"

interface UserPanelProps {
  parentParticipantQuery: UseQueryResult<Participant[] | undefined, Error>
  participantQuery: UseQueryResult<Participant[] | undefined, Error>
}

export const UsersPanel = (props: UserPanelProps) => {
  return (
    <div className="grid grid-cols-2 border py-4 mx-4 px-2 rounded-xl gap-x-4">
      <div className="flex flex-col items-start w-full">
        <span className="ms-2 font-semibold">Available Participants</span>
        <div className="grid grid-cols-2 border place-items-center w-full rounded-lg gap-x-4 gap-y-2 p-2">
          {props.participantQuery.isLoading ? (
            <div className="flex flex-row gap-1">
              <span className="font-light italic">Loading</span>
              <Loading />
            </div>
          ) : (
            (props.participantQuery.data?.length ?? 0 > 0) ? (
              <div>
                <span>No available participants.</span>
              </div>
            ) : (
              props.parentParticipantQuery.data?.map((participant, index) => {
                return (
                  <div className="w-full border rounded-lg px-4 py-1" key={index}>
                    <Tooltip
                      style="light"
                      theme={{ target: undefined }}
                      content={<ParticipantPanel participant={participant} />}
                      placement="bottom"
                    >
                    <div className="w-full flex flex-row  gap-2">
                      <span>{participant.firstName}</span>
                      <span>{participant.lastName}</span>
                    </div>
                    </Tooltip>
                  </div>
                )
              })
            )
          )}
        </div>
      </div>
      <div className="flex flex-col items-start w-full">
        <span className="ms-2 font-semibold">Participants with package</span>
        <div className="grid grid-cols-2 border place-items-center w-full rounded-lg gap-x-4 gap-y-2 p-2 h-full">
          {props.participantQuery.isLoading ? (
            <div className="flex flex-row gap-1">
              <span className="font-light italic">Loading</span>
              <Loading />
            </div>
          ) : (
            (props.participantQuery.data?.length ?? 0 > 0) ? (
              <div>
                <span>No Participants with package.</span>
              </div>
            ) : (
              props.participantQuery.data?.map((participant, index) => {
                return (
                  <div className="w-full border rounded-lg px-4 py-1" key={index}>
                    <Tooltip
                      style="light"
                      theme={{ target: undefined }}
                      content={<ParticipantPanel participant={participant} />}
                      placement="bottom"
                    >
                    <div className="w-full flex flex-row  gap-2">
                      <span>{participant.firstName}</span>
                      <span>{participant.lastName}</span>
                    </div>
                    </Tooltip>
                  </div>
                )
              }))
            )
          }
        </div>
      </div>
    </div>
  )
}