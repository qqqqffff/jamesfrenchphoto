import { FC, useState } from "react";
import { ModalProps } from ".";
import { UserProfile } from "../../types";
import { Button, Modal, TextInput } from "flowbite-react";
import { textInputTheme } from "../../utils";
import { 
  createTempUserProfileMutation, 
  CreateTempUserProfileParams, 
  getUserProfileByEmailQueryOptions 
} from "../../services/userService";
import { useMutation, useQuery } from "@tanstack/react-query";

interface UnauthorizedEmailModalProps extends ModalProps {
  onSubmit: (user: UserProfile | undefined) => void
  onClose: (created: boolean) => void
}

export const UnauthorizedEmailModal: FC<UnauthorizedEmailModalProps> = ({ open, onClose, onSubmit }) => {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const userProfile = useQuery({
    ...getUserProfileByEmailQueryOptions(email, { 
      siTags: false,
      siCollections: false,
      siSets: false,
      siTimeslot: false,
    }),
    enabled: submitted,
  })

  const createTempUser = useMutation({
    mutationFn: (params: CreateTempUserProfileParams) => createTempUserProfileMutation(params),
    onSuccess: (data) => {
      onClose(true)
      onSubmit(data)
    },
    onError: () => {
      onClose(false)
    }
  })

  return (
    <Modal
      show={open}
      onClose={() => onClose(false)}
    >
      <Modal.Header>Enter Email</Modal.Header>
      <Modal.Body>
        <div className="flex flex-col gap-1">
          <span className="italic">Enter email to view collection:</span>
          <TextInput 
            theme={textInputTheme}
            sizing='md'
            type="email"
            value={email}
            placeholder="Enter email"
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
      </Modal.Body>
      <Modal.Footer className="flex flex-row-reverse">
        <Button
          size="sm"
          isProcessing={submitted}
          onClick={async () => {
            setSubmitted(true)
            const user = await userProfile.refetch()
            console.log(user)
            if(!user.data){
              createTempUser.mutate({
                email: email
              })
            }
            else if(user.data){
              onSubmit(user.data)
              onClose(true)
            }
            
          }}
        >Submit</Button>
      </Modal.Footer>
    </Modal>
  )
}