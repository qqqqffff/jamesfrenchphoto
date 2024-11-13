import { defineAuth } from '@aws-amplify/backend';
import { postConfirmation } from './post-confirmation/resource';
import { preSignUp } from './pre-sign-up/resource';
import { getAuthUsers } from './get-auth-users/resource';
/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    "custom:verified": {
      dataType: 'Boolean',
    },
  },
  groups: ["ADMINS", "USERS"],
  triggers: {
    postConfirmation,
    preSignUp
  },
  access: (allow) => [
    allow.resource(postConfirmation).to(["addUserToGroup"]),
    allow.resource(getAuthUsers).to(['listUsers']),
  ],
});