import { createFileRoute } from '@tanstack/react-router'
import { generateClient } from "aws-amplify/api"
import { confirmSignUp, resendSignUpCode, signUp } from "aws-amplify/auth"
import { Alert, Badge, Button, Checkbox, Label, Modal, TextInput } from "flowbite-react"
import { FormEvent, useRef, useState } from "react"
import { HiOutlineCheckCircle, HiOutlineExclamationCircle } from "react-icons/hi2";
import validator from 'validator'
import { v4 } from 'uuid'
import { useNavigate } from "@tanstack/react-router"
import { Schema } from '../../amplify/data/resource'
import { Participant, UserTag } from '../types'
import useWindowDimensions from '../hooks/windowDimensions'
import { TermsAndConditionsModal } from '../components/modals'
import { textInputTheme } from '../utils'
import { createParticipantMutation, getTemporaryUserQueryOptions, CreateParticipantParams } from '../services/userService'
import { useMutation } from '@tanstack/react-query'

interface RegisterParams {
  token: string,
}

export const Route = createFileRoute('/register')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): RegisterParams => ({
    token: (search.tags as string)
  }),
  beforeLoad: ({ search }) => {
    return search
  },
  loader: async ({ context }) => {
    const profile = await context.queryClient.ensureQueryData(getTemporaryUserQueryOptions(context.token))

    return profile
  }
})

const client = generateClient<Schema>()

interface SignUpFormElements extends HTMLFormControlsCollection {
    participantEmail: HTMLInputElement
    email: HTMLInputElement
    password: HTMLInputElement
    confirmPassword: HTMLInputElement
    firstName: HTMLInputElement
    lastName: HTMLInputElement
    participantFirstName: HTMLInputElement
    participantLastName: HTMLInputElement
    participantMiddleName: HTMLInputElement
    participantPreferredName: HTMLInputElement
    phoneNumber: HTMLInputElement
}

interface AuthFormElements extends HTMLFormControlsCollection {
    authCode: HTMLInputElement
}

interface SignUpForm extends HTMLFormElement{
    readonly elements: SignUpFormElements
}

interface AuthCodeForm extends HTMLFormElement{
    readonly elements: AuthFormElements
}

export type SignupAvailableTag = {
    tag: UserTag, 
    selected: {participantId?: string, selected: boolean}
}

interface SignupFormError {
    id: string
    message: string
}

interface SignupParticipant extends Participant {
    sameDetails: boolean
}

