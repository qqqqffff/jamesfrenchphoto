import { AuthContext } from "../../auth"
import { PaymentService } from "../../services/paymentService"
import { AutoCompleteAddressResponse } from "../../types/backend-types"

interface AddressFormProps {
  auth: AuthContext,
  PaymentService: PaymentService,
  submit: (billingAddress: Omit<AutoCompleteAddressResponse, 'fullText'>) => void
}

export const AddressForm = (props: AddressFormProps) => {
  return (
    <div>

    </div>
  )
}