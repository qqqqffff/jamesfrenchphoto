import { defineFunction, secret } from "@aws-amplify/backend";

export const sendTimeslotConfirmation = defineFunction({
    name: 'send-timeslot-confirmation',
    entry: './handler.ts',
    environment: {
        SENDGRID_API_KEY: secret('sendgrid-api-key')
    },
    bundling: {
        minify: false
    },
    runtime: 22,
})