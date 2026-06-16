import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { Schema } from "../../../data/resource";
import {
  Client,
  Environment,
  LogLevel,
  UsagePattern,
  VaultUserAction,
  VaultController,
  PaypalPaymentTokenUsageType,
} from '@paypal/paypal-server-sdk'
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { env } from '$amplify/env/save-payment-information'
import { SavePaymentInformationAPIResponse } from "../../../../src/types/backend-types";
import { CustomerBillingAddress } from "../../../../src/types";
import { mapUserProfile } from "../../../../src/services/userService";
import { formatUserName } from '../../../../src/functions/clientFunctions'
import { mapCustomerProfile } from "../../../../src/services/paymentService";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)
Amplify.configure(resourceConfig, libraryOptions)

const dynamoClient = generateClient<Schema>()

export const handler: Schema['SavePaymentInformation']['functionHandler'] = async (event) => {
  let response: SavePaymentInformationAPIResponse = {
    status: 'Fail',
    error: 'Unkown error occurred'
  }
  if(
    !event.arguments.userEmail || 
    !event.arguments.userId || 
    !event.arguments.paymentType || (
      !event.arguments.billingAddressId &&
      !event.arguments.billingAddressJson
    )
  ) {
    response.error = 'Missing any of the following: userEmail, userId, paymentType, billing address'
    return response
  }
  if(
    (
      !event.arguments.cancelUrl ||
      !event.arguments.returnUrl
    ) &&
    (
      event.arguments.paymentType === 'CARD' || 
      event.arguments.paymentType === 'PAYPAL'
    )
  ) {
    response.error = 'Cancel url, and return url are required to save card or paypal payment method'
    return response
  }
  else if(
    !event.arguments.applePayToken &&
    event.arguments.paymentType === 'APPLEPAY'
  ) {
    response.error = 'Apple Pay Token is required to save apple payment method'
    return response
  }


  const paypalClientId = (env.PAYPAL_CLIENT_ID ?? '').replace(/[^A-z-0-9]+/g, '')
  const paypalSecretKey = (env.PAYPAL_SECRET_KEY ?? '').replace(/[^A-z-0-9]+/g, '')

  if(!paypalClientId || !paypalSecretKey) {
    response.error = 'Missing client or secret keys'
    return response
  }

  const branch = process.env.AWS_BRANCH ?? 'sandbox'
  const isProd = branch === 'main'

  const client = new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: paypalClientId,
      oAuthClientSecret: paypalSecretKey,
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

  const vaultController = new VaultController(client)

  const userProfile = await dynamoClient.models.UserProfile.get({ email: event.arguments.userEmail.toLowerCase() })
  if(!userProfile.data) {
    response.error = 'Failed to retrieve user profile'
    return response
  }
  
  const mappedUserProfile = await mapUserProfile(userProfile.data)
  const customerProfile = await userProfile.data.customerProfile()
  let mappedCustomerProfile = customerProfile.data ? await mapCustomerProfile(customerProfile.data) : undefined

  //if id is passed of billing address to use then only query that billing address
  //else aquire information of the JSON that is passed

  let billingAddressToUse: CustomerBillingAddress | undefined = event.arguments.billingAddressId ? (
    await dynamoClient.models.CustomerBillingAddresses.get({ id: event.arguments.billingAddressId })
    .then((value) => {
      if(value.data) {
        const mappedBillingAddress: CustomerBillingAddress = {
          ...value.data,
          addressLineTwo: value.data.addressLineTwo ?? undefined,
        }

        return mappedBillingAddress
      }
      return undefined
    })
  ) : undefined

  if(!mappedCustomerProfile && event.arguments.billingAddressJson) {
    const createCustomerResponse = await dynamoClient.models.CustomerProfile.create({
      userEmail: event.arguments.userEmail.toLowerCase(),
      userId: event.arguments.userId,
    })

    if(!createCustomerResponse.data) {
      response.error = 'Failed to create customer profile'
      return response
    }
    //when saving payment info, saving payment associated billing address is required

    const parsedBillingAddress = JSON.parse(event.arguments.billingAddressJson.toString()) as CustomerBillingAddress
    const createBillingAddress = await dynamoClient.models.CustomerBillingAddresses.create({
      userEmail: event.arguments.userEmail.toLowerCase(),
      default: true,
      addressLineOne: parsedBillingAddress.addressLineOne,
      addressLineTwo: parsedBillingAddress.addressLineTwo,
      adminAreaOne: parsedBillingAddress.adminAreaOne,
      adminAreaTwo: parsedBillingAddress.adminAreaTwo,
      postalCode: parsedBillingAddress.postalCode,
      countryCode: 'US',
      createdAt: new Date().toISOString(),
    })

    if(!createBillingAddress.data?.id) {
      response.error = 'Failed to save customer billing address'
      return response
    }

    billingAddressToUse = {
      ...parsedBillingAddress,
      id: createBillingAddress.data.id,
      userEmail: event.arguments.userEmail.toLowerCase(),
      default: true,
    }

    mappedCustomerProfile = {
      userEmail: event.arguments.userEmail.toLowerCase(),
      userId: event.arguments.userId,
      savedPaymentMethods: [],
      orders: [],
      billingAddresses: [billingAddressToUse]
    }
  }

  if(mappedCustomerProfile === undefined) {
    response.error = 'Failed to retrieve customer profile'
    return response
  }

  if(billingAddressToUse === undefined) {
    response.error = 'Failed to process billing address'
    return response
  }

  const setupTokenResponse = await vaultController.createSetupToken({
    body: {
      customer: {
        merchantCustomerId: mappedCustomerProfile.userId,
        id: mappedCustomerProfile.paypalCustomerId
      },
      paymentSource: {
        card: event.arguments.paymentType === 'CARD' ? {
          billingAddress: billingAddressToUse ? {
            addressLine1: billingAddressToUse.addressLineOne,
            addressLine2: billingAddressToUse.addressLineTwo,
            adminArea1: billingAddressToUse.adminAreaOne,
            adminArea2: billingAddressToUse.adminAreaTwo,
            postalCode: billingAddressToUse.postalCode,
            countryCode: billingAddressToUse.countryCode,
          } : undefined,
          name: formatUserName(mappedUserProfile),
          experienceContext: {
            returnUrl: event.arguments.returnUrl!,
            cancelUrl: event.arguments.cancelUrl!
          }
        } : undefined,
        applePay: event.arguments.paymentType === 'APPLEPAY' ? {
          token: event.arguments.applePayToken!,
          card: {
            billingAddress: billingAddressToUse ? {
              addressLine1: billingAddressToUse.addressLineOne,
              addressLine2: billingAddressToUse.addressLineTwo,
              adminArea1: billingAddressToUse.adminAreaOne,
              adminArea2: billingAddressToUse.adminAreaTwo,
              postalCode: billingAddressToUse.postalCode,
              countryCode: billingAddressToUse.countryCode,
            } : undefined,
          }
        } : undefined,
        paypal: event.arguments.paymentType === 'PAYPAL' ? {
          description: 'James French Photo save payment information',
          usagePattern: UsagePattern.Deferred,
          usageType: PaypalPaymentTokenUsageType.Platform,
          experienceContext: {
            userAction: VaultUserAction.SetupNow,
            returnUrl: event.arguments.returnUrl!,
            cancelUrl: event.arguments.cancelUrl!,
          }
        } : undefined
      }
    }
  })

  const token = setupTokenResponse.result.id
  
  if(setupTokenResponse.result.customer?.id) {
    const customerProfileResponse = await dynamoClient.models.CustomerProfile.update({
      userEmail: event.arguments.userEmail.toLowerCase(),
      paypalCustomerId: setupTokenResponse.result.customer.id
    })
    mappedCustomerProfile.paypalCustomerId = setupTokenResponse.result.customer.id
    if(!customerProfileResponse.data) {
      response = {
        status: 'Fail',
        error: 'Failed to map paypal customer id to customer profile'
      }
      return response
    }
  }

  if(!mappedCustomerProfile.paypalCustomerId) {
    response = {
      status: 'Fail',
      error: 'Failed to create or retrieve customer profile'
    }
    return response
  }

  if(!token) {
    response = {
      status: 'Fail',
      error: 'Failed to generate setup token'
    }
    return response
  }

  response = {
    status: 'Success',
    setupTokenResponse: token,
    customerId: mappedCustomerProfile.paypalCustomerId
  }

  return response
}