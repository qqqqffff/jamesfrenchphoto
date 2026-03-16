import { createFileRoute, useNavigate, UseNavigateResult, useRouter } from '@tanstack/react-router'
import { useAuth } from '../auth'
import { useEffect, useRef, useState } from 'react'
import useWindowDimensions from '../hooks/windowDimensions'
import { Alert, Button, FlowbiteColors, Label, Modal, TextInput } from 'flowbite-react'
import { DynamicStringEnumKeysOf, textInputTheme } from '../utils'
import { HiOutlineEyeSlash, HiOutlineEye } from "react-icons/hi2";
import { ForgotPasswordModal } from '../components/modals/ForgotPassword'
import { v4 } from 'uuid'
import validator from 'validator'

interface LoginParams {
  createAccount?: boolean,
  unauthorized?: boolean,
  expired?: boolean
  invalidToken?: boolean,
  forgotPassword?: boolean,
}

export const Route = createFileRoute('/login')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): LoginParams => ({
    createAccount: (search.createAccount as boolean) || undefined,
    unauthorized: (search.unauthorized as boolean) || undefined,
    expired: (search.expired as boolean) || undefined,
    invalidToken: (search.invalidToken as boolean) || undefined,
    forgotPassword: (search.forgotPassword as boolean) || undefined,
  })
})

