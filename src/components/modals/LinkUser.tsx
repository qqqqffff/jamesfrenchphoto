import { UseQueryResult } from "@tanstack/react-query";
import { ModalProps } from ".";
import { TableColumn, UserProfile, UserTag } from "../../types";
import { FC, useEffect, useState } from "react";
import { Dropdown, Modal } from "flowbite-react";
import { ParticipantPanel } from "../common/ParticipantPanel";
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";
import { UserService } from "../../services/userService";

interface LinkUserModalProps extends ModalProps {
  UserService: UserService
  userProfile: UserProfile
  tableColumns: TableColumn[]
  rowIndex: number,
  tags: UseQueryResult<UserTag[] | undefined, Error>,
}

type UserFieldLinks = {
  email: [string, string],
  first: [string, 'update' | 'override'] | null,
  last: [string, 'update' | 'override'] | null,
  sitting: [string, 'update' | 'override'] | null,
}

export type ParticipantFieldLinks = {
  id: string,
  first: [string, 'update' | 'override'] | null, 
  last: [string, 'update' | 'override'] | null,
  middle: [string, 'update' | 'override'] | null,
  preferred: [string, 'update' | 'override'] | null,
  email: [string, 'update' | 'override'] | null,
  tags: [string, 'update' | 'override'] | null,
}

