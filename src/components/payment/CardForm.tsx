import { usePayPalCardFields, usePayPalCardFieldsSavePaymentSession, PayPalCardNumberField, PayPalCardExpiryField, PayPalCardCvvField } from "@paypal/react-paypal-js/sdk-v6"
import { useMutation } from "@tanstack/react-query"
import { Checkbox } from "flowbite-react"
import { useState, useEffect, Dispatch, SetStateAction } from "react"
import { AuthContext } from "../../auth"
import { generateCancelURL, generateReturnURL } from "../../functions/paymentFunctions"
import { PaymentService, SavePaymentInformationMutationParams, ConfirmSavePaymentInformationMutationParams } from "../../services/paymentService"
import { APIMutationResponse, CollectPaymentIntent, CustomerBillingAddress, CustomerSavedPaymentMethod } from "../../types"
import { HiChevronDown, HiChevronLeft } from 'react-icons/hi'

interface CardFormProps {
  auth: AuthContext,
  PaymentService: PaymentService,
  intent: CollectPaymentIntent,
  billingInformation?: CustomerBillingAddress & { saved: boolean },
  customerSavedPaymentMethods: CustomerSavedPaymentMethod[]
  formOpen: boolean
  allowedExpand: boolean
  setFormOpen: Dispatch<SetStateAction<'address' | 'card' | 'none' | undefined>>
  onSubmit: (response: APIMutationResponse) => void
}

//TODO: handle different interactions based on intent
export const CardForm = (props: CardFormProps) => {
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
      console.error(submitError)
      return
    }

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
        setCustomerId(tokenResponse.customerId)
      }
    } 
  }

  return (
    <div>
      <div className="flex flex-col border w-full rounded-lg px-2 py-1 mt-2">
        <button
          className={`
            flex flex-row items-center justify-between
            ${props.formOpen ? 'border-b-2 pb-1' : ''}
            ${props.allowedExpand ? 'cursor-pointer' : 'cursor-default' }
          `}
          onClick={() => {
            if(!props.formOpen && props.allowedExpand) {
              props.setFormOpen('card')
            }
            else if(props.formOpen && props.allowedExpand){
              props.setFormOpen('none')
            }
          }}
        >
          <span className="text-lg font-medium ps-2">Card Details</span>
          {props.formOpen ? (<HiChevronDown size={24} />) : (<HiChevronLeft size={24} />)}
        </button>
        {/* className="flex flex-col gap-2 py-2 px-2 border rounded-lg mt-2" */}
      {/* > */}
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
                placeholder="Enter CVV"
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
                {/* TODO: change display based on intent */}
                Save Payment Method
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}