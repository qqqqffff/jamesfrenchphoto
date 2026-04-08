// import { env } from "$amplify/env/admin-update-user-attributes"
import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime"
import { Amplify } from "aws-amplify"
import { generateClient } from "aws-amplify/api"
import { Schema } from "../../../data/resource"
import { Client, Environment, LogLevel, VaultController, VaultTokenRequestType } from "@paypal/paypal-server-sdk"
import { mapUserProfile } from "../../../../src/services/userService"
import { v4 } from 'uuid'
import { APIMutationResponse } from "../../../../src/types"

// const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)
// Amplify.configure(resourceConfig, libraryOptions)

const dynamoClient = generateClient<Schema>()

export const handler: Schema['CompleteVault']['functionHandler'] = async (event) => {
  let response: APIMutationResponse = {
    status: 'Fail',
    error: 'Unexpected error'
  }

  if(
    !event.arguments.paymentType ||
    !event.arguments.setupToken ||
    !event.arguments.userEmail
  ) {
    response.error = 'Missing at least one of the following: paymentType, setupToken, userEmail'
    return response
  }

  const paypalClientId = ''
  // (env.PAYPAL_CLIENT_ID ?? '').replace(/[^A-z-0-9]+/g, '')
  const paypalSecretKey = ''
  // (env.PAYPAL_SECRET_KEY ?? '').replace(/[^A-z-0-9]+/g, '')

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
    siCustomerProfile: { }
  })
  if(!mappedUserProfile.customerProfile) {
    response.error = 'Failed to retrieve user customer profile'
    return response
  }

  const paymentTokenResponse = await vaultController.createPaymentToken({
    body: {
      customer: {
        merchantCustomerId: mappedUserProfile.customerProfile.paypalCustomerId,
        id: mappedUserProfile.customerProfile.userId
      },
      paymentSource: {
        token: {
          type: VaultTokenRequestType.SetupToken,
          id: event.arguments.setupToken
        }
      }
    }
  })

  if(paymentTokenResponse.result.id) {
    const savePaymentToken = await dynamoClient.models.CustomerSavedPaymentMethod.create({
      paymentMethodId: v4(),
      paypalCustomerId: mappedUserProfile.customerProfile.paypalCustomerId,
      paypalVaultId: paymentTokenResponse.result.id,
      type: event.arguments.paymentType,
      isDefault: String(event.arguments.isDefault ?? false),
      userEmail: event.arguments.userEmail,
    })
    if(!savePaymentToken.data) {
      response.error = 'Failed to save vault token'
      return response
    }
    response.status = 'Success'
    return response
  }

  response.error = 'Recieved invalid response from payment token server'
  return response
}