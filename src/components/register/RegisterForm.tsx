import { SetStateAction, useEffect, useState } from "react"
import { UserProfile } from "../../types"
import validator from "validator"
import { Label, TextInput } from "flowbite-react"
import { textInputTheme } from "../../utils"
import { useMutation } from "@tanstack/react-query"
import useWindowDimensions from "../../hooks/windowDimensions"
import { RegisterUserMutationParams, registerUserMutation } from "../../services/userService"
import { UserPanel } from "./UserPanel"
import { ParticipantPanel } from "./ParticipantPanel"
import { ConfirmPanel } from "./ConfirmPanel"
import { useNavigate } from "@tanstack/react-router"

export interface RegistrationProfile extends UserProfile { 
  password: string, 
  confirm: string,
  phone?: string
  terms: boolean
}

interface RegisterFormProps {
  temporaryProfile?: RegistrationProfile
}

export interface FormError {
    id: | {
      step: FormStep.User,
      location: 'first' | 'last' | 'phone' | 'email'
    } | {
      step: FormStep.Participant,
      participantId: string,
      location: 'first' | 'last' | 'preferred' | 'middle' | 'email'
    } | {
      step: FormStep.Confirm,
      location: 'password' | 'confirm' | 'terms'
    } | {
      step: 'global'
    }
    message: string
}

export enum FormStep {
  'User' = 'User',
  'Participant' = 'Participant',
  'Confirm' = 'Confirm'
}

