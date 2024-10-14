import { FC, useState } from "react";
import { ModalProps } from ".";
import { Button, Label, Modal, TextInput } from "flowbite-react";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";

const client = generateClient<Schema>()

export const CreateUserModal: FC<ModalProps> = ({open, onClose}) => {
    const [email, setEmail] = useState<string | undefined>('noreply.jfphoto@gmail.com')
    return (
        <Modal show={open} onClose={() => onClose()}>
            <Modal.Header>Create a new User</Modal.Header>
            <Modal.Body className="flex-col flex gap-3">
                <div className="flex flex-row gap-3 items-center">
                    <Label className="ms-2 mb-1 font-semibold text-xl" htmlFor="email">Email:</Label>
                    <TextInput sizing='md' className="w-[60%]" placeholder="Email" type="email" id="email" name="email" defaultValue={email} onChange={(event) => setEmail(event.target.value)}/>
                </div>
                <p className="italic text-sm"><sup>!!!</sup> Note: This action sends an email to the specified email address with a link to create an account</p>
            </Modal.Body>
            <Modal.Footer className="flex-row-reverse">
                <Button onClick={async () => {
                        if(email){
                            const response = await client.queries.AddCreateUserQueue({ email: email })
                            console.log(response)
                            onClose()
                        }
                }}>Create User</Button>
            </Modal.Footer>
        </Modal>
    )
}