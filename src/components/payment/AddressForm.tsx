import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { AuthContext } from "../../auth"
import { PaymentService } from "../../services/paymentService"
import { CustomerBillingAddress } from "../../types"
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react"
import validator from 'validator'
import { StateCode } from "../../types/constants"
import { FaRegCheckCircle, FaRegCircle } from 'react-icons/fa'
import { HiChevronDown, HiChevronLeft } from "react-icons/hi"
import Loading from "../common/Loading"
import { Button, Checkbox, Label, TextInput } from "flowbite-react"
import { textInputTheme } from "../../utils"
import { formatAutoCompleteResponse } from "../../functions/paymentFunctions"
import { v4 } from 'uuid'

interface AddressFormProps {
  auth: AuthContext,
  PaymentService: PaymentService,
  billingAddresses: CustomerBillingAddress[]
  billingAddressesQuery: UseQueryResult<CustomerBillingAddress[], Error>
  formOpen: boolean
  setFormOpen: Dispatch<SetStateAction<'address' | 'card' | 'none' | undefined>>
  onSubmit: (billingInfo: CustomerBillingAddress & { saved: boolean }) => void
}

export const AddressForm = (props: AddressFormProps) => {
  const [selectedAddress, setSelectedAddress] = useState<CustomerBillingAddress>()
  const [addressLineOne, setAddressLineOne] = useState('')
  const [addressLineTwo, setAddressLineTwo] = useState('')
  const [adminAreaOne, setAdminAreaOne] = useState<StateCode>()
  const [adminAreaTwo, setAdminAreaTwo] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const addressLineOneContainer = useRef<HTMLDivElement | null>(null)
  const [addressLineOneFocused, setAddressLineOneFocused] = useState(false)
  const [creatingNewAddress, setCreatingNewAddress] = useState(false)
  const [isDefault, setIsDefault] = useState(false)
  const [saveBillingAddress, setSaveBillingAddress] = useState(true)

  useEffect(() => {
    const foundAddress = props.billingAddresses.find((address) => address.default)
    if(props.billingAddresses.length === 0 && !props.billingAddressesQuery.isLoading) {
      setCreatingNewAddress(true)
      setSaveBillingAddress(true)
      setIsDefault(true)
    }
    else if(foundAddress !== undefined){
      setCreatingNewAddress(false)
      setSelectedAddress(foundAddress)
      props.onSubmit({...foundAddress, saved: true})
    }
    const mouseDownHandler = (event: MouseEvent) => {
      if(
        addressLineOneContainer.current && 
        addressLineOneFocused && 
        !addressLineOneContainer.current.contains(event.target as Node)
      ) {
        setAddressLineOneFocused(false)
      }
    }

    window.addEventListener('mousedown', mouseDownHandler)
    return () => {
      window.removeEventListener('mousedown', mouseDownHandler)
    }
  }, [props.billingAddressesQuery.isLoading])

  const addressSuggestions = useQuery({
    ...props.PaymentService.autoCompleteAddressQueryOptions({
      userEmail: props.auth.user?.profile.email ?? '',
      addressPart: addressLineOne,
      options: {
        logging: true,
      }
    }),
    enabled: addressLineOneFocused //only process requests if the input is focused
  })

  const validAddress = (
    ( 
      validator.isPostalCode(postalCode, 'US') &&
      addressLineOne.length > 3 && //one digit number, space, one letter street name
      adminAreaTwo.length > 1 &&
      adminAreaOne !== undefined
    ) ||
    selectedAddress !== undefined
  )

  return (

    <div className="flex flex-col border w-full rounded-lg px-2 py-1">
      <button 
        className={`
          flex flex-row items-center justify-between  
          ${props.formOpen ? 'border-b-2 pb-1' : ''}
          ${validAddress ? 'cursor-pointer' : 'cursor-default'}
        `}
        onClick={() => {
          if(!props.formOpen) {
            props.setFormOpen('address')
          }
          else if(validAddress && adminAreaOne) {
            props.setFormOpen('card')
            props.onSubmit({
              id: v4(),
              userEmail: '',
              saved: false,
              addressLineOne: addressLineOne,
              addressLineTwo: addressLineTwo,
              adminAreaOne: adminAreaOne,
              adminAreaTwo: adminAreaTwo,
              countryCode: 'US',
              default: isDefault,
              postalCode: postalCode,
              createdAt: new Date().toISOString(),
            })
          }
        }}
      >
        <span className="text-lg font-medium ps-2">Billing Address</span>
        <div className="flex flex-row items-center gap-2">
          {validAddress ? (<FaRegCheckCircle size={20} className="text-green-500"/>) : (<FaRegCircle size={20} className="text-gray-500"/>)}
          {props.formOpen ? (<HiChevronDown size={24}/>) : (<HiChevronLeft size={24}/>)}
        </div>
      </button>
      {props.formOpen && (
        <form 
          className="flex flex-col w-full gap-2"
          onSubmit={() => {
            //only submit allowed if creating a new address
            if(validAddress && adminAreaOne) {
              props.setFormOpen('card')
              props.onSubmit({
                id: v4(),
                userEmail: '',
                saved: false,
                addressLineOne: addressLineOne,
                addressLineTwo: addressLineTwo,
                adminAreaOne: adminAreaOne,
                adminAreaTwo: adminAreaTwo,
                countryCode: 'US',
                default: isDefault,
                postalCode: postalCode,
                createdAt: new Date().toISOString(),
              })
            }
          }}
        >
          {props.billingAddressesQuery.isLoading ? (
            <span className="flex flex-row items-center">
              <span>Loading Saved Billing Addresses</span>
              <Loading />
            </span>
          ) : (
            props.billingAddresses.length > 0 && !creatingNewAddress ? (
              <div>
                <span className="">Saved Addresses</span>
                {/* TODO: rework me into visible list */}
                <select
                  value={selectedAddress ? formatAutoCompleteResponse({...selectedAddress, fullText: ''}) ?? undefined : undefined}
                  onChange={(event) => setSelectedAddress(props.billingAddresses.find((address) => address.id === event.target.value))}
                >
                  {props.billingAddresses.map((address) => {
                    return (
                      <option key={address.id} value={address.id}>
                        <span>{address.addressLineOne}</span>
                      </option>
                    )
                  })}
                  <option onClick={() => setCreatingNewAddress(true)}>Create New</option>
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-2 w-full px-4 py-2">
                <div className="flex flex-col gap-1 relative" ref={addressLineOneContainer}>
                  <Label className="text-sm font-medium italic ps-2" htmlFor="address-line-1">Address</Label>
                  <TextInput 
                    id="address-line-1"
                    name="address-line-1"
                    theme={textInputTheme} 
                    sizing="sm" 
                    placeholder="Enter your street address here..."
                    value={addressLineOne}
                    onChange={(event) => setAddressLineOne(event.target.value)}
                    onFocus={() => setAddressLineOneFocused(true)}
                    autoComplete='billing address-line1'
                  />
                  {(
                    addressLineOneFocused 
                    && 
                    addressSuggestions.data?.status === 'Success' && 
                    addressSuggestions.data.response.length > 0
                  ) && (
                    <div className="absolute shadow-sm z-10 top-14 bg-white border rounded-lg min-w-60 flex flex-row">
                      {addressSuggestions.data.response.filter((address) => formatAutoCompleteResponse(address)).map((response, index) => {
                        return (
                          <button
                            key={index}
                            className=""
                            type="button"
                            onClick={() => {
                              setAddressLineOne(response.addressLineOne ?? '')
                              setAddressLineOneFocused(false)
                              setAddressLineTwo(response.addressLineTwo ?? '')
                              setAdminAreaOne(
                                Object.keys(StateCode).find((code) => code === (response.adminAreaOne ?? '').toUpperCase()) as StateCode | undefined
                              )
                              setAdminAreaTwo(response.adminAreaTwo ?? '')
                              setPostalCode(response.postalCode ?? '')
                            }}
                          >{response.addressLineOne}</button>
                        )
                      })}
                    </div>
                  )}
                </div>
                <div className="flex flex-row gap-4 items-center">
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm font-medium italic ps-2" htmlFor="address-line-2">Address Line Two</Label>
                    <TextInput 
                      id="address-line-2"
                      name="address-line-2"
                      theme={textInputTheme}
                      sizing="sm"
                      className="min-w-[240px] max-w-[240px]"
                      placeholder="e.g. Unit 25"
                      value={addressLineTwo}
                      onChange={(event) => setAddressLineTwo(event.target.value)}
                      autoComplete="billing address-line2"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm font-medium italic ps-2" htmlFor="address-line-2">City</Label>
                    <TextInput 
                      id="admin-area-two"
                      name="admin-area-two"
                      theme={textInputTheme}
                      sizing="sm"
                      className="w-full"
                      placeholder="e.g. San Antonio"
                      value={adminAreaTwo}
                      onChange={(event) => setAdminAreaTwo(event.target.value)}
                      autoComplete="billing address-level2"
                    />
                  </div>
                </div>
                <div className="flex flex-row gap-4 items-center pb-3 border-b-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm font-medium italic ps-2" htmlFor="admin-area-one">State</Label>
                    <select
                      id='admin-area-one'
                      name='admin-area-one'
                      value={adminAreaOne ?? 'default'}
                      onChange={(e) => setAdminAreaOne(e.target.value as StateCode)}
                      className="rounded-lg py-0.5 px-2 bg-gray-50 border-gray-300 max-w-24 min-w-24"
                    >
                      <option disabled value='default'>State</option>
                      {Object.keys(StateCode).map((state) => {
                        return (
                          <option key={state} value={state}>{state}</option>
                        )
                      })}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-sm italic font-medium ps-2" htmlFor="postal-code">Zip Code</Label>
                    <TextInput 
                      id="postal-code"
                      name="postal-code"
                      type="number"
                      theme={textInputTheme}
                      sizing="sm"
                      className="max-w-32"
                      placeholder="Zip code"
                      onChange={(event) => setPostalCode(event.target.value.substring(0,5))}
                      value={postalCode}
                      autoComplete="billing postal-code"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => { setSaveBillingAddress(!saveBillingAddress)}}
                      className={`
                        flex flex-row gap-1 px-1 w-fit py-0.5 rounded-lg border border-transparent hover:border-gray-300 items-center text-sm
                        ${saveBillingAddress ? '' : 'mb-[30px]'}
                      `}
                    >
                      <Checkbox 
                        className="focus:ring-0 focus:outline-none" 
                        readOnly 
                        checked={saveBillingAddress} 
                        onClick={() => setSaveBillingAddress(!saveBillingAddress)} 
                      />
                      <span>Save Billing Address</span>
                    </button>
                    {saveBillingAddress && (
                      <button
                        type='button'
                        onClick={() => { setIsDefault(!isDefault)}}
                        className="flex flex-row gap-1 px-1 py-0.5 rounded-lg items-center border border-transparent enabled:hover:border-gray-300 disabled:opacity-60 text-sm"
                        disabled={props.billingAddresses.length === 0}
                      >
                        <Checkbox 
                          className="focus:ring-0 focus:outline-none" 
                          readOnly 
                          checked={isDefault} 
                          disabled={props.billingAddresses.length === 0} 
                          onClick={() => setIsDefault(!isDefault)} 
                        />
                        <span>Default Billing Address</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-row w-full justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    className="py-0"
                  >Next</Button>
                </div>
              </div>
            )
          )}
        </form>
      )}
    </div>
  )
}