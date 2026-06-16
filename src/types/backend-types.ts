import { APIMutationResponse, CustomerBillingAddress, PhotoSet } from ".";

export interface ChargeNoShowFeeAPIResponse extends Omit<APIMutationResponse, 'status'> {
  status: 'Success' | 'Fail' | 'ActionRequired'
  approvalUrl?: string
}

export interface CreateShortNoticeCancelationOrderAPIResponse extends APIMutationResponse {
  orderId?: string
}

export type AutoCompleteAddressResponse = Partial<Omit<CustomerBillingAddress, 'customerId' | 'default' | 'id' | 'userEmail'>> & { fullText: string }

export type AutoCompleteAddressAPIResponse = {
  status: 'Success'
  response: AutoCompleteAddressResponse[]
} | {
  status: 'Fail',
  error: string
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

export type AdminRetrieveCollectionAPIResponse = {
  status: 'Success',
  photoSets: PhotoSet[]
} | {
  status: 'Fail',
  error: string,
}