import { useEffect, useState } from "react"
import { UserProfile } from "../../types"
import validator from "validator"

interface RegistrationProfile extends UserProfile { 
  password: string, 
  confirm: string,
  phone?: string
}

interface RegisterFormProps {
  temporaryProfile?: RegistrationProfile
}

interface SignupFormError {
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
    confirm: ''
  }))

  useEffect(() => {
    if(props.temporaryProfile) {
      setUserProfile(props.temporaryProfile)
    }
    else {
      setUserProfile({
        email: '',
        sittingNumber: -1,
        userTags: [],
        preferredContact: 'EMAIL',
        participant: []
      })
    }
  }, [props.temporaryProfile])

  const validateForm = (() => {
    let errors: SignupFormError[] = []
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
    if(userProfile.password !== userProfile.confirm) {

    }

    if(errors.length > 0) {
      setFormErrors(errors)
      return false
    }
    return true
  })()
}
