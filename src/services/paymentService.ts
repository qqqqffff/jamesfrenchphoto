import { Schema } from "../../amplify/data/resource";
import { V6Client } from '@aws-amplify/api-graphql'
import { APIMutationResponse, BaseAPIParams, Order, OrderItem, CustomerSavedPaymentMethod, CustomerProfile, CustomerBillingAddress, CollectPaymentIntent } from "../types";
import { 
  ChargeNoShowFeeAPIResponse, 
  SavePaymentInformationAPIResponse, 
  CreateShortNoticeCancelationOrderAPIResponse, 
  AutoCompleteAddressAPIResponse,
} from '../types/backend-types'
import { queryOptions } from "@tanstack/react-query";
import { stringToOrderRefID } from "../types/order-ref-id";
import { generateCancelURL, generateReturnURL } from "../functions/paymentFunctions";

export async function mapCustomerProfile(customerProfileResponse: Schema['CustomerProfile']['type'], options?: MapCustomerProfileOptions): Promise<CustomerProfile> {
  const start = new Date().getTime()
  const savedPaymentMethods = new Promise<CustomerSavedPaymentMethod[]>(async resolve => {
    if(options?.siPaymentMethods) {
      let paymentMethodsResponse = await customerProfileResponse.savedPaymentMethods()
      if(options.options?.logging) console.log(paymentMethodsResponse)
      const paymentMethodsData = paymentMethodsResponse.data

      while(paymentMethodsResponse.nextToken) {
        paymentMethodsResponse = await customerProfileResponse.savedPaymentMethods({
          nextToken: paymentMethodsResponse.nextToken
        })
        if(options.options?.logging) console.log(paymentMethodsResponse)
        paymentMethodsData.push(...paymentMethodsResponse.data)
      }

      resolve(paymentMethodsData.map((data) => {
        if(!data.type) return
        const mappedPaymentMethod: CustomerSavedPaymentMethod = {
          ...data,
          id: data.paymentMethodId,
          customerId: data.paypalCustomerId,
          type: data.type,
          isDefault: data.isDefault === 'true',
          billingAddressId: data.billingAddressId ?? undefined
        }
        return mappedPaymentMethod
      }).filter((method) => method !== undefined))
    }
    resolve([])
  })
  const billingAddresses = new Promise<CustomerBillingAddress[]>(async resolve => {
    if(options?.siBillingAddresses) {
      let billingAddressResponse = await customerProfileResponse.billingAddresses()
      if(options.options?.logging) console.log(billingAddressResponse)
      const billingAddressData = billingAddressResponse.data

      while(billingAddressResponse.nextToken) {
        billingAddressResponse = await customerProfileResponse.billingAddresses({
          nextToken: billingAddressResponse.nextToken
        })
        if(options.options?.logging) console.log(billingAddressResponse)
        billingAddressData.push(...billingAddressResponse.data)
      }

      resolve(billingAddressData.map((data) => {
        const mappedBillingAddress: CustomerBillingAddress = {
          ...data,
          addressLineTwo: data.addressLineTwo ?? undefined
        }
        
        return mappedBillingAddress
      }))
    }
    resolve([])
  })
  const orders = new Promise<Order[]>(async resolve => {
    if(options?.siOrders) {
      let ordersResponse = await customerProfileResponse.orders()
      if(options.options?.logging) console.log(ordersResponse)
      const ordersData = ordersResponse.data

      while(ordersResponse.nextToken) {
        ordersResponse = await customerProfileResponse.orders({
          nextToken: ordersResponse.nextToken
        })
        if(options.options?.logging) console.log(ordersResponse)
        ordersData.push(...ordersResponse.data)
      }

      resolve((await Promise.all(ordersData.map(async (orderData) => {
        const orderItems: OrderItem[] = await new Promise(async resolve => {
          if(options.siOrders?.siOrderItems) {
            let orderItemsResponse = await orderData.orderItems()
            if(options.options?.logging) console.log(orderItemsResponse)
            const orderItemsData = orderItemsResponse.data

            while(orderItemsResponse.nextToken) {
              orderItemsResponse = await orderData.orderItems({
                nextToken: orderItemsResponse.nextToken
              })
              if(options.options?.logging) console.log(orderItemsResponse)
              orderItemsData.push(...orderItemsResponse.data)
            }

            resolve(orderItemsData.map((item) => {
              const itemRefID = stringToOrderRefID(item.referenceId)
              if(!itemRefID) return
              const mappedOrderItem: OrderItem = {
                ...item,
                serviceChargeAmount: item.serviceCharge,
                referenceId: itemRefID
              }

              return mappedOrderItem
            }).filter((item) => item !== undefined))
          }
          resolve([])
        })

        const mappedOrder: Order = {
          ...orderData,
          items: orderItems,
          currency: 'USD',
          status: orderData.status ?? 'UNKNOWN'
        }

        return mappedOrder
      }))).filter((order) => order !== undefined))
    }
    resolve([])
  })

  const promises = await Promise.all([savedPaymentMethods, billingAddresses, orders])
  if(options?.options?.metric) console.log(`MAPCUSTOMERPROFILE:${new Date().getTime() - start}`)

  const mappedCustomerProfile: CustomerProfile = {
    ...customerProfileResponse,
    paypalCustomerId: customerProfileResponse.paypalCustomerId ?? undefined,
    savedPaymentMethods: promises[0],
    billingAddresses: promises[1],
    orders: promises[2],
  }

  return mappedCustomerProfile
}

