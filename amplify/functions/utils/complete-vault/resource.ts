import { defineFunction, secret } from "@aws-amplify/backend";

export const completeVault = defineFunction({
  name: 'complete-vault',
  entry: './handler.ts',
  environment: {
    PAYPAL_CLIENT_ID: secret('paypal-client-id'),
    PAYPAL_SECRET_KEY: secret('paypal-secret-key'),
  },
  runtime: 22,
  timeoutSeconds: 180,
  bundling: {
    minify: false
  }
})