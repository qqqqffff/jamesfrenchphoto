import { defineAuth } from '@aws-amplify/backend';
import { postConfirmation } from './post-confirmation/resource';
import { getAuthUsers } from './get-auth-users/resource';

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  groups: ["ADMINS", "USERS"],
  triggers: {
    postConfirmation
  },
  access: (allow) => [
    allow.resource(postConfirmation).to(["addUserToGroup"]),
    allow.resource(getAuthUsers).to(['listUsers'])
  ],
});
