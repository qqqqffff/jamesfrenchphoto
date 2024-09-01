import { Button, Label, Textarea, TextInput } from "flowbite-react"
import { FC, FormEvent } from "react"
import { useNavigate } from "react-router-dom"

interface IntentFormElements extends HTMLFormControlsCollection {
    message: HTMLButtonElement
    email: HTMLInputElement
    confirmEmail: HTMLInputElement
    firstName: HTMLInputElement
    lastName: HTMLInputElement
    phoneNumber?: HTMLInputElement
}

interface IntentFormFields extends HTMLFormElement{
    readonly elements: IntentFormElements
}

type Props = {}

const ContactForm: FC<Props> = ({}) => {
    const navigate = useNavigate()

    function handleSubmit(event: FormEvent<IntentFormFields>){
        event.preventDefault()
        const form = event.currentTarget
        form.elements.firstName
        form.elements.lastName
        form.elements.phoneNumber
        form.elements.email
        form.elements.message
        navigate('/',
            {
                state: {
                    contactSuccess: true
                }
            }
        )
    }

    return (
        <>
            <form className='flex flex-col items-center justify-center font-main ' onSubmit={handleSubmit}>
                <div className="flex flex-col items-center justify-center w-[60%] max-w-[48rem] border-4 border-gray-500 rounded-lg">
                    <p className="font-bold text-4xl mt-2 mb-8">Contact Us</p>
                    
                    <div className="flex flex-col w-[70%] max-w-[32rem] mt-8">
                        <p className="font-semibold text-2xl mt-2 mb-6 underline-offset-4 underline">Contact Information</p>
                        <div className="flex justify-between mb-4">
                            <div className="flex flex-col gap-3 w-[45%]">
                                <Label className="ms-2 font-semibold text-xl" htmlFor="firstName">First Name<sup>*</sup>:</Label>
                                <TextInput sizing='md' placeholder="First Name" type="text" id="firstName" name="firstName"/>
                            </div>
                            <div className="flex flex-col gap-3 w-[45%]">
                                <Label className="ms-2 font-semibold text-xl" htmlFor="lastName">Last Name<sup>*</sup>:</Label>
                                <TextInput sizing='md' placeholder="Last Name" type="text" id="lastName" name="lastName"/>
                            </div>
                        </div>
                        <Label className="ms-2 mb-3 font-semibold text-xl" htmlFor="phoneNumber">Phone Number:</Label>
                        <TextInput sizing='md' className="mb-4" placeholder="Phone Number" type="tel" id="phoneNumber" name="phoneNumber"/>
                        <Label className="ms-2 mb-3 font-semibold text-xl" htmlFor="email">Email<sup>*</sup>:</Label>
                        <TextInput sizing='md' className="mb-4" placeholder="Email" type="email" id="email" name="email"/>
                        <Label className="ms-2 mb-3 font-semibold text-xl" htmlFor="confirmEmail">Confirm Email<sup>*</sup>:</Label>
                        <TextInput sizing='md' className="mb-4" placeholder="Confirm Email" type="email" id="confirmEmail" name="confirmEmail"/>
                        <Label className="ms-2 mb-3 font-semibold text-xl" htmlFor="message">Message<sup>*</sup>:</Label>
                        <Textarea className="min-h-24 mb-4" placeholder="Message of desired service or intent" id="message" name="message"/>
                        <p className="italic text-sm"><sup>*</sup> Indicates required fields</p>
                        <div className="flex justify-end mt-12">
                            <Button className="text-xl w-[40%] max-w-[8rem] mb-6" type="submit" >Submit</Button>
                        </div>
                    </div>
                </div>
            </form>
        </>
    )
}

export default ContactForm