export interface MapCustomerProfileOptions extends BaseAPIParams {
  siOrders?: {
    siOrderItems: boolean
  }
  siPaymentMethods?: boolean
  siBillingAddresses?: boolean,
}

export interface GetUserCustomerProfileOptions extends MapCustomerProfileOptions {
  userEmail?: string
}

export interface AutoCompleteAddressOptions extends BaseAPIParams {
  addressPart: string
  userEmail: string
}

export interface ChargeNoShowFeeMutationParams extends BaseAPIParams {
  timeslotId: string, 
  userEmail: string,
  userId: string,
  intent: CollectPaymentIntent
}

export interface CreateShortNoticeCancelationOrderMutationParams extends ChargeNoShowFeeMutationParams { 
  intent: CollectPaymentIntent
  vaulting?: {
    paymentType: 'CARD',
    billingAddress: CustomerBillingAddress & { saved: boolean }
  } | {
    paymentType: 'APPLEPAY' | 'PAYPAL',
  }
}

export interface CaptureShortNoticeCancelationOrderMutationParams extends CreateShortNoticeCancelationOrderMutationParams {
  orderId: string,
} 

export interface SavePaymentInformationMutationParams extends BaseAPIParams {
  userEmail: string,
  userId: string,
  paymentType: CustomerSavedPaymentMethod['type']
  cancelUrl?: string,
  returnUrl?: string,
  billingAddress?: CustomerBillingAddress & { saved: boolean }
  applePaymentToken?: string
}

export interface ConfirmSavePaymentInformationMutationParams extends BaseAPIParams {
  userEmail: string,
  paymentToken: string,
  customerId: string,
  paymentType: CustomerSavedPaymentMethod['type']
  default?: boolean,
}

export interface SaveCustomerBillingAddressMutationParams extends BaseAPIParams {
  userEmail: string,
  isDefault: boolean,
  addressLineOne: string,
  addressLineTwo?: string,
  adminAreaTwo: string,
  adminAreaOne: string,
  postalCode: string,
  countryCode: string
}

export interface AutoCompleteAddressMutationParams extends BaseAPIParams {
  userEmail: string,
  locationInput: string,
}

export interface GetUserSavedPaymentInformationOptions extends BaseAPIParams {
  userEmail?: string
  role: 'OWNER' | 'ADMIN'
}

