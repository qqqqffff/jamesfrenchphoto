import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { RegistrationProfile, FormError, FormStep } from "./RegisterForm"
import { Participant } from "../../types"
import { v4 } from 'uuid'
import { badgeColorThemeMap, badgeColorThemeMap_hoverable, textInputTheme } from "../../utils"
import { 
  Badge, 
  // Button, 
  Checkbox, 
  Label, 
  TextInput, 
  Tooltip 
} from "flowbite-react"

interface ParticipantPanelProps {
  userProfile: RegistrationProfile,
  parentUpdateUserProfile: Dispatch<SetStateAction<RegistrationProfile>>
  width: number,
  errors: FormError[],
  setErrors: Dispatch<SetStateAction<FormError[]>>
  token: boolean
}

export const ParticipantPanel = (props: ParticipantPanelProps) => {
  const [activeParticipant, setActiveParticipant] = useState<Participant>(props.userProfile.participant[0] ?? ({
    id: v4(),
    firstName: '',
    lastName: '',
    userTags: [],
    userEmail: props.userProfile.email,
    notifications: [],
    collections: [],
    contact: false
  }))
  const [firstUnfocused, setFirstUnfocused] = useState(false)
  const [lastUnfocused, setLastUnfocused] = useState(false)
  const [emailUnfocused, setEmailUnfocused] = useState(false)
  const [sameDetails, setSameDetails] = useState(false)

  useEffect(() => {
    if(
      sameDetails && (
        activeParticipant.firstName !== props.userProfile.firstName ||
        activeParticipant.lastName !== props.userProfile.lastName ||
        activeParticipant.email !== props.userProfile.email
      )
    ) {
      setSameDetails(false)
    }

    if(!props.userProfile.participant.some((participant) => participant.id === activeParticipant.id)) {
      const tempProfile: RegistrationProfile = {
        ...props.userProfile,
        participant: [...props.userProfile.participant, activeParticipant]
      }
      props.parentUpdateUserProfile(tempProfile)
    }
  }, [activeParticipant])

  return (
    <>
      <div className="flex flex-col gap-1 w-full">
        <div className="flex flex-col w-full items-center">
          {/* <span className="flex flex-row gap-1 me-3 font-light italic text-lg">
            <span>Participant{props.userProfile.participant.length > 1 ? 's' : ''}</span>
            <span>{props.userProfile.participant.length}/5</span>
          </span> */}
          <div className={`${props.width > 800 ? 'flex flex-row' : 'grid grid-cols-2'} gap-2 mt-2`}>
            {props.userProfile.participant.map((participant, index) => {
              return (
                <button 
                  key={index} 
                  onClick={() => {
                    setActiveParticipant(participant)
                  }}
                >
                  <Badge 
                    theme={badgeColorThemeMap_hoverable} 
                    color={activeParticipant.id === participant.id ? 'red' : 'blue'} 
                    size="sm"
                  >
                    {`${participant.preferredName ? participant.preferredName : participant.firstName} ${participant.lastName}`}
                  </Badge>
                </button>
              )
            })}
          </div>
          <div className="flex flex-col gap-1 border rounded-lg w-full px-8 py-2 mt-4">
            <span className="text-lg font-medium underline underline-offset-2">Participant Details</span>
            <div className="flex flex-row items-center justify-center gap-4">
              {activeParticipant.userTags.map((tag, index) => {
                return (
                  <Badge 
                    key={index}
                    theme={badgeColorThemeMap} 
                    color={tag.color} 
                    size="xs"
                  >
                    {tag.name}
                  </Badge>
                )
              })}
            </div>
            <div className={`flex ${props.width < 500 ? 'flex-col' : 'flex-row'} justify-between mb-4`}>
              <div className={`flex flex-col gap-1 ${props.width > 500 ? 'w-[45%]' : 'w-full mb-4' }`}>
                <Label 
                  className="ms-2 font-normal text-lg flex flex-row"
                >
                  <span>First Name</span>
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
                  placeholder="Participant First Name" 
                  type="text"
                  onChange={(event) => {
                    props.parentUpdateUserProfile({
                      ...props.userProfile,
                      participant: props.userProfile.participant.map((participant) => {
                        if(participant.id === activeParticipant.id) {
                          return ({
                            ...participant,
                            firstName: event.target.value
                          })
                        }
                        return participant
                      })
                    })
                    setActiveParticipant({
                      ...activeParticipant,
                      firstName: event.target.value
                    })
                  }}
                  onFocus={() => setFirstUnfocused(false)}
                  onBlur={() => setFirstUnfocused(true)}
                  value={activeParticipant.firstName ?? ''}
                  color={
                    props.errors.some((error) => (
                      error.id.step === FormStep.Participant && 
                      error.id.location === 'first' &&
                      error.id.participantId === activeParticipant.id
                    )) && firstUnfocused ? 'failure' : undefined
                  }
                  helperText={(
                    props.errors.some((error) => (
                      error.id.step === FormStep.Participant && 
                      error.id.location === 'first' &&
                      error.id.participantId === activeParticipant.id
                    )) && firstUnfocused &&(
                      <span color="text-red-600" className="absolute -mt-2">
                        {props.errors.find((error) => (
                          error.id.step === FormStep.Participant && 
                          error.id.location === 'first' &&
                          error.id.participantId === activeParticipant.id
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
                  <span>Last Name</span>
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
                  placeholder="Participant Last Name" 
                  type="text"
                  onChange={(event) => {
                    props.parentUpdateUserProfile({
                      ...props.userProfile,
                      participant: props.userProfile.participant.map((participant) => {
                        if(participant.id === activeParticipant.id) {
                          return ({
                            ...participant,
                            lastName: event.target.value
                          })
                        }
                        return participant
                      })
                    })
                    setActiveParticipant({
                      ...activeParticipant,
                      lastName: event.target.value
                    })
                  }}
                  onFocus={() => setFirstUnfocused(false)}
                  onBlur={() => setLastUnfocused(true)}
                  value={activeParticipant.lastName ?? ''}
                  color={
                    props.errors.some((error) => (
                      error.id.step === FormStep.Participant && 
                      error.id.location === 'last' &&
                      error.id.participantId === activeParticipant.id
                    )) && lastUnfocused ? 'failure' : undefined
                  }
                  helperText={(
                    props.errors.some((error) => (
                      error.id.step === FormStep.Participant && 
                      error.id.location === 'last' &&
                      error.id.participantId === activeParticipant.id
                    )) && lastUnfocused &&(
                      <span color="text-red-600" className="absolute -mt-2">
                        {props.errors.find((error) => (
                          error.id.step === FormStep.Participant && 
                          error.id.location === 'last' &&
                          error.id.participantId === activeParticipant.id
                        ))?.message}
                      </span>
                    ) 
                  )}
                />
              </div>
            </div>
            <div className={`flex ${props.width < 500 ? 'flex-col' : 'flex-row'} justify-between mb-4`}>
              <div className={`flex flex-col gap-1 ${props.width > 500 ? 'w-[45%]' : 'w-full mb-4' }`}>
                <Label className="ms-2 font-normal text-lg">Middle Name:</Label>
                <TextInput 
                  theme={textInputTheme} 
                  sizing='lg' 
                  placeholder="Participant Middle Name" 
                  type="text"
                  onChange={(event) => {
                    props.parentUpdateUserProfile({
                      ...props.userProfile,
                      participant: props.userProfile.participant.map((participant) => {
                        if(participant.id === activeParticipant.id) {
                          return ({
                            ...participant,
                            middleName: event.target.value
                          })
                        }
                        return participant
                      })
                    })
                    setActiveParticipant({
                      ...activeParticipant,
                      middleName: event.target.value
                    })
                  }}
                  value={activeParticipant.middleName ?? ''}
                />
              </div>
              <div className={`flex flex-col gap-1 ${props.width > 500 ? 'w-[45%]' : 'w-full' }`}>
                <Label className="ms-2 font-normal text-lg">Preferred Name:</Label>
                <TextInput 
                  theme={textInputTheme} 
                  sizing='lg' 
                  placeholder="Participant Preferred Name" 
                  type="text"
                  onChange={(event) => {
                    props.parentUpdateUserProfile({
                      ...props.userProfile,
                      participant: props.userProfile.participant.map((participant) => {
                        if(participant.id === activeParticipant.id) {
                          return ({
                            ...participant,
                            preferredName: event.target.value
                          })
                        }
                        return participant
                      })
                    })
                    setActiveParticipant({
                      ...activeParticipant,
                      preferredName: event.target.value
                    })
                  }}
                  value={activeParticipant.preferredName ?? ''}
                />
              </div>
            </div>
            <Label className="ms-2 font-normal text-lg">Participant Email:</Label>
            <TextInput 
              theme={textInputTheme} 
              sizing='lg' 
              className="mb-4 max-w-[28rem]" 
              placeholder="Participant's Email" 
              type="email"
              onChange={(event) => {
                props.parentUpdateUserProfile({
                  ...props.userProfile,
                  participant: props.userProfile.participant.map((participant) => {
                    if(participant.id === activeParticipant.id) {
                      return ({
                        ...participant,
                        email: event.target.value
                      })
                    }
                    return participant
                  })
                })
                setActiveParticipant({
                  ...activeParticipant,
                  email: event.target.value
                })
              }}
              value={activeParticipant.email ?? ''}
              onFocus={() => setEmailUnfocused(false)}
              onBlur={() => setEmailUnfocused(true)}
              color={
                props.errors.some((error) => (
                  error.id.step === FormStep.Participant && 
                  error.id.location === 'email' &&
                  error.id.participantId === activeParticipant.id
                )) && emailUnfocused ? 'failure' : undefined
              }
              helperText={(
                props.errors.some((error) => (
                  error.id.step === FormStep.Participant && 
                  error.id.location === 'email' &&
                  error.id.participantId === activeParticipant.id
                )) && emailUnfocused &&(
                  <span color="text-red-600" className="absolute -mt-2">
                    {props.errors.find((error) => (
                      error.id.step === FormStep.Participant && 
                      error.id.location === 'email' &&
                      error.id.participantId === activeParticipant.id
                    ))?.message}
                  </span>
                ) 
              )}
            />
            <button 
              className="flex flex-row gap-2 text-left items-center mb-2" 
              onClick={(event) => {
                event.stopPropagation()
                props.parentUpdateUserProfile({
                  ...props.userProfile,
                  participant: props.userProfile.participant.map((participant) => {
                    if(participant.id === activeParticipant.id) {
                      return ({
                        ...participant,
                        contact: !participant.contact
                      })
                    }
                    return participant
                  })
                })
                setActiveParticipant({
                  ...activeParticipant,
                  contact: !activeParticipant.contact
                })
              }} 
            >
              <Checkbox 
                className="mt-1" 
                checked={activeParticipant.contact} 
                onClick={() => {
                  props.parentUpdateUserProfile({
                    ...props.userProfile,
                    participant: props.userProfile.participant.map((participant) => {
                      if(participant.id === activeParticipant.id) {
                        return ({
                          ...participant,
                          contact: !participant.contact
                        })
                      }
                      return participant
                    })
                  })
                  setActiveParticipant({
                    ...activeParticipant,
                    contact: !activeParticipant.contact
                  })
                }}
                readOnly 
              />
              <span>Have notifications sent to participant's email</span>
            </button>
            {/* <button 
              className="flex flex-row gap-2 text-left items-center disabled:text-gray-400 disabled:cursor-not-allowed mb-2" 
              onClick={(event) => {
                event.stopPropagation()
                let participant: Participant = activeParticipant
                if(!sameDetails){
                  participant.firstName = props.userProfile.firstName ?? ''
                  participant.lastName = props.userProfile.lastName ?? ''
                  participant.email = props.userProfile.email
                  participant.middleName = ''
                  participant.preferredName = ''
                }
                setSameDetails(!sameDetails)
                setActiveParticipant(participant)
                props.parentUpdateUserProfile({
                  ...props.userProfile,
                  participant: props.userProfile.participant.map((pParticipant) => (
                    pParticipant.id === participant.id ? 
                    participant : pParticipant
                  ))
                })
              }}
            >
              <Checkbox 
                className="mt-1" 
                checked={sameDetails} 
                readOnly 
                onClick={() => {
                  let participant: Participant = activeParticipant
                  if(!sameDetails){
                    participant.firstName = props.userProfile.firstName ?? ''
                    participant.lastName = props.userProfile.lastName ?? ''
                    participant.email = props.userProfile.email
                    participant.middleName = ''
                    participant.preferredName = ''
                  }
                  setSameDetails(!sameDetails)
                  setActiveParticipant(participant)
                  props.parentUpdateUserProfile({
                    ...props.userProfile,
                    participant: props.userProfile.participant.map((pParticipant) => (
                      pParticipant.id === participant.id ? 
                      participant : pParticipant
                    ))
                  })
                }}
              />
              <span>Same Details as User Details</span>
            </button>
            <div className={`w-full flex ${props.width < 830 ? 'flex-col' : 'flex-row'} justify-end gap-4`}>
              {props.userProfile.participant.length > 1 && (
                activeParticipant.userTags.length > 0 ? (
                  <Tooltip
                    content={(<span className="whitespace-nowrap italic">Cannot Delete Participant with User Tags</span>)}
                    style="light"
                  >
                    <Button 
                      size="xs"
                      color="light" 
                      disabled={activeParticipant.userTags.length > 0}
                    >Delete Participant</Button>
                  </Tooltip>
                ) : (
                  <Button 
                    size="xs"
                    color="light" 
                    disabled={activeParticipant.userTags.length > 0}
                    onClick={() => {
                      let index = props.userProfile.participant.findIndex((participant) => participant.id === activeParticipant.id)
                      const filtered = props.userProfile.participant.filter((participant) => participant.id !== activeParticipant.id)
                      if(index >= filtered.length) {
                        index--;
                      }
                      props.parentUpdateUserProfile({
                        ...props.userProfile,
                        participant: filtered
                      })
                      setActiveParticipant(filtered[index])
                    }}
                  >Delete Participant</Button>
                )
                
              )}
              {props.userProfile.participant.length < 5 && (
                <Button 
                  size="xs"
                  onClick={() => {
                    const newParticipant: Participant = {
                      id: v4(),
                      firstName: '',
                      lastName: '',
                      userTags: [],
                      userEmail: props.userProfile.email,
                      notifications: [],
                      collections: [],
                      contact: false
                    }
                    props.parentUpdateUserProfile({
                      ...props.userProfile,
                      participant: [...props.userProfile.participant, newParticipant]
                    })
                    setActiveParticipant(newParticipant)
                  }}
                >Add Participant</Button>
              )}
            </div> */}
          </div>
        </div>
      </div>
      {props.token && (
        <p className="italic text-xs">
          <span>Note: If you are not seeing your participant's tag please reach out.</span>
        </p>
      )}
    </>
  )
}