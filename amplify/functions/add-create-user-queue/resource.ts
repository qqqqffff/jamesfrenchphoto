import { defineFunction } from "@aws-amplify/backend";

export const addCreateUserQueue = defineFunction({
    name: 'add-create-user-queue',
    entry: './handler.ts'
})