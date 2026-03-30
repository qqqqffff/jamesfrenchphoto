import { Dispatch, SetStateAction, FC } from "react";
import { ModalProps } from ".";
import { AuthContext } from "../../auth";
import { RegisterTimeslotMutationParams, TimeslotService } from "../../services/timeslotService";
import { APIMutationResponse, Participant, Timeslot, UserProfile } from "../../types";
import { Modal, Button } from "flowbite-react";
import { useMutation } from "@tanstack/react-query";

interface UnregisterTimeslotModalProps extends ModalProps {
  auth: AuthContext,
  user: UserProfile,
  TimeslotService: TimeslotService,
  timeslot: Timeslot,
  participant: Participant

  setRegistrationResponse: Dispatch<SetStateAction<APIMutationResponse | undefined>>
  setTimeslots: Dispatch<SetStateAction<Timeslot[]>>
}

export const UnregisterTimeslotModal: FC<UnregisterTimeslotModalProps> = (props: UnregisterTimeslotModalProps) => {
  
  const unregisterTimeslot = useMutation({
    mutationFn: (params: RegisterTimeslotMutationParams) => props.TimeslotService.registerTimeslotMutation(params)
  })

  return (
    <Modal
      show={props.open}
      onClose={() => props.onClose()}
    >
      <Modal.Header></Modal.Header>
      <Modal.Body></Modal.Body>
      <Modal.Footer className="flex flex-row items-center justify-end">
        <Button
          onClick={() => props.onClose()}
          color='info'
        >Cancel</Button>
        <Button
          isProcessing={unregisterTimeslot.isPending}
          onClick={() => {
            unregisterTimeslot.mutateAsync({
              timeslot: props.timeslot,
              unregister: true,
              participantId: props.participant.id,
              userEmail: props.participant.userEmail,
              notify: false,
              additionalRecipients: []
            }).then((response) => {
              if(response.status === 'Success') {
                const participantTimeslots = (props.participant.timeslot ?? [])
                .filter((timeslot) => timeslot.id !== props.timeslot.id)

                props.auth.updateProfile({
                  ...props.user,
                  participant: props.user.participant.map((participant) => participant.id === props.participant.id ? ({
                    ...participant,
                    timeslot: participantTimeslots
                  }) : participant),
                  activeParticipant: {
                    ...props.participant,
                    timeslot: participantTimeslots
                  }
                })
                props.setRegistrationResponse(response)
                props.setTimeslots(prev => prev.map((timeslot) => timeslot.id === props.timeslot.id ? ({
                  ...timeslot,
                  register: undefined,
                  participantId: undefined
                }) : timeslot))
                props.onClose()
              }
              else {
                props.setRegistrationResponse(response)
                props.onClose()
              }
            }).catch(() => {
              props.setRegistrationResponse({ status: 'Fail', error: 'Failed to unregister from your timeslot. Please try again later.' })
              props.onClose()
            })
          }}
        >Confirm</Button>
      </Modal.Footer>
    </Modal>
  )
}