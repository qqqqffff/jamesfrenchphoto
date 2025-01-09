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
                        let trimmedLine: JSX.Element[] | String[] = [line]
                        const bold = trimmedLine[0].includes('<b>')
                        if(bold){
                            trimmedLine = trimmedLine[0].split('<b>')
                            trimmedLine = trimmedLine.map((newline, j) => {
                                if(!newline.includes('<')) return (<>{newline}</>)
                                const nl = newline.substring(0, newline.indexOf('<'))
                                const rest = newline.substring(newline.indexOf('>') + 1)
                                return (<span key={j}><b>{nl}</b>{rest}</span>)
                            })
                        }

                        return (<span key={i}>{bold ? (trimmedLine) : (trimmedLine[0])}</span>)
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