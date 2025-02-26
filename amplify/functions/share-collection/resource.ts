import { defineFunction, secret } from "@aws-amplify/backend";

export const shareCollection = defineFunction({
  name: 'share-collection',
  entry: './handler.ts',
  environment: {
    BUCKET_NAME: secret('jamesfrenchphoto-bucket'),
    SENDGRID_API_KEY: secret('sendgrid-api-key')
  }
})