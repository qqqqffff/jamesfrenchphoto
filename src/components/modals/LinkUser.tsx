import { UseMutationResult, useQueries, UseQueryResult } from "@tanstack/react-query";
import { ModalProps } from ".";
import { TableColumn, UserProfile, UserTag, Notification } from "../../types";
import { FC, useEffect, useState } from "react";
import { Button, Dropdown, Modal } from "flowbite-react";
import { ParticipantPanel } from "../common/ParticipantPanel";
import { HiOutlineChevronDown, HiOutlineLockClosed, HiOutlineLockOpen, HiOutlineChevronLeft } from "react-icons/hi2";
import { LinkUserMutationParams, UserService } from "../../services/userService";
import { TimeslotService } from "../../services/timeslotService";

interface LinkUserModalProps extends ModalProps {
  UserService: UserService
  TimeslotService: TimeslotService
  userProfile: UserProfile & { temp: boolean }
  tableColumns: TableColumn[],
  notifications: Notification[]
  rowIndex: number,
  tags: UseQueryResult<UserTag[] | undefined, Error>,
  linkUser: UseMutationResult<TableColumn[], Error, LinkUserMutationParams, unknown>
}

export type UserFieldLinks = {
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
  timeslot: [string, 'update' | 'override'] | null,
  notifications: [string, 'update' | 'override'] | null,
}