export interface GetTimeslotOrdersOptions extends BaseAPIParams {
  timeslotId: string,
}

interface GetUserBillingAddressesOptions extends BaseAPIParams {
  userEmail?: string,
}

export class PaymentService {
  private client: V6Client<Schema>
  constructor(client: V6Client<Schema>) {
    this.client = client
  }

  async chargeNoShowFeeMutation(params: ChargeNoShowFeeMutationParams): Promise<ChargeNoShowFeeAPIResponse> {
    const start = new Date().getTime()
    try {
      const response = await this.client.mutations.ChargeNoShowFee({
        timeslotId: params.timeslotId,
        userEmail: params.userEmail,
        returnUrl: generateReturnURL(params.intent),
        cancelUrl: generateCancelURL(params.intent)
      })
      if(params.options?.logging) console.log(response)

      if(params.options?.metric) console.log(`CHARGENOSHOWFEE: ${new Date().getTime() - start}`)
      if(!response.data || JSON.parse(response.data.toString()) as ChargeNoShowFeeAPIResponse === undefined) {
        return {
          status: 'Fail',
          error: 'Recieved invalid response'
        }
      }
      
      return JSON.parse(response.data.toString())
    } catch (error) {
      return {
        status: 'Fail',
        error: 'Unexpected error please try again later.'
      }
    }
  }

  async createShortNoticeCancelationOrderMutation(params: CreateShortNoticeCancelationOrderMutationParams): Promise<CreateShortNoticeCancelationOrderAPIResponse> {
    const start = new Date().getTime()
    try {
      const response = await this.client.mutations.CreateShortNoticeCancelationOrder({
        timeslotId: params.timeslotId,
        userEmail: params.userEmail,
        userId: params.userId,
        returnUrl: generateReturnURL(params.intent),
        cancelUrl: generateCancelURL(params.intent),
        vaulting: params.vaulting ? {
          vault: true,
          paymentSource: params.vaulting.paymentType,
          billingAddressId: params.vaulting.paymentType === 'CARD' && params.vaulting.billingAddress.saved ? params.vaulting.billingAddress.id : undefined,
          billingAddressInfo: params.vaulting.paymentType === 'CARD' && !params.vaulting.billingAddress.saved ? params.vaulting.billingAddress : undefined,
        } : undefined
      })
      if(params.options?.logging) console.log(response)
      if(params.options?.metric) console.log(`CHARGENOSHOWFEE: ${new Date().getTime() - start}`)
      if(!response.data || JSON.parse(response.data.toString()) as CreateShortNoticeCancelationOrderAPIResponse === undefined) {
        return {
          status: 'Fail',
          error: 'Recieved invalid response'
        }
      }
      
      return JSON.parse(response.data.toString())
    }catch (error) {
      return {
        status: 'Fail',
        error: 'Unexpected error please try again later'
      }
    }
  }

  async captureShortNoticeCancelationOrderMutation(params: CaptureShortNoticeCancelationOrderMutationParams): Promise<APIMutationResponse> {
    console.log(params)
    return {
      status: 'Success'
    }
  }

  async savePaymentInformationMutation(params: SavePaymentInformationMutationParams): Promise<SavePaymentInformationAPIResponse> {
    const start = new Date().getTime()
    try {
      const response = await this.client.mutations.SavePaymentInformation({
        userEmail: params.userEmail,
        userId: params.userId,
        paymentType: params.paymentType,
        cancelUrl: params.cancelUrl,
        returnUrl: params.returnUrl,
        billingAddressId: params.billingAddress?.saved ? params.billingAddress.id : undefined,
        billingAddressJson: !params.billingAddress?.saved ? params.billingAddress : undefined,
        applePayToken: params.applePaymentToken
      })
      if(params.options?.logging) console.log(response)
      if(params.options?.metric) console.log(`SAVEPAYMENTINFO: ${new Date().getTime() - start}`)

      if(!response.data || JSON.parse(response.data.toString()) as SavePaymentInformationAPIResponse === undefined) {
        return {
          status: 'Fail',
          error: 'Recieved invalid response'
        }
      }

      return JSON.parse(response.data.toString())
    } catch (error) {
      return {
        status: 'Fail',
        error: 'Unexpected error please try again later'
      }
    }
  }

