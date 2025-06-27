import { Participant, Table, UserProfile, UserTag } from "../../../types"
import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { HiOutlinePlusCircle } from "react-icons/hi2"
import { v4 } from 'uuid'
import { useMutation, UseQueryResult } from "@tanstack/react-query"
import { InviteUserParams, inviteUserMutation } from "../../../services/userService"
import { TagPicker } from "../package/TagPicker"
import { validateMapField } from "../../../functions/tableFunctions"

interface InviteUserWindowProps {
  email: string,
  table: Table,
  rowIndex: number,
  submit: Dispatch<SetStateAction<UserProfile | undefined>>
  tagsQuery: UseQueryResult<UserTag[] | undefined, Error>
  participantList: Participant[],
  columnId: string
}

export const InviteUserWindow = (props: InviteUserWindowProps) => {
  const [sittingNumber, setSittingNumber] = useState<string>('')
  const [firstName, setFirstName] = useState<string>('')
  const [lastName, setLastName] = useState<string>('')

  const [participants, setParticipants] = useState<Participant[]>([])

  useEffect(() => {
    let firstName: string | undefined
    let lastName: string | undefined
    let sittingNumber: string | undefined
    const participants: Participant[] = []
    for(let i = 0; i < props.table.columns.length; i++) {
      //user field mapped
      if(
        props.table.columns[i].type === 'value' &&
        validateMapField(props.table.columns[i].choices?.[1] ?? '')[0] !== null &&
        props.table.columns[i].choices?.[0] === props.columnId
      ) {
        switch(props.table.columns[i].choices?.[1]) {
          case 'first':
            firstName = props.table.columns[i].values[props.rowIndex]
            break;
          case 'last':
            lastName = props.table.columns[i].values[props.rowIndex]
            break;
          case 'sitting':
            sittingNumber = props.table.columns[i].values[props.rowIndex]
            break;
          default:
            break;
        }
      }
      //participant mapped field
      if(
        props.table.columns[i].type === 'participant' &&
        props.participantList.some((participant) => participant.id === props.table.columns[i].values[props.rowIndex])
      ) {
        const foundParticipant = props.participantList.find((participant) => participant.id === props.table.columns[i].values[props.rowIndex])
        if(foundParticipant) {
          participants.push(foundParticipant)
        }
      }
    }

    setFirstName(firstName ?? '')
    setLastName(lastName ?? '')
    setSittingNumber(sittingNumber ?? '')
    setParticipants(participants)
  }, [props.table.columns, props.participantList, props.tagsQuery.data])

  const inviteUser = useMutation({
    mutationFn: (params: InviteUserParams) => inviteUserMutation(params),
  })

  const link = window.location.href
    .replace(new RegExp(/admin.*/g), 'register')

  return (
    <div className="flex flex-col text-xs overflow-auto max-h-[320px] w-[250px]">
      <div className="flex flex-col px-2 pb-1 gap-1">
        <div className="flex flex-row gap-2 items-center text-nowrap">
          <span>Email:</span>
          <span className="italic">{props.email}</span>
        </div>
        <div className="flex flex-row gap-2 items-center text-nowrap">
          <span>Sitting Number:</span>
          <input
            className={`
              font-thin p-0 text-xs border-transparent ring-transparent w-full border-b-gray-400 
              border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic
            `}
            placeholder="Sitting Number..."
            onChange={(event) => {
              const input = event.target.value.charAt(0) === '0' ? event.target.value.slice(1) : event.target.value

              if(!/^\d*$/g.test(input)) {
                return
              }

              const numValue = parseInt(input)
              
              if(numValue <= -1) {
                return
              }

              setSittingNumber(String(isNaN(numValue) ? 0 : numValue));
            }}
            value={sittingNumber ?? ''}
          />
        </div>
        <div className="flex flex-row gap-2 items-center text-nowrap">
          <span>First Name:</span>
          <input
            className={`
              font-thin p-0 text-xs border-transparent ring-transparent w-full border-b-gray-400 
              border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic
            `}
            placeholder="First Name..."
            onChange={(event) => {
              setFirstName(event.target.value)
            }}
            value={firstName}
          />
        </div>
        <div className="flex flex-row gap-2 items-center text-nowrap">
          <span>Last Name:</span>
          <input
            className={`
              font-thin p-0 text-xs border-transparent ring-transparent w-full border-b-gray-400 
              border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic
            `}
            placeholder="Last Name..."
            onChange={(event) => {
              setLastName(event.target.value)
            }}
            value={lastName}
          />
        </div>
      </div>
      <div className="flex flex-row p-1 justify-between w-full border-b mb-2">
        <span className="text-sm">Participants</span>
        <button 
          className=""
          onClick={() => {
            const temp: Participant = {
              id: v4(),
              firstName: '',
              lastName: '',
              userTags: [],
              notifications: [],
              contact: false,
              userEmail: props.email,
              collections: []
            }
            setParticipants([...participants, temp])
          }}
        >
          <HiOutlinePlusCircle size={20} className="text-gray-400 hover:text-gray-600 hover:fill-gray-100"/>
        </button>
      </div>
      <div className="flex flex-col px-2 pb-1 gap-1">
        {participants.map((participant, index) => {
          return (
            <div key={index} className="flex flex-col gap-1">
              <div className="flex flex-row gap-2 items-center text-nowrap">
                <span>First Name:</span>
                <input
                  className={`
                    font-thin p-0 text-xs border-transparent ring-transparent w-full border-b-gray-400 
                    border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic
                  `}
                  placeholder="First Name..."
                  onChange={(event) => {
                    setParticipants((prev) => {
                      const temp = [...prev]
                        .map((part) => {
                          if(part.id === participant.id) {
                            return {
                              ...part,
                              firstName: event.target.value
                            }
                          }
                          return part
                        })

                      return temp
                    })
                  }}
                  value={participant.firstName}
                />
              </div>
              <div className="flex flex-row gap-2 items-center text-nowrap">
                <span>Preferred Name:</span>
                <input
                  className={`
                    font-thin p-0 text-xs border-transparent ring-transparent w-full border-b-gray-400 
                    border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic
                  `}
                  placeholder="Preferred Name..."
                  onChange={(event) => {
                    setParticipants((prev) => {
                      const temp = [...prev]
                        .map((part) => {
                          if(part.id === participant.id) {
                            return {
                              ...part,
                              preferredName: event.target.value
                            }
                          }
                          return part
                        })

                      return temp
                    })
                  }}
                  value={participant.preferredName ?? ''}
                />
              </div>
              <div className="flex flex-row gap-2 items-center text-nowrap">
                <span>Middle Name:</span>
                <input
                  className={`
                    font-thin p-0 text-xs border-transparent ring-transparent w-full border-b-gray-400 
                    border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic
                  `}
                  placeholder="Middle Name..."
                  onChange={(event) => {
                    setParticipants((prev) => {
                      const temp = [...prev]
                        .map((part) => {
                          if(part.id === participant.id) {
                            return {
                              ...part,
                              middleName: event.target.value
                            }
                          }
                          return part
                        })

                      return temp
                    })
                  }}
                  value={participant.middleName ?? ''}
                />
              </div>
              <div className="flex flex-row gap-2 items-center text-nowrap">
                <span>Last Name:</span>
                <input
                  className={`
                    font-thin p-0 text-xs border-transparent ring-transparent w-full border-b-gray-400 
                    border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic
                  `}
                  placeholder="Last Name..."
                  onChange={(event) => {
                    setParticipants((prev) => {
                      const temp = [...prev]
                        .map((part) => {
                          if(part.id === participant.id) {
                            return {
                              ...part,
                              lastName: event.target.value
                            }
                          }
                          return part
                        })

                      return temp
                    })
                  }}
                  value={participant.lastName}
                />
              </div>
              <div className="flex flex-row gap-2 items-center text-nowrap">
                <span>Email:</span>
                <input
                  className={`
                    font-thin p-0 text-xs border-transparent ring-transparent w-full border-b-gray-400 
                    border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic
                  `}
                  placeholder="Email..."
                  onChange={(event) => {
                    setParticipants((prev) => {
                      const temp = [...prev]
                        .map((part) => {
                          if(part.id === participant.id) {
                            return {
                              ...part,
                              email: event.target.value
                            }
                          }
                          return part
                        })

                      return temp
                    })
                  }}
                  value={participant.email ?? ''}
                />
              </div>
              <div className="flex flex-row gap-2 items-center text-nowrap">
                <span>Tags:</span>
                <TagPicker 
                  allowMultiple
                  className='
                    font-thin p-0 text-xs border-transparent ring-transparent w-full border-b-gray-400 
                    border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic
                  '
                  tags={props.tagsQuery.data ?? []}
                  parentPickTag={(tag) => {
                    const selectedTag = participant.userTags.some((pTag) => pTag.id === tag.id)

                    if(selectedTag) {
                      setParticipants((prev) => {
                        const temp = [...prev]
                          .map((part) => {
                            if(part.id === participant.id) {
                              return {
                                ...part,
                                userTags: part.userTags.filter((pTag) => pTag.id !== tag.id)
                              }
                            }
                            return part
                          })

                        return temp
                      })
                    }
                    else {
                      setParticipants((prev) => {
                        const temp = [...prev]
                          .map((part) => {
                            if(part.id === participant.id) {
                              return {
                                ...part,
                                userTags: [...part.userTags, tag]
                              }
                            }
                            return part
                          })

                        return temp
                      })
                    }
                  }}
                  pickedTag={participant.userTags}
                />
              </div>
              <button 
                className="self-end border rounded-lg py-1 px-2 hover:bg-gray-50 hover:border-gray-300"
                onClick={() => {
                  setParticipants(participants.filter((part) => part.id !== participant.id))
                }}
              >Delete</button>
              <div className="border-gray-300 border mb-1 mt-1"/>
            </div>
          )
        })}
      </div>
      <button 
        onClick={() => {
          inviteUser.mutate({
            sittingNumber: parseInt(sittingNumber),
            email: props.email,
            firstName: firstName,
            lastName: lastName,
            participants: participants,
            baseLink: link,
            options: {
              logging: true
            }
          })

          props.submit({
            email: props.email,
            firstName: firstName,
            lastName: lastName,
            participant: participants,
            sittingNumber: /^\d*$/g.test(sittingNumber) && !isNaN(parseInt(sittingNumber)) ? parseInt(sittingNumber) : 0,
            userTags: [],
            preferredContact: 'EMAIL'
          })
        }}
        className="self-end me-2 mb-1 border rounded-lg py-1 px-2 hover:bg-gray-50 hover:border-gray-300"
      >
        Invite
      </button>
    </div>
  )
}