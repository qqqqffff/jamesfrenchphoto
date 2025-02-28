import { defineFunction, secret } from "@aws-amplify/backend";

export const addPublicPhoto = defineFunction({
  entry: './handler.ts',
  environment: {
    PUBLIC_BUCKET_NAME: secret('jamesfrenchphoto-public-bucket'),
    PRIVATE_BUCKET_NAME: secret('jamesfrenchphoto-bucket')
  }
})