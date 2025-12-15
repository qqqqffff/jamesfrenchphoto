import { defineFunction, secret } from "@aws-amplify/backend";

export const customMessage = defineFunction({
    name: 'custom-message',
    entry: './handler.ts',
    environment: {
        SENDGRID_API_KEY: secret('sendgrid-api-key'),
        KEY_ARN: secret('auth-key-id')
    },
    bundling: {
        minify: false
    },
    runtime: 22,
})
