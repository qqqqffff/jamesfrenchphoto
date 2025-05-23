import { Dispatch, SetStateAction, useState } from "react"
import { Participant, UserTag } from "../../../types"
import { UseQueryResult } from "@tanstack/react-query"
import { TextInput } from "flowbite-react"
import { textInputTheme } from "../../../utils"
import Loading from "../../common/Loading"
import { ParticipantItem } from "./ParticipantItem"

interface UsersPanelProps {
  selectedTag: UserTag
  parentUpdateTag: Dispatch<SetStateAction<UserTag | undefined>>
  participantQuery: UseQueryResult<Participant[] | undefined, Error>
}
export const UsersPanel = (props: UsersPanelProps) => {
  const [search, setSearch] = useState<string>('')

  const filteredItems: Participant[] = (props.participantQuery.data ?? [])
    .sort((a, b) => a.firstName.localeCompare(b.firstName))
    .filter((participant) => (
      participant.firstName.trim().toLowerCase().includes(search.trim().toLowerCase()) ||
      participant.lastName.trim().toLowerCase().includes(search.trim().toLowerCase())) ||
      participant.preferredName?.trim().toLowerCase().includes(search.trim().toLowerCase()) ||
      participant.email?.trim().toLowerCase().includes(search.trim().toLowerCase()) ||
      participant.middleName?.trim().toLowerCase().includes(search.trim().toLowerCase()) ||
      participant.userTags.some((tag) => tag.name.trim().toLowerCase().includes(search.trim().toLowerCase()))
    )

  const participantColumns: Participant[][] = (() => {
    const returnGroup: Participant[][] = [[], [], []]
    
    for(let i = 0; i < filteredItems.length; i++) {
      returnGroup[i % 3].push(filteredItems[i])
    }

    return returnGroup
  })()

  return (
    <div className="flex flex-col max-h-[70vh] items-center justify-center w-full">
      <TextInput 
        theme={textInputTheme}
        sizing="sm"
        className="max-w-[400px] w-full mb-4 self-center"
        placeholder="Search for Users"
        onChange={(event) => setSearch(event.target.value)}
        value={search}
      />
      <div className="grid grid-cols-3 px-10 place-items-center gap-x-6 w-full">
        <div className="flex flex-col gap-4 border rounded-lg p-4 w-full h-full">
          {props.participantQuery.isLoading ? (
            <span className="flex flex-row text-start gap-1 italic font-light">
              <span>Loading</span>
              <Loading />
            </span>
          ) : (
          filteredItems.length === 0 ? (
            search !== ''? (
              <div className="flex flex-row gap-4">
                <span className="italic font-light">No Results</span>
              </div>
            ) : (
              <div className="flex flex-row gap-4">
                <span className="italic font-light">No Users</span>
              </div>
            )
          ) : (
            participantColumns[0].map((participant) => {
              const selected = props.selectedTag.participants?.some((pParticipant) => pParticipant.id === participant.id)
              return (
                <ParticipantItem 
                  participant={participant}
                  selected={selected ?? false}
                  selectedTag={props.selectedTag}
                  parentUpdateTag={props.parentUpdateTag}
                />
              )
            })
          ))}
        </div>
        <div className="flex flex-col gap-4 border rounded-lg p-4 w-full h-full">
          {participantColumns[1].map((participant) => {
            const selected = props.selectedTag.participants?.some((pParticipant) => participant.id === pParticipant.id)
            return (
              <ParticipantItem 
                participant={participant}
                selected={selected ?? false}
                selectedTag={props.selectedTag}
                parentUpdateTag={props.parentUpdateTag}
              />
            )
          })}
        </div>
        <div className="flex flex-col gap-4 border rounded-lg p-4 w-full h-full">
          {participantColumns[2].map((participant) => {
            const selected = props.selectedTag.participants?.some((pParticipant) => participant.id === pParticipant.id)
            return (
              <ParticipantItem 
                participant={participant}
                selected={selected ?? false}
                selectedTag={props.selectedTag}
                parentUpdateTag={props.parentUpdateTag}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}