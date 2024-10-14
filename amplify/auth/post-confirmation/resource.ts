import { defineFunction } from "@aws-amplify/backend";

export const postConfirmation = defineFunction({
    name: 'post-confirmation',
    environment: {
        GROUP_NAME: 'USERS',
        ADMIN_GROUP_NAME: 'ADMINS'
    }
})