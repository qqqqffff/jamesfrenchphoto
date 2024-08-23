import { Amplify } from "aws-amplify";
import { FormEvent } from "react";
import outputs from '../../../amplify_outputs.json'
import { signIn, signUp } from "aws-amplify/auth";
import { Button, Label, TextInput } from "flowbite-react";
import { useNavigate } from "react-router-dom";

Amplify.configure(outputs)

interface SignInFormElements extends HTMLFormControlsCollection {
    email: HTMLInputElement
    password: HTMLInputElement
}

interface SignUpFormElements extends SignInFormElements {
    confirmEmail: HTMLInputElement
    firstName: HTMLInputElement
    lastName: HTMLInputElement
    phoneNumber: HTMLInputElement
}

interface SignInForm extends HTMLFormElement{
    readonly elements: SignInFormElements
}

interface SignUpForm extends HTMLFormElement{
    readonly elements: SignUpFormElements
}

export function SignIn() {
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
        navigate('/client')
    }

    return (
        <>
            <form className='flex flex-col items-center justify-center font-main ' onSubmit={handlesubmit}>
                <div className="flex flex-col items-center justify-center w-[50%] max-w-[48rem] border-4 border-gray-500 rounded-lg">
                    <p className="font-bold text-4xl mb-8 mt-2">Welcome Back</p>
                    <div className="flex flex-col gap-3 w-[60%] max-w-[32rem] ">
                        <Label className="ms-2 font-semibold text-xl" htmlFor="email">Email:</Label>
                        <TextInput sizing='lg' className="mb-4" placeholder="Email" type="email" id="email" name="email" required/>
                        <Label className="ms-2 font-semibold text-xl" htmlFor="password">Password:</Label>
                        <TextInput sizing='lg' className="mb-4" placeholder="Password" type="password" id="password" name="password" required/>
                        <div className="flex justify-between">
                            <a href='register' className="text-blue-500 hover:underline">No Account? Purchase a package first!</a>
                            <Button className="text-xl w-[40%] max-w-[8rem] mb-6" type="submit" >Login</Button>
                        </div>
                    </div>
                </div>
            </form>
        </>
    )
}

export function SignUp(){
    async function handlesubmit(event: FormEvent<SignUpForm>){
        event.preventDefault()
        const form = event.currentTarget;

        //TODO: preform validation

        await signUp({
            username: form.elements.email.value,
            password: form.elements.password.value,
            options: {
                userAttributes: {
                    email: form.elements.email.value,
                    phone_number: form.elements.phoneNumber.value,
                    given_name: form.elements.firstName.value,
                    family_name: form.elements.lastName.value,
                }
            }
        })
    }

    return (
        <form onSubmit={handlesubmit}>
            <label htmlFor="firstName">First Name:</label>
            <input type="text" id="firstName" name="firstName" />
            <label htmlFor="lastName">Last Name:</label>
            <input type="text" id="lastName" name="lastName" />
            <label htmlFor="phoneNumber">Phone Number:</label>
            <input type="text" id="phoneNumber" name="phoneNumber" />
            <label htmlFor="email">Email:</label>
            <input type="text" id="email" name="email" />
            <label htmlFor="confirmEmail">Confirm Email:</label>
            <input type="text" id="confirmEmail" name="confirmEmail" />
            <label htmlFor="password">Password:</label>
            <input type="password" id="password" name="password" />
            <input type="submit" />
        </form>
    )
}