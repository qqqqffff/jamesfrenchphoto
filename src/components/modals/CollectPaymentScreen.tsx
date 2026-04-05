import { AuthContext } from "../../auth";
import { ConfirmSavePaymentInformationMutationParams, PaymentService, SavePaymentInformationMutationParams } from "../../services/paymentService";
import { 
  PayPalCardFieldsProvider,
  PayPalCardNumberField,
  PayPalCardExpiryField,
  PayPalCardCvvField,
  usePayPalCardFieldsSavePaymentSession,
  usePayPal,
  usePayPalCardFields,
  INSTANCE_LOADING_STATE,
  ApplePayMerchantSession
} from '@paypal/react-paypal-js/sdk-v6' 
import { useEffect, useState } from "react";
import { HiChevronDown, HiChevronLeft } from 'react-icons/hi'
import { useMutation, useQuery } from "@tanstack/react-query";
import { CollectPaymentFormStep, CollectPaymentIntent, CustomerBillingAddress, CustomerSavedPaymentMethod } from "../../types";
import { generateCancelURL, generateReturnURL } from "../../functions/paymentFunctions";
import { AddressForm } from "../payment/AddressForm";
import { AutoCompleteAddressResponse } from "../../types/backend-types";
import { Checkbox } from "flowbite-react";

interface CollectPaymentScreenProps {
  PaymentService: PaymentService,
  auth: AuthContext,
  intent: CollectPaymentIntent,
  terms: JSX.Element,
  successPaymentMethodCapture: (
    vaultId: string,
    options: {
      savePaymentSuccess?: boolean
    }
  ) => void
}

type CheckoutType = 
| 'purchase'
| 'save-payment'
| 'save-payment-with-purchase'



export const CollectPaymentScreen = (props: CollectPaymentScreenProps) => {
  const [paymentMethod, setPaymentMethod] = useState<{ 
    type: CustomerSavedPaymentMethod['type'],
    status: 'pending' | 'partial' | 'collected'
  }>()
  const [formStep, setFormStep] = useState<CollectPaymentFormStep>('payment')
  const [billingAddress, setBillingAddress] = useState<Omit<AutoCompleteAddressResponse, 'fullText'>>()
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const paypal = usePayPal()

  paypal.sdkInstance?.findEligibleMethods().then((response) => {
    console.log(response.getDetails('card'))
  })

  const userBillingAddressesQuery = useQuery(props.PaymentService.getUserBillingAddressesQueryOptions({
    userEmail: props.auth.user?.profile.email
  }))

  const userSavedPaymentMethodsQuery = useQuery(props.PaymentService.getUserSavedPaymentMethodsQueryOptions({
    userEmail: props.auth.user?.profile.email,
    role: 'OWNER'
  }))

  const validateFormStep = {
    billing: billingAddress !== undefined,
    payment: paymentMethod?.status === 'pending',
    review: acceptedTerms,
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2">
        <button
          className="w-full border rounded-lg px-2 py-1 flex flex-row items-center justify-between hover:bg-gray-100"
          onClick={() => setFormStep('payment')}
        >
          <span className="text-lg font-medium ps-2">Payment Details</span>
          <div className="flex flex-row gap-2 items-center">
            {formStep === 'payment' ? (<HiChevronDown size={24} />) : (<HiChevronLeft size={24} />)}
          </div>
        </button>
        {formStep === 'payment' && (
          (paypal.loadingStatus === INSTANCE_LOADING_STATE.PENDING) ? (
            <span>Loading PayPal</span>
          ) : ( 
            <div>
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
              {paymentMethod?.type === 'CARD' && (
                <CheckoutForm 
                  intent={props.intent}
                  PaymentService={props.PaymentService}
                  auth={props.auth}
                  customerSavedPaymentMethods={userSavedPaymentMethodsQuery.data ?? []}
                />
              )}
            </div>
          )
        )}
      </div>
      <div>
        {paymentMethod?.type === 'CARD' && (
          <button
            className="w-full border rounded-lg px-2 py-1 flex flex-row items-center justify-between hover:bg-gray-100"
            onClick={() => setFormStep('billing')}
          >
            <span className="text-lg font-medium ps-2">Billing Info</span>
            <div className="flex flex-row gap-2 items-center">
              {formStep === 'billing' ? (<HiChevronDown size={24} />) : (<HiChevronLeft size={24} />)}
            </div>
          </button>
        )}
        {formStep === 'billing' && (
            <AddressForm 
              auth={props.auth}
              PaymentService={props.PaymentService}
              submit={(billingAddress) => {

              }}
            />
          )}
      </div>
    </div>
  )
}

