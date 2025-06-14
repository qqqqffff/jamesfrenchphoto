import { ComponentProps, useEffect, useState } from "react";
import { Participant, Table, UserData, UserProfile, UserTag } from "../../../types";
import { Checkbox, Dropdown, Tooltip } from "flowbite-react";
import { HiMinus, HiOutlineXMark } from "react-icons/hi2";
import { useMutation, UseQueryResult } from "@tanstack/react-query";
import { updateParticipantMutation, UpdateParticipantMutationParams } from "../../../services/userService";
import { invariant } from "@tanstack/react-router";
import { ParticipantPanel } from "../../common/ParticipantPanel";
import { formatParticipantName } from "../../../functions/clientFunctions";

interface TagCellProps extends ComponentProps<'td'> {
  value: string,
  updateValue: (text: string) => void,
  updateParticipant: (participant: Participant) => void,
  userQuery: UseQueryResult<UserData[] | undefined, Error>,
  tempUserQuery: UseQueryResult<UserProfile[] | undefined, Error>,
  tags: UserTag[],
  refetchTags: () => void,
  participants: Participant[],
  table: Table,
  columnId: string,
  rowIndex: number
}

//TODO: fix tag removal
export const TagCell = (props: TagCellProps) => {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [search, setSearch] = useState<string>('')
  const [foundParticipant, setFoundParticipant] = useState<Participant | undefined>();
  const [tags, setTags] = useState<UserTag[]>(props.tags)
  const [source, setSource] = useState<string | undefined>()
  
  useEffect(() => {
    if(props.value !== value){
      setValue(props.value)
      setFoundParticipant((prev) => {
        const participant = props.participants.find((participant) => participant.id === props.value)
        if(
          (prev !== undefined && participant === undefined) || 
          (participant?.id !== prev?.id)
        ) {
          return participant
        }
        return prev
      });
    }
  }, [props.value])

  useEffect(() => {
    if(props.tags.some((tag) => !tags.some((parentTag) => parentTag.id === tag.id))) {
      setTags(props.tags)
    }
  }, [props.tags])

  useEffect(() => {
    if(props.value !== '' && value === props.value) {
      setFoundParticipant(props.participants.find((participant) => participant.id === props.value));
    }
  }, [props.participants])

  const column = props.table.columns.find((col) => col.id === props.columnId)
  invariant(column !== undefined)
  const hasDependency = props.table.columns.some((col) => col.id === column.choices?.[0])

  const updateParticipant = useMutation({
    mutationFn: (params: UpdateParticipantMutationParams) => updateParticipantMutation(params)
  })

  const foundTag = (foundParticipant?.userTags ?? []).length === 1 ? foundParticipant?.userTags[0] : undefined

  const tempSource = props.participants
    .find((participant) => participant.id === source)

  const tagValue = (() => {
    if((props.userQuery.isLoading || props.tempUserQuery.isLoading) && foundParticipant === undefined) return 'Loading...'
    else if(foundParticipant === undefined && value === '' && hasDependency) return 'No Participant'
    else if(foundParticipant === undefined && value === '') return ''
    else if(foundParticipant === undefined && value !== '' && !hasDependency) return 'Invalid Source'
    else if(foundTag !== undefined) {
      return foundTag.name
    }
    else if((foundParticipant?.userTags ?? []).length > 1){
      return 'Multiple Tags'
    }
    else if(foundParticipant && (foundParticipant?.userTags ?? []).length === 0){
      return 'No Tags'
    }
    else {
      return 'Broken Source'
    }
  })()

  return (
    <>
      <td className="text-ellipsis border py-3 px-3 max-w-[150px]">
        <input
          placeholder={foundParticipant ? 'Pick Tags...' : 'Pick Source...'}
          className={`
            font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 
            border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic
            hover:cursor-pointer ${foundTag ? `text-${foundTag.color ?? 'black'}` : ''}
            ${tagValue === 'Invalid Source' || tagValue === 'Broken Source' ? 'text-red-500' : ''}
          `}
          value={tagValue}
          onFocus={() => setIsFocused(true)}
          readOnly
        />
        {isFocused && foundParticipant && (
          <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col min-w-[200px]">
            <div className="w-full whitespace-nowrap border-b py-1 px-2 text-base self-center flex flex-row justify-between">
              <span>{formatParticipantName(foundParticipant)}</span>
              <div className="flex flex-row gap-1 items-center">
                {!hasDependency && (
                  <Tooltip
                    style="light"
                    content='Update Source'
                  >
                    <button 
                      className=""
                      onClick={() => {
                        setFoundParticipant(undefined)
                        setValue('')
                        setSource(undefined)
                      }}
                    >
                      <HiMinus size={16} className="text-gray-400 hover:text-gray-800"/>
                    </button>
                  </Tooltip>
                )}
                
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
              {tags
                .filter((tag) => tag.name.toLowerCase().trim().includes((search ?? '').toLowerCase()))
                .sort((a, b) => {
                  const aSelected = foundParticipant.userTags.some((tag) => a.id === tag.id)
                  const bSelected = foundParticipant.userTags.some((tag) => b.id === tag.id)

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
                          if(!foundParticipant.userTags.some((participantTag) => participantTag.id === tag.id)){
                            const tempParticipant: Participant = {
                              ...foundParticipant,
                              userTags: [...foundParticipant.userTags, tag]
                            }
                            
                            updateParticipant.mutate({
                              firstName: foundParticipant.firstName,
                              lastName: foundParticipant.lastName,
                              preferredName: foundParticipant.preferredName,
                              middleName: foundParticipant.middleName,
                              contact: foundParticipant.contact,
                              email: foundParticipant.email,
                              participant: foundParticipant,
                              userTags: tempParticipant.userTags,
                              options: {
                                logging: true
                              }
                            })

                            setFoundParticipant(tempParticipant)
                            props.updateParticipant(tempParticipant)
                          }
                          else {
                            const tempParticipant: Participant = {
                              ...foundParticipant,
                              userTags: foundParticipant.userTags.filter((participantTags) => participantTags.id !== tag.id)
                            }

                            updateParticipant.mutate({
                              firstName: foundParticipant.firstName,
                              lastName: foundParticipant.lastName,
                              preferredName: foundParticipant.preferredName,
                              middleName: foundParticipant.middleName,
                              contact: foundParticipant.contact,
                              email: foundParticipant.email,
                              participant: foundParticipant,
                              userTags: tempParticipant.userTags,
                              options: {
                                logging: true
                              }
                            })

                            setFoundParticipant(tempParticipant)
                            props.updateParticipant(tempParticipant)
                          }
                        }}
                      >
                        <Checkbox 
                          readOnly
                          checked={foundParticipant.userTags.some((participantTag) => participantTag.id === tag.id)}
                        />
                        <span className={`text-${tag.color ?? 'black'} text-ellipsis`}>{tag.name}</span>
                      </button>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
        {isFocused && !foundParticipant && tagValue !== 'No Participant' && (
          <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col min-w-[200px]">
            <div className="w-full whitespace-nowrap border-b p-1 text-base self-center flex flex-row justify-between">
              <span className="font-light ms-2 text-sm">Select Source</span>
              <button 
                className=""
                onClick={() => {
                  setIsFocused(false)
                }}
              >
                <HiOutlineXMark size={16} className="text-gray-400"/>
              </button>
            </div>
            <div className="flex flex-col px-2 py-2 gap-2">
              <div className="flex flex-row gap-2 items-center text-nowrap">
                <span>Participant:</span>
                <Dropdown
                  inline
                  label={tempSource ? formatParticipantName(tempSource) : 'Pick Participant'}
                >
                  {props.participants
                    .filter((participant) => participant.id !== source)
                    .map((participant, index) => {
                      return (
                        <Tooltip 
                          key={index}
                          theme={{ content: undefined }}
                          style="light"
                          content={(
                            <ParticipantPanel participant={participant}/>
                          )}                        
                        >
                          <Dropdown.Item
                          onClick={() => setSource(participant.id)}
                          >
                            {formatParticipantName(participant)}
                          </Dropdown.Item>
                        </Tooltip> 
                      )
                    })
                  }
                </Dropdown>
              </div>
              {source && (
                tempSource && (tempSource.userTags ?? []).length > 0 ? (
                  <div className="flex flex-col gap-2 px-2 border rounded-lg py-2">
                    <span>Found Tags:</span>
                    {tempSource.userTags?.map((tag, index) => {
                      return (
                        <div className="flex flex-col border w-full rounded-lg items-center py-1" key={index}>
                          <span className={`whitespace-nowrap text-nowrap text-${tag.color ?? 'black'}`}>{tag.name}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  tempSource ? (
                    <div>
                      <span>No Tags Found.</span>
                    </div>
                  ) : (
                    <div>
                      <span>No Participant Found.</span>
                    </div>
                  )
                )
              )}
              <div className="flex flex-row self-end gap-2 items-center me-2">
                {props.value !== '' && (
                  <button
                    className="border rounded-lg px-3 py-0.5 enabled:hover:bg-gray-100 enabled:hover:border-gray-300"
                    onClick={() => {
                      setSource(undefined)
                      setValue(props.value)
                    }}
                  >
                    <span>Cancel</span>
                  </button>
                )}
                <button
                  className="border rounded-lg px-3 py-0.5 enabled:hover:bg-gray-100 enabled:hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-75"
                  disabled={!tempSource}
                  onClick={() => {
                    if(tempSource) {
                      setSource(undefined)
                      setValue(tempSource.id)
                      props.updateValue(tempSource.id)
                    }
                  }}
                >
                  <span>Sync</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </td>
    </>
  )
}