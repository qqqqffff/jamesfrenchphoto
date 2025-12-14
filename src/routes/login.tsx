import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { useAuth } from '../auth'
import { useEffect, useState } from 'react'
import useWindowDimensions from '../hooks/windowDimensions'
import { Alert, Button, Label, Modal, TextInput } from 'flowbite-react'
import { textInputTheme } from '../utils'
import { HiOutlineEyeSlash, HiOutlineEye } from "react-icons/hi2";
import { ForgotPasswordModal } from '../components/modals/ForgotPassword'

interface LoginParams {
  createAccount?: boolean,
  unauthorized?: boolean,
  invalidToken?: boolean,
  relogin?: boolean,
  forgotPassword?: boolean,
}

export const Route = createFileRoute('/login')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): LoginParams => ({
    createAccount: (search.createAccount as boolean) || undefined,
    unauthorized: (search.unauthorized as boolean) || undefined,
    invalidToken: (search.invalidToken as boolean) || undefined,
    relogin: (search.relogin as boolean) || undefined,
    forgotPassword: (search.forgotPassword as boolean) || undefined,
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
  const router = useRouter()

  const [notifications, setNotifications] = useState<{item: string, visible: boolean}[]>(
    [
      ...Object.entries(search).map((item) => 
        ({item: item[0], visible: item[1] !== undefined})
      ), 
      { item: 'alreadyLoggedIn', visible: auth.isAuthenticated },
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

  const [passwordVisible, setPasswordVisible] = useState(false)
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false)
  
  function NotificationComponent() {
    return (
      <div className="flex justify-center items-center font-main mb-4 mt-4">
        {
          notifications.find((item) => item.item === 'createAccount')?.visible && 
          notification('Successfully created user! Login with the user\'s email and password you just set!', 'green', 
            () => {
              navigate({ to: '.', search: { ...search, createAccount: undefined } })
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
        {
          notifications.find((item) => item.item === 'unauthorized')?.visible && 
          notification('Unauthorized', 'red', 
            () => {
              navigate({ to: '.', search: { ...search, unauthorized: undefined }  })
              setNotifications(
                notifications.map((notification) => {
                  if(notification.item === 'unauthorized') return {...notification, visible: false}
                  return notification
                })
              )
            }
          )
        }
        {
          notifications.find((item) => item.item === 'relogin')?.visible && 
          notification('Session expired please relogin', 'green', 
            () => {
              navigate({ to: '.', search: { ...search, relogin: undefined }  })
              setNotifications(
                notifications.map((notification) => {
                  if(notification.item === 'relogin') return {...notification, visible: false}
                  return notification
                })
              )
            }
          )
        }
        {
          notifications.find((item) => item.item === 'invalidToken')?.visible &&
          notification('The provided access token is invalid or has expired. If this was unexpected please ask for a new one.', 'red',
            () => {
              navigate({ to: '.', search: { ...search, invalidToken: undefined }  })
              setNotifications(
                notifications.map((notification) => {
                  if(notification.item === 'invalidToken') return {...notification, visible: false}
                  return notification
                })
              )
            },
          )
        }
        {
          notifications.find((item) => item.item === 'forgotPassword')?.visible && 
          notification('Successfully reset password', 'green', 
            () => {
              navigate({ to: '.', search: { ...search, forgotPassword: undefined }  })
              setNotifications(
                notifications.map((notification) => {
                  if(notification.item === 'forgotPassword') return {...notification, visible: false}
                  return notification
                })
              )
            }
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

  async function handlesubmit() {
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
      const error = err as Error
      setFormErrors([error.message])
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
        const error = err as Error
        setFormErrors([error.message])
        setSubmitting(false)
      }
  }

  useEffect(() => {
    setNotifications([
      ...Object.entries(search).map((item) => 
        ({item: item[0], visible: item[1] !== undefined})
      ), 
      { item: 'alreadyLoggedIn', visible: auth.isAuthenticated },
    ])
  }, [search, auth.isAuthenticated])

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
              {formErrors.length > 0 && formErrors.map((error, index) => {
                return (
                  <Alert key={index} color='red' className="text-base w-full opacity-70 font-semibold" onDismiss={() => {setFormErrors(formErrors.filter((e) => e != error))}}>
                    <p>{error}</p>
                  </Alert>
                )
              })}
            </div>
          </div>
          <p className="font-bold text-4xl mb-8 mt-8 text-center">Welcome Back</p>
          <div className={`flex flex-col gap-3 ${width > 500 ? 'w-[60%]' : 'w-full px-6'}  max-w-[32rem]`}>
            <span className="ms-2 font-semibold text-xl">Email:</span>
            <TextInput sizing='lg' className="mb-4 w-full" placeholder="Email" type="email" onChange={(event) => setUsername(event.target.value)} value={username} />
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
