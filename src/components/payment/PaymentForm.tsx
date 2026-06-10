import { PayPalCardCvvField, PayPalCardExpiryField, PayPalCardNumberField, usePayPalCardFields, usePayPalCardFieldsOneTimePaymentSession } from "@paypal/react-paypal-js/sdk-v6"
import { AuthContext } from "../../auth"
import { CaptureShortNoticeCancelationOrderMutationParams, CreateShortNoticeCancelationOrderMutationParams, PaymentService } from "../../services/paymentService"
import { CollectPaymentIntent, CustomerBillingAddress, CustomerSavedPaymentMethod, APIMutationResponse, PaymentType } from "../../types"
import { useEffect, useState } from "react"
import { Checkbox } from "flowbite-react"
import { useMutation } from "@tanstack/react-query"
import { formatUserName } from "../../functions/clientFunctions"

interface PaymentFormProps {
  auth: AuthContext,
  PaymentService: PaymentService,
  intent: CollectPaymentIntent
  billingInformation?: CustomerBillingAddress & { saved: boolean }
  customerSavedPaymentMethods: CustomerSavedPaymentMethod[],
  onSubmit: (response: APIMutationResponse) => void
  formOpen: boolean
  paymentType: PaymentType
}

export const PaymentForm = (props: PaymentFormProps) => {
  const {
    error: cardFieldsError
  } = usePayPalCardFields()
  const {
    error: submitError,
    submit,
    submitResponse
  } = usePayPalCardFieldsOneTimePaymentSession()
  const [isDefault, setIsDefault] = useState(false)
  
  useEffect(() => {
    if(!submitResponse) return
    if(submitError) {
      //TODO: do something with the error
      console.error(submitError)
      return
    }

    const response = submitResponse.data

    switch(submitResponse.state) {
      case 'succeeded': {
        console.log(`successfully completed order: ${response.orderId}${response.message ? `, message: ${response.message}` : ''}${response.liabilityShift ? `, liability shift: ${response.liabilityShift}` : ''}`)
        //TODO: add handler
        switch(props.intent.type) {
          case 'timeslot': {

            break
          }
          default: {
            console.error('invalid intent, aborting payment')
            break
          }
        }

      }
    }
  }, [submitResponse])

  const createShortNoticeCancelationOrder = useMutation({
    mutationFn: (params: CreateShortNoticeCancelationOrderMutationParams) => props.PaymentService.createShortNoticeCancelationOrderMutation(params)
  })

  const captureShortNoticeCancelationOrder = useMutation({
    mutationFn: (params: CaptureShortNoticeCancelationOrderMutationParams) => props.PaymentService.captureShortNoticeCancelationOrderMutation(params)
  })

  const handleSubmit = async () => {
    if(props.auth.user && props.billingInformation)
    switch(props.intent.type) {
      case 'timeslot': {
        createShortNoticeCancelationOrder.mutateAsync({
          timeslotId: props.intent.timeslotId,
          userEmail: props.auth.user.profile.email,
          userId: props.auth.user.user.userId,
          vaulting: props.paymentType === 'save-payment-with-purchase' ? {
            paymentType: 'CARD',
            billingAddress: props.billingInformation
          } : undefined,
          intent: props.intent
        }).then((response) => {
          if(response.status === 'Success' && response.orderId) {
            submit(response.orderId, {
              name: formatUserName(props.auth.user?.profile),
              billingAddress: props.billingInformation
            }).then(() => {
              if(response.orderId) {
                captureShortNoticeCancelationOrder.mutateAsync({
                  orderId: response.orderId,
                  intent: props.intent,
                  timeslotId: props.intent.timeslotId,
                  userEmail: props.auth.user!.profile.email,
                  userId: props.auth.user!.user.userId,
                })
              }
            }).catch(() => {
              //TODO: do something with error
            })
          }
          else if(response.status === 'Fail' || !response.orderId) {
            //TODO: display error
          }
        }).catch(() => {
          //TODO: do something with error
        })
        break;
      }
      default: {
        console.error('invalid intent, aborting order creation')
        break;
      }
    }
  }


  return (
    <div className={`flex flex-col gap-3 ${props.formOpen ? 'pt-4 pb-2 px-2' : 'hidden'}`}>
      <PayPalCardNumberField 
        containerStyles={{
          height: '2rem',
          width: 'full'
        }}
        placeholder="Enter card number"
      />
      <div className="flex flex-row w-full items-center justify-between">
        <div className="flex flex-row items-center gap-4">
          <PayPalCardExpiryField 
            containerStyles={{
              height: '2rem',
              width: '8rem',
            }}
            placeholder="MM/YY"
          />
          <PayPalCardCvvField 
            containerStyles={{
              height: '2rem',
              width: '8rem',
            }}
            placeholder="CVV"
          />
        </div>
        {props.paymentType === 'save-payment-with-purchase' && (
          <button
            className="flex flex-row gap-1 items-center disabled:opacity-60"
            onClick={() => setIsDefault(!isDefault)}
            disabled={props.customerSavedPaymentMethods.length === 0}
          >
            <Checkbox checked={isDefault} readOnly />
            <span>Set Default</span>
          </button>
        )}
      </div>
      {!cardFieldsError && (
        <div className="flex flex-row w-full py-2 justify-end">
          <button
            className="px-2 py-1 rounded-lg enabled:hover:gray-100 disabled:opacity-60 border"
            onClick={handleSubmit}
          >
            {props.paymentType === 'save-payment-with-purchase' ? "Save Payment Method" : "Pay Now"}
          </button>
        </div>
      )}
    </div>
  )
}
