import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
    name: 'jamesfrenchphoto',
    access: (allow) => ({
        'photo-collections/*': [
            allow.groups(['ADMINS']).to(['read', 'write', 'delete']),
            allow.groups(['USERS']).to(['read'])
        ],
        'packages/*': [
            allow.groups(['ADMINS']).to(['read', 'write', 'delete']),
            allow.groups(['USERS']).to(['read'])
        ]
    })
})