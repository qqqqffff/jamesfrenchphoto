import { ComponentProps, useEffect, useState } from "react";
import { Participant, Table, UserTag } from "../../../types";
import { Checkbox, Dropdown, ToggleSwitch, Tooltip } from "flowbite-react";
import { HiMinus, HiOutlineExclamationTriangle, HiOutlinePencil, HiOutlinePlusCircle, HiOutlineXMark } from "react-icons/hi2";
import { CreateTagModal } from "../../modals";
import { useMutation } from "@tanstack/react-query";
import { updateParticipantMutation, UpdateParticipantMutationParams } from "../../../services/userService";

interface TagCellProps extends ComponentProps<'td'> {
  value: string,
  updateValue: (text: string) => void,
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
  const [createTagVisible, setCreateTagVisible] = useState(false)
  const [selectedTag, setSelectedTag] = useState<UserTag>()
  const [foundParticipant, setFoundParticipant] = useState<Participant | undefined>();
  const [tags, setTags] = useState<UserTag[]>(props.tags)
  const [mode, setMode] = useState<'column' | 'participant'>('column')
  const [source, setSource] = useState<{id: string, header: string}>()
  
  useEffect(() => {
    if(props.value !== value){
      setValue(props.value)
    }
    if(props.value !== '') {
      setFoundParticipant(props.participants.find((participant) => participant.id === props.value));
    }
    if(props.tags.some((tag) => !tags.some((parentTag) => parentTag.id === tag.id))) {
      setTags(props.tags)
    }
  }, [props.value, props.tags, props.participants])

  const updateParticipant = useMutation({
    mutationFn: (params: UpdateParticipantMutationParams) => updateParticipantMutation(params)
  })

  const foundTag = (foundParticipant?.userTags ?? []).length === 1 ? foundParticipant?.userTags[0] : undefined

  const tempSource = props.participants
    .find((participant) => {
      if(mode === 'column' && source) {
        const columnSource = props.table.columns.find((column) => column.id === source.id)
        if(!columnSource || !participant.email) return
        return participant.email === columnSource.values[props.rowIndex]
      }
      else if(source) {
        return participant.id === source.id
      }
    })

  const tagValue = (() => {
    if((foundParticipant?.userTags ?? []).length <= 0) {
      return ''
    }
    else if(foundTag !== undefined) {
      return foundTag.name
    }
    else if((foundParticipant?.userTags ?? []).length > 1){
      return 'Multiple Tags'
    }
  })()

