import { Dispatch, SetStateAction } from "react"
import { Participant, TableColumn, UserTag } from "../../types"
import { formatTime } from "../../utils"
import { createTimeString } from "../timeslot/Slot"
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";
import { Dropdown } from "flowbite-react";
import { ParticipantFieldLinks } from "../modals/LinkUser";

interface ParticipantPanelProps {
  participant: Participant
  hiddenOptions?: {
    tags?: boolean
  }
  showOptions?: {
    timeslot?: boolean,
    linkedFields?: {
      participantLinks: ParticipantFieldLinks,
      toggleField: Dispatch<SetStateAction<ParticipantFieldLinks[]>>,
      availableOptions: TableColumn[],
      allColumns: TableColumn[],
      tags: UserTag[],
      rowIndex: number
    }
  }
}

export const ParticipantPanel = (props: ParticipantPanelProps) => {
  return (
    <div className="flex flex-col">
      <span className='text-purple-400'>Participant</span>
      <div className="flex flex-col text-xs px-2 pb-1 max-h-80 overflow-y-auto gap-0.5">
        <div className="flex flex-row gap-2 items-center text-nowrap">
            <span>First Name:</span>
            <span className="italic">{
            props.showOptions?.linkedFields?.participantLinks.first !== null &&
            props.showOptions?.linkedFields?.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.first?.[0]) &&
            props.showOptions.linkedFields.participantLinks.first[1] === 'update' ? (
              props.showOptions.linkedFields.allColumns.find((column) => column.id === props.showOptions?.linkedFields?.participantLinks.first?.[0])?.values[props.showOptions.linkedFields.rowIndex]
            ) : (
              props.participant.firstName
            )}</span>
            {props.showOptions?.linkedFields !== undefined && (
              <>
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
                  {props.showOptions.linkedFields.availableOptions
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
                  })}
                </Dropdown>
                {props.showOptions.linkedFields !== undefined && 
                props.showOptions.linkedFields.participantLinks.first !== null &&
                props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.first?.[0]) && (
                  <button
                    className="px-2 py-1 rounded-sm border hover:bg-gray-200"
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
              </>
            )}
          </div>
        {props.participant.preferredName && (
          <div className="flex flex-row gap-2 items-center text-nowrap">
            <span>Preferred Name:</span>
            <span className="italic">{props.participant.preferredName}</span>
            {props.showOptions?.linkedFields !== undefined && (
              <>
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
                  {props.showOptions.linkedFields.availableOptions
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
                  })}
                </Dropdown>
                {props.showOptions.linkedFields !== undefined && 
                props.showOptions.linkedFields.participantLinks.preferred !== null && 
                props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.preferred?.[0]) && (
                  <button
                    className="px-2 py-1 rounded-sm border hover:bg-gray-200"
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
              </>
            )}
          </div>
        )}
        {props.participant.middleName && (
          <div className="flex flex-row gap-2 items-center text-nowrap">
            <span>Middle Name:</span>
            <span className="italic">{props.participant.middleName}</span>
            {props.showOptions?.linkedFields !== undefined && (
              <>
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
                  {props.showOptions.linkedFields.availableOptions
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
                  })}
                </Dropdown>
                {props.showOptions.linkedFields !== undefined && 
                props.showOptions.linkedFields.participantLinks.middle !== null && 
                props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.middle?.[0]) && (
                  <button
                    className="px-2 py-1 rounded-sm border hover:bg-gray-200"
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
              </>
            )}
          </div>
        )}
        <div className="flex flex-row gap-2 items-center text-nowrap">
          <span>Last Name:</span>
          <span className="italic">{props.participant.lastName}</span>
          {props.showOptions?.linkedFields !== undefined && (
            <>
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
                {props.showOptions.linkedFields.availableOptions
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
                })}
              </Dropdown>
              {props.showOptions.linkedFields !== undefined && 
              props.showOptions.linkedFields.participantLinks.last !== null && 
              props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.last?.[0]) && (
                <button
                  className="px-2 py-1 rounded-sm border hover:bg-gray-200"
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
            </>
          )}
        </div>
        {props.participant.email && (
          <div className="flex flex-row gap-2 items-center text-nowrap">
            <span>Email:</span>
            <span className="italic truncate max-w-[200px]">{props.participant.email}</span>
            {props.showOptions?.linkedFields !== undefined && (
              <>
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
                  {props.showOptions.linkedFields.availableOptions
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
                  })}
                </Dropdown>
                {props.showOptions.linkedFields !== undefined && 
                props.showOptions.linkedFields.participantLinks.email !== null && 
                props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.email?.[0]) && (
                  <button
                    className="px-2 py-1 rounded-sm border hover:bg-gray-200"
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
              </>
            )}
          </div>
        )}
        {props.participant.userEmail && (
          <div className="flex flex-row gap-2 items-center text-nowrap">
            <span>User Email:</span>
            <span className="italic truncate max-w-[200px]">{props.participant.userEmail}</span>
          </div>
        )}
        {!props.hiddenOptions?.tags && (
          <div className="flex flex-row gap-2 justify-start flex-wrap pt-2 max-w-[250px]">
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
            {props.showOptions?.linkedFields !== undefined &&  (
              <>
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
                  {props.showOptions.linkedFields.availableOptions.filter((column) => column.type === 'tag').map((column, index) => {
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
                  })}
                </Dropdown>
                {props.showOptions.linkedFields.participantLinks.tags !== null && 
                props.showOptions.linkedFields.allColumns.some((column) => column.id === props.showOptions?.linkedFields?.participantLinks.tags?.[0]) && (
                  <button
                    className="px-2 py-1 rounded-sm border hover:bg-gray-200"
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
              </>
            )}
          </div>
        )}
        {props.showOptions?.timeslot && (
          (props.participant.timeslot ?? []).length > 0 ? (
            props.participant.timeslot?.map((timelsot, index) => {
              return (
                <div className="flex flex-col border w-full rounded-lg items-center py-1" key={index}>
                  <span className="whitespace-nowrap text-nowrap">{formatTime(timelsot.start, {timeString: false})}</span>
                  <span className="text-xs whitespace-nowrap text-nowrap">{createTimeString(timelsot)}</span>
                </div>
              )
            })
          ) : (
            <div>
              <span>No Timeslots Found.</span>
            </div>
          )
        )}
      </div>
    </div>
  )
}