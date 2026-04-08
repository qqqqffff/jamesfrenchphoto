import { Dispatch, SetStateAction, useState } from "react"
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
  const [cardInput, setCardInput] = useState<'address' | 'card'>()
  const [billingInformation, setBillingInformation] = useState<CustomerBillingAddress & { saved: boolean }>()

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
          <span className="text-lg font-medium ps-2">Card</span>
          {cardInput !== undefined ? (<HiChevronDown size={24} />) : (<HiChevronLeft size={24} />)}
        </button>

        {cardInput !== undefined && (
          <div>
            <div>
              <AddressForm 
                PaymentService={props.PaymentService}
                auth={props.auth}
                submit={(response) => {
                  //TODO: deprecate me
                }}
                billingAddresses={props.billingAddresses}
                billingAddressesQuery={props.billingAddressQuery}
                formOpen={cardInput === 'address'}
              />
            </div>
            <div className={`${cardInput === 'card' ? '' : 'hidden'}`}>
              <PayPalCardFieldsProvider>
                <CardForm 
                  PaymentService={props.PaymentService}
                  auth={props.auth}
                  intent={props.intent}
                  billingInformation={billingInformation}
                  customerSavedPaymentMethods={props.customerSavedPaymentMethods}
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
        )}
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
      </div>
    )
  )
}