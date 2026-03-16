import { env } from 'node:process'
import 'dotenv/config'
import validator from 'validator'

function encodeObjectToBase64(object: any) {
  const objectString = JSON.stringify(object)
  return Buffer.from(objectString).toString('base64url')
}

const clientId = env.PAYPAL_SANDBOX_CLIENT_ID
const merchantId = env.PAYPAL_SANDBOX_MERCHANT_ID

const header = {
  alg: 'none'
}

const encodedHeader = encodeObjectToBase64(header)

const payload = {
  iss: clientId,
  payer_id: merchantId
}

const encodedPayload = encodeObjectToBase64(payload)

const jwt = `${encodedHeader}.${encodedPayload}.`
console.log(`Validation:${validator.isJWT(jwt)}`)
console.log(`PayPal-Auth-Assertion=${jwt}`)

