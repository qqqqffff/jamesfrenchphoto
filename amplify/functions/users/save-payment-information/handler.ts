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
  let response: SavePaymentInformationAPIResponse | undefined
  if(
    !event.arguments.userEmail || 
    !event.arguments.userId || 
    !event.arguments.paymentType ||
    !event.arguments.cancelUrl ||
    !event.arguments.returnUrl
  ) {
    response = {
      status: 'Fail',
      error: 'Missing any of the following: userEmail, userId, paymentType, cancelUrl, returnUrl'
    }
    return response
  }
  if(
    !event.arguments.billingAddressId &&
    !event.arguments.billingAddressJson
  ) {
    response = {
      status: 'Fail',
      error: 'Billing address required to save payment method'
    }
    return response
  }
  const paypalClientId = (env.PAYPAL_CLIENT_ID ?? '').replace(/[^A-z-0-9]+/g, '')
  const paypalSecretKey = (env.PAYPAL_SECRET_KEY ?? '').replace(/[^A-z-0-9]+/g, '')

  if(!paypalClientId || !paypalSecretKey) {
    response = {
      status: 'Fail',
      error: 'Missing client or secret keys'
    }
    return response
  }

  let vaultType: 'APPLEPAY' | 'PAYPAL' | 'CARD' | undefined
  switch(event.arguments.paymentType) {
    case 'APPLEPAY': {
      vaultType = 'APPLEPAY'
      break;
    }
    case 'PAYPAL': {
      vaultType = 'PAYPAL'
      break;
    }
    case 'CARD': {
      vaultType = 'CARD'
      break
    }
    default: {
      response = {
        status: "Fail",
        error: 'Recieved invalid vault request'
      }
      return response
    }
  }

  if(!vaultType) {
    response = {
      status: "Fail",
      error: 'Recieved empty vault request'
    }
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
    response = {
      status: 'Fail',
      error: 'Failed to retrieve user profile'
    }
    return response
  }
  const mappedUserProfile = await mapUserProfile(userProfile.data, {
    siCustomerProfile: { },
  })

  let billingAddressToUse: CustomerBillingAddress | undefined
  if(event.arguments.billingAddressId) {
    const billingAddressResponse = await dynamoClient.models.CustomerBillingAddresses.get({ id: event.arguments.billingAddressId })
    if(!billingAddressResponse.data) {
      response = {
        status: 'Fail',
        error: 'Failed to retrieve saved billing address'
      }
      return response
    }

    billingAddressToUse = {
      ...billingAddressResponse.data,
      customerId: billingAddressResponse.data.paypalCustomerId,
      addressLineTwo: billingAddressResponse.data.addressLineTwo ?? undefined
    }
  }
  else if(event.arguments.billingAddressJson) {
    billingAddressToUse = {
      id: v4(),
      customerId: '',
      default: false,
      ...JSON.parse(event.arguments.billingAddressJson.toString()),
    }
  }

  if(!billingAddressToUse) {
    response = {
      status: 'Fail',
      error: 'Failed to process billing address'
    }
    return response
  }

  const setupTokenResponse = await vaultController.createSetupToken({
    body: {
      customer: mappedUserProfile.customerProfile ? {
        merchantCustomerId: mappedUserProfile.customerProfile.userId,
        id: mappedUserProfile.customerProfile.paypalCustomerId
      } : undefined,
      paymentSource: {
        card: vaultType === 'CARD' ? {
          billingAddress: billingAddressToUse ? {
            addressLine1: billingAddressToUse.addressLineOne,
            addressLine2: billingAddressToUse.addressLineTwo,
            adminArea1: billingAddressToUse.adminAreaOne,
            adminArea2: billingAddressToUse.adminAreaTwo,
            postalCode: billingAddressToUse.postalCode,
            countryCode: billingAddressToUse.countryCode,
          } : undefined,
          name: formatUserName(mappedUserProfile),
        } : undefined,
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