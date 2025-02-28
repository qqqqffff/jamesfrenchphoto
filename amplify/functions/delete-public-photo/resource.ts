import { defineFunction, secret } from "@aws-amplify/backend";

export const deletePublicPhoto = defineFunction({
  entry: './handler2.ts',
  environment: {
    PUBLIC_BUCKET_NAME: secret('jamesfrenchphoto-public-bucket')
  }
})