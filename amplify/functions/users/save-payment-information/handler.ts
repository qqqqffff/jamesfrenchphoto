import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { Schema } from "../../../data/resource";
import {
  Client,
  Environment,
  LogLevel,
  VaultController,
} from '@paypal/paypal-server-sdk'
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { env } from '$amplify/env/save-payment-information'
import { SavePaymentInformationAPIResponse } from "../../../../src/types/backend-types";
import { CustomerBillingAddress } from "../../../../src/types";
import { mapUserProfile } from "../../../../src/services/userService";
import { formatUserName } from '../../../../src/functions/clientFunctions'
import { v4 } from 'uuid'

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
    event.arguments.paymentType === 'CARD'
  ) {
    response.error = 'Cancel url, and return url are required to save card payment method'
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

  const userProfile = await dynamoClient.models.UserProfile.get({ email: event.arguments.userEmail })
  if(!userProfile.data) {
    response.error = 'Failed to retrieve user profile'
    return response
  }
  const mappedUserProfile = await mapUserProfile(userProfile.data, {
    siCustomerProfile: { 
      //only need billing addresses if payment type is card
      siBillingAddresses: event.arguments.paymentType === 'CARD' && !event.arguments.billingAddressJson
    },
  })

  let billingAddressToUse: Omit<CustomerBillingAddress, "default" | "id" | "userEmail" | "customerId" | 'createdAt'> | undefined = 
  (mappedUserProfile.customerProfile?.billingAddresses ?? []).find((address) => address.id === event.arguments.billingAddressId)

  if(
    event.arguments.paymentType === 'CARD' && 
    !event.arguments.billingAddressJson ||
    !billingAddressToUse
  ) {
    response.error = 'Customer has no matching saved billing address'
    return response
  }
  else if(event.arguments.billingAddressJson) {
    billingAddressToUse = {
      ...JSON.parse(event.arguments.billingAddressJson.toString()),
    }
  }

  if(billingAddressToUse === undefined) {
    response.error = 'Failed to process billing address'
    return response
  }

  const setupTokenResponse = await vaultController.createSetupToken({
    body: {
      customer: mappedUserProfile.customerProfile ? {
        merchantCustomerId: mappedUserProfile.customerProfile.userId,
        id: mappedUserProfile.customerProfile.paypalCustomerId
      } : undefined,
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
        } : undefined
        //TODO: implement other vaultTypes
      }
    }
  })

  const token = setupTokenResponse.result.id
  
  if(!mappedUserProfile.customerProfile && setupTokenResponse.result.customer?.id) {
    const customerProfileResponse = await dynamoClient.models.CustomerProfile.create({
      userEmail: event.arguments.userEmail.toLowerCase(),
      userId: event.arguments.userId,
      paypalCustomerId: setupTokenResponse.result.customer.id
    })
    if(!customerProfileResponse.data) {
      response = {
        status: 'Fail',
        error: 'Failed to create customer profile'
      }
      return response
    }
  }

  const customerId = mappedUserProfile.customerProfile?.paypalCustomerId ?? setupTokenResponse.result.id

  if(!customerId) {
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
    customerId: customerId
  }

  return response
}