export const LinkUserModal: FC<LinkUserModalProps> = (props) => {
  const [linkedUserFields, setLinkedUserFields] = useState<UserFieldLinks>()
  const [linkedParticipantFields, setLinkedParticipantFields] = useState<ParticipantFieldLinks[]>([])

  useEffect(() => {
    const linkedUser: UserFieldLinks = linkedUserFields ? {...linkedUserFields} : {
      email: [props.userProfile.email, ''],
      first: null,
      last: null,
      sitting: null
    }
    
    const linkedParticipants: ParticipantFieldLinks[] = linkedParticipantFields.length === 0 ? props.userProfile.participant.map((participant) => {
      return ({
        id: participant.id,
        first: null,
        last: null,
        middle: null,
        preferred: null,
        email: null,
        tags: null
      })
    }) : linkedParticipantFields
    //TODO: investigate how to get linking to working for multiple participants & smarter with local compare

    if(props.tableColumns.length > 0 && props.tableColumns[0].values[props.rowIndex] !== undefined) {
      for(let i = 0; i < props.tableColumns.length; i++) {
        const column = props.tableColumns[i]
        const foundChoice = (column.choices ?? [])?.[props.rowIndex]
        //skip if mapping already exits for this column
        if(foundChoice === undefined || (!foundChoice.includes('userEmail') && !foundChoice.includes('participantId'))) continue
        const normalHeader = column.header.toLocaleLowerCase()
        if(
          column.type === 'value' &&
          !(
            normalHeader.includes('participant') || 
            normalHeader.includes('duchess') || 
            normalHeader.includes('deb') || 
            normalHeader.includes('escort') 
          )
        ) {
          if(
            normalHeader.includes('first') &&
            linkedUser.first === null
          ) {
            linkedUser.first = [
              column.id, 
              column.values[props.rowIndex] === '' ? 'override' : 'update'
            ]
          }
          else if(
            normalHeader.includes('last') &&
            linkedUser.last === null
          ) {
            linkedUser.last = [
              column.id, 
              column.values[props.rowIndex] === '' ? "override" : 'update'
            ]
          }
          else if(
            normalHeader.includes('sitting') &&
            linkedUser.sitting === null
          ) {
            linkedUser.sitting = [
              column.id, 
              column.values[props.rowIndex] !== '' ? 'override' : 'update'
            ]
          }
          else if(
            normalHeader.includes('email') &&
            linkedUser.email[0] === column.values[props.rowIndex] &&
            linkedUser.email[1] === ''
          ) {
            linkedUser.email = [linkedUser.email[0], column.id]
          }
        }
        else if(
          (
            normalHeader.includes('participant') || 
            normalHeader.includes('duchess') || 
            normalHeader.includes('deb') || 
            normalHeader.includes('escort') ||
            column.type === 'tag'
          ) &&
          linkedParticipants.length > 0
        ) {
          if(
            normalHeader.includes('first') &&
            linkedParticipants[0].first === null
          ) {
            linkedParticipants[0].first = [
              column.id, 
              column.values[props.rowIndex] === '' ? 'override' : 'update'
            ]
          }
          else if(
            normalHeader.includes('last') &&
            linkedParticipants[0].last === null
          ) {
            linkedParticipants[0].last = [
              column.id, 
              column.values[props.rowIndex] === '' ? 'override' : 'update'
            ]
          }
          else if(
            normalHeader.includes('middle') &&
            linkedParticipants[0].middle === null
          ) {
            linkedParticipants[0].middle = [
              column.id, 
              column.values[props.rowIndex] === '' ? 'override' : 'update'
            ]
          }
          else if(
            normalHeader.includes('prefer') &&
            linkedParticipants[0].preferred === null
          ) {
            linkedParticipants[0].preferred = [
              column.id, 
              column.values[props.rowIndex] === '' ? 'override' : 'update'
            ]
          }
          else if(
            normalHeader.includes('email') &&
            linkedParticipants[0].email === null
          ) {
            linkedParticipants[0].email = [
              column.id, 
              column.values[props.rowIndex] === '' ? 'override' : 'update'
            ]
          }
        }
      }
    }

    setLinkedUserFields(linkedUser)
    setLinkedParticipantFields(linkedParticipants)
  }, [
    props.userProfile,
    props.tableColumns,
    props.open
  ])



  const filteredUserFields = props.tableColumns.filter((column) => {
    return (
      linkedUserFields === undefined || (
        (linkedUserFields.first === null || linkedUserFields.first[0] !== column.id) &&
        (linkedUserFields.last === null || linkedUserFields.last[0] !== column.id) &&
        (linkedUserFields.sitting === null || linkedUserFields.sitting[0] !== column.id) &&
        (linkedUserFields.email[0] !== column.id) &&
        linkedParticipantFields.every((participantLink) => {
          return (
            (participantLink.first === null || participantLink.first[0] !== column.id) &&
            (participantLink.last === null || participantLink.last[0] !== column.id) &&
            (participantLink.email === null || participantLink.email[0] !== column.id) &&
            (participantLink.middle === null || participantLink.middle[0] !== column.id) &&
            (participantLink.preferred === null || participantLink.preferred[0] !== column.id) &&
            (participantLink.tags === null || participantLink.tags[0] !== column.id)
          )
        })
      ) 
    )
  })

  return (
    <Modal show={props.open} onClose={() => {
      props.onClose()
      setLinkedUserFields(undefined)
      setLinkedParticipantFields([])
    }} size='xl'>
      <Modal.Header>Link User</Modal.Header>
      <Modal.Body className="pb-2">
        <div className="flex flex-col px-2 pb-1 max-h-[68vh] min-h-[68vh]">
          <span className="font-medium whitespace-nowrap text-lg text-blue-400">User Info</span>
          <div className="flex flex-col px-2 text-xs">
            <div className="flex flex-row gap-2 items-center text-nowrap">
              <span>Sitting Number:</span>
              <span className="italic">{props.userProfile.sittingNumber}</span>
              <Dropdown
                inline
                arrowIcon={false}
                label={linkedUserFields?.sitting !== null ? (
                  <HiOutlineLockClosed size={16} className="hover:text-gray-300" />
                ) : (
                  <HiOutlineLockOpen size={16} className="hover:text-gray-300" />
                )}
              >
                {linkedUserFields !== undefined && linkedUserFields.sitting !== null && props.tableColumns.some((columns) => columns.id === linkedUserFields.sitting?.[0]) && (
                  <Dropdown.Item
                    className="bg-gray-200 hover:bg-transparent" 
                    onClick={() => {
                      setLinkedUserFields({
                        ...linkedUserFields,
                        sitting: null,
                      })
                    }}
                  >{props.tableColumns.find((column) => column.id === linkedUserFields.sitting?.[0])?.header}</Dropdown.Item>
                )}
                {filteredUserFields.map((column) => (
                  <Dropdown.Item 
                    key={column.id}
                    onClick={() => {
                      setLinkedUserFields({
                        ...linkedUserFields === undefined ? {
                          sitting: [column.id, 'update'],
                          email: [props.userProfile.email, ''],
                          first: null,
                          last: null
                        } : {
                          ...linkedUserFields,
                          sitting: linkedUserFields.sitting === null ? [
                            column.id, 'update'
                          ] : null
                        },
                      })
                    }}
                  >{column.header}</Dropdown.Item>
                ))}
              </Dropdown>
              {linkedUserFields !== undefined && 
              linkedUserFields.sitting !== null && 
              props.tableColumns.some((column) => column.id === linkedUserFields.sitting?.[0]) && (
                <button
                  className="px-2 py-1 rounded-sm border hover:bg-gray-200"
                  onClick={() => {
                    if(linkedUserFields.sitting !== null) {
                      setLinkedUserFields({
                        ...linkedUserFields,
                        sitting: [
                          linkedUserFields.sitting[0], 
                          linkedUserFields.sitting[1] === 'override' ? 'update' : 'override'
                        ]
                      })
                    }
                  }}
                >
                  {linkedUserFields.sitting[1] === 'override' ? 'Override' : 'Update'}
                </button>
              )}
            </div>
            <div className="flex flex-row gap-2 items-center text-nowrap">
              <span>First Name:</span>
              <span className="italic">{props.userProfile.firstName}</span>
              <Dropdown
                inline
                arrowIcon={false}
                label={linkedUserFields?.first !== null ? (
                  <HiOutlineLockClosed size={16} className="hover:text-gray-300" />
                ) : (
                  <HiOutlineLockOpen size={16} className="hover:text-gray-300" />
                )}
              >
                {linkedUserFields !== undefined && linkedUserFields.first !== null && props.tableColumns.some((columns) => columns.id === linkedUserFields.first?.[0]) && (
                  <Dropdown.Item
                    className="bg-gray-200 hover:bg-transparent" 
                    onClick={() => {
                      setLinkedUserFields({
                        ...linkedUserFields,
                        first: null,
                      })
                    }}
                  >{props.tableColumns.find((column) => column.id === linkedUserFields?.first?.[0])?.header}</Dropdown.Item>
                )}
                {filteredUserFields.map((column) => (
                  <Dropdown.Item 
                    key={column.id}
                    onClick={() => {
                      setLinkedUserFields({
                        ...linkedUserFields === undefined ? {
                          first: [column.id, 'update'],
                          email: [props.userProfile.email, ''],
                          sitting: null,
                          last: null
                        } : {
                          ...linkedUserFields,
                          first: linkedUserFields.first === null ? [
                            column.id, 'update'
                          ] : null
                        },
                      })
                    }}
                  >{column.header}</Dropdown.Item>
                ))}
              </Dropdown>
              {linkedUserFields !== undefined && 
              linkedUserFields.first !== null && 
              linkedUserFields.first[0] &&
              props.tableColumns.some((column) => column.id === linkedUserFields.first?.[1]) && (
                <button
                  className="px-2 py-1 rounded-sm border hover:bg-gray-200"
                  onClick={() => {
                    if(linkedUserFields.first !== null) {
                      setLinkedUserFields({
                        ...linkedUserFields,
                        first: [
                          linkedUserFields.first[0], 
                          linkedUserFields.first[1] === 'override' ? 'update' : 'override'
                        ]
                      })
                    }
                  }}
                >
                  {linkedUserFields.first[1] === 'override' ? 'Override' : 'Update'}
                </button>
              )}
            </div>
            <div className="flex flex-row gap-2 items-center text-nowrap">
              <span>Last Name:</span>
              <span className="italic">{props.userProfile.lastName}</span>
              <Dropdown
                inline
                arrowIcon={false}
                label={linkedUserFields?.last !== null ? (
                  <HiOutlineLockClosed size={16} className="hover:text-gray-300" />
                ) : (
                  <HiOutlineLockOpen size={16} className="hover:text-gray-300" />
                )}
              >
                {linkedUserFields !== undefined && linkedUserFields.last !== null && props.tableColumns.some((columns) => columns.id === linkedUserFields.last?.[0]) && (
                  <Dropdown.Item
                    className="bg-gray-200 hover:bg-transparent" 
                    onClick={() => {
                      setLinkedUserFields({
                        ...linkedUserFields,
                        last: null,
                      })
                    }}
                  >{props.tableColumns.find((column) => column.id === linkedUserFields.last?.[1])?.header}</Dropdown.Item>
                )}
                {filteredUserFields.map((column) => (
                  <Dropdown.Item 
                    key={column.id}
                    onClick={() => {
                      setLinkedUserFields({
                        ...linkedUserFields === undefined ? {
                          last: [column.id, 'update'],
                          email: [props.userProfile.email, ''],
                          sitting: null,
                          first: null
                        } : {
                          ...linkedUserFields,
                          last: linkedUserFields.last === null || linkedUserFields.last[0] !== column.id ? [
                            column.id, linkedUserFields.last === null ? 'update' : linkedUserFields.last[1]
                          ] : null
                        },
                      })
                    }}
                  >{column.header}</Dropdown.Item>
                ))}
              </Dropdown>
              {linkedUserFields !== undefined && 
              linkedUserFields.last !== null && 
              linkedUserFields.last[0] &&
              props.tableColumns.some((column) => column.id === linkedUserFields.last?.[0]) && (
                <button
                  className="px-2 py-1 rounded-sm border hover:bg-gray-200"
                  onClick={() => {
                    if(linkedUserFields.last !== null) {
                      setLinkedUserFields({
                        ...linkedUserFields,
                        last: [
                          linkedUserFields.last[0], 
                          linkedUserFields.last[1] === 'override' ? 'update' : 'override'
                        ]
                      })
                    }
                  }}
                >
                  {linkedUserFields.last[1] === 'override' ? 'Override' : 'Update'}
                </button>
              )}
            </div>
            <div className="flex flex-row gap-2 items-center text-nowrap">
              <span>Email:</span>
              <span className="italic">{props.userProfile.email}</span>
              <Dropdown
                inline
                arrowIcon={false}
                label={linkedUserFields?.email[1] !== '' ? (
                  <HiOutlineLockClosed size={16} className="hover:text-gray-300" />
                ) : (
                  <HiOutlineLockOpen size={16} className="hover:text-gray-300" />
                )}
              >
                {linkedUserFields !== undefined && linkedUserFields.email[0] !== '' && props.tableColumns.some((columns) => columns.id === linkedUserFields.email[0]) && (
                  <Dropdown.Item className='bg-gray-200 hover:bg-transparent' onClick={() => {
                    setLinkedUserFields({
                      ...linkedUserFields,
                      email: [props.userProfile.email, ''],
                    })
                  }}>{props.tableColumns.find((column) => column.id === linkedUserFields.email[0])?.header}</Dropdown.Item>
                )}
                {filteredUserFields.map((column) => (
                  <Dropdown.Item 
                    key={column.id}
                    onClick={() => {
                      setLinkedUserFields({
                        ...linkedUserFields === undefined ? {
                          last: null,
                          email: [props.userProfile.email, column.id],
                          sitting: null,
                          first: null
                        } : {
                          ...linkedUserFields,
                          email: [props.userProfile.email, column.id]
                        },
                      })
                    }}
                  >{column.header}</Dropdown.Item>
                ))}
              </Dropdown>
            </div>
            <div className="border mt-2"/>
            {props.userProfile.participant
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((participant, index) => {
              // TODO: implement admin options to delete participants
              return (
                <div key={index}>
                  <ParticipantPanel 
                    participant={participant}
                    showOptions={{
                      linkedFields: {
                        participantLinks: linkedParticipantFields.find((link) => link.id === participant.id) ?? {
                          id: participant.id,
                          first: null,
                          last: null,
                          middle: null,
                          preferred: null,
                          email: null,
                          tags: null
                        },
                        rowIndex: props.rowIndex,
                        tags: props.tags.data ?? [],
                        availableOptions: filteredUserFields,
                        allColumns: props.tableColumns,
                        toggleField: setLinkedParticipantFields
                      }
                    }}
                  />
                  <div className="border"/>
                </div>
              )
            })}
          </div>
        </div>
      </Modal.Body>
    </Modal>
  )
}