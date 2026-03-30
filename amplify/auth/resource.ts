import { defineAuth } from '@aws-amplify/backend';
import { postConfirmation } from './post-confirmation/resource';
import { preSignUp } from './pre-sign-up/resource';
import { getAuthUsers } from './get-auth-users/resource';
import { customMessage } from './custom-message/resource';
import { updateUserAttribute } from './update-user-attribute/resource';
import { adminUpdateUserAttributes } from './admin-update-user-attributes/resource';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  userAttributes: {
    "custom:verified": {
      dataType: 'Boolean',
    },
    email: {
      required: true,
      mutable: true
    }
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
    allow.resource(customMessage).to(['listUsers']),
    allow.resource(updateUserAttribute).to(['updateUserAttributes']),
    allow.resource(adminUpdateUserAttributes).to(['updateUserAttributes']),
  ],
  senders: {
    email: {
      handler: customMessage,
    }
  }
});
