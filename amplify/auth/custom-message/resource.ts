import { defineFunction } from "@aws-amplify/backend";

export const customMessage = defineFunction({
    name: 'custom-message',
    entry: './handler.ts',
})