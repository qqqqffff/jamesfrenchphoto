import { defineStorage } from "@aws-amplify/backend";
import { downloadImages } from "../functions/collections/download-images/resource";
import { shareCollection } from "../functions/collections/share-collection/resource";
import { addPublicPhoto } from "../functions/collections/add-public-photo/resource";
import { repairPaths } from "../functions/collections/repair-paths/resource";

export const storage = defineStorage({
    name: 'jamesfrenchphoto',
    access: (allow) => ({
        'photo-collections/*': [
            allow.groups(['ADMINS']).to(['read', 'write', 'delete']),
            allow.groups(['USERS']).to(['read']),
            allow.resource(downloadImages).to(['read']),
            allow.resource(repairPaths).to(['list', 'get']),
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