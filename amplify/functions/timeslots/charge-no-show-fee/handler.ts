import { 
  Client, 
  Environment, 
  LogLevel, 
  OrderRequest, 
  CheckoutPaymentIntent, 
  OrdersController,
  PayeeBase,
  PurchaseUnitRequest,
  OrderStatus,
  ApiResponse,
  Order,
} from '@paypal/paypal-server-sdk'
import { Schema } from '../../../data/resource'
import { APIMutationResponse, OrderItem, Timeslot, Order as OrderType } from '../../../../src/types'
import { env } from '$amplify/env/charge-no-show-fee'
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime'
import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/api'
import { formatTimeslotDates } from '../../../../src/utils'
import { Duration, DateTime } from 'luxon'
import { OrderRefID } from '../../../../src/types/order-ref-id'
import { generateTimeslotInvoiceId, retrieveTimeslotOrderTransactionType, timeslotIdInvoiceIdCompare } from "../../../../src/utils/timeslotOrderUtils";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)
Amplify.configure(resourceConfig, libraryOptions)

const dynamoClient = generateClient<Schema>()

export interface ChargeNoShowFeeAPIResponse extends Omit<APIMutationResponse, 'status'> {
  status: 'Success' | 'Fail' | 'ActionRequired'
}

export const handler: Schema['ChargeNoShowFee']['functionHandler'] = async (event) => {
  let response: ChargeNoShowFeeAPIResponse | undefined
  if(!event.arguments.timeslotId || !event.arguments.userEmail) {
    response = {
      status: 'Fail',
      error: 'Timeslot Id or User Email Missing.'
    }
    return response
  }

  //cleaning secrets
  const paypalClientId = (env.PAYPAL_CLIENT_ID ?? '').replace(/[^A-z-0-9]+/g, '')
  const paypalSecretKey = (env.PAYPAL_SECRET_KEY ?? '').replace(/[^A-z-0-9]+/g, '')
  const paypalMerchantId = (env.PAYPAL_MERCHANT_ID ?? '').replace(/[^A-z-0-9]+/g, '')

  if(!paypalClientId || !paypalSecretKey || !paypalMerchantId) {
    response = {
      status: 'Fail',
      error: 'Missing client, secret keys, or merchant ID'
    }
    return response
  }

  const branch = process.env.AWS_BRANCH ?? 'sandbox'
  const isProd = branch === 'main'

  const client = new Client({
    clientCredentialsAuthCredentials:  {
      oAuthClientId: paypalClientId,
      oAuthClientSecret: paypalSecretKey
    },
    timeout: 180000,
    environment: isProd ? Environment.Production : Environment.Sandbox,
    logging: {
      logLevel: isProd ? LogLevel.Warn : LogLevel.Info,
      logRequest: {
        logBody: !isProd
      },
      logResponse: {
        logHeaders: !isProd
      }
    }
  })

  const timeslotData = await dynamoClient.models.Timeslot.get({ id: event.arguments.timeslotId })

  if(!timeslotData.data) {
    response = {
      status: 'Fail',
      error: 'Recieved no timeslot data'
    }
    return response
  } else if(!timeslotData.data.noshowFee) {
    response = {
      status: 'Fail',
      error: 'Timeslot does not have a noshow fee'
    }
    return response
  } else if(!timeslotData.data.participantId && !timeslotData.data.register) {
    response = {
      status: 'Fail',
      error: 'Timeslot is not registered'
    }
    return response
  }

  const timeslot: Timeslot = {
    ...timeslotData.data,
    description: timeslotData.data.description ?? undefined,
    register: timeslotData.data.register ?? undefined,
    noshowFee: timeslotData.data.noshowFee ?? undefined,
    cancelationFee: timeslotData.data.cancelationFee ? {
      amount: timeslotData.data.cancelationFee.amount,
      window: Duration.fromISO(timeslotData.data.cancelationFee.window)
    } : undefined,
    start: new Date(timeslotData.data.start),
    end: new Date(timeslotData.data.end),
    participantId: timeslotData.data.participantId ?? undefined,
  }


  let registeredEmail = timeslotData.data.register
  if(registeredEmail === null) {
    const participantData = await dynamoClient.models.Participant.get({ id: timeslotData.data.participantId! })
    if(!participantData.data) {
      response = {
        status: 'Fail',
        error: 'Recieved invalid registration'
      }
      return response
    }
    registeredEmail = participantData.data.userEmail
  }

  if(registeredEmail !== event.arguments.userEmail || registeredEmail === null) {
    response = {
      status: 'Fail',
      error: 'User email mismatch'
    }
    return response
  }

  if(DateTime.fromJSDate(timeslot.start).diffNow().toMillis() > 0) {
    response = {
      status: 'Fail',
      error: 'Timeslot has not passed'
    }
    return response
  }
  else if(Math.abs(DateTime.fromJSDate(timeslot.start).diffNow().toMillis()) > Duration.fromObject({ days: 7 }).toMillis()) {
    response = {
      status: 'Fail',
      error: 'Seven day window to charge no show fee has passed'
    }
    return response
  }

  const customerProfile = await dynamoClient.models.CustomerProfile.get({ userEmail: registeredEmail.toLowerCase() })

  if(!customerProfile.data) {
    response = {
      status: 'Fail',
      error: 'No saved payment methods for user'
    }
    return response
  }

  let savedPaymentMethodsResponse = await dynamoClient.models.SavedPaymentMethod.listSavedPaymentMethodByUserEmail({ 
    userEmail: registeredEmail
  })
  const savedPaymentMethodsData = savedPaymentMethodsResponse.data

  while(savedPaymentMethodsResponse.nextToken) {
    savedPaymentMethodsResponse = await dynamoClient.models.SavedPaymentMethod.listSavedPaymentMethodByUserEmail({
      userEmail: registeredEmail,
    }, {
      nextToken: savedPaymentMethodsResponse.nextToken
    })
    savedPaymentMethodsData.push(...savedPaymentMethodsResponse.data)
  }

  if(savedPaymentMethodsData.length === 0) {
    response = {
      status: 'Fail',
      error: 'Failed to recieve saved payment method to charge'
    }
    return response
  }

  let paymentMethodToCharge = savedPaymentMethodsData.find(paymentMethod => paymentMethod.isDefault)
  if(!paymentMethodToCharge || paymentMethodToCharge.type === null) {
    console.log('No default found, using first saved payment method')
    paymentMethodToCharge = savedPaymentMethodsData[0]
  }

  if(!paymentMethodToCharge.paypalVaultId || paymentMethodToCharge.type === null) {
    response = {
      status: 'Fail',
      error: 'Failed to recieve saved payment method to charge'
    }
    return response
  }

  const orderController = new OrdersController(client)

  const payee: PayeeBase = {
    emailAddress: 'aws.jfphoto@gmail.com',
    merchantId: paypalMerchantId
  }

  const noshowInvoiceId = generateTimeslotInvoiceId(timeslot, customerProfile.data.userId, 'noshow')
  const serviceFee = parseFloat((timeslotData.data.noshowFee * 0.02).toFixed(2))
  const softDescriptor = 'JFP Noshow Fee'
  const description = `Noshow fee for missed timeslot on ${timeslot.start.toLocaleDateString('en-us', { timeZone: 'America/Chicago' })} at ${formatTimeslotDates(timeslot)}`

  const noshowFee: PurchaseUnitRequest = {
    referenceId: OrderRefID.NoShowFee,
    invoiceId: noshowInvoiceId,
    amount: {
      currencyCode: 'USD',
      value: timeslotData.data.noshowFee.toFixed(2),
      breakdown: {
        itemTotal: {
          value: timeslotData.data.noshowFee.toFixed(2),
          currencyCode: 'USD'
        },
        taxTotal: {
          value: '0',
          currencyCode: 'USD'
        }
      }
    },
    payee: payee,
    paymentInstruction: {
      platformFees: [
        {
          amount: {
            currencyCode: 'USD',
            value: serviceFee.toFixed(2)
          },
          payee: payee
        }
      ]
    },
    supplementaryData: {
      card: {
        level2: {
          invoiceId: noshowInvoiceId,
          taxTotal: {
            value: '0',
            currencyCode: 'USD'
          }
        },
      }
    },
    softDescriptor: softDescriptor,
    description: description
  }

  const request: OrderRequest = {
    intent: CheckoutPaymentIntent.Capture,
    purchaseUnits: [ noshowFee ],
    paymentSource: {
      applePay: paymentMethodToCharge.type === 'APPLEPAY' ? {
        vaultId: paymentMethodToCharge.paypalVaultId
      } : undefined,
      card: paymentMethodToCharge.type === 'CARD' ? {
        vaultId: paymentMethodToCharge.paypalVaultId,
      } : undefined,
      paypal: paymentMethodToCharge.type === 'PAYPAL' ? {
        vaultId: paymentMethodToCharge.paypalVaultId,
      } : undefined
    },
  }

  const orderItems: OrderItem[] = [
    {
      name: softDescriptor,
      description: description,
      amount: timeslotData.data.noshowFee,
      serviceChargeAmount: serviceFee,
      refrenceId: OrderRefID.NoShowFee,
      invoiceId: noshowInvoiceId,
    }
  ]

  //try and retrieve inprogress orders before creating a new one

  let timeslotIdOrders = await dynamoClient.models.OrderItems.listOrderItemsByItemIdAndUserEmail({
    itemId: timeslot.id,
    userEmail: {
      eq: registeredEmail.toLowerCase()
    }
  })
  const timeslotOrdersData = timeslotIdOrders.data

  while(timeslotIdOrders.nextToken) {
    timeslotIdOrders = await dynamoClient.models.OrderItems.listOrderItemsByItemIdAndUserEmail({
      itemId: timeslot.id,
      userEmail: {
        eq: registeredEmail.toLowerCase()
      }
    }, {
      nextToken: timeslotIdOrders.nextToken
    })
    timeslotOrdersData.push(...timeslotIdOrders.data)
  }

  const customerOrders = (await Promise.all(timeslotOrdersData.map(async (data) => {
    const orderResponse = await data.order()
    if(orderResponse.data) {
      const mappedOrder: OrderType = {
        ...orderResponse.data,
        id: orderResponse.data.paypalOrderId,
        currency: 'USD',
        status: orderResponse.data.status ?? 'UNKNOWN',
        transactionType: orderResponse.data.transactionType ?? 'timeslot',
        items: JSON.parse(orderResponse.data.items.toString())
      }
      return mappedOrder
    }
  }))).filter((item) => item !== undefined)

  let orderResponse: ApiResponse<Order> | undefined

  if(customerOrders.some((order) => (
    order.status === 'COMPLETED' && 
    order.items.length === 1 &&
    retrieveTimeslotOrderTransactionType(order.items[0].invoiceId) === 'noshow'
  ))) {
    response = {
      status: 'Fail',
      error: 'Payment already captured'
    }
    return response
  }
  else if(customerOrders.length > 0) {
    const foundOrder = customerOrders.find((order) => (
      order.status !== OrderStatus.Completed && 
      order.items.length === 1 &&
      retrieveTimeslotOrderTransactionType(order.items[0].invoiceId) === 'noshow'
    ))
    if(foundOrder) {
      orderResponse = await orderController.captureOrder({
        id: foundOrder.id,
        prefer: 'return=representation',
        paypalRequestId: `${noshowInvoiceId}-capture`
      })

      const approvalUrl = orderResponse.result.links?.find((l) => l.rel === 'payer-action')?.href

      await dynamoClient.models.Orders.update({
        paypalOrderId: foundOrder.id,
        status: orderResponse.result.status,
        approvalUrl: approvalUrl,
      })
      if (orderResponse.result.status === 'COMPLETED') {
        response = { 
          status: 'Success' 
        }
        return response
      } else {
        response = { 
          status: 'Fail', 
          error: `Retry capture returned: ${orderResponse.result.status}` 
        }
        return response
      }
    }
    else {
      response = {
        status: 'Fail',
        error: 'Failed to retry payment capture'
      }
      return response
    }
  }
  else {
    orderResponse = await orderController.createOrder({
      body: request,
      prefer: 'return=representation',
      paypalRequestId: noshowInvoiceId,
    })
  }

  console.log(orderResponse.result)

  const { status, id } = orderResponse.result
  let finalOrderStatus: OrderStatus | undefined

  if(!status || !id) {
    response = {
      status: 'Fail',
      error: 'Failed to capture payment'
    }
    return response
  }

  switch (status) {
    case 'COMPLETED': {
      finalOrderStatus = OrderStatus.Completed
      break
    }
    case 'CREATED':
    case 'APPROVED': {
      const captureResponse = await orderController.captureOrder({
        id,
        prefer: 'return=representation',
        paypalRequestId: `${noshowInvoiceId}-capture`
      })

      if(captureResponse.result.status !== 'COMPLETED') {
        const approvalUrl = orderResponse.result.links?.find((l) => l.rel === 'payer-action')?.href
        const logResponse = await dynamoClient.models.Orders.create({
          paypalCustomerId: customerProfile.data.paypalCustomerId,
          paypalOrderId: id,
          amount: timeslotData.data.noshowFee,
          serviceFee: serviceFee,
          currency: 'USD',
          status: captureResponse.result.status,
          transactionType: 'timeslot',
          items: orderItems,
          userEmail: registeredEmail.toLowerCase(),
          approvalUrl: approvalUrl
        })

        const logOrderItem = await dynamoClient.models.OrderItems.create({
          itemId: timeslot.id,
          orderId: id,
          userEmail: registeredEmail.toLowerCase()
        })

        if(!logResponse.data || !logOrderItem.data) {
          response = {
            status: 'Fail',
            error: 'Payment Capture Failure'
          }
          return response
        }

        response = {
          status: 'Fail',
          error: 'Capture incomplete, retry available.'
        }
        return response
      }

      finalOrderStatus = captureResponse.result.status

      break
    }
    case 'PAYER_ACTION_REQUIRED': {
      finalOrderStatus = OrderStatus.PayerActionRequired
      break
    }
    case 'VOIDED':
    default: {
      response = {
        status: 'Fail',
        error: 'Failed to capture payment'
      }
      return response
    }
  }

  console.log(orderItems)

  const approvalUrl = orderResponse.result.links?.find((l) => l.rel === 'payer-action')?.href
  let orderLogResponse = await dynamoClient.models.Orders.create({
    paypalCustomerId: customerProfile.data.paypalCustomerId,
    paypalOrderId: id,
    amount: timeslotData.data.noshowFee,
    serviceFee: serviceFee,
    currency: 'USD',
    status: finalOrderStatus,
    transactionType: 'timeslot',
    items: orderItems,
    userEmail: registeredEmail.toLowerCase(),
    approvalUrl: approvalUrl,
  })
  
  let orderItemsLogResponse = await dynamoClient.models.OrderItems.create({
    itemId: timeslot.id,
    orderId: id,
    userEmail: registeredEmail.toLowerCase()
  })

  if(orderLogResponse.data === null || orderItemsLogResponse.data === null) {
    response = {
      status: 'Fail',
      error: 'Failed to log order in database'
    }
    return response
  }


  if(finalOrderStatus === 'PAYER_ACTION_REQUIRED') {
    dynamoClient.queries.NotifyUser({
      email: registeredEmail,
      subject: softDescriptor,
      content: `<p>You are being charged a <strong>$${timeslotData.data.noshowFee.toFixed(2)}</strong> ${description}.</p><p>Please approve the charge${approvalUrl ? ` at <a href='${approvalUrl}'>${approvalUrl}</a>` : ''} to prevent further disruptions in our services.</p><p>Thank you from the JFP team</p><br/><br/><p style="font-size: 12px;">Please note: Charges are subject to a 2% service fee to keep our platform running.</p>`
    })
    response = {
      status: 'ActionRequired'
    }
    return response
  }

  dynamoClient.queries.NotifyUser({
    email: registeredEmail,
    subject: softDescriptor,
    content: `<p>You are being charged a <strong>$${timeslotData.data.noshowFee.toFixed(2)}</strong> ${description}.</p><p>Thank you from the JFP team</p><br/><br/><p style="font-size: 12px;">Please note: Charges are subject to a 2% service fee to keep our platform running.</p>`
  })

  response = {
    status: 'Success'
  }

  return response
}

