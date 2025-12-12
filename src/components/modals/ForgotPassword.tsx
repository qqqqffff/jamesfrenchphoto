import { FC, useRef, useState } from "react";
import { ModalProps } from ".";
import { Alert, Button, Modal, TextInput } from "flowbite-react";
import { confirmResetPassword, resetPassword, type ResetPasswordOutput } from "aws-amplify/auth";
import validator from 'validator'
import { HiOutlineEye, HiOutlineEyeSlash } from "react-icons/hi2"

interface ForgotPasswordModalProps extends ModalProps { 

}

export const ForgotPasswordModal: FC<ForgotPasswordModalProps> = (props) => {
  const [cooldown, setCooldown] = useState<NodeJS.Timeout>()
  const [email, setEmail] = useState('')
  const [invalidEmail, setInvalidEmail] = useState(false)
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [invalidPassword, setInvalidPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [message, setMessage] = useState<{ type: 'Success' | 'Fail', message: string }>()
  const messageTimeout = useRef<NodeJS.Timeout | null>(null)
  const [forgotPasswordStep, setForgotPasswordStep] = useState<ResetPasswordOutput>()
  const [resetCodeSending, setResetCodeSending] = useState(false)
  const [passwordResetting, setPasswordResetting] = useState(false)

  const validatePassword = () => {
    return (
      /^.*\d+.*$/g.test(newPassword) &&
      newPassword === confirmPassword &&
      /^.*[A-Z]+.*$/g.test(newPassword) &&
      /^.*[a-z]+.*$/g.test(newPassword) &&
      newPassword.length >= 8
    )
  }

  const clearState = () => {
    setInvalidEmail(false)
    setInvalidPassword(false)
    setCooldown(undefined)
    setMessage(undefined)
    setResetCodeSending(false)
    setPasswordResetting(false)
    setForgotPasswordStep(undefined)
    setEmail('')
    setConfirmPassword('')
    setNewPassword('')
    setCode('')
  }

  return (
    <Modal 
      show={props.open} 
      onClose={() => {
        props.onClose()
        clearState()
      }}
      size="lg"
    >
      <Modal.Header className="pb-2">Forgot Password</Modal.Header>
      <Modal.Body className="pb-2">
        <div className="flex flex-col px-2 gap-4 p-4">
          {message !== undefined && (
            <div className="w-full my-2">
              <Alert 
                color={message.type === 'Success' ? 'green' : 'red'} 
                onDismiss={() => setMessage(undefined)}
              >{message.message}</Alert>
            </div>
          )}
          <div className="flex flex-row gap-2 text-nowrap">
            <span className="">Email:</span>
            <div className="flex flex-col justify-start w-full">
              <input 
                className={`
                  font-thin p-0 text-sm border-transparent ring-transparent w-full 
                  border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic 
                  ${invalidEmail ? 'border-b-red-500' : 'border-b-gray-400'}
                `}
                placeholder="Your Email..."
                value={email}
                onChange={(event) => {
                  if(forgotPasswordStep?.nextStep !== undefined) {
                    setForgotPasswordStep(undefined)
                    setEmail(event.target.value)
                    setInvalidEmail(false)
                    setConfirmPassword('')
                    setNewPassword('')
                    setCode('')
                  }
                  else {
                    setEmail(event.target.value)
                    setInvalidEmail(false)
                  }
                }}
                onBlur={() => {
                  if(!validator.isEmail(email)) {
                    setInvalidEmail(true)
                  }
                }}
                onFocus={() => {
                  setInvalidEmail(false)
                }}
              />
              {invalidEmail && (
                <span className="ms-2 text-sm">
                  <span>
                    <span className="text-red-500">Please enter a valid email</span>
                  </span>
                </span>
              )}
            </div>
          </div>
          {forgotPasswordStep?.nextStep.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE' && (
            <>
              <div className="flex flex-row gap-2 items-center text-nowrap">
                <span className="">Reset Code:</span>
                <input 
                  className={`
                    font-thin p-0 text-sm border-transparent ring-transparent w-full border-b-gray-400 max-w-xs
                    border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic
                  `}
                  placeholder="Reset Code..."
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
              </div>
              <div className="flex flex-row gap-2 items-center text-nowrap relative">
                <span className="">New Password:</span>
                <TextInput
                  type={passwordVisible ? 'text' : 'password'}
                  className={`
                    font-thin p-0 text-sm border-transparent ring-transparent w-full max-w-xs
                    border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic 
                    ${invalidPassword ? 'border-b-red-500' : 'border-b-gray-400'}
                  `}
                  placeholder="New Password..."
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value)
                    setInvalidPassword(false)
                  }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => {
                    if(!validatePassword()) {
                      setInvalidPassword(true)
                      setPasswordFocused(false)
                    }
                    else {
                      setPasswordFocused(false)
                    }
                  }}
                  helperText={passwordFocused ? (
                    <span className="-mt-2 mb-4 ms-2 text-sm">
                      <span>
                        <span>Your password must</span>
                        <span className={`${newPassword === confirmPassword && newPassword !== '' ? 'text-green-500' : 'text-red-600'}`}> match </span> 
                        <span>and include: a</span>
                        <span className={`${/^.*\d+.*$/g.test(newPassword) ? 'text-green-500' : 'text-red-600'}`}> number</span>, 
                        <span className={`${/^.*[!@#$%^&*(),.?":{}|<>]+.*$/g.test(newPassword) ? 'text-green-500' : 'text-red-600'}`}> special character</span>, 
                        <span className={`${/^.*[A-Z]+.*$/g.test(newPassword) ? 'text-green-500' : 'text-red-600'}`}> upper</span> 
                        <span> and </span>
                        <span className={`${/^.*[a-z]+.*$/g.test(newPassword) ? 'text-green-500' : 'text-red-600'}`}> lower</span> 
                        <span> case characters, and </span>
                        <span className={`${newPassword.length >= 8 ? 'text-green-500' : 'text-red-600'}`}> at least 8 characters</span>
                        <span>.</span>
                      </span>
                    </span>
                  ) : undefined}
                />
                <button
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute top-0 right-3 mt-2"
                >
                  {passwordVisible ? (
                    <HiOutlineEyeSlash size={24} className='fill-white'/>
                  ) : (
                    <HiOutlineEye size={24} className='fill-white'/>
                  )}
                </button>
              </div>
              <div className="flex flex-row gap-2 items-center text-nowrap relative">
                <span className="">Confirm Password:</span>
                <TextInput
                  type='password'
                  className={`
                    font-thin p-0 text-sm border-transparent ring-transparent w-full max-w-xs
                    border py-0.5 focus:outline-none placeholder:text-gray-400 placeholder:italic italic 
                    border-b-gray-400
                  `}
                  placeholder="Confirm Password..."
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer className='flex flex-row justify-end gap-4'>
        <Button
          onClick={() => {
            props.onClose()
            clearState()
          }}
          color="light"
          size='sm'
        >Cancel</Button>
        <Button 
          isProcessing={resetCodeSending} 
          size="sm" 
          disabled={!validator.isEmail(email) || cooldown !== undefined || resetCodeSending}
          onClick={() => {
            resetPassword({
              username: email
            }).then((output) => {
              setForgotPasswordStep(output)
              setMessage({ type: 'Success', message: `Sent code to ${email} if an account exists!`})
              setResetCodeSending(false)
              setCooldown(setTimeout(() => {
                setCooldown(undefined)
              }, 30 * 1000))
              messageTimeout.current = setTimeout(() => {
                messageTimeout.current = null
                setMessage(undefined)
              }, 10 * 1000)
            }).catch((error) => {
              console.error(error)
              setMessage({ type: 'Fail', message: `Failed to send code to ${email}`})
              setResetCodeSending(false)
              setCooldown(setTimeout(() => {
                setCooldown(undefined)
              }, 5 * 1000))
              messageTimeout.current = setTimeout(() => {
                messageTimeout.current = null
                setMessage(undefined)
              }, 10 * 1000)
            })
            setResetCodeSending(true)
          }}
        >{forgotPasswordStep?.nextStep.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE' ? 'Res' : 'S'}end Code</Button>
        {forgotPasswordStep?.nextStep.resetPasswordStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE' && (
          <Button
            isProcessing={passwordResetting}
            disabled={!validatePassword() || code === ''}
            size="sm"
            onClick={() => {
              confirmResetPassword({
                confirmationCode: code,
                newPassword: newPassword,
                username: email
              }).then(() => {
                clearState()
                props.onClose()
              }).catch((error) => {
                console.error(error)
                setMessage({ type: 'Fail', message: 'Invalid code or reused password.'})
                messageTimeout.current = setTimeout(() => {
                  messageTimeout.current = null
                  setMessage(undefined)
                }, 10 * 1000)
                setPasswordResetting(false)
              })
              setPasswordResetting(true)
            }}
          >Confirm Reset</Button>
        )}
      </Modal.Footer>
    </Modal>
  )
}