  async confirmSavePaymentInformationMutation(params: ConfirmSavePaymentInformationMutationParams): Promise<APIMutationResponse> {
    const start = new Date().getTime()
    try {
      let currPaymentMethods = await this.client.models.CustomerSavedPaymentMethod.listCustomerSavedPaymentMethodByUserEmail({
        userEmail: params.userEmail
      })
      if(params.options?.logging) console.log(currPaymentMethods)
      const currData = currPaymentMethods.data

      if(currData.length >= 5) {
        if(params.options?.metric) console.log(`CONFIRMSAVEPAYMENTINFO: ${new Date().getTime() - start}`)
        return {
          status: 'Fail',
          error: 'Customer has too many saved payment methods'
        }
      }

      while(currPaymentMethods.nextToken) {
        currPaymentMethods = await this.client.models.CustomerSavedPaymentMethod.listCustomerSavedPaymentMethodByUserEmail({
          userEmail: params.userEmail
        }, {
          nextToken: currPaymentMethods.nextToken
        })
        if(params.options?.logging) console.log(currPaymentMethods)
        currData.push(...currPaymentMethods.data)

        if(currData.length >= 5) {
          if(params.options?.metric) console.log(`CONFIRMSAVEPAYMENTINFO: ${new Date().getTime() - start}`)
          return {
            status: 'Fail',
            error: 'Customer has too many saved payment methods'
          }
        }
      }

      const response = await this.client.mutations.CompleteVault({
        paymentType: params.paymentType,
        userEmail: params.userEmail,
        isDefault: params.default,
        setupToken: params.paymentToken
      })
      if(params.options?.logging) console.log(response)
      if(params.options?.metric) console.log(`CONFIRMSAVEPAYMENTINFO: ${new Date().getTime() - start}`)
      if(!response.data || JSON.parse(response.data.toString()) as APIMutationResponse === undefined) {
        return {
          status: 'Fail',
          error: 'Recieved invalid response'
        }
      }

      return JSON.parse(response.data.toString())
    } catch (error) {
      return {
        status: 'Fail',
        error: 'Unexpected error please try again later'
      }
    }
  }

  async saveCustomerBillingAddressMutation(params: SaveCustomerBillingAddressMutationParams): Promise<APIMutationResponse> {
    const start = new Date().getTime()
    try {
      const response = await this.client.models.CustomerBillingAddresses.create({
        default: params.isDefault,
        createdAt: new Date().toISOString(),
        addressLineOne: params.addressLineOne,
        addressLineTwo: params.addressLineTwo,
        adminAreaOne: params.adminAreaOne,
        adminAreaTwo: params.adminAreaTwo,
        countryCode: params.countryCode,
        userEmail: params.userEmail,
        postalCode: params.postalCode
      })
      if(params.options?.logging) console.log(response)

      if(response.data) {
        if(params.options?.metric) console.log(`CREATECUSTOMERBILLING:${new Date().getTime() - start}ms`)
        return {
          status: 'Success'
        }
      }
      return {
        status: 'Fail',
        error: 'Received invalid response from server'
      }
    } catch(err) {
      return {
        status: 'Fail',
        error: 'Unexpected error occurred'
      } 
    }
  }

  // ---------------- get requests ----------------

