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
  tokenResponse: string,
} | {
  status: 'Fail',
  error: string,
}

export type SavePaymentInformationVaultRequest = {
  type: 'ApplePay'
  request: VaultApplePayRequest
} | {
  type: 'PaypalWallet'
  request: VaultPaypalWalletRequest
} | {
  type: 'Card',
  request: SetupTokenRequestCard
}

export type CapturePaymentRequest = {
  type: 'Vault',
  paymentMethodId: string,
} | {
  type: 'Card'
}