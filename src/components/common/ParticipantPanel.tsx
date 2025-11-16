import { Dispatch, SetStateAction } from "react"
import { Participant, TableColumn } from "../../types"
import { formatTime } from "../../utils"
import { createTimeString } from "../timeslot/Slot"
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";
import { Dropdown } from "flowbite-react";

interface ParticipantPanelProps {
  participant: Participant
  hiddenOptions?: {
    tags?: boolean
  }
  showOptions?: {
    timeslot?: boolean,
    linkedFields?: {
      first: [boolean, string], 
      last: [boolean, string],
      middle: [boolean, string] | null,
      preferred: [boolean, string] | null,
      email: [boolean, string] | null,
      tags: [boolean, string] | null,
      toggleField: Dispatch<SetStateAction<{
        id: string,
        first: [boolean, string], 
        last: [boolean, string],
        middle: [boolean, string] | null,
        preferred: [boolean, string] | null,
        email: [boolean, string] | null,
        tags: [boolean, string] | null,
      }[]>>,
      availableOptions: TableColumn[]
    }
  }
}

//TODO: implement linked fields
export const ParticipantPanel = (props: ParticipantPanelProps) => {
  return (
    <div className="flex flex-col">
      <span className='text-purple-400'>Participant</span>
      <div className="flex flex-col text-xs px-2 pb-1 max-h-60 overflow-y-auto">
        <div className="flex flex-row gap-2 items-center text-nowrap">
            <span>First Name:</span>
            <span className="italic">{props.participant.firstName}</span>
            {props.showOptions?.linkedFields !== undefined && (
              <Dropdown
                label={props.showOptions.linkedFields.first[0] ? (
                  <HiOutlineLockClosed size={12} />
                ) : (
                  <HiOutlineLockOpen size={12} />
                )}
              >
                {props.showOptions.linkedFields.availableOptions
                .filter((column) => column.type === 'value')
                .map((column, index) => {
                  return (
                    <Dropdown.Item 
                      key={index}
                      onClick={() => {
                        props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                          ...linkedFields,
                          first: [!linkedFields.first[0], !linkedFields.first[0] === false ? '' : column.id]
                        }) : linkedFields))
                      }}
                    >{column.header}</Dropdown.Item>
                  )
                })}
              </Dropdown>
            )}
          </div>
        {props.participant.preferredName && (
          <div className="flex flex-row gap-2 items-center text-nowrap">
            <span>Preferred Name:</span>
            <span className="italic">{props.participant.preferredName}</span>
            {props.showOptions?.linkedFields !== undefined && props.showOptions?.linkedFields.preferred !== null && (
              <Dropdown
                label={props.showOptions.linkedFields.preferred[0] ? (
                  <HiOutlineLockClosed size={12} />
                ) : (
                  <HiOutlineLockOpen size={12} />
                )}
              >
                {props.showOptions.linkedFields.availableOptions
                .filter((column) => column.type === 'value')
                .map((column, index) => {
                  return (
                    <Dropdown.Item 
                      key={index}
                      onClick={() => {
                        props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                          ...linkedFields,
                          preferred: [!linkedFields.preferred![0], !linkedFields.preferred![0] === false ? '' : column.id]
                        }) : linkedFields))
                      }}
                    >{column.header}</Dropdown.Item>
                  )
                })}
              </Dropdown>
            )}
          </div>
        )}
        {props.participant.middleName && (
          <div className="flex flex-row gap-2 items-center text-nowrap">
            <span>Middle Name:</span>
            <span className="italic">{props.participant.middleName}</span>
            {props.showOptions?.linkedFields !== undefined && props.showOptions.linkedFields.middle !== null && (
              <Dropdown
                label={props.showOptions.linkedFields.middle ? (
                  <HiOutlineLockClosed size={12} />
                ) : (
                  <HiOutlineLockOpen size={12} />
                )}
              >
                {props.showOptions.linkedFields.availableOptions
                .filter((column) => column.type === 'value')
                .map((column, index) => {
                  return (
                    <Dropdown.Item 
                      key={index}
                      onClick={() => {
                        props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                          ...linkedFields,
                          middle: [!linkedFields.middle![0], !linkedFields.middle![0] === false ? '' : column.id]
                        }) : linkedFields))
                      }}
                    >{column.header}</Dropdown.Item>
                  )
                })}
              </Dropdown>
            )}
          </div>
        )}
        <div className="flex flex-row gap-2 items-center text-nowrap">
          <span>Last Name:</span>
          <span className="italic">{props.participant.lastName}</span>
          {props.showOptions?.linkedFields !== undefined && (
            <Dropdown
              label={props.showOptions.linkedFields.last ? (
                <HiOutlineLockClosed size={12} />
              ) : (
                <HiOutlineLockOpen size={12} />
              )}
            >
              {props.showOptions.linkedFields.availableOptions
              .filter((column) => column.type === 'value')
              .map((column, index) => {
                return (
                  <Dropdown.Item 
                    key={index}
                    onClick={() => {
                      props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                        ...linkedFields,
                        last: [!linkedFields.last[0], !linkedFields.last[0] === false ? '' : column.id]
                      }) : linkedFields))
                    }}
                  >{column.header}</Dropdown.Item>
                )
              })}
            </Dropdown>
          )}
        </div>
        {props.participant.email && (
          <div className="flex flex-row gap-2 items-center text-nowrap">
            <span>Email:</span>
            <span className="italic truncate max-w-[200px]">{props.participant.email}</span>
            {props.showOptions?.linkedFields !== undefined && props.showOptions.linkedFields.email !== null && (
              <Dropdown
                label={props.showOptions.linkedFields.email ? (
                  <HiOutlineLockClosed size={12} />
                ) : (
                  <HiOutlineLockOpen size={12} />
                )}
              >
                {props.showOptions.linkedFields.availableOptions
                .filter((column) => column.type === 'value')
                .map((column, index) => {
                  return (
                    <Dropdown.Item 
                      key={index}
                      onClick={() => {
                        props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                          ...linkedFields,
                          email: [!linkedFields.email![0], !linkedFields.email![0] === false ? '' : column.id]
                        }) : linkedFields))
                      }}
                    >{column.header}</Dropdown.Item>
                  )
                })}
              </Dropdown>
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
          <div className="flex flex-row gap-2 justify-start flex-wrap pt-2 max-w-[200px]">
            {props.participant.userTags.length > 0 ? (
              props.participant.userTags.map((tag, index) => {
                return (
                  <span className={`text-${tag.color ?? 'black'} border rounded-full px-2 py-1 text-center flex max-w-min text-nowrap`} key={index}>{tag.name}</span>
                )
              })
            ) : (
              <span className="pt-1 border rounded-full px-2 py-1 text-center flex max-w-min text-nowrap">No Tags</span>
            )}
            {props.showOptions?.linkedFields !== undefined && props.showOptions?.linkedFields.tags !== null &&  (
              <Dropdown
                label={props.showOptions.linkedFields.tags ? (
                  <HiOutlineLockClosed size={12} className="rounded-full border px-1.5 py-1.5"/>
                ) : (
                  <HiOutlineLockOpen size={12} className="rounded-full border px-1.5 py-1.5" />
                )}
              >
                {props.showOptions.linkedFields.availableOptions.filter((column) => column.type === 'tag').map((column, index) => {
                  return (
                    <Dropdown.Item 
                      key={index}
                      onClick={() => {
                        props.showOptions?.linkedFields?.toggleField((prev) => prev.map((linkedFields) => linkedFields.id === props.participant.id ? ({
                          ...linkedFields,
                          tags: [!linkedFields.tags![0], !linkedFields.tags![0] === false ? '' : column.id]
                        }) : linkedFields))
                      }}
                    >{column.header}</Dropdown.Item>
                  )
                })}
              </Dropdown>
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