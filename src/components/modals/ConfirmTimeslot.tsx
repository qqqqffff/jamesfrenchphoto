import { Dispatch, FC, SetStateAction, useEffect, useState } from "react";
import { ModalProps } from ".";
import { APIMutationResponse, Participant, Timeslot, UserProfile } from "../../types";
import { Button, Modal } from "flowbite-react";
import { RegisterTimeslotMutationParams, TimeslotService } from "../../services/timeslotService";
import { PaymentService } from "../../services/paymentService";
import { TimeslotRegistration } from "../timeslot/TimeslotRegistration";
import { useMutation } from "@tanstack/react-query";
import { AuthContext } from "../../auth";
import validator from 'validator'
import { CollectPaymentScreen } from "./CollectPaymentScreen";
import { DateTime } from "luxon";

interface ConfirmTimeslotModalProps extends ModalProps {
  auth: AuthContext
  user: UserProfile
  TimeslotService: TimeslotService,
  PaymentService: PaymentService
  timeslot: Timeslot,
  participant: Participant,
  rebook?: boolean
  
  setRegistrationResponse: Dispatch<SetStateAction<APIMutationResponse | undefined>>
  setTimeslots: Dispatch<SetStateAction<Timeslot[]>>
}

enum ConfirmTimeslotModalFormStep {
  "Confirm" = "Confirm",
  "Payment" = "Payment",
}

export const ConfirmTimeslotModal: FC<ConfirmTimeslotModalProps> = (props: ConfirmTimeslotModalProps) => {
  const [formStep, setFormStep] = useState<ConfirmTimeslotModalFormStep>(ConfirmTimeslotModalFormStep.Confirm)
  const [notify, setNotify] = useState<boolean>(true)
  const [additionalRecipients, setAdditionalRecipients] = useState<string[]>([])

  const baseRecipients = props.participant.contact && props.participant.email && validator.isEmail(props.participant.email) ? [props.participant.email] : []

  useEffect(() => {
    setFormStep(ConfirmTimeslotModalFormStep.Confirm),
    setNotify(true),
    setAdditionalRecipients(baseRecipients)
  }, [props.open])

  const registerTimeslot = useMutation({
    mutationFn: (params: RegisterTimeslotMutationParams) => props.TimeslotService.registerTimeslotMutation(params)
  })

  const timeuntilSlot = DateTime.fromJSDate(props.timeslot.start).diffNow().toMillis()
  const paymentRequired = (
    props.timeslot.cancelationFee !== undefined &&
    timeuntilSlot <= props.timeslot.cancelationFee.window.toMillis()
  ) || props.timeslot.noshowFee !== undefined

  console.log(paymentRequired)

  return (
    <Modal
      show={props.open}
      onClose={() => props.onClose()}
      size="xl"
    >
      <Modal.Header>Confirm Timeslot Selection</Modal.Header>
      <Modal.Body>
        {formStep === ConfirmTimeslotModalFormStep.Confirm ? (
          <TimeslotRegistration 
            timeslot={props.timeslot}
            type="Registration"
            preview={{
              preview: false,
              setNotify: setNotify,
              email: props.participant.userEmail,
              notify: notify,
              recipients: additionalRecipients,
              baseRecipients: baseRecipients,
              setRecipients: setAdditionalRecipients,
            }}
          />
        ) : (
          <CollectPaymentScreen 
            PaymentService={props.PaymentService}
            auth={props.auth}
            intent={{
              type: 'timeslot',
              captureShortnotice: (
                props.timeslot.cancelationFee !== undefined &&
                timeuntilSlot <= props.timeslot.cancelationFee.window.toMillis()
              ),
              vaultNoshow: props.timeslot.noshowFee !== undefined
            }}
          />
        )}
      </Modal.Body>
      <Modal.Footer className="flex flex-row items-center justify-end">
        {formStep === ConfirmTimeslotModalFormStep.Confirm ? (
          <Button
            onClick={() => props.onClose()}
            color="info"
          >Cancel</Button>
        ) : (
          <Button
            onClick={() => setFormStep(ConfirmTimeslotModalFormStep.Confirm)}
          >Back</Button>
        )}
        {formStep === ConfirmTimeslotModalFormStep.Payment || !paymentRequired ? (
          <Button
            isProcessing={registerTimeslot.isPending}
            onClick={() => {
              const newTimeslot: Timeslot = {
                ...props.timeslot,
                register: props.participant.userEmail,
                participantId: props.participant.id
              }

              registerTimeslot.mutateAsync({
                timeslot: newTimeslot,
                notify: notify,
                participantId: props.participant.id,
                userEmail: props.participant.userEmail,
                unregister: false,
                additionalRecipients: additionalRecipients,
              }).then((response) => {
                if(response.status === 'Success') {
                  const participantTimeslots = props.participant.timeslot ?? []
                  participantTimeslots.push(newTimeslot)

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
                  props.setTimeslots(prev => prev.map((timeslot) => timeslot.id === newTimeslot.id ? newTimeslot : timeslot))
                  props.onClose()
                }
                else {
                  props.setRegistrationResponse(response)
                  props.onClose()
                }
              }).catch(() => {
                props.setRegistrationResponse({ status: 'Fail', error: 'Failed to register for the selected timeslot. Please try again later.'})
                props.onClose()
              })
            }}
          >Register</Button>
        ) : (
          <Button
            onClick={() => setFormStep(ConfirmTimeslotModalFormStep.Payment)}
          >Next</Button>
        )}
      </Modal.Footer>
    </Modal>
  )
}