import { defineFunction, secret } from "@aws-amplify/backend";

export const shareCollection = defineFunction({
  name: 'share-collection',
  entry: './handler.ts',
  environment: {
    SENDGRID_API_KEY: secret('sendgrid-api-key-2'),
    BASE_LINK: secret('cloudfront-base-link')
  }
})