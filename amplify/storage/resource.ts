import { defineStorage } from "@aws-amplify/backend";
import { downloadImages } from "../functions/download-images/resource";
import { shareCollection } from "../functions/share-collection/resource";
import { addPublicPhoto } from "../functions/add-public-photo/resource";
import { repairPaths } from "../functions/repair-paths/resource";

export const storage = defineStorage({
    name: 'jamesfrenchphoto',
    access: (allow) => ({
        'photo-collections/*': [
            allow.groups(['ADMINS']).to(['read', 'write', 'delete']),
            allow.groups(['USERS']).to(['read']),
            allow.resource(downloadImages).to(['read']),
            allow.resource(repairPaths).to(['list']),
            allow.guest.to(['read']),
        ],
        'photo-collections/covers/*': [
            allow.groups(['ADMINS']).to(['read', 'write', 'delete']),
            allow.groups(['USERS']).to(['read']),
            allow.guest.to(['read']),
            allow.resource(shareCollection).to(['read']),
            allow.resource(addPublicPhoto).to(['read']),
        ],
        'packages/*': [
            allow.groups(['ADMINS']).to(['read', 'write', 'delete']),
            allow.groups(['USERS']).to(['read'])
        ],
        'watermarks/*': [
            allow.groups(['ADMINS']).to(['read', 'write', 'delete']),
            allow.groups(['USERS']).to(['read']),
            allow.guest.to(['read']),
            allow.resource(addPublicPhoto).to(['read']),
        ],
        'table-files/*': [
            allow.groups(['ADMINS']).to(['read', 'write', 'delete'])
        ]
    }),
    isDefault: true
})