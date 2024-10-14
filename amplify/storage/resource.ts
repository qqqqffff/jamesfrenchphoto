import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
    name: 'photoCollections',
    access: (allow) => ({
        'photo-collections/*': [
            allow.groups(['ADMINS']).to(['read', 'write', 'delete'])        
        ]
    })
})