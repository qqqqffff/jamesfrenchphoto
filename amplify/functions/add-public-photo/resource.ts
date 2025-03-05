import { defineFunction, secret } from "@aws-amplify/backend";

export const addPublicPhoto = defineFunction({
  name: 'add-public-photo',
  entry: './handler.ts',
  environment: {
    PUBLIC_BUCKET_NAME: secret('jamesfrenchphoto-public-bucket'),
    PRIVATE_BUCKET_NAME: secret('jamesfrenchphoto-bucket'),
    // FONTCONFIG_PATH: '/opt/fonts',
    // LD_LIBRARY_PATH: '/lib'
  },
  bundling: {
    minify: false
  },
  layers: {
    'sharp': 'arn:aws:lambda:us-east-1:911167908910:layer:sharp:4',
    'canvas': 'arn:aws:lambda:us-east-1:911167908910:layer:canvas-nodejs:4',
  },
  runtime: 20,
  timeoutSeconds: 30
})