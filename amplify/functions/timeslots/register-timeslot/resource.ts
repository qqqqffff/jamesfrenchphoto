import { defineFunction } from "@aws-amplify/backend";

export const registerTimeslot = defineFunction({
  name: 'register-timeslot',
  entry: './handler.ts',
  runtime: 22,
  bundling: {
    minify: false
  }
})