import { FC } from "react";
import { ModalProps } from ".";
import { Button, Modal } from "flowbite-react";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";

const client = generateClient<Schema>()

interface CreateUserProps extends ModalProps {

}

export const CreateUserModal: FC<CreateUserProps> = ({open, onClose}) => {
    return (
        <Modal show={open} onClose={() => onClose()}>
            <Modal.Header>Create a new User</Modal.Header>
            <Modal.Body>
                <Button onClick={async () => {
                    const response = await client.queries.SendCreateUserEmail({ email: 'noreply.jfphoto@gmail.com' })
                    console.log(response)
                }}>Create User</Button>
            </Modal.Body>
        </Modal>
    )
}