export const LinkUserModal: FC<LinkUserModalProps> = (props) => {
  const [linkedUserFields, setLinkedUserFields] = useState<UserFieldLinks>()
  const [linkedParticipantFields, setLinkedParticipantFields] = useState<ParticipantFieldLinks[]>([])
  const [showNotes, setShowNotes] = useState(false)

  //disgusting mapping logic to go from column id to query
  const timeslotQueries = useQueries({
    queries: linkedParticipantFields
    .map((participant) => participant.timeslot?.[0])
    .filter((columnId) => columnId !== undefined)
    .map((columnId) => props.tableColumns.find((column) => column.id === columnId))
    .filter((column) => column !== undefined)
    .flatMap((column) => column.values[props.rowIndex].split(',').filter((value) => value !== ''))
    .reduce((prev, cur) => {
      if(!prev.some((timeslotId) => timeslotId === cur)) {
        prev.push(cur)
      }
      return prev
    }, [] as string[])
    .filter((timeslotId) => !props.userProfile.participant
      .flatMap((participant) => (participant.timeslot ?? []))
      .some((timeslot) => timeslot.id === timeslotId)
    )
    .map((timeslotId) => props.TimeslotService.getTimeslotByIdQueryOptions(timeslotId, { siTag: false }))
  })

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
        tags: null,
        timeslot: null,
        notifications: null,
      })
    }) : linkedParticipantFields
    //TODO: investigate how to get linking to working for multiple participants & smarter with local compare

    if(props.tableColumns.length > 0 && props.tableColumns[0].values[props.rowIndex] !== undefined) {
      for(let i = 0; i < props.tableColumns.length; i++) {
        const column = props.tableColumns[i]
        const foundChoice = (column.choices ?? [])?.[props.rowIndex]
        //skip if mapping already exits for this column
        if(foundChoice !== undefined && foundChoice !== null && (foundChoice.includes('userEmail') || foundChoice.includes('participantId'))) continue
        const normalHeader = column.header.toLocaleLowerCase()
        if(
          column.type === 'value' &&
          !(
            normalHeader.includes('participant') || 
            normalHeader.includes('duchess') || 
            normalHeader.includes('deb') || 
            normalHeader.includes('escort') ||
            normalHeader.includes('daughter') ||
            normalHeader.includes('son') ||
            normalHeader.includes('child')
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
              column.values[props.rowIndex] === '' ? 'override' : 'update'
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
            column.type === 'tag' ||
            column.type === 'date'
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
          else if(
            column.type === 'tag' &&
            linkedParticipants[0].tags === null
          ) {
            linkedParticipants[0].tags = [
              column.id,
              column.values[props.rowIndex] === '' ? 'override' : 'update'
            ]
          }
          else if(
            column.type === 'date' &&
            linkedParticipants[0].timeslot === null
          ) {
            linkedParticipants[0].timeslot = [
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
    if(column.type !== 'tag' && column.type !== 'date' && column.type !== 'value') return false
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
            (participantLink.tags === null || participantLink.tags[0] !== column.id) &&
            (participantLink.timeslot === null || participantLink.timeslot[0] !== column.id) &&
            (participantLink.notifications === null || participantLink.notifications[0] !== column.id)
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
    }} size='lg'>
      <Modal.Header className="px-4 py-3">Link {props.userProfile.temp ? 'Temp User' : 'User'}</Modal.Header>
      <Modal.Body className="px-2 py-2">
        <div className="flex flex-col px-2 pb-1 max-h-[68vh] overflow-auto w-full">
          <span className="font-medium whitespace-nowrap text-lg text-blue-400 pb-2">User Info</span>
          <div className="flex flex-col text-xs">
            <div className="flex flex-row items-center text-nowrap justify-between w-full border-y py-1 px-2 min-h-[36px]">
              <div className="flex flex-row gap-2 items-center">
                <span>Sitting Number:</span>
                <span className="italic">
                  {linkedUserFields?.sitting !== null && 
                  linkedUserFields?.sitting[1] === 'update' &&
                  props.tableColumns.some((column) => column.id === linkedUserFields?.sitting?.[0]) ? (
                    props.tableColumns.find((column) => column.id === linkedUserFields.sitting?.[0])?.values[props.rowIndex]
                  ) : (
                    props.userProfile.sittingNumber
                  )}
                </span>
              </div>
              <div className="flex flex-row gap-4 me-2 items-center">
                {linkedUserFields !== undefined && 
                linkedUserFields.sitting !== null && 
                props.tableColumns.some((column) => column.id === linkedUserFields.sitting?.[0]) && (
                  <button
                    className="px-2 py-1 rounded-lg border hover:bg-gray-200"
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
                  {filteredUserFields.filter((column) => column.type === 'value').length === 0 ? (
                    <Dropdown.Item disabled>No available columns</Dropdown.Item>
                  ) : (filteredUserFields.filter((column) => column.type === 'value').map((column) => (
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
                  )))}
                </Dropdown>
              </div>
            </div>
            <div className="flex flex-row items-center text-nowrap justify-between w-full border-b py-1 px-2 min-h-[36px]">
              <div className="flex flex-row gap-2 items-center text-nowrap">
                <span>First Name:</span>
                <span className="italic">
                  {linkedUserFields?.first !== null && 
                  linkedUserFields?.first[1] === 'update' &&
                  props.tableColumns.some((column) => column.id === linkedUserFields?.first?.[0]) ? (
                    props.tableColumns.find((column) => column.id === linkedUserFields.first?.[0])?.values[props.rowIndex]
                  ) : (
                    props.userProfile.firstName
                  )}
                </span>
              </div>
              <div className="flex flex-row gap-4 me-2 items-center">
                {linkedUserFields !== undefined && 
                linkedUserFields.first !== null && 
                linkedUserFields.first[0] &&
                props.tableColumns.some((column) => column.id === linkedUserFields.first?.[0]) && (
                  <button
                    className="px-2 py-1 rounded-lg border hover:bg-gray-200"
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
                  {filteredUserFields.filter((column) => column.type === 'value').length === 0 ? ( 
                    <Dropdown.Item disabled>No available columns</Dropdown.Item>
                  ) : (filteredUserFields.filter((column) => column.type === 'value').map((column) => (
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
                  )))}
                </Dropdown>
              </div>
            </div>
            <div className="flex flex-row items-center text-nowrap justify-between w-full border-b py-1.5 px-2 min-h-[36px]">
              <div className="flex flex-row gap-2 items-center text-nowrap">
                <span>Last Name:</span>
                <span className="italic">
                  {linkedUserFields?.last !== null && 
                  linkedUserFields?.last[1] === 'update' &&
                  props.tableColumns.some((column) => column.id === linkedUserFields?.last?.[0]) ? (
                    props.tableColumns.find((column) => column.id === linkedUserFields.last?.[0])?.values[props.rowIndex]
                  ) : (
                    props.userProfile.lastName
                  )}
                </span>
              </div>
              <div className="flex flex-row gap-4 me-2 items-center">
                {linkedUserFields !== undefined && 
                linkedUserFields.last !== null && 
                linkedUserFields.last[0] &&
                props.tableColumns.some((column) => column.id === linkedUserFields.last?.[0]) && (
                  <button
                    className="px-2 py-1 rounded-lg border hover:bg-gray-200"
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
                    >{props.tableColumns.find((column) => column.id === linkedUserFields.last?.[0])?.header}</Dropdown.Item>
                  )}
                  {filteredUserFields.filter((column) => column.type === 'value').length === 0 ? (
                    <Dropdown.Item disabled>No available columns</Dropdown.Item>
                  ) : (filteredUserFields.filter((column) => column.type === 'value').map((column) => (
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
                  )))}
                </Dropdown>
              </div>
            </div>
            <div className="flex flex-row items-center text-nowrap justify-between w-full border-b py-1 px-2 min-h-[36px]">
              <div className="flex flex-row gap-2 items-center">
                <span>Email:</span>
                <span className="italic">{props.userProfile.email}</span>
              </div>
              {/* TODO: investigate how to do linking when user's email changes */}
              {/* <div className="flex flex-row gap-4 me-2 items-center">
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
                  {filteredUserFields.filter((column) => column.type === 'value' && validator.isEmail(column.values[props.rowIndex])).length === 0 ? (
                    <Dropdown.Item disabled>No available columns</Dropdown.Item>
                  ) : (filteredUserFields.filter((column) => column.type === 'value' && validator.isEmail(column.values[props.rowIndex])).map((column) => (
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
                  )))}
                </Dropdown>
              </div> */}
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
                      timeslot: true,
                      notifications: true,
                      linkedFields: {
                        participantLinks: linkedParticipantFields.find((link) => link.id === participant.id) ?? {
                          id: participant.id,
                          first: null,
                          last: null,
                          middle: null,
                          preferred: null,
                          email: null,
                          tags: null,
                          timeslot: null,
                          notifications: null
                        },
                        rowIndex: props.rowIndex,
                        tags: props.tags.data ?? [],
                        notifications: props.notifications,
                        timeslotQueries: timeslotQueries,
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
            <button 
              className={`
                w-full flex flex-row justify-between mt-2 ps-2 pe-4 py-1 
                border border-transparent ${showNotes ? 'border-b-gray-200' : ''} hover:bg-gray-100 hover:border-b-transparent hover:rounded-lg
              `}
              onClick={() => setShowNotes(!showNotes)}
            >
              <span>Link User Notes:</span>
              {showNotes ? (
                <HiOutlineChevronDown />
              ) : (
                <HiOutlineChevronLeft />
              )}
            </button>
            {showNotes && (
              <ol className="flex flex-col text-xs text-gray-500 italic gap-0.5 mt-1">
                <li>&bull; Linking means that cells are linked to user fields and updates to the table will update user's profile</li>
                <li className="flex flex-row">&bull;<HiOutlineLockClosed className="mx-1"/>Means that the user field is linked to the column listed in the dropdown</li>
                <li className="flex flex-row">&bull; Clicking <HiOutlineLockOpen className="mx-1"/>or<HiOutlineLockClosed className="mx-1"/>will display the available columns to link</li>
                <li>&bull; Clicking the linked column in the dropdown will unlink the column</li>
                <li>&bull; 'Update' means that the user profile will be updated with the linked value</li>
                <li>&bull; 'Override' means that the cell will be updated with the value from the user</li>
                <li>&bull; Keep in mind, field column links are mutually exclusive!</li>
              </ol>
            )}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer className="flex flex-row justify-end gap-2  px-2 py-2">
        <Button 
          size='xs'
          color="light"
          onClick={() => {
            props.onClose()
            setLinkedParticipantFields([])
            setLinkedUserFields(undefined)
          }}
        >Cancel</Button>
        <Button 
          size='xs'
          isProcessing={props.linkUser.isPending}
          disabled={linkedUserFields === undefined}
          onClick={() => {
            if(linkedUserFields !== undefined) {
              props.linkUser.mutate({
                tableColumns: props.tableColumns,
                rowIndex: props.rowIndex,
                participantFieldLinks: linkedParticipantFields,
                userFieldLinks: linkedUserFields,
                userProfile: props.userProfile,
                availableTags: props.tags.data ?? [],
                options: {
                  logging: true
                }
              })
            }
          }}
        >Confirm Link</Button>
      </Modal.Footer>
    </Modal>
  )
}