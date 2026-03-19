import { 
  Client, 
  Environment, 
  LogLevel, 
  OrderRequest, 
  CheckoutPaymentIntent, 
  VaultController,
  OrdersController,
  PayeeBase,
  PurchaseUnitRequest,
} from '@paypal/paypal-server-sdk'
import { Schema } from '../../../data/resource'
import { APIMutationResponse, OrderItem, Timeslot } from '../../../../src/types'
import { env } from '$amplify/env/charge-no-show-fee'
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime'
import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/api'
import { formatTimeslotDates } from '../../../../src/utils'
import { generatePayPalAuthAssertionHeader } from '../../../../scripts/generate-paypal-auth-assertion-header'
import { Duration } from 'luxon'
import { OrderRefID } from '../../../../src/types/order-ref-id'
import { generateTimeslotInvoiceId } from "../../../../src/utils/timeslotOrderUtils";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)
Amplify.configure(resourceConfig, libraryOptions)

const dynamoClient = generateClient<Schema>()

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

  //TODO: change environment configuration based on amplify sandbox/production

  console.log(env.AMPLIFY_DATA_DEFAULT_NAME)
  const client = new Client({
    clientCredentialsAuthCredentials:  {
      oAuthClientId: paypalClientId,
      oAuthClientSecret: paypalSecretKey
    },
    timeout: 10,
    environment: Environment.Sandbox,
    logging: {
      logLevel: LogLevel.Info,
      logRequest: {
        logBody: true
      },
      logResponse: {
        logHeaders: true
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
    paymentMethodToCharge = savedPaymentMethodsData[0]
  }

  if(!paymentMethodToCharge.paypalVaultId || paymentMethodToCharge.type === null) {
    return {
      status: 'Fail',
      error: 'Failed to recieve saved payment method to charge'
    }
  }

  const vaultController = new VaultController(client)

  let vaultedPaymentMethodResponse = await vaultController.getPaymentToken(paymentMethodToCharge.paypalVaultId)

  if(!vaultedPaymentMethodResponse.result.paymentSource) {
    //filtering out failed payment method
    let paymentMethods = savedPaymentMethodsData.filter(paymentMethod => paymentMethod.paypalVaultId !== paymentMethodToCharge?.paypalVaultId)
    while(paymentMethods.length > 0) {
      vaultedPaymentMethodResponse = await vaultController.getPaymentToken(paymentMethods[0].paypalVaultId)
      if(vaultedPaymentMethodResponse.result.paymentSource) {
        paymentMethodToCharge = paymentMethods[0]
        break
      }
      else {
        paymentMethods.shift()
      }
    }
    if(!vaultedPaymentMethodResponse.result.paymentSource) {
      return {
        status: 'Fail',
        error: 'Failed to recieve saved payment method to charge'
      }
    }
  }

  const orderController = new OrdersController(client)

  const payee: PayeeBase = {
    emailAddress: 'aws.jfphoto@gmail.com',
    merchantId: paypalMerchantId
  }

  const noshowInvoiceId = generateTimeslotInvoiceId(timeslot, customerProfile.data.userId, 'noshow')

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
            value: (timeslotData.data.noshowFee * 0.02).toFixed(2)
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
    softDescriptor: 'JFP Noshow Fee',
    description: `Noshow fee for missed timeslot on ${timeslot.start.toLocaleDateString('en-us', { timeZone: 'America/Chicago' })} at ${formatTimeslotDates(timeslot)}`
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
      name: noshowFee.softDescriptor!,
      description: noshowFee.description!,
      amount: timeslotData.data.noshowFee,
      serviceChargeAmount: parseFloat((timeslotData.data.noshowFee * 0.02).toFixed(2)),
      refrenceId: OrderRefID.NoShowFee,
      invoiceId: noshowFee.invoiceId!,
    }
  ]

  const paypalAuthHeader = generatePayPalAuthAssertionHeader(paypalClientId, paypalMerchantId)

  const orderResponse = await orderController.createOrder({
    body: request,
    prefer: 'return=minimal',
    paypalAuthAssertion: paypalAuthHeader
  })

  console.log(orderResponse.result)

  if(
    !orderResponse.result.status || 
    !orderResponse.result.id || 
    orderResponse.result.status !== 'COMPLETED'
  ) {
    return {
      status: 'Fail',
      error: 'Failed to capture payment'
    }
  }

  console.log(orderItems)

  const orderLogResponse = await dynamoClient.models.Orders.create({
    paypalCustomerId: customerProfile.data.paypalCustomerId,
    paypalOrderId: orderResponse.result.id,
    amount: timeslotData.data.noshowFee,
    serviceFee: parseFloat((timeslotData.data.noshowFee * 0.02).toFixed(2)),
    currency: 'USD',
    status: orderResponse.result.status,
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

