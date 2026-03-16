import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime";
import { APIMutationResponse } from "../../../../src/types";
import { Schema } from "../../../data/resource";
import {
  Client,
  Environment,
  LogLevel,
  VaultController,
  VaultTokenRequestType
} from '@paypal/paypal-server-sdk'
import { env } from '$amplify/env/confirm-save-payment-information'
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { v4 } from 'uuid'

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)
Amplify.configure(resourceConfig, libraryOptions)

const dynamoClient = generateClient<Schema>()


type SavedPaymentMethod = {
  type: 'PAYPAL'
} | {
  type: 'CARD',
  lastDigits?: number,
  expireMonth?: number,
  expireYear?: number,
  brand?: string,
} | {
  type: 'APPLEPAY',
  lastDigits?: number,
  brand?: string,
}

export const handler: Schema['ConfirmSavePaymentInformation']['functionHandler'] = async (event) => {
  let response: APIMutationResponse | undefined
  if(!event.arguments.userEmail || !event.arguments.setupToken) {
    response = {
      status: 'Fail',
      error: 'Missing user email or setup token'
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

  if(!customerProfileResponse.data) {
    response = {
      status: "Fail",
      error: 'Missing customer profile'
    }
    return response
  }

  const paymentTokenResponse = await vaultController.createPaymentToken({
    body: {
      customer: {
        merchantCustomerId: customerProfileResponse.data.userId,
        id: customerProfileResponse.data.paypalCustomerId
      },
      paymentSource: {
        token: {
          id: event.arguments.setupToken,
          type: VaultTokenRequestType.SetupToken
        }
      }
    }
  })

  const token = paymentTokenResponse.result.id

  if(!token) {
    response = {
      status: 'Fail',
      error: 'Failed to create payment token'
    }
    return response
  }

  let vaultedPaymentType: SavedPaymentMethod | undefined

  if(paymentTokenResponse.result.paymentSource?.applePay) {
    let lastDigits = paymentTokenResponse.result.paymentSource.applePay.card?.lastDigits && !isNaN(parseInt(paymentTokenResponse.result.paymentSource.applePay.card.lastDigits)) ?
    parseInt(paymentTokenResponse.result.paymentSource.applePay.card.lastDigits) : undefined
    vaultedPaymentType = {
      type: 'APPLEPAY',
      lastDigits: lastDigits,
      brand: paymentTokenResponse.result.paymentSource.applePay.card?.brand
    }
  }
  else if(paymentTokenResponse.result.paymentSource?.card) {
    let expiry = paymentTokenResponse.result.paymentSource.card.expiry ?
    paymentTokenResponse.result.paymentSource.card.expiry.split('-') : undefined
    vaultedPaymentType = {
      type: 'CARD',
      lastDigits: paymentTokenResponse.result.paymentSource.card.lastDigits && !isNaN(parseInt(paymentTokenResponse.result.paymentSource.card.lastDigits)) ? 
        parseInt(paymentTokenResponse.result.paymentSource.card.lastDigits) : undefined,
      expireYear: expiry && !isNaN(parseInt(expiry[0])) ? parseInt(expiry[0]) : undefined,
      expireMonth: expiry && !isNaN(parseInt(expiry[1])) ? parseInt(expiry[1]) : undefined,
      brand: paymentTokenResponse.result.paymentSource.card.brand,
    }
  }
  else if(paymentTokenResponse.result.paymentSource?.paypal) {
    vaultedPaymentType = {
      type: 'PAYPAL'
    }
  }

  if(!vaultedPaymentType) {
    response = {
      status: 'Fail',
      error: 'Invalid payment type'
    }
    return response
  }

  const createSavedPaymentMethodResponse = await dynamoClient.models.SavedPaymentMethod.create({
    paymentMethodId: v4(),
    paypalCustomerId: customerProfileResponse.data.paypalCustomerId,
    paypalVaultId: token,
    type: vaultedPaymentType.type,
    userEmail: event.arguments.userEmail,
    isDefault: event.arguments.requestDefault ?? false,
    lastDigits: vaultedPaymentType.type === 'CARD' || vaultedPaymentType.type === 'APPLEPAY' ? vaultedPaymentType.lastDigits : undefined,
    brand: vaultedPaymentType.type === 'CARD' || vaultedPaymentType.type === 'APPLEPAY' ? vaultedPaymentType.brand : undefined,
    expireMonth: vaultedPaymentType.type === 'CARD' ? vaultedPaymentType.expireMonth : undefined,
    expireYear: vaultedPaymentType.type === 'CARD' ? vaultedPaymentType.expireYear : undefined
  })

  if(!createSavedPaymentMethodResponse.data) {
    response = {
      status: 'Fail',
      error: 'Failed to save payment method'
    }
  }

  response = {
    status: 'Success'
  }

  return response
}