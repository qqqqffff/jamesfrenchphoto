import { FC, useState } from "react";
import { Participant, UserProfile, UserStorage } from "../../types";
import { useRevalidator, useRouteLoaderData } from "react-router-dom";
import { Alert, Badge, Button, Checkbox, Dropdown, FlowbiteColors, Label, TextInput } from "flowbite-react";
import { badgeColorThemeMap, DynamicStringEnumKeysOf } from "../../utils";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import useWindowDimensions from "../../hooks/windowDimensions";
import { fetchAuthSession, updateUserAttributes } from "aws-amplify/auth";
import { ParticipantCreator, PrefilledParticipantFormElements } from "./Participant";


const client = generateClient<Schema>()

//TODO: custom handling for notifications

interface ProfileNotification {
    message: string,
    color: DynamicStringEnumKeysOf<FlowbiteColors>,
}

export const ClientProfile: FC = () => {
    const [user, setUser] = useState(useRouteLoaderData('/') as UserProfile | null)
    const [userStorage, setUserStorage] = useState(window.localStorage.getItem('user') !== null ? JSON.parse(window.localStorage.getItem('user')!) as UserStorage : undefined)
    const revalidator = useRevalidator()

    const [activeParticipant, setActiveParticipant] = useState<Participant>()
    const [participantPrefilledElements, setParticipantPrefilledElements] = useState<PrefilledParticipantFormElements>()

    const [createParticipantFormVisible, setCreateParticipantFormVisible] = useState(false)
    

    const { width } = useWindowDimensions()

    const [notification, setNotification] = useState<ProfileNotification[]>([])

    const dropdownText = activeParticipant ? `Participant: ${activeParticipant.preferredName ?? activeParticipant.firstName}, ${activeParticipant.lastName}` : 
        createParticipantFormVisible ?  'Add Participant' : 
        userStorage ? `Parent: ${userStorage.attributes.given_name}, ${userStorage.attributes.family_name}` : 'N/A'

    function ContentRenderer(){
        if(user) {
            if(createParticipantFormVisible){
                return (
                    <div className={`flex flex-col gap-2 text-center border-gray-500 border rounded-lg px-6 py-2 md:w-[60%] ${width < 768 ? 'mx-4' : ''}`}>
                        <ParticipantCreator width={width} userEmail={user.email} taggingCode={{visible: true, editable: true}} displayRequired
                            prefilledElements={participantPrefilledElements}
                            submit={(noti: string, participant?: Participant, errorReturn?: PrefilledParticipantFormElements) => {
                                if(participant){
                                    const tempUserProfile = {
                                        ...user,
                                    }
                                    tempUserProfile.participant = [...tempUserProfile.participant, participant]

                                    setUser(tempUserProfile)
                                    setNotification([{message: noti, color: 'green'}])
                                    setActiveParticipant(participant)
                                    setCreateParticipantFormVisible(false)
                                    revalidator.revalidate()
                                } else if(errorReturn){
                                    setNotification([{message: noti, color: 'red'}])
                                    setParticipantPrefilledElements(errorReturn)
                                }
                            }}
                        />
                    </div>
                )
            } else if(activeParticipant){
                return (
                    <ParticipantProfileForm width={width} participant={activeParticipant} 
                        submit={(noti: string, participant: Participant) => {
                            const tempUserProfile = {
                                ...user,
                            }
                            tempUserProfile.participant = tempUserProfile.participant.map((part) => {
                                if(part.id == participant.id){
                                    return participant
                                }
                                return part
                            })

                            setUser(tempUserProfile)
                            setNotification([{message: noti, color: 'green'}])
                            setActiveParticipant(participant)
                            revalidator.revalidate()
                        }} 
                    />
                )
            } else if(userStorage) {
                return (
                    <UserProfileForm width={width} user={userStorage} submit={(noti: string, user: UserStorage, profile: UserProfile) => {
                        setNotification([{message: noti, color: 'green'}])
                        setUser(profile)
                        setUserStorage(user)
                        window.localStorage.setItem('user', JSON.stringify(user))
                        revalidator.revalidate()
                    }} userProfile={user}/>
                )
            }
        }
        return (
            <span>Failed to recieve user data</span>
        )
    }

    return (
        <>
            <div className="flex justify-center items-center font-main mb-4 mt-2">
                {notification.length > 0 ? notification.map((noti, index) => {
                    return (
                        <Alert color={noti.color} className="text-lg w-[90%]" key={index} onDismiss={() => setNotification(notification.filter((not) => not !== noti))}>{noti.message}</Alert>
                    )
                }) : (<></>)}
            </div>
            <div className="flex flex-col my-4 w-full gap-4 justify-center items-center font-main">
                <div className="flex flex-row gap-4 items-center">
                    <Dropdown color="light" className="" label={dropdownText}>
                        <Dropdown.Item onClick={() => {
                            setActiveParticipant(undefined)
                            setCreateParticipantFormVisible(false)
                        }}>
                            {`Parent: ${userStorage?.attributes.given_name}, ${userStorage?.attributes.family_name}`}
                        </Dropdown.Item>
                        {user?.participant.map((participant, index) => {
                            return (
                                <Dropdown.Item  key={index} onClick={() => {
                                    setActiveParticipant(participant)
                                    setCreateParticipantFormVisible(false)
                                }}>{`Participant: ${participant.preferredName ?? participant.firstName}, ${participant.lastName}`}</Dropdown.Item>
                            )
                        })}
                        <Dropdown.Item className="border-t" 
                            disabled={user !== null && user.participant.length >= 5}
                            onClick={() => {
                                setActiveParticipant(undefined)
                                setCreateParticipantFormVisible(true)
                            }}
                        >{user !== null && user.participant.length >= 5 ? 'Maximum Participants Created' : 'Add Participant'}</Dropdown.Item>
                    </Dropdown>
                </div>
                <ContentRenderer />
            </div>
        </>
        
        
        
    )
}

