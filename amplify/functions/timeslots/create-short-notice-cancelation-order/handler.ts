import { CustomerBillingAddress, CustomerProfile, Timeslot } from "../../../../src/types";
import { CreateShortNoticeCancelationOrderAPIResponse } from "../../../../src/types/backend-types";
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
  PurchaseUnitRequest,
  PaymentInitiator,
  StoredPaymentSourcePaymentType,
  StoreInVaultInstruction,
  StoredPaymentSourceUsageType,
  UsagePattern,
  PaypalPaymentTokenUsageType,
  PaypalPaymentTokenCustomerType,
  PaypalExperienceUserAction,
  PayeePaymentMethodPreference,
  PaypalExperienceLandingPage
} from '@paypal/paypal-server-sdk'
import { DateTime, Duration } from 'luxon'
import { generatePayPalAuthAssertionHeader } from "../../../../scripts/generate-paypal-auth-assertion-header";
import { OrderRefID } from "../../../../src/types/order-ref-id";
import { mapUserProfile } from "../../../../src/services/userService";
import { formatUserName } from "../../../../src/functions/clientFunctions";
import { generateTimeslotInvoiceId } from "../../../../src/functions/paymentFunctions";


const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)
Amplify.configure(resourceConfig, libraryOptions)

const dynamoClient = generateClient<Schema>()

//Create order flow
// 1) init clients
// 2) validate timeslot
// 3) create/fetch customer profile
// 4) check if there are inprogress orders
// 4a) return auth links if so
// 5) create order
// 6) log to db

