import { Schema } from "../../amplify/data/resource";
import { V6Client } from '@aws-amplify/api-graphql'
import { APIMutationResponse, BaseAPIParams, Order, OrderItem, SavedPaymentMethod } from "../types";
import { 
  ChargeNoShowFeeAPIResponse, 
  SavePaymentInformationVaultRequest, 
  SavePaymentInformationAPIResponse, 
  CreateShortNoticeCancelationOrderAPIResponse 
} from '../types/backend-types'
import { queryOptions } from "@tanstack/react-query";

export interface ChargeNoShowFeeMutationParams extends BaseAPIParams {
  timeslotId: string, 
  userEmail: string
}

export interface CreateShortNoticeCancelationOrderMutationParams extends ChargeNoShowFeeMutationParams { }

export interface SavePaymentInformationMutationParams extends BaseAPIParams {
  userEmail: string,
  userId: string,
  vaultRequest: SavePaymentInformationVaultRequest
}

export interface ConfirmSavePaymentInformationMutationParams extends BaseAPIParams {
  userEmail: string,
  setupToken: string,
}

export interface GetUserSavedPaymentInformationOptions extends BaseAPIParams {
  userEmail: string
  role: 'OWNER' | 'ADMIN'
}

export interface GetTimeslotOrdersOptions extends BaseAPIParams {
  timeslotId: string,
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
        userEmail: params.userEmail
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
        userEmail: params.userEmail
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

  async savePaymentInformationMutation(params: SavePaymentInformationMutationParams): Promise<SavePaymentInformationAPIResponse> {
    const start = new Date().getTime()
    try {
      const response = await this.client.mutations.SavePaymentInformation({
        userEmail: params.userEmail,
        userId: params.userId,
        vaultRequest: params.vaultRequest
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
      const response = await this.client.mutations.ConfirmSavePaymentInformation({
        userEmail: params.userEmail,
        setupToken: params.setupToken,
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

  private async getUserSavedPaymentInformation(options: GetUserSavedPaymentInformationOptions): Promise<SavedPaymentMethod[]> {
    const start = new Date().getTime()
    if(options.options?.logging) console.log('api call')
    let paymentMethodResponse = await this.client.models.SavedPaymentMethod.listSavedPaymentMethodByUserEmail({ userEmail: options.userEmail })
    const paymentMethodData = paymentMethodResponse.data

    while(paymentMethodResponse.nextToken) {
      paymentMethodResponse = await this.client.models.SavedPaymentMethod.listSavedPaymentMethodByUserEmail({
        userEmail: options.userEmail
      }, {
        nextToken: paymentMethodResponse.nextToken
      })
      paymentMethodData.push(...paymentMethodResponse.data)
    }

    const mappedPaymentMethods: SavedPaymentMethod[] = paymentMethodData.map((data) => {
      if(!data.type) return
      if(options.role === 'ADMIN') {
        //if admin return minimum information
        const paymentMethod: SavedPaymentMethod = {
          id: data.paymentMethodId,
          customerId: data.paypalCustomerId,
          type: data.type,
          isDefault: data.isDefault ?? false,
          userEmail: data.userEmail
        }
        return paymentMethod
      }
      else {
        const paymentMethod: SavedPaymentMethod = {
          id: data.paymentMethodId,
          customerId: data.paypalCustomerId,
          vaultId: data.paypalVaultId,
          type: data.type,
          isDefault: data.isDefault ?? false,
          lastDigits: data.lastDigits ?? undefined,
          brand: data.brand ?? undefined,
          expireMonth: data.expireMonth ?? undefined,
          expireYear: data.expireYear ?? undefined,
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
    if(options.options?.logging) console.log('API call')
    let orderItemsResponse = await this.client.models.OrderItems.listOrderItemsByItemId({ 
      itemId: options.timeslotId,
    })
    const orderItems = orderItemsResponse.data

    while(orderItemsResponse.nextToken) {
      orderItemsResponse = await this.client.models.OrderItems.listOrderItemsByItemIdAndUserEmail({ 
        itemId: options.timeslotId,
      }, {
        nextToken: orderItemsResponse.nextToken
      })
      orderItems.push(...orderItemsResponse.data)
    }
    
    const mappedOrders: Order[] = (await Promise.all(orderItems.map(async (data) => {
      const order = await data.order()
      if(order.data) {
        try {
          const items = JSON.parse(order.data.items.toString())
          if(items as OrderItem[] === undefined || items.length !== 1) {
            return
          }
          const mappedOrder: Order = {
            id: order.data.paypalOrderId,
            customerId: order.data.paypalCustomerId ?? undefined,
            amount: order.data.amount,
            serviceFee: order.data.serviceFee,
            currency: 'USD',
            status: order.data.status ?? 'UNKNOWN',
            transactionType: 'timeslot',
            items: items as OrderItem[],
            userEmail: order.data.userEmail,
            paymentApprovalUrl: order.data.approvalUrl ?? undefined
          }

          return mappedOrder
        } catch {
          return
        }
      }
      return
    }))).filter(order => order !== undefined)
    if(options.options?.metric) console.log(`GETUSERTIMESLOTORDERS:${new Date().getTime() - start}`)

    return mappedOrders
  }

  getUserSavedPaymentMethodsQueryOptions = (options: GetUserSavedPaymentInformationOptions) => queryOptions({
    queryKey: ['saved-payment-methods', options.userEmail, options.role],
    queryFn: () => this.getUserSavedPaymentInformation(options)
  })

  getTimeslotOrdersQueryOptions = (options: GetTimeslotOrdersOptions) => queryOptions({
    queryKey: ['timeslot-orders', options],
    queryFn: () => this.getTimeslotOrders(options)
  })
}