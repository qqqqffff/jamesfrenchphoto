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
import { APIMutationResponse, OrderItem, Timeslot } from '../../../../src/types'
import { env } from '$amplify/env/charge-no-show-fee'
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime'
import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/api'
import { formatTimeslotDates } from '../../../../src/utils'
import { Duration, DateTime } from 'luxon'
import { OrderRefID } from '../../../../src/types/order-ref-id'
import { generateTimeslotInvoiceId, timeslotIdInvoiceIdCompare } from "../../../../src/utils/timeslotOrderUtils";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)
Amplify.configure(resourceConfig, libraryOptions)

const dynamoClient = generateClient<Schema>()

export interface ChargeNoShowFeeAPIResponse extends Omit<APIMutationResponse, 'status'> {
  status: 'Success' | 'Fail' | 'ActionRequired'
  approvalUrl?: string
}

export const handler: Schema['ChargeNoShowFee']['functionHandler'] = async (event) => {
  let response: APIMutationResponse | undefined
  if(!event.arguments.timeslotId || !event.arguments.userEmail) {
    response = {
      status: 'Fail',
      error: 'Timeslot Id or User Email Missing.'
    }
    return response
  }

  //cleaning secrets
  const paypalClientId = (process.env.PAYPAL_CLIENT_ID ?? '').replace(/[^A-z-0-9]+/g, '')
  const paypalSecretKey = (process.env.PAYPAL_SECRET_KEY ?? '').replace(/[^A-z-0-9]+/g, '')
  const paypalMerchantId = (process.env.PAYPAL_MERCHANT_ID ?? '').replace(/[^A-z-0-9]+/g, '')

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
    timeout: 120000,
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
    return {
      status: 'Fail',
      error: 'Recieved no timeslot data'
    }
  } else if(!timeslotData.data.noshowFee) {
    return {
      status: 'Fail',
      error: 'Timeslot does not have a noshow fee'
    }
  } else if(!timeslotData.data.participantId && !timeslotData.data.register) {
    return {
      status: 'Fail',
      error: 'Timeslot is not registered'
    }
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
      return {
        status: 'Fail',
        error: 'Recieved invalid registration'
      }
    }
    registeredEmail = participantData.data.userEmail
  }

  if(registeredEmail !== event.arguments.userEmail || registeredEmail === null) {
    return {
      status: 'Fail',
      error: 'User email mismatch'
    }
  }

  if(DateTime.fromJSDate(timeslot.start).diffNow().toMillis() > 0) {
    return {
      status: 'Fail',
      error: 'Timeslot has not passed'
    }
  }
  else if(Math.abs(DateTime.fromJSDate(timeslot.start).diffNow().toMillis()) > Duration.fromObject({ days: 7 }).toMillis()) {
    return {
      status: 'Fail',
      error: 'Seven day window to charge no show fee has passed'
    }
  }

  const customerProfile = await dynamoClient.models.CustomerProfile.get({ userEmail: registeredEmail.toLowerCase() })

  if(!customerProfile.data) {
    return {
      status: 'Fail',
      error: 'No customer profile for user'
    }
  }

  let savedPaymentMethodsResponse = await dynamoClient.models.SavedPaymentMethod.listSavedPaymentMethodByPaypalCustomerId({ 
    paypalCustomerId: customerProfile.data.paypalCustomerId 
  })
  const savedPaymentMethodsData = savedPaymentMethodsResponse.data

  while(savedPaymentMethodsResponse.nextToken) {
    savedPaymentMethodsResponse = await dynamoClient.models.SavedPaymentMethod.listSavedPaymentMethodByPaypalCustomerId({
      paypalCustomerId: customerProfile.data.paypalCustomerId,
    }, {
      nextToken: savedPaymentMethodsResponse.nextToken
    })
    savedPaymentMethodsData.push(...savedPaymentMethodsResponse.data)
  }

  if(savedPaymentMethodsData.length === 0) {
    return {
      status: 'Fail',
      error: 'Failed to recieve saved payment method to charge'
    }
  }

  let paymentMethodToCharge = savedPaymentMethodsData.find(paymentMethod => paymentMethod.isDefault)
  if(!paymentMethodToCharge || paymentMethodToCharge.type === null) {
    console.log('No default found, using first saved payment method')
    paymentMethodToCharge = savedPaymentMethodsData[0]
  }

  if(!paymentMethodToCharge.paypalVaultId || paymentMethodToCharge.type === null) {
    return {
      status: 'Fail',
      error: 'Failed to recieve saved payment method to charge'
    }
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

  let customerOrdersResponse = await dynamoClient.models.Orders.listOrdersByUserEmailAndTransactionType({
    userEmail: registeredEmail,
    transactionType: {
      eq: 'timeslot'
    }
  })
  const customerOrdersData = customerOrdersResponse.data.filter((data) => {
    try {
      const orderItems: OrderItem[] = JSON.parse(data.items.toString())
      if(orderItems[0] === undefined || orderItems.length > 1) return false
      return (
        timeslotIdInvoiceIdCompare(orderItems[0].invoiceId, timeslot.id)
      )
    } catch (err) {
      return false
    }
  })

  while(customerOrdersResponse.nextToken && customerOrdersData.length === 0) {
    customerOrdersResponse = await dynamoClient.models.Orders.listOrdersByUserEmailAndTransactionType({
      userEmail: registeredEmail,
      transactionType: {
        eq: 'timeslot'
      }
    }, {
      nextToken: customerOrdersResponse.nextToken
    })
    customerOrdersData.push(...customerOrdersResponse.data.filter((data) => {
      try {
        const orderItems: OrderItem[] = JSON.parse(data.items.toString())
        if(orderItems[0] === undefined || orderItems.length > 1) return false
        return (
          timeslotIdInvoiceIdCompare(orderItems[0].invoiceId, timeslot.id)
        )
      } catch (err) {
        return false
      }
    }))
  }

  
  if(customerOrdersData.length > 0) {
    return {
      status: 'Fail',
      error: 'Payment already attempted to capture'
    }
  }

  const orderResponse = await orderController.createOrder({
    body: request,
    prefer: 'return=minimal',
    paypalRequestId: noshowInvoiceId,
  })

  console.log(orderResponse.result)

  const { status, id } = orderResponse.result
  let finalOrderStatus: OrderStatus | undefined

  if(!status || !id) {
    return {
      status: 'Fail',
      error: 'Failed to capture payment'
    }
  }

  switch (status) {
    case 'COMPLETED':
      break
    case 'CREATED':
    case 'APPROVED': {
      const captureResponse = await orderController.captureOrder({
        id,
        prefer: 'return=representation',
        paypalRequestId: `${noshowInvoiceId}-capture`
      })

      if(captureResponse.result.status !== 'COMPLETED') {
        const logResponse = await dynamoClient.models.Orders.create({
          paypalCustomerId: customerProfile.data.paypalCustomerId,
          paypalOrderId: id,
          amount: timeslotData.data.noshowFee,
          serviceFee: serviceFee,
          currency: 'USD',
          status: captureResponse.result.status,
          transactionType: 'timeslot',
          items: orderItems,
          userEmail: registeredEmail.toLowerCase()
        })

        if(!logResponse.data) {
          return {
            status: 'Fail',
            error: 'Payment Capture Failure'
          }
        }

        return {
          status: 'Fail',
          error: 'Capture incomplete'
        }
      }

      finalOrderStatus = captureResponse.result.status

      break
    }
    case 'PAYER_ACTION_REQUIRED':
    case 'VOIDED':
    default: {
      return {
        status: 'Fail',
        error: 'Failed to capture payment'
      }
    }
  }

  console.log(orderItems)

  const orderLogResponse = await dynamoClient.models.Orders.create({
    paypalCustomerId: customerProfile.data.paypalCustomerId,
    paypalOrderId: id,
    amount: timeslotData.data.noshowFee,
    serviceFee: serviceFee,
    currency: 'USD',
    status: finalOrderStatus ? finalOrderStatus : status,
    transactionType: 'timeslot',
    items: orderItems,
    userEmail: registeredEmail.toLowerCase(),
  })

  if(!orderLogResponse.data) {
    return {
      status: 'Fail',
      error: 'Failed to log order in database'
    }
  }

  response = {
    status: 'Success'
  }

  return response
}

