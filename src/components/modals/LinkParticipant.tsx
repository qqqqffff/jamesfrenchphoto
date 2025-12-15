import { UseMutationResult, useQueries, UseQueryResult } from "@tanstack/react-query";
import { ModalProps } from ".";
import { TimeslotService } from "../../services/timeslotService";
import { LinkParticipantMutationParams, UserService } from "../../services/userService";
import { Participant, TableColumn, UserTag, Notification } from "../../types";
import { FC, useEffect, useState } from "react";
import { ParticipantFieldLinks } from "./LinkUser";
import { Button, Modal } from "flowbite-react";
import { ParticipantPanel } from "../common/ParticipantPanel";

interface LinkParticipantModalProps extends ModalProps {
  UserService: UserService
  TimeslotService: TimeslotService
  participant: Participant,
  tableColumns: TableColumn[],
  rowIndex: number,
  tags: UseQueryResult<UserTag[] | undefined, Error>
  linkParticipant: UseMutationResult<TableColumn[], Error, LinkParticipantMutationParams, unknown>,
  notifications: Notification[]
}

export const LinkParticipantModal: FC<LinkParticipantModalProps> = (props) => {
  const [linkedParticipantFields, setLinkedParticipantFields] = useState<ParticipantFieldLinks[]>([])

  //disgusting mapping logic to go from column id to query
  const timeslotQueries = useQueries({
    queries: linkedParticipantFields[0]?.timeslot?.[0] === undefined ? [props.TimeslotService.getTimeslotByIdQueryOptions('', { siTag: false })] :
    (props.tableColumns.find((column) => column.id === linkedParticipantFields[0]?.timeslot?.[0])
    ?.values[props.rowIndex] ?? '').split(',').filter((value) => value !== '')
    .reduce((prev, cur) => {
      if(!prev.some((timeslotId) => timeslotId === cur)) {
        prev.push(cur)
      }
      return prev
    }, [] as string[])
    .filter((timeslotId) => !(props.participant.timeslot ?? [])
      .some((timeslot) => timeslot.id === timeslotId)
    )
    .map((timeslotId) => props.TimeslotService.getTimeslotByIdQueryOptions(timeslotId, { siTag: false }))
  })

  useEffect(() => {
    const linkedParticipants: ParticipantFieldLinks[] = [{
      id: props.participant.id,
      first: null,
      last: null,
      middle: null,
      preferred: null,
      email: null,
      tags: null,
      timeslot: null,
      notifications: null
    }]

    if(props.tableColumns.length > 0 && props.tableColumns[0].values[props.rowIndex] !== undefined) {
      for(let i = 0; i < props.tableColumns.length; i++) {
        const column = props.tableColumns[i]
        const foundChoice = (column.choices ?? [])?.[props.rowIndex]
        //skip if mapping already exits for this column
        if(foundChoice !== undefined && (foundChoice.includes('userEmail') || foundChoice.includes('participantId'))) continue
        const normalHeader = column.header.toLocaleLowerCase()
        if(
          (
            normalHeader.includes('participant') || 
            normalHeader.includes('duchess') || 
            normalHeader.includes('deb') || 
            normalHeader.includes('escort') ||
            normalHeader.includes('daughter') ||
            normalHeader.includes('son') ||
            normalHeader.includes('child') ||
            column.type === 'tag' ||
            column.type === 'date'
          ) &&
          linkedParticipants
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

    setLinkedParticipantFields(linkedParticipants)
  }, [
    props.participant,
    props.tableColumns,
    props.open
  ])

  const filteredUserFields = props.tableColumns.filter((column) => {
    return (
      linkedParticipantFields[0] === undefined || (
        (linkedParticipantFields[0].first === null || linkedParticipantFields[0].first[0] !== column.id) &&
        (linkedParticipantFields[0].last === null || linkedParticipantFields[0].last[0] !== column.id) &&
        (linkedParticipantFields[0].email === null || linkedParticipantFields[0].email[0] !== column.id) &&
        (linkedParticipantFields[0].middle === null || linkedParticipantFields[0].middle[0] !== column.id) &&
        (linkedParticipantFields[0].preferred === null || linkedParticipantFields[0].preferred[0] !== column.id) &&
        (linkedParticipantFields[0].tags === null || linkedParticipantFields[0].tags[0] !== column.id) &&
        (linkedParticipantFields[0].timeslot === null || linkedParticipantFields[0].timeslot[0] !== column.id)
      )
    )
  })

  return (
    <Modal show={props.open} onClose={() => {
      props.onClose()
      setLinkedParticipantFields([])
    }} size='xl'>
      <Modal.Header className="px-4 py-3">Link Participant</Modal.Header>
      <Modal.Body className="px-2 py-2">
        <div className="flex flex-col px-2 pb-1 max-h-[68vh] overflow-auto">
          <ParticipantPanel 
            participant={{
              ...props.participant,
              middleName: props.participant.middleName ?? '',
              preferredName: props.participant.middleName ?? '',
              email: props.participant.middleName ?? ''
            }}
            showOptions={{
              timeslot: true,
              linkedFields: {
                participantLinks: linkedParticipantFields[0],
                rowIndex: props.rowIndex,
                tags: props.tags.data ?? [],
                timeslotQueries: timeslotQueries,
                availableOptions: filteredUserFields,
                allColumns: props.tableColumns,
                toggleField: setLinkedParticipantFields,
                noColumnModification: true,
                notifications: props.notifications
              }
            }}
          />
        </div>
        <div className="border"/>
        <div className="pt-1">
          <span className="text-sm italic text-gray-500 ps-4">Note: if this participant already exists it will create a duplicate!</span>
        </div>
      </Modal.Body>
      <Modal.Footer className="flex flex-row justify-end gap-2 px-2 py-2">
        <Button 
          size="xs"
          color="light"
          onClick={() => {
            props.onClose()
            setLinkedParticipantFields([])
          }}
        >Cancel</Button>
        <Button 
          size='xs'
          isProcessing={props.linkParticipant.isPending}
          disabled={linkedParticipantFields[0] === undefined}
          onClick={() => {
            if(linkedParticipantFields[0] !== undefined) {
              props.linkParticipant.mutate({
                tableColumns: props.tableColumns,
                rowIndex: props.rowIndex,
                participantFieldLinks: linkedParticipantFields[0],
                participant: props.participant,
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