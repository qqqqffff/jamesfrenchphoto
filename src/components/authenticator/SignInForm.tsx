import { FormEvent } from "react";
import { fetchAuthSession, fetchUserAttributes, getCurrentUser, signIn } from "aws-amplify/auth";
import { Button, Label, TextInput } from "flowbite-react";
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
    async function handlesubmit(event: FormEvent<SignInForm>) {
        event.preventDefault()
        const form = event.currentTarget;

        //TODO: preform validation

        const response = await signIn({
            username: form.elements.email.value,
            password: form.elements.password.value,
        })

        console.log(response)

        //TODO: route to user client/admin screens
        const user = await getCurrentUser();
        const session = await fetchAuthSession()
        const attributes = await fetchUserAttributes()
        const groups = JSON.stringify(session.tokens?.accessToken.payload['cognito:groups'])
        const profile = await client.models.UserProfile.get({email: user.userId}, {authToken: session.tokens?.accessToken.toString()})

        window.localStorage.setItem('user', JSON.stringify({
            user: user, 
            session: session,
            attributes: attributes, 
            groups: groups, 
            profile: profile
        }))
        console.log(groups)

        if(groups.includes('ADMINS')){
            navigate('/admin/dashboard')
        }
        else if(groups.includes('USERS')){
            navigate('/client/dashboard')
        }
        
    }

    return (
        <>
            <form className='flex flex-col items-center justify-center font-main mt-12' onSubmit={handlesubmit}>
                <div className="flex flex-col items-center justify-center w-[50%] max-w-[48rem] border-4 border-gray-500 rounded-lg">
                    <p className="font-bold text-4xl mb-8 mt-2">Welcome Back</p>
                    <div className="flex flex-col gap-3 w-[60%] max-w-[32rem] ">
                        <Label className="ms-2 font-semibold text-xl" htmlFor="email">Email:</Label>
                        <TextInput sizing='lg' className="mb-4" placeholder="Email" type="email" id="email" name="email" />
                        <Label className="ms-2 font-semibold text-xl" htmlFor="password">Password:</Label>
                        <TextInput sizing='lg' className="mb-4" placeholder="Password" type="password" id="password" name="password" />
                        <div className="flex justify-between">
                            <a href='contact-form' className="text-blue-500 hover:underline">No Account? Purchase a package first!</a>
                            <Button className="text-xl w-[40%] max-w-[8rem] mb-6" type="submit" >Login</Button>
                        </div>
                    </div>
                </div>
            </form>
        </>
    )
}

