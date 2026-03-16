import { defineFunction, secret } from "@aws-amplify/backend";

export const deletePublicPhoto = defineFunction({
  name: 'delete-public-photo',
  entry: './handler.ts',
  environment: {
    PUBLIC_BUCKET_NAME: secret('jamesfrenchphoto-public-bucket')
  },
  runtime: 22,
})