const CheckoutForm = (props: {
  intent: CollectPaymentIntent
  PaymentService: PaymentService
  auth: AuthContext,
  customerSavedPaymentMethods: CustomerSavedPaymentMethod[]
}) => {
  
  const savePaymentMethod = (
    props.intent.type === 'timeslot' && (props.intent.vaultNoshow ?? false)
  )

  const withPurchase = (
    props.intent.type === 'timeslot' && (props.intent.captureShortnotice ?? false)
  )

  const checkoutType: CheckoutType | null = savePaymentMethod && !withPurchase ? (
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
    <PayPalCardFieldsProvider
      change={(event) => console.log(event)}
    >
      <SavePaymentMethodCardForm 
        PaymentService={props.PaymentService}
        auth={props.auth}
        intent={props.intent}
        // TODO: implement me
        billingInformation={undefined}
        customerSavedPaymentMethods={props.customerSavedPaymentMethods}
      />
    </PayPalCardFieldsProvider>
  )
}

const SavePaymentMethodCardForm = (props: {
  PaymentService: PaymentService,
  auth: AuthContext,
  intent: CollectPaymentIntent,
  billingInformation?: CustomerBillingAddress & { saved: boolean },
  customerSavedPaymentMethods: CustomerSavedPaymentMethod[]
}) => {
  const {
    error: cardFieldsError
  } = usePayPalCardFields()
  const { 
    error: submitError,
    submit,
    submitResponse
  } = usePayPalCardFieldsSavePaymentSession()
  const [customerId, setCustomerId] = useState<string>()
  const [isDefault, setIsDefault] = useState(false)

  useEffect(() => {
    if(!submitResponse) return

    const { vaultSetupToken, message } = submitResponse.data

    switch (submitResponse.state) {
      case 'succeeded': {
        // TODO: display success
        console.log(`successfully vaulted paymentMethod: ${vaultSetupToken}, message: ${message}`)
        if(confirmSavePaymentMethod.isIdle && props.auth.user && customerId) {
          confirmSavePaymentMethod.mutateAsync({
            userEmail: props.auth.user.profile.email,
            customerId: customerId,
            paymentToken: vaultSetupToken,
            default: isDefault,
            paymentType: 'CARD',
            options: {
              logging: true
            }
          })
        }
        break
      }
      case 'failed': {
        //TODO: display error
        console.log(`Save payment method failed: ${vaultSetupToken}, message: ${message}`)
        break;
      }
    }
  }, [submitResponse])

  useEffect(() => {
    if(props.customerSavedPaymentMethods.length === 0) {
      setIsDefault(true)
    }
  }, [props.customerSavedPaymentMethods])

  const savePaymentMethodSetup = useMutation({
    mutationFn: (params: SavePaymentInformationMutationParams) => props.PaymentService.savePaymentInformationMutation(params)
  })

  const confirmSavePaymentMethod = useMutation({
    mutationFn: (params: ConfirmSavePaymentInformationMutationParams) => props.PaymentService.confirmSavePaymentInformationMutation(params)
  })

  const handleSubmit = async () => {
    if(props.auth.user && props.billingInformation) {
      const tokenResponse = await savePaymentMethodSetup.mutateAsync({
        userEmail: props.auth.user.profile.email,
        userId: props.auth.user.user.username,
        paymentType: 'CARD',
        cancelUrl: generateCancelURL(props.intent),
        returnUrl: generateReturnURL(props.intent),
        billingAddress: props.billingInformation
      })
      console.log(tokenResponse)

      if(tokenResponse.status === 'Success') {
        submit(tokenResponse.setupTokenResponse)
      }
    } 
  }

  return (
    <div>
      <div
        className="flex flex-col gap-2 py-2 px-2 border rounded-lg mt-2"
      >
        <PayPalCardNumberField
          containerStyles={{
            height: "2.5rem",
          }}
          placeholder="Enter card number"
        />
        <div className="flex flex-row gap-4">
          <PayPalCardExpiryField
            containerStyles={{
              height: "2.5rem",
              width: '10rem',
            }}
            placeholder="MM/YY"
          />
          <PayPalCardCvvField
            containerStyles={{
              height: "2.5rem",
              width: '10rem',
            }}
            placeholder="Enter CVV"
          />
          <button
            className="flex flex-row gap-1 items-center disabled:opacity-60"
            onClick={() => setIsDefault(!isDefault)}
            disabled={props.customerSavedPaymentMethods.length === 0}
          >
            <Checkbox checked={isDefault} readOnly />
            <span>Set Default</span>
          </button>
        </div>
      </div>
      {!cardFieldsError && (
        <div className="flex flex-row w-full py-2 justify-end">
          <button 
            className="px-2 py-1 rounded-lg enabled:hover:gray-100 disabled:opacity-60 border"
          // onClick={handleSubmit}
          >
            Save Payment Method
          </button>
        </div>
      )}
    </div>
  )
}