  private async getUserSavedPaymentInformation(options: GetUserSavedPaymentInformationOptions): Promise<CustomerSavedPaymentMethod[]> {
    if(!options.userEmail) return []
    const start = new Date().getTime()
    
    let paymentMethodResponse = await this.client.models.CustomerSavedPaymentMethod.listCustomerSavedPaymentMethodByUserEmail({ userEmail: options.userEmail })
    const paymentMethodData = paymentMethodResponse.data
    if(options.options?.logging) console.log(paymentMethodResponse)

    while(paymentMethodResponse.nextToken) {
      paymentMethodResponse = await this.client.models.CustomerSavedPaymentMethod.listCustomerSavedPaymentMethodByUserEmail({
        userEmail: options.userEmail
      }, {
        nextToken: paymentMethodResponse.nextToken
      })
      if(options.options?.logging) console.log(paymentMethodResponse)
      paymentMethodData.push(...paymentMethodResponse.data)
    }

    const mappedPaymentMethods: CustomerSavedPaymentMethod[] = paymentMethodData.map((data) => {
      if(!data.type) return
      if(options.role === 'ADMIN') {
        //if admin return minimum information
        const paymentMethod: CustomerSavedPaymentMethod = {
          id: data.paymentMethodId,
          customerId: data.paypalCustomerId,
          type: data.type,
          isDefault: data.isDefault === 'true',
          userEmail: data.userEmail
        }
        return paymentMethod
      }
      else {
        const paymentMethod: CustomerSavedPaymentMethod = {
          id: data.paymentMethodId,
          customerId: data.paypalCustomerId,
          vaultId: data.paypalVaultId,
          type: data.type,
          isDefault: data.isDefault === 'true',
          userEmail: data.userEmail
        }
        return paymentMethod
      }
    }).filter((data) => data !== undefined)

    if(options.options?.metric) console.log(`GETALLUSERPAYMENTMETHODS:${new Date().getTime() - start}`)
    return mappedPaymentMethods
  }

  private async getTimeslotOrders(options: GetTimeslotOrdersOptions): Promise<Order[]> {
    const start = new Date().getTime()
    let orderItemsResponse = await this.client.models.OrderItems.listOrderItemsByItemId({ 
      itemId: options.timeslotId,
    })
    if(options.options?.logging) console.log(orderItemsResponse)
    const orderItems = orderItemsResponse.data

    while(orderItemsResponse.nextToken) {
      orderItemsResponse = await this.client.models.OrderItems.listOrderItemsByItemId({ 
        itemId: options.timeslotId,
      }, {
        nextToken: orderItemsResponse.nextToken
      })
      if(options.options?.logging) console.log(orderItemsResponse)
      orderItems.push(...orderItemsResponse.data)
    }

    const orders: Order[] = []

    orderItems.forEach(async (data) => {
      const itemRefID = stringToOrderRefID(data.referenceId)
      if(!itemRefID) return

      const mappedOrderItem: OrderItem = {
        ...data,
        serviceChargeAmount: data.serviceCharge,
        referenceId: itemRefID
      }
      const foundIndex = orders.findIndex((order) => order.id == data.orderId)
      
      if(foundIndex !== -1) {
        orders[foundIndex].items.push(mappedOrderItem)
        return
      }

      const order = await data.order()
      if(options.options?.logging) console.log(order)
      if(order.data) {
        const mappedOrder: Order = {
          ...order.data,
          currency: 'USD',
          status: order.data.status ?? 'UNKNOWN',
          userEmail: order.data.userEmail,
          paymentApprovalUrl: order.data.approvalUrl ?? undefined,
          items: [ mappedOrderItem ]
        }

        orders.push(mappedOrder)
      }
    })
    
    if(options.options?.metric) console.log(`GETUSERTIMESLOTORDERS:${new Date().getTime() - start}`)

    return orders
  }

