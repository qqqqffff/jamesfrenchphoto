import { defineFunction } from "@aws-amplify/backend";

export const sendCreateUserEmail = defineFunction({
    name: 'send-create-user-email',
    entry: './handler.ts'
})