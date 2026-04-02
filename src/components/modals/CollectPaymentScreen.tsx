import { AuthContext } from "../../auth";
import { ConfirmSavePaymentInformationMutationParams, PaymentService, SavePaymentInformationMutationParams } from "../../services/paymentService";
import { 
  PayPalProvider, 
  PayPalSavePaymentButton, 
  PayPalCardFieldsProvider,
  PayPalCardNumberField,
  PayPalCardExpiryField,
  PayPalCardCvvField,
  usePayPalCardFieldsSavePaymentSession,
  usePayPal,
  usePayPalCardFields,
  useEligibleMethods,
  CardFieldComponent,
  INSTANCE_LOADING_STATE
} from '@paypal/react-paypal-js/sdk-v6' 
import { useEffect, useState } from "react";
import { HiChevronDown, HiChevronLeft } from 'react-icons/hi'
import { useMutation, useQuery } from "@tanstack/react-query";
import { CollectPaymentIntent, CustomerBillingAddress, CustomerSavedPaymentMethod } from "../../types";
import { generateCancelURL, generateReturnURL } from "../../functions/paymentFunctions";

interface CollectPaymentScreenProps {
  PaymentService: PaymentService,
  auth: AuthContext,
  intent: CollectPaymentIntent,
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
  const [paymentMethod, setPaymentMethod] = useState<CustomerSavedPaymentMethod['type']>()
  const [formStep, setFormStep] = useState<'billing' | 'payment' | 'review'>('billing')
  const [saveBillingAddress, setSaveBillingAddress] = useState(true)
  const paypal = usePayPal()

  const userBillingAddressesQueries = useQuery(props.PaymentService.getUserBillingAddressesQueryOptions({
    userEmail: props.auth.user?.profile.email
  }))

  const getUserSavedPaymentMethodsQueries = useQuery(props.PaymentService.getUserSavedPaymentMethodsQueryOptions({
    userEmail: props.auth.user?.profile.email,
    role: 'OWNER'
  }))

  return (
    <div className="flex flex-col gap-2">
      <div></div>
      {}
      {(paypal.loadingStatus === INSTANCE_LOADING_STATE.PENDING) ? (
        <span>Loading PayPal</span>
      ) : ( 
        <div>
          <button 
            className="w-full border rounded-lg px-2 py-1 flex flex-row items-center justify-between hover:bg-gray-100"
            onClick={() => setPaymentMethod(prev => prev !== 'CARD' ? 'CARD' : undefined)}
          >
            <span className="text-lg font-medium">Card</span>
            {paymentMethod === 'CARD' ? (<HiChevronDown size={24} />) : (<HiChevronLeft size={24} />)}
          </button>
          {paymentMethod === 'CARD' && (
            <CheckoutForm 
              intent={props.intent}
              PaymentService={props.PaymentService}
              auth={props.auth}
            />
          )}
        </div>
      )}
    </div>
  )
}

const CheckoutForm = (props: {
  intent: CollectPaymentIntent
  PaymentService: PaymentService
  auth: AuthContext
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
      />
    </PayPalCardFieldsProvider>
  )
}

const SavePaymentMethodCardForm = (props: {
  PaymentService: PaymentService,
  auth: AuthContext,
  intent: CollectPaymentIntent,
  billingInformation?: CustomerBillingAddress & { saved: boolean }
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
        </div>
      </div>
      {!cardFieldsError && (
        <button className="card-fields-pay-button" 
        // onClick={handleSubmit}
        >
          Save Payment Method
        </button>
      )}
    </div>
  )
}