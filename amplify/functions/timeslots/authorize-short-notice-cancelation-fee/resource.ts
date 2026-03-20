import { defineFunction, secret } from "@aws-amplify/backend";

export const authorizeShortNoticeCancelationFee = defineFunction({
  name: 'authorize-short-notice-cancelation-fee',
  entry: './handler.ts',
  environment: {
    PAYPAL_CLIENT_ID: secret('paypal-client-id'),
    PAYPAL_SECRET_KEY: secret('paypal-secret-key'),
    PAYPAL_MERCHANT_ID: secret('paypal-merchant-id'),
    
    AMPLIFY_BRANCH: process.env.AWS_BRANCH ?? 'sandbox',
  },
  runtime: 22
})