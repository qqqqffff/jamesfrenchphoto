import { defineFunction, secret } from "@aws-amplify/backend";

export const notifyUser = defineFunction({
  name: 'notify-user',
  entry: './handler.ts',
  environment: {
    SENDGRID_API_KEY: secret('sendgrid-api-key')
  },
  bundling: {
    minify: false
  },
  runtime: 22,
})