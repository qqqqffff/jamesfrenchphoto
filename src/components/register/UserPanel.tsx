import { Dispatch, SetStateAction, useState } from "react";
import { FormError, FormStep, RegistrationProfile } from "./RegisterForm";
import { Checkbox, Label, TextInput, Tooltip } from "flowbite-react";
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
      <div className="flex flex-col gap-1">
        <div className={`flex ${props.width < 500 ? 'flex-col' : 'flex-row'} justify-between mb-4`}>
          <div className={`flex flex-col gap-1 ${props.width > 500 ? 'w-[45%]' : 'w-full mb-4' }`}>
              <Label 
                className="ms-2 font-normal text-lg flex flex-row"
              >
                <span>User First Name</span>
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
                  )) && firstUnfocused ? 'failure' : undefined
                }
                onFocus={() => setFirstUnfocused(false)}
                onBlur={() => setFirstUnfocused(true)}
                helperText={(
                  props.errors.some((error) => (
                    error.id.step === FormStep.User && 
                    error.id.location === 'first'
                  )) && firstUnfocused &&(
                    <span color="text-red-600" className="absolute -mt-2">
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
                className="ms-2 font-normal text-lg flex flex-row"
              >
                <span>User Last Name</span>
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
                  )) && lastUnfocused ? 'failure' : undefined
                }
                onFocus={() => setLastUnfocused(false)}
                onBlur={() => setLastUnfocused(true)}
                helperText={(
                  props.errors.some((error) => (
                    error.id.step === FormStep.User && 
                    error.id.location === 'last'
                  )) && lastUnfocused && (
                    <span color="text-red-600" className="absolute -mt-2">
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
          className="ms-2 font-normal text-lg flex flex-row items-center"
        >
          <span>User Phone Number</span>
          <sup className="text-gray-400 pe-1">1</sup>
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
            )) && phoneUnfocused ? 'failure' : undefined
          }
          onFocus={() => setPhoneUnfocused(false)}
          onBlur={() => setPhoneUnfocused(true)}
          helperText={(
            props.errors.some((error) => (
              error.id.step === FormStep.User && 
              error.id.location === 'phone'
            )) && phoneUnfocused && (
              <span color="text-red-600" className="absolute -mt-6">
                {props.errors.find((error) => (
                  error.id.step === FormStep.User && 
                  error.id.location === 'phone'
                ))?.message}
              </span>
            ) 
          )}
        />
        <Label 
          className="ms-2 font-normal text-lg flex flex-row items-center"
        >
          <span>User Email</span>
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
            )) && emailUnfocused ? 'failure' : undefined
          }
          onFocus={() => setEmailUnfocused(false)}
          onBlur={() => setEmailUnfocused(true)}
          helperText={(
            props.errors.some((error) => (
              error.id.step === FormStep.User && 
              error.id.location === 'email'
            )) && emailUnfocused && (
              <span color="text-red-600" className="absolute -mt-6">
                {props.errors.find((error) => (
                  error.id.step === FormStep.User && 
                  error.id.location === 'email'
                ))?.message}
              </span>
            ) 
          )}
        />
      </div>
      <button 
        className="flex flex-row gap-2 text-left items-center mb-4 -mt-2" 
        onClick={(event) => {
          event.stopPropagation()
          props.parentUpdateUserProfile({
            ...props.userProfile,
            preferredContact: props.userProfile.preferredContact === 'EMAIL' ? 'PHONE' : 'EMAIL'
          })
        }}
      >
        <Checkbox 
          className="mt-1" 
          checked={props.userProfile.preferredContact === 'PHONE'} 
          readOnly 
          onClick={() => {
            props.parentUpdateUserProfile({
              ...props.userProfile,
              preferredContact: props.userProfile.preferredContact === 'EMAIL' ? 'PHONE' : 'EMAIL'
            })
          }}
        />
        <span>Prefer to be contacted by phone</span>
      </button>
      <p className="italic text-xs">
        <p>Note</p>
        <sup className="text-gray-400">1</sup> 
        <p>: US Phone numbers only, without country code. No special formatting needed.</p>
      </p>
    </>
  )
}