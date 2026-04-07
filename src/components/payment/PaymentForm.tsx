import { Dispatch, SetStateAction, useState } from "react"
import { AuthContext } from "../../auth"
import { PaymentService } from "../../services/paymentService"
import { CollectionPaymentStatus, CollectPaymentIntent, CustomerBillingAddress, CustomerSavedPaymentMethod, PaymentType } from "../../types"
import { INSTANCE_LOADING_STATE, useEligibleMethods, usePayPal } from "@paypal/react-paypal-js/sdk-v6"
import Loading from "../common/Loading"
import { HiChevronDown, HiChevronLeft } from "react-icons/hi"
import { UseQueryResult } from "@tanstack/react-query"
import { SaveCardForm } from "./SaveCardForm"
import { ApplePayCheckoutForm } from "./ApplePayCheckoutForm"

interface PaymentFormProps {
  intent: CollectPaymentIntent,
  PaymentService: PaymentService,
  auth: AuthContext,
  customerSavedPaymentMethods: CustomerSavedPaymentMethod[]
  billingInformation?: CustomerBillingAddress & { saved: boolean }
  savedPaymentMethodsQuery: UseQueryResult<CustomerSavedPaymentMethod[], Error>
  collectionPaymentStatus?: CollectionPaymentStatus
  setCollectionPaymentStatus: Dispatch<SetStateAction<CollectionPaymentStatus | undefined>>
}

export const PaymentForm = (props: PaymentFormProps) => {
  const paypal = usePayPal()
  const eligibleMethods = useEligibleMethods()
  console.log(eligibleMethods)
  const [paymentMethod, setPaymentMethod] = useState<{ 
    type: CustomerSavedPaymentMethod['type'],
    status: 'pending' | 'partial' | 'collected'
  }>()

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

  function RenderPaymentFormToUse(): JSX.Element | undefined {
    switch (paymentMethod?.type) {
      case 'APPLEPAY': {
        if(checkoutType === 'purchase') {
          return (
            <ApplePayCheckoutForm 
              formtype={checkoutType}
              intent={props.intent}
              onSubmit={(status) => {
                //TODO: handle status
              }}
            />
          )
        }
        else if(checkoutType === 'save-payment') {
          return (
            <></>
          )
        }
        else if(checkoutType === 'save-payment-with-purchase') {
          return (
            <></>
          )
        }
        return undefined
      }
      case 'CARD': {
        if(checkoutType === 'purchase') {
          return (
            <></>
          )
        }
        else if(checkoutType === 'save-payment') {
          return (
            <SaveCardForm 
              PaymentService={props.PaymentService}
              auth={props.auth}
              intent={props.intent}
              billingInformation={props.billingInformation}
              customerSavedPaymentMethods={props.customerSavedPaymentMethods}
              onSubmit={(status) => {
                //TODO: implement status and billing info collection
              }}
            />
          )
        }
        else if(checkoutType === 'save-payment-with-purchase') {
          return (
            <></>
          )
        }
        return undefined
      }
      case 'PAYPAL': {
        if(checkoutType === 'purchase') {
          return (
            <></>
          )
        }
        else if(checkoutType === 'save-payment') {
          return (
            <></>
          )
        }
        else if(checkoutType === 'save-payment-with-purchase') {
          return (
            <></>
          )
        }
        return undefined
      }
      default: {
        return undefined
      }
    }
  }

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
          onClick={() => setPaymentMethod(prev => prev?.type !== 'CARD' ? {
            type: 'CARD',
            status: 'partial'
          } : undefined)}
        >
          <span className="text-lg font-medium ps-2">Card</span>
          {paymentMethod?.type === 'CARD' ? (<HiChevronDown size={24} />) : (<HiChevronLeft size={24} />)}
        </button>

        <RenderPaymentFormToUse />
      </div>
    )
  )
}