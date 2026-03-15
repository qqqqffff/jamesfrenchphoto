import { Client, Environment, LogLevel } from '@paypal/paypal-server-sdk'
import { Schema } from '../../data/resource'
import { APIMutationResponse } from '../../../src/types'


export const handler: Schema['ChargeNoShowFee']['functionHandler'] = async (event) => {
  let response: APIMutationResponse | undefined
  if(!event.arguments.timeslotId || !event.arguments.userEmail) {
    response = {
      status: 'Fail',
      error: 'Timeslot Id or User Email Missing.'
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

  //TODO: change environment configuration based on amplify sandbox/production

  const client = new Client({
    clientCredentialsAuthCredentials:  {
      oAuthClientId: paypalClientId,
      oAuthClientSecret: paypalSecretKey
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

  response = {
    status: 'Success'
  }

  return response

  //during registration for a timeslot paypal order is crea
}