export const RegisterForm = (props: RegisterFormProps) => {
  const [userProfile, setUserProfile] = useState<RegistrationProfile>(props.temporaryProfile ?? ({
    email: '',
    sittingNumber: -1,
    userTags: [],
    preferredContact: 'EMAIL',
    participant: [],
    password: '',
    confirm: '',
    terms: false
  }))
  const [formErrors, setFormErrors] = useState<FormError[]>([])
  const [formStep, setFormStep] = useState<FormStep>(FormStep.User)
  const { width } = useWindowDimensions()
  const navigate = useNavigate()

  // useEffect(() => {
  //   if(props.temporaryProfile) {
  //     setUserProfile(props.temporaryProfile)
  //   }
  //   else {
  //     setUserProfile({
  //       email: '',
  //       sittingNumber: -1,
  //       userTags: [],
  //       preferredContact: 'EMAIL',
  //       participant: [],
  //       password: '',
  //       confirm: '',
  //       terms: false
  //     })
  //   }
  // }, [props.temporaryProfile])

  const validateForm = (() => {
    let errors: FormError[] = []
    if(!userProfile.firstName || userProfile.firstName.length <= 0){
      errors.push({
        id: {
          step: FormStep.User,
          location: 'first'
        },
        message: 'Your First Name is Required'
      })
    }
    if(!userProfile.lastName || userProfile.lastName.length <= 0){
      errors.push({
          id: {
            step: FormStep.User,
            location: 'last'
          },
          message: 'Your Last Name is Required'
      })
    }
    if(userProfile.phone && !validator.isMobilePhone(`+1${userProfile.phone.replace(/\D/g, '')}`, 'en-US')){
      errors.push({
        id: {
          step: FormStep.User,
          location: 'phone'
        },
        message: 'Invalid Phone Number'
      })
    }
    if(userProfile.email.length <= 0){
      errors.push({
        id: {
          step: FormStep.User,
          location: 'email'
        },
        message: 'Email is Required'
      })
    }
    if(!validator.isEmail(userProfile.email)){
      errors.push({
        id: {
          step: FormStep.User,
          location: 'email'
        },
        message: 'Invalid Email Address'
      })
    }
    userProfile.participant.forEach((participant) => {
      if(!participant.firstName || participant.firstName.length <= 0) {
        errors.push({
          id: {
            step: FormStep.Participant,
            participantId: participant.id,
            location: 'first'
          },
          message: 'Participant First Name is Required'
        })
      }
      if(!participant.lastName || participant.lastName.length <= 0) {
        errors.push({
          id: {
            step: FormStep.Participant,
            participantId: participant.id,
            location: 'last'
          },
          message: 'Participant Last Name is Required'
        })
      }
      if(participant.email && !validator.isEmail(userProfile.email)) {
        errors.push({
          id: {
            step: FormStep.Participant,
            participantId: participant.id,
            location: 'email'
          },
          message: 'Invalid Email Address'
        })
      }
    })
    if(userProfile.password.length <= 8) {
      errors.push({
        id: {
          step: FormStep.Confirm,
          location: 'password'
        },
        message: 'Password must be at least 8 characters'
      })
    }
    if(!/^[!@#$%^&*(),.?":{}|<>]+$/g.test(userProfile.password)) {
      errors.push({
        id: {
          step: FormStep.Confirm,
          location: 'password'
        },
        message: 'Password must contain a special character'
      })
    }
    if(!/^\d+$/g.test(userProfile.password)) {
      errors.push({
        id: {
          step: FormStep.Confirm,
          location: 'password'
        },
        message: 'Password must contain a number'
      })
    }
    if(!/^[A-Z]+$/g.test(userProfile.password)) {
      errors.push({
        id: {
          step: FormStep.Confirm,
          location: 'password'
        },
        message: 'Password must contain an upper case character'
      })
    }
    if(!/^[a-z]+$/g.test(userProfile.password)) {
      errors.push({
        id: {
          step: FormStep.Confirm,
          location: 'password'
        },
        message: 'Password must contain a lower case character'
      })
    }
    if(userProfile.password !== userProfile.confirm) {
      errors.push({
        id: {
          step: FormStep.Confirm,
          location: 'confirm'
        },
        message: 'Participant First Name is Required'
      })
    }
    if(!userProfile.terms) {
      errors.push({
        id: {
          step: FormStep.Confirm,
          location: 'terms'
        },
        message: 'Terms and conditions must be accepted'
      })
    }
    if(
      window.localStorage.getItem('user') !== null ||
      window.localStorage.getItem('jfp.auth.user') !== null
    ) {
      errors.push({
        id: {
          step: 'global'
        },
        message: 'Signed in user detected, signout to create an account!'
      })
    }

    if(errors.length > 0) {
      setFormErrors(errors)
      return false
    }
    return true
  })()


  const handleNext = () => {
    switch(formStep) {
      case FormStep.User:
        setFormStep(FormStep.Participant)
        return
      case FormStep.Participant:
        setFormStep(FormStep.Confirm)
        return
      case FormStep.Confirm:
        setFormStep(FormStep.User)
        return
    }
  }

  const handlePrevious = () => {
    switch(formStep) {
      case FormStep.User:
        setFormStep(FormStep.Confirm)
        return
      case FormStep.Participant:
        setFormStep(FormStep.User)
        return
      case FormStep.Confirm:
        setFormStep(FormStep.Participant)
        return
    }
  }

  const currentStepIndex = (step: FormStep) => {
    switch(step) {
      case FormStep.User:
        return 0
      case FormStep.Participant:
        return 1
      case FormStep.Confirm:
        return 2
    }
  }

  const userStepCriteria = (
    !userProfile.firstName ||
    userProfile.firstName.length <= 0 ||
    !userProfile.lastName || 
    userProfile.lastName.length <= 0 ||
    (
      userProfile.phone && 
      !validator.isMobilePhone(`+1${userProfile.phone.replace(/\D/g, '')}`, 'en-US')
    ) ||
    userProfile.email.length <= 0 ||
    !validator.isEmail(userProfile.email)
  )

  const participantStepCriteria = (
    userProfile.participant.reduce((prev, cur) => {
      if(prev === true) return prev
      if(
        !cur.firstName || 
        cur.firstName.length <= 0 ||
        !cur.lastName || 
        cur.lastName.length <= 0 ||
        (
          cur.email && 
          !validator.isEmail(userProfile.email)
        )
      ) {
        return true
      }
      return prev
    }, false)
  )

  const confirmStepCriteria = (
    userProfile.password.length <= 8 ||
    !/^[!@#$%^&*(),.?":{}|<>]+$/g.test(userProfile.password) ||
    !/^\d+$/g.test(userProfile.password) ||
    !/^[A-Z]+$/g.test(userProfile.password) ||
    !/^[a-z]+$/g.test(userProfile.password) ||
    userProfile.password !== userProfile.confirm ||
    !userProfile.terms
  )

  const evaluateAllowedNext = (step: FormStep) => {
    switch(step) {
      case FormStep.User:
        return userStepCriteria
      case FormStep.Participant:
        return (
          userStepCriteria &&
          participantStepCriteria
        )
      case FormStep.Confirm:
        return (
          userStepCriteria &&
          participantStepCriteria &&
          confirmStepCriteria &&
          window.localStorage.getItem('user') !== null ||
          window.localStorage.getItem('jfp.auth.user') !== null
        )
      default:
        return true
    }
  }

  const registerUser = useMutation({
    mutationFn: (params: RegisterUserMutationParams) => registerUserMutation(params),
    //TODO: handle on settled / whatever
  })

  //TODO: conditional rendering
  return (
    <div className={`
      flex flex-col items-center justify-center mx-4 gap-4 min-h-[96vh] max-h-[96vh] 
      overflow-auto my-12 w-full 
      ${width > 500 ? 'px-4' : 'px-0'}
    `}>
      <div className={`
        relative flex flex-col items-center justify-center 
        ${width > 800 ? 'w-[70%]' : 'w-full'} 
        max-w-[48rem] border-2 px-4 py-4 border-gray-300
      `}>
        <div className="p-6 flex flex-row items-center w-full justify-center">
          <p className="font-bold text-4xl mb-8 text-center">{/* TODO: conditionally render this*/}Create an account</p>
          <div className="mb-4 ms-[17.5%] w-[80%]">
            <div className="flex items-center justify-between">
              {Object.keys(FormStep).map((step, index, array) => {
                const stepIndex = currentStepIndex(formStep)
                const evaluateNext = index > 0 ? evaluateAllowedNext(array[index - 1] as FormStep) : false
                return (
                  <div key={index} className="relative flex-1">
                    <div className="flex items-center">
                      <button 
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center border-2 
                          ${index === stepIndex || !evaluateNext ? 'border-blue-600 text-blue-600' : 
                              index < stepIndex ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-300'
                          } enabled:hover:cursor-pointer disabled:hover:cursor-not-allowed
                        `}
                        onClick={() => setFormStep(step as FormStep)}
                        disabled={evaluateNext && (step as FormStep) !== formStep}
                      >
                        {index < stepIndex ? (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule='evenodd' />
                          </svg>
                        ) : (
                          <span>{index + 1}</span>
                        )}
                      </button>
                      {index < 2 && (
                        <div 
                          className={`flex-1 h-0.5 mx-2 ${index < stepIndex || !evaluateNext ? 'bg-blue-600' : 'bg-gray-300'}`}
                        />
                      )}
                    </div>
                    <div className={`absolute top-10 w-full text-start text-xs font-medium ${index <= stepIndex ? 'text-blue-600' : 'text-gray-500'}`}>
                      {step}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex flex-col gap-1 w-[80%] max-w-[40rem]">
            {formStep === FormStep.User ? (
              <UserPanel 
                userProfile={userProfile}
                parentUpdateUserProfile={setUserProfile}
                width={width}
                errors={formErrors}
                setErrors={setFormErrors}
              />
            ) : (
            formStep === FormStep.Participant ? (
              <ParticipantPanel 
              
              />
            ) : (
              <ConfirmPanel 
                userProfile={userProfile} 
                parentUpdateUserProfile={setUserProfile}              
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* TODO: move me please */
// <p className="italic text-sm">
//   <sup className="italic text-red-600">*</sup> 
//   <span>Indicates required fields.</span>
// </p>
// {/* TODO: move me please too */}
// <p className="italic text-sm">
//   <sup className="text-gray-400">1</sup> 
//   <span>US Phone numbers only, without country code. No special formatting needed.</span>
// </p>