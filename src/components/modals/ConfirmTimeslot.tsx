import { FC, useEffect, useState } from "react";
import { ModalProps } from ".";
import { Timeslot } from "../../types";
import { Modal } from "flowbite-react";
import { TimeslotService } from "../../services/timeslotService";
import { PaymentService } from "../../services/paymentService";
import { TimeslotRegistration } from "../timeslot/TimeslotRegistration";

interface ConfirmTimeslotModalProps extends ModalProps {
  TimeslotService: TimeslotService,
  PaymentService: PaymentService
  timeslot: Timeslot,
  email: string,
  additionalRecipients: string[]
}

enum ConfirmTimeslotModalFormStep {
  "Confirm" = "Confirm",
  "Payment" = "Payment",
}

export const ConfirmTimeslotModal: FC<ConfirmTimeslotModalProps> = (props: ConfirmTimeslotModalProps) => {
  const [formStep, setFormStep] = useState<ConfirmTimeslotModalFormStep>(ConfirmTimeslotModalFormStep.Confirm)
  const [notify, setNotify] = useState<boolean>(true)
  const [additionalRecipients, setAdditionalRecipients] = useState<string[]>([])

  useEffect(() => {
    setFormStep(ConfirmTimeslotModalFormStep.Confirm),
    setNotify(true),
    setAdditionalRecipients(props.additionalRecipients)
  }, [props.open])


  return (
    <Modal
      show={props.open}
      onClose={() => props.onClose()}
    >
      <Modal.Header>Confirm Timeslot Selection</Modal.Header>
      <Modal.Body>
        <TimeslotRegistration 
          timeslot={props.timeslot}
          type="Registration"
          preview={{
            preview: false,
            setNotify: setNotify,
            email: props.email,
            notify: notify,
            recipients: additionalRecipients,
            setRecipients: setAdditionalRecipients,
          }}
        />
      </Modal.Body>
      <Modal.Footer>

      </Modal.Footer>
    </Modal>
  )
}