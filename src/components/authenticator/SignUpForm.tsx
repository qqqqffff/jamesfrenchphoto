import { generateClient } from "aws-amplify/api"
import { confirmSignUp, resendSignUpCode, signUp } from "aws-amplify/auth"
import { Alert, Button, Checkbox, Label, Modal, TextInput } from "flowbite-react"
import { FormEvent, useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Schema } from "../../../amplify/data/resource"
import { textInputTheme } from "../../utils"
import { TermsAndConditionsModal } from "../modals/TermsAndConditions"
import useWindowDimensions from "../../hooks/windowDimensions"


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

type PrefilledElements = {
    hash?: string;
}

export default function SignUp(){
    const [openModal, setOpenModal] = useState(false);
    const [termsAndConditionsVisible, setTermsAndConditionsVisible] = useState(false)
    const [serachParams] = useSearchParams()
    const [signupPrefilledElements, setSignupPrefilledElements] = useState<PrefilledElements | undefined>()
    const [apiCall, setApiCall] = useState(false)
    const [participantContact, setParticipantContact] = useState(false)
    const [preferredContact, setPreferredContact] = useState(false)
    const [termsAndConditions, setTermsAndConditions] = useState(false)

    const [password, setPassword] = useState<string>()
    const [confirmPassword, setConfirmPassword] = useState<string>()

    const [passwordNumber, setPasswordNumber] = useState(false)
    const [passwordSpecialCharacter, setPasswordSpecialCharacter] = useState(false)
    const [passwordMinCharacters, setPasswordMinCharacters] = useState(false)
    const [passwordUpperCharacter, setPasswordUpperCharacter] = useState(false)
    const [passwordLowerCharacter, setPasswordLowerCharacter] = useState(false)
    const [passwordMatch, setPasswordMatch] = useState(false)
    
    const [parentFirstName, setParentFirstName] = useState<string>()
    const [parentLastName, setParentLastName] = useState<string>()
    const [parentEmail, setParentEmail] = useState<string>()
    const [participantEmail, setParticipantEmail] = useState<string>()
    const [participantFirstName, setParticipantFirstName] = useState<string>()
    const [participantLastName, setParticipantLastName] = useState<string>()

    const [formErrors, setFormErrors] = useState<string[]>([])
    const [invalidCode, setInvalidCode] = useState(false)

    const [authCode, setAuthCode] = useState<number>()
    const [formSubmitting, setFormSubmitting] = useState(false)
    const [codeSubmitting, setCodeSubmitting] = useState(false)

    const navigate = useNavigate()
    const { width } = useWindowDimensions()

    useEffect(() => {
        async function api() {
            if([...serachParams].length <= 0){
                console.log('no params')
                setApiCall(true)
            }
            else{
                if(window.localStorage.getItem('user')){
                    setFormErrors(['You are already logged in! If you want to create a new account please sign out of your current account first.'])
                    setApiCall(true)
                    return
                }

                const formPrereqs: PrefilledElements = Object.fromEntries([...serachParams]) as PrefilledElements

                if(!formPrereqs.hash){
                    setFormErrors(['No Event Code. If you think this is an error, request a new link from us at contact@jamesfrenchphotography.com'])
                    setApiCall(true)
                    return
                }

                setSignupPrefilledElements(formPrereqs)
                setApiCall(true)
            }
        }
        if(!apiCall){
            api()
        }
    }, [])
    

    async function handleSubmit(event: FormEvent<SignUpForm>){
        event.preventDefault()
        const form = event.currentTarget;

        if(!form.elements.email.value) {
            setFormErrors(['Parent email missmatch or missing, try reloading!'])
            setFormSubmitting(false)
            return
        }

        if(validate()) {
            setFormErrors(['Invalid form, fill out required fields!'])
            setFormSubmitting(false)
            return
        }

        const response = signupPrefilledElements && signupPrefilledElements.hash ? 
            await client.models.TemporaryCreateUsersTokens.get(
                { id : signupPrefilledElements.hash },
                { authMode: 'iam' }
            ) : undefined
        
        console.log(response)

        const responseTags: string[] = response && response.data && response.data.tags ? response.data.tags as string[] : []
        const sittingNumber = (250_000 + (Math.random() * 99_998) + 1).toFixed(0)
        const parentEmail = form.elements.email.value

        try {
            const profileCreateResponse = await client.models.UserProfile.create({
                sittingNumber: Number.parseInt(sittingNumber),
                email: parentEmail,
                participantEmail: participantEmail!,
                userTags: responseTags,
                participantFirstName: participantFirstName!,
                participantLastName: participantLastName!,
                participantMiddleName: form.elements.participantMiddleName.value ? form.elements.participantMiddleName.value : undefined,
                participantPreferredName: form.elements.participantPreferredName.value ? form.elements.participantPreferredName.value : undefined,
                preferredContact: preferredContact ? 'PHONE' : 'EMAIL',
                participantContact: participantContact,
            },
            { authMode: 'iam' }
            )

            console.log(profileCreateResponse)

            if(profileCreateResponse.errors && profileCreateResponse.errors.length > 0){
                throw new Error(JSON.stringify(profileCreateResponse.errors.map((error) => error.errorType)))
            }

            const response = await signUp({
                username: parentEmail,
                password: password!,
                options: {
                    userAttributes: {
                        email: parentEmail!,
                        phone_number: form.elements.phoneNumber.value ? `+1${form.elements.phoneNumber.value}` : undefined,
                        given_name: parentFirstName,
                        family_name: parentLastName,
                        'custom:verified': 'true'
                    }
                }
            })

            console.log(response)
            if(response.nextStep.signUpStep !== 'DONE') {
                setOpenModal(true);
                setFormSubmitting(false);
                setParentEmail(form.elements.email.value)
            }
            else{
                setFormSubmitting(false)
                navigate('/login', {
                    state: {
                        createAccountSuccess: true
                    }
                })
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
                username: parentEmail!,
                confirmationCode: form.elements.authCode.value,
            })

            if(response.isSignUpComplete){
                navigate('/login', {
                    state: {
                        createAccountSuccess: true
                    }
                })
            }
        }catch(err){
            //todo error handling
            const error = err as Error
            console.log(error)
            setInvalidCode(true)
        }
        setCodeSubmitting(false)
    }

    function validate(): boolean {
        return (parentFirstName === undefined || 
            parentLastName === undefined ||
            participantEmail === undefined || 
            participantFirstName === undefined ||
            participantLastName === undefined ||
            parentEmail === undefined) ||
            !(passwordMatch &&
            passwordNumber &&
            passwordSpecialCharacter &&
            passwordUpperCharacter &&
            passwordLowerCharacter && 
            passwordMinCharacters &&
            termsAndConditions)
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
                        <p>Please enter in the verification code sent to the parent's email.</p>
                        <p><b>Do not close this window until account has been confirmed.</b></p>
                        <div className="flex items-center gap-4 mt-4">
                            <Label className="font-medium text-lg" htmlFor="authCode">Verification Code:</Label>
                            <TextInput color={invalidCode ? 'failure' : undefined} className='' sizing='md' placeholder="Verification Code" type="number" id="authCode" name="authCode" onChange={(event) => {
                                setInvalidCode(false)
                                setAuthCode(event.target.valueAsNumber)
                                console.log(authCode)
                            }} helperText={ invalidCode ? (
                                <div className="-mt-2 mb-4 ms-2 text-sm">
                                    <span>Invalid Code</span>
                                </div>) : (<></>)}/>
                        </div>
                        <div className="flex flex-row justify-end gap-4 mt-4">
                            <Button className="text-xl w-[40%] max-w-[8rem] mb-6" onClick={() => {
                                resendSignUpCode({
                                    username: parentEmail!
                                })
                            }}>Resend</Button>
                            <Button className="text-xl w-[40%] max-w-[8rem] mb-6" type="submit" onClick={() => setCodeSubmitting(true)} isProcessing={codeSubmitting}>Submit</Button>
                        </div>
                    </form>
                </Modal.Body>
            </Modal>
            <TermsAndConditionsModal open={termsAndConditionsVisible} onClose={() => setTermsAndConditionsVisible(false)} />
            <form className={`flex flex-col items-center justify-center font-main my-12 w-full ${width > 500 ? 'px-4' : 'px-0'}`} onSubmit={handleSubmit}>
                <div className={`flex flex-col items-center justify-center ${width > 500 ? 'w-[60%]' : 'w-full'} max-w-[48rem] border-2 px-4 py-4 border-gray-500`}>
                    <p className="font-bold text-4xl mb-8 text-center">Create an account</p>
                    <div className="flex flex-col gap-1 w-[80%] max-w-[40rem]">
                        <div className={`flex ${width < 500 ? 'flex-col' : 'flex-row'} justify-between mb-4`}>
                            <div className={`flex flex-col gap-1 ${width > 500 ? 'w-[45%]' : 'w-full mb-4' }`}>
                                <Label className="ms-2 font-medium text-lg" htmlFor="firstName">Parent First Name<sup className="italic text-red-600">*</sup>:</Label>
                                <TextInput theme={textInputTheme} sizing='lg' placeholder="First Name" type="text" id="firstName" name="firstName" onChange={(event) => setParentFirstName(event.target.value)}/>
                            </div>
                            <div className={`flex flex-col gap-1 ${width > 500 ? 'w-[45%]' : 'w-full' }`}>
                                <Label className="ms-2 font-medium text-lg" htmlFor="lastName">Parent Last Name<sup className="italic text-red-600">*</sup>:</Label>
                                <TextInput theme={textInputTheme} sizing='lg' placeholder="Last Name" type="text" id="lastName" name="lastName" onChange={(event) => setParentLastName(event.target.value)}/>
                            </div>
                        </div>
                        <Label className="ms-2 font-medium text-lg" htmlFor="phoneNumber">Parent Phone Number<sup className="text-gray-400">1</sup>:</Label>
                        <TextInput theme={textInputTheme} sizing='lg' className="mb-4 max-w-[28rem] text-xl" placeholder="10-Digit Phone Number of format 1234567890" type="tel" id="phoneNumber" name="phoneNumber"/>
                        <Label className="ms-2 font-medium text-lg" htmlFor="email">Parent Email<sup className="text-gray-400">2</sup><sup className="italic text-red-600">*</sup>:</Label>
                        <TextInput theme={textInputTheme} sizing='lg' className="mb-4 max-w-[28rem]" placeholder="Email" type="email" id="email" name="email" onChange={(event) => setParentEmail(event.target.value)}/>
                        <Label className="ms-2 font-medium text-lg" htmlFor="participantEmail">Participant Email<sup className="italic text-red-600">*</sup>:</Label>
                        <TextInput theme={textInputTheme} sizing='lg' className="mb-4 max-w-[28rem]" placeholder="Participant's Email" type="email" id="participantEmail" name="participantEmail" onChange={(event) => setParticipantEmail(event.target.value)}/>
                        <div className={`flex ${width < 500 ? 'flex-col' : 'flex-row'} justify-between mb-4`}>
                            <div className={`flex flex-col gap-1 ${width > 500 ? 'w-[45%]' : 'w-full mb-4' }`}>
                                <Label className="ms-2 font-medium text-lg" htmlFor="participantFirstName">Participant First Name<sup className="italic text-red-600">*</sup>:</Label>
                                <TextInput theme={textInputTheme} sizing='lg' placeholder="First Name" type="text" id="participantFirstName" name="participantFirstName" onChange={(event) => setParticipantFirstName(event.target.value)}/>
                            </div>
                            <div className={`flex flex-col gap-1 ${width > 500 ? 'w-[45%]' : 'w-full' }`}>
                                <Label className="ms-2 font-medium text-lg" htmlFor="participantLastName">Participant Last Name<sup className="italic text-red-600">*</sup>:</Label>
                                <TextInput theme={textInputTheme} sizing='lg' placeholder="Last Name" type="text" id="participantLastName" name="participantLastName" onChange={(event) => setParticipantLastName(event.target.value)}/>
                            </div>
                        </div>
                        <div className={`flex ${width < 500 ? 'flex-col' : 'flex-row'} justify-between mb-4`}>
                            <div className={`flex flex-col gap-1 ${width > 500 ? 'w-[45%]' : 'w-full mb-4' }`}>
                                <Label className="ms-2 font-medium text-lg" htmlFor="participantMiddleName">Participant Middle Name:</Label>
                                <TextInput theme={textInputTheme} sizing='lg' placeholder="Middle Name" type="text" id="participantMiddleName" name="participantMiddleName"/>
                            </div>
                            <div className={`flex flex-col gap-1 ${width > 500 ? 'w-[45%]' : 'w-full' }`}>
                                <Label className="ms-2 font-medium text-lg" htmlFor="participantPreferredName">Participant Preferred Name:</Label>
                                <TextInput theme={textInputTheme} sizing='lg' placeholder="Preferred Name" type="text" id="participantPreferredName" name="participantPreferredName"/>
                            </div>
                        </div>
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
                        <p className="italic text-sm"><sup className="text-gray-400">2</sup> For security purposes, parent email fields are uneditable as accounts are secure and unique!</p>
                        <p className="italic text-sm mb-4">Note: Parent's email is used for account <strong>login and verification. A code will be sent to the parents email</strong> as a part of the next account verification step.</p>
                        <div className="flex flex-row text-left items-center gap-2">
                            <button className="flex flex-row gap-2 text-left items-center" onClick={() => setTermsAndConditions(!termsAndConditions)} type="button">
                                <Checkbox className="mt-1" checked={termsAndConditions} readOnly />
                                <span>Agree to <span className="hover:underline underline-offset-2 hover:cursor-pointer text-blue-500 hover:text-blue-700" onClick={() => setTermsAndConditionsVisible(true)}>terms and conditions</span></span>
                            </button>
                        </div>
                        
                        <button className="flex flex-row gap-2 text-left items-center" onClick={() => setParticipantContact(!participantContact)} type="button">
                            <Checkbox className="mt-1" checked={participantContact} readOnly />
                            <span>Have notifications sent to participant's email</span>
                        </button>
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
            </form>
        </>
    )
}