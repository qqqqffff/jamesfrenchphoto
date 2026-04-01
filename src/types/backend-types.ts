import { VaultApplePayRequest, VaultPaypalWalletRequest, SetupTokenRequestCard } from "@paypal/paypal-server-sdk";
import { APIMutationResponse } from ".";

export interface ChargeNoShowFeeAPIResponse extends Omit<APIMutationResponse, 'status'> {
  status: 'Success' | 'Fail' | 'ActionRequired'
}

export interface CreateShortNoticeCancelationOrderAPIResponse extends APIMutationResponse {
  orderId?: string
}

export type SavePaymentInformationAPIResponse = {
  status: 'Success'
  setupTokenResponse: string,
  customerId: string,
} | {
  status: 'Fail',
  error: string,
}

export type CapturePaymentRequest = {
  type: 'Vault',
  paymentMethodId: string,
} | {
  type: 'Card'
}