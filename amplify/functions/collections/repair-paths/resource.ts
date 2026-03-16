import { defineFunction, secret } from "@aws-amplify/backend";

export const repairPaths = defineFunction({
  name: 'repair-paths',
  entry: './handler.ts',
  environment: {
    BUCKET_NAME: secret('jamesfrenchphoto-bucket')
  },
  timeoutSeconds: 900,
  runtime: 22,
})