import { Dispatch, SetStateAction, useState } from "react";
import { FormError, FormStep, RegistrationProfile } from "./RegisterForm";
import { Label, TextInput } from "flowbite-react";
import { textInputTheme } from "../../utils";

interface UserPanelProps {
  userProfile: RegistrationProfile,
  parentUpdateUserProfile: Dispatch<SetStateAction<RegistrationProfile>>
  width: number,
  errors: FormError[],
  setErrors: Dispatch<SetStateAction<FormError[]>>
}

export const UserPanel = (props: UserPanelProps) => {
  const [firstUnfocused, setFirstUnfocused] = useState(false)
  const [lastUnfocused, setLastUnfocused] = useState(false)
  const [phoneUnfocused, setPhoneUnfocused] = useState(false)
  const [emailUnfocused, setEmailUnfocused] = useState(false)

  return (
    <>
      <div className="text-xl flex flex-row items-center">
        <span>User Details</span>
      </div>
      <div className="flex flex-col gap-1">
        <div className={`flex ${props.width < 500 ? 'flex-col' : 'flex-row'} justify-between mb-4`}>
          <div className={`flex flex-col gap-1 ${props.width > 500 ? 'w-[45%]' : 'w-full mb-4' }`}>
              <Label 
                className="ms-2 font-medium text-lg"
              >
                <span>User First Name</span>
                <sup className="italic text-red-600">*</sup>
                <span>:</span>
              </Label>
              <TextInput 
                theme={textInputTheme} 
                sizing='lg' 
                placeholder="User First Name" 
                type="text"
                value={props.userProfile.firstName}
                onChange={(event) => {
                  props.parentUpdateUserProfile({
                    ...props.userProfile,
                    firstName: event.target.value
                  })
                  props.setErrors((prev) => {
                    if(prev.some((error) => (
                        error.id.step === FormStep.User && 
                        error.id.location === 'first'
                      ))) 
                    {
                      return prev.filter((error) => {
                        if(error.id.step === FormStep.User && error.id.location === 'first') {
                          return false
                        }
                        return true
                      })
                    }
                    return prev
                  })
                }}
                color={
                  props.errors.some((error) => (
                    error.id.step === FormStep.User && 
                    error.id.location === 'first'
                  )) ? 'failure' : undefined
                }
                onFocus={() => setFirstUnfocused(false)}
                onBlur={() => setFirstUnfocused(true)}
                helperText={(
                  props.errors.some((error) => (
                    error.id.step === FormStep.User && 
                    error.id.location === 'first'
                  )) && firstUnfocused &&(
                    <span color="text-red-600">
                      {props.errors.find((error) => (
                        error.id.step === FormStep.User && 
                        error.id.location === 'first'
                      ))?.message}
                    </span>
                  ) 
                )}
              />
          </div>
          <div className={`flex flex-col gap-1 ${props.width > 500 ? 'w-[45%]' : 'w-full' }`}>
              <Label 
                className="ms-2 font-medium text-lg"
              >
                <span>User Last Name</span>
                <sup className="italic text-red-600">*</sup>
                <span>:</span>
              </Label>
              <TextInput
                theme={textInputTheme} 
                sizing='lg' 
                placeholder="User Last Name" 
                type="text"
                value={props.userProfile.lastName}
                onChange={(event) => {
                  props.parentUpdateUserProfile({
                    ...props.userProfile,
                    lastName: event.target.value
                  })
                  props.setErrors((prev) => {
                    if(prev.some((error) => (
                        error.id.step === FormStep.User && 
                        error.id.location === 'last'
                      ))) 
                    {
                      return prev.filter((error) => {
                        if(error.id.step === FormStep.User && error.id.location === 'last') {
                          return false
                        }
                        return true
                      })
                    }
                    return prev
                  })
                }}
                color={
                  props.errors.some((error) => (
                    error.id.step === FormStep.User && 
                    error.id.location === 'last'
                  )) ? 'failure' : undefined
                }
                onFocus={() => setLastUnfocused(false)}
                onBlur={() => setLastUnfocused(true)}
                helperText={(
                  props.errors.some((error) => (
                    error.id.step === FormStep.User && 
                    error.id.location === 'last'
                  )) && lastUnfocused && (
                    <span color="text-red-600">
                      {props.errors.find((error) => (
                        error.id.step === FormStep.User && 
                        error.id.location === 'last'
                      ))?.message}
                    </span>
                  ) 
                )}
              />
          </div>
        </div>
        <Label 
          className="ms-2 font-medium text-lg"
        >
          <span>User Phone Number</span>
          <sup className="text-gray-400">1</sup>
          <span>:</span>
        </Label>
        <TextInput 
          theme={textInputTheme} 
          sizing='lg' 
          className="mb-4 max-w-[28rem] text-xl" 
          placeholder="10-Digit Phone Number" 
          type="tel"
          value={props.userProfile.phone ?? ''}
          onChange={(event) => {
            const numbers = event.target.value.replace(/\D/g, "");
            let num = ''
            // Format phone number: (XXX) XXX-XXXX
            if (numbers.length <= 3) {
                num = numbers
            } else if (numbers.length <= 6) {
                num = `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
            } else {
                num = `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
            }

            props.parentUpdateUserProfile({
              ...props.userProfile,
              phone: num
            })
            props.setErrors((prev) => {
              if(prev.some((error) => (
                  error.id.step === FormStep.User && 
                  error.id.location === 'phone'
                ))) 
              {
                return prev.filter((error) => {
                  if(error.id.step === FormStep.User && error.id.location === 'phone') {
                    return false
                  }
                  return true
                })
              }
              return prev
            })
          }}
          color={
            props.errors.some((error) => (
              error.id.step === FormStep.User && 
              error.id.location === 'phone'
            )) ? 'failure' : undefined
          }
          onFocus={() => setPhoneUnfocused(false)}
          onBlur={() => setPhoneUnfocused(true)}
          helperText={(
            props.errors.some((error) => (
              error.id.step === FormStep.User && 
              error.id.location === 'phone'
            )) && phoneUnfocused && (
              <span color="text-red-600">
                {props.errors.find((error) => (
                  error.id.step === FormStep.User && 
                  error.id.location === 'phone'
                ))?.message}
              </span>
            ) 
          )}
        />
        <Label 
          className="ms-2 font-medium text-lg"
        >
          <span>User Email</span>
          <sup className="italic text-red-600">*</sup>
          <span>:</span>
        </Label>
        <TextInput
          theme={textInputTheme} 
          sizing='lg' 
          className="mb-4 max-w-[28rem]" 
          placeholder="Email" 
          type="email" 
          value={props.userProfile.email}
          onChange={(event) => {
            props.parentUpdateUserProfile({
              ...props.userProfile,
              email: event.target.value
            })
            props.setErrors((prev) => {
              if(prev.some((error) => (
                  error.id.step === FormStep.User && 
                  error.id.location === 'email'
                ))) 
              {
                return prev.filter((error) => {
                  if(error.id.step === FormStep.User && error.id.location === 'email') {
                    return false
                  }
                  return true
                })
              }
              return prev
            })
          }}
          color={
            props.errors.some((error) => (
              error.id.step === FormStep.User && 
              error.id.location === 'email'
            )) ? 'failure' : undefined
          }
          onFocus={() => setEmailUnfocused(false)}
          onBlur={() => setEmailUnfocused(true)}
          helperText={(
            props.errors.some((error) => (
              error.id.step === FormStep.User && 
              error.id.location === 'phone'
            )) && emailUnfocused && (
              <span color="text-red-600">
                {props.errors.find((error) => (
                  error.id.step === FormStep.User && 
                  error.id.location === 'email'
                ))?.message}
              </span>
            ) 
          )}
        />
      </div>
    </>
  )
}