interface ParticipantFormParams {
    width: number,
    participant: Participant,
    submit: Function,
}

const ParticipantProfileForm: FC<ParticipantFormParams> = ({width, participant, submit}) => {
    const [email, setEmail] = useState(participant.email)
    const [firstName, setFirstName] = useState(participant.firstName)
    const [lastName, setLastName] = useState(participant.lastName)
    const [middleName, setMiddleName] = useState(participant.middleName)
    const [preferredName, setPreferredName] = useState(participant.preferredName)
    const [contact, setContact] = useState(participant.contact)

    const [submitting, setSubmitting] = useState(false)

    async function updateProfile(){
        let updated = false
        let updatedParticipant = participant
        try {
            if(firstName !== participant.firstName ||
                lastName !== participant.lastName ||
                preferredName !== participant.preferredName ||
                middleName !== participant.middleName ||
                contact !== participant.contact ||
                email !== participant.email) {

                const response = await client.models.Participant.update({
                    id: participant.id,
                    email: email,
                    firstName: firstName,
                    lastName: lastName,
                    preferredName: preferredName,
                    middleName: middleName,
                    contact: contact
                })

                console.log(response)

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

    return (
        <div className={`flex flex-col gap-2 text-center border-gray-500 border rounded-lg px-6 py-2 md:w-[60%] ${width < 768 ? 'mx-4' : ''}`}>
            <span className="text-xl ">{`${participant.preferredName ?? participant.firstName} ${participant.lastName}'s Details:`}</span>
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

interface ParentFormParams {
    width: number,
    user: UserStorage,
    userProfile: UserProfile,
    submit: Function
}

const UserProfileForm: FC<ParentFormParams> = ({ width, user, userProfile, submit }) => {
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

    async function updateProfile(){
        let updated = false
        let updatedUser = {...user}
        let updatedProfile = {...userProfile}

        try{
            if(userFirstName !== user.attributes.given_name || userLastName !== user.attributes.family_name){
                const response = await updateUserAttributes({
                    userAttributes: {
                        email: userProfile.email,
                        family_name: userLastName,
                        given_name: userFirstName,
                    }
                })
                console.log(response)
                updated = true
                updatedUser.attributes.family_name = userLastName
                updatedUser.attributes.given_name = userFirstName
            }
            if(userPhoneNumber !== user.attributes.phone_number && userPhoneNumber && user.session.tokens){
                const response = await client.queries.UpdateUserPhoneNumber({
                    phoneNumber: `+1${userPhoneNumber}`,
                    accessToken: (await fetchAuthSession()).tokens!.accessToken.toString()
                })
                console.log(response)
                updated = true
                updatedUser.attributes.phone_number = `+1${userPhoneNumber}`
            }
            if(preferredContact !== userProfile.preferredContact){
                const response = await client.models.UserProfile.update({
                    email: userProfile.email,
                    preferredContact: preferredContact,
                })
                console.log(response)
                updated = true
                updatedProfile.preferredContact = preferredContact
            }
        } catch(err){
            setSubmitting(false)
            submit((err as Error).message, )
            return
        }
        
        if(updated){
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