import { Dispatch, SetStateAction } from "react"
import { AuthContext } from "../../auth"
import { PaymentService } from "../../services/paymentService"
import { APIMutationResponse, CollectPaymentIntent, CustomerBillingAddress, CustomerSavedPaymentMethod, PaymentType } from "../../types"
import { HiChevronDown, HiChevronLeft } from 'react-icons/hi'
import { SavePaymentForm } from "./SavePaymentForm"
import { PaymentForm } from "./PaymentForm"

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
  paymentType: PaymentType
}

//TODO: handle different interactions based on intent
export const CardForm = (props: CardFormProps) => {

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
        {props.paymentType === 'save-payment' && (
          <SavePaymentForm 
            intent={props.intent}
            auth={props.auth}
            PaymentService={props.PaymentService}
            customerSavedPaymentMethods={props.customerSavedPaymentMethods}
            billingInformation={props.billingInformation}
            onSubmit={props.onSubmit}
            formOpen={props.formOpen}
          />
        )}
        {(
          props.paymentType === 'purchase' || 
          props.paymentType === 'save-payment-with-purchase'
        ) && (
          <PaymentForm 
            intent={props.intent}
            auth={props.auth}
            PaymentService={props.PaymentService}
            customerSavedPaymentMethods={props.customerSavedPaymentMethods}
            onSubmit={props.onSubmit}
            formOpen={props.formOpen}
            paymentType={props.paymentType}
            billingInformation={props.billingInformation}
          />
        )}
      </div>
    </div>
  )
}