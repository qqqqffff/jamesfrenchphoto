import { Participant } from "../../types"

interface ParticipantPanelProps {
  participant: Participant
  hiddenOptions?: {
    tags?: boolean
  }
}

export const ParticipantPanel = (props: ParticipantPanelProps) => {
  return (
    <div className="flex flex-col">
      <span className='text-purple-400'>Participant</span>
      <div className="flex flex-col text-xs px-2 pb-1">
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
        {props.participant.userEmail && (
          <div className="flex flex-row gap-2 items-center text-nowrap">
            <span>User Email:</span>
            <span className="italic">{props.participant.userEmail}</span>
          </div>
        )}
        {!props.hiddenOptions?.tags && (
          <div className="flex flex-row gap-2 items-center text-nowrap">
            <span>Tags:</span>
            <span className="italic flex flex-row gap-1">
              {props.participant.userTags.length > 0 ? (
                props.participant.userTags.map((tag, index) => {
                  return (
                    <span className={`text-${tag.color ?? 'black'}`} key={index}>{tag.name}</span>
                  )
                })
              ) : 'No Tags'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}