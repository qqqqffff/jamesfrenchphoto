import { Button, Carousel, Dropdown, Label, Radio, TextInput } from "flowbite-react";
import { FC, FormEvent, useState, type MouseEvent } from "react";
import { HiOutlineArrowRight, HiOutlineArrowLeft } from "react-icons/hi";
import TRFAttendantPackage from '../../assets/tyler-rose-festival/2024/formatted-Attendant-packages.png'
import TRFDebutantePackage1 from '../../assets/tyler-rose-festival/2024/formatted-Debutante-packages-1.png'
import TRFDebutantePackage2 from '../../assets/tyler-rose-festival/2024/formatted-Debutante-packages-2.png'
import TRFEscortPackage from '../../assets/tyler-rose-festival/2024/formatted-Escort-packages.png'
// import { useNavigate } from "react-router-dom";
import { generateClient } from "aws-amplify/api";
import type { Schema } from '../../../amplify/data/resource'

const client = generateClient<Schema>({authMode: 'none'})

interface PackageFormElements extends HTMLFormControlsCollection {
    eventType: HTMLButtonElement
    trfServiceType?: HTMLButtonElement
    trfPackageType?: HTMLButtonElement
    email: HTMLInputElement
    confirmEmail: HTMLInputElement
    firstName: HTMLInputElement
    lastName: HTMLInputElement
    phoneNumber: HTMLInputElement
}

interface PackageRequestForm extends HTMLFormElement{
    readonly elements: PackageFormElements
}

type Props = {
    event?: String
    pack?: String
}

