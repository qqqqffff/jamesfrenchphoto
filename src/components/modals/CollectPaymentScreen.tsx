import { useLocation } from "@tanstack/react-router";
import { AuthContext } from "../../auth";
import { PaymentService, SavePaymentInformationMutationParams } from "../../services/paymentService";
import { 
  PayPalProvider, 
  PayPalSavePaymentButton, 
  PayPalCardFieldsProvider,
  PayPalCardNumberField,
  PayPalCardExpiryField,
  PayPalCardCvvField,
  usePayPalCardFieldsSavePaymentSession,
  usePayPal,
  usePayPalCardFields
} from '@paypal/react-paypal-js/sdk-v6' 
import { useEffect, useState } from "react";
import { HiChevronDown, HiChevronLeft } from 'react-icons/hi'
import { useMutation } from "@tanstack/react-query";

interface CollectPaymentScreenProps {
  PaymentService: PaymentService,
  auth: AuthContext,
  intent: {
    type: 'timeslot',
    captureShortnotice?: boolean
    vaultNoshow?: boolean
  }
}

type CheckoutType = 
| 'purchase'
| 'save-payment'
| 'save-payment-with-purchase'

export const CollectPaymentScreen = (props: CollectPaymentScreenProps) => {
  
  const location = useLocation()
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'apple-pay' | 'paypal'>()

  const environment = location.href.includes('staging') || location.href.includes('localhost') ? 'sandbox' : 'production'

  return (
    <PayPalProvider
      pageType="mini-cart"
      clientId={environment === 'sandbox' ? import.meta.env.VITE_PAYPAL_SANDBOX_CLIENT_ID : import.meta.env.VITE_PAYPAL_CLIENT_ID}
      components={['applepay-payments', 'card-fields', 'paypal-payments']}
      environment={environment}
    >
      <button 
        className="w-full border rounded-lg px-2 py-1 flex flex-row items-center justify-between hover:bg-gray-100"
        onClick={() => setPaymentMethod(prev => prev !== 'card' ? 'card' : undefined)}
      >
        <span className="text-lg font-medium">Card</span>
        {paymentMethod === 'card' ? (<HiChevronDown size={24} />) : (<HiChevronLeft size={24} />)}
      </button>
      {paymentMethod === 'card' && (
        <CheckoutForm 
          intent={props.intent}
          PaymentService={props.PaymentService}
          auth={props.auth}
        />
      )}
    </PayPalProvider>
  )
}

const CheckoutForm = (props: {
  intent: CollectPaymentScreenProps['intent']
  PaymentService: PaymentService
  auth: AuthContext
}) => {
  const paypal = usePayPal()
  const savePaymentMethod = (
    props.intent.type === 'timeslot' && (props.intent.vaultNoshow ?? false)
  )

  const withPurchase = (
    props.intent.type === 'timeslot' && (props.intent.captureShortnotice ?? false)
  )

  const checkoutType: CheckoutType | null = savePaymentMethod && !withPurchase ? 'save-payment' : !savePaymentMethod && withPurchase ? 'purchase' : savePaymentMethod && withPurchase ? 'save-payment-with-purchase' : null
  console.log()

  return (
    <PayPalCardFieldsProvider>
      <SavePaymentMethodCardForm 
        PaymentService={props.PaymentService}
        auth={props.auth}
      />
    </PayPalCardFieldsProvider>
  )
}

const SavePaymentMethodCardForm = (props: {
  PaymentService: PaymentService,
  auth: AuthContext
}) => {
  const { error: cardFieldsError } = usePayPalCardFields()
  const { 
    error: submitError,
    submit,
    submitResponse
  } = usePayPalCardFieldsSavePaymentSession()

  useEffect(() => {
    if(!submitResponse) return

    const { vaultSetupToken, message } = submitResponse.data

    switch (submitResponse.state) {
      case 'succeeded': {
        // TODO: display success
        console.log(`successfully vaulted paymentMethod: ${vaultSetupToken}`)
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
    if(cardFieldsError) {
      console.error('Error loading paypal cardfields', cardFieldsError.message)
    }
    if(submitError) {
      console.error('Error submitting paypal fields save', submitError)
    }
  }, [cardFieldsError, submitError])

  const savePaymentMethodSetup = useMutation({
    mutationFn: (params: SavePaymentInformationMutationParams) => props.PaymentService.savePaymentInformationMutation(params)
  })

  const handleSubmit = async () => {
    if(props.auth.user) {
      const tokenResponse = await savePaymentMethodSetup.mutateAsync({
        userEmail: props.auth.user.profile.email,
        userId: props.auth.user.user.username,
        vaultRequest: {
          type: "Card",
          request: {

          }
        }
      })

      if(tokenResponse.status === 'Success') {
        submit(tokenResponse.tokenResponse)
      }
    }
    
  }

  

  return (
    <div>
      <PayPalCardNumberField 
        placeholder="Card number"
        containerClassName=""
      />
      <PayPalCardExpiryField 
        placeholder="MM/YY"
        containerClassName=""
      />
      <PayPalCardCvvField 
        placeholder="CVV"
        containerClassName=""
      />
      <button>Save Payment Method</button>
    </div>
  )
}