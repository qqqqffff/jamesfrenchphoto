import { defineFunction } from "@aws-amplify/backend";

export const addEmailQueue = defineFunction({
    name: 'add-email-queue',
    entry: './handler.ts'
})