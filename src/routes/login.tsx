import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../auth'
import { FormEvent, useEffect, useState } from 'react'
import useWindowDimensions from '../hooks/windowDimensions'
import { Alert, Button, Label, Modal, TextInput } from 'flowbite-react'
import { textInputTheme } from '../utils'

interface SignInFormElements extends HTMLFormControlsCollection {
    email: HTMLInputElement
    password: HTMLInputElement
}

interface SignInForm extends HTMLFormElement{
    readonly elements: SignInFormElements
}

interface NotificationComponent {
    message: string, 
    color: string,
    action?: Function
}

function RouteComponent() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<NotificationComponent[]>([])
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const { width } = useWindowDimensions()
  const [passwordResetVisible, setPasswordResetVisible] = useState(false)
  const [password, setPassword] = useState<string>()
  const [passwordNumber, setPasswordNumber] = useState(false)
  const [passwordSpecialCharacter, setPasswordSpecialCharacter] = useState(false)
  const [passwordMinCharacters, setPasswordMinCharacters] = useState(false)
  const [passwordUpperCharacter, setPasswordUpperCharacter] = useState(false)
  const [passwordLowerCharacter, setPasswordLowerCharacter] = useState(false)
  const [username, setUsername] = useState('')

  const [apiCall, setApiCall] = useState(false)

  //TODO: remove effect
  useEffect(() => {
      async function api(){
          let components: NotificationComponent[] = []

          if(auth.isAuthenticated) {
              const direction = auth.admin ? 'admin' : 'client'
              components.push({
                  message: 'You are already logged in! Redirecting to your dashboard in 5 seconds.',
                  color: 'red',
                  action: () => setTimeout(() => navigate({ to: `/${direction}/dashboard`}), 5000)
              })
          }

          if(history.state && history.state.usr){
              if(history.state.usr.createAccountSuccess){
                  components.push({
                      message: 'Successfully created user! Login with the user\'s email and password you just set!',
                      color: 'green'
                  })
              }
          }
          
          setNotifications(components)
          setApiCall(true)
      }
      
      if(!apiCall){
          api()
      }
  }, [])

  function validate(){
      return (
          window.localStorage.getItem('user') === null &&
          username !== '' &&
          password
      )
  }



  async function handlesubmit(event: FormEvent<SignInForm>) {
      event.preventDefault()
      const form = event.currentTarget;

      try{
          const response = await auth.login(
            form.elements.email.value,
            form.elements.password.value,
          )

          if(response === 'nextStep'){
              setSubmitting(false)
              setPasswordResetVisible(true)
              setPassword('')
              return
          }
          
          setSubmitting(false)
          if(auth.admin){
            //TODO: fix navigation
            console.log('going to admin')
              // navigate({ to: '/admin/dashboard'})
          }
          else if(auth.admin === false){
            console.log('goign to client')
              // navigate({ to: '/client/dashboard'})
          }
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
            //TODO: fix navigation
            console.log('going to admin')
              // navigate({ to: '/admin/dashboard'})
          }
          else if(auth.admin === false){
            console.log('goign to client')
              // navigate({ to: '/client/dashboard'})
          }
      }catch(err){
          const error = err as Error
          setFormErrors([error.message])
          setSubmitting(false)
      }
      
      setSubmitting(false)
  }

  return (
      <>
          <div className='flex flex-col'>
              {notifications.length > 0 ? (
                  notifications.map((element, index) => {
                      if(element.action) element.action()
                      return (
                          <div key={index} className="flex justify-center items-center font-main mb-4">
                              <Alert color={element.color} className="text-lg w-[90%]" onDismiss={() => {setNotifications(notifications.filter((e) => e != element))}}>
                                  <p>{element.message}</p>
                              </Alert>
                          </div>
                      )
                  })
              ) : (
                  <></>
              )}
          </div>
          
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
              {formErrors.length > 0 ? formErrors.map((error, index) => {
                  return (
                      <div key={index} className="flex justify-center items-center font-main mb-4">
                          <Alert color='red' className="text-lg w-[90%]" onDismiss={() => {setFormErrors(formErrors.filter((e) => e != error))}}>
                              <p>{error}</p>
                          </Alert>
                      </div>
                  )
              }) : (<></>)}
          </div>
          <form className='flex flex-col items-center justify-center font-main mt-12' onSubmit={(event: FormEvent<SignInForm>) => {
              handlesubmit(event)
              setSubmitting(true)
          }}>
              <div className={`flex flex-col items-center justify-center ${width > 500 ? 'w-[50%]' : 'w-full px-6'} max-w-[48rem] border-4 border-gray-500 rounded-lg`}>
                  <p className="font-bold text-4xl mb-8 mt-2 text-center">Welcome Back</p>
                  <div className={`flex flex-col gap-3 ${width > 500 ? 'w-[60%]' : 'w-full px-6'}  max-w-[32rem]`}>
                      <Label className="ms-2 font-semibold text-xl" htmlFor="email">Email:</Label>
                      <TextInput sizing='lg' className="mb-4 w-full" placeholder="Email" type="email" id="email" name="email" onChange={(event) => setUsername(event.target.value)} value={username} />
                      <Label className="ms-2 font-semibold text-xl" htmlFor="password">Password:</Label>
                      <TextInput sizing='lg' className="mb-4 w-full" placeholder="Password" type="password" id="password" name="password" onChange={(event) => setPassword(event.target.value)} value={password} />
                      <div className="flex justify-end">
                          {/* <a href='contact-form' className="text-blue-500 hover:underline">No Account? Purchase a package first!</a> */}
                          <Button isProcessing={submitting} className="text-xl w-[40%] max-w-[8rem] mb-6" type="submit" disabled={!validate()}>Login</Button>
                      </div>
                  </div>
              </div>
          </form>
      </>
  )
}

export const Route = createFileRoute('/login')({
  component: RouteComponent,
})
