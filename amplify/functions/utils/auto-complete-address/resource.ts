import { defineFunction } from "@aws-amplify/backend";

export const autoCompleteAddress = defineFunction({
  name: 'auto-complete-address',
  entry: './handler.ts',
  runtime: 22,
  timeoutSeconds: 180
})