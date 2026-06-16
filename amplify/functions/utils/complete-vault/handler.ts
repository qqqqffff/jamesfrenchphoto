import { getAmplifyDataClientConfig } from "@aws-amplify/backend/function/runtime"
import { Amplify } from "aws-amplify"
import { env } from '$amplify/env/complete-vault'
import { generateClient } from "aws-amplify/api"
import { Schema } from "../../../data/resource"
import { Client, Environment, LogLevel, VaultController, VaultTokenRequestType } from "@paypal/paypal-server-sdk"
import { v4 } from 'uuid'
import { APIMutationResponse, CustomerProfile } from "../../../../src/types"
import { mapCustomerProfile } from "../../../../src/services/paymentService"

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env)
Amplify.configure(resourceConfig, libraryOptions)

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
  const customerProfile = await userProfile.data.customerProfile()
  let mappedCustomerProfile: CustomerProfile | undefined = customerProfile.data ? (
    await mapCustomerProfile(customerProfile.data)
  ) : undefined

  //customerProfile should exist atp
  if(!mappedCustomerProfile) {
    response.error = 'Failed to retrieve or create user customer profile'
    return response
  }

  const paymentTokenResponse = await vaultController.createPaymentToken({
    body: {
      customer: {
        merchantCustomerId: mappedCustomerProfile.paypalCustomerId,
        id: mappedCustomerProfile.userId
      },
      paymentSource: {
        token: {
          type: VaultTokenRequestType.SetupToken,
          id: event.arguments.setupToken
        }
      }
    }
  })

  const customerId = mappedCustomerProfile.paypalCustomerId ?? paymentTokenResponse.result.customer?.merchantCustomerId

  if(paymentTokenResponse.result.id && customerId) {
    const savePaymentToken = await dynamoClient.models.CustomerSavedPaymentMethod.create({
      paymentMethodId: v4(),
      paypalCustomerId: customerId,
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