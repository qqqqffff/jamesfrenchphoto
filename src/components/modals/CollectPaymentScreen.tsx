import { AuthContext } from "../../auth";
import { PaymentService } from "../../services/paymentService";
import { 
  usePayPal,
} from '@paypal/react-paypal-js/sdk-v6' 
import { useState } from "react";
import { HiChevronDown, HiChevronLeft } from 'react-icons/hi'
import { useQuery } from "@tanstack/react-query";
import { CollectionPaymentStatus, CollectPaymentFormStep, CollectPaymentIntent } from "../../types";
import { AddressForm } from "../payment/AddressForm";
import { AutoCompleteAddressResponse } from "../../types/backend-types";
import { PaymentForm } from "../payment/PaymentForm";

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



export const CollectPaymentScreen = (props: CollectPaymentScreenProps) => {
  const [paymentMethod, setPaymentMethod] = useState<CollectionPaymentStatus>()
  const [formStep, setFormStep] = useState<CollectPaymentFormStep>('payment')
  const [billingAddress, setBillingAddress] = useState<Omit<AutoCompleteAddressResponse, 'fullText'>>()
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const paypal = usePayPal()

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
          <PaymentForm 
            intent={props.intent}
            PaymentService={props.PaymentService}
            auth={props.auth}
            customerSavedPaymentMethods={userSavedPaymentMethodsQuery?.data ?? []}
            savedPaymentMethodsQuery={userSavedPaymentMethodsQuery}
            collectionPaymentStatus={paymentMethod}
            setCollectionPaymentStatus={setPaymentMethod}
          />
        )}
      </div>
      <div>
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