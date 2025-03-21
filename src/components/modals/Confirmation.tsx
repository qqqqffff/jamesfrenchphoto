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
        onClose()
    }
    return (
        <Modal show={open} onClose={() => {
            onClose()
        }}>
            <Modal.Header>{title}</Modal.Header>
            <Modal.Body>
                <div className="text-center w-full flex flex-col">
                {body.split('\n').map((line, i) => {
                    const bold = line.includes('<b>') ? line.split('<b>') : undefined
                    return (
                        <span key={`line-${i}`}>
                        {bold ? (
                            bold.map((newline, j) => {
                                if (!newline.includes('<')) 
                                    return <span key={`bold-${i}-${j}-plain`}>{newline}</span>
                                const nl = newline.substring(0, newline.indexOf('<'))
                                const rest = newline.substring(newline.indexOf('>') + 1)
                                return (
                                    <span key={`bold-${i}-${j}-formatted`}>
                                    <b>{nl}</b>{rest}
                                    </span>
                                )
                            })
                        ) : (line)}
                        </span>
                    )
                })}
                </div>
                {children}
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