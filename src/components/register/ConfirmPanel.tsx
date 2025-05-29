import { Label, TextInput, Checkbox, Tooltip } from "flowbite-react"
import { TermsAndConditionsModal } from "../modals"
import { Dispatch, SetStateAction, useState } from "react"
import { textInputTheme } from "../../utils"
import { RegistrationProfile } from "./RegisterForm"
import { ParticipantPanel } from "../common/ParticipantPanel"
import { HiOutlineEye, HiOutlineEyeSlash } from "react-icons/hi2"

interface ConfirmPanelProps {
  userProfile: RegistrationProfile
  parentUpdateUserProfile: Dispatch<SetStateAction<RegistrationProfile>>
  width: number
}
export const ConfirmPanel = (props: ConfirmPanelProps) => {
  const [termsAndConditionsVisible, setTermsAndConditionsVisible] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)

  return (
    <>
      <TermsAndConditionsModal open={termsAndConditionsVisible} onClose={() => setTermsAndConditionsVisible(false)} />
      <div className="flex flex-col gap-1">
        {props.width <= 1400 && (
          <div className="border-2 rounded-lg px-8 py-2 top-0 flex flex-col my-4 max-w-min">
            <span className="font-medium whitespace-nowrap text-lg">Registration Information</span>
            <span className="text-blue-400">User Info</span>
            <div className="flex flex-col px-2 text-xs">
              <div className="flex flex-row gap-2 items-center text-nowrap">
                <span>First Name:</span>
                <span className="italic">{props.userProfile.firstName}</span>
              </div>
              <div className="flex flex-row gap-2 items-center text-nowrap">
                <span>Last Name:</span>
                <span className="italic">{props.userProfile.lastName}</span>
              </div>
              {props.userProfile.phone && (
                <div className="flex flex-row gap-2 items-center text-nowrap">
                  <span>First Name:</span>
                  <span className="italic">{props.userProfile.phone}</span>
                </div>
              )}
              <div className="flex flex-row gap-2 items-center text-nowrap">
                <span>Email:</span>
                <span className="italic">{props.userProfile.email}</span>
              </div>
              <div className="flex flex-row gap-2 items-center text-nowrap">
                <span>Contact:</span>
                <span className="italic">{
                  props.userProfile.preferredContact.substring(0,1).toUpperCase() + 
                  props.userProfile.preferredContact.substring(1).toLowerCase()
                }</span>
              </div>
            </div>
            <div className="border mt-2"/>
            {props.userProfile.participant.map((participant) => {
              return (
                <ParticipantPanel 
                  participant={participant}
                  hiddenOptions={{ tags: participant.userTags.length <= 0  }}
                />
              )
            })}
          </div>
        )}
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
        <div
          className="w-full relative h-auto items-center"
        >
          <TextInput 
            theme={textInputTheme} 
            sizing='lg' 
            className="" 
            placeholder="Password"
            type={passwordVisible ? 'text' : 'password'}
            onChange={(event) => {
              props.parentUpdateUserProfile({
                ...props.userProfile,
                password: event.target.value
              })
            }}
            helperText={(
              <span className="-mt-2 mb-4 ms-2 text-sm">
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
              </span>
            )}
          />
          <button 
            onClick={() => setPasswordVisible(!passwordVisible)}
            className='absolute top-0 right-3 mt-2'
          >
            {passwordVisible ? (
              <HiOutlineEyeSlash size={24} className='fill-white'/>
            ) : (
              <HiOutlineEye size={24} className='fill-white'/>
            )}
          </button>
        </div>
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
      {props.width > 1400 && (
        <div className="absolute left-[100%] ms-8 border-2 rounded-lg px-4 py-2 top-0 flex flex-col">
          <span className="font-medium whitespace-nowrap text-lg">Registration Information</span>
          <span className="text-blue-400">User Info</span>
          <div className="flex flex-col px-2 text-xs">
            <div className="flex flex-row gap-2 items-center text-nowrap">
              <span>First Name:</span>
              <span className="italic">{props.userProfile.firstName}</span>
            </div>
            <div className="flex flex-row gap-2 items-center text-nowrap">
              <span>Last Name:</span>
              <span className="italic">{props.userProfile.lastName}</span>
            </div>
            {props.userProfile.phone && (
              <div className="flex flex-row gap-2 items-center text-nowrap">
                <span>First Name:</span>
                <span className="italic">{props.userProfile.phone}</span>
              </div>
            )}
            <div className="flex flex-row gap-2 items-center text-nowrap">
              <span>Email:</span>
              <span className="italic">{props.userProfile.email}</span>
            </div>
            <div className="flex flex-row gap-2 items-center text-nowrap">
              <span>Contact:</span>
              <span className="italic">{
                props.userProfile.preferredContact.substring(0,1).toUpperCase() + 
                props.userProfile.preferredContact.substring(1).toLowerCase()
              }</span>
            </div>
          </div>
          <div className="border mt-2"/>
          {props.userProfile.participant.map((participant) => {
            return (
              <ParticipantPanel 
                participant={participant}
                hiddenOptions={{ tags: participant.userTags.length <= 0 }}
              />
            )
          })}
        </div>
      )}
    </>
  )
}