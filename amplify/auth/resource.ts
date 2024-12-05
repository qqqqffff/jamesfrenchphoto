import { defineAuth } from '@aws-amplify/backend';
import { postConfirmation } from './post-confirmation/resource';
import { preSignUp } from './pre-sign-up/resource';
import { getAuthUsers } from './get-auth-users/resource';
import { customMessage } from './custom-message/resource';
import { updateUserAttribute } from './update-user-attribute/resource';
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
    // familyName: {
    //   required: true,
    // },
    // givenName: {
    //   required: true,
    // }
  },
  groups: ["ADMINS", "USERS"],
  triggers: {
    postConfirmation,
    preSignUp,
    customMessage,
  },
  access: (allow) => [
    allow.resource(postConfirmation).to(["addUserToGroup"]),
    allow.resource(getAuthUsers).to(['listUsers']),
    allow.resource(updateUserAttribute).to(['updateUserAttributes'])
  ],
});