function Notification(props: {
  notification: LoginNotificationTypes
  remove: () => void, 
  navigate: UseNavigateResult<string>,
  admin: boolean,
  search: LoginParams,
  index: number,
}) {
  const [time, setTime] = useState<number>(5)
  const timerRef = useRef<NodeJS.Timeout>()
  let text = 'Unknown notification'
  let color: DynamicStringEnumKeysOf<FlowbiteColors> = 'info'

  useEffect(() => {
    if(props.notification.type !== 'alreadyLoggedIn') return

    timerRef.current = setInterval(() => {
      setTime(prev => {
        if(prev <= 1) {
          clearInterval(timerRef.current)
          props.navigate({ to: `/${props.admin ? 'admin' : 'client'}/dashboard`})
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if(timerRef.current) clearInterval(timerRef.current)
    }
  }, [props.notification.type])

  switch(props.notification.type) {
    case 'createAccount': {
      text = 'Successfully created user! Login with the user\'s email and password you just set!'
      color = 'green'
      break;
    }
    case 'unauthorized': {
      text = 'Unauthorized.'
      color = 'red'
      break;
    }
    case 'expired':
      text = 'Session expired please relogin.'
      color = 'red'
      break;
    case 'invalidToken':
      text = 'The provided access token is invalid or has expired. If this was unexpected please request for a new one.'
      color = 'red'
      break;
    case 'forgotPassword':
      text = 'Successfully reset password.'
      color = 'green'
      break;
    case 'alreadyLoggedIn': {
      text = `You are already logged in! Redirecting to your dashboard in ${time} seconds.`
      break;
    }
  }
  return (
    <Alert 
      color={color} 
      className={`opacity-80 border transition-opacity ${props.index > 0 ? '-mt-12' : ''} w-[80%] text-lg`}
      onDismiss={() => {
        props.remove()
        props.navigate({ to: '.', search: {
          createAccount: props.notification.type === 'createAccount' ? undefined : props.search.createAccount,
          unauthorized: props.notification.type === 'unauthorized' ? undefined : props.search.unauthorized,
          expired: props.notification.type === 'expired' ? undefined : props.search.expired,
          invalidToken: props.notification.type === 'invalidToken' ? undefined : props.search.invalidToken,
          forgotPassword: props.notification.type === 'forgotPassword' ? undefined : props.search.forgotPassword,
        }})
      }}
    >
      <p>{text}</p>
    </Alert>
  )
}

interface LoginNotificationTypes {
  type: 
    'createAccount' | 
    'unauthorized' | 
    'expired' | 
    'invalidToken' | 
    'forgotPassword' |
    'alreadyLoggedIn'
}


function RouteComponent() {
  const auth = useAuth()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()

  const [notifications, setNotifications] = useState<LoginNotificationTypes[]>([])
  const [formErrors, setFormErrors] = useState<{
    id: string,
    message: string,
    type: 'submit' | 'email'
  }[]>([])
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

  const [passwordVisible, setPasswordVisible] = useState(false)
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false)

  useEffect(() => {
    const notifications: LoginNotificationTypes[] = []
    if(search.createAccount) {
      notifications.push({ type: 'createAccount' })
    }
    if(search.expired){
      notifications.push({ type: 'expired' })
    }
    if(search.forgotPassword) {
      notifications.push({ type: 'forgotPassword' })
    }
    if(search.invalidToken){
      notifications.push({ type: 'invalidToken' })
    }
    if(search.unauthorized) {
      notifications.push({ type: 'unauthorized' })
    }
    if(auth.isAuthenticated) {
      notifications.push({ type: 'alreadyLoggedIn' })
    }
    setNotifications(notifications)
  }, [search, auth.isAuthenticated])

  
  function NotificationComponent() {
    return (
      <div className="flex justify-center items-center mb-4 mt-4">
        {notifications
        .filter((_, index) =>  index < 3)
        .reverse()
        .map((notification, index) => {
          return (
            <Notification
              key={index}
              index={index}
              notification={notification}
              remove={() => {
                setNotifications(prev => prev.filter((item) => item.type !== notification.type))
              }}
              navigate={navigate}
              admin={auth.admin}
              search={search}
            />
          )
        })}
      </div>
    )
  }

  function validate(){
    return (
      !auth.isAuthenticated &&
      username !== '' &&
      password !== ''
    )
  }

  async function handlesubmit() {
    try{
      const response = await auth.login(
        username,
        password
      )

      if(response === 'fail') throw new Error()

      if(response === 'nextStep'){
        setSubmitting(false)
        setPasswordResetVisible(true)
        setPassword('')
        return
      }

      await router.invalidate()

      await new Promise(resolve => setTimeout(resolve, 1))

      if(response === 'admin'){
        navigate({ to: '/admin/dashboard'})
      }
      else if(response === 'client'){
        navigate({ to: '/client/dashboard/advertise' })
      }
      setSubmitting(false)
    } catch(err){
      setFormErrors([...formErrors, {
        id: v4(),
        message: 'Incorrect username or password',
        type: 'submit'
      }])
      setSubmitting(false)
    }
  }

  async function confirmSignInWithNewPassword(){
    try{
      auth.confirmLogin(username, password!)

      await router.invalidate()

      await new Promise(resolve => setTimeout(resolve, 1))

      if(auth.admin){
        navigate({ to: '/admin/dashboard'})
      }
      else if(auth.admin === false){
        navigate({ to: '/client/dashboard'})
      }
      setSubmitting(false)
    }catch(err){
      setFormErrors([...formErrors, {
        id: v4(),
        message: 'Failed to confirm signin with new password.',
        type: 'submit'
      }])
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

      <ForgotPasswordModal 
        onClose={() => {
          setForgotPasswordVisible(false)
        }}
        open={forgotPasswordVisible}
        successCallback={() => {
          navigate({ to: '.', search: { ...search, forgotPassword: true }})
        }}
      />

      <div className='flex flex-col items-center justify-center font-main mt-12'>
        <div className={`
          flex flex-col items-center justify-center 
          ${width > 800 ? 'w-[60%] border-4 border-gray-500 rounded-lg max-w-[48rem]' : 'w-full px-6 border-y-4 border-y-gray-500'}
        `}
        >
          <div className="mt-2 w-full relative">
            <div className="items-center mb-4 absolute top-0 left-0 right-0 mx-20">
              {formErrors.filter((item) => item.type === 'submit').map((error, index) => {
                return (
                  <Alert 
                    key={index} 
                    color='red' 
                    className="text-base w-full opacity-70 font-semibold" 
                    onDismiss={() => {setFormErrors(formErrors.filter((e) => e.id != error.id))}}
                  >
                    <p>{error.message}</p>
                  </Alert>
                )
              })}
            </div>
          </div>
          <p className="font-bold text-4xl mb-8 mt-8 text-center">Welcome Back</p>
          <div className={`flex flex-col gap-3 ${width > 500 ? 'w-[60%]' : 'w-full px-6'}  max-w-[32rem]`}>
            <span className="ms-2 font-semibold text-xl">Email:</span>
            <TextInput 
              sizing='lg' 
              className="mb-4 w-full" 
              placeholder="Your Email" 
              type="email" 
              onChange={(event) => {
                setUsername(event.target.value)
              }} 
              value={username} 
              onBlur={() => {
                if(!validator.isEmail(username)) {
                  setFormErrors([...formErrors, {
                    id: v4(),
                    message: 'Invalid Email Address',
                    type: 'email'
                  }])
                }
              }}
              onFocus={() => {
                if(formErrors.some((error) => error.type === 'email')) {
                  setFormErrors(prev => prev.filter((error) => error.type === 'email'))
                }
              }}
              helperText={(
                <p className='text-xs text-red-500'>Invalid Email Address</p>
              )}
            />
            <span className="ms-2 font-semibold text-xl">Password:</span>
            <div className='w-full relative h-auto'>
              <TextInput 
                sizing='lg' 
                className="mb-4 w-full" 
                placeholder="Password" type={passwordVisible ? 'text' : 'password'} 
                onChange={(event) => setPassword(event.target.value)} 
                value={password}
                onKeyDown={(event) => {
                  if(event.code === 'Enter' && validate()) {
                    handlesubmit()
                    setSubmitting(true)
                  }
                }}
              />
              <button 
                type='button' 
                onClick={() => setPasswordVisible(!passwordVisible)}
                className='absolute inset-y-0 right-3 mb-4'
              >
                {passwordVisible ? (
                  <HiOutlineEyeSlash size={24} className='fill-white'/>
                ) : (
                  <HiOutlineEye size={24} className='fill-white'/>
                )}
              </button>
            </div>
            <div className="flex justify-between items-center pb-4 mb-8">
              <button 
                className='text-blue-500 hover:underline hover:text-blue-300 text-sm font-medium'
                onClick={() => setForgotPasswordVisible(true)}
              >Forgot password?</button>
              <Button 
                isProcessing={submitting} 
                className="text-xl w-[40%] max-w-[8rem]" 
                disabled={!validate()}
                onClick={() => {
                  handlesubmit()
                  setSubmitting(true)
                }}
              >Login</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
