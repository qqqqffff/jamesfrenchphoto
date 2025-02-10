import { defineStorage } from "@aws-amplify/backend";
import { downloadImages } from "../functions/download-images/resource";

export const storage = defineStorage({
    name: 'jamesfrenchphoto',
    access: (allow) => ({
        'photo-collections/*': [
            allow.groups(['ADMINS']).to(['read', 'write', 'delete']),
            allow.groups(['USERS']).to(['read']),
            allow.resource(downloadImages).to(['read'])
        ],
        'packages/*': [
            allow.groups(['ADMINS']).to(['read', 'write', 'delete']),
            allow.groups(['USERS']).to(['read'])
        ],
        'watermarks/*': [
            allow.groups(['ADMINS']).to(['read', 'write', 'delete']),
            allow.groups(['USERS']).to(['read'])
        ]
    })
})