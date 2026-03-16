import { defineFunction } from "@aws-amplify/backend";

export const registerUser = defineFunction({
  name: 'register-user',
  entry: './handler.ts',
  timeoutSeconds: 30,
  runtime: 22,
})