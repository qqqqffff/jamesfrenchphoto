import { defineFunction } from "@aws-amplify/backend";

export const adminUpdateUserAttributes = defineFunction({
  name: 'admin-update-user-attributes',
  entry: './handler.ts',
  runtime: 22,
})