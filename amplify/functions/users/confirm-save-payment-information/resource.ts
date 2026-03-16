import { defineFunction, secret } from "@aws-amplify/backend";

export const confirmSavePaymentInformation = defineFunction({
  name: 'confirm-save-payment-information',
  entry: './handler.ts',
  environment: {
    PAYPAL_CLIENT_ID: secret('paypal-client-id'),
    PAYPAL_SECRET_KEY: secret('paypal-secret-key'),
  },
  runtime: 22,
})