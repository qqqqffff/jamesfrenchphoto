import { Accordion, Button, Checkbox, Dropdown, Label, TextInput } from "flowbite-react"
import { FC, FormEvent, useEffect, useState } from "react"

interface CheckoutFormElements extends HTMLFormControlsCollection {
    eventType: HTMLButtonElement
    trfServiceType?: HTMLButtonElement
    trfPackageType?: HTMLButtonElement
    email: HTMLInputElement
    confirmEmail: HTMLInputElement
    firstName: HTMLInputElement
    lastName: HTMLInputElement
    phoneNumber: HTMLInputElement
}

interface CheckoutForm extends HTMLFormElement{
    readonly elements: CheckoutFormElements
}

type Props = {

}

const CheckoutForm: FC<Props> = ({}) => {
    const [mailingStateValue, setMailingStateValue] = useState('')
    const [displayBillingAddress, setDisplayBillingAddress] = useState(false)

    useEffect(() => {
        // console.log(history.state)
        //preform state validation otherwise redirect
    }, [])

    function handleSubmit(event: FormEvent<CheckoutForm>){
        event.preventDefault()
        const form = event.currentTarget
    }

    function billingAddress(){
        if(displayBillingAddress){
            return (
                <Accordion.Panel>
                    <Accordion.Title className="text-2xl font-semibold">Billing Address</Accordion.Title>
                    <Accordion.Content className="flex flex-col gap-3">
                        <Label className="ms-2 font-semibold text-xl" htmlFor="address">Address:</Label>
                        <TextInput sizing='md' className="mb-4" placeholder="Street Address, P.O. Box" type="text" id="address" name="address"/>
                        <Label className="ms-2 font-semibold text-xl" htmlFor="address2">Address Line 2:</Label>
                        <TextInput sizing='md' className="mb-4" placeholder="Apt, Unit, Building, etc." type="text" id="address2" name="address2"/>
                        <div className="flex gap-6">
                            <div className="flex flex-col w-[45%] gap-3">
                                <Label className="ms-2 font-semibold text-xl" htmlFor="zipCode">Zip Code:</Label>
                                <TextInput sizing='md' className="mb-4" placeholder="Zip Code" type="text" id="zipCode" name="zipCode"/>
                            </div>
                            <div className="flex flex-col w-[45%] gap-3">
                                <Label className="ms-2 font-semibold text-xl" htmlFor="State">State:</Label>
                                <Dropdown
                                    className="overflow-auto h-[12rem]"
                                    label={<TextInput placeholder="State" type="text" value={mailingStateValue} onChange={(event) => setMailingStateValue(event.target.value)}/>}
                                    inline
                                >
                                    <Dropdown.Item value="AL" onClick={() => setMailingStateValue('AL')}>AL</Dropdown.Item>
                                    <Dropdown.Item value="AK" onClick={() => setMailingStateValue('AK')}>AK</Dropdown.Item>
                                    <Dropdown.Item value="AS" onClick={() => setMailingStateValue('AS')}>AS</Dropdown.Item>
                                    <Dropdown.Item value="AZ" onClick={() => setMailingStateValue('AZ')}>AZ</Dropdown.Item>
                                    <Dropdown.Item value="AR" onClick={() => setMailingStateValue('AR')}>AR</Dropdown.Item>
                                    <Dropdown.Item value="CA" onClick={() => setMailingStateValue('CA')}>CA</Dropdown.Item>
                                    <Dropdown.Item value="CO" onClick={() => setMailingStateValue('CO')}>CO</Dropdown.Item>
                                    <Dropdown.Item value="CT" onClick={() => setMailingStateValue('CT')}>CT</Dropdown.Item>
                                    <Dropdown.Item value="DE" onClick={() => setMailingStateValue('DE')}>DE</Dropdown.Item>
                                    <Dropdown.Item value="DC" onClick={() => setMailingStateValue('DC')}>DC</Dropdown.Item>
                                    <Dropdown.Item value="FL" onClick={() => setMailingStateValue('FL')}>FL</Dropdown.Item>
                                    <Dropdown.Item value="GA" onClick={() => setMailingStateValue('GA')}>GA</Dropdown.Item>
                                    <Dropdown.Item value="GU" onClick={() => setMailingStateValue('GU')}>GU</Dropdown.Item>
                                    <Dropdown.Item value="HI" onClick={() => setMailingStateValue('HI')}>HI</Dropdown.Item>
                                    <Dropdown.Item value="ID" onClick={() => setMailingStateValue('ID')}>ID</Dropdown.Item>
                                    <Dropdown.Item value="IL" onClick={() => setMailingStateValue('IL')}>IL</Dropdown.Item>
                                    <Dropdown.Item value="IN" onClick={() => setMailingStateValue('IN')}>IN</Dropdown.Item>
                                    <Dropdown.Item value="IA" onClick={() => setMailingStateValue('IA')}>IA</Dropdown.Item>
                                    <Dropdown.Item value="KS" onClick={() => setMailingStateValue('KS')}>KS</Dropdown.Item>
                                    <Dropdown.Item value="KY" onClick={() => setMailingStateValue('KY')}>KY</Dropdown.Item>
                                    <Dropdown.Item value="LA" onClick={() => setMailingStateValue('LA')}>LA</Dropdown.Item>
                                    <Dropdown.Item value="ME" onClick={() => setMailingStateValue('ME')}>ME</Dropdown.Item>
                                    <Dropdown.Item value="MD" onClick={() => setMailingStateValue('MD')}>MD</Dropdown.Item>
                                    <Dropdown.Item value="MA" onClick={() => setMailingStateValue('MA')}>MA</Dropdown.Item>
                                    <Dropdown.Item value="MI" onClick={() => setMailingStateValue('MI')}>MI</Dropdown.Item>
                                    <Dropdown.Item value="MN" onClick={() => setMailingStateValue('MN')}>MN</Dropdown.Item>
                                    <Dropdown.Item value="MS" onClick={() => setMailingStateValue('MS')}>MS</Dropdown.Item>
                                    <Dropdown.Item value="MO" onClick={() => setMailingStateValue('MO')}>MO</Dropdown.Item>
                                    <Dropdown.Item value="MT" onClick={() => setMailingStateValue('MT')}>MT</Dropdown.Item>
                                    <Dropdown.Item value="NE" onClick={() => setMailingStateValue('NE')}>NE</Dropdown.Item>
                                    <Dropdown.Item value="NV" onClick={() => setMailingStateValue('NV')}>NV</Dropdown.Item>
                                    <Dropdown.Item value="NH" onClick={() => setMailingStateValue('NH')}>NH</Dropdown.Item>
                                    <Dropdown.Item value="NJ" onClick={() => setMailingStateValue('NJ')}>NJ</Dropdown.Item>
                                    <Dropdown.Item value="NM" onClick={() => setMailingStateValue('NM')}>NM</Dropdown.Item>
                                    <Dropdown.Item value="NY" onClick={() => setMailingStateValue('NY')}>NY</Dropdown.Item>
                                    <Dropdown.Item value="NC" onClick={() => setMailingStateValue('NC')}>NC</Dropdown.Item>
                                    <Dropdown.Item value="ND" onClick={() => setMailingStateValue('ND')}>ND</Dropdown.Item>
                                    <Dropdown.Item value="MP" onClick={() => setMailingStateValue('MP')}>MP</Dropdown.Item>
                                    <Dropdown.Item value="OH" onClick={() => setMailingStateValue('OH')}>OH</Dropdown.Item>
                                    <Dropdown.Item value="OK" onClick={() => setMailingStateValue('OK')}>OK</Dropdown.Item>
                                    <Dropdown.Item value="OR" onClick={() => setMailingStateValue('OR')}>OR</Dropdown.Item>
                                    <Dropdown.Item value="PA" onClick={() => setMailingStateValue('PA')}>PA</Dropdown.Item>
                                    <Dropdown.Item value="PR" onClick={() => setMailingStateValue('PR')}>PR</Dropdown.Item>
                                    <Dropdown.Item value="RI" onClick={() => setMailingStateValue('RI')}>RI</Dropdown.Item>
                                    <Dropdown.Item value="SC" onClick={() => setMailingStateValue('SC')}>SC</Dropdown.Item>
                                    <Dropdown.Item value="SD" onClick={() => setMailingStateValue('SD')}>SD</Dropdown.Item>
                                    <Dropdown.Item value="TN" onClick={() => setMailingStateValue('TN')}>TN</Dropdown.Item>
                                    <Dropdown.Item value="TX" onClick={() => setMailingStateValue('TX')}>TX</Dropdown.Item>
                                    <Dropdown.Item value="UM" onClick={() => setMailingStateValue('UM')}>UM</Dropdown.Item>
                                    <Dropdown.Item value="UT" onClick={() => setMailingStateValue('UT')}>UT</Dropdown.Item>
                                    <Dropdown.Item value="VT" onClick={() => setMailingStateValue('VT')}>VT</Dropdown.Item>
                                    <Dropdown.Item value="VI" onClick={() => setMailingStateValue('VI')}>VI</Dropdown.Item>
                                    <Dropdown.Item value="VA" onClick={() => setMailingStateValue('VA')}>VA</Dropdown.Item>
                                    <Dropdown.Item value="WA" onClick={() => setMailingStateValue('WA')}>WA</Dropdown.Item>
                                    <Dropdown.Item value="WV" onClick={() => setMailingStateValue('WV')}>WV</Dropdown.Item>
                                    <Dropdown.Item value="WI" onClick={() => setMailingStateValue('WI')}>WI</Dropdown.Item>
                                    <Dropdown.Item value="WY" onClick={() => setMailingStateValue('WY')}>WY</Dropdown.Item>
                                    <Dropdown.Item value="AA" onClick={() => setMailingStateValue('AA')}>AA</Dropdown.Item>
                                    <Dropdown.Item value="AE" onClick={() => setMailingStateValue('AE')}>AE</Dropdown.Item>
                                    <Dropdown.Item value="AE" onClick={() => setMailingStateValue('AE')}>AE</Dropdown.Item>
                                    <Dropdown.Item value="AE" onClick={() => setMailingStateValue('AE')}>AE</Dropdown.Item>
                                    <Dropdown.Item value="AE" onClick={() => setMailingStateValue('AE')}>AE</Dropdown.Item>
                                    <Dropdown.Item value="AP" onClick={() => setMailingStateValue('AP')}>AP</Dropdown.Item>
                                </Dropdown>
                            </div>
                        </div>
                    </Accordion.Content>
                </Accordion.Panel>
            )
        }
        return (<></>)
    }

    return (
        <>
            <form className='flex flex-col items-center justify-center font-main ' onSubmit={handleSubmit}>
                <div className="flex flex-col items-center justify-center w-[60%] max-w-[48rem] border-4 border-gray-500 rounded-lg">
                    <p className="font-bold text-4xl mt-2 mb-8">Service Checkout</p>
                    
                    <div className="flex flex-col w-[70%] max-w-[32rem] mt-8">
                        <Accordion >
                            <Accordion.Panel >
                                <Accordion.Title className="text-2xl font-semibold">Contact Information</Accordion.Title>
                                <Accordion.Content className="flex flex-col gap-3">
                                    <Label className="ms-2 font-medium text-xl" htmlFor="firstName">First Name: {history.state.usr.firstName}</Label>
                                    <Label className="ms-2 font-medium text-xl" htmlFor="lastName">Last Name: {history.state.usr.lastName}</Label>
                                    <Label className="ms-2 font-medium text-xl" htmlFor="phoneNumber">Phone Number: {history.state.usr.phoneNumber}</Label>
                                    <Label className="ms-2 font-medium text-xl" htmlFor="email">Email: {history.state.usr.email}</Label>
                                </Accordion.Content>
                            </Accordion.Panel>
                            <Accordion.Panel >
                                <Accordion.Title className="text-2xl font-semibold">Mailing Address</Accordion.Title>
                                <Accordion.Content className="flex flex-col gap-3">
                                    <Label className="ms-2 font-semibold text-xl" htmlFor="address">Address:</Label>
                                    <TextInput sizing='md' className="mb-4" placeholder="Street Address, P.O. Box" type="text" id="address" name="address"/>
                                    <Label className="ms-2 font-semibold text-xl" htmlFor="address2">Address Line 2:</Label>
                                    <TextInput sizing='md' className="mb-4" placeholder="Apt, Unit, Building, etc." type="text" id="address2" name="address2"/>
                                    <div className="flex gap-6">
                                        <div className="flex flex-col w-[45%] gap-3">
                                            <Label className="ms-2 font-semibold text-xl" htmlFor="zipCode">Zip Code:</Label>
                                            <TextInput sizing='md' className="mb-4" placeholder="Zip Code" type="text" id="zipCode" name="zipCode"/>
                                        </div>
                                        <div className="flex flex-col w-[45%] gap-3">
                                            <Label className="ms-2 font-semibold text-xl" htmlFor="State">State:</Label>
                                            <Dropdown
                                                className="overflow-auto h-[12rem]"
                                                label={<TextInput placeholder="State" type="text" value={mailingStateValue} onChange={(event) => setMailingStateValue(event.target.value)}/>}
                                                inline
                                            >
                                                <Dropdown.Item value="AL" onClick={() => setMailingStateValue('AL')}>AL</Dropdown.Item>
                                                <Dropdown.Item value="AK" onClick={() => setMailingStateValue('AK')}>AK</Dropdown.Item>
                                                <Dropdown.Item value="AS" onClick={() => setMailingStateValue('AS')}>AS</Dropdown.Item>
                                                <Dropdown.Item value="AZ" onClick={() => setMailingStateValue('AZ')}>AZ</Dropdown.Item>
                                                <Dropdown.Item value="AR" onClick={() => setMailingStateValue('AR')}>AR</Dropdown.Item>
                                                <Dropdown.Item value="CA" onClick={() => setMailingStateValue('CA')}>CA</Dropdown.Item>
                                                <Dropdown.Item value="CO" onClick={() => setMailingStateValue('CO')}>CO</Dropdown.Item>
                                                <Dropdown.Item value="CT" onClick={() => setMailingStateValue('CT')}>CT</Dropdown.Item>
                                                <Dropdown.Item value="DE" onClick={() => setMailingStateValue('DE')}>DE</Dropdown.Item>
                                                <Dropdown.Item value="DC" onClick={() => setMailingStateValue('DC')}>DC</Dropdown.Item>
                                                <Dropdown.Item value="FL" onClick={() => setMailingStateValue('FL')}>FL</Dropdown.Item>
                                                <Dropdown.Item value="GA" onClick={() => setMailingStateValue('GA')}>GA</Dropdown.Item>
                                                <Dropdown.Item value="GU" onClick={() => setMailingStateValue('GU')}>GU</Dropdown.Item>
                                                <Dropdown.Item value="HI" onClick={() => setMailingStateValue('HI')}>HI</Dropdown.Item>
                                                <Dropdown.Item value="ID" onClick={() => setMailingStateValue('ID')}>ID</Dropdown.Item>
                                                <Dropdown.Item value="IL" onClick={() => setMailingStateValue('IL')}>IL</Dropdown.Item>
                                                <Dropdown.Item value="IN" onClick={() => setMailingStateValue('IN')}>IN</Dropdown.Item>
                                                <Dropdown.Item value="IA" onClick={() => setMailingStateValue('IA')}>IA</Dropdown.Item>
                                                <Dropdown.Item value="KS" onClick={() => setMailingStateValue('KS')}>KS</Dropdown.Item>
                                                <Dropdown.Item value="KY" onClick={() => setMailingStateValue('KY')}>KY</Dropdown.Item>
                                                <Dropdown.Item value="LA" onClick={() => setMailingStateValue('LA')}>LA</Dropdown.Item>
                                                <Dropdown.Item value="ME" onClick={() => setMailingStateValue('ME')}>ME</Dropdown.Item>
                                                <Dropdown.Item value="MD" onClick={() => setMailingStateValue('MD')}>MD</Dropdown.Item>
                                                <Dropdown.Item value="MA" onClick={() => setMailingStateValue('MA')}>MA</Dropdown.Item>
                                                <Dropdown.Item value="MI" onClick={() => setMailingStateValue('MI')}>MI</Dropdown.Item>
                                                <Dropdown.Item value="MN" onClick={() => setMailingStateValue('MN')}>MN</Dropdown.Item>
                                                <Dropdown.Item value="MS" onClick={() => setMailingStateValue('MS')}>MS</Dropdown.Item>
                                                <Dropdown.Item value="MO" onClick={() => setMailingStateValue('MO')}>MO</Dropdown.Item>
                                                <Dropdown.Item value="MT" onClick={() => setMailingStateValue('MT')}>MT</Dropdown.Item>
                                                <Dropdown.Item value="NE" onClick={() => setMailingStateValue('NE')}>NE</Dropdown.Item>
                                                <Dropdown.Item value="NV" onClick={() => setMailingStateValue('NV')}>NV</Dropdown.Item>
                                                <Dropdown.Item value="NH" onClick={() => setMailingStateValue('NH')}>NH</Dropdown.Item>
                                                <Dropdown.Item value="NJ" onClick={() => setMailingStateValue('NJ')}>NJ</Dropdown.Item>
                                                <Dropdown.Item value="NM" onClick={() => setMailingStateValue('NM')}>NM</Dropdown.Item>
                                                <Dropdown.Item value="NY" onClick={() => setMailingStateValue('NY')}>NY</Dropdown.Item>
                                                <Dropdown.Item value="NC" onClick={() => setMailingStateValue('NC')}>NC</Dropdown.Item>
                                                <Dropdown.Item value="ND" onClick={() => setMailingStateValue('ND')}>ND</Dropdown.Item>
                                                <Dropdown.Item value="MP" onClick={() => setMailingStateValue('MP')}>MP</Dropdown.Item>
                                                <Dropdown.Item value="OH" onClick={() => setMailingStateValue('OH')}>OH</Dropdown.Item>
                                                <Dropdown.Item value="OK" onClick={() => setMailingStateValue('OK')}>OK</Dropdown.Item>
                                                <Dropdown.Item value="OR" onClick={() => setMailingStateValue('OR')}>OR</Dropdown.Item>
                                                <Dropdown.Item value="PA" onClick={() => setMailingStateValue('PA')}>PA</Dropdown.Item>
                                                <Dropdown.Item value="PR" onClick={() => setMailingStateValue('PR')}>PR</Dropdown.Item>
                                                <Dropdown.Item value="RI" onClick={() => setMailingStateValue('RI')}>RI</Dropdown.Item>
                                                <Dropdown.Item value="SC" onClick={() => setMailingStateValue('SC')}>SC</Dropdown.Item>
                                                <Dropdown.Item value="SD" onClick={() => setMailingStateValue('SD')}>SD</Dropdown.Item>
                                                <Dropdown.Item value="TN" onClick={() => setMailingStateValue('TN')}>TN</Dropdown.Item>
                                                <Dropdown.Item value="TX" onClick={() => setMailingStateValue('TX')}>TX</Dropdown.Item>
                                                <Dropdown.Item value="UM" onClick={() => setMailingStateValue('UM')}>UM</Dropdown.Item>
                                                <Dropdown.Item value="UT" onClick={() => setMailingStateValue('UT')}>UT</Dropdown.Item>
                                                <Dropdown.Item value="VT" onClick={() => setMailingStateValue('VT')}>VT</Dropdown.Item>
                                                <Dropdown.Item value="VI" onClick={() => setMailingStateValue('VI')}>VI</Dropdown.Item>
                                                <Dropdown.Item value="VA" onClick={() => setMailingStateValue('VA')}>VA</Dropdown.Item>
                                                <Dropdown.Item value="WA" onClick={() => setMailingStateValue('WA')}>WA</Dropdown.Item>
                                                <Dropdown.Item value="WV" onClick={() => setMailingStateValue('WV')}>WV</Dropdown.Item>
                                                <Dropdown.Item value="WI" onClick={() => setMailingStateValue('WI')}>WI</Dropdown.Item>
                                                <Dropdown.Item value="WY" onClick={() => setMailingStateValue('WY')}>WY</Dropdown.Item>
                                                <Dropdown.Item value="AA" onClick={() => setMailingStateValue('AA')}>AA</Dropdown.Item>
                                                <Dropdown.Item value="AE" onClick={() => setMailingStateValue('AE')}>AE</Dropdown.Item>
                                                <Dropdown.Item value="AE" onClick={() => setMailingStateValue('AE')}>AE</Dropdown.Item>
                                                <Dropdown.Item value="AE" onClick={() => setMailingStateValue('AE')}>AE</Dropdown.Item>
                                                <Dropdown.Item value="AE" onClick={() => setMailingStateValue('AE')}>AE</Dropdown.Item>
                                                <Dropdown.Item value="AP" onClick={() => setMailingStateValue('AP')}>AP</Dropdown.Item>
                                            </Dropdown>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox id="sameBillingAddress" name="sameBillingAddress" defaultChecked onClick={() => setDisplayBillingAddress(!displayBillingAddress)}/>
                                        <Label htmlFor="sameBillingAddress">Same Billing Address</Label>
                                    </div>
                                </Accordion.Content>
                            </Accordion.Panel>
                            {billingAddress()}
                        </Accordion>

                        <div className="flex justify-between mt-12">
                            <Button className="text-xl w-[40%] max-w-[8rem] mb-6"  color="light">Back</Button>
                            <Button className="text-xl w-[40%] max-w-[8rem] mb-6" type="submit" >Purchase</Button>
                        </div>
                    </div>
                </div>
            </form>
        </>
    )
}

export default CheckoutForm