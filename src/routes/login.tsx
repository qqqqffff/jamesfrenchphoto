import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../auth'
import { FormEvent, useState } from 'react'
import useWindowDimensions from '../hooks/windowDimensions'
import { Alert, Button, Label, Modal, TextInput } from 'flowbite-react'
import { textInputTheme } from '../utils'

interface LoginParams {
  createAccount?: boolean
}

export const Route = createFileRoute('/login')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): LoginParams => ({
    createAccount: (search.createAccount as boolean) || undefined
  })
})

const notification = (text: string, color: string, remove: () => void, action?: Function) => {
  if(action !== undefined) action()
  return (
    <Alert color={color} className="text-lg w-[90%]" onDismiss={() => {remove()}}>
      <p>{text}</p>
    </Alert>
  )
}

function RouteComponent() {
  const auth = useAuth()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<{item: string, visible: boolean}[]>(
    [
      ...Object.entries(search).map((item) => 
        ({item: item[0], visible: item[1] !== undefined})
      ), 
      { item: 'alreadyLoggedIn', visible: auth.isAuthenticated }
    ]
  )
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const { width } = useWindowDimensions()
  const [passwordResetVisible, setPasswordResetVisible] = useState(false)

  const [password, setPassword] = useState<string>('')
  const [username, setUsername] = useState('')

  const [passwordNumber, setPasswordNumber] = useState(false)
  const [passwordSpecialCharacter, setPasswordSpecialCharacter] = useState(false)
  const [passwordMinCharacters, setPasswordMinCharacters] = useState(false)
  const [passwordUpperCharacter, setPasswordUpperCharacter] = useState(false)
  const [passwordLowerCharacter, setPasswordLowerCharacter] = useState(false)
  
  function NotificationComponent() {
    return (
      <div className="flex justify-center items-center font-main mb-4 mt-4">
        {
          notifications.find((item) => item.item === 'createAccount')?.visible && 
          notification('Successfully created user! Login with the user\'s email and password you just set!', 'green', 
            () => {
              navigate({ to: '.' })
              setNotifications(
                notifications.map((notification) => {
                  if(notification.item === 'createAccount') return {...notification, visible: false}
                  return notification
                })
              )
            }
          )
        }
        {
          notifications.find((item) => item.item === 'alreadyLoggedIn')?.visible &&
          notification('You are already logged in! Redirecting to your dashboard in 5 seconds.', 'red',
            () => {
              navigate({ to: `/${auth.admin ? 'admin' : 'client'}/dashboard`})
              setNotifications(
                notifications.map((notification) => {
                  if(notification.item === 'alreadyLoggedIn') return {...notification, visible: false}
                  return notification
                })
              )
            },
            () => setTimeout(() => navigate({ to: `/${auth.admin ? 'admin' : 'client'}/dashboard`}), 5000)
          )
        }
      </div>
    )
  }

  function validate(){
    return (
      !auth.isAuthenticated &&
      username !== '' &&
      password
    )
  }

  async function handlesubmit(event: FormEvent) {
      event.preventDefault()

      try{
        const response = await auth.login(
          username,
          password
        )

        if(response === 'nextStep'){
          setSubmitting(false)
          setPasswordResetVisible(true)
          setPassword('')
          return
        }

        if(response === 'admin'){
          navigate({ to: '/admin/dashboard'})
        }
        else if(response === 'client'){
          navigate({ to: '/client/dashboard'})
        }
        setSubmitting(false)
      } catch(err){
        const error = err as Error
        setFormErrors([error.message])
        setSubmitting(false)
      }
  }

  async function confirmSignInWithNewPassword(){
      try{
          auth.confirmLogin(username, password!)

          setSubmitting(false)
          if(auth.admin){
            navigate({ to: '/admin/dashboard'})
          }
          else if(auth.admin === false){
            navigate({ to: '/client/dashboard'})
          }
      }catch(err){
        const error = err as Error
        setFormErrors([error.message])
        setSubmitting(false)
      }
  }

  return (
    <>
      <NotificationComponent />
      
      <Modal show={passwordResetVisible} onClose={() => setPasswordResetVisible(true)}>
        <Modal.Header>Reset Temporary Password</Modal.Header>
        <Modal.Body className="flex flex-col gap-2">
          <Label className="ms-2 font-medium text-lg" htmlFor="password">New Password<sup className="italic text-red-600">*</sup>:</Label>
          <TextInput theme={textInputTheme} sizing='lg' className="" placeholder="Password" type="password" id="password" name="password" 
            onChange={(event) => {
              const password = event.target.value
              
              setPassword(password)
              setPasswordNumber(/\d/.test(password))
              setPasswordSpecialCharacter(/[!@#$%^&*(),.?":{}|<>]/.test(password))
              setPasswordUpperCharacter(/[A-Z]/.test(password))
              setPasswordLowerCharacter(/[a-z]/.test(password))
              setPasswordMinCharacters(password.length >= 8)
            }}
            helperText={
              (<div className="-mt-2 mb-4 ms-2 text-sm">
                <span>
                    Your password must include: a 
                    <span className={`${passwordNumber ? 'text-green-500' : 'text-red-600'}`}> number</span>, 
                    <span className={`${passwordSpecialCharacter ? 'text-green-500' : 'text-red-600'}`}> special character</span>, 
                    <span className={`${passwordUpperCharacter ? 'text-green-500' : 'text-red-600'}`}> upper</span> and 
                    <span className={`${passwordLowerCharacter ? 'text-green-500' : 'text-red-600'}`}> lower</span> case characters, and 
                    <span className={`${passwordMinCharacters ? 'text-green-500' : 'text-red-600'}`}> at least 8 characters</span>.</span>
              </div>)
            }
          />
        </Modal.Body>
        <Modal.Footer className="flex flex-row justify-end">
          <Button isProcessing={submitting} onClick={async () => {
            confirmSignInWithNewPassword()
            setSubmitting(true)
          }} disabled={!(
            passwordNumber &&
            passwordSpecialCharacter &&
            passwordUpperCharacter &&
            passwordLowerCharacter && 
            passwordMinCharacters)}>Submit</Button>
        </Modal.Footer>
      </Modal>

      <div className="mt-4">
        {formErrors.length > 0 && formErrors.map((error, index) => {
          return (
            <div key={index} className="flex justify-center items-center font-main mb-4">
              <Alert color='red' className="text-lg w-[90%]" onDismiss={() => {setFormErrors(formErrors.filter((e) => e != error))}}>
                <p>{error}</p>
              </Alert>
            </div>
          )
        })}
      </div>
      <form className='flex flex-col items-center justify-center font-main mt-12' onSubmit={(event: FormEvent) => {
        handlesubmit(event)
        setSubmitting(true)
      }}>
        <div className={`flex flex-col items-center justify-center ${width > 500 ? 'w-[50%]' : 'w-full px-6'} max-w-[48rem] border-4 border-gray-500 rounded-lg`}>
          <p className="font-bold text-4xl mb-8 mt-2 text-center">Welcome Back</p>
          <div className={`flex flex-col gap-3 ${width > 500 ? 'w-[60%]' : 'w-full px-6'}  max-w-[32rem]`}>
            <Label className="ms-2 font-semibold text-xl" htmlFor="email">Email:</Label>
            <TextInput sizing='lg' className="mb-4 w-full" placeholder="Email" type="email" onChange={(event) => setUsername(event.target.value)} value={username} />
            <Label className="ms-2 font-semibold text-xl" htmlFor="password">Password:</Label>
            <TextInput sizing='lg' className="mb-4 w-full" placeholder="Password" type="password" onChange={(event) => setPassword(event.target.value)} value={password} />
            <div className="flex justify-end">
              <Button isProcessing={submitting} className="text-xl w-[40%] max-w-[8rem] mb-6" type="submit" disabled={!validate()}>Login</Button>
            </div>
          </div>
        </div>
      </form>
    </>
  )
}
