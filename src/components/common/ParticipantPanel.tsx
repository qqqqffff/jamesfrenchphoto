import { Dispatch, SetStateAction } from "react"
import { Participant, TableColumn, Timeslot, UserTag } from "../../types"
import { formatTime, formatTimeslotDates } from "../../utils"
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";
import { Dropdown } from "flowbite-react";
import { ParticipantFieldLinks } from "../modals/LinkUser";
import { DefinedUseQueryResult, QueryObserverLoadingErrorResult, QueryObserverLoadingResult, QueryObserverPendingResult, QueryObserverPlaceholderResult } from "@tanstack/react-query";
import { Notification } from "../../types";


interface ParticipantPanelProps {
  participant: Participant
  hiddenOptions?: {
    tags?: boolean
  }
  showOptions?: {
    timeslot?: boolean,
    notifications?: boolean,
    linkedFields?: {
      participantLinks: ParticipantFieldLinks,
      toggleField: Dispatch<SetStateAction<ParticipantFieldLinks[]>>,
      availableOptions: TableColumn[],
      allColumns: TableColumn[],
      tags: UserTag[],
      timeslotQueries: (DefinedUseQueryResult<Timeslot | null, Error> | QueryObserverLoadingErrorResult<Timeslot | null, Error> | QueryObserverLoadingResult<Timeslot | null, Error> | QueryObserverPendingResult<Timeslot | null, Error> | QueryObserverPlaceholderResult<Timeslot | null, Error>)[]
      notifications: Notification[]
      rowIndex: number,
      noColumnModification?: boolean
    }
  }
}

