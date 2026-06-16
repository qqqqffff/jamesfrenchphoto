import { env } from "$amplify/env/capture-short-notice-cancelation-order";
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { APIMutationResponse, OrderItem, Order, Timeslot } from "../../../../src/types";
import { Schema } from "../../../data/resource";
import { 
  Client, 
  Environment, 
  LogLevel, 
  OrdersController,
} from '@paypal/paypal-server-sdk'
import { DateTime, Duration } from "luxon";
import { generatePayPalAuthAssertionHeader } from "../../../../scripts/generate-paypal-auth-assertion-header";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)
Amplify.configure(resourceConfig, libraryOptions)

const dynamoClient = generateClient<Schema>()


//process creates and captures order with payment request
export const handler: Schema['CaptureShortNoticeCancelationOrder']['functionHandler'] = async (event) => {
  let response: APIMutationResponse = {
    status: 'Fail',
    error: 'Unknown error occurred'
  }
  if(
    !event.arguments.orderId || 
    !event.arguments.paymentType || 
    !event.arguments.userId ||
    !event.arguments.timeslotId || 
    !event.arguments.userEmail
  ) {
    response.error = 'Missing any of the following: orderId, paymentType, timeslotId, userEmail, userId, return url, cancel url.'
    return response
  }

  //cleaning secrets
  const paypalClientId = (process.env.PAYPAL_CLIENT_ID ?? '').replace(/[^A-z-0-9]+/g, '')
  const paypalSecretKey = (process.env.PAYPAL_SECRET_KEY ?? '').replace(/[^A-z-0-9]+/g, '')
  const paypalMerchantId = (process.env.PAYPAL_MERCHANT_ID ?? '').replace(/[^A-z-0-9]+/g, '')


  if(!paypalClientId || !paypalSecretKey || !paypalMerchantId) {
    response.error = 'Missing client, secret keys, or merchant ID'
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
  const orderData = await dynamoClient.models.Orders.get({ id: event.arguments.orderId })

  if(!timeslotData.data) {
    response.error = 'Recieved no timeslot data'
    return response
  } 
  if(!orderData.data) {
    response.error = 'Invalid orderId'
    return response
  }

  const order: Order = {
    ...orderData.data,
    items: [] as OrderItem[], //si not necessary for this
    currency: 'USD',
    status: orderData.data.status ?? 'UNKNOWN'
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
    response.error = 'Timeslot does not have a cancelation fee'
    return response
  } else if(!timeslot.participantId && !timeslot.register) {
    response.error = 'Timeslot is not registered'
    return response
  } else if(timeuntilSlot < 0) {
    response.error = 'Cannot register for a slot that already past'
    return response
  } else if(timeuntilSlot >= timeslot.cancelationFee.window.toMillis()) {
    response.error = 'Timeslot registration not in cancelation window'
    return response
  } else if(order.status !== 'CREATED') {
    response.error = order.status
  }

  const orderController = new OrdersController(client)

  const paypalAuthHeader = generatePayPalAuthAssertionHeader(paypalClientId, paypalMerchantId)
  
  const orderResponse = await orderController.captureOrder({
    id: event.arguments.orderId,
    prefer: 'return=minimal',
    paypalAuthAssertion: paypalAuthHeader
  })

  if(
    !orderResponse.result.status ||
    orderResponse.result.status !== 'COMPLETED' ||
    !orderResponse.result.id
  ) {
    response.error = 'Invalid order status recieved'
    console.error(orderResponse)
    return response
  }

  const updatedOrderResponse = await dynamoClient.models.Orders.update({
    id: event.arguments.orderId,
    status: orderResponse.result.status
  })

  if(!updatedOrderResponse.data) {
    response.error = 'Failed to update order status'
    return response
  }


  response.status = 'Success'
  response.error = undefined
  return response
}