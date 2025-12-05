import { FC, useState } from "react"
import { Participant } from "../../types"
import { badgeColorThemeMap } from "../../utils"
import { Badge, Button, Checkbox, Label, TextInput } from "flowbite-react"
import { useMutation } from "@tanstack/react-query"
import { UserService, UpdateParticipantMutationParams } from "../../services/userService"

interface ParticipantFormParams {
  UserService: UserService,
  width: number,
  participant: Participant,
  submit: Function,
}

const component: FC<ParticipantFormParams> = ({width, participant, submit, UserService }) => {
  const [email, setEmail] = useState(participant.email)
  const [firstName, setFirstName] = useState(participant.firstName)
  const [lastName, setLastName] = useState(participant.lastName)
  const [middleName, setMiddleName] = useState(participant.middleName)
  const [preferredName, setPreferredName] = useState(participant.preferredName)
  const [contact, setContact] = useState(participant.contact)

  const [submitting, setSubmitting] = useState(false)

  const updateParticipant = useMutation({
    mutationFn: (params: UpdateParticipantMutationParams) => UserService.updateParticipantMutation(params)
  })

  async function updateProfile(){
    let updated = false
    let updatedParticipant = participant
    try {
      if(
        firstName !== participant.firstName ||
        lastName !== participant.lastName ||
        preferredName !== participant.preferredName ||
        middleName !== participant.middleName ||
        contact !== participant.contact ||
        email !== participant.email
      ) {

        //TODO: convert me to promises .finally(() => do something)
        await updateParticipant.mutateAsync({
          firstName: firstName,
          lastName: lastName,
          preferredName: preferredName,
          middleName: middleName,
          contact: contact,
          email: email,
          participant: participant,
          userTags: participant.userTags,
        })

        updatedParticipant = {
            ...participant,
            email: email,
            firstName: firstName,
            lastName: lastName,
            preferredName: preferredName,
            middleName: middleName,
            contact: contact
        }
        updated = true
      }
    } catch(err) {
      setSubmitting(false)
      submit((err as Error).message, participant)
      return
    }

    if(updated){
      setSubmitting(false)
      submit('Updated Successfully', updatedParticipant)
    }
    else{
      setSubmitting(false)
    }
  }

  const participantFirstName = participant.preferredName !== undefined && participant.preferredName !== '' ? participant.preferredName : participant.firstName

  return (
    <div className={`flex flex-col gap-2 text-center border-gray-500 border rounded-lg px-6 py-2 md:w-[60%] ${width < 768 ? 'mx-4' : ''}`}>
      <span className="text-xl ">{`${participantFirstName} ${participant.lastName}'s Details:`}</span>
      <div className="flex flex-row gap-2 items-center mb-4 justify-center w-full">
      {
        participant.userTags.map((tag, index) => {
          return (<Badge theme={badgeColorThemeMap} color={tag.color ? tag.color : 'light'} key={index} className="py-1 text-md">{tag.name}</Badge>)
        })
      }
      </div>
      <div className="grid lg:grid-cols-2 md:grid-cols-1 gap-6 mb-4">
        <div className={`flex ${width < 768 ? 'flex-col' : 'flex-row'} gap-1 items-center justify-between w-full`}>
          <Label className="font-semibold text-xl self-start me-4 mt-1">Email:</Label>
          <TextInput sizing='sm' className={`self-start w-[60%]`} placeholder="Email" type="email" defaultValue={participant.email} onChange={(event) => setEmail(event.target.value)}/>
        </div>
        <div className={`flex ${width < 768 ? 'flex-col' : 'flex-row'} gap-1 items-center justify-between w-full`}>
          <Label className="font-semibold text-xl self-start me-4">First Name:</Label>
          <TextInput sizing='sm' className={`w-[40%] ${width < 768 ? 'self-start w-full' : ''}`} placeholder="First Name" type="text" defaultValue={participant.firstName} onChange={(event) => setFirstName(event.target.value)}/>
        </div>
        <div className={`flex ${width < 768 ? 'flex-col' : 'flex-row'} gap-1 items-center justify-between w-full`}>
          <Label className="font-semibold text-xl self-start me-4">Last Name:</Label>
          <TextInput sizing='sm' className={`w-[40%] ${width < 768 ? 'self-start w-full' : ''}`} placeholder="Last Name" type="text" defaultValue={participant.lastName} onChange={(event) => setLastName(event.target.value)}/>
        </div>
        <div className={`flex ${width < 768 ? 'flex-col' : 'flex-row'} gap-1 items-center justify-between w-full`}>
          <Label className="font-semibold text-xl self-start me-4">Middle Name:</Label>
          <TextInput sizing='sm' className={`w-[40%] ${width < 768 ? 'self-start w-full' : ''}`} placeholder="Middle Name" type="text" defaultValue={participant.middleName} onChange={(event) => setMiddleName(event.target.value)}/>
        </div>
        <div className={`flex ${width < 768 ? 'flex-col' : 'flex-row'} gap-1 items-center justify-between w-full`}>
          <Label className="font-semibold text-xl self-start me-4">Preferred Name:</Label>
          <TextInput sizing='sm' className={`w-[40%] ${width < 768 ? 'self-start w-full' : ''}`} placeholder="Preferred Name" type="text" defaultValue={participant.preferredName} onChange={(event) => setPreferredName(event.target.value)}/>
        </div>
        <div>
          <button className="flex flex-row gap-2 items-center px-4 cursor-pointer" onClick={() => setContact(!contact)}>
            <Checkbox checked={contact} readOnly/>
            <Label className="ms-2 mb-1 text-xl" htmlFor="email">Contact Participant</Label>
          </button>
        </div>
      </div>
      <div className="flex flex-row-reverse gap-2">
        <Button isProcessing={submitting} className="w-[75px]" onClick={async () => {
          setSubmitting(true)
          await updateProfile()
        }}>Save</Button>
      </div>
    </div>
  )
}

export default component