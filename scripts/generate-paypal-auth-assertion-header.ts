import { env } from 'node:process'
import 'dotenv/config'

function encodeObjectToBase64(object: string) {
  return Buffer.from(object).toString('base64')
}

const envClientId = env.PAYPAL_SANDBOX_CLIENT_ID
const envMerchantId = env.PAYPAL_SANDBOX_MERCHANT_ID

export function generatePayPalAuthAssertionHeader(clientId?: string, merchantId?: string) {
  const authClientId = clientId || envClientId
  const authMerchantId = merchantId || envMerchantId

  if(!authClientId || !authMerchantId) {
    throw new Error('Missing client or merchant id for PayPal Auth Assertion Header')
  }

  const header = `{\r\n  "alg": "none"\r\n}`
  const encodedHeader = encodeObjectToBase64(header)
  const payload = `{\r\n  "iss": "${authClientId}",\r\n  "payer_id": "${authMerchantId}"\r\n}`
  const encodedPayload = encodeObjectToBase64(payload)

  const jwt = `${encodedHeader}.${encodedPayload}.`
  return jwt
}


console.log(`PayPal-Auth-Assertion=${generatePayPalAuthAssertionHeader()}`)

