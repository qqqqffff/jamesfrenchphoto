import { PayPalCardCvvField, PayPalCardExpiryField, PayPalCardNumberField, usePayPalCardFields, usePayPalCardFieldsSavePaymentSession } from "@paypal/react-paypal-js/sdk-v6"
import { useMutation } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { ConfirmSavePaymentInformationMutationParams, PaymentService, SavePaymentInformationMutationParams } from "../../services/paymentService"
import { AuthContext } from "../../auth"
import { APIMutationResponse, CollectPaymentIntent, CustomerBillingAddress, CustomerSavedPaymentMethod } from "../../types"
import { generateCancelURL, generateReturnURL } from "../../functions/paymentFunctions"
import { Checkbox } from "flowbite-react"

interface SavePaymentFormProps {
  auth: AuthContext,
  PaymentService: PaymentService,
  intent: CollectPaymentIntent
  billingInformation?: CustomerBillingAddress & { saved: boolean }
  customerSavedPaymentMethods: CustomerSavedPaymentMethod[],
  onSubmit: (response: APIMutationResponse) => void
  formOpen: boolean
}

export const SavePaymentForm = (props: SavePaymentFormProps) => {
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
    if(submitError) {
      //TODO: do something with the error
      console.error(submitError)
      return
    }

    const { vaultSetupToken, message } = submitResponse.data

    switch (submitResponse.state) {
      case 'succeeded': {
        
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
          }).then((response) => {
            //TODO: implement on submit in parent
            props.onSubmit(response)
          }).catch((err) => {
            console.error(err)
            props.onSubmit({
              status: 'Fail',
              error: 'Unexpected Error Occurred'
            })
          })
        }
        break
      }
      case 'canceled':
      case "failed": {
        //TODO: do something with error
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
      //TODO: add error handling
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
        setCustomerId(tokenResponse.customerId)
      }
    }
  }

  return (
    <div className={`flex flex-col gap-3 ${props.formOpen ? 'pt-4 pb-2 px-2' : 'hidden'}`}>
      <PayPalCardNumberField
        containerStyles={{
          height: "2rem",
          width: 'full'
        }}
        placeholder="Enter card number"
      />
      <div className="flex flex-row w-full items-center justify-between">
        <div className="flex flex-row items-center gap-4">
          <PayPalCardExpiryField
            containerStyles={{
              height: "2rem",
              width: '8rem',
            }}
            placeholder="MM/YY"
          />
          <PayPalCardCvvField
            containerStyles={{
              height: "2rem",
              width: '8rem',
            }}
            placeholder="CVV"
          />
        </div>
        <button
          className="flex flex-row gap-1 items-center disabled:opacity-60"
          onClick={() => setIsDefault(!isDefault)}
          disabled={props.customerSavedPaymentMethods.length === 0}
        >
          <Checkbox checked={isDefault} readOnly />
          <span>Set Default</span>
        </button>
      </div>
      {!cardFieldsError && (
        <div className="flex flex-row w-full py-2 justify-end">
          <button 
            className="px-2 py-1 rounded-lg enabled:hover:gray-100 disabled:opacity-60 border"
            onClick={handleSubmit}
          >
            Save Payment Method
          </button>
        </div>
      )}
    </div>
  )
}