import { FC } from "react";
import { ModalProps } from ".";
import { Modal } from "flowbite-react";

export const TermsAndConditionsModal: FC<ModalProps> = ({ open, onClose }) => {
    return (
        <Modal onClose={() => onClose()} show={open}>
            <Modal.Header>Terms and Conditions</Modal.Header>
            <Modal.Body className="text-center">
                <span>By agreeing to our terms and conditions you allow us to send you emails</span>
            </Modal.Body>
        </Modal>
    )
}