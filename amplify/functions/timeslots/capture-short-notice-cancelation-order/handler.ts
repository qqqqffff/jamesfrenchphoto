import { env } from "$amplify/env/capture-short-notice-cancelation-order";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { APIMutationResponse, Timeslot } from "../../../../src/types";
import { CapturePaymentRequest } from "../../../../src/types/backend-types";
import { Schema } from "../../../data/resource";
import { 
  Client, 
  Environment, 
  LogLevel, 
  OrderRequest, 
  CheckoutPaymentIntent, 
  OrdersController,
  PayeeBase,
  PurchaseUnitRequest,
  PaymentSource
} from '@paypal/paypal-server-sdk'
import { DateTime, Duration } from "luxon";
import { OrderRefID } from "../../../../src/types/order-ref-id";
import { formatTimeslotDates } from "../../../../src/utils";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)
Amplify.configure(resourceConfig, libraryOptions)

const dynamoClient = generateClient<Schema>()


//process creates and captures order with payment request
export const handler: Schema['CaptureShortNoticeCancelationOrder']['functionHandler'] = async (event) => {
  let response: APIMutationResponse | undefined
  if(
    !event.arguments.orderId || 
    !event.arguments.paymentRequest || 
    !event.arguments.timeslotId || 
    !event.arguments.userEmail ||
    !event.arguments.cancelUrl ||
    !event.arguments.returnUrl
  ) {
    response = {
      status: 'Fail',
      error: 'Missing any of the following: orderId, paymentRequest, timeslotId, userEmail, return url, cancel url.'
    }
    return response
  }
  const paymentRequest: CapturePaymentRequest = JSON.parse(event.arguments.paymentRequest.toString())
  if(paymentRequest.type === undefined) {
    response = {
      status: 'Fail',
      error: 'Invalid Payment Request'
    }
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
    return {
      status: 'Fail',
      error: 'Recieved no timeslot data'
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
  const timeuntilSlot = DateTime.fromJSDate(timeslot.start).diffNow().toMillis()

  if(!timeslot.cancelationFee) {
    return {
      status: 'Fail',
      error: 'Timeslot does not have a cancelation fee'
    }
  } else if(!timeslot.participantId && !timeslot.register) {
    return {
      status: 'Fail',
      error: 'Timeslot is not registered'
    }
  } else if(timeuntilSlot < 0) {
    return {
      status: 'Fail',
      error: 'Cannot register for a slot that already past'
    }
  } else if(timeuntilSlot >= timeslot.cancelationFee.window.toMillis()) {
    return {
      status: 'Fail',
      error: 'Timeslot registration not in cancelation window'
    }
  }

  const orderController = new OrdersController(client)
  const payee: PayeeBase = {
    emailAddress: 'aws.jfphoto@gmail.com',
    merchantId: paypalMerchantId
  }
  const cancelationFee: PurchaseUnitRequest = {
    referenceId: OrderRefID.CancelationFee,
    amount: {
      currencyCode: 'USD',
      value: timeslot.cancelationFee.amount.toFixed(2),
      breakdown: {
        itemTotal: {
          currencyCode: 'USD',
          value: timeslot.cancelationFee.amount.toFixed(2)
        },
      }
    },
    paymentInstruction: {
      platformFees: [
        {
          amount: {
            currencyCode: 'USD',
            value: (timeslot.cancelationFee.amount * 0.02).toFixed(2)
          },
          payee: payee
        }
      ]
    },
    payee: payee,
    softDescriptor: 'JFP Rescheduling fee',
    description: `Short notice rescheduling fee for ${timeslot.start.toLocaleDateString('en-us', { timeZone: 'America/Chicago' })} at ${formatTimeslotDates(timeslot)}`
  }

  //three cases
  // - using saved payment method type = 'vault'
  // - using carded method type = 'card'
  // - using pay with paypal = 'paypal'
  // - using apple pay = 'apple-pay'

  let paymentSource: PaymentSource | undefined
  
  switch(paymentRequest.type) {
    case 'Vault': {
      const paymentMethodResponse = await dynamoClient.models.CustomerSavedPaymentMethod.get({ paymentMethodId: paymentRequest.paymentMethodId })
      if(
        !paymentMethodResponse.data || 
        paymentMethodResponse.data.paypalVaultId === '' || 
        paymentMethodResponse.data.type === null
      ) {
        response = {
          status: 'Fail',
          error: 'Recieved invalid saved payment method'
        }
        return response
      }
      paymentSource = {
        applePay: paymentMethodResponse.data.type === 'APPLEPAY' ? {
          vaultId: paymentMethodResponse.data.paypalVaultId,
          experienceContext: {
            returnUrl: event.arguments.returnUrl,
            cancelUrl: event.arguments.cancelUrl
          }
        } : undefined,
        paypal: paymentMethodResponse.data.type === 'PAYPAL' ? {
          vaultId: paymentMethodResponse.data.paypalVaultId,
          experienceContext: {
            returnUrl: event.arguments.returnUrl,
            cancelUrl: event.arguments.cancelUrl
          }
        } : undefined,
        card: paymentMethodResponse.data.type === 'CARD' ?  {
          vaultId: paymentMethodResponse.data.paypalVaultId,
          experienceContext: {
            returnUrl: event.arguments.returnUrl,
            cancelUrl: event.arguments.cancelUrl
          }
        } : undefined
      }
    }
  }

  //TODO: continue with implementation


  if(!paymentSource) {
    response = {
      status: 'Fail',
      error: 'Failed to capture order'
    }
    return response
  }
  
  const request: OrderRequest = {
    intent: CheckoutPaymentIntent.Capture,
    purchaseUnits: [ cancelationFee ],
    paymentSource: paymentSource
  }

  response = { 
    status: 'Success'
  }

  return response
}