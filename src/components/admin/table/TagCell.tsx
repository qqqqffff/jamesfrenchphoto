import { ComponentProps, useEffect, useState } from "react";
import { Participant, Table, UserProfile, UserTag } from "../../../types";
import { Checkbox } from "flowbite-react";
import { HiOutlineXMark } from "react-icons/hi2";
import { useMutation, UseQueryResult } from "@tanstack/react-query";
import { updateParticipantMutation, UpdateParticipantMutationParams } from "../../../services/userService";
import { formatParticipantName } from "../../../functions/clientFunctions";

interface TagCellProps extends ComponentProps<'td'> {
  value: string,
  updateValue: (text: string) => void,
  linkedParticipantId?: string
  tags: UseQueryResult<UserTag[] | undefined, Error>,
  table: Table,
  columnId: string,
  rowIndex: number,
  userData: {
    users: UserProfile[]
    tempUsers: UserProfile[]
  },
  updateParticipant: (
    newTags: UserTag[], 
    participantId: string, 
    userEmail: string, 
    tempUser: boolean
  ) => void
}

//TODO: fix tag removal
//TODO: handle participant api updates -> state management will be processed by super component with updateValue()
//TODO: add scrolling between all tags that are inside instead of displaying multiple tags
export const TagCell = (props: TagCellProps) => {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [search, setSearch] = useState<string>('')
  const [foundParticipant, setFoundParticipant] = useState<{ user: UserProfile, participant: Participant } | undefined>();
  const [availableTags, setAvailableTags] = useState<UserTag[]>(props.tags.data ?? [])
  
  useEffect(() => {
    if(props.value !== value){
      setValue(props.value)
    }
  }, [
    props.value
  ])

  useEffect(() => {
    setFoundParticipant((_) => {
      if(!props.linkedParticipantId) return undefined
      let user: UserProfile | undefined
      let participant = props.userData.users
        .flatMap((user) => user.participant)
        .find((participant) => participant.id === props.linkedParticipantId)
      if(!participant) {
        participant = props.userData.tempUsers
          .flatMap((user) => user.participant)
          .find((participant) => participant.id === props.linkedParticipantId)
        
        if(participant) {
          user = props.userData.users.find((profile) => profile.email === participant?.userEmail)!
          return ({
            participant: participant,
            user: user
          })
        }
      }
      else {
        user = props.userData.users.find((profile) => profile.email === participant?.userEmail)!
        return ({
          participant: participant,
          user: user
        })
      }
      return undefined
    });
  }, [
    props.linkedParticipantId
  ])

  useEffect(() => {
    if(props.tags.data?.some((tag) => !availableTags.some((parentTag) => parentTag.id === tag.id))) {
      setAvailableTags(props.tags.data ?? [])
    }
  }, [props.tags])

  const updateParticipant = useMutation({
    mutationFn: (params: UpdateParticipantMutationParams) => updateParticipantMutation(params)
  })

  const cellTags = (value.split(',') ?? []).map((tagId) => {
    const foundTag = availableTags.find((tag) => tag.id === tagId)
    return foundTag
  })
  .filter((tag) => tag !== undefined)

  const tagValue = (() => {
    if(props.tags.isLoading) return 'Loading...'
    else if(value === '') return ''
    else if(cellTags.length === 1) {
      return cellTags[0].name
    }
    else if(cellTags.length > 1){
      return 'Multiple Tags'
    }
    else if(cellTags.length === 0){
      return 'No Tags'
    }
  })()

  return (
    <>
      <td className="text-ellipsis border py-3 px-3 max-w-[150px]">
        <input
          placeholder={'Pick Tags...'}
          className={`
            font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 
            border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic
            hover:cursor-pointer ${cellTags.length === 1 ? `text-${cellTags[0].color ?? 'black'}` : ''}
            ${tagValue === 'Invalid Source' || tagValue === 'Broken Source' ? 'text-red-500' : ''}
          `}
          value={tagValue}
          onFocus={() => setIsFocused(true)}
          readOnly
        />
        {isFocused && (
          <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col min-w-[200px]">
            <div className="w-full whitespace-nowrap border-b py-1 px-2 text-base self-center flex flex-row justify-between">
              {foundParticipant ? (
                <span>Linked with: {formatParticipantName(foundParticipant.participant)}</span>
              ) : (
                <></>
              )}
              <div className="flex flex-row gap-1 items-center">
                <button 
                  className=""
                  onClick={() => {
                    setIsFocused(false)
                  }}
                >
                  <HiOutlineXMark size={16} className="text-gray-400 hover:text-gray-800"/>
                </button>
              </div>
            </div>
            <div className="w-full px-2 py-2 flex flex-row gap-2">
              <input 
                placeholder="Search for a tag"
                className="font-thin py-1 px-2 text-xs ring-transparent w-full border rounded-md focus:outline-none placeholder:text-gray-400 placeholder:italic"
                onChange={(event) => setSearch(event.target.value)}
                value={search}
              />
            </div>
            
            <div className="max-h-60 overflow-y-auto py-1 min-w-max">
              {availableTags
                .filter((tag) => tag.name.toLowerCase().trim().includes((search ?? '').toLowerCase()))
                //sorting selected tags to the top
                .sort((a, b) => {
                  const aSelected = cellTags.some((tag) => a.id === tag.id)
                  const bSelected = cellTags.some((tag) => b.id === tag.id)

                  if(aSelected && !bSelected) return -1
                  if(!aSelected && bSelected) return 1

                  return 0
                })
                .map((tag, index) => {
                  return (
                    <div 
                      className="flex flex-row justify-start items-center pe-2" 
                      key={index}
                    >
                      <button 
                        disabled={updateParticipant.isPending}
                        className="flex flex-row w-full items-center gap-2 py-2 ps-2 me-2 enabled:hover:bg-gray-100 enabled:cursor-pointer disabled:hover:cursor-wait" 
                        onClick={() => {
                          //update state by either removing the selected tag or adding it to be selected
                          if(cellTags.some((cTag) => cTag.id === tag.id)) {
                            let newValue = cellTags
                              .filter((cTag) => cTag.id !== tag.id)
                              .reduce((prev, cur) => {
                                return prev + ',' + cur.id
                              }, '')
                            
                            newValue = newValue.charAt(0) === ',' ? newValue.substring(1) : newValue
                            props.updateValue(newValue)

                            if(foundParticipant?.participant !== undefined){
                              const tempParticipant: Participant = {
                                ...foundParticipant.participant,
                                userTags: cellTags.filter((cTag) => cTag.id !== tag.id)
                              }
                              
                              updateParticipant.mutate({
                                firstName: foundParticipant.participant.firstName,
                                lastName: foundParticipant.participant.lastName,
                                preferredName: foundParticipant.participant.preferredName,
                                middleName: foundParticipant.participant.middleName,
                                contact: foundParticipant.participant.contact,
                                email: foundParticipant.participant.email,
                                participant: foundParticipant.participant,
                                userTags: tempParticipant.userTags,
                                options: {
                                  logging: true
                                }
                              })

                              setFoundParticipant({ 
                                user: foundParticipant.user, 
                                participant: tempParticipant
                              })
                              //updating parent state for participants
                              props.updateParticipant(
                                tempParticipant.userTags,
                                tempParticipant.id,
                                tempParticipant.userEmail,
                                props.userData.tempUsers.some((profile) => profile.email === tempParticipant.userEmail)
                              )
                            }
                          }
                          else {
                            let newValue = cellTags
                              .filter((cTag) => cTag.id !== tag.id)
                              .reduce((prev, cur) => {
                                return prev + ',' + cur.id
                              }, '')

                              console.log(newValue)
                            
                            newValue = (newValue.charAt(0) === ',' ? newValue.substring(1) : newValue) + ',' + tag.id
                            props.updateValue(newValue)

                            //TODO: can simplify multiple redundant ifs
                            if(foundParticipant?.participant !== undefined){
                              const tempParticipant: Participant = {
                                ...foundParticipant.participant,
                                userTags: [...cellTags, tag]
                              }
                              
                              updateParticipant.mutate({
                                firstName: foundParticipant.participant.firstName,
                                lastName: foundParticipant.participant.lastName,
                                preferredName: foundParticipant.participant.preferredName,
                                middleName: foundParticipant.participant.middleName,
                                contact: foundParticipant.participant.contact,
                                email: foundParticipant.participant.email,
                                participant: foundParticipant.participant,
                                userTags: tempParticipant.userTags,
                                options: {
                                  logging: true
                                }
                              })

                              setFoundParticipant({ 
                                user: foundParticipant.user, 
                                participant: tempParticipant
                              })
                              //updating parent state for participants
                              props.updateParticipant(
                                tempParticipant.userTags,
                                tempParticipant.id,
                                tempParticipant.userEmail,
                                props.userData.tempUsers.some((profile) => profile.email === tempParticipant.userEmail)
                              )
                            }
                          }
                        }}
                      >
                        <Checkbox 
                          readOnly
                          checked={cellTags.some((cTag) => cTag.id === tag.id)}
                        />
                        <span className={`text-${tag.color ?? 'black'} text-ellipsis`}>{tag.name}</span>
                      </button>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
      </td>
    </>
  )
}