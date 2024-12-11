import { FormEvent, useEffect, useState } from "react";
import { confirmSignIn, fetchAuthSession, fetchUserAttributes, getCurrentUser, signIn } from "aws-amplify/auth";
import { Alert, Button, Label, Modal, TextInput } from "flowbite-react";
import { useNavigate } from "react-router-dom";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";
import useWindowDimensions from "../../hooks/windowDimensions";
import { textInputTheme } from "../../utils";

const client = generateClient<Schema>()

interface SignInFormElements extends HTMLFormControlsCollection {
    email: HTMLInputElement
    password: HTMLInputElement
}

interface SignInForm extends HTMLFormElement{
    readonly elements: SignInFormElements
}

export default function SignIn() {
    const navigate = useNavigate()
    const [notifications, setNotifications] = useState<string[]>([])
    const [formErrors, setFormErrors] = useState<string[]>([])
    const [submitting, setSubmitting] = useState(false)
    const { width } = useWindowDimensions()
    const [passwordResetVisible, setPasswordResetVisible] = useState(false)
    const [password, setPassword] = useState<string>()
    const [passwordNumber, setPasswordNumber] = useState(false)
    const [passwordSpecialCharacter, setPasswordSpecialCharacter] = useState(false)
    const [passwordMinCharacters, setPasswordMinCharacters] = useState(false)
    const [passwordUpperCharacter, setPasswordUpperCharacter] = useState(false)
    const [passwordLowerCharacter, setPasswordLowerCharacter] = useState(false)

    const [apiCall, setApiCall] = useState(false)

    useEffect(() => {
        async function api(){
            let components: string[] = []

            if(history.state && history.state.usr){
                if(history.state.usr.createAccountSuccess){
                    components.push('Successfully created user! Login with the parent\'s email and password you just set!')
                }
            }
            setNotifications(components)
            setApiCall(true)
        }
        
        if(!apiCall){
            api()
        }
    }, [])

    async function handlesubmit(event: FormEvent<SignInForm>) {
        event.preventDefault()
        const form = event.currentTarget;

        try{
            const response = await signIn({
                username: form.elements.email.value,
                password: form.elements.password.value,
            })

            if(response.nextStep.signInStep == 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'){
                setSubmitting(false)
                setPasswordResetVisible(true)
                return
            }

            const user = await getCurrentUser();
            const session = await fetchAuthSession()
            const attributes = await fetchUserAttributes()
            const groups = JSON.stringify(session.tokens?.accessToken.payload['cognito:groups'])
            const profile = await client.models.UserProfile.get({email: user.userId}, {authToken: session.tokens?.accessToken.toString()})
            console.log(profile)

            window.localStorage.setItem('user', JSON.stringify({
                user: user, 
                session: session,
                attributes: attributes, 
                groups: groups, 
                profile: profile
            }))
            console.log(groups)
            
            setSubmitting(false)
            if(groups.includes('ADMINS')){
                navigate('/admin/dashboard')
            }
            else if(groups.includes('USERS')){
                navigate('/client/dashboard')
            }
        } catch(err){
            const error = err as Error
            console.log(error.message)
            setFormErrors([error.message])
            setSubmitting(false)
        }
    }

    async function confirmSignInWithNewPassword(){
        try{
            const response = await confirmSignIn({
                challengeResponse: password!
            })
            console.log(response)

            const user = await getCurrentUser();
            const session = await fetchAuthSession()
            const attributes = await fetchUserAttributes()
            const groups = JSON.stringify(session.tokens?.accessToken.payload['cognito:groups'])
            const profile = await client.models.UserProfile.get({email: user.userId}, {authToken: session.tokens?.accessToken.toString()})
            console.log(profile)

            window.localStorage.setItem('user', JSON.stringify({
                user: user, 
                session: session,
                attributes: attributes, 
                groups: groups, 
                profile: profile
            }))
            console.log(groups)
            
            setSubmitting(false)
            if(groups.includes('ADMINS')){
                navigate('/admin/dashboard')
            }
            else if(groups.includes('USERS')){
                navigate('/client/dashboard')
            }
        }catch(err){
            const error = err as Error
            console.log(error.message)
            setFormErrors([error.message])
            setSubmitting(false)
        }
        
        setSubmitting(false)
    }

    return (
        <>
            <div className='flex flex-col'>
                {notifications.length > 0 ? (
                    notifications.map((element, index) => {
                        return (
                            <div key={index} className="flex justify-center items-center font-main mb-4">
                                <Alert color='green' className="text-lg w-[90%]" onDismiss={() => {setNotifications(notifications.filter((e) => e != element))}}>
                                    <p>{element}</p>
                                </Alert>
                            </div>
                        )
                    })
                ) : (
                    <></>
                )}
            </div>
            
            <Modal show={passwordResetVisible} onClose={() => setPasswordResetVisible(true)}>
                <Modal.Header>Reset Temporary Password</Modal.Header>
                <Modal.Body className="flex flex-col gap-2">
                    <Label className="ms-2 font-medium text-lg" htmlFor="password">New Password<sup className="italic text-red-600">*</sup>:</Label>
                    <TextInput theme={textInputTheme} sizing='lg' className="" placeholder="Password" type="password" id="password" name="password" 
                        onChange={(event) => {
                            const password = event.target.value
                            
                            setPassword(password)
                            setPasswordNumber(/\d/.test(password))
                            setPasswordSpecialCharacter(/[!@#$%^&*(),.?":{}|<>]/.test(password))
                            setPasswordUpperCharacter(/[A-Z]/.test(password))
                            setPasswordLowerCharacter(/[a-z]/.test(password))
                            setPasswordMinCharacters(password.length >= 8)
                        }}
                        helperText={
                            (<div className="-mt-2 mb-4 ms-2 text-sm">
                                <span>
                                    Your password must include: a 
                                    <span className={`${passwordNumber ? 'text-green-500' : 'text-red-600'}`}> number</span>, 
                                    <span className={`${passwordSpecialCharacter ? 'text-green-500' : 'text-red-600'}`}> special character</span>, 
                                    <span className={`${passwordUpperCharacter ? 'text-green-500' : 'text-red-600'}`}> upper</span> and 
                                    <span className={`${passwordLowerCharacter ? 'text-green-500' : 'text-red-600'}`}> lower</span> case characters, and 
                                    <span className={`${passwordMinCharacters ? 'text-green-500' : 'text-red-600'}`}> at least 8 characters</span>.</span>
                            </div>)
                        }
                    />
                </Modal.Body>
                <Modal.Footer className="flex flex-row justify-end">
                    <Button isProcessing={submitting} onClick={async () => {
                        confirmSignInWithNewPassword()
                        setSubmitting(true)
                    }} disabled={!(
                        passwordNumber &&
                        passwordSpecialCharacter &&
                        passwordUpperCharacter &&
                        passwordLowerCharacter && 
                        passwordMinCharacters)}>Submit</Button>
                </Modal.Footer>
            </Modal>
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
            <form className='flex flex-col items-center justify-center font-main mt-12' onSubmit={(event: FormEvent<SignInForm>) => {
                handlesubmit(event)
                setSubmitting(true)
            }}>
                <div className={`flex flex-col items-center justify-center ${width > 500 ? 'w-[50%]' : 'w-full px-6'} max-w-[48rem] border-4 border-gray-500 rounded-lg`}>
                    <p className="font-bold text-4xl mb-8 mt-2 text-center">Welcome Back</p>
                    <div className={`flex flex-col gap-3 ${width > 500 ? 'w-[60%]' : 'w-full px-6'}  max-w-[32rem]`}>
                        <Label className="ms-2 font-semibold text-xl" htmlFor="email">Email:</Label>
                        <TextInput sizing='lg' className="mb-4 w-full" placeholder="Email" type="email" id="email" name="email" />
                        <Label className="ms-2 font-semibold text-xl" htmlFor="password">Password:</Label>
                        <TextInput sizing='lg' className="mb-4 w-full" placeholder="Password" type="password" id="password" name="password" />
                        <div className="flex justify-end">
                            {/* <a href='contact-form' className="text-blue-500 hover:underline">No Account? Purchase a package first!</a> */}
                            <Button isProcessing={submitting} className="text-xl w-[40%] max-w-[8rem] mb-6" type="submit">Login</Button>
                        </div>
                    </div>
                </div>
            </form>
        </>
    )
}

