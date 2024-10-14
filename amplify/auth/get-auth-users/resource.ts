import { defineFunction } from "@aws-amplify/backend";

export const getAuthUsers = defineFunction({
    name: 'get-auth-users',
    entry: './handler.ts',
})