export const ParticipantPanel = (props: ParticipantPanelProps) => {
  const timeslots = props.showOptions?.linkedFields?.allColumns.find((column) => column.id === props.showOptions?.linkedFields?.participantLinks.timeslot?.[0])
    ?.values[props.showOptions?.linkedFields?.rowIndex ?? 0].split(',')
    .map((timeslotId) => props.showOptions?.linkedFields?.timeslotQueries.map((query) => query.data).find((timeslot) => timeslot?.id === timeslotId))
    .filter((timeslot) => timeslot !== null && timeslot !== undefined)

  const notifications = [props.showOptions?.linkedFields?.allColumns.find((column) => column.id === props.showOptions?.linkedFields?.participantLinks.notifications?.[0])
    ?.values[props.showOptions.linkedFields.rowIndex ?? 0] ?? '']
    .map((notificationId) => props.showOptions?.linkedFields?.notifications.find((notification) => notification.id === notificationId))
    .filter((notification) => notification !== undefined)
  
  return (
    <div className="flex flex-col">
      <span className='text-purple-400 py-2 text-sm'>Participant</span>
      <div className="flex flex-col text-xs pb-1 max-h-96 overflow-y-auto">
        <div className="flex flex-row gap-2 items-center text-nowrap justify-between w-full border-y py-1 px-2 min-h-[36px]">
          <div className="flex flex-row gap-2 items-center">
            <span>First Name:</span>
            <span className="italic">{
            props.showOptions?.linkedFields?.participantLinks.first !== null &&
            props.showOptions?.linkedFields?.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.first?.[0]) &&
            props.showOptions.linkedFields.participantLinks.first[1] === 'update' ? (
              props.showOptions.linkedFields.allColumns.find((column) => column.id === props.showOptions?.linkedFields?.participantLinks.first?.[0])?.values[props.showOptions.linkedFields.rowIndex]
            ) : (
              props.participant.firstName
            )}</span>
          </div>
          {props.showOptions?.linkedFields !== undefined && (
            <div className="flex flex-row gap-4 me-2 items-center">
              {props.showOptions.linkedFields.noColumnModification !== true &&
              props.showOptions.linkedFields !== undefined && 
              props.showOptions.linkedFields.participantLinks.first !== null &&
              props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.first?.[0]) && (
                <button
                  className="px-2 py-1 rounded-lg border hover:bg-gray-200"
                  onClick={() => {
                    if(props.showOptions?.linkedFields?.participantLinks.first !== null) {
                      props.showOptions?.linkedFields?.toggleField((prev) => prev.map((participant) => participant.id === props.showOptions?.linkedFields?.participantLinks.id ? ({
                        ...props.showOptions.linkedFields.participantLinks,
                        first: [
                          props.showOptions.linkedFields.participantLinks.first![0], 
                          props.showOptions.linkedFields.participantLinks.first![1] === 'override' ? 'update' : 'override'
                        ]
                      }) : participant))
                    }
                  }}
                >
                  {props.showOptions.linkedFields.participantLinks.first[1] === 'override' ? 'Override' : 'Update'}
                </button>
              )}
              <Dropdown
                inline
                arrowIcon={false}
                label={props.showOptions.linkedFields.participantLinks.first !== null ? (
                  <HiOutlineLockClosed size={16} className="hover:text-gray-300" />
                ) : (
                  <HiOutlineLockOpen size={16} className="hover:text-gray-300" />
                )}
              >
                {props.showOptions.linkedFields.participantLinks.first !== null && 
                props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.first?.[0]) && (
                    <Dropdown.Item 
                      className="bg-gray-200 hover:bg-transparent" 
                      onClick={() => {
                        props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                          ...linkedFields,
                          first: null
                        }) : linkedFields))
                      }}>{props.showOptions.linkedFields.allColumns.find((column) => column.id === props.showOptions?.linkedFields?.participantLinks.first?.[0])?.header}</Dropdown.Item>
                )}
                {props.showOptions.linkedFields.availableOptions.filter((column) => column.type === 'value').length === 0 ? (
                  <Dropdown.Item disabled>No Available Columns</Dropdown.Item>
                ) : (props.showOptions.linkedFields.availableOptions
                .filter((column) => column.type === 'value')
                .map((column, index) => {
                  return (
                    <Dropdown.Item 
                      key={index}
                      onClick={() => {
                        props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                          ...linkedFields,
                          first: linkedFields.first === null || linkedFields.first[0] !== column.id ? [
                          column.id, linkedFields.last === null ? 'update' : linkedFields.last[1]
                        ] : null
                        }) : linkedFields))
                      }}
                    >{column.header}</Dropdown.Item>
                  )
                }))}
              </Dropdown>
            </div>
          )}
        </div>
        {props.participant.preferredName !== undefined && (
          <div className="flex flex-row gap-2 items-center text-nowrap justify-between w-full border-b py-1 px-2 min-h-[36px]">
            <div className="flex flex-row gap-2 items-center">
              <span>Preferred Name:</span>
              <span className="italic">{
              props.showOptions?.linkedFields?.participantLinks.preferred !== null &&
              props.showOptions?.linkedFields?.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.preferred?.[0]) &&
              props.showOptions.linkedFields.participantLinks.preferred[1] === 'update' ? (
                props.showOptions.linkedFields.allColumns.find((column) => column.id === props.showOptions?.linkedFields?.participantLinks.preferred?.[0])?.values[props.showOptions.linkedFields.rowIndex]
              ) : (
                props.participant.preferredName
              )}</span>
            </div>
            {props.showOptions?.linkedFields !== undefined && (
              <div className="flex flex-row gap-4 me-2 items-center">
                {props.showOptions.linkedFields.noColumnModification !== true &&
                props.showOptions.linkedFields !== undefined && 
                props.showOptions.linkedFields.participantLinks.preferred !== null && 
                props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.preferred?.[0]) && (
                  <button
                    className="px-2 py-1 rounded-lg border hover:bg-gray-200"
                    onClick={() => {
                      if(props.showOptions?.linkedFields?.participantLinks.preferred !== null) {
                        props.showOptions?.linkedFields?.toggleField((prev) => prev.map((participant) => participant.id === props.showOptions?.linkedFields?.participantLinks.id ? ({
                          ...props.showOptions.linkedFields.participantLinks,
                          preferred: [
                            props.showOptions.linkedFields.participantLinks.preferred![0], 
                            props.showOptions.linkedFields.participantLinks.preferred![1] === 'override' ? 'update' : 'override'
                          ]
                        }) : participant))
                      }
                    }}
                  >
                    {props.showOptions.linkedFields.participantLinks.preferred[1] === 'override' ? 'Override' : 'Update'}
                  </button>
                )}
                <Dropdown
                  inline
                  arrowIcon={false}
                  label={props.showOptions.linkedFields.participantLinks.preferred !== null ? (
                    <HiOutlineLockClosed size={16} className="hover:text-gray-300" />
                  ) : (
                    <HiOutlineLockOpen size={16} className="hover:text-gray-300" />
                  )}
                >
                  {props.showOptions.linkedFields.participantLinks.preferred !== null && 
                  props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.preferred?.[0]) && (
                      <Dropdown.Item 
                        className="bg-gray-200 hover:bg-transparent" 
                        onClick={() => {
                          props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                            ...linkedFields,
                            preferred: null
                          }) : linkedFields))
                        }}
                      >{props.showOptions.linkedFields.allColumns.find((column) => column.id === props.showOptions?.linkedFields?.participantLinks.preferred?.[0])?.header}</Dropdown.Item>
                  )}
                  {props.showOptions.linkedFields.availableOptions.filter((column) => column.type === 'value').length === 0 ? (
                    <Dropdown.Item disabled>No Available Columns</Dropdown.Item>
                  ) : (props.showOptions.linkedFields.availableOptions
                  .filter((column) => column.type === 'value')
                  .map((column, index) => {
                    return (
                      <Dropdown.Item 
                        key={index}
                        onClick={() => {
                          props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                            ...linkedFields,
                            preferred: linkedFields.preferred === null || linkedFields.preferred[0] !== column.id ? [
                              column.id, linkedFields.preferred === null ? 'update' : linkedFields.preferred[1]
                            ] : null
                          }) : linkedFields))
                        }}
                      >{column.header}</Dropdown.Item>
                    )
                  }))}
                </Dropdown>
              </div>
            )}
          </div>
        )}
        {props.participant.middleName !== undefined && (
          <div className="flex flex-row gap-2 items-center text-nowrap justify-between w-full border-b py-1 px-2 min-h-[36px]">
            <div className="flex flex-row gap-2 items-center">
              <span>Middle Name:</span>
              <span className="italic">{
              props.showOptions?.linkedFields?.participantLinks.middle !== null &&
              props.showOptions?.linkedFields?.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.middle?.[0]) &&
              props.showOptions.linkedFields.participantLinks.middle[1] === 'update' ? (
                props.showOptions.linkedFields.allColumns.find((column) => column.id === props.showOptions?.linkedFields?.participantLinks.middle?.[0])?.values[props.showOptions.linkedFields.rowIndex]
              ) : (
                props.participant.middleName
              )}</span>
            </div>
            {props.showOptions?.linkedFields !== undefined && (
              <div className="flex flex-row gap-4 me-2 items-center">
                {props.showOptions.linkedFields.noColumnModification !== true &&
                props.showOptions.linkedFields !== undefined && 
                props.showOptions.linkedFields.participantLinks.middle !== null && 
                props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.middle?.[0]) && (
                  <button
                    className="px-2 py-1 rounded-lg border hover:bg-gray-200"
                    onClick={() => {
                      if(props.showOptions?.linkedFields?.participantLinks.middle !== null) {
                        props.showOptions?.linkedFields?.toggleField((prev) => prev.map((participant) => participant.id === props.showOptions?.linkedFields?.participantLinks.id ? ({
                          ...props.showOptions.linkedFields.participantLinks,
                          middle: [
                            props.showOptions.linkedFields.participantLinks.middle![0], 
                            props.showOptions.linkedFields.participantLinks.middle![1] === 'override' ? 'update' : 'override'
                          ]
                        }) : participant))
                      }
                    }}
                  >
                    {props.showOptions.linkedFields.participantLinks.middle[1] === 'override' ? 'Override' : 'Update'}
                  </button>
                )}
                <Dropdown
                  inline
                  arrowIcon={false}
                  label={props.showOptions.linkedFields.participantLinks.middle !== null ? (
                    <HiOutlineLockClosed size={16} className="hover:text-gray-300" />
                  ) : (
                    <HiOutlineLockOpen size={16} className="hover:text-gray-300"/>
                  )}
                >
                  {props.showOptions.linkedFields.participantLinks.middle && 
                  props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.middle?.[0]) && (
                      <Dropdown.Item
                        className="bg-gray-200 hover:bg-transparent" 
                        onClick={() => {
                          props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                            ...linkedFields,
                            middle: null
                          }) : linkedFields))
                        }}
                      >{props.showOptions.linkedFields.allColumns.find((column) => column.id === props.showOptions?.linkedFields?.participantLinks.middle?.[0])?.header}</Dropdown.Item>
                  )}
                  {props.showOptions.linkedFields.availableOptions.filter((column) => column.type === 'value').length === 0 ? (
                    <Dropdown.Item disabled>No Available Columns</Dropdown.Item>
                  ) : (props.showOptions.linkedFields.availableOptions
                  .filter((column) => column.type === 'value')
                  .map((column, index) => {
                    return (
                      <Dropdown.Item 
                        key={index}
                        onClick={() => {
                          props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                            ...linkedFields,
                            middle: linkedFields.middle === null || linkedFields.middle[0] !== column.id ? [
                              column.id, linkedFields.middle === null ? 'update' : linkedFields.middle[1]
                            ] : null
                          }) : linkedFields))
                        }}
                      >{column.header}</Dropdown.Item>
                    )
                  }))}
                </Dropdown>
              </div>
            )}
          </div>
        )}
        <div className="flex flex-row gap-2 items-center text-nowrap justify-between w-full border-b py-1 px-2 min-h-[36px]">
          <div className="flex flex-row gap-2 items-center">
            <span>Last Name:</span>
            <span className="italic">{
            props.showOptions?.linkedFields?.participantLinks.last !== null &&
            props.showOptions?.linkedFields?.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.last?.[0]) &&
            props.showOptions.linkedFields.participantLinks.last[1] === 'update' ? (
              props.showOptions.linkedFields.allColumns.find((column) => column.id === props.showOptions?.linkedFields?.participantLinks.last?.[0])?.values[props.showOptions.linkedFields.rowIndex]
            ) : (
              props.participant.lastName
            )}</span>
          </div>
          {props.showOptions?.linkedFields !== undefined && (
            <div className="flex flex-row gap-4 me-2 items-center">
              {props.showOptions.linkedFields.noColumnModification !== true &&
              props.showOptions.linkedFields !== undefined && 
              props.showOptions.linkedFields.participantLinks.last !== null && 
              props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.last?.[0]) && (
                <button
                  className="px-2 py-1 rounded-lg border hover:bg-gray-200"
                  onClick={() => {
                    if(props.showOptions?.linkedFields?.participantLinks.last !== null) {
                      props.showOptions?.linkedFields?.toggleField((prev) => prev.map((participant) => participant.id === props.showOptions?.linkedFields?.participantLinks.id ? ({
                        ...props.showOptions.linkedFields.participantLinks,
                        last: [
                          props.showOptions.linkedFields.participantLinks.last![0], 
                          props.showOptions.linkedFields.participantLinks.last![1] === 'override' ? 'update' : 'override'
                        ]
                      }) : participant))
                    }
                  }}
                >
                  {props.showOptions.linkedFields.participantLinks.last[1] === 'override' ? 'Override' : 'Update'}
                </button>
              )}
              <Dropdown
                inline
                arrowIcon={false}
                label={props.showOptions.linkedFields.participantLinks.last !== null ? (
                  <HiOutlineLockClosed size={16} className="hover:text-gray-300" />
                ) : (
                  <HiOutlineLockOpen size={16} className="hover:text-gray-300" />
                )}
              >
                {props.showOptions.linkedFields.participantLinks.last && 
                props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.last?.[0]) && (
                    <Dropdown.Item 
                      className="bg-gray-200 hover:bg-transparent" 
                      onClick={() => {
                        props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                          ...linkedFields,
                          last: null
                        }) : linkedFields))
                      }}>{props.showOptions.linkedFields.allColumns.find((column) => column.id === props.showOptions?.linkedFields?.participantLinks.last?.[0])?.header}</Dropdown.Item>
                )}
                {props.showOptions.linkedFields.availableOptions.filter((column) => column.type === 'value').length === 0 ? (
                  <Dropdown.Item disabled>No Available Columns</Dropdown.Item>
                ) : (props.showOptions.linkedFields.availableOptions
                .filter((column) => column.type === 'value')
                .map((column, index) => {
                  return (
                    <Dropdown.Item 
                      key={index}
                      onClick={() => {
                        props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                          ...linkedFields,
                          last: linkedFields.last === null || linkedFields.last[0] !== column.id ? [
                            column.id, linkedFields.last === null ? 'update' : linkedFields.last[1]
                          ] : null
                        }) : linkedFields))
                      }}
                    >{column.header}</Dropdown.Item>
                  )
                }))}
              </Dropdown>
            </div>
          )}
        </div>
        {props.participant.email !== undefined && (
          <div className="flex flex-row gap-2 items-center text-nowrap justify-between w-full border-b py-1 px-2 min-h-[36px]">
            <div className="flex flex-row gap-2 items-center">
              <span>Email:</span>
              <span className="italic truncate max-w-[200px]">{
              props.showOptions?.linkedFields?.participantLinks.email !== null &&
              props.showOptions?.linkedFields?.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.email?.[0]) &&
              props.showOptions.linkedFields.participantLinks.email[1] === 'update' ? (
                props.showOptions.linkedFields.allColumns.find((column) => column.id === props.showOptions?.linkedFields?.participantLinks.email?.[0])?.values[props.showOptions.linkedFields.rowIndex]
              ) : (
                props.participant.email
              )}</span>
            </div>
            {props.showOptions?.linkedFields !== undefined && (
              <div className="flex flex-row gap-4 me-2 items-center">
                {props.showOptions.linkedFields.noColumnModification !== true &&
                props.showOptions.linkedFields !== undefined && 
                props.showOptions.linkedFields.participantLinks.email !== null && 
                props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.email?.[0]) && (
                  <button
                    className="px-2 py-1 rounded-lg border hover:bg-gray-200"
                    onClick={() => {
                      if(props.showOptions?.linkedFields?.participantLinks.email !== null) {
                        props.showOptions?.linkedFields?.toggleField((prev) => prev.map((participant) => participant.id === props.showOptions?.linkedFields?.participantLinks.id ? ({
                          ...props.showOptions.linkedFields.participantLinks,
                          email: [
                            props.showOptions.linkedFields.participantLinks.email![0], 
                            props.showOptions.linkedFields.participantLinks.email![1] === 'override' ? 'update' : 'override'
                          ]
                        }) : participant))
                      }
                    }}
                  >
                    {props.showOptions.linkedFields.participantLinks.email[1] === 'override' ? 'Override' : 'Update'}
                  </button>
                )}
                <Dropdown
                  inline
                  arrowIcon={false}
                  label={props.showOptions.linkedFields.participantLinks.email !== null ? (
                    <HiOutlineLockClosed size={16} className="hover:text-gray-300" />
                  ) : (
                    <HiOutlineLockOpen size={16} className="hover:text-gray-300" />
                  )}
                >
                  {props.showOptions.linkedFields.participantLinks.email !== null && 
                  props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.email?.[0]) && (
                      <Dropdown.Item 
                        className="bg-gray-200 hover:bg-transparent" 
                        onClick={() => {
                          props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                            ...linkedFields,
                            email: null
                          }) : linkedFields))
                        }}
                      >{props.showOptions.linkedFields.allColumns.find((column) => column.id === props.showOptions?.linkedFields?.participantLinks.email?.[0])?.header}</Dropdown.Item>
                  )}
                  {props.showOptions.linkedFields.availableOptions.filter((column) => column.type === 'value').length === 0 ? (
                    <Dropdown.Item disabled>No Available Columns</Dropdown.Item>
                  ) : (props.showOptions.linkedFields.availableOptions
                  .filter((column) => column.type === 'value')
                  .map((column, index) => {
                    return (
                      <Dropdown.Item 
                        key={index}
                        onClick={() => {
                          props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                            ...linkedFields,
                            email: linkedFields.email === null || linkedFields.email[0] !== column.id ? [
                              column.id, linkedFields.email === null ? 'update' : linkedFields.email[1]
                            ] : null
                          }) : linkedFields))
                        }}
                      >{column.header}</Dropdown.Item>
                    )
                  }))}
                </Dropdown>
              </div>
            )}
          </div>
        )}
        {props.participant.userEmail && (
          <div className="flex flex-row items-center text-nowrap justify-between w-full border-b py-1 px-2 min-h-[36px]">
            <div className="flex flex-row gap-2 items-center">
              <span>User Email:</span>
              <span className="italic truncate max-w-[200px]">{props.participant.userEmail}</span>
            </div>
          </div>
        )}
        {!props.hiddenOptions?.tags && (
          <div className="flex flex-row gap-2 items-center text-nowrap justify-between w-full border-b py-1 px-2 min-h-[36px]">
            <div className="flex flex-row gap-2 justify-start flex-wrap max-w-[250px] items-center">
              <span>Tags:</span>
              {props.showOptions?.linkedFields?.participantLinks.tags !== null &&
              props.showOptions?.linkedFields?.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.tags?.[0]) &&
              props.showOptions?.linkedFields?.participantLinks.tags[1] === 'update' ? (
                props.showOptions.linkedFields.allColumns.find((column) => column.id === props.showOptions?.linkedFields?.participantLinks.tags?.[0])
                ?.values[props.showOptions.linkedFields.rowIndex].split(',')
                .map((tag) => props.showOptions?.linkedFields?.tags.find((uTag) => uTag.id === tag))
                .filter((tag) =>  tag !== undefined)
                .map((tag, index) => {
                  return (
                    <span className={`text-${tag.color ?? 'black'} border rounded-full px-2 py-1 text-center flex max-w-min text-nowrap`} key={index}>{tag.name}</span>
                  )
                })
              ) : (
                props.participant.userTags.length > 0 ? (
                  props.participant.userTags.map((tag, index) => {
                    return (
                      <span className={`text-${tag.color ?? 'black'} border rounded-full px-2 py-1 text-center flex max-w-min text-nowrap`} key={index}>{tag.name}</span>
                    )
                  })
                ) : (
                  <span className="pt-1 border rounded-full px-2 py-1 text-center flex max-w-min text-nowrap">No Tags</span>
                )
              )}
            </div>
            {props.showOptions?.linkedFields !== undefined && (
              <div className="flex flex-row gap-4 me-2 items-center">
                {props.showOptions.linkedFields.noColumnModification !== true &&
                props.showOptions.linkedFields.participantLinks.tags !== null && 
                props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.tags?.[0]) && (
                  <button
                    className="px-2 py-1 rounded-lg border hover:bg-gray-200"
                    onClick={() => {
                      if(props.showOptions?.linkedFields?.participantLinks.tags !== null) {
                        props.showOptions?.linkedFields?.toggleField((prev) => prev.map((participant) => participant.id === props.showOptions?.linkedFields?.participantLinks.id ? ({
                          ...props.showOptions.linkedFields.participantLinks,
                          tags: [
                            props.showOptions.linkedFields.participantLinks.tags![0], 
                            props.showOptions.linkedFields.participantLinks.tags![1] === 'override' ? 'update' : 'override'
                          ]
                        }) : participant))
                      }
                    }}
                  >
                    {props.showOptions.linkedFields.participantLinks.tags[1] === 'override' ? 'Override' : 'Update'}
                  </button>
                )}
                <Dropdown
                  inline
                  arrowIcon={false}
                  label={props.showOptions.linkedFields.participantLinks.tags !== null ? (
                    <HiOutlineLockClosed size={16} className="hover:text-gray-300" />
                  ) : (
                    <HiOutlineLockOpen size={16} className="hover:text-gray-300" />
                  )}
                >
                  {props.showOptions.linkedFields.participantLinks.tags !== null && 
                  props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.tags?.[0]) && (
                      <Dropdown.Item 
                        className="bg-gray-200 hover:bg-transparent" 
                        onClick={() => {
                          props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                            ...linkedFields,
                            tags: null
                          }) : linkedFields))
                        }}
                      >{props.showOptions.linkedFields.allColumns.find((column) => column.id === props.showOptions?.linkedFields?.participantLinks.tags?.[0])?.header}</Dropdown.Item>
                  )}
                  {props.showOptions.linkedFields.availableOptions.filter((column) => column.type === 'tag').length === 0 ? (
                    <Dropdown.Item disabled>No Available Columns</Dropdown.Item>
                  ) : (props.showOptions.linkedFields.availableOptions.filter((column) => column.type === 'tag').map((column, index) => {
                    return (
                      <Dropdown.Item 
                        key={index}
                        onClick={() => {
                          props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                            ...linkedFields,
                            tags: linkedFields.tags === null || linkedFields.tags[0] !== column.id ? [
                              column.id, linkedFields.tags === null ? 'update' : linkedFields.tags[1]
                            ] : null
                          }) : linkedFields))
                        }}
                      >{column.header}</Dropdown.Item>
                    )
                  }))}
                </Dropdown>
              </div>
            )}
          </div>
        )}
       
        {props.showOptions?.timeslot && (
          <div className="flex flex-row gap-2 items-center text-nowrap justify-between w-full border-b py-1 px-2 min-h-[36px]">
            <div className="flex flex-row items-center">
              {props.showOptions.linkedFields?.participantLinks.timeslot !== null &&
              props.showOptions.linkedFields?.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.timeslot?.[0]) &&
              props.showOptions.linkedFields.participantLinks.timeslot[1] === 'update' &&
              (timeslots ?? []).length > 0 ? (
                props.showOptions.linkedFields.allColumns.find((column) => column.id === props.showOptions?.linkedFields?.participantLinks.timeslot?.[0])
                ?.values[props.showOptions.linkedFields.rowIndex].split(',')
                .map((timeslotId) => props.showOptions?.linkedFields?.timeslotQueries.map((query) => query.data).find((timeslot) => timeslot?.id === timeslotId))
                .filter((timeslot) => timeslot !== null && timeslot !== undefined)
                .map((timeslot, index) => {
                  return (
                    <div className="flex flex-col border w-full rounded-lg items-center py-1 px-2" key={index}>
                      <span className="whitespace-nowrap text-nowrap">{formatTime(timeslot.start, {timeString: false})}</span>
                      <span className="text-xs whitespace-nowrap text-nowrap">{formatTimeslotDates(timeslot)}</span>
                    </div>
                  )
                })
              ) : (props.participant.timeslot ?? []).length > 0 ? (
                props.participant.timeslot?.map((timeslot, index) => {
                  return (
                    <div className="flex flex-col border w-full rounded-lg items-center py-1 px-2" key={index}>
                      <span className="whitespace-nowrap text-nowrap">{formatTime(timeslot.start, {timeString: false})}</span>
                      <span className="text-xs whitespace-nowrap text-nowrap">{formatTimeslotDates(timeslot)}</span>
                    </div>
                  )
                })
              ) : (
                <div>
                  <span>No Timeslots Found.</span>
                </div>
              )}
            </div>
            {props.showOptions.linkedFields !== undefined && (
              <div className="flex flex-row gap-4 me-2 items-center">
                {props.showOptions.linkedFields.noColumnModification !== true &&
                props.showOptions.linkedFields.participantLinks.timeslot !== null && 
                props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.timeslot?.[0]) && (
                  <button
                    className="px-2 py-1 rounded-lg border hover:bg-gray-200"
                    onClick={() => {
                      if(props.showOptions?.linkedFields?.participantLinks.timeslot !== null) {
                        props.showOptions?.linkedFields?.toggleField((prev) => prev.map((participant) => participant.id === props.showOptions?.linkedFields?.participantLinks.id ? ({
                          ...props.showOptions.linkedFields.participantLinks,
                          timeslot: [
                            props.showOptions.linkedFields.participantLinks.timeslot![0], 
                            props.showOptions.linkedFields.participantLinks.timeslot![1] === 'override' ? 'update' : 'override'
                          ]
                        }) : participant))
                      }
                    }}
                  >
                    {props.showOptions.linkedFields.participantLinks.timeslot[1] === 'override' ? 'Override' : 'Update'}
                  </button>
                )}
                <Dropdown
                  inline
                  arrowIcon={false}
                  label={props.showOptions.linkedFields.participantLinks.timeslot !== null ? (
                    <HiOutlineLockClosed size={16} className="hover:text-gray-300" />
                  ) : (
                    <HiOutlineLockOpen size={16} className="hover:text-gray-300" />
                  )}
                >
                  {props.showOptions.linkedFields.participantLinks.timeslot !== null && 
                  props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.timeslot?.[0]) && (
                      <Dropdown.Item 
                        className="bg-gray-200 hover:bg-transparent" 
                        onClick={() => {
                          props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                            ...linkedFields,
                            timeslot: null
                          }) : linkedFields))
                        }}
                      >{props.showOptions.linkedFields.allColumns.find((column) => column.id === props.showOptions?.linkedFields?.participantLinks.timeslot?.[0])?.header}</Dropdown.Item>
                  )}
                  {props.showOptions.linkedFields.availableOptions.filter((column) => column.type === 'date').length === 0 ? (
                    <Dropdown.Item disabled>No Available Columns</Dropdown.Item>
                  ) : (props.showOptions.linkedFields.availableOptions.filter((column) => column.type === 'date').map((column, index) => {
                    return (
                      <Dropdown.Item 
                        key={index}
                        onClick={() => {
                          props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                            ...linkedFields,
                            timeslot: linkedFields.timeslot === null || linkedFields.timeslot[0] !== column.id ? [
                              column.id, linkedFields.timeslot === null ? 'update' : linkedFields.timeslot[1]
                            ] : null
                          }) : linkedFields))
                        }}
                      >{column.header}</Dropdown.Item>
                    )
                  }))}
                </Dropdown>
              </div>
            )}
          </div>
        )}

        {props.showOptions?.notifications && (
          <div className="flex flex-row gap-2 items-center text-nowrap justify-between border-b py-1 px-2 min-h-[36px] w-full">
            <div className="flex flex-row items-center">
              {props.showOptions.linkedFields?.participantLinks.notifications !== null &&
              props.showOptions.linkedFields?.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.notifications?.[0]) &&
              props.showOptions.linkedFields.participantLinks.notifications[1] === 'update' &&
              notifications.length > 0 ? (
                notifications.map((notification) => {
                  return (
                    <div className="border rounded-sm px-3 py-1 text-left" key={notification.id}>
                      <span>{notification.content}</span>
                    </div>
                  )
                })
              ) : props.participant.notifications.length > 0 ? (
                props.participant.notifications.map((notification) => {
                  return (
                    <div className="border rounded-sm px-3 py-1 text-left max-w-[200px] truncate" key={notification.id}>
                      <span>{notification.content}</span>
                    </div>
                  )
                }
              )) : (
                <div className="py-1 text-left">
                  <span>No Notifications.</span>
                </div>
              )}
            </div>
            {props.showOptions.linkedFields && (
              <div className="flex flex-row gap-4 me-2 items-center">
                {props.showOptions.linkedFields.noColumnModification !== true &&
                props.showOptions.linkedFields.participantLinks.notifications !== null && 
                props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.notifications?.[0]) && (
                  <button
                    className="px-2 py-1 rounded-lg border hover:bg-gray-200"
                    onClick={() => {
                      if(props.showOptions?.linkedFields?.participantLinks.notifications !== null) {
                        props.showOptions?.linkedFields?.toggleField((prev) => prev.map((participant) => participant.id === props.showOptions?.linkedFields?.participantLinks.id ? ({
                          ...props.showOptions.linkedFields.participantLinks,
                          notifications: [
                            props.showOptions.linkedFields.participantLinks.notifications![0], 
                            props.showOptions.linkedFields.participantLinks.notifications![1] === 'override' ? 'update' : 'override'
                          ]
                        }) : participant))
                      }
                    }}
                  >
                    {props.showOptions.linkedFields.participantLinks.notifications[1] === 'override' ? 'Override' : 'Update'}
                  </button>
                )}
                <Dropdown
                  inline
                  arrowIcon={false}
                  label={props.showOptions.linkedFields.participantLinks.notifications !== null ? (
                    <HiOutlineLockClosed size={16} className="hover:text-gray-300" />
                  ) : (
                    <HiOutlineLockOpen size={16} className="hover:text-gray-300" />
                  )}
                >
                  {props.showOptions.linkedFields.participantLinks.notifications !== null && 
                  props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.notifications?.[0]) && (
                      <Dropdown.Item 
                        className="bg-gray-200 hover:bg-transparent" 
                        onClick={() => {
                          props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                            ...linkedFields,
                            notifications: null
                          }) : linkedFields))
                        }}
                      >{props.showOptions.linkedFields.allColumns.find((column) => column.id === props.showOptions?.linkedFields?.participantLinks.notifications?.[0])?.header}</Dropdown.Item>
                  )}
                  {props.showOptions.linkedFields.availableOptions.filter((column) => column.type === 'notification').length === 0 ? (
                    <Dropdown.Item disabled>No Available Columns</Dropdown.Item>
                  ) : (props.showOptions.linkedFields.availableOptions.filter((column) => column.type === 'notification').map((column, index) => {
                    return (
                      <Dropdown.Item 
                        key={index}
                        onClick={() => {
                          props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                            ...linkedFields,
                            notifications: linkedFields.notifications === null || linkedFields.notifications[0] !== column.id ? [
                              column.id, linkedFields.notifications === null ? 'update' : linkedFields.notifications[1]
                            ] : null
                          }) : linkedFields))
                        }}
                      >{column.header}</Dropdown.Item>
                    )
                  }))}
                </Dropdown>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}