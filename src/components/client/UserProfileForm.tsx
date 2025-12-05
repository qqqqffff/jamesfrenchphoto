import { FC, useState } from "react"
import { UserProfile, UserStorage } from "../../types"
import { useMutation } from "@tanstack/react-query"
import { UserService, UpdateUserAttributesMutationParams } from "../../services/userService"
import { Button, Checkbox, Label, TextInput } from "flowbite-react"

interface UserFormProfileParams {
  UserService: UserService,
  width: number,
  user: UserStorage,
  userProfile: UserProfile,
  submit: (noti: string, user?: UserStorage, profile?: UserProfile) => void
}

const component: FC<UserFormProfileParams> = ({ width, user, userProfile, submit, UserService }) => {
  const [userFirstName, setUserFirstName] = useState(user.attributes.given_name)
  const [userLastName, setUserLastName] = useState(user.attributes.family_name)
  const [userPhoneNumber, setUserPhoneNumber] = useState(() => {
    if(!user.attributes.phone_number) return
    const numbers = user.attributes.phone_number?.substring(2).replace(/\D/g, "");
    let num = ''
    // Format phone number: (XXX) XXX-XXXX
    if (numbers.length <= 3) {
        num = numbers
    } else if (numbers.length <= 6) {
        num = `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
    } else {
        num = `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
    }
    return num
  })
  // const [parentEmail, setParentEmail] = useState(userProfile.email)
  const [preferredContact, setPreferredContact] = useState(userProfile.preferredContact)

  const [submitting, setSubmitting] = useState(false)
  const updateUserAttributes = useMutation({
    mutationFn: (params : UpdateUserAttributesMutationParams) => UserService.updateUserAttributeMutation(params)
  })

  async function updateProfile(){
    let updated = false
    let updatedUser = {...user}
    let updatedProfile = {...userProfile}

    try{
      updated = await updateUserAttributes.mutateAsync({
        email: userProfile.email,
        firstName: userFirstName !== undefined ? userFirstName : undefined,
        lastName: userLastName !== undefined ? userLastName : undefined,
        phoneNumber: userPhoneNumber !== user.attributes.phone_number && userPhoneNumber !== undefined && user.session.tokens ? userPhoneNumber : undefined,
        accessToken: user.session.tokens?.accessToken.toString(),
        preferredContact: preferredContact !== userProfile.preferredContact ? preferredContact : undefined,
      })
    } catch(err){
      setSubmitting(false)
      submit((err as Error).message)
      return
    }
    
    if(updated){
      updatedUser.attributes.given_name = userFirstName !== user.attributes.given_name ? userFirstName : user.attributes.given_name
      updatedUser.attributes.family_name = userLastName !== user.attributes.family_name ? userLastName : user.attributes.family_name,
      updatedUser.attributes.phone_number = userPhoneNumber !== user.attributes.phone_number && userPhoneNumber ? `+1${userPhoneNumber}` : user.attributes.phone_number
      updatedProfile.preferredContact = preferredContact !== userProfile.preferredContact ? preferredContact : userProfile.preferredContact
      setSubmitting(false)
      submit('Updated Successfully', updatedUser, updatedProfile)
    }
    else{
      setSubmitting(false)
    }
  }

  return (
    <div className={`flex flex-col gap-2 text-center border-gray-500 border rounded-lg px-6 py-2 md:w-[60%] ${width < 768 ? 'mx-4' : ''}`}>
      <span className="text-xl ">Your Profile:</span>
      <div className="grid lg:grid-cols-2 md:grid-cols-1 gap-6 mb-6">
        <div className={`flex ${width < 768 ? 'flex-col' : 'flex-row'} gap-1 items-center justify-between w-full`}>
          <Label className="font-semibold text-xl self-start me-4 mt-1">User Email:</Label>
          <TextInput sizing='sm' className={`w-[60%] ${width < 768 ? 'self-start w-full' : ''}`} placeholder="Email" type="email" defaultValue={userProfile.email} disabled/>
        </div>
        <div className={`flex ${width < 768 ? 'flex-col' : 'flex-row'} gap-1 items-center justify-between w-full`}>
          <Label className="font-semibold text-xl self-start me-4 mt-1">User Phone:</Label>
          <TextInput sizing='sm' className={`w-[60%] ${width < 768 ? 'self-start w-full' : ''}`} placeholder="Email" type="tel"
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

                  setUserPhoneNumber(num)
                  // setInnerFormErrors(innerFormErrors.filter((error) => error.id !== userPhoneNumberRef.current?.id))
              }}
              value={userPhoneNumber}
          />
        </div>
          
        <div className={`flex ${width < 768 ? 'flex-col' : 'flex-row'} gap-1 items-center justify-between w-full`}>
          <Label className="font-semibold text-xl self-start me-4 mt-1">User First Name:</Label>
          <TextInput sizing='sm' className={`w-[40%] ${width < 768 ? 'self-start w-full' : ''}`} placeholder="Last Name" type='text' defaultValue={user.attributes.given_name} onChange={(event) => setUserFirstName(event.target.value)}/>
        </div>
        <div className={`flex ${width < 768 ? 'flex-col' : 'flex-row'} gap-1 items-center justify-between w-full`}>
          <Label className="font-semibold text-xl self-start me-4 mt-1">User Last Name:</Label>
          <TextInput sizing='sm' className={`w-[40%] ${width < 768 ? 'self-start w-full' : ''}`} placeholder="First Name" type="text" defaultValue={user.attributes.family_name} onChange={(event) => setUserLastName(event.target.value)}/>
        </div>
          
        <div>
          <button className="flex flex-row gap-2 items-center px-4 cursor-pointer" onClick={() => setPreferredContact(preferredContact == "EMAIL" ? "PHONE" : "EMAIL")}>
            <Checkbox checked={preferredContact == 'PHONE'} readOnly/>
            <Label className="ms-2 mb-1 text-xl" htmlFor="email">Prefer Phone Contact</Label>
          </button>
        </div>
      </div>
      <Button isProcessing={submitting} className="w-[75px] self-end" onClick={async () => {
          setSubmitting(true)
          await updateProfile()
      }}>Save</Button>
    </div>
  )
}

export default component