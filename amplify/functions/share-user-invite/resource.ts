import { defineFunction, secret } from "@aws-amplify/backend";

export const shareUserInvite = defineFunction({
  name: 'share-user-invite',
  entry: './handler.ts',
  environment: {
    SENDGRID_API_KEY: secret('sendgrid-api-key')
  }
})