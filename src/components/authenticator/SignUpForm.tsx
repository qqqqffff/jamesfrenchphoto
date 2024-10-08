import { generateClient } from "aws-amplify/api"
import { confirmSignUp, signUp } from "aws-amplify/auth"
import { Button, Label, Modal, TextInput } from "flowbite-react"
import { FormEvent, useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Schema } from "../../../amplify/data/resource"

const client = generateClient<Schema>()

interface SignUpFormElements extends HTMLFormControlsCollection {
    email: HTMLInputElement
    password: HTMLInputElement
    confirmPassword: HTMLInputElement
    firstName: HTMLInputElement
    lastName: HTMLInputElement
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
    email?: string;
    auth?: string;
}

export default function SignUp(){
    const [openModal, setOpenModal] = useState(false);
    const [username, setUsername] = useState('');
    const [serachParams] = useSearchParams()
    const [signupPrefilledElements] = useState<PrefilledElements | undefined>()
    const navigate = useNavigate()

    useEffect(() => {
        async function verify() {
            if([...serachParams].length <= 0){
                console.log('no params')
            }
            else{
                const formPrereqs: PrefilledElements = Object.fromEntries([...serachParams]) as PrefilledElements
                if(!formPrereqs.email || !formPrereqs.auth){
                    console.log('bad request')
                }
                else{
                    // const response = await client.models.TemporaryCreateUsersTokens.get({ id: formPrereqs.auth })
                    const response = await client.models.TemporaryCreateUsersTokens.list()

                    console.log(response)

                    // if(response.data && response.data.id == formPrereqs.auth){
                    //     if(new Date(response.data.expires).getTime() > new Date().getTime()){
                    //         setSignupPrefilledElements(formPrereqs)
                    //     }
                    //     else{
                    //         //Expired
                    //         const deleteResponse = await client.models.TemporaryCreateUsersTokens.delete({ id: formPrereqs.auth })
                    //         console.log(deleteResponse)
                    //     }
                    // }
                    
                    console.log('good request')
                    
                }
            }
        }
        verify()
    }, [])
    

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
                        // phone_number: form.elements.phoneNumber.value,
                        given_name: form.elements.firstName.value,
                        family_name: form.elements.lastName.value,
                    }
                }
            })
            if(response.nextStep) {
                setUsername(form.elements.email.value)
                setOpenModal(true);
            }

        } catch(err) {
            //todo error handling
            console.log(err)
        }
    }

    async function handleCodeSubmit(event: FormEvent<AuthCodeForm>){
        event.preventDefault()
        const form = event.currentTarget;

        try{
            const response = await confirmSignUp({
                username: username,
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
            console.log(err)
        }
    }




    return (
        <>
            <Modal show={openModal} onClose={() => setOpenModal(false)}>
                <Modal.Header>Verification Code</Modal.Header>
                <Modal.Body className="flex flex-col gap-3 font-main">
                    <form onSubmit={handleCodeSubmit}>
                        <p>Please enter in the verification code sent to the email associated with this account.</p>
                        <div className="flex items-center gap-4 mt-4">
                            <Label className="font-medium text-lg" htmlFor="authCode">Verification Code:</Label>
                            <TextInput className='' sizing='md' placeholder="Verification Code" type="number" id="authCode" name="authCode"/>
                        </div>
                        <div className="flex flex-row justify-end gap-4 mt-4">
                            <Button className="text-xl w-[40%] max-w-[8rem] mb-6">Resend</Button>
                            <Button className="text-xl w-[40%] max-w-[8rem] mb-6" type="submit">Submit</Button>
                        </div>
                    </form>
                </Modal.Body>
            </Modal>
            <form className='flex flex-col items-center justify-center font-main' onSubmit={handleSubmit}>
                <div className="flex flex-col items-center justify-center w-[50%] max-w-[48rem] border-2 border-gray-500 ">
                    <p className="font-bold text-4xl mb-8 mt-2">Create an account</p>
                    <div className="flex flex-col gap-1 w-[60%] max-w-[32rem] ">
                        <div className="flex justify-between mb-4">
                            <div className="flex flex-col gap-1 w-[45%]">
                                <Label className="ms-2 font-medium text-lg" htmlFor="firstName">First Name<sup className="italic text-red-600">*</sup>:</Label>
                                <TextInput sizing='md' placeholder="First Name" type="text" id="firstName" name="firstName"/>
                            </div>
                            <div className="flex flex-col gap-1 w-[45%]">
                                <Label className="ms-2 font-medium text-lg" htmlFor="lastName">Last Name<sup className="italic text-red-600">*</sup>:</Label>
                                <TextInput sizing='md' placeholder="Last Name" type="text" id="lastName" name="lastName"/>
                            </div>
                        </div>
                        <Label className="ms-2 font-medium text-lg" htmlFor="phoneNumber">Phone Number:</Label>
                        <TextInput sizing='md' className="mb-4" placeholder="Phone Number" type="tel" id="phoneNumber" name="phoneNumber"/>
                        <Label className="ms-2 font-medium text-lg" htmlFor="email">Email<sup className="italic text-red-600">*</sup>:</Label>
                        <TextInput sizing='md' className="mb-4" placeholder="Email" type="email" id="email" name="email" disabled={true} defaultValue={signupPrefilledElements?.email} />
                        <Label className="ms-2 font-medium text-lg" htmlFor="password">Password<sup className="italic text-red-600">*</sup>:</Label>
                        <TextInput sizing='md' className="mb-4" placeholder="Password" type="password" id="password" name="password" />
                        <Label className="ms-2 font-medium text-lg" htmlFor="confirmPassword">Confirm Password<sup className="italic text-red-600">*</sup>:</Label>
                        <TextInput sizing='md'  placeholder="Password" type="password" id="confirmPassword" name="confirmPassword" />
                        <p className="italic text-sm mb-4"><sup className="italic text-red-600">*</sup> Indicates required fields</p>
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