import { defineFunction, secret } from "@aws-amplify/backend";

export const chargeNoShowFee = defineFunction({
  name: 'charge-no-show-fee',
  entry: './handler.ts',
  environment: {
    PAYPAL_CLIENT_ID: secret('paypal-client-id'),
    PAYPAL_SECRET_KEY: secret('paypal-secret-key'),
    PAYPAL_SANDBOX_CLIENT_ID: secret('paypal-sandbox-client-id'),
    PAYPAL_SANDBOX_SECRET_KEY: secret('paypal-sandbox-secret-key')
  },
  runtime: 22
})