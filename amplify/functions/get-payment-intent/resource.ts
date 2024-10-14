import { defineFunction } from "@aws-amplify/backend";

export const getPaymentIntent = defineFunction({
    name: 'get-payment-intent',
    entry: './handler.ts'
})