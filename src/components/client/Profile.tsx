import { FC, useEffect, useState } from "react";
import { UserProfile, UserStorage, UserTag } from "../../types";
import { useLoaderData } from "react-router-dom";
import { Alert, Badge, Button, Checkbox, Label, TextInput } from "flowbite-react";
import { badgeColorThemeMap } from "../../utils";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import useWindowDimensions from "../../hooks/windowDimensions";

const client = generateClient<Schema>()

export const ClientProfile: FC = () => {
    const user = useLoaderData() as UserProfile | null
    const [apiCall, setApiCall] = useState(false)
    const [userTags, setUserTags] = useState<UserTag[]>([])

    const userStorage: UserStorage | undefined = window.localStorage.getItem('user') !== null ? JSON.parse(window.localStorage.getItem('user')!) as UserStorage : undefined

    const [parentFirstName, setParentFirstName] = useState<string | undefined>(userStorage ? userStorage.attributes.given_name : undefined)
    const [parentLastName, setParentLastName] = useState<string | undefined>(userStorage ? userStorage.attributes.family_name : undefined)
    const [participantEmail, setParticipantEmail] = useState<string | undefined>(user ? user.participantEmail : undefined)
    const [participantFirstName, setParticipantFirstName] = useState<string | undefined>(user ? user.participantFirstName : undefined)
    const [participantLastName, setParticipantLastName] = useState<string | undefined>(user ? user.participantLastName : undefined)
    const [participantPreferredName, setParticipantPreferredName] = useState<string | undefined>(user ? user.participantFirstName : undefined)
    const [participantMiddleName, setParticipantMiddleName] = useState<string | undefined>(user ? user.participantLastName : undefined)
    const [preferredContact, setPreferredContact] = useState(user ? user.preferredContact === 'PHONE' : false)
    const [participantContact, setParticipantContact] = useState(user ? user.participantContact : false)

    const { width } = useWindowDimensions()

    const [submitting, setSubmitting] = useState(false)
    const [notification, setNotification] = useState<string[]>([])

    useEffect(() => {
        async function api(){
            let userProfileTags: UserTag[] = []
            if(user) {
                userProfileTags = await Promise.all(user.userTags.map(async (tag) => {
                    const response = (await client.models.UserTag.get({id: tag})).data!
                    const ut: UserTag = {
                        ...response,
                        color: response.color ? response.color : undefined,
                        //TODO: perform collection fetch
                    }
                    return ut
                }))
            }
            console.log(userProfileTags)
            setUserTags(userProfileTags)
            setApiCall(true)
        }
        if(!apiCall){
            api()
        }
    })

    async function updateProfile(email: string) {
        console.log(parentFirstName, parentLastName)
        const response = await client.models.UserProfile.update({
            email: email,
            participantEmail: participantEmail,
            participantContact: participantContact,
            participantFirstName: participantFirstName,
            participantLastName: participantLastName,
            participantMiddleName: participantMiddleName,
            participantPreferredName: participantPreferredName,
            preferredContact: preferredContact ? 'PHONE' : 'EMAIL',
        })

        const notification = response.errors ? response.errors.map((error) => error.message) : ['Successfully Updated']
        console.log(response)

        setSubmitting(false)
        setNotification(notification)
        setTimeout(() => setNotification([]), 5000)
    }

    return (
        <>
            <div className="flex justify-center items-center font-main mb-4 mt-2">
                {notification.length > 0 ? notification.map((noti, index) => {
                    return (
                        <Alert color="green" className="text-lg w-[90%]" key={index} onDismiss={() => setNotification(notification.filter((not) => not !== noti))}>{noti}</Alert>
                    )
                }) : (<></>)}
            </div>
            <div className="flex flex-col my-4 w-full justify-center items-center font-main">
            {
                user ? (
                    <div className={`flex flex-col gap-2 text-center border-gray-500 border rounded-lg px-6 py-2 md:w-[60%] ${width < 768 ? 'mx-4' : ''}`}>
                        <span className="text-xl ">Your Profile:</span>
                        <div className="flex flex-row gap-2 items-center mb-4 justify-center w-full">
                        {
                            userTags.map((tag, index) => {
                                return (<Badge theme={badgeColorThemeMap} color={tag.color ? tag.color : 'light'} key={index} className="py-1 text-md">{tag.name}</Badge>)
                            })
                        }
                        </div>
                        <div className="grid lg:grid-cols-2 md:grid-cols-1 gap-6 mb-6">
                            <div className={`flex ${width < 768 ? 'flex-col' : 'flex-row'} gap-1 items-center justify-between w-full`}>
                                <Label className="font-semibold text-xl self-start me-4">Parent Email:</Label>
                                <TextInput sizing='sm' className={`w-[60%] ${width < 768 ? 'self-start w-full' : ''}`} placeholder="Email" type="email" defaultValue={user.email} disabled/>
                            </div>
                            <div className={`flex ${width < 768 ? 'flex-col' : 'flex-row'} gap-1 items-center justify-between w-full`}>
                                <Label className="font-semibold text-xl self-start me-4">Participant Email:</Label>
                                <TextInput sizing='sm' className={`w-[60%] ${width < 768 ? 'self-start w-full' : ''}`} placeholder="Email" type="email" defaultValue={user.participantEmail} onChange={(event) => setParticipantEmail(event.target.value)}/>
                            </div>
                            <div className={`flex ${width < 768 ? 'flex-col' : 'flex-row'} gap-1 items-center justify-between w-full`}>
                                <Label className="font-semibold text-xl self-start me-4">Parent First Name:</Label>
                                <TextInput sizing='sm' className={`w-[40%] ${width < 768 ? 'self-start w-full' : ''}`} placeholder="Email" type="email" defaultValue={userStorage?.attributes.given_name} onChange={(event) => setParentFirstName(event.target.value)}/>
                            </div>
                            <div className={`flex ${width < 768 ? 'flex-col' : 'flex-row'} gap-1 items-center justify-between w-full`}>
                                <Label className="font-semibold text-xl self-start me-4">Parent Last Name:</Label>
                                <TextInput sizing='sm' className={`w-[40%] ${width < 768 ? 'self-start w-full' : ''}`} placeholder="Email" type="email" defaultValue={userStorage?.attributes.family_name} onChange={(event) => setParentLastName(event.target.value)}/>
                            </div>
                            <div className={`flex ${width < 768 ? 'flex-col' : 'flex-row'} gap-1 items-center justify-between w-full`}>
                                <Label className="font-semibold text-xl self-start me-4">Participant First Name:</Label>
                                <TextInput sizing='sm' className={`w-[40%] ${width < 768 ? 'self-start w-full' : ''}`} placeholder="Email" type="email" defaultValue={user.participantFirstName} onChange={(event) => setParticipantFirstName(event.target.value)}/>
                            </div>
                            <div className={`flex ${width < 768 ? 'flex-col' : 'flex-row'} gap-1 items-center justify-between w-full`}>
                                <Label className="font-semibold text-xl self-start me-4">Participant Last Name:</Label>
                                <TextInput sizing='sm' className={`w-[40%] ${width < 768 ? 'self-start w-full' : ''}`} placeholder="Email" type="email" defaultValue={user.participantLastName} onChange={(event) => setParticipantLastName(event.target.value)}/>
                            </div>
                            <div className={`flex ${width < 768 ? 'flex-col' : 'flex-row'} gap-1 items-center justify-between w-full`}>
                                <Label className="font-semibold text-xl self-start me-4">Participant Middle Name:</Label>
                                <TextInput sizing='sm' className={`w-[40%] ${width < 768 ? 'self-start w-full' : ''}`} placeholder="Email" type="email" defaultValue={user.participantMiddleName} onChange={(event) => setParticipantMiddleName(event.target.value)}/>
                            </div>
                            <div className={`flex ${width < 768 ? 'flex-col' : 'flex-row'} gap-1 items-center justify-between w-full`}>
                                <Label className="font-semibold text-xl self-start me-4">Participant Preferred Name:</Label>
                                <TextInput sizing='sm' className={`w-[40%] ${width < 768 ? 'self-start w-full' : ''}`} placeholder="Email" type="text" defaultValue={user.participantPreferredName} onChange={(event) => setParticipantPreferredName(event.target.value)}/>
                            </div>
                            <div>
                                <button className="flex flex-row gap-2 items-center px-4 cursor-pointer" onClick={() => setPreferredContact(!preferredContact)}>
                                    <Checkbox checked={preferredContact} readOnly/>
                                    <Label className="ms-2 mb-1 text-xl" htmlFor="email">Prefer Phone Contact</Label>
                                </button>
                            </div>
                            <div>
                                <button className="flex flex-row gap-2 items-center px-4 cursor-pointer" onClick={() => setParticipantContact(!participantContact)}>
                                    <Checkbox checked={participantContact} readOnly/>
                                    <Label className="ms-2 mb-1 text-xl" htmlFor="email">Participant Contact</Label>
                                </button>
                            </div>
                        </div>
                        <Button isProcessing={submitting} className="w-[75px] self-end" onClick={async () => {
                            setSubmitting(true)
                            await updateProfile(user.email)
                        }}>Save</Button>
                    </div>
                ) : (<span>Failed to recieve user data</span>)
            }
            </div>
        </>
        
        
        
    )
}