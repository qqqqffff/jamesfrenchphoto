import { Button, Checkbox, Label, TextInput } from "flowbite-react"
import { textInputTheme } from "../../utils"
import { FC, useEffect, useState } from "react"
import { generateClient } from "aws-amplify/api"
import { Schema } from "../../../amplify/data/resource"
import { Participant, UserTag } from "../../types"
import { useMutation, useQueries } from "@tanstack/react-query"
import { createParticipantMutation, CreateParticipantParams, getUserTagByIdQueryOptions } from "../../services/userService"

const client = generateClient<Schema>()

interface ParticipantCreatorProps {
    width: number,
    userEmail?: string,
    taggingCode?: {visible: boolean, code?: string[], editable?: boolean},
    displayRequired?: boolean,
    submit: (noti: string, participant?: Participant, errorReturn?: PrefilledParticipantFormElements) => void,
    prefilledElements?: PrefilledParticipantFormElements
}

//TODO: more indepth error handling
interface ParticipantFormError {
    type: 'tagcode' | 'email' | 'firstname' | 'lastname' | 'middlename' | 'preferredname'
}

export interface PrefilledParticipantFormElements {
    errors: ParticipantFormError[],
    partialParticipant: Partial<Participant>
}

const component: FC<ParticipantCreatorProps> = ({ width, userEmail, taggingCode, displayRequired, submit, prefilledElements }) => {
    const [formErrors, setFormError] = useState<ParticipantFormError[]>(prefilledElements?.errors ?? [])
    
    const [email, setEmail] = useState<string | undefined>(prefilledElements?.partialParticipant?.email)
    const [firstName, setFirstName] = useState<string | undefined>(prefilledElements?.partialParticipant?.firstName)
    const [lastName, setLastName] = useState<string | undefined>(prefilledElements?.partialParticipant?.lastName)
    const [middleName, setMiddleName] = useState<string | undefined>(prefilledElements?.partialParticipant?.middleName)
    const [preferredName, setPreferredName] = useState<string | undefined>(prefilledElements?.partialParticipant?.preferredName)
    const [contact, setContact] = useState(prefilledElements?.partialParticipant?.contact ?? false)

    const tagQuery = useQueries({
        queries: (taggingCode?.code ?? []).map((code) => 
            getUserTagByIdQueryOptions(code)
        )
    })
    const [tags, setTags] = useState<UserTag[]>(prefilledElements?.partialParticipant?.userTags ?? [])

    useEffect(() => {
        setTags(tagQuery
            .map((tagData) => tagData.data)
            .filter((tag) => tag !== undefined && tag !== null)
        )
    }, [tagQuery])
    const [submitting, setSubmitting] = useState(false)

    //TODO: update me please
    async function tagValidation(): Promise<UserTag[] | undefined>{
        const userTags: (UserTag | undefined)[] = (await Promise.all(tags
                .filter((tag) => tag !== undefined)
                .map(async (tag) => {
                    const tagResponse = await client.models.UserTag.get({ id: tag.id })
                    if(!tagResponse || !tagResponse.data || !tagResponse.data.id) return
                    const userTag: UserTag = {
                        ...tagResponse.data,
                        color: tagResponse.data.color ?? undefined,
                        notifications: undefined,
                        //TODO: implement children
                        children: [],
                        participants: []
                    }
                    return userTag
                }
            )
        ))

        if(userTags.findIndex((tag) => tag === undefined) !== -1) return
        return userTags.filter((tag) => tag !== undefined)
    }

    const createParticipantMut = useMutation({
        mutationFn: (params: CreateParticipantParams) => createParticipantMutation(params)
    })

    async function createParticipant(){
        let participant: Participant | undefined
        let formErrors: ParticipantFormError[] = []
        const validateTags = await tagValidation()
        try {
            if(!firstName){
                formErrors.push({type: 'firstname'})
            }
            if(!lastName){
                formErrors.push({type: 'lastname'})
            }
            if(!validateTags){
                formErrors.push({type: 'tagcode'})
            }
            if(firstName && lastName && validateTags && userEmail){
                const response = await createParticipantMut.mutateAsync({
                    participant: {
                        userEmail: userEmail,
                        userTags: tags,
                        email: email,
                        firstName: firstName,
                        lastName: lastName,
                        preferredName: preferredName,
                        middleName: middleName,
                        contact: contact,
                        collections: []
                    },
                    authMode: 'userPool'
                })
                participant = response
            }
        } catch(err){
            setSubmitting(false)
            submit((err as Error).message)
        }

        if(participant !== undefined){
            setSubmitting(false)
            submit('Created Successfully.', participant)
        }
        else if(formErrors.find((error) => error.type === 'tagcode')){
            setSubmitting(false)
            setFormError(formErrors)
            submit('Invalid tag code, leave blank to create a participant without a code.', undefined, {
                errors: formErrors,
                partialParticipant: {
                    userTags: validateTags,
                    email: email,
                    firstName: firstName,
                    lastName: lastName,
                    preferredName: preferredName,
                    middleName: middleName,
                    contact: contact
                }
            })
        }
        else {
            setSubmitting(false)
            setFormError(formErrors)
            submit('Required fields must be filled out.', undefined, {
                errors: formErrors,
                partialParticipant: {
                    userTags: validateTags,
                    email: email,
                    firstName: firstName,
                    lastName: lastName,
                    preferredName: preferredName,
                    middleName: middleName,
                    contact: contact
                }
            })
        }
    }

    //TODO: add ability to add multiple tag codes
    return (
        <>
            <span className="text-xl">Your Participant:</span>
            {/* TODO: add better tagging */}
            <div className="flex flex-col items-start gap-1">
                <Label className="ms-4 font-medium text-lg" htmlFor="participantEmail">Email:</Label>
                <TextInput theme={textInputTheme} sizing='lg' className="mb-4 max-w-[28rem] w-full" placeholder="Participant's Email" type="email" 
                    defaultValue={email}
                    onChange={(event) => setEmail(event.target.value)}
                />
            </div>
            <div className={`flex ${width < 500 ? 'flex-col' : 'flex-row'} justify-between mb-4`}>
                <div className={`flex flex-col gap-1 items-start ${width > 500 ? 'w-[45%]' : 'w-full mb-4' }`}>
                    <Label className="ms-4 font-medium text-lg" htmlFor="participantFirstName">First Name<sup className="italic text-red-600">*</sup>:</Label>
                    <TextInput theme={textInputTheme} sizing='lg' color={formErrors.find((error) => error.type === 'firstname') ? 'failure' : undefined} placeholder="First Name" type="text" id="participantFirstName" name="participantFirstName" 
                        defaultValue={firstName}
                        onChange={(event) => {
                            setFirstName(event.target.value)
                            setFormError(formErrors.filter((error) => error.type !== 'firstname'))
                        }}
                    />
                </div>
                <div className={`flex flex-col gap-1 items-start ${width > 500 ? 'w-[45%]' : 'w-full' }`}>
                    <Label className="ms-4 font-medium text-lg" htmlFor="participantLastName">Last Name<sup className="italic text-red-600">*</sup>:</Label>
                    <TextInput theme={textInputTheme} sizing='lg' color={formErrors.find((error) => error.type === 'lastname') ? 'failure' : undefined} placeholder="Last Name" type="text" id="participantLastName" name="participantLastName" 
                        defaultValue={lastName}
                        onChange={(event) => {
                            setLastName(event.target.value)
                            setFormError(formErrors.filter((error) => error.type !== 'lastname'))
                        }}
                    />
                </div>
            </div>
            <div className={`flex ${width < 500 ? 'flex-col' : 'flex-row'} justify-between mb-4`}>
                <div className={`flex flex-col gap-1 items-start ${width > 500 ? 'w-[45%]' : 'w-full mb-4' }`}>
                    <Label className="ms-4 font-medium text-lg" htmlFor="participantMiddleName">Middle Name:</Label>
                    <TextInput theme={textInputTheme} sizing='lg' placeholder="Middle Name" type="text" id="participantMiddleName" name="participantMiddleName" 
                        defaultValue={middleName}
                        onChange={(event) => setMiddleName(event.target.value)}
                    />
                </div>
                <div className={`flex flex-col gap-1 items-start ${width > 500 ? 'w-[45%]' : 'w-full' }`}>
                    <Label className="ms-4 font-medium text-lg" htmlFor="participantPreferredName">Preferred Name:</Label>
                    <TextInput theme={textInputTheme} sizing='lg' placeholder="Preferred Name" type="text" id="participantPreferredName" name="participantPreferredName" 
                        defaultValue={preferredName}
                        onChange={(event) => setPreferredName(event.target.value)}
                    />
                </div>
            </div>
            <div>
                <button className="flex flex-row gap-2 items-center px-4 cursor-pointer" onClick={() => setContact(!contact)}>
                    <Checkbox checked={contact} readOnly/>
                    <Label className="ms-2 mb-1 text-xl" htmlFor="email">Contact Participant</Label>
                </button>
            </div>
            {displayRequired ? (<p className="italic text-sm self-start ms-4"><sup className="italic text-red-600">*</sup> Indicates required fields.</p>) : (<></>)}
            <Button isProcessing={submitting} className="w-[75px] self-end mb-4" onClick={async () => {
                setSubmitting(true)
                await createParticipant()
            }}>Create</Button>
        </>
    )
}

export default component