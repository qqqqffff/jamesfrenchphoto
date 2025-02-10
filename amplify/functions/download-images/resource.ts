import { defineFunction, secret } from "@aws-amplify/backend";

export const downloadImages = defineFunction({
  name: 'download-images',
  entry: './handler.ts',
  environment: {
    BUCKET_NAME: secret('jamesfrenchphoto-bucket')
  }
})