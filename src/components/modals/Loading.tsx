import { FC } from "react";
import { ModalProps } from ".";
import { Modal } from "flowbite-react";
import Loading from "../common/Loading";

interface LoadingModalProps extends ModalProps {
  size?: string,
  className?: string,
  header: string,
}

export const LoadingModal: FC<LoadingModalProps> = ({ open, onClose, size, className, header}) => {
  return (
    <Modal
      show={open}
      size={size}
      onClose={() => onClose()}
      className={className}
    >
      <Modal.Header>{header}</Modal.Header>
      <Modal.Body
        className="flex flex-row justify-center items-center italic text-xl"
      >
        <span>Loading</span>
        <Loading />
      </Modal.Body>
    </Modal>
  )
}