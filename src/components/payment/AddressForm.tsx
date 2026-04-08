import { UseQueryResult } from "@tanstack/react-query"
import { AuthContext } from "../../auth"
import { PaymentService } from "../../services/paymentService"
import { CustomerBillingAddress } from "../../types"
import { AutoCompleteAddressResponse } from "../../types/backend-types"
import { useEffect, useRef, useState } from "react"
import validator from 'validator'
import { StateCode } from "../../types/constants"
import { FaRegCheckCircle, FaRegCircle } from 'react-icons/fa'
import { HiChevronDown, HiChevronRight } from "react-icons/hi2"
import Loading from "../common/Loading"

interface AddressFormProps {
  auth: AuthContext,
  PaymentService: PaymentService,
  submit: (billingAddress: Omit<AutoCompleteAddressResponse, 'fullText'>) => void
  billingAddresses: CustomerBillingAddress[]
  billingAddressesQuery: UseQueryResult<CustomerBillingAddress[], Error>
  formOpen: boolean
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

  useEffect(() => {
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
  }, [])

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
      <div className="flex flex-row items-center justify-between pb-2 border-b-2">
        <span className="text-lg font-medium ps-2">Billing Address</span>
        <div className="flex flex-row items-center gap-2">
          {validAddress ? (<FaRegCheckCircle size={24} className="text-green-500"/>) : (<FaRegCircle size={24}/>)}
          {props.formOpen ? (<HiChevronDown size={24}/>) : (<HiChevronRight size={24}/>)}
        </div>
      </div>
      {props.formOpen && (
        <form className="flex flex-col w-full gap-2">
          {props.billingAddressesQuery.isLoading ? (
            <span className="flex flex-row gap-1 items-center">
              <span>Loading Saved Billing Addresses</span>
              <Loading />
            </span>
          ) : (
            props.billingAddresses.length > 0 && !creatingNewAddress ? (
              <div>
                <span className="">Saved Addresses</span>
                <optgroup>
                  {props.billingAddresses.map((address) => {
                    return (
                      <option>
                        <span>{address.addressLineOne}</span>
                      </option>
                    )
                  })}
                  <option>Create New</option>
                </optgroup>
              </div>
            ) : (
              <div>

              </div>
            )
          )}
        </form>
      )}
    </div>
  )
}