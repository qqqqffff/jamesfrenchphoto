import { resendSignUpCode } from "aws-amplify/auth"
import { Modal, Label, TextInput, Button } from "flowbite-react"
import { TermsAndConditionsModal } from "../modals"
import { useState } from "react"
import { UserProfile } from "../../types"
import { textInputTheme } from "../../utils"

interface ConfirmPanelProps {
  userProfile: UserProfile
}
export const ConfirmPanel = (props: ConfirmPanelProps) => {
  const [verificationModalVisible, setVerificationModalVisible] = useState(false)
  const [termsAndConditionsVisible, setTermsAndConditionsVisible] = useState(false)
  const [invalidCode, setInvalidCode] = useState(false)
  const [codeSubmitting, setCodeSubmitting] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')

  const [password, setPassword] = useState<string>()
  const [confirmPassword, setConfirmPassword] = useState<string>()
  
  const [passwordNumber, setPasswordNumber] = useState(false)
  const [passwordSpecialCharacter, setPasswordSpecialCharacter] = useState(false)
  const [passwordMinCharacters, setPasswordMinCharacters] = useState(false)
  const [passwordUpperCharacter, setPasswordUpperCharacter] = useState(false)
  const [passwordLowerCharacter, setPasswordLowerCharacter] = useState(false)
  const [passwordMatch, setPasswordMatch] = useState(false)

  return (
    <>
      <Modal show={verificationModalVisible} onClose={() => setVerificationModalVisible(false)}>
        <Modal.Header>Verification Code</Modal.Header>
        <Modal.Body className="flex flex-col gap-3 font-main">
          <p>Please enter in the verification code sent to the user's email.</p>
          <p><b>Do not close this window until account has been confirmed.</b></p>
          <div className="flex items-center gap-4 mt-4">
              <Label className="font-medium text-lg" htmlFor="authCode">Verification Code:</Label>
              <TextInput 
                theme={textInputTheme}
                color={invalidCode ? 'failure' : undefined} 
                className='' 
                sizing='md' 
                placeholder="Verification Code" 
                type="number"
                onChange={(event) => {
                  const input = event.target.value.charAt(0) === '0' ? event.target.value.slice(1) : event.target.value

                  if(!/^\d*$/g.test(input)) {
                    return
                  }
                  setInvalidCode(false)

                  setVerificationCode(input)
                }} 
                helperText={invalidCode && (
                  <div className="-mt-2 mb-4 ms-2 text-sm">
                      <span>Invalid Code</span>
                  </div>)
                }
                value={verificationCode}
              />
          </div>
        </Modal.Body>
        <Modal.Footer className="flex flex-row-reverse gap-2 mb-6">
          <Button 
            color="light"
            className="text-xl w-[40%] max-w-[8rem]" 
            //TODO: implement some async logic
            onClick={() => resendSignUpCode({ username: props.userProfile.email })}
          >Resend</Button>
          <Button 
            className="text-xl w-[40%] max-w-[8rem]" 
            onClick={() => setCodeSubmitting(true)} 
            isProcessing={codeSubmitting}
          >Submit</Button>
        </Modal.Footer>
      </Modal>
      <TermsAndConditionsModal open={termsAndConditionsVisible} onClose={() => setTermsAndConditionsVisible(false)} />
    </>
  )
}