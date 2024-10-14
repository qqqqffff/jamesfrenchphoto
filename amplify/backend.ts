import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { addCreateUserQueue } from './functions/add-create-user-queue/resource';
import { EmailStepFunction } from './custom/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { stackConstants } from './constants';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  addCreateUserQueue
  
  // getPaymentIntent,
});



const addCreateUserQueueLambda = backend.addCreateUserQueue.resources.lambda

const tempTokensDbAccess = new PolicyStatement({
  sid: 'AllowTokensReadWrite',
  actions: ['dynamodb:PutItem'],
  resources: [stackConstants.tempTokensArn]
})

addCreateUserQueueLambda.addToRolePolicy(tempTokensDbAccess)

const customEmailerStepFunction = new EmailStepFunction(
  backend.createStack('EmailStepFunction'),
  'EmailStepFunction',
  {
    addCreateUserQueue: addCreateUserQueueLambda
  }
)

backend.addOutput({
  custom: {
    emailQueueArn: customEmailerStepFunction.emailQueue.queueArn,
    emailQueueName: customEmailerStepFunction.emailQueue.queueName,
  }
})