export const handler: Schema['CreateShortNoticeCancelationOrder']['functionHandler'] = async (event) => {
  
  let response: CreateShortNoticeCancelationOrderAPIResponse = {
    status: 'Fail',
    error: 'Unexpected error'
  }
  if(
    !event.arguments.timeslotId || 
    !event.arguments.userEmail ||
    !event.arguments.userId
  ) {
    response.error = 'Timeslot Id or User Email Missing.'
    return response
  }
  if(
    event.arguments.vaulting && 
    event.arguments.vaulting.vault &&
    event.arguments.vaulting.paymentSource === 'CARD' &&
    !event.arguments.vaulting.billingAddressId &&
    !event.arguments.vaulting.billingAddressInfo
  ) {
    response.error = 'Invalid vaulting configuration.'
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
  const user = await dynamoClient.models.UserProfile.get({ email: event.arguments.userEmail.toLowerCase() })
  if(!user.data) {
    response.error = 'No valid user found'
    return response
  }
  const userProfile = await mapUserProfile(user.data, {
    siCustomerProfile: { }
  })

  let customerProfile: CustomerProfile | undefined = userProfile.customerProfile

  if(!customerProfile) {
    const customerProfileResponse = await dynamoClient.models.CustomerProfile.create({
      userEmail: event.arguments.userEmail.toLowerCase(),
      userId: event.arguments.userId,
    })

    if(!customerProfileResponse.data) {
      response.error = 'Failed to create customer profile'
      return response
    }

    customerProfile = {
      userEmail: event.arguments.userEmail.toLowerCase(),
      userId: event.arguments.userId,
      orders: [],
      billingAddresses: [],
      savedPaymentMethods: []
    }
  }

  if(!customerProfile) {
    response.error = 'Failed to create customer profile'
    return response
  }

  if(!timeslotData.data) {
    response.error = 'Recieved no timeslot data'
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
  const timeuntilSlot = DateTime.fromJSDate(timeslot.start).diffNow().toMillis()

  if(!timeslot.cancelationFee) {
    response.error = 'Timeslot does not have a cancelation fee'
    return response
  } else if(timeuntilSlot < 0) {
    response.error = 'Cannot register for a slot that already past'
    return response
  } else if(timeuntilSlot >= timeslot.cancelationFee.window.toMillis()) {
    response.error = 'Timeslot registration not in cancelation window'
    return response
  }

  let billingAddress: CustomerBillingAddress | undefined
  if(event.arguments.vaulting?.vault && event.arguments.vaulting.paymentSource === 'CARD') {
    if(event.arguments.vaulting.billingAddressId) {
      const billingAddressResponse = await dynamoClient.models.CustomerBillingAddresses.get({ id: event.arguments.vaulting.billingAddressId })
      if(billingAddressResponse.data) {
        billingAddress = {
          ...billingAddressResponse.data,
          addressLineTwo: billingAddressResponse.data.addressLineTwo ?? undefined,
        }
      }
    }
    else if(event.arguments.vaulting.billingAddressInfo) {
      try {
        billingAddress = JSON.parse(event.arguments.vaulting.billingAddressInfo.toString())
        if(
          !billingAddress?.addressLineOne ||
          !billingAddress.adminAreaOne ||
          !billingAddress.adminAreaTwo ||
          !billingAddress.postalCode ||
          !billingAddress.countryCode
        ) {
          response.error = 'Invalid billing address'
          return response
        }
      } catch (err) { 
        console.error(err)
      }
    }

    if(!billingAddress) {
      response.error = 'Invalid billing address'
      return response
    }
  }

  const orderController = new OrdersController(client)

  const payee: PayeeBase = {
    emailAddress: 'aws.jfphoto@gmail.com',
    merchantId: paypalMerchantId
  }

  const serviceCharge = Math.min(timeslot.cancelationFee.amount * 0.02, 10)
  const total = timeslot.cancelationFee.amount
  const invoiceId = generateTimeslotInvoiceId(timeslot, event.arguments.userId, 'cancelation')
  const orderItemName = 'JFP Rescheduling fee'
  const orderItemDescription = `Short notice rescheduling fee for ${timeslot.start.toLocaleDateString('en-us', { timeZone: 'America/Chicago' })} at ${formatTimeslotDates(timeslot)}`

  const cancelationFee: PurchaseUnitRequest = {
    referenceId: OrderRefID.CancelationFee,
    invoiceId: invoiceId,
    amount: {
      currencyCode: 'USD',
      value: total.toFixed(2),
      breakdown: {
        itemTotal: {
          currencyCode: 'USD',
          value: total.toFixed(2)
        },
      }
    },
    paymentInstruction: {
      platformFees: [
        {
          amount: {
            currencyCode: 'USD',
            value: serviceCharge.toFixed(2)
          },
          payee: payee
        }
      ]
    },
    payee: payee,
    softDescriptor: orderItemName,
    description: orderItemDescription
  }

  const request: OrderRequest = {
    intent: CheckoutPaymentIntent.Capture,
    purchaseUnits: [ cancelationFee ],
    paymentSource: event.arguments.vaulting?.vault && event.arguments.vaulting.paymentSource ? ({
      applePay: event.arguments.vaulting.paymentSource === 'APPLEPAY' ? ({
        storedCredential: {
          paymentInitiator: PaymentInitiator.Customer,
          paymentType: timeslot.noshowFee !== undefined ? StoredPaymentSourcePaymentType.Recurring : StoredPaymentSourcePaymentType.OneTime,
          usage: timeslot.noshowFee !== undefined ? StoredPaymentSourceUsageType.Derived : StoredPaymentSourceUsageType.Subsequent
        },
        attributes: {
          customer: timeslot.noshowFee !== undefined && customerProfile.paypalCustomerId ? {
            id: customerProfile.paypalCustomerId
          } : undefined,
          vault: timeslot.noshowFee !== undefined ? {
            storeInVault:  StoreInVaultInstruction.OnSuccess
          } : undefined
        }
      }): undefined,
      card: event.arguments.vaulting.vault && event.arguments.vaulting.paymentSource === 'CARD' && billingAddress ? ({
        billingAddress: {
          addressLine1: billingAddress.addressLineOne,
          addressLine2: billingAddress.addressLineTwo,
          adminArea1: billingAddress.adminAreaOne,
          adminArea2: billingAddress.adminAreaTwo,
          countryCode: billingAddress.countryCode,
          postalCode: billingAddress.postalCode
        },
        name: formatUserName(userProfile),
        storedCredential: {
          paymentInitiator: PaymentInitiator.Customer,
          //recurring payment type for a no show fee
          //for the usage case that the person does not show up and they will be charged since onetime payments cannot be reused
          paymentType: timeslot.noshowFee !== undefined ? StoredPaymentSourcePaymentType.Recurring : StoredPaymentSourcePaymentType.OneTime,
        },
        attributes: {
          customer: timeslot.noshowFee !== undefined && customerProfile.paypalCustomerId ? {
            id: customerProfile.paypalCustomerId
          } : undefined,
          vault: {
            storeInVault: timeslot.noshowFee !== undefined ? StoreInVaultInstruction.OnSuccess : undefined,
          }
        }
      }) : undefined,
      paypal: event.arguments.vaulting.vault && event.arguments.vaulting.paymentSource === 'PAYPAL' ? ({
        storedCredential: {
          paymentInitiator: PaymentInitiator.Customer,
          usage: timeslot.noshowFee !== undefined ? StoredPaymentSourceUsageType.Derived : StoredPaymentSourceUsageType.First,
          usagePattern: timeslot.noshowFee !== undefined ? UsagePattern.RecurringPrepaid : UsagePattern.Immediate,
        },
        attributes: {
          customer: {
            merchantCustomerId: customerProfile.userId
          },
          vault: {
            storeInVault: StoreInVaultInstruction.OnSuccess,
            description: "James French Photo save payment information",
            usagePattern: timeslot.noshowFee !== undefined ? UsagePattern.RecurringPrepaid : UsagePattern.Immediate,
            usageType: PaypalPaymentTokenUsageType.Platform,
            customerType: PaypalPaymentTokenCustomerType.Consumer,
          }
        },
        experienceContext: {
          returnUrl: event.arguments.returnUrl,
          cancelUrl: event.arguments.cancelUrl,
          landingPage: PaypalExperienceLandingPage.Billing,
          userAction: PaypalExperienceUserAction.PayNow,
          paymentMethodPreference: PayeePaymentMethodPreference.ImmediatePaymentRequired,
        }
      }) : undefined
    }) : undefined
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

  const dbOrder = await dynamoClient.models.Orders.create({
    id: orderResponse.result.id,
    amount: total,
    invoiceId: invoiceId,
    serviceFee: serviceCharge,
    currency: 'USD',
    status: 'CREATED',
    userEmail: event.arguments.userEmail.toLowerCase(),
  })

  if(!dbOrder.data) {
    response.error = 'Failed to log order'
    return response
  }

  const dbOrderItem = await dynamoClient.models.OrderItems.create({
    itemId: timeslot.id,
    orderId: orderResponse.result.id,
    name: orderItemName,
    description: orderItemDescription,
    amount: total,
    serviceCharge: serviceCharge,
    referenceId: OrderRefID.CancelationFee,
    userEmail: event.arguments.userEmail.toLowerCase()
  })

  if(!dbOrderItem.data) {
    response.error = 'Failed to log order'
    return response
  }
  
  response = {
    status: "Success",
    orderId: orderResponse.result.id
  }
  
  return response
}

