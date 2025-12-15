import { FC, useEffect, useState } from "react";
import { ModalProps } from ".";
import { Button, Modal } from "flowbite-react";
import { Participant, TableColumn, Timeslot, UserProfile, UserTag } from "../../types";
import { v4 } from 'uuid'
import { validateMapField } from "../../functions/tableFunctions";
import validator from 'validator'
import { useMutation, UseQueryResult } from "@tanstack/react-query";
import { HiOutlinePlusCircle } from "react-icons/hi2";
import { TagPicker } from "../admin/package/TagPicker";
import { ParticipantFieldLinks, UserFieldLinks } from "./LinkUser";
import { LinkUserMutationParams, UserService } from "../../services/userService";

interface CreateUserModalProps extends ModalProps {
  createUser: (userProfile: UserProfile) => void
  tableColumns: TableColumn[]
  rowNumber: number,
  tags: UseQueryResult<UserTag[] | undefined, Error>
  UserService: UserService,
}

//TODO: validations for non-currently existing user email required
export const CreateUserModal: FC<CreateUserModalProps> = (props) => {
  const [sittingNumber, setSittingNumber] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState<string>('')
  const emptyParticipant = (): Participant => {
    return {
      id: v4(),
      createdAt: new Date().toISOString(),
      firstName: '',
      lastName: '',
      userTags: [],
      contact: false,
      userEmail: email,
      notifications: [],
      collections: []
    }
  }
  const [participants, setParticipants] = useState<Participant[]>([emptyParticipant()])
  const [availableTags, setAvailableTags] = useState<UserTag[]>([])
  const [loading, setLoading] = useState(false)

  const [participantFieldLinks, setParticipantFieldLinks] = useState<ParticipantFieldLinks[]>([])
  const [userFieldLinks, setUserFieldLinks] = useState<UserFieldLinks>({
    email: ['', ''],
    first: null,
    last: null,
    sitting: null
  })

  useEffect(() => {
    const tempUserFieldLinks: UserFieldLinks = {
      email: ['', ''],
      first: null,
      last: null,
      sitting: null
    }

    const tempParticipants = [...participants]
    let tempFirst = ''
    let tempLast = ''
    let tempSitting = ''
    let tempEmail = ''
    if(tempParticipants.length === 0) {
      tempParticipants.push(emptyParticipant())
    }

    const participantFieldLinks: ParticipantFieldLinks[] = tempParticipants.map((participant) => ({
      id: participant.id,
      first: null,
      last: null,
      middle: null,
      preferred: null,
      email: null,
      tags: null,
      timeslot: null,
      notifications: null
    }))
    
    
    // auto populating / multiple participants not supported
    if(props.tableColumns.length > 0 && props.tableColumns[0].values[props.rowNumber] !== undefined) {
      for(let i = 0; i < props.tableColumns.length; i++) {
        const normalizedHeader = props.tableColumns[i].header.toLocaleLowerCase()
        if(props.tableColumns[i].type === 'value') {
          if(
            normalizedHeader.includes('participant') || 
            normalizedHeader.includes('duchess') || 
            normalizedHeader.includes('deb') || 
            normalizedHeader.includes('escort') ||
            normalizedHeader.includes('daughter') ||
            normalizedHeader.includes('son') ||
            normalizedHeader.includes('child')
          ) {
            if(normalizedHeader.includes('first')) {
              const updatedParticipant = validateMapField('first', { 
                participant: tempParticipants[0], 
                value: props.tableColumns[i].values[props.rowNumber] 
              }, undefined)[1] as Participant | undefined

              if(updatedParticipant && updatedParticipant.firstName === props.tableColumns[i].values[props.rowNumber]) {
                tempParticipants[0] = updatedParticipant
                participantFieldLinks[0].first = [props.tableColumns[i].id, 'override']
              }
            }
            if(normalizedHeader.includes('last')) {
              const updatedParticipant = validateMapField('last', { 
                participant: tempParticipants[0], 
                value: props.tableColumns[i].values[props.rowNumber] 
              }, undefined)[1] as Participant | undefined

              if(updatedParticipant && updatedParticipant.lastName === props.tableColumns[i].values[props.rowNumber]) {
                tempParticipants[0] = updatedParticipant
                participantFieldLinks[0].last = [props.tableColumns[i].id, 'override']
              }
            }
            if(normalizedHeader.includes('middle')) {
              const updatedParticipant = validateMapField('middle', { 
                participant: tempParticipants[0], 
                value: props.tableColumns[i].values[props.rowNumber] 
              }, undefined)[1] as Participant | undefined

              if(updatedParticipant && updatedParticipant.middleName === props.tableColumns[i].values[props.rowNumber]) {
                tempParticipants[0] = updatedParticipant
                participantFieldLinks[0].middle = [props.tableColumns[i].id, 'override']
              }
            }
            if(normalizedHeader.includes('prefer')) {
              const updatedParticipant = validateMapField('preferred', { 
                participant: tempParticipants[0], 
                value: props.tableColumns[i].values[props.rowNumber] 
              }, undefined)[1] as Participant | undefined

              if(updatedParticipant && updatedParticipant.preferredName === props.tableColumns[i].values[props.rowNumber]) {
                tempParticipants[0] = updatedParticipant
                participantFieldLinks[0].preferred = [props.tableColumns[i].id, 'override']
              }
            }
            if(normalizedHeader.includes('middle')) {
              const updatedParticipant = validateMapField('middle', { 
                participant: tempParticipants[0], 
                value: props.tableColumns[i].values[props.rowNumber] 
              }, undefined)[1] as Participant | undefined

              if(updatedParticipant && updatedParticipant.middleName === props.tableColumns[i].values[props.rowNumber]) {
                tempParticipants[0] = updatedParticipant
                participantFieldLinks[0].middle = [props.tableColumns[i].id, 'override']
              }
            }
            if(
              normalizedHeader.includes('email') &&
              validator.isEmail(props.tableColumns[i].values[props.rowNumber])
            ) {
              tempParticipants[0] = {
                ...tempParticipants[0],
                email: props.tableColumns[i].values[props.rowNumber]
              }
              participantFieldLinks[0].email = [props.tableColumns[i].id, 'override']
            }
          }
          else if(normalizedHeader.includes('first')) {
            tempFirst = props.tableColumns[i].values[props.rowNumber]
            tempUserFieldLinks.first = [props.tableColumns[i].id, 'override']
          }
          else if(normalizedHeader.includes('last')) {
            tempLast = props.tableColumns[i].values[props.rowNumber]
            tempUserFieldLinks.last = [props.tableColumns[i].id, 'override']
          }
          else if(
            normalizedHeader.includes('sitting') &&
            !isNaN(Number(props.tableColumns[i].values[props.rowNumber]))
          ) {
            tempSitting = props.tableColumns[i].values[props.rowNumber]
            tempUserFieldLinks.sitting = [props.tableColumns[i].id, 'override']
          }
          else if(
            normalizedHeader.includes('email') &&
            validator.isEmail(props.tableColumns[i].values[props.rowNumber])
          ) {
            tempEmail = props.tableColumns[i].values[props.rowNumber]
            tempParticipants[0].userEmail = props.tableColumns[i].values[props.rowNumber]
            tempUserFieldLinks.email = [props.tableColumns[i].values[props.rowNumber].toLowerCase(), props.tableColumns[i].id]
          }
        }
        else if(props.tableColumns[i].type === 'tag') {
          const value = props.tableColumns[i].values[props.rowNumber]
          const cellTags = (value.split(',') ?? [])
          .filter((tag) => tag !== '')
          .map((tag) => {
            //only shallow depth required
            const userTag: UserTag = {
              id: tag,
              name: '',
              children: [],
              participants: [],
              createdAt: ''
            }

            return userTag
          })

          tempParticipants[0].userTags.push(...cellTags)
          participantFieldLinks[0].tags = [props.tableColumns[i].id, 'override']
        }
        else if(props.tableColumns[i].type === 'date') {
          const value = props.tableColumns[i].values[props.rowNumber]
          const cellTimeslots = (value.split(',') ?? [])
          .filter((timeslot) => timeslot !== '')
          .map((timeslot) => {
            //only shallow depth required
            const shallowTimeslots: Timeslot = {
              id: timeslot,
              start: new Date(),
              end: new Date(),
            }

            return shallowTimeslots
          })

          tempParticipants[0].timeslot = tempParticipants[0].timeslot ? [...tempParticipants[0].timeslot, ...cellTimeslots] : cellTimeslots

          participantFieldLinks[0].timeslot = [props.tableColumns[i].id, 'override']
        }
      }
    }

    setParticipants(tempParticipants)
    setFirstName(tempFirst)
    setLastName(tempLast)
    setSittingNumber(tempSitting)
    setEmail(tempEmail)
    setParticipantFieldLinks(participantFieldLinks)
    setUserFieldLinks(userFieldLinks)
  }, [props.tableColumns, props.open])

  useEffect(() => {
    if(props.tags.data) {
      setAvailableTags(props.tags.data)
    }
  }, [props.tags])

  function clearStates() {
    setSittingNumber('')
    setEmail('')
    setFirstName('')
    setLastName('')
    setParticipants([emptyParticipant()])
  }

  /* required to be valid 
    - user fn
    - user ln
    - user email
    - sitting number
    - participants if any:
    - participant first
    - participant last
  */
  const allValid = (
    firstName === '' ||
    lastName === '' ||
    email === '' ||
    !validator.isEmail(email) ||
    sittingNumber === '' ||
    isNaN(Number(sittingNumber)) ||
    participants.some((participant) => {
      return (
        participant.firstName === '' ||
        participant.lastName === ''
      )
    })
  )

  const linkUser = useMutation({
    mutationFn: (params: LinkUserMutationParams) => props.UserService.linkUserMutation(params),
    onSuccess: () => {
      props.onClose()
      clearStates()
    }
  })

  return (
    <Modal show={props.open} onClose={() => {
      props.onClose()
      clearStates()
    }} size="xl">
      <Modal.Header className="pb-2">Create a new User</Modal.Header>
      <Modal.Body className="pb-2">
        <div className="flex flex-col px-2 pb-1 gap-4 max-h-[68vh] min-h-[68vh]">
          <div className="grid grid-cols-3 grid-flow-col border rounded-lg p-4">
            <div className="flex flex-col gap-2 col-span-2">
              <span className="text-lg underline italic">User Fields:</span>
              <div className="flex flex-row gap-2 items-center text-nowrap">
                <span>Email:</span>
                <input
                  className={`
                    font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 max-w-xs
                    border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic
                  `}
                  placeholder="User Email..."
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setParticipants((prev) => prev.map((participant) => ({ ...participant, userEmail: event.target.value })))
                  }}
                />
              </div>
              <div className="flex flex-row gap-2 items-center text-nowrap">
                <span>Sitting Number:</span>
                <input
                  className={`
                    font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 max-w-[200px]
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
                  value={sittingNumber}
                />
              </div>
              <div className="flex flex-row gap-2 items-center text-nowrap">
                <span>First Name:</span>
                <input
                  className={`
                    font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 max-w-[200px]
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
                    font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 max-w-[200px]
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
          </div>
          <div className="flex flex-col gap-2 border rounded-lg p-4">
            <div className="flex flex-row p-1 justify-between w-full">
              <span className="text-lg underline italic">Participants:</span>
              <button 
                className=""
                onClick={() => {
                  //push to top
                  setParticipants([emptyParticipant(), ...participants])
                }}
              >
                <HiOutlinePlusCircle size={20} className="text-gray-400 hover:text-gray-600 hover:fill-gray-100"/>
              </button>
            </div>
            <div className="flex flex-col px-2 pb-1 gap-4 max-h-[300px] overflow-auto">
              {participants.map((participant, index) => {
                return (
                  <div className="flex flex-row gap-4 justify-between rounded-lg border p-2" key={index} >
                    <div className="flex-col flex gap-2">
                      <div className="flex flex-row gap-2 items-center text-nowrap justify-between">
                        <span>First Name:</span>
                        <input
                          className={`
                            font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 max-w-[150px]
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
                      <div className="flex flex-row gap-2 items-center text-nowrap justify-between">
                        <span>Preferred Name:</span>
                        <input
                          className={`
                            font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 max-w-[150px]
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
                      <div className="flex flex-row gap-2 items-center text-nowrap justify-between">
                        <span>Middle Name:</span>
                        <input
                          className={`
                            font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 max-w-[150px]
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
                      <div className="flex flex-row gap-2 items-center text-nowrap justify-between">
                        <span>Last Name:</span>
                        <input
                          className={`
                            font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 max-w-[150px]
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
                      <div className="flex flex-row gap-2 items-center text-nowrap justify-between">
                        <span>Email:</span>
                        <input
                          className={`
                            font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 max-w-[150px]
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
                    </div>
                    <div className="flex flex-col justify-between">
                      <TagPicker 
                        allowMultiple
                        className='
                          font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 
                          border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic
                        '
                        tags={availableTags}
                        parentPickTag={(tag) => {
                          //TODO: address tag null case
                          if(tag) {
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
                          }
                        }}
                        pickedTag={participant.userTags.map((tag) => {
                          return availableTags.find((availableTag) => availableTag.id === tag.id)
                        }).filter((tag) => tag !== undefined)}
                      />
                      <button 
                        className="py-1 px-2 hover:bg-gray-50 hover:border-gray-300 border rounded-lg"
                        onClick={() => {
                          setParticipants(participants.filter((part) => part.id !== participant.id))
                        }}
                      >Delete</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <p className="italic text-sm"><sup>!</sup>Note: This action sends an email to the specified email address with a link to create an account</p>
      </Modal.Body>
      <Modal.Footer className="flex-row-reverse p-3">
        <Button 
          disabled={allValid}
          size="sm"
          isProcessing={loading}
          onClick={() => {
            const profile: UserProfile = {
              sittingNumber: Number(sittingNumber),
              email: email,
              userTags: [],
              participant: participants,
              firstName: firstName,
              lastName: lastName,
              preferredContact: 'EMAIL'
            }
            props.createUser(profile)

            if(userFieldLinks.email[0] !== '' || participantFieldLinks.some((link) => (
              link.first !== null ||
              link.last !== null ||
              link.middle !== null ||
              link.preferred !== null ||
              link.email !== null ||
              link.tags !== null ||
              link.timeslot !== null
            ))) {
              setLoading(true)
              linkUser.mutate({
                tableColumns: props.tableColumns,
                rowIndex: props.rowNumber,
                participantFieldLinks: participantFieldLinks,
                userFieldLinks: userFieldLinks,
                userProfile: profile,
                availableTags: props.tags.data ?? [],
                options: {
                  logging: true
                }
              })
            }
            else {
              props.onClose()
              clearStates()
            }
          }}
        >Create User</Button>
      </Modal.Footer>
    </Modal>
  )
}