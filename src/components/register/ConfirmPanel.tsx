import { resendSignUpCode } from "aws-amplify/auth"
import { Modal, Label, TextInput, Button, Checkbox, Tooltip } from "flowbite-react"
import { TermsAndConditionsModal } from "../modals"
import { Dispatch, SetStateAction, useState } from "react"
import { textInputTheme } from "../../utils"
import { RegistrationProfile } from "./RegisterForm"

interface ConfirmPanelProps {
  userProfile: RegistrationProfile
  parentUpdateUserProfile: Dispatch<SetStateAction<RegistrationProfile>>
}
export const ConfirmPanel = (props: ConfirmPanelProps) => {
  const [verificationModalVisible, setVerificationModalVisible] = useState(false)
  const [termsAndConditionsVisible, setTermsAndConditionsVisible] = useState(false)
  const [invalidCode, setInvalidCode] = useState(false)
  const [codeSubmitting, setCodeSubmitting] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')

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
      <div className="flex flex-col gap-1">
        <Label 
          className="ms-2 font-normal text-lg flex flex-row"
        >
          <span>Password</span>
          <Tooltip
            content={(<span className="whitespace-nowrap text-red-500 italic text-sm">Required Field</span>)}
            style="light"
          >
            <sup className="italic text-red-600 pe-1">*</sup>
          </Tooltip>
          <span>:</span>
        </Label>
        <TextInput 
          theme={textInputTheme} 
          sizing='lg' 
          className="" 
          placeholder="Password" type="password" 
          onChange={(event) => {
            props.parentUpdateUserProfile({
              ...props.userProfile,
              password: event.target.value
            })
          }}
          helperText={(
            <div className="-mt-2 mb-4 ms-2 text-sm">
              <span>
                <span>Your password must</span>
                <span className={`${props.userProfile.password === props.userProfile.confirm && props.userProfile.password ? 'text-green-500' : 'text-red-600'}`}> match </span> 
                <span>and include: a</span>
                <span className={`${/^.*\d+.*$/g.test(props.userProfile.password) ? 'text-green-500' : 'text-red-600'}`}> number</span>, 
                <span className={`${/^.*[!@#$%^&*(),.?":{}|<>]+.*$/g.test(props.userProfile.password) ? 'text-green-500' : 'text-red-600'}`}> special character</span>, 
                <span className={`${/^.*[A-Z]+.*$/g.test(props.userProfile.password) ? 'text-green-500' : 'text-red-600'}`}> upper</span> 
                <span> and </span>
                <span className={`${/^.*[a-z]+.*$/g.test(props.userProfile.password) ? 'text-green-500' : 'text-red-600'}`}> lower</span> 
                <span> case characters, and </span>
                <span className={`${props.userProfile.password.length >= 8 ? 'text-green-500' : 'text-red-600'}`}> at least 8 characters</span>
                <span>.</span>
              </span>
            </div>
          )}
        />
        <Label 
          className="ms-2 font-medium text-lg flex flex-row"
        >
          <span>Confirm Password</span>
          <Tooltip
            content={(<span className="whitespace-nowrap text-red-500 italic text-sm">Required Field</span>)}
            style="light"
          >
            <sup className="italic text-red-600 pe-1">*</sup>
          </Tooltip>
          <span>:</span>
        </Label>
        <TextInput 
          theme={textInputTheme} 
          sizing='lg'  
          placeholder="Confirm Password" 
          type="password"
          onChange={(event) => {
            props.parentUpdateUserProfile({
              ...props.userProfile,
              confirm: event.target.value
            })
          }}
        />
        <div className="flex flex-row text-left items-center gap-2 mt-2">
          <button 
            className="flex flex-row gap-2 text-left items-center" 
            onClick={() => props.parentUpdateUserProfile({
              ...props.userProfile,
              terms: !props.userProfile.terms
            })} 
          >
          <Checkbox 
            className="mt-1" 
            checked={props.userProfile.terms} 
            readOnly 
            onClick={() => props.parentUpdateUserProfile({
              ...props.userProfile,
              terms: !props.userProfile.terms
            })}
          />
          <span className="flex flex-row items-center gap-1">
            <span>Agree to </span>
            <span 
              className="hover:underline underline-offset-2 text-blue-500 hover:text-blue-700" 
              onClick={() => setTermsAndConditionsVisible(true)}
            >
              <span>terms and conditions</span>
            </span>
            <Tooltip
              content={(<span className="whitespace-nowrap text-red-500 italic text-sm">Required Field</span>)}
              style="light"
            >
              <sup className="italic text-red-600 -ms-1">*</sup>
            </Tooltip>
          </span>

          </button>
        </div>
      </div>
    </>
  )
}