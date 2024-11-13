import { FC, useState } from "react";
import { ModalProps } from ".";
import { Button, Modal } from "flowbite-react";

interface ConfirmationModalProps extends ModalProps {
    title: string
    body: string
    denyText: string
    confirmText: string
    confirmAction: Function
    children?: JSX.Element
}

export const ConfirmationModal: FC<ConfirmationModalProps> = ({onClose, open, title, body, denyText, confirmText, confirmAction, children}) => {
    const [submitting, setSubmitting] = useState(false)
    async function submit() {
        await confirmAction()
        setSubmitting(false)
        // onClose()
    }
    return (
        <Modal show={open} onClose={() => {
            onClose()
        }}>
            <Modal.Header>{title}</Modal.Header>
            <Modal.Body>
                <div className="text-center w-full flex flex-col">
                    {body.split('\n').map((line, index) => {
                        let trimmedLine = line
                        const bold = trimmedLine.includes('<b>')
                        if(bold){
                            trimmedLine = trimmedLine.substring(trimmedLine.indexOf('>') + 1)
                            trimmedLine = trimmedLine.substring(0, trimmedLine.indexOf('<'))
                        }
                        return (<span key={index}>{bold ? (<b>{trimmedLine}</b>) : (trimmedLine)}</span>)
                    })}
                </div>
                {children ? children : (<></>)}
            </Modal.Body>
            <Modal.Footer className="justify-end flex-row gap-4">
                <Button onClick={() => onClose()}>{denyText}</Button>
                <Button isProcessing={submitting} onClick={async () => {
                    setSubmitting(true)
                    await submit()
                }}>{confirmText}</Button>
            </Modal.Footer>
        </Modal>
    )
}