import { FC, useEffect, useState } from "react";
import { UserProfile, UserStorage, UserTag } from "../../types";
import { useLoaderData } from "react-router-dom";
import { Badge, Button, Checkbox, Label, TextInput } from "flowbite-react";
import { badgeColorThemeMap } from "../../utils";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";

const client = generateClient<Schema>()

export const ClientProfile: FC = () => {
    const user = useLoaderData() as UserProfile | null
    const [apiCall, setApiCall] = useState(false)
    const [userTags, setUserTags] = useState<UserTag[]>([])

    const userStorage: UserStorage | undefined = window.localStorage.getItem('user') !== null ? JSON.parse(window.localStorage.getItem('user')!) as UserStorage : undefined

    const [parentFirstName, setParentFirstName] = useState<string | undefined>(userStorage ? userStorage.attributes.given_name : undefined)
    const [parentLastName, setParentLastName] = useState<string | undefined>(userStorage ? userStorage.attributes.family_name : undefined)
    const [parentEmail, setParentEmail] = useState<string | undefined>(user ? user.parentEmail : undefined)
    const [participantFirstName, setParticipantFirstName] = useState<string | undefined>(user ? user.participantFirstName : undefined)
    const [participantLastName, setParticipantLastName] = useState<string | undefined>(user ? user.participantLastName : undefined)
    const [participantPreferredName, setParticipantPreferredName] = useState<string | undefined>(user ? user.participantFirstName : undefined)
    const [participantMiddleName, setParticipantMiddleName] = useState<string | undefined>(user ? user.participantLastName : undefined)
    const [preferredContact, setPreferredContact] = useState(user ? user.preferredContact === 'PHONE' : false)
    const [participantContact, setParticipantContact] = useState(user ? user.participantContact : false)

    useEffect(() => {
        async function api(){
            let userProfileTags: UserTag[] = []
            if(user) {
                userProfileTags = await Promise.all(user.userTags.map(async (tag) => {
                    const response = (await client.models.UserTag.get({id: tag})).data!
                    return {
                        ...response,
                        color: response.color ? response.color : undefined,
                        collectionId: response.collectionId ? response.collectionId : undefined
                    }
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

    return (
        <div className="flex flex-col mt-4 w-full justify-center items-center font-main">
         {
            user ? (
                <div className="flex flex-col gap-2 text-center border-gray-500 border rounded-lg px-6 py-2 w-[60%]">
                    <span className="text-xl ">Your Profile:</span>
                    <div className="flex flex-row gap-2 items-center mb-6 justify-center w-full">
                    {
                        userTags.map((tag, index) => {
                            return (<Badge theme={badgeColorThemeMap} color={tag.color ? tag.color : 'light'} key={index} className="py-1 text-md">{tag.name}</Badge>)
                        })
                    }
                    </div>
                    <div className="grid lg:grid-cols-2 md:grid-cols-1 gap-6 mb-6">
                        <div className="flex flex-row gap-4 items-center justify-between px-4">
                            <Label className="ms-2 mb-1 font-semibold text-xl" htmlFor="email">Email:</Label>
                            <TextInput sizing='sm' className="w-[60%]" placeholder="Email" type="email" id="email" name="email" defaultValue={user.email} disabled/>
                        </div>
                        <div className="flex flex-row gap-4 items-center justify-between px-4">
                            <Label className="ms-2 mb-1 font-semibold text-xl" htmlFor="email">Parent Email:</Label>
                            <TextInput sizing='sm' className="w-[60%]" placeholder="Email" type="email" id="email" name="email" defaultValue={user.parentEmail} onChange={(event) => setParentEmail(event.target.value)}/>
                        </div>
                        <div className="flex flex-row gap-4 items-center justify-between px-4">
                            <Label className="ms-2 mb-1 font-semibold text-xl" htmlFor="email">Parent First Name:</Label>
                            <TextInput sizing='sm' className="w-[40%]" placeholder="Email" type="email" id="email" name="email" defaultValue={userStorage?.attributes.given_name} onChange={(event) => setParentFirstName(event.target.value)}/>
                        </div>
                        <div className="flex flex-row gap-4 items-center justify-between px-4">
                            <Label className="ms-2 mb-1 font-semibold text-xl" htmlFor="email">Parent Last Name:</Label>
                            <TextInput sizing='sm' className="w-[40%]" placeholder="Email" type="email" id="email" name="email" defaultValue={userStorage?.attributes.family_name} onChange={(event) => setParentLastName(event.target.value)}/>
                        </div>
                        <div className="flex flex-row gap-4 items-center justify-between px-4">
                            <Label className="ms-2 mb-1 font-semibold text-xl" htmlFor="email">Participant First Name:</Label>
                            <TextInput sizing='sm' className="w-[40%]" placeholder="Email" type="email" id="email" name="email" defaultValue={user.participantFirstName} onChange={(event) => setParticipantFirstName(event.target.value)}/>
                        </div>
                        <div className="flex flex-row gap-4 items-center justify-between px-4">
                            <Label className="ms-2 mb-1 font-semibold text-xl" htmlFor="email">Participant Last Name:</Label>
                            <TextInput sizing='sm' className="w-[40%]" placeholder="Email" type="email" id="email" name="email" defaultValue={user.participantLastName} onChange={(event) => setParticipantLastName(event.target.value)}/>
                        </div>
                        <div className="flex flex-row gap-4 items-center justify-between px-4">
                            <Label className="ms-2 mb-1 font-semibold text-xl" htmlFor="email">Participant Middle Name:</Label>
                            <TextInput sizing='sm' className="w-[40%]" placeholder="Email" type="email" id="email" name="email" defaultValue={user.participantMiddleName} onChange={(event) => setParticipantMiddleName(event.target.value)}/>
                        </div>
                        <div className="flex flex-row gap-4 items-center justify-between px-4">
                            <Label className="ms-2 mb-1 font-semibold text-xl" htmlFor="email">Participant Preferred Name:</Label>
                            <TextInput sizing='sm' className="w-[40%]" placeholder="Email" type="email" id="email" name="email" defaultValue={user.participantPreferredName} onChange={(event) => setParticipantPreferredName(event.target.value)}/>
                        </div>
                        <div>
                            <button className="flex flex-row gap-2 items-center px-4 cursor-pointer" onClick={() => setPreferredContact(!preferredContact)}>
                                <Checkbox checked={preferredContact}/>
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
                    <Button className="w-[75px] self-end" onClick={async () => {
                        console.log(parentFirstName, parentLastName)
                        const response = await client.models.UserProfile.update({
                            email: user.email,
                            parentEmail: parentEmail,
                            participantContact: participantContact,
                            participantFirstName: participantFirstName,
                            participantLastName: participantLastName,
                            participantMiddleName: participantMiddleName,
                            participantPreferredName: participantPreferredName,
                            preferredContact: preferredContact ? 'PHONE' : 'EMAIL',
                        })
                        console.log(response)
                    }}>Save</Button>
                </div>
            ) : (<span>Failed to recieve user data</span>)
         }
        </div>
        
        
    )
}