import { FC, useEffect, useRef, useState } from "react";
import { Participant, UserProfile, UserStorage, UserTag } from "../../types";
import { useLoaderData } from "react-router-dom";
import { Alert, Badge, Button, Checkbox, Dropdown, Label, TextInput } from "flowbite-react";
import { badgeColorThemeMap } from "../../utils";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import useWindowDimensions from "../../hooks/windowDimensions";
import { fetchAuthSession, updateUserAttributes } from "aws-amplify/auth";
import { IoMdRefresh } from "react-icons/io";


const client = generateClient<Schema>()

//TODO: custom handling for notifications

export const ClientProfile: FC = () => {
    const [user, setUser] = useState(useLoaderData() as UserProfile | null)
    const apiCall = useRef(false)

    const [userStorage, setUserStorage] = useState(window.localStorage.getItem('user') !== null ? JSON.parse(window.localStorage.getItem('user')!) as UserStorage : undefined)

    const [participants, setParticipants] = useState<Participant[]>([])

    const [activeParticipant, setActiveParticipant] = useState<Participant>()

    const [createParticipantFormVisible, setCreateParticipantFormVisible] = useState(false)

    const { width } = useWindowDimensions()

    const [userSelectorSubmitting, setUserSelectorSubmitting] = useState(false)
    const [notification, setNotification] = useState<string[]>([])
    const [userSelectorEnabled, setUserSelectorEnabled] = useState(false)
    
    useEffect(() => {
        async function api(){
            console.log('api call')
            let participants: Participant[] = []
            let notification: string[] = []
            let userSelectorEnabled = false
            if(user) {
                //fetch participants
                const participantResponse = await client.models.Participant.listParticipantByUserEmail({ userEmail: user.email })
                console.log(participantResponse)

                if(participantResponse.data && participantResponse.data.length > 0){
                    participants = await Promise.all(participantResponse.data.map((participant) => {
                        const person: Participant = {
                            ...participant,
                            userTags: participant.userTags ? participant.userTags as string[] : [],
                            middleName: participant.middleName ?? undefined,
                            preferredName: participant.preferredName ?? undefined,
                            email: participant.email ?? undefined,
                            contact: participant.contact ?? false,
                        }
                        return person
                    }))
                }
                else if(participantResponse.data && participantResponse.data.length == 0 && (
                    user.participantFirstName && user.participantLastName
                )){
                    notification = ['Participant data found, click refresh button next to user selector to create']
                    userSelectorEnabled = true
                }
            }
            setParticipants(participants)
            setNotification(notification)
            setUserSelectorEnabled(userSelectorEnabled)
            apiCall.current = true
        }
        if(!apiCall.current){
            api()
        }
    })

    const dropdownText = activeParticipant ? `Participant: ${activeParticipant.firstName}, ${activeParticipant.lastName}` : 
        createParticipantFormVisible ?  'Add Participant' : 
        userStorage ? `Parent: ${userStorage.attributes.given_name}, ${userStorage.attributes.family_name}` : 'N/A'

    return (
        <>
            <div className="flex justify-center items-center font-main mb-4 mt-2">
                {notification.length > 0 ? notification.map((noti, index) => {
                    return (
                        <Alert color="light" className="text-lg w-[90%]" key={index} onDismiss={() => setNotification(notification.filter((not) => not !== noti))}>{noti}</Alert>
                    )
                }) : (<></>)}
            </div>
            <div className="flex flex-col my-4 w-full gap-4 justify-center items-center font-main">
                <div className="flex flex-row gap-4 items-center">
                    <Dropdown color="light" className="" label={dropdownText}>
                        <Dropdown.Item onClick={() => setActiveParticipant(undefined)}>{`Parent: ${userStorage?.attributes.given_name}, ${userStorage?.attributes.family_name}`}</Dropdown.Item>
                        {participants.map((participant, index) => {
                            return (
                                <Dropdown.Item  key={index} onClick={() => setActiveParticipant(participant)}>{`Participant: ${participant.firstName}, ${participant.lastName}`}</Dropdown.Item>
                            )
                        })}
                        <Dropdown.Item className="border-t" onClick={() => setCreateParticipantFormVisible(true)}>Add Participant</Dropdown.Item>
                    </Dropdown>
                    {userSelectorEnabled && user !== null && user.participantFirstName !== undefined && user.participantLastName != undefined ? (
                        <Button pill color="light" isProcessing={userSelectorSubmitting} onClick={async () => {
                            setUserSelectorSubmitting(true)
                            const response = await client.models.Participant.create({
                                userEmail: user.email,
                                userTags: user.userTags,
                                firstName: user.participantFirstName!,
                                lastName: user.participantLastName!,
                                middleName: user.participantMiddleName,
                                preferredName: user.participantPreferredName,
                                contact: user.participantContact,
                                email: user.participantEmail,
                            })
                            console.log(response)
                            if(response && response.data && response.data.id){
                                const participant: Participant = {
                                    ...response.data,
                                    userTags: response.data.userTags ? response.data.userTags as string[] : [],
                                    middleName: response.data.middleName ?? undefined,
                                    preferredName: response.data.preferredName ?? undefined,
                                    email: response.data.email ?? undefined,
                                    contact: response.data.contact ?? false,
                                }
                                setParticipants([...participants, participant])
                                setNotification(['Successfully created participant'])
                                setUserSelectorEnabled(false)
                                setUserSelectorSubmitting(false)
                            }
                            else{
                                setNotification(['Failed to create participant'])
                                setUserSelectorSubmitting(false)
                            }
                        }}>
                            <IoMdRefresh />
                        </Button>) : (<></>)}
                </div>
                
            {
                user && !activeParticipant ? (!createParticipantFormVisible ? (
                    userStorage ? (<ParentProfileForm width={width} user={userStorage} submit={(noti: string, user: UserStorage, profile: UserProfile) => {
                        setNotification([noti])
                        setUser(profile)
                        setUserStorage(user)
                        window.localStorage.setItem('user', JSON.stringify(user))
                    }} userProfile={user}/>) : (<>Failed to read user</>)
                ) : (
                    <></>
                )) : activeParticipant ? (
                    <ParticipantProfileForm width={width} participant={activeParticipant} submit={(noti: string, participant: Participant) => {
                        setNotification([noti])
                        setActiveParticipant(participant)
                        setParticipants(participants.map((part) => {
                            if(part.id == participant.id) return participant
                            return part
                        }))
                    }} />
                ) :  (
                    <span>Failed to recieve user data</span>
                )
            }
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
    const [userTags, setUserTags] = useState<UserTag[]>([])
    const apiCall = useRef(false)

    const [email, setEmail] = useState(participant.email)
    const [firstName, setFirstName] = useState(participant.firstName)
    const [lastName, setLastName] = useState(participant.lastName)
    const [middleName, setMiddleName] = useState(participant.middleName)
    const [preferredName, setPreferredName] = useState(participant.preferredName)
    const [contact, setContact] = useState(participant.contact)

    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        async function api(){
            let userTags: UserTag[] = (await Promise.all(participant.userTags.map(async (tag) => {
                const response = await client.models.UserTag.get({id: tag})
                if(!response || response.data == null) return
                const ut: UserTag = {
                    ...response.data,
                    color: response.data.color ?? undefined,
                }
                return ut
            }))).filter((item) => item !== undefined)

            setUserTags(userTags)
            apiCall.current = true
        }
        if(!apiCall.current){
            api()
        }
    })

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
            <span className="text-xl ">{`${participant.firstName} ${participant.lastName}'s Details:`}</span>
            <div className="flex flex-row gap-2 items-center mb-4 justify-center w-full">
            {
                userTags.map((tag, index) => {
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
            <Button isProcessing={submitting} className="w-[75px] self-end" onClick={async () => {
                setSubmitting(true)
                await updateProfile()
            }}>Save</Button>
        </div>
    )
}

interface ParentFormParams {
    width: number,
    user: UserStorage,
    userProfile: UserProfile,
    submit: Function
}

const ParentProfileForm: FC<ParentFormParams> = ({ width, user, userProfile, submit }) => {
    const [parentFirstName, setParentFirstName] = useState(user.attributes.given_name)
    const [parentLastName, setParentLastName] = useState(user.attributes.family_name)
    const [parentPhoneNumber, setParentPhoneNumber] = useState(user.attributes.phone_number)
    // const [parentEmail, setParentEmail] = useState(userProfile.email)
    const [preferredContact, setPreferredContact] = useState(userProfile.preferredContact)

    const [submitting, setSubmitting] = useState(false)

    async function updateProfile(){
        let updated = false
        let updatedUser = {...user}
        let updatedProfile = {...userProfile}

        try{
            if(parentFirstName !== user.attributes.given_name || parentLastName !== user.attributes.family_name){
                const response = await updateUserAttributes({
                    userAttributes: {
                        email: userProfile.email,
                        family_name: parentLastName,
                        given_name: parentFirstName,
                    }
                })
                console.log(response)
                updated = true
                updatedUser.attributes.family_name = parentLastName
                updatedUser.attributes.given_name = parentFirstName
            }
            if(parentPhoneNumber !== user.attributes.phone_number && parentPhoneNumber && user.session.tokens){
                const response = await client.queries.UpdateUserPhoneNumber({
                    phoneNumber: parentPhoneNumber,
                    accessToken: (await fetchAuthSession()).tokens!.accessToken.toString()
                })
                console.log(response)
                updated = true
                updatedUser.attributes.phone_number = parentPhoneNumber
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
                    <Label className="font-semibold text-xl self-start me-4 mt-1">Parent Email:</Label>
                    <TextInput sizing='sm' className={`w-[60%] ${width < 768 ? 'self-start w-full' : ''}`} placeholder="Email" type="email" defaultValue={userProfile.email} disabled/>
                </div>
                <div className={`flex ${width < 768 ? 'flex-col' : 'flex-row'} gap-1 items-center justify-between w-full`}>
                    <Label className="font-semibold text-xl self-start me-4 mt-1">Parent Email:</Label>
                    <TextInput sizing='sm' className={`w-[60%] ${width < 768 ? 'self-start w-full' : ''}`} placeholder="Email" type="tel" defaultValue={user.attributes.phone_number} onChange={(event) => setParentPhoneNumber(event.target.value)}/>
                </div>
                
                <div className={`flex ${width < 768 ? 'flex-col' : 'flex-row'} gap-1 items-center justify-between w-full`}>
                    <Label className="font-semibold text-xl self-start me-4 mt-1">Parent First Name:</Label>
                    <TextInput sizing='sm' className={`w-[40%] ${width < 768 ? 'self-start w-full' : ''}`} placeholder="Last Name" type='text' defaultValue={user.attributes.given_name} onChange={(event) => setParentFirstName(event.target.value)}/>
                </div>
                <div className={`flex ${width < 768 ? 'flex-col' : 'flex-row'} gap-1 items-center justify-between w-full`}>
                    <Label className="font-semibold text-xl self-start me-4 mt-1">Parent Last Name:</Label>
                    <TextInput sizing='sm' className={`w-[40%] ${width < 768 ? 'self-start w-full' : ''}`} placeholder="First Name" type="text" defaultValue={user.attributes.family_name} onChange={(event) => setParentLastName(event.target.value)}/>
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