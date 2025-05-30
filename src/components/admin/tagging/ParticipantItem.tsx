import { Tooltip } from "flowbite-react"
import { Dispatch, SetStateAction } from "react"
import { Participant, UserTag } from "../../../types"
import { ParticipantPanel } from "../../common/ParticipantPanel"

export const ParticipantItem = (props: {
  participant: Participant,
  selected: boolean,
  selectedTag: UserTag,
  parentUpdateTag?: Dispatch<SetStateAction<UserTag | undefined>>
}) => {
  const participantFirstName = props.participant.preferredName !== undefined && props.participant.preferredName !== '' ? props.participant.preferredName : props.participant.firstName
  return (
    <div className="w-full">
      <Tooltip
        theme={{ target: undefined }}
        style="light"
        placement="bottom-start"
        arrow={false}
        content={(
          <ParticipantPanel 
            participant={{
              ...props.participant,
              userTags: props.participant.userTags.filter((tag) => (
                tag.id === props.selectedTag.id ? props.selected : true
              ))
            }}
            hiddenOptions={{
              tags: true
            }}
          />
        )}
      >
        <button
          className={`
            px-4 py-2 border rounded-lg text-start hover:bg-gray-100
            flex flex-row font-light gap-2 overflow-hidden w-full
            ${props.parentUpdateTag !== undefined ? (
              props.selected ? 
                'bg-gray-200 hover:bg-gray-100' : 
                'hover:bg-gray-100'
            ) : (
              'hover:cursor-default'
            )}`
          }
          onClick={() => {
            if(props.parentUpdateTag) {
              const tempTag = {
                ...props.selectedTag
              }
              if(props.selected) {
                tempTag.participants = [...props.selectedTag.participants].filter((participant) => props.participant.id !== participant.id)
              }
              else {
                tempTag.participants = [...props.selectedTag.participants, props.participant]
              }

              props.parentUpdateTag(tempTag)
            }
          }}
        >
          <span>{participantFirstName}, {props.participant.lastName}</span>
        </button>
      </Tooltip>
    </div>
  )
}