import { defineFunction, secret } from "@aws-amplify/backend";

export const createShortNoticeCancelationOrder = defineFunction({
  name: 'create-short-notice-cancelation-order',
  entry: './handler.ts',
  environment: {
    PAYPAL_CLIENT_ID: secret('paypal-client-id'),
    PAYPAL_SECRET_KEY: secret('paypal-secret-key'),
    PAYPAL_MERCHANT_ID: secret('paypal-merchant-id'),
    PAYPAL_SANDBOX_CLIENT_ID: secret('paypal-sandbox-client-id'),
    PAYPAL_SANDBOX_SECRET_KEY: secret('paypal-sandbox-secret-key'),
    PAYPAL_SANDBOX_MERCHANT_ID: secret('paypal-sandbox-merchant-id'),
  },
  runtime: 22
})