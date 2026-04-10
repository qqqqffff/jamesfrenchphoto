import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { AuthContext } from "../../auth"
import { PaymentService } from "../../services/paymentService"
import { CollectionPaymentStatus, CollectPaymentIntent, ComponentNotification, CustomerBillingAddress, CustomerSavedPaymentMethod, PaymentType } from "../../types"
import { INSTANCE_LOADING_STATE, PayPalCardFieldsProvider, useEligibleMethods, usePayPal } from "@paypal/react-paypal-js/sdk-v6"
import Loading from "../common/Loading"
import { HiChevronDown, HiChevronLeft } from "react-icons/hi"
import { UseQueryResult } from "@tanstack/react-query"
import { CardForm } from "./CardForm"
import { ApplePayCheckoutForm } from "./ApplePayCheckoutForm"
import { v4 } from 'uuid'
import { AddressForm } from "./AddressForm"
import { Checkbox, Tooltip } from "flowbite-react"

interface PaymentFormProps {
  intent: CollectPaymentIntent,
  PaymentService: PaymentService,
  auth: AuthContext,
  customerSavedPaymentMethods: CustomerSavedPaymentMethod[]
  billingAddresses: CustomerBillingAddress[]
  savedPaymentMethodsQuery: UseQueryResult<CustomerSavedPaymentMethod[], Error>
  billingAddressQuery: UseQueryResult<CustomerBillingAddress[], Error>
  collectionPaymentStatus?: CollectionPaymentStatus
  setCollectionPaymentStatus: Dispatch<SetStateAction<CollectionPaymentStatus | undefined>>
  setOrderProcessing: Dispatch<SetStateAction<boolean>>
  setPaymentNotifications: Dispatch<SetStateAction<ComponentNotification[]>>
}

export const PaymentForm = (props: PaymentFormProps) => {
  const paypal = usePayPal()
  const eligibleMethods = useEligibleMethods()
  console.log(eligibleMethods)
  const [cardInput, setCardInput] = useState<'address' | 'card' | 'none'>()
  const [billingInformation, setBillingInformation] = useState<CustomerBillingAddress & { saved: boolean }>()
  const [termsAccepted, setTermsAccepted] = useState(false)

  useEffect(() => {
    if(props.customerSavedPaymentMethods.length === 0) {
      setCardInput('address')
    }
  }, [props.customerSavedPaymentMethods])
  const savePaymentMethod = (
    props.intent.type === 'timeslot' && (props.intent.vaultNoshow ?? false)
  )

  const withPurchase = (
    props.intent.type === 'timeslot' && (props.intent.captureShortnotice ?? false)
  )

  const checkoutType: PaymentType | null = savePaymentMethod && !withPurchase ? (
    'save-payment'
  ) : (
    !savePaymentMethod && withPurchase ? (
      'purchase'
    ) : (
      savePaymentMethod && withPurchase ? (
        'save-payment-with-purchase'
      ) : (
        null
      )
    )
  )

  return (
    paypal.loadingStatus === INSTANCE_LOADING_STATE.PENDING ? (
      <span>
        <span>Loading Payment Form</span>
        <Loading />
      </span>
    ) : (
      <div className="flex flex-col gap-2">
        <button 
          className="w-full border rounded-lg px-2 py-1 flex flex-row items-center justify-between hover:bg-gray-100"
          onClick={() => setCardInput(prev => (prev === 'card' || prev === 'address') ? undefined : 'address')}
        > 
          <span className="text-lg font-medium ps-2">Card Payment</span>
          {cardInput !== undefined ? (<HiChevronDown size={24} />) : (<HiChevronLeft size={24} />)}
        </button>
        <div className={`${cardInput !== undefined ? '' : 'hidden'}`}>
          <div>
            <AddressForm 
              auth={props.auth}
              PaymentService={props.PaymentService}
              billingAddresses={props.billingAddresses}
              billingAddressesQuery={props.billingAddressQuery}
              formOpen={cardInput === 'address'}
              setFormOpen={setCardInput}
              onSubmit={(billingInfo) => {
                setBillingInformation(billingInfo)
                setCardInput('card')
              }}
            />
          </div>
          <div>
            <PayPalCardFieldsProvider>
              <CardForm 
                PaymentService={props.PaymentService}
                auth={props.auth}
                intent={props.intent}
                billingInformation={billingInformation}
                customerSavedPaymentMethods={props.customerSavedPaymentMethods}
                formOpen={cardInput === 'card'}
                allowedExpand={billingInformation !== undefined}
                setFormOpen={setCardInput}
                onSubmit={(response) => {
                  if(response.status === 'Fail') {
                    props.setPaymentNotifications(prev => [
                      ...prev,
                      {
                        id: v4(),
                        message: response.error ?? 'Unexpected error collection payment',
                        status: 'Error',
                        createdAt: new Date(),
                        autoClose: null
                      }
                    ])
                  }
                }}
              />
            </PayPalCardFieldsProvider>
          </div>
        </div>
        {checkoutType && (
          <ApplePayCheckoutForm 
            PaymentService={props.PaymentService}
            auth={props.auth}
            formtype={checkoutType}
            intent={props.intent}
            existingDefault={props.customerSavedPaymentMethods.some((method) => method.isDefault)}
            onSubmit={(response) => {
              if(response.status === 'Fail') {
                props.setPaymentNotifications(prev => [
                  ...prev,
                  {
                    id: v4(),
                    message: response.error ?? 'Unexpected error collection payment',
                    status: 'Error',
                    createdAt: new Date(),
                    autoClose: null
                  }
                ])
              }
            }}
            setOrderProcessing={props.setOrderProcessing}
          />
        )}
        {cardInput && (
          <div className="flex w-full justify-end">
            <button
              className="flex flex-row gap-1 rounded-lg px-2 py-1 border border-transparent hover:border-gray-300 items-center text-sm disabled:opacity-60"
              onClick={() => setTermsAccepted(!termsAccepted)}
              disabled={cardInput !== 'card' || billingInformation == undefined}
            >
              <Checkbox 
                className="focus:ring-0 focus:outline-none" 
                readOnly 
                checked={termsAccepted} 
                disabled={cardInput !== 'card' || billingInformation == undefined} 
                onClick={() => setTermsAccepted(!termsAccepted)}
              />
              <span className="flex flex-row items-center gap-1">
                <span>Accept the following</span>
                <Tooltip
                  style="light"
                  arrow={false}
                  trigger="click"
                  content={(
                    <div className="text-xs flex flex-col text-start">
                      <span className="font-medium text-base text-nowrap">Terms and Conditions for Payments and Card Holds</span>
                      <span className="text-nowrap">&bull; All payments are processed by PayPal.</span>
                      <span className="text-nowrap">&bull; Any payment related disputes will be handled by PayPal.</span>
                      <span className="text-nowrap">&bull; Storage and usage of payment information is managed by PayPal.</span>
                      <span className="text-nowrap">&bull; User payment information is never accessed, revealed, or interacted with by anyone at James French Photography.</span>
                      <span className="text-nowrap">&bull; Any card holds will be released 7 days after charge date.</span>
                      <span className="text-nowrap">&bull; Any further payment related questions or concerns about our payment processing can be sent to PayPal</span>
                    </div>
                  )}
                >
                  <span className="text-blue-400 hover:underline">Terms and Conditions</span>
                </Tooltip>
              </span>
            </button>
          </div>
        )}
      </div>
    )
  )
}