  return (
    <>
      <CreateTagModal 
        onSubmit={(tag) => (
          setTags((prev) => {
            const temp = [...prev]
            if(!temp.some((pTag) => tag.id === pTag.id)) {
              temp.push(tag)
              return temp
            }
            return temp.map((pTag) => {
              if(pTag.id === tag.id) {
                return tag
              }
              return pTag
            })
          }
          )
        )}
        existingTag={selectedTag}
        open={createTagVisible} 
        onClose={() => setCreateTagVisible(false)}      
      />
      <td className="text-ellipsis border py-3 px-3 max-w-[150px]">
        <input
          placeholder={foundParticipant ? 'Pick Tags...' : 'Pick Source...'}
          className={`
            font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 
            border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic
            hover:cursor-pointer ${foundTag ? `text-${foundTag.color ?? 'black'}` : ''}
          `}
          value={tagValue}
          onFocus={() => setIsFocused(true)}
          readOnly
        />
        {isFocused && foundParticipant && (
          <div className="absolute z-10 mt-1 bg-white border border-gray-200 rounded-md shadow-lg flex flex-col min-w-[200px]">
            <div className="w-full whitespace-nowrap border-b py-1 px-2 text-base self-center flex flex-row justify-between">
              <span>Pick Tags</span>
              <div className="flex flex-row gap-1 items-center">
                <Tooltip
                  style="light"
                  content='Update Source'
                >
                  <button 
                    className=""
                    onClick={() => {
                      setFoundParticipant(undefined)
                      props.updateValue('')
                      setMode('column')
                      setSource(undefined)
                    }}
                  >
                    <HiMinus size={16} className="text-gray-400 hover:text-gray-800"/>
                  </button>
                </Tooltip>
                
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
              <button
                onClick={() => setCreateTagVisible(true)}
              >
                <HiOutlinePlusCircle size={16} className="text-gray-400 hover:text-gray-800" />
              </button>
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
                      className="flex flex-row justify-between items-center pe-2" 
                      key={index}
                    >
                      <button 
                        disabled={updateParticipant.isPending}
                        className="flex flex-row w-full items-center gap-2 py-2 ps-2 me-2 hover:bg-gray-100 cursor-pointer disabled:hover:cursor-wait" 
                        onClick={() => {
                          //TODO: connect api
                          if(!foundParticipant.userTags.some((participantTag) => participantTag.id === tag.id)){
                            const tempParticipant: Participant = {
                              ...foundParticipant,
                              userTags: [...foundParticipant.userTags, tag]
                            }
                            setFoundParticipant(tempParticipant)
                            updateParticipant.mutate({
                              firstName: foundParticipant.firstName,
                              lastName: foundParticipant.lastName,
                              preferredName: foundParticipant.preferredName,
                              middleName: foundParticipant.middleName,
                              contact: foundParticipant.contact,
                              email: foundParticipant.email,
                              participant: foundParticipant,
                              userTags: tempParticipant.userTags
                            })
                          }
                          else {
                            const tempParticipant: Participant = {
                              ...foundParticipant,
                              userTags: foundParticipant.userTags.filter((participantTags) => participantTags.id !== tag.id)
                            }

                            setFoundParticipant(tempParticipant)
                            updateParticipant.mutate({
                              firstName: foundParticipant.firstName,
                              lastName: foundParticipant.lastName,
                              preferredName: foundParticipant.preferredName,
                              middleName: foundParticipant.middleName,
                              contact: foundParticipant.contact,
                              email: foundParticipant.email,
                              participant: foundParticipant,
                              userTags: tempParticipant.userTags
                            })
                          }
                        }}
                      >
                        <Checkbox 
                          readOnly
                          checked={foundParticipant.userTags.some((participantTag) => participantTag.id === tag.id)}
                        />
                        <span className={`text-${tag.color ?? 'black'} text-ellipsis`}>{tag.name}</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTag(tag)
                          setCreateTagVisible(true)
                        }}
                      >
                        <HiOutlinePencil size={16} className="text-gray-400 hover:text-gray-800"/>
                      </button>
                    </div>
                  )
                })}
            </div>
          </div>
        )}
        {isFocused && !foundParticipant && (
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
              <div className="flex flex-row items-center self-center gap-2 border-b pb-2">
                <span className="font-light text-sm">Column</span>
                <ToggleSwitch 
                  checked={mode === 'participant'} 
                  onChange={() => {
                    setMode(mode === 'participant' ? 'column' : 'participant')
                    setSource(undefined)
                  }}              
                />
                <span className="font-light text-sm">Participant</span>
              </div>
              
              {mode === 'column' ? (
                <div className="flex flex-row gap-2 items-center text-nowrap">
                  <span>Column:</span>
                  <Dropdown
                    inline
                    label={source?.header ?? 'Column'}
                  >
                    {props.table.columns
                      .filter((column) => column.id !== props.columnId && column.type === 'user')
                      .map((column, index) => {
                        return (
                          <Dropdown.Item
                            key={index}
                            onClick={() => setSource({id: column.id, header: column.header})}
                          >
                            {column.header}
                          </Dropdown.Item>
                        )
                      })
  
                    }
                  </Dropdown>
                </div>
              ) : (
                <div className="flex flex-row gap-2 items-center text-nowrap">
                  <span>Participant:</span>
                  <Dropdown
                    inline
                    label={source?.header ?? 'Participant'}
                  >
                    {props.participants
                      .filter((participant) => participant.id !== source?.id && participant.email)
                      .map((participant, index) => {
                        return (
                          <Tooltip 
                            style="light"
                            content={(
                              <div className="flex flex-col" key={index}>
                                <span className="underline text-sm">Participant:</span>
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
                                <div className="border-gray-300 border mb-1"/>
                              </div>
                            )}                        
                          >
                            <Dropdown.Item
                            onClick={() => setSource({id: participant.id, header: participant.email! })}
                            >
                              {participant.email}
                            </Dropdown.Item>
                          </Tooltip> 
                        )
                      })
                    }
                  </Dropdown>
                </div>
              )}
              {tempSource && mode === 'column' && tempSource.email ? (
                <span className="italic underline underline-offset-2">{tempSource.email}</span>
              ) : (
                !tempSource && source && (
                  <div className="flex flex-row items-center gap-1">
                    <HiOutlineExclamationTriangle size={20} className="text-red-400"/>
                    <span className="italic text-red-400">Invalid Participant</span>
                  </div>
                )
              )}
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
                      setMode('column')
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
                      setMode('column')
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