const ServiceForm: FC<Props> = ({ event, pack }) => {
    const [eventType, setEventType] = useState(event)
    const [packageType, setPackageType] = useState(pack)
    // const navigate = useNavigate()

    async function handlesubmit(event: FormEvent<PackageRequestForm>){
        event.preventDefault()
        // const form = event.currentTarget;
        // console.log(form.elements.eventType.innerText)
        // console.log(form.elements.trfServiceType!.value)
        // console.log(form.elements.trfPackageType!.value)
        // console.log(form.elements.firstName.value)
        // console.log(form.elements.lastName.value)
        // console.log(form.elements.phoneNumber.value)
        // console.log(form.elements.email.value)
        //preform validation
        // console.log((await ))
        
        console.log(client)
        // const paymentIntent = await client.queries.GetPaymentIntent({ objects: [form.elements.eventType.innerText]})
        // console.log(paymentIntent)


        //routing
        // navigate('/service-form/checkout', {
        //     preventScrollReset: false,
        //     state: {
        //         eventType: form.elements.eventType.innerText,
        //         serviceType: form.elements.trfServiceType!.value,
        //         packageType: form.elements.trfPackageType!.value,
        //         firstName: form.elements.firstName.value,
        //         lastName: form.elements.lastName.value,
        //         phoneNumber: form.elements.phoneNumber.value,
        //         email: form.elements.email.value,
        //         paymentIntentSecret: await client.queries.GetPaymentIntent({ objects: [form.elements.eventType.innerText]})
        //     }
        // })
    }

    function handlePackageType(event: MouseEvent){
        setPackageType((event.target as HTMLInputElement).value)
    }


    //TODO: move to seperate components
    function renderEventContent(){
        switch(eventType){
            case 'Tyler Rose Festival':
                let packageDetails = (
                    <>
                        <p className="mb-3 font-semibold text-xl">Attendant Packages:</p>
                        <div className="flex gap-8 mb-4">
                            <div className="flex items-center gap-2">
                                <Radio className="p-3 text-2xl" id="attendantA" name="trfPackageType" value="Attendant-A" defaultChecked/>
                                <Label className="text-lg font-medium" htmlFor="attendantA">Attendant A</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Radio className="p-3 text-2xl" id="attendantB" name="trfPackageType" value="Attendant-B" />
                                <Label  className="text-lg font-medium" htmlFor="attendantB">Attendant B</Label>
                            </div>
                            <div className="flex items-center gap-2" >
                                <Radio className="p-3 text-2xl" id="attendantC" name="trfPackageType" value="Attendant-C" />
                                <Label className="text-lg font-medium" htmlFor="attendantC">Attendant C</Label>
                            </div>
                        </div>
                    </>
                )
                switch(packageType){
                    case 'Attendant':
                        packageDetails = (
                            <>
                                <p className="mb-3 font-semibold text-xl">Attendant Packages:</p>
                                <div className="flex gap-8 mb-4">
                                    <div className="flex items-center gap-2">
                                        <Radio className="p-3 text-2xl" id="attendantA" name="trfPackageType" value="Attendant-A" defaultChecked/>
                                        <Label className="text-lg font-medium" htmlFor="attendantA">Attendant A</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Radio className="p-3 text-2xl" id="attendantB" name="trfPackageType" value="Attendant-B" />
                                        <Label  className="text-lg font-medium" htmlFor="attendantB">Attendant B</Label>
                                    </div>
                                    <div className="flex items-center gap-2" >
                                        <Radio className="p-3 text-2xl" id="attendantC" name="trfPackageType" value="Attendant-C" />
                                        <Label className="text-lg font-medium" htmlFor="attendantC">Attendant C</Label>
                                    </div>
                                </div>
                            </>
                        )
                        break;
                    case 'Debutante':
                        packageDetails = (
                            <>
                                <p className="mb-3 font-semibold text-xl">Debutante Packages:</p>
                                <div className="flex gap-8 mb-4">
                                    <div className="flex items-center gap-2">
                                        <Radio className="p-3 text-2xl" id="royal" name="trfPackageType" value="Royal" defaultChecked/>
                                        <Label className="text-lg font-medium" htmlFor="royal">Royal</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Radio className="p-3 text-2xl" id="princess" name="trfPackageType" value="Princess" />
                                        <Label  className="text-lg font-medium" htmlFor="princess">Princess</Label>
                                    </div>
                                    <div className="flex items-center gap-2" >
                                        <Radio className="p-3 text-2xl" id="duchess" name="trfPackageType" value="Duchess" />
                                        <Label className="text-lg font-medium" htmlFor="duchess">Duchess</Label>
                                    </div>
                                    <div className="flex items-center gap-2" >
                                        <Radio className="p-3 text-2xl" id="imperial" name="trfPackageType" value="Imperial" />
                                        <Label className="text-lg font-medium" htmlFor="imperial">Imperial</Label>
                                    </div>
                                </div>
                            </>
                        )
                        break;
                    case 'Escort':
                        packageDetails = (
                            <>
                                <p className="mb-3 font-semibold text-xl">Escort Packages:</p>
                                <div className="flex gap-8 mb-4">
                                    <div className="flex items-center gap-2">
                                        <Radio className="p-3 text-2xl" id="escortA" name="trfPackageType" value="Escort-A" defaultChecked/>
                                        <Label className="text-lg font-medium" htmlFor="escortA">Escort A</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Radio className="p-3 text-2xl" id="escortB" name="trfPackageType" value="Escort-B" />
                                        <Label  className="text-lg font-medium" htmlFor="escortB">Escort B</Label>
                                    </div>
                                    <div className="flex items-center gap-2" >
                                        <Radio className="p-3 text-2xl" id="escortC" name="trfPackageType" value="Escort-C" />
                                        <Label className="text-lg font-medium" htmlFor="escortC">Escort C</Label>
                                    </div>
                                </div>
                            </>
                        )
                        break;
                }

                
                return (
                    <>
                        <div className=" h-[800px] w-[90%] min-h-[800px]">
                            <Carousel 
                                slide={false} 
                                leftControl={
                                    <div className="border p-2 rounded-full border-black">
                                        <HiOutlineArrowLeft className="text-xl"/>
                                    </div>
                                }
                                rightControl={
                                    <div className="border p-2 rounded-full border-black">
                                        <HiOutlineArrowRight className="text-xl"/>
                                    </div>
                                }
                                indicators={false}
                            >
                                <div className="flex h-full items-center justify-center">
                                    <img src={TRFAttendantPackage} alt="Tyler Rose Festival Attendant Packages"/>
                                </div>
                                <div className="flex h-full items-center justify-center">
                                    <img src={TRFDebutantePackage1} alt="Tyler Rose Festival Debutante Packages"/>
                                </div>
                                <div className="flex h-full items-center justify-center">
                                    <img src={TRFDebutantePackage2} alt="Tyler Rose Festival Debutante Package Perks"/>
                                </div>
                                <div className="flex h-full items-center justify-center">
                                    <img src={TRFEscortPackage} alt="Tyler Rose Festival Escort Packages"/> 
                                </div>
                            </Carousel>
                        </div>
                        <p className="mb-3 font-semibold text-xl">Tyler Rose Festival Services:</p>
                        <div className="flex gap-8 mb-4">
                            <div className="flex items-center gap-2">
                                <Radio className="p-3 text-2xl" id="attendant" name="trfServiceType" value="Attendant" onClick={handlePackageType} defaultChecked/>
                                <Label className="text-lg font-medium" htmlFor="attendant">Attendant</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Radio className="p-3 text-2xl" id="debutante" name="trfServiceType" value="Debutante" onClick={handlePackageType}/>
                                <Label  className="text-lg font-medium" htmlFor="debutante">Debutante</Label>
                            </div>
                            <div className="flex items-center gap-2" >
                                <Radio className="p-3 text-2xl" id="escort" name="trfServiceType" value="Escort" onClick={handlePackageType}/>
                                <Label className="text-lg font-medium" htmlFor="escort">Escort</Label>
                            </div>
                        </div>
                        {packageDetails}
                    </>
                    
                )
            default:
                return (<></>)
        }
    }

    return (
        <>
            <form className='flex flex-col items-center justify-center font-main ' onSubmit={handlesubmit}>
                <div className="flex flex-col items-center justify-center w-[60%] max-w-[48rem] border-4 border-gray-500 rounded-lg">
                    <p className="font-bold text-4xl mt-2 mb-8">Service Request Form</p>
                    <Label className="ms-2 mb-3 font-semibold text-xl" htmlFor="packageType">Your Event:</Label>
                    <Dropdown
                        arrowIcon={true}
                        label={eventType === undefined ? 'Select an Event' : eventType}
                        color={'light'}
                        name="eventType"
                        id="eventType"
                    >
                        <Dropdown.Item onClick={() => setEventType('Tyler Rose Festival')}>Tyler Rose Festival</Dropdown.Item>
                    </Dropdown>

                    {renderEventContent()}
                    
                    <div className="flex flex-col gap-3 w-[70%] max-w-[32rem] mt-8">
                        
                        <div className="flex justify-between mb-4">
                            <div className="flex flex-col gap-3 w-[45%]">
                                <Label className="ms-2 font-semibold text-xl" htmlFor="firstName">First Name:</Label>
                                <TextInput sizing='md' placeholder="First Name" type="text" id="firstName" name="firstName"/>
                            </div>
                            <div className="flex flex-col gap-3 w-[45%]">
                                <Label className="ms-2 font-semibold text-xl" htmlFor="lastName">Last Name:</Label>
                                <TextInput sizing='md' placeholder="Last Name" type="text" id="lastName" name="lastName"/>
                            </div>
                        </div>
                        <Label className="ms-2 font-semibold text-xl" htmlFor="phoneNumber">Phone Number:</Label>
                        <TextInput sizing='md' className="mb-4" placeholder="Phone Number" type="tel" id="phoneNumber" name="phoneNumber"/>
                        <Label className="ms-2 font-semibold text-xl" htmlFor="email">Email:</Label>
                        <TextInput sizing='md' className="mb-4" placeholder="Email" type="email" id="email" name="email"/>
                        <Label className="ms-2 font-semibold text-xl" htmlFor="confirmEmail">Confirm Email:</Label>
                        <TextInput sizing='md' className="mb-4" placeholder="Confirm Email" type="email" id="confirmEmail" name="confirmEmail"/>
                        <div className="flex justify-between mt-12">
                            <a href='login' className="text-blue-500 hover:underline">Already purchased a package? Login here</a>
                            <Button className="text-xl w-[40%] max-w-[8rem] mb-6" type="submit" >Checkout</Button>
                        </div>
                    </div>
                </div>
            </form>
        </>
    )
}

export default ServiceForm;