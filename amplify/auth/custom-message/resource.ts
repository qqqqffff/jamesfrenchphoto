import { defineFunction, secret } from "@aws-amplify/backend";

export const customMessage = defineFunction({
    name: 'custom-message',
    entry: './handler.ts',
    environment: {
        SENDGRID_API_KEY: secret('sendgrid-api-key')
    },
    bundling: {
        minify: false
    }
})