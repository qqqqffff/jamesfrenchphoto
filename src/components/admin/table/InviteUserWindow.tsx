import { Dropdown } from "flowbite-react"
import { Participant, Table, TableColumn, UserProfile } from "../../../types"
import { Dispatch, SetStateAction, useState } from "react"
import { HiOutlinePlusCircle } from "react-icons/hi2"
import { v4 } from 'uuid'
import { useMutation } from "@tanstack/react-query"
import { InviteUserParams, inviteUserMutation } from "../../../services/userService"

interface InviteUserWindowProps {
  email: string,
  table: Table,
  rowIndex: number,
  submit: Dispatch<SetStateAction<UserProfile | undefined>>
}

export const InviteUserWindow = (props: InviteUserWindowProps) => {
  const [firstName, setFirstName] = useState<string>('')
  const [lastName, setLastName] = useState<string>('')
  const [selectedColumns, setSelectedColumns] = useState<[TableColumn, string, "first" | 'last' | 'preferred' | 'email'][]>([])
  const [participants, setParticipants] = useState<Participant[]>([])

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
          <span>First Name:</span>
          <input
            className={`
              font-thin p-0 text-xs border-transparent ring-transparent w-full border-b-gray-400 
              border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic
            `}
            placeholder="First Name..."
            onChange={(event) => {
              const temp = [...selectedColumns].filter((col) => col[1] !== 'user' && col[2] !== 'first')

              setSelectedColumns(temp)
              setFirstName(event.target.value)
            }}
            value={firstName}
          />
          <Dropdown
            inline
          >
            {props.table.columns
              .filter(() => !selectedColumns.map((col) => col[0]).some((col) => col?.id === 'user'))
              .map((column, index) => {
                return (
                  <Dropdown.Item 
                    key={index}
                    className="text-xs"
                    onClick={() => {
                      setFirstName(column.values[props.rowIndex])
                      setSelectedColumns([...selectedColumns, [column, 'user', 'first']])
                    }}
                  >
                    {column.header}
                  </Dropdown.Item>
                )
              })
            }
          </Dropdown>
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
              const temp = [...selectedColumns].filter((col) => col[1] !== 'user' && col[2] !== 'last')

              setSelectedColumns(temp)
              setFirstName(event.target.value)
            }}
            value={lastName}
          />
          <Dropdown
            inline
          >
            {props.table.columns
              .filter(() => !selectedColumns.map((col) => col[0]).some((col) => col?.id === 'user'))
              .map((column, index) => {
                return (
                  <Dropdown.Item 
                    key={index}
                    className="text-xs"
                    onClick={() => {
                      setLastName(column.values[props.rowIndex])
                      setSelectedColumns([...selectedColumns, [column, 'user', 'last']])
                    }}
                  >
                    {column.header}
                  </Dropdown.Item>
                )
              })
            }
          </Dropdown>
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
              contact: false,
              userEmail: props.email,
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
                    const temp = [...selectedColumns].filter((col) => col[1] !== participant.id && col[2] !== 'first')

                    setSelectedColumns(temp)
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
                <Dropdown
                  inline
                >
                  {props.table.columns
                    .filter((column) => !selectedColumns.map((col) => col[0]).some((col) => col?.id === column.id))
                    .map((column, index) => {
                      return (
                        <Dropdown.Item 
                          key={index}
                          className="text-xs"
                          onClick={() => {
                            const temp = [...selectedColumns].filter((col) => col[1] !== participant.id && col[2] !== 'first')
                            setSelectedColumns([...temp, [column, participant.id, 'first']])
                            setParticipants((prev) => {
                              const temp = [...prev]
                                .map((part) => {
                                  if(part.id === participant.id){
                                    return {
                                      ...part,
                                      firstName: column.values[props.rowIndex]
                                    }
                                  }
                                  return part
                                })

                              return temp
                            })
                          }}
                        >
                          {column.header}
                        </Dropdown.Item>
                      )
                    })
                  }
                </Dropdown>
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
                    const temp = [...selectedColumns].filter((col) => col[1] !== participant.id && col[2] !== 'preferred')

                    setSelectedColumns(temp)
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
                  value={participant.preferredName}
                />
                <Dropdown
                  inline
                >
                  {props.table.columns
                    .filter((column) => !selectedColumns.map((col) => col[0]).some((col) => col?.id === column.id))
                    .map((column, index) => {
                      return (
                        <Dropdown.Item
                          key={index} 
                          className="text-xs"
                          onClick={() => {
                            const temp = [...selectedColumns].filter((col) => col[1] !== participant.id && col[2] !== 'preferred')
                            setSelectedColumns([...temp, [column, participant.id, 'preferred']])
                            setParticipants((prev) => {
                              const temp = [...prev]
                                .map((part) => {
                                  if(part.id === participant.id){
                                    return {
                                      ...part,
                                      preferredName: column.values[props.rowIndex]
                                    }
                                  }
                                  return part
                                })

                              return temp
                            })
                          }}
                        >
                          {column.header}
                        </Dropdown.Item>
                      )
                    })
                  }
                </Dropdown>
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
                    const temp = [...selectedColumns].filter((col) => col[1] !== participant.id && col[2] !== 'last')

                    setSelectedColumns(temp)
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
                <Dropdown
                  inline
                >
                  {props.table.columns
                    .filter((column) => !selectedColumns.map((col) => col[0]).some((col) => col?.id === column.id))
                    .map((column, index) => {
                      return (
                        <Dropdown.Item
                          key={index}
                          className="text-xs"
                          onClick={() => {
                            const temp = [...selectedColumns].filter((col) => col[1] !== participant.id && col[2] !== 'last')
                            setSelectedColumns([...temp, [column, participant.id, 'last']])
                            setParticipants((prev) => {
                              const temp = [...prev]
                                .map((part) => {
                                  if(part.id === participant.id){
                                    return {
                                      ...part,
                                      lastName: column.values[props.rowIndex]
                                    }
                                  }
                                  return part
                                })

                              return temp
                            })
                          }}
                        >
                          {column.header}
                        </Dropdown.Item>
                      )
                    })
                  }
                </Dropdown>
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
                    const temp = [...selectedColumns].filter((col) => col[1] !== participant.id && col[2] !== 'email')

                    setSelectedColumns(temp)
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
                  value={participant.email}
                />
                <Dropdown
                  inline
                >
                  {props.table.columns
                    .filter((column) => !selectedColumns.map((col) => col[0]).some((col) => col?.id === column.id))
                    .map((column, index) => {
                      return (
                        <Dropdown.Item 
                          key={index}
                          className="text-xs"
                          onClick={() => {
                            const temp = [...selectedColumns].filter((col) => col[1] !== participant.id && col[2] !== 'email')
                            setSelectedColumns([...temp, [column, participant.id, 'email']])
                            setParticipants((prev) => {
                              const temp = [...prev]
                                .map((part) => {
                                  if(part.id === participant.id){
                                    return {
                                      ...part,
                                      firstName: column.values[props.rowIndex]
                                    }
                                  }
                                  return part
                                })

                              return temp
                            })
                          }}
                        >
                          {column.header}
                        </Dropdown.Item>
                      )
                    })
                  }
                </Dropdown>
              </div>
              <button 
                className="self-end border rounded-lg py-1 px-2 hover:bg-gray-50 hover:border-gray-300"
                onClick={() => {
                  setParticipants(participants.filter((part) => part.id !== participant.id))
                  setSelectedColumns(selectedColumns.filter((column) => column[1] !== participant.id))
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
            sittingNumber: 0,
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