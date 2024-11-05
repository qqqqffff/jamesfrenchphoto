import { FormEvent, useState } from "react";
import { fetchAuthSession, fetchUserAttributes, getCurrentUser, signIn } from "aws-amplify/auth";
import { Alert, Button, Label, TextInput } from "flowbite-react";
import { useNavigate } from "react-router-dom";
import { generateClient } from "aws-amplify/api";
import { Schema } from "../../../amplify/data/resource";

//todo: split into different classes
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
    const [formErrors, setFormErrors] = useState<string[]>([])
    const [submitting, setSubmitting] = useState(false)

    const [email, setEmail] = useState<string>()
    const [password, setPassword] = useState<string>()

    async function handlesubmit(event: FormEvent<SignInForm>) {
        event.preventDefault()
        const form = event.currentTarget;

        try{
            const response = await signIn({
                username: form.elements.email.value,
                password: form.elements.password.value,
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
        } catch(err){
            const error = err as Error
            console.log(error.message)
            setFormErrors([error.message])
            setSubmitting(false)
        }
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
            <form className='flex flex-col items-center justify-center font-main mt-12' onSubmit={(event: FormEvent<SignInForm>) => {
                handlesubmit(event)
                setSubmitting(true)
            }}>
                <div className="flex flex-col items-center justify-center w-[50%] max-w-[48rem] border-4 border-gray-500 rounded-lg">
                    <p className="font-bold text-4xl mb-8 mt-2">Welcome Back</p>
                    <div className="flex flex-col gap-3 w-[60%] max-w-[32rem] ">
                        <Label className="ms-2 font-semibold text-xl" htmlFor="email">Email:</Label>
                        <TextInput sizing='lg' className="mb-4" placeholder="Email" type="email" id="email" name="email" onChange={(event) => setEmail(event.target.value)} />
                        <Label className="ms-2 font-semibold text-xl" htmlFor="password">Password:</Label>
                        <TextInput sizing='lg' className="mb-4" placeholder="Password" type="password" id="password" name="password" onChange={(event) => setPassword(event.target.value)}/>
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

