import { Amplify } from "aws-amplify";
import { FormEvent, useState } from "react";
import outputs from '../../../amplify_outputs.json'
import { confirmSignUp, signIn, signUp } from "aws-amplify/auth";
import { Button, Label, Modal, TextInput } from "flowbite-react";
import { useNavigate } from "react-router-dom";
// import { generateClient } from "aws-amplify/api";
// import { Schema } from "../../../amplify/data/resource";

Amplify.configure(outputs)
// const client = generateClient<Schema>()

interface SignInFormElements extends HTMLFormControlsCollection {
    email: HTMLInputElement
    password: HTMLInputElement
}

interface SignUpFormElements extends SignInFormElements {
    email: HTMLInputElement
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
        navigate('/client/dashboard')
    }

    return (
        <>
            <form className='flex flex-col items-center justify-center font-main ' onSubmit={handlesubmit}>
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

export function SignUp(){
    const [openModal, setOpenModal] = useState(false);

    async function handleSubmit(event: FormEvent<SignUpForm>){
        event.preventDefault()
        const form = event.currentTarget;

        //TODO: preform validation

        try{
            const response = await signUp({
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
            if(response.nextStep){
                setOpenModal(true);
            }

        } catch(err) {
            console.log(err)
        }
    }

    return (
        <>
            <Modal show={openModal} onClose={() => setOpenModal(false)}>
                <Modal.Header>Verification Code</Modal.Header>
                <Modal.Body>
                    <p>Please enter in the verification code sent to the email associated with this account!</p>
                    <Label className="ms-2 font-semibold text-xl" htmlFor="verificationCode">Verification Code</Label>
                    <TextInput sizing='lg' placeholder="Verification Code" type="number" id="verificationCode" name="verificationCode"/>
                </Modal.Body>
                <Modal.Footer>
                    <div className="flex flex-row justify-end gap-4">
                        <Button className="text-xl w-[40%] max-w-[8rem] mb-6" type="submit">Submit</Button>
                        <Button className="text-xl w-[40%] max-w-[8rem] mb-6">Resend</Button>
                        <Button className="text-xl w-[40%] max-w-[8rem] mb-6">Back</Button>
                    </div>
                </Modal.Footer>
            </Modal>
            <form className='flex flex-col items-center justify-center font-main ' onSubmit={handleSubmit}>
                <div className="flex flex-col items-center justify-center w-[50%] max-w-[48rem] border-4 border-gray-500 rounded-lg">
                    <p className="font-bold text-4xl mb-8 mt-2">Please create your account!</p>
                    <div className="flex flex-col gap-3 w-[60%] max-w-[32rem] ">
                        <div className="flex justify-between mb-4">
                            <div className="flex flex-col gap-3 w-[45%]">
                                <Label className="ms-2 font-semibold text-xl" htmlFor="firstName">First Name<sup>*</sup>:</Label>
                                <TextInput sizing='lg' placeholder="First Name" type="text" id="firstName" name="firstName"/>
                            </div>
                            <div className="flex flex-col gap-3 w-[45%]">
                                <Label className="ms-2 font-semibold text-xl" htmlFor="lastName">Last Name<sup>*</sup>:</Label>
                                <TextInput sizing='lg' placeholder="Last Name" type="text" id="lastName" name="lastName"/>
                            </div>
                        </div>
                        <Label className="ms-2 mb-3 font-semibold text-xl" htmlFor="phoneNumber">Phone Number:</Label>
                        <TextInput sizing='lg' className="mb-4" placeholder="Phone Number" type="tel" id="phoneNumber" name="phoneNumber"/>
                        <Label className="ms-2 font-semibold text-xl" htmlFor="email">Email<sup>*</sup>:</Label>
                        <TextInput sizing='lg' className="mb-4" placeholder="Email" type="email" id="email" name="email" />
                        <Label className="ms-2 font-semibold text-xl" htmlFor="confirmEmail">Confirm Email<sup>*</sup>:</Label>
                        <TextInput sizing='lg' className="mb-4" placeholder="Copnfirm Your Email" type="email" id="confirmEmail" name="confirmEmail" />
                        <Label className="ms-2 font-semibold text-xl" htmlFor="password">Password<sup>*</sup>:</Label>
                        <TextInput sizing='lg' className="mb-4" placeholder="Password" type="password" id="password" name="password" />
                        <Label className="ms-2 font-semibold text-xl" htmlFor="confirmPassword">Confirm Password<sup>*</sup>:</Label>
                        <TextInput sizing='lg'  placeholder="Password" type="password" id="confirmPassword" name="confirmPassword" />
                        <p className="italic text-sm mb-4"><sup>*</sup> Indicates required fields</p>
                        <div className="flex justify-between">
                            <a href='login' className="text-blue-500 hover:underline">Already have an Account? Login here!</a>
                            <Button className="text-xl w-[40%] max-w-[8rem] mb-6" type="submit" >Register</Button>
                        </div>
                    </div>
                </div>
            </form>
            </>
    )
}