import { useEffect, useState } from "react"
import { Participant, PhotoCollection } from "../../../types"
import { Tooltip } from "flowbite-react"
import { useMutation } from "@tanstack/react-query"
import { addCollectionParticipantMutation, AddCollectionParticipantParams, removeCollectionParticipantMutation, RemoveCollectionParticipantParams } from "../../../services/collectionService"

interface UsersPannelProps {
  collection: PhotoCollection,
  participants: Participant[]
  collectionParticipants: Participant[]
}

export const UsersPannel = (props: UsersPannelProps) => {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [collectionParticipants, setCollectionParticipants] = useState<Participant[]>([])
  const [search, setSearch] = useState<string>('')

  useEffect(() => {
    if(participants.some((participant) => !props.participants.some((parentParticipants) => parentParticipants.id === participant.id)) ||
      props.participants.some((parentParticipants) => !participants.some((participant) => participant.id === parentParticipants.id))
    ){
      setParticipants(props.participants)
    }
    if(collectionParticipants.some((participant) => !props.collectionParticipants.some((parentParticipants) => parentParticipants.id === participant.id)) ||
      props.collectionParticipants.some((parentParticipants) => !collectionParticipants.some((participant) => participant.id === parentParticipants.id))
    ){
      setCollectionParticipants(props.collectionParticipants)
    }
  }, [props.participants, props.collectionParticipants])

  function wrapTooltip(wrap: boolean, child: JSX.Element): JSX.Element {
    if(wrap) {
      return (
        <Tooltip
          key={child.key}
          theme={{ target: '' }}
          style="light"
          content='Participant is Given Access to this Collection by User Tagging'
          placement="bottom"
        >
          {child}
        </Tooltip>
      )
    }
    return child
  }

  const addCollectionParticipant = useMutation({
    mutationFn: (params: AddCollectionParticipantParams) => addCollectionParticipantMutation(params)
  })

  const removeCollectionParticipant = useMutation({
    mutationFn: (params: RemoveCollectionParticipantParams) => removeCollectionParticipantMutation(params)
  })

  return (
    <div className="flex flex-col max-h-[90vh] py-2 px-12 w-full">
      <input 
        placeholder="Search for a participant"
        className="
        self-center font-thin py-1 px-2 text-sm ring-transparent w-full border rounded-md focus:outline-none 
        placeholder:text-gray-400 placeholder:italic max-w-[400px] mb-4"
        onChange={(event) => setSearch(event.target.value)}
        value={search}
      />
      <div className="grid grid-cols-2 gap-x-10 gap-y-4">
        {props.participants
          .filter((participant) => (
            participant.email?.toLowerCase().trim().includes(search.toLowerCase()) ||
            participant.firstName.toLowerCase().trim().includes(search.toLowerCase()) ||
            participant.lastName.toLowerCase().trim().includes(search.toLowerCase()) ||
            participant.preferredName?.toLowerCase().trim().includes(search.toLowerCase()) 
          ))
          .map((participant, index) => {
            const selected = collectionParticipants.some((selectedParticipant) => selectedParticipant.id === participant.id)
            const tagSelected = participant.userTags.some((tag) => props.collection.tags.some((colTag) => colTag.id === tag.id))
            
            return wrapTooltip(tagSelected, (
              <button 
                disabled={tagSelected}
                className={`
                  flex flex-col border py-2 px-4 rounded-lg ${selected || tagSelected ? 'bg-gray-300': ''}
                enabled:hover:bg-gray-100 enabled:hover:border-gray-500 text-sm ${tagSelected ? 'cursor-not-allowed' : ''}
                  w-full
                `} 
                key={index}
                onClick={() => {
                  if(selected) {
                    const tempParticipants = collectionParticipants.filter((colParticipant) => colParticipant.id !== participant.id)
                    removeCollectionParticipant.mutate({
                      participantId: participant.id,
                      collectionId: props.collection.id,
                      options: {
                        logging: true
                      }
                    })
                    setCollectionParticipants(tempParticipants)
                  }
                  else {
                    const tempParticipants = [...collectionParticipants, participant]
                    addCollectionParticipant.mutate({
                      participantId: participant.id,
                      collectionId: props.collection.id,
                      options: {
                        logging: true
                      }
                    })
                    setCollectionParticipants(tempParticipants)
                  }
                }}
              >
                <div className="flex flex-row gap-2 items-center text-nowrap text-sm">
                  <span>First Name:</span>
                  <span className="italic">{participant.firstName}</span>
                </div>
                {participant.preferredName && (
                  <div className="flex flex-row gap-2 items-center text-nowrap">
                    <span>Preferred Name:</span>
                    <span className="italic">{participant.preferredName}</span>
                  </div>
                )}
                <div className="flex flex-row gap-2 items-center text-nowrap">
                  <span>Last Name:</span>
                  <span className="italic">{participant.lastName}</span>
                </div>
                {participant.email && (
                  <div className="flex flex-row gap-2 items-center text-nowrap">
                    <span>Email:</span>
                    <span className="italic">{participant.email}</span>
                  </div>
                )}
              </button>
            ))
          })
        }
      </div>
    </div>
  )
}