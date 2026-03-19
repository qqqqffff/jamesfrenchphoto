import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { Schema } from "../../../data/resource";
import {
  Client,
  Environment,
  LogLevel,
  VaultApplePayRequest,
  VaultPaypalWalletRequest,
  SetupTokenRequestCard,
  VaultController,
} from '@paypal/paypal-server-sdk'
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { env } from '$amplify/env/save-payment-information'


export type SavePaymentInformationResponse = {
  status: 'Success'
  tokenResponse: string,
} | {
  status: 'Fail',
  error: string,
}

export type SavePaymentInformationVaultRequest = {
  type: 'ApplePay'
  request: VaultApplePayRequest
} | {
  type: 'PaypalWallet'
  request: VaultPaypalWalletRequest
} | {
  type: 'Card',
  request: SetupTokenRequestCard
}

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)
Amplify.configure(resourceConfig, libraryOptions)

const dynamoClient = generateClient<Schema>()


export const handler: Schema['SavePaymentInformation']['functionHandler'] = async (event) => {
  let response: SavePaymentInformationResponse | undefined
  if(!event.arguments.userEmail || !event.arguments.userId) {
    response = {
      status: 'Fail',
      error: 'Missing user email or user id'
    }
    return response
  }
  const paypalClientId = process.env.PAYPAL_CLIENT_ID
  const paypalSecretKey = process.env.PAYPAL_SECRET_KEY

  if(!paypalClientId || !paypalSecretKey) {
    response = {
      status: 'Fail',
      error: 'Missing client or secret keys'
    }
    return response
  }

  let paymentInfoVaultRequest: SavePaymentInformationVaultRequest | undefined
  try {
    paymentInfoVaultRequest = JSON.parse(event.arguments.vaultRequest.toString())
    if(!paymentInfoVaultRequest?.type) {
      response = {
        status: 'Fail',
        error: 'Incorrect Vault Request'
      }
      return response
    }
  } catch (error) {
    response = {
      status: 'Fail',
      error: 'Incorrect Vault Request'
    }
    return response
  }

  const client = new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: paypalClientId,
      oAuthClientSecret: paypalSecretKey,
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

  const vaultController = new VaultController(client)

  const customerProfileResponse = await dynamoClient.models.CustomerProfile.get({
    userEmail: event.arguments.userEmail
  })


  const setupTokenResponse = await vaultController.createSetupToken({
    body: {
      customer: customerProfileResponse.data ? {
        merchantCustomerId: customerProfileResponse.data.userId,
        id: customerProfileResponse.data.paypalCustomerId
      } : undefined,
      paymentSource: {
        paypal: paymentInfoVaultRequest.type === 'PaypalWallet' ? {
          ...paymentInfoVaultRequest.request
        } : undefined,
        card: paymentInfoVaultRequest.type === 'Card' ? {
          ...paymentInfoVaultRequest.request
        } : undefined,
        applePay: paymentInfoVaultRequest.type === 'ApplePay' ? {
          ...paymentInfoVaultRequest.request
        } : undefined
      }
    }
  })

  const token = setupTokenResponse.result.id
  
  if(!customerProfileResponse.data && setupTokenResponse.result.customer?.id) {
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

  if(!customerProfileResponse.data && !setupTokenResponse.result.customer?.id) {
    response = {
      status: 'Fail',
      error: 'Failed to create customer profile'
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
    tokenResponse: token
  }

  return response
}