export function RouteComponent(){
    const [openModal, setOpenModal] = useState(false);
    const [termsAndConditionsVisible, setTermsAndConditionsVisible] = useState(false)
    const [preferredContact, setPreferredContact] = useState(false)
    const [termsAndConditions, setTermsAndConditions] = useState(false)

    const profile = Route.useLoaderData()

    const [password, setPassword] = useState<string>()
    const [confirmPassword, setConfirmPassword] = useState<string>()

    const [passwordNumber, setPasswordNumber] = useState(false)
    const [passwordSpecialCharacter, setPasswordSpecialCharacter] = useState(false)
    const [passwordMinCharacters, setPasswordMinCharacters] = useState(false)
    const [passwordUpperCharacter, setPasswordUpperCharacter] = useState(false)
    const [passwordLowerCharacter, setPasswordLowerCharacter] = useState(false)
    const [passwordMatch, setPasswordMatch] = useState(false)
    
    const [userFirstName, setUserFirstName] = useState<string | undefined>(profile?.firstName)
    const userFirstNameRef = useRef<HTMLInputElement>(null)
    const [userLastName, setUserLastName] = useState<string | undefined>(profile?.lastName)
    const userLastNameRef = useRef<HTMLInputElement>(null)
    const [userEmail, setUserEmail] = useState<string | undefined>(profile?.email)
    const userEmailRef = useRef<HTMLInputElement>(null)
    const [userPhoneNumber, setUserPhoneNumber] = useState<string>()
    const userPhoneNumberRef = useRef<HTMLInputElement>(null)
    
    const [innerFormErrors, setInnerFormErrors] = useState<SignupFormError[]>([])

    const [participantEmail, setParticipantEmail] = useState<string | undefined>(profile?.activeParticipant?.email)
    const [participantFirstName, setParticipantFirstName] = useState<string | undefined>(profile?.activeParticipant?.firstName)
    const participantFirstNameRef = useRef<HTMLInputElement>(null)
    const [participantLastName, setParticipantLastName] = useState<string | undefined>(profile?.activeParticipant?.lastName)
    const participantLastNameRef = useRef<HTMLInputElement>(null)
    const [participantPreferredName, setParticipantPreferredName] = useState<string | undefined>(profile?.activeParticipant?.preferredName)
    const [participantMiddleName, setParticipantMiddleName] = useState<string>()
    const [participantContact, setParticipantContact] = useState(false)
    const [participantSameDetails, setParticipantSameDetails] = useState(false)
    const [participants, setParticipants] = useState<SignupParticipant[]>(profile?.participant.map((participant) => ({...participant, sameDetails: false})) ?? [])
    const [activeParticipant, setActiveParticipant] = useState<SignupParticipant | undefined>(profile?.activeParticipant ? ({...profile.activeParticipant, sameDetails: false}) : undefined)
    const [participantSubmitting, setParticipantSubmitting] = useState(false)

    const [formErrors, setFormErrors] = useState<string[]>(() => {
        if(window.localStorage.getItem('user') || window.localStorage.getItem('jfp.auth.user')){
            return ['You are already logged in! If you want to create a new account please sign out of your current account first.']
        }
        return []
    })
    const [invalidCode, setInvalidCode] = useState(false)

    const [formSubmitting, setFormSubmitting] = useState(false)
    const [codeSubmitting, setCodeSubmitting] = useState(false)

    const navigate = useNavigate()
    const { width } = useWindowDimensions()

    const createParticipant = useMutation({
        mutationFn: (params: CreateParticipantParams) => createParticipantMutation(params)
    })

    async function handleSubmit(event: FormEvent<SignUpForm>){
        event.preventDefault()
        const form = event.currentTarget;

        if(validate()) {
            setFormErrors(['Invalid form, fill out required fields!'])
            setFormSubmitting(false)
            return
        }

        if(!validateForm()) {
            setFormSubmitting(false)
            return
        }

        const sittingNumber = (250_000 + (Math.random() * 99_998) + 1).toFixed(0)
        const userEmail = form.elements.email.value

        try {

            //creating the main user
            const profileCreateResponse = await client.models.UserProfile.create({
                sittingNumber: Number.parseInt(sittingNumber),
                email: userEmail,
                participantEmail: participantEmail!,
                // userTags: responseTags, TODO: deprecate me, i believe no more dependencies
                participantFirstName: participantFirstName!,
                participantLastName: participantLastName!,
                participantMiddleName: form.elements.participantMiddleName.value ? form.elements.participantMiddleName.value : undefined,
                participantPreferredName: form.elements.participantPreferredName.value ? form.elements.participantPreferredName.value : undefined,
                preferredContact: preferredContact ? 'PHONE' : 'EMAIL',
                participantContact: participantContact,
            },
            { authMode: 'iam' }
            )

            if(profileCreateResponse.errors && profileCreateResponse.errors.length > 0) {
                throw new Error(JSON.stringify(profileCreateResponse.errors))
            }
            
            //creating participants
            const tempParticipants = participants
            if(activeParticipant == undefined && (participantFirstName && participantLastName)){
                const participant: SignupParticipant = {
                    id: v4(),
                    firstName: participantFirstName,
                    lastName: participantLastName,
                    email: participantEmail,
                    preferredName: participantPreferredName,
                    middleName: participantPreferredName,
                    contact: participantContact,
                    userTags: [],
                    sameDetails: false,
                    userEmail: userEmail,
                    notifications: []
                }
                tempParticipants.push(participant)
            }

            await Promise.all(tempParticipants.map(async (participant) => {
                await createParticipant.mutateAsync({
                    participant: participant,
                    authMode: 'identityPool'
                })
            }))

            const response = await signUp({
                username: userEmail,
                password: password!,
                options: {
                    userAttributes: {
                        email: userEmail!,
                        phone_number: userPhoneNumber ? `+1${userPhoneNumber.replace(/\D/g, '')}` : undefined,
                        given_name: userFirstName,
                        family_name: userLastName,
                        'custom:verified': 'true'
                    }
                }
            })

            if(response.nextStep.signUpStep !== 'DONE') {
                setOpenModal(true);
                setFormSubmitting(false);
                setUserEmail(form.elements.email.value)
            }
            else{
                setFormSubmitting(false)
                navigate({ to: '/login', params: { createAccountSuccess: true }})
            }

        } catch(err: any) {
            const error = err as Error
            let formattedErrors = [] as string[]

            try{
                const errors = JSON.parse(error.message) as string[]
                errors.forEach((error) => {
                    if(error === 'DynamoDB:ConditionalCheckFailedException'){
                        formattedErrors.push(`Account with participant's email already exists!`)
                    }
                    else{
                        formattedErrors.push('Unexpected Error, please contact us about your issue!')
                    }
                })
            }
            catch (e) {
                formattedErrors.push(error.message)
            }
            
            setFormSubmitting(false)
            setFormErrors(formattedErrors)
        }
    }

    async function handleCodeSubmit(event: FormEvent<AuthCodeForm>){
        event.preventDefault()
        const form = event.currentTarget;

        try{
            const response = await confirmSignUp({
                username: userEmail!,
                confirmationCode: form.elements.authCode.value,
            })

            if(response.isSignUpComplete){
                navigate({ to: '/login', params: { createAccountSuccess: true }})
            }
        }catch(err){
            //todo error handling
            setInvalidCode(true)
        }
        setCodeSubmitting(false)
    }

    function validate(): boolean {
        return (
            userFirstName === undefined || 
            userLastName === undefined || 
            userEmail === undefined || ((
            participantFirstName === undefined ||
            participantLastName === undefined ) && participants.length <= 0)) ||
            !(passwordMatch &&
            passwordNumber &&
            passwordSpecialCharacter &&
            passwordUpperCharacter &&
            passwordLowerCharacter && 
            passwordMinCharacters &&
            termsAndConditions) ||
            window.localStorage.getItem('user') !== null
    }


    function calculateUserDetails(): number {
        let total = 0
        if(userFirstName){
            total += 1
        }
        if(userLastName){
            total += 1
        }
        if(userEmail) {
            total += 1
        }
        return total
    }

    function calculateParticipantDetails(): number {
        let total = 0
        if(participantFirstName){
            total += 1
        }
        if(participantLastName){
            total += 1
        }
        return total
    }

    function validateForm(){
        let errors: SignupFormError[] = []
        let formErrors: string[] = []
        if(userFirstName && userFirstNameRef.current){
            if(userFirstName.length <= 0){
                errors.push({
                    id: userFirstNameRef.current.id,
                    message: 'Your First Name is Required'
                })
            }
        }
        if(userFirstName && userFirstNameRef.current){
            if(userFirstName.length <= 0){
                errors.push({
                    id: userFirstNameRef.current.id,
                    message: 'Your First Name is Required'
                })
            }
        }
        if(userPhoneNumber && userPhoneNumberRef.current){
            if(!validator.isMobilePhone(`+1${userPhoneNumber.replace(/\D/g, '')}`, 'en-US')){
                errors.push({
                    id: userPhoneNumberRef.current.id,
                    message: 'Invalid Phone Number'
                })
            }
        }
        if(userEmail && userEmailRef.current){
            if(userEmail.length <= 0){
                errors.push({
                    id: userEmailRef.current.id,
                    message: 'Email is Required'
                })
            }
            if(!validator.isEmail(userEmail)){
                errors.push({
                    id: userEmailRef.current.id,
                    message: 'Invalid Email Address'
                })
            }
        }
        if(participantFirstNameRef.current && participantLastNameRef.current){
            if(participants.length > 0){
                let encounteredError = false
                participants.forEach((participant) => {
                    if(participant.email && !validator.isEmail(participant.email)){
                        encounteredError = true
                        formErrors.push(`${participant.preferredName ? participant.preferredName : participant.firstName} ${participant.lastName} has an invalid email`)
                    }
                })
                if(encounteredError){
                    errors.push({id: participantFirstNameRef.current.id, message: 'Missing'})
                    errors.push({id: participantLastNameRef.current.id, message: 'Missing'})
                }
            }
            else if(activeParticipant === undefined && (participantFirstName === undefined || participantLastName === undefined)){
                formErrors.push('At least one participant must be submitted or filled out')
                errors.push({id: participantFirstNameRef.current.id, message: 'Missing'})
                errors.push({id: participantLastNameRef.current.id, message: 'Missing'})
            }
        }

        if(errors.length > 0 || formErrors.length > 0) {
            setInnerFormErrors(errors)
            setFormErrors(formErrors)
            return false
        }
        return true
    }

    return (
        <>
            <div className="mt-4">
                {formErrors.length > 0 ? formErrors.map((error, index) => {
                    return (
                        <div key={index} className="flex justify-center items-center font-main mb-4">
                            <Alert color='red' className="text-lg w-[90%]" onDismiss={() => {setFormErrors(formErrors.filter((e) => e != error))}}>
                                <p>{error}</p>
                            </Alert>
                        </div>
                    )
                }) : (<></>)}
            </div>
            <Modal show={openModal} onClose={() => setOpenModal(false)}>
                <Modal.Header>Verification Code</Modal.Header>
                <Modal.Body className="flex flex-col gap-3 font-main">
                    <form onSubmit={handleCodeSubmit}>
                        <p>Please enter in the verification code sent to the user's email.</p>
                        <p><b>Do not close this window until account has been confirmed.</b></p>
                        <div className="flex items-center gap-4 mt-4">
                            <Label className="font-medium text-lg" htmlFor="authCode">Verification Code:</Label>
                            <TextInput color={invalidCode ? 'failure' : undefined} className='' sizing='md' placeholder="Verification Code" type="number" id="authCode" name="authCode" onChange={() => {
                                setInvalidCode(false)
                            }} helperText={ invalidCode ? (
                                <div className="-mt-2 mb-4 ms-2 text-sm">
                                    <span>Invalid Code</span>
                                </div>) : (<></>)}/>
                        </div>
                        <div className="flex flex-row justify-end gap-4 mt-4">
                            <Button className="text-xl w-[40%] max-w-[8rem] mb-6" onClick={() => {
                                resendSignUpCode({
                                    username: userEmail!
                                })
                            }}>Resend</Button>
                            <Button className="text-xl w-[40%] max-w-[8rem] mb-6" type="submit" onClick={() => setCodeSubmitting(true)} isProcessing={codeSubmitting}>Submit</Button>
                        </div>
                    </form>
                </Modal.Body>
            </Modal>
            <TermsAndConditionsModal open={termsAndConditionsVisible} onClose={() => setTermsAndConditionsVisible(false)} />
            <form className={`flex flex-col items-center justify-center font-main my-12 w-full ${width > 500 ? 'px-4' : 'px-0'}`} onSubmit={handleSubmit}>
                <div className={`flex flex-col items-center justify-center ${width > 800 ? 'w-[60%]' : 'w-full'} max-w-[48rem] border-2 px-4 py-4 border-gray-500`}>
                    <p className="font-bold text-4xl mb-8 text-center">Create an account</p>
                    <div className="flex flex-col gap-1 w-[80%] max-w-[40rem]">
                        <div className="text-xl flex flex-row items-center">
                            <span>User Details</span> {calculateUserDetails() === 3 ? 
                            (
                                <HiOutlineCheckCircle className="text-green-400 mt-1 ms-2"/>
                            ) : (
                                <span className="text-red-600 ms-2">{calculateUserDetails()}/3</span>
                            )}
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className={`flex ${width < 500 ? 'flex-col' : 'flex-row'} justify-between mb-4`}>
                                <div className={`flex flex-col gap-1 ${width > 500 ? 'w-[45%]' : 'w-full mb-4' }`}>
                                    <Label className="ms-2 font-medium text-lg" htmlFor="firstName">User First Name<sup className="italic text-red-600">*</sup>:</Label>
                                    <TextInput ref={userFirstNameRef} theme={textInputTheme} sizing='lg' placeholder="First Name" type="text" id="firstName" name="firstName"
                                        onChange={(event) => {
                                            setUserFirstName(event.target.value)
                                            setInnerFormErrors(innerFormErrors.filter((error) => error.id !== userFirstNameRef.current?.id))
                                        }}
                                        color={innerFormErrors.find((error) => error.id == userFirstNameRef.current?.id) !== undefined ? 'failure' : undefined}
                                        helperText={innerFormErrors.find((error) => error.id == userFirstNameRef.current?.id) !== undefined ? 
                                            (<span color="text-red-600">{innerFormErrors.find((error) => error.id == userFirstNameRef.current?.id)?.message}</span>) : undefined
                                        }
                                    />
                                </div>
                                <div className={`flex flex-col gap-1 ${width > 500 ? 'w-[45%]' : 'w-full' }`}>
                                    <Label className="ms-2 font-medium text-lg" htmlFor="lastName">User Last Name<sup className="italic text-red-600">*</sup>:</Label>
                                    <TextInput ref={userLastNameRef} theme={textInputTheme} sizing='lg' placeholder="Last Name" type="text" id="lastName" name="lastName" 
                                        onChange={(event) => {
                                            setUserLastName(event.target.value)
                                            setInnerFormErrors(innerFormErrors.filter((error) => error.id !== userLastNameRef.current?.id))
                                        }}
                                        color={innerFormErrors.find((error) => error.id == userLastNameRef.current?.id) !== undefined ? 'failure' : undefined}
                                        helperText={innerFormErrors.find((error) => error.id == userLastNameRef.current?.id) !== undefined ? 
                                            (<span color="text-red-600">{innerFormErrors.find((error) => error.id == userLastNameRef.current?.id)?.message}</span>) : undefined
                                        }
                                    />
                                </div>
                            </div>
                            <Label className="ms-2 font-medium text-lg" htmlFor="phoneNumber">User Phone Number<sup className="text-gray-400">1</sup>:</Label>
                            <TextInput ref={userPhoneNumberRef} theme={textInputTheme} sizing='lg' className="mb-4 max-w-[28rem] text-xl" placeholder="10-Digit Phone Number" type="tel" id="phoneNumber" name="phoneNumber" 
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
                                    setInnerFormErrors(innerFormErrors.filter((error) => error.id !== userPhoneNumberRef.current?.id))
                                }}
                                color={innerFormErrors.find((error) => error.id == userPhoneNumberRef.current?.id) !== undefined ? 'failure' : undefined}
                                helperText={innerFormErrors.find((error) => error.id == userPhoneNumberRef.current?.id) !== undefined ? 
                                    (<span color="text-red-600">{innerFormErrors.find((error) => error.id == userPhoneNumberRef.current?.id)?.message}</span>) : undefined
                                }
                                value={userPhoneNumber}
                            />
                            <Label className="ms-2 font-medium text-lg" htmlFor="email">User Email<sup className="text-gray-400">2</sup><sup className="italic text-red-600">*</sup>:</Label>
                            <TextInput ref={userEmailRef} theme={textInputTheme} sizing='lg' className="mb-4 max-w-[28rem]" placeholder="Email" type="email" id="email" name="email" 
                                onChange={(event) => setUserEmail(event.target.value)}
                                color={innerFormErrors.find((error) => error.id == userEmailRef.current?.id) !== undefined ? 'failure' : undefined}
                                helperText={innerFormErrors.find((error) => error.id == userEmailRef.current?.id) !== undefined ? 
                                    (<span color="text-red-600">{innerFormErrors.find((error) => error.id == userEmailRef.current?.id)?.message}</span>) : undefined
                                }
                            />
                        </div>
                        <div className="text-xl flex flex-row items-center">
                            <span>Participant Details</span> {
                                innerFormErrors.find((error) => error.id === participantFirstNameRef.current?.id || error.id === participantLastNameRef.current?.id) ? (
                                    <HiOutlineExclamationCircle className="text-red-600 mt-1 ms-2"/>
                                ) : (
                                    calculateParticipantDetails() === 2 || participants.length > 0 ? 
                                    (
                                        <HiOutlineCheckCircle className="text-green-400 mt-1 ms-2"/>
                                    ) : (
                                        <span className="text-red-600 ms-2">{calculateParticipantDetails()}/2</span>
                                    )
                                )
                            }
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="flex flex-col w-full items-center">
                                {participants.length > 0 ? (<span>Participant(s) {participants.length}/5</span>) : (<></>)}
                                <div className={` ${width > 800 ? 'flex flex-row' : 'grid grid-cols-2'} gap-2`}>
                                    {participants.map((participant, index) => {
                                        return (
                                            <button key={index} type="button" onClick={() => {
                                                setActiveParticipant(participant)
                                                setParticipantContact(participant.contact)
                                                setParticipantFirstName(participant.firstName)
                                                setParticipantLastName(participant.lastName)
                                                setParticipantMiddleName(participant.middleName)
                                                setParticipantPreferredName(participant.preferredName)
                                                setParticipantEmail(participant.email)
                                                setParticipantSameDetails(false)
                                            }}>
                                                <Badge color={activeParticipant?.id === participant.id ? 'red' : 'blue'} >
                                                    {`${participant.preferredName ? participant.preferredName : participant.firstName} ${participant.lastName}`}
                                                </Badge>
                                            </button>
                                            
                                        )
                                    })}
                                </div>
                            </div>
                            <div className={`flex ${width < 500 ? 'flex-col' : 'flex-row'} justify-between mb-4`}>
                                <div className={`flex flex-col gap-1 ${width > 500 ? 'w-[45%]' : 'w-full mb-4' }`}>
                                    <Label className="ms-2 font-medium text-lg" htmlFor="participantFirstName">Participant First Name<sup className="italic text-red-600">*</sup>:</Label>
                                    <TextInput ref={participantFirstNameRef} theme={textInputTheme} sizing='lg' placeholder="First Name" type="text" id="participantFirstName" name="participantFirstName" 
                                        onChange={(event) => setParticipantFirstName(event.target.value)}
                                        value={participantFirstName}
                                    />
                                </div>
                                <div className={`flex flex-col gap-1 ${width > 500 ? 'w-[45%]' : 'w-full' }`}>
                                    <Label className="ms-2 font-medium text-lg" htmlFor="participantLastName">Participant Last Name<sup className="italic text-red-600">*</sup>:</Label>
                                    <TextInput ref={participantLastNameRef} theme={textInputTheme} sizing='lg' placeholder="Last Name" type="text" id="participantLastName" name="participantLastName" 
                                        onChange={(event) => setParticipantLastName(event.target.value)}
                                        value={participantLastName}
                                    />
                                </div>
                            </div>
                            <div className={`flex ${width < 500 ? 'flex-col' : 'flex-row'} justify-between mb-4`}>
                            <div className={`flex flex-col gap-1 ${width > 500 ? 'w-[45%]' : 'w-full mb-4' }`}>
                                <Label className="ms-2 font-medium text-lg" htmlFor="participantMiddleName">Participant Middle Name:</Label>
                                <TextInput theme={textInputTheme} sizing='lg' placeholder="Middle Name" type="text" id="participantMiddleName" name="participantMiddleName" 
                                    onChange={(event) => setParticipantMiddleName(event.target.value)}
                                    value={participantMiddleName}
                                />
                            </div>
                            <div className={`flex flex-col gap-1 ${width > 500 ? 'w-[45%]' : 'w-full' }`}>
                                <Label className="ms-2 font-medium text-lg" htmlFor="participantPreferredName">Participant Preferred Name:</Label>
                                <TextInput theme={textInputTheme} sizing='lg' placeholder="Preferred Name" type="text" id="participantPreferredName" name="participantPreferredName" 
                                    onChange={(event) => setParticipantPreferredName(event.target.value)}
                                    value={participantPreferredName}
                                />
                            </div>
                            </div>
                            <Label className="ms-2 font-medium text-lg" htmlFor="participantEmail">Participant Email:</Label>
                            <TextInput theme={textInputTheme} sizing='lg' className="mb-4 max-w-[28rem]" placeholder="Participant's Email" type="email" id="participantEmail" name="participantEmail" 
                                onChange={(event) => setParticipantEmail(event.target.value)}
                                value={participantEmail}
                            />
                            <button className="flex flex-row gap-2 text-left items-center mb-2" onClick={() => setParticipantContact(!participantContact)} type="button">
                                <Checkbox className="mt-1" checked={participantContact} readOnly />
                                <span>Have notifications sent to participant's email</span>
                            </button>
                            <button className="flex flex-row gap-2 text-left items-center disabled:text-gray-400 disabled:cursor-not-allowed mb-2" onClick={() => {
                                    if(!participantSameDetails){
                                        setParticipantFirstName(userFirstName)
                                        setParticipantLastName(userLastName)
                                        setParticipantEmail(userEmail)
                                        setParticipantSameDetails(true)
                                    }
                                    else{
                                        setParticipantFirstName(undefined)
                                        setParticipantLastName(undefined)
                                        setParticipantEmail(undefined)
                                        setParticipantSameDetails(false)
                                    }
                                }} type="button" disabled={calculateUserDetails() < 3}>
                                <Checkbox className="mt-1" checked={participantSameDetails} readOnly />
                                <span>Same Details as User Details</span>
                            </button>
                            <p className="italic text-sm mb-4"><sup >*</sup>If you have more than one participant, submit your participant first then add another!</p>
                            <div className={`w-full flex ${width < 830 ? 'flex-col' : 'flex-row'} justify-end gap-2`}>
                                {activeParticipant ? (
                                    <Button color="light" 
                                        onClick={() => {
                                            setParticipants(participants.filter((participant) => participant.id !== activeParticipant.id))
                                            setActiveParticipant(undefined)
                                            setParticipantContact(false)
                                            setParticipantFirstName('')
                                            setParticipantLastName('')
                                            setParticipantMiddleName('')
                                            setParticipantPreferredName('')
                                            setParticipantEmail('')
                                            setParticipantSameDetails(false)
                                        }}
                                    type="button">Delete Participant</Button>) : (<></>)}
                                {participants.length < 5 && (
                                    <Button disabled={calculateParticipantDetails() < 2} onClick={() => {
                                        setActiveParticipant(undefined)
                                        setParticipantContact(false)
                                        setParticipantFirstName('')
                                        setParticipantLastName('')
                                        setParticipantMiddleName('')
                                        setParticipantPreferredName('')
                                        setParticipantEmail('')
                                        setParticipantSameDetails(false)
                                    }}>Add Participant</Button>
                                )}
                                <Button disabled={calculateParticipantDetails() < 2} isProcessing={participantSubmitting} onClick={async () => {
                                    setParticipantSubmitting(true)
                                    if(activeParticipant === undefined){
                                        const uid = v4()
                                        const participant: SignupParticipant = {
                                            sameDetails: participantSameDetails,
                                            firstName: participantFirstName!,
                                            lastName: participantLastName!,
                                            id: uid,
                                            userTags: [],
                                            contact: participantContact,
                                            middleName: participantMiddleName,
                                            preferredName: participantPreferredName,
                                            email: participantEmail,
                                            userEmail: userEmail ?? '',
                                            notifications: []
                                        }
                                        const temp: SignupParticipant[] = [...participants, participant]
                                        await new Promise(resolve => setTimeout(resolve, 500))
                                        setParticipantSubmitting(false)
                                        setParticipants(temp)
                                        setActiveParticipant(participant)
                                    } else if(activeParticipant !== undefined) {
                                        const updatedParticipant = {
                                            ...activeParticipant,
                                            sameDetails: participantSameDetails,
                                            firstName: participantFirstName!,
                                            lastName: participantLastName!,
                                            contact: participantContact,
                                            middleName: participantMiddleName,
                                            preferredName: participantPreferredName,
                                            email: participantEmail,
                                        }
                                        const temp = participants.map((participant) => {
                                            return participant.id == updatedParticipant.id ? updatedParticipant : participant
                                        })
                                        await new Promise(resolve => setTimeout(resolve, 500))
                                        setParticipantSubmitting(false)
                                        setParticipants(temp)
                                        setActiveParticipant(updatedParticipant)
                                    }
                                }} type="button">{activeParticipant ? 'Update' : 'Submit' } Participant</Button>
                            </div>
                        </div>
                        <div className="text-xl flex flex-row items-center">
                            <span>Create Password</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Label className="ms-2 font-medium text-lg" htmlFor="password">Password<sup className="italic text-red-600">*</sup>:</Label>
                            <TextInput theme={textInputTheme} sizing='lg' className="" placeholder="Password" type="password" id="password" name="password" 
                                onChange={(event) => {
                                    const password = event.target.value
                                    
                                    setPassword(password)
                                    setPasswordMatch(password === confirmPassword)
                                    setPasswordNumber(/\d/.test(password))
                                    setPasswordSpecialCharacter(/[!@#$%^&*(),.?":{}|<>]/.test(password))
                                    setPasswordUpperCharacter(/[A-Z]/.test(password))
                                    setPasswordLowerCharacter(/[a-z]/.test(password))
                                    setPasswordMinCharacters(password.length >= 8)
                                }}
                                helperText={
                                    (<div className="-mt-2 mb-4 ms-2 text-sm">
                                        <span>
                                            Your password must 
                                            <span className={`${passwordMatch ? 'text-green-500' : 'text-red-600'}`}> match</span> and include: a 
                                            <span className={`${passwordNumber ? 'text-green-500' : 'text-red-600'}`}> number</span>, 
                                            <span className={`${passwordSpecialCharacter ? 'text-green-500' : 'text-red-600'}`}> special character</span>, 
                                            <span className={`${passwordUpperCharacter ? 'text-green-500' : 'text-red-600'}`}> upper</span> and 
                                            <span className={`${passwordLowerCharacter ? 'text-green-500' : 'text-red-600'}`}> lower</span> case characters, and 
                                            <span className={`${passwordMinCharacters ? 'text-green-500' : 'text-red-600'}`}> at least 8 characters</span>.</span>
                                    </div>)
                                }
                            />
                            <Label className="ms-2 font-medium text-lg" htmlFor="confirmPassword">Confirm Password<sup className="italic text-red-600">*</sup>:</Label>
                            <TextInput theme={textInputTheme} sizing='lg'  placeholder="Password" type="password" id="confirmPassword" name="confirmPassword" 
                                onChange={(event) => {
                                    const confirmPassword = event.target.value

                                    setConfirmPassword(confirmPassword)
                                    setPasswordMatch(password === confirmPassword)
                                }}/>
                            <p className="italic text-sm"><sup className="italic text-red-600">*</sup> Indicates required fields.</p>
                            <p className="italic text-sm"><sup className="text-gray-400">1</sup> US Phone numbers only, without country code. No special formatting needed.</p>
                            <div className="flex flex-row text-left items-center gap-2">
                                <button className="flex flex-row gap-2 text-left items-center" onClick={() => setTermsAndConditions(!termsAndConditions)} type="button">
                                    <Checkbox className="mt-1" checked={termsAndConditions} readOnly />
                                    <span>Agree to <span className="hover:underline underline-offset-2 hover:cursor-pointer text-blue-500 hover:text-blue-700" onClick={() => setTermsAndConditionsVisible(true)}>terms and conditions</span><sup className="italic text-red-600">*</sup></span>
                                    
                                </button>
                            </div>
                            <button className="flex flex-row gap-2 text-left items-center mb-2" onClick={() => setPreferredContact(!preferredContact)} type="button">
                                <Checkbox className="mt-1" checked={preferredContact} readOnly />
                                <span>Prefer to be contacted by phone</span>
                            </button>
                            <div className="flex justify-between text-left items-center mb-4">
                                <a href='login' className="text-blue-500 hover:underline mb-2">Already have an Account? Login here!</a>
                                <Button className="text-xl w-[40%] max-w-[8rem]" type="submit" disabled={validate()} onClick={() => setFormSubmitting(true)} isProcessing={formSubmitting}>Register</Button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </>
    )
}