  private async getUserBillingAddresses(options: GetUserBillingAddressesOptions): Promise<CustomerBillingAddress[]> {
    if(!options.userEmail) return []
    const start = new Date().getTime()

    let billingAddressesResponse = await this.client.models.CustomerBillingAddresses.listCustomerBillingAddressesByUserEmail({
      userEmail: options.userEmail,
    })
    if(options.options?.logging) console.log(billingAddressesResponse)
    const billingAddressesData = billingAddressesResponse.data

    while(billingAddressesResponse.nextToken) {
      billingAddressesResponse = await this.client.models.CustomerBillingAddresses.listCustomerBillingAddressesByUserEmail({
        userEmail: options.userEmail
      }, {
        nextToken: billingAddressesResponse.nextToken
      })
      if(options.options?.logging) console.log(billingAddressesResponse)
      billingAddressesData.push(...billingAddressesResponse.data)
    }

    const mappedBillingAddresses = billingAddressesData.map((data) => {
      const mappedAddress: CustomerBillingAddress = {
        ...data,
        addressLineTwo: data.addressLineTwo ?? undefined
      }
      return mappedAddress
    })
    if(options.options?.metric) console.log(`USERBILLINGADDRESSES:${new Date().getTime() - start}ms`)

    return mappedBillingAddresses
  }

  private async getUserCustomerProfile(options: GetUserCustomerProfileOptions): Promise<CustomerProfile | null> {
    if(!options.userEmail) {
      return null
    }
    const start = new Date().getTime()
    const customerProfileResponse = await this.client.models.CustomerProfile.get({ userEmail: options.userEmail })
    if(!customerProfileResponse.data) {
      //attempt to create a user profile
      return null
    }

    const mappedCustomerProfile = await mapCustomerProfile(customerProfileResponse.data, options)
    if(options.options?.metric) console.log(`GETUSERCUSTOMERPROFILE:${new Date().getTime() - start}ms`)

    
    return mappedCustomerProfile
  }

  private async autoCompleteAddress(options: AutoCompleteAddressOptions): Promise<AutoCompleteAddressAPIResponse | null> {
    if(options.addressPart.length < 3 || !options.userEmail) return null
    const start = new Date().getTime()

    const response = await this.client.queries.AutoCompleteAddress({
      locationLineOne: options.addressPart,
      userEmail: options.userEmail
    })
    if(options.options?.logging) console.log(response)

    if(response.data) {
      try {
        const parsedResponse = JSON.parse(response.data.toString()) as AutoCompleteAddressAPIResponse
        if(parsedResponse === undefined || parsedResponse.status === undefined ) {
          return {
            status: 'Fail',
            error: 'Recieved invalid response from server'
          }
        }
        if(options.options?.metric) console.log(`AUTOCOMPLETEADDRESS:${new Date().getTime() - start}ms`)
        return parsedResponse
      } catch (err) {
        console.error(err)
        return {
          status: 'Fail',
          error: 'Recieved invalid response from server'
        }
      }
    }

    return null
  }

  getUserSavedPaymentMethodsQueryOptions = (options: GetUserSavedPaymentInformationOptions) => queryOptions({
    queryKey: ['saved-payment-methods', options.userEmail, options.role],
    queryFn: () => this.getUserSavedPaymentInformation(options)
  })

  getTimeslotOrdersQueryOptions = (options: GetTimeslotOrdersOptions) => queryOptions({
    queryKey: ['timeslot-orders', options],
    queryFn: () => this.getTimeslotOrders(options)
  })

  getUserBillingAddressesQueryOptions = (options: GetUserBillingAddressesOptions) => queryOptions({
    queryKey: ['user-billing-addresses', options],
    queryFn: () => this.getUserBillingAddresses(options)
  })

  getUserCustomerProfileQueryOptions = (options: GetUserCustomerProfileOptions) => queryOptions({
    queryKey: ['customer-profile', options],
    queryFn: () => this.getUserCustomerProfile(options)
  })

  autoCompleteAddressQueryOptions = (options: AutoCompleteAddressOptions) => queryOptions({
    queryKey: ['auto-complete-address', options],
    queryFn: () => this.autoCompleteAddress(options)
  })
}