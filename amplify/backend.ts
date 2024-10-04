import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { getPaymentIntent } from './functions/get-payment-intent/resource';
import { sendCreateUserEmail } from './functions/send-create-user/resource';
import { storage } from './storage/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  sendCreateUserEmail,
  // getPaymentIntent,
});

const createUserEmailLambda = backend.sendCreateUserEmail.resources.lambda

const statement = new PolicyStatement({
  sid: 'AllowSendCreateUserEmail',
  actions: ['ses:SendEmail', 'ses:SendRawEmail', 'dynamodb:PutItem'],
  resources: ["*"]
})

createUserEmailLambda.addToRolePolicy(statement)