import { APIMutationResponse, Timeslot } from "../../../../src/types";
import { Schema } from "../../../data/resource";
import { env } from '$amplify/env/create-short-notice-cancelation-order'
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { formatTimeslotDates } from '../../../../src/utils'
import { 
  Client, 
  Environment, 
  LogLevel, 
  OrderRequest, 
  CheckoutPaymentIntent, 
  OrdersController,
  PayeeBase,
  PurchaseUnitRequest
} from '@paypal/paypal-server-sdk'
import { DateTime, Duration } from 'luxon'
import { generatePayPalAuthAssertionHeader } from "../../../../scripts/generate-paypal-auth-assertion-header";
import { OrderRefID } from "../../../../src/types/order-ref-id";


const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)
Amplify.configure(resourceConfig, libraryOptions)

const dynamoClient = generateClient<Schema>()

export interface CreateShortNoticeCancelationOrderAPIResponse extends APIMutationResponse {
  orderId?: string
}

export const handler: Schema['CreateShortNoticeCancelationOrder']['functionHandler'] = async (event) => {
  let response: CreateShortNoticeCancelationOrderAPIResponse | undefined
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

  const request: OrderRequest = {
    intent: CheckoutPaymentIntent.Authorize,
    purchaseUnits: [ cancelationFee ],
  }

  const paypalAuthHeader = generatePayPalAuthAssertionHeader(paypalClientId, paypalMerchantId)

  const orderResponse = await orderController.createOrder({
    body: request,
    prefer: 'return=minimal',
    paypalAuthAssertion: paypalAuthHeader,
  })

  if(
    !orderResponse.result.status ||
    orderResponse.result.status !== 'CREATED' ||
    !orderResponse.result.id
  ) {
    return {
      status: 'Fail',
      error: 'Failed to create order'
    }
  }

  
  response = {
    status: "Success",
    orderId: orderResponse.result.id
  }
  

  return response
}

