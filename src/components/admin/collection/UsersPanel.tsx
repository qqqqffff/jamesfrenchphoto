import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { Participant, PhotoCollection, UserTag } from "../../../types"
import { Dropdown, Radio, Tooltip } from "flowbite-react"
import { useMutation, UseMutationResult, UseQueryResult } from "@tanstack/react-query"
import { addCollectionParticipantMutation, AddCollectionParticipantParams, removeCollectionParticipantMutation, RemoveCollectionParticipantParams, UpdateCollectionParams } from "../../../services/collectionService"
import { ParticipantPanel } from "../../common/ParticipantPanel"

interface UsersPanelProps {
  collection: PhotoCollection,
  parentUpdateCollection: Dispatch<SetStateAction<PhotoCollection | undefined>>
  parentUpdateCollections: Dispatch<SetStateAction<PhotoCollection[]>>
  participants: Participant[]
  collectionParticipants: UseQueryResult<Participant[] | undefined, Error>,
  userTags: UserTag[]
  updateCollectionMutation: UseMutationResult<PhotoCollection, Error, UpdateCollectionParams, unknown>
}

export const UsersPanel = (props: UsersPanelProps) => {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [collectionParticipants, setCollectionParticipants] = useState<Participant[]>([])
  const [search, setSearch] = useState<string>('')
  const [filterTag, setFilterTag] = useState<UserTag>()

  useEffect(() => {
    if(participants.some((participant) => !props.participants.some((parentParticipants) => parentParticipants.id === participant.id)) ||
      props.participants.some((parentParticipants) => !participants.some((participant) => participant.id === parentParticipants.id))
    ){
      setParticipants(props.participants)
    }
    if(collectionParticipants.some((participant) => !props.collectionParticipants.data?.some((parentParticipants) => parentParticipants.id === participant.id)) ||
      props.collectionParticipants.data?.some((parentParticipants) => !collectionParticipants.some((participant) => participant.id === parentParticipants.id))
    ){
      setCollectionParticipants(props.collectionParticipants.data ?? [])
    }
  }, [props.participants, props.collectionParticipants])

  function wrapTooltip(wrap: boolean, participant: Participant, child: JSX.Element): JSX.Element {
    if(wrap) {
      return (
        <Tooltip
          key={child.key}
          theme={{ target: '' }}
          style="light"
          content={(
            <div>
              <span className="font-semibold text-sm underline underline-offset-2">Participant is Given Access by User Tagging</span>
              <ParticipantPanel 
                participant={participant}
              />
            </div>
            
          )}
          // ''
          placement="bottom"
        >
          {child}
        </Tooltip>
      )
    }
    return (
      <Tooltip
        key={child.key}
        theme={{ target: ''}}
        style='light'
        content={
          <ParticipantPanel
            participant={participant}
          />
        }
        placement="bottom"
      >
        {child}
      </Tooltip>
    )
  }

  const addCollectionParticipant = useMutation({
    mutationFn: (params: AddCollectionParticipantParams) => addCollectionParticipantMutation(params)
  })

  const removeCollectionParticipant = useMutation({
    mutationFn: (params: RemoveCollectionParticipantParams) => removeCollectionParticipantMutation(params),
    onSettled: () => {
      props.collectionParticipants.refetch()
    }
  })

  

  return (
    <div className="flex flex-col max-h-[90vh] min-h-[90vh] py-2 px-12 w-full overflow-auto">
      <div className="flex flex-row relative justify-center items-center mb-4 gap-4">
        <input 
          placeholder="Search for a participant"
          className="
          self-center font-thin py-1 px-2 text-sm ring-transparent w-full border rounded-md focus:outline-none 
          placeholder:text-gray-400 placeholder:italic max-w-[400px]"
          onChange={(event) => setSearch(event.target.value)}
          value={search}
        />
        <Dropdown
        size="sm"
          label={'Filter'}
          color='light'
          dismissOnClick={false}
        >
          {props.userTags.map((tag, index) => {
            const allSelected = props.collection.tags.some((cTag) => tag.id === cTag.id)

            return (
              <div className="grid grid-cols-2 gap-x-2" key={index}>
                <Dropdown.Item 
                  as='label' 
                  className="flex flex-row gap-2 col-span-2 w-full" 
                  htmlFor={tag.id} 
                  onClick={() => setFilterTag(tag)}
                >
                  <Radio name='tag' id={tag.id} checked={filterTag?.id === tag.id} readOnly/>
                  <span className={`text-${tag.color ?? 'black'}`}>{tag.name}</span>
                </Dropdown.Item>
                <div className="flex flex-row justify-end w-full py-1">
                  <button 
                    className="border rounded-lg hover:bg-gray-100 me-4 px-4"
                    onClick={() => {
                      if(allSelected) {
                        const tempCollection: PhotoCollection = {
                          ...props.collection,
                          tags: props.collection.tags.filter((cTag) => cTag.id !== tag.id)
                        }

                        props.updateCollectionMutation.mutate({
                          collection: props.collection,
                          tags: props.collection.tags.filter((cTag) => cTag.id !== tag.id),
                          published: props.collection.published,
                        })

                        props.parentUpdateCollection(tempCollection)
                        props.parentUpdateCollections((prev) => [...prev]
                          .map((collection) => (
                            collection.id === tempCollection.id ? tempCollection : collection
                          ))
                        )
                      }
                      else {
                        const tempCollection: PhotoCollection = {
                          ...props.collection,
                          tags: [...props.collection.tags, tag]
                        }

                        const updateCollectionParticipants = props.collectionParticipants.data?.filter((participant) => {
                          return participant.userTags.some((pTag) => pTag.id === tag.id)
                        })

                        if(updateCollectionParticipants) {
                          removeCollectionParticipant.mutate({
                            participantIds: updateCollectionParticipants.map((participant) => participant.id),
                            collectionId: props.collection.id,
                            options: {
                              logging: true
                            }
                          })
                        }

                        props.updateCollectionMutation.mutate({
                          collection: props.collection,
                          tags: [...props.collection.tags, tag],
                          published: props.collection.published,
                        })

                        props.parentUpdateCollection(tempCollection)
                        props.parentUpdateCollections((prev) => [...prev]
                          .map((collection) => (
                            collection.id === tempCollection.id ? tempCollection : collection
                          ))
                        )
                      }
                    }}
                  >{allSelected ? 'Unselect All' : 'Select All'}</button>
                </div>
              </div>
            )
          })}
          <div className="flex flex-row justify-end w-full py-1">
            <button 
              disabled={filterTag === undefined}
              className="border rounded-lg enabled:hover:bg-gray-100 me-4 px-4 disabled:text-gray-400 disabled:cursor-not-allowed" 
              onClick={() => setFilterTag(undefined)}
            >Clear Filter</button>
          </div>
        </Dropdown>
      </div>
      
      <div className="grid grid-cols-2 gap-x-10 gap-y-4">
        {props.participants
          .filter((participant) => (
            (participant.firstName.toLowerCase().trim().includes(search.toLowerCase()) ||
            participant.lastName.toLowerCase().trim().includes(search.toLowerCase()) ||
            participant.preferredName?.toLowerCase().trim().includes(search.toLowerCase())) && (
              !filterTag || participant.userTags.some((tag) => tag.id === filterTag.id)
            )
          ))
          .sort((a, b) => a.lastName.localeCompare(b.lastName))
          .map((participant, index) => {
            //TODO: convert me to a function
            const participantFirstName = participant.preferredName !== undefined && participant.preferredName !== '' ? participant.preferredName : participant.firstName
            const selected = collectionParticipants.some((selectedParticipant) => selectedParticipant.id === participant.id)
            const tagSelected = participant.userTags.some((tag) => props.collection.tags.some((colTag) => colTag.id === tag.id))
            
            return wrapTooltip(tagSelected, participant, (
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
                      participantIds: [participant.id],
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
                      participantIds: [participant.id],
                      collectionId: props.collection.id,
                      options: {
                        logging: true
                      }
                    })
                    setCollectionParticipants(tempParticipants)
                  }
                }}
              >
                <div className="flex flex-row gap-2 items-center text-nowrap">
                  <span className="italic">{`${participantFirstName}, `}</span>
                  <span className="italic">{participant.lastName}</span>
                  
                </div>
              </button>
            ))
          })
        }
      </div>
    </div>
  )
}