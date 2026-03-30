import { AuthContext } from "../../auth";
import { PaymentService } from "../../services/paymentService";

interface CollectPaymentScreenProps {
  PaymentService: PaymentService,
  auth: AuthContext
}

export const CollectPaymentScreen = (props: CollectPaymentScreenProps) => {
  return (
    <div>Hello world</div>
  )
}