import { Participant } from "../../types"
import { formatTime } from "../../utils"
import { createTimeString } from "../timeslot/Slot"

interface ParticipantPanelProps {
  participant: Participant
  hiddenOptions?: {
    tags?: boolean
  }
  showOptions?: {
    timeslot?: boolean
  }
}

export const ParticipantPanel = (props: ParticipantPanelProps) => {
  return (
    <div className="flex flex-col">
      <span className='text-purple-400'>Participant</span>
      <div className="flex flex-col text-xs px-2 pb-1 max-h-60 overflow-y-auto">
        <div className="flex flex-row gap-2 items-center text-nowrap">
            <span>First Name:</span>
            <span className="italic">{props.participant.firstName}</span>
          </div>
        {props.participant.preferredName && (
          <div className="flex flex-row gap-2 items-center text-nowrap">
            <span>Preferred Name:</span>
            <span className="italic">{props.participant.preferredName}</span>
          </div>
        )}
        <div className="flex flex-row gap-2 items-center text-nowrap">
          <span>Last Name:</span>
          <span className="italic">{props.participant.lastName}</span>
        </div>
        {props.participant.email && (
          <div className="flex flex-row gap-2 items-center text-nowrap">
            <span>Email:</span>
            <span className="italic truncate max-w-[200px]">{props.participant.email}</span>
          </div>
        )}
        {props.participant.userEmail && (
          <div className="flex flex-row gap-2 items-center text-nowrap">
            <span>User Email:</span>
            <span className="italic truncate max-w-[200px]">{props.participant.userEmail}</span>
          </div>
        )}
        {/* TODO: better conditional rendering for no tags */}
        {!props.hiddenOptions?.tags && (
          <div className="flex flex-row gap-2 justify-start flex-wrap pt-2 max-w-[200px]">
            {/* <span className="pt-1">Tags:</span> */}
            {/* <span className="italic flex flex-col gap-1"> */}
              {props.participant.userTags.length > 0 ? (
                props.participant.userTags.map((tag, index) => {
                  return (
                    <span className={`text-${tag.color ?? 'black'} border rounded-full px-2 py-1 text-center flex max-w-min text-nowrap`} key={index}>{tag.name}</span>
                  )
                })
              ) : <span className="pt-1">No Tags</span>}
            {/* </span> */}
          </div>
        )}
        {props.showOptions?.timeslot && (
          (props.participant.timeslot ?? []).length > 0 ? (
            props.participant.timeslot?.map((timelsot, index) => {
              return (
                <div className="flex flex-col border w-full rounded-lg items-center py-1" key={index}>
                  <span className="whitespace-nowrap text-nowrap">{formatTime(timelsot.start, {timeString: false})}</span>
                  <span className="text-xs whitespace-nowrap text-nowrap">{createTimeString(timelsot)}</span>
                </div>
              )
            })
          ) : (
            <div>
              <span>No Timeslots Found.</span>
            </div>
          )
        )}
      </div>
    </div>
  )
}