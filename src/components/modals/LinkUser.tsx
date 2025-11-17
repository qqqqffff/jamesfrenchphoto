import { UseQueryResult } from "@tanstack/react-query";
import { ModalProps } from ".";
import { TableColumn, UserProfile, UserTag } from "../../types";
import { FC, useEffect, useState } from "react";
import { Modal } from "flowbite-react";
import { ParticipantPanel } from "../common/ParticipantPanel";

interface LinkUserModalProps extends ModalProps {
  userProfile: UserProfile
  tableColumns: TableColumn[]
  rowIndex: number,
  tags: UseQueryResult<UserTag[] | undefined, Error>
}

type UserFieldLinks = {
  email: [string, string],
  first: [boolean, string, 'update' | 'override'] | null,
  last: [boolean, string, 'update' | 'override'] | null,
  sitting: [boolean, string, 'update' | 'override'] | null,
}

type ParticipantFieldLinks = {
  id: string,
  first: [boolean, string, 'update' | 'override'] | null, 
  last: [boolean, string, 'update' | 'override'] | null,
  middle: [boolean, string, 'update' | 'override'] | null,
  preferred: [boolean, string, 'update' | 'override'] | null,
  email: [boolean, string, 'update' | 'override'] | null,
  tags: [boolean, string, 'update' | 'override'] | null,
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
              true, 
              column.id, 
              column.values[props.rowIndex] === '' ? 'override' : 'update'
            ]
          }
          else if(
            normalHeader.includes('last') &&
            linkedUser.last === null
          ) {
            linkedUser.last = [
              true, 
              column.id, 
              column.values[props.rowIndex] === '' ? "override" : 'update'
            ]
          }
          else if(
            normalHeader.includes('sitting') &&
            linkedUser.sitting === null
          ) {
            linkedUser.sitting = [
              true, 
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
              true, 
              column.id, 
              column.values[props.rowIndex] === '' ? 'override' : 'update'
            ]
          }
          else if(
            normalHeader.includes('last') &&
            linkedParticipants[0].last === null
          ) {
            linkedParticipants[0].last = [
              true, 
              column.id, 
              column.values[props.rowIndex] === '' ? 'override' : 'update'
            ]
          }
          else if(
            normalHeader.includes('middle') &&
            linkedParticipants[0].middle === null
          ) {
            linkedParticipants[0].middle = [
              true, 
              column.id, 
              column.values[props.rowIndex] === '' ? 'override' : 'update'
            ]
          }
          else if(
            normalHeader.includes('prefer') &&
            linkedParticipants[0].preferred === null
          ) {
            linkedParticipants[0].preferred = [
              true, 
              column.id, 
              column.values[props.rowIndex] === '' ? 'override' : 'update'
            ]
          }
          else if(
            normalHeader.includes('email') &&
            linkedParticipants[0].email === null
          ) {
            linkedParticipants[0].email = [
              true, 
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

  return (
    <Modal show={props.open} onClose={() => props.onClose()} size='xl'>
      <Modal.Header>Link User</Modal.Header>
      <Modal.Body className="pb-2">
        <div className="flex flex-col px-2 pb-1 max-h-[68vh] min-h-[68vh]">
          <span className="font-medium whitespace-nowrap text-lg text-blue-400">User Info</span>
          <div className="flex flex-col px-2 text-xs">
            <div className="flex flex-row gap-2 items-center text-nowrap">
              <span>Sitting Number:</span>
              <span className="italic">{props.userProfile.sittingNumber}</span>
            </div>
            <div className="flex flex-row gap-2 items-center text-nowrap">
              <span>First Name:</span>
              <span className="italic">{props.userProfile.firstName}</span>
            </div>
            <div className="flex flex-row gap-2 items-center text-nowrap">
              <span>Last Name:</span>
              <span className="italic">{props.userProfile.lastName}</span>
            </div>
            <div className="flex flex-row gap-2 items-center text-nowrap">
              <span>Email:</span>
              <span className="italic">{props.userProfile.email}</span>
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