import { FC } from "react";
import { ModalProps } from ".";
import { Button, Modal } from "flowbite-react";

interface ConfirmationModalProps extends ModalProps {
    title: string
    body: string
    denyText: string
    confirmText: string
    confirmAction: Function
}

export const ConfirmationModal: FC<ConfirmationModalProps> = ({onClose, open, title, body, denyText, confirmText, confirmAction}) => {
    // console.log(body.split('\n'))
    return (
        <Modal show={open} onClose={() => {
            onClose()
        }}>
            <Modal.Header>{title}</Modal.Header>
            <Modal.Body>
                <div className="text-center w-full flex flex-col">
                    {body.split('\n').map((line) => {
                        let trimmedLine = line
                        const bold = trimmedLine.includes('<b>')
                        if(bold){
                            trimmedLine = trimmedLine.substring(trimmedLine.indexOf('>') + 1)
                            trimmedLine = trimmedLine.substring(0, trimmedLine.indexOf('<'))
                        }
                        return (<span>{bold ? (<b>{trimmedLine}</b>) : (trimmedLine)}</span>)
                    })}
                </div>
            </Modal.Body>
            <Modal.Footer className="justify-end flex-row gap-4">
                <Button onClick={() => onClose()}>{denyText}</Button>
                <Button onClick={() => {
                    confirmAction()
                    onClose()
                }}>{confirmText}</Button>
            </Modal.Footer>
        </Modal>
    )
}