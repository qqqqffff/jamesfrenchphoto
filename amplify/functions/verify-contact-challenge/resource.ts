import { defineFunction, secret } from "@aws-amplify/backend";

export const verifyContactChallenge = defineFunction({
    name: 'verify-contact-challenge',
    environment: {
        GOOGLE_RECAPTCHA_SECRET_KEY: secret('GOOGLE_RECAPTCHA_SECRET_KEY')
    }
})