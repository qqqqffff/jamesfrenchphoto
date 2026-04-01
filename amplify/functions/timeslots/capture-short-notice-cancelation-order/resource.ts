import { defineFunction, secret } from "@aws-amplify/backend";

export const captureShortNoticeCancelationOrder = defineFunction({
  name: 'capture-short-notice-cancelation-order',
  entry: './handler.ts',
  environment: {
    PAYPAL_CLIENT_ID: secret('paypal-client-id'),
    PAYPAL_SECRET_KEY: secret('paypal-secret-key'),
    PAYPAL_MERCHANT_ID: secret('paypal-merchant-id'),
  },
  runtime: 22,
  timeoutSeconds: 180
})