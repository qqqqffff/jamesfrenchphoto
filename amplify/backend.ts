import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { getPaymentIntent } from './functions/get-payment-intent/resource';
import { sendCreateUserEmail } from './functions/send-create-user/resource';
import { storage } from './storage/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Queue } from 'aws-cdk-lib/aws-sqs'
import { Duration } from 'aws-cdk-lib';
import type { Schema } from './data/resource'
import { generateClient } from 'aws-amplify/api';
import { SqsEventSource, SqsEventSourceProps } from 'aws-cdk-lib/aws-lambda-event-sources';

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

// 'ses:SendEmail', 'ses:SendRawEmail'

const emailSQS = new Queue(backend.createStack('EmailSQS'), 'emailQueue', {
  deliveryDelay: Duration.seconds(15),
})

const createUserEmailLambda = backend.sendCreateUserEmail.resources.lambda
const statement = new PolicyStatement({
  sid: 'AllowSendCreateUserEmail',
  actions: ['sqs:SendMessage', 'dynamodb:PutItem'],
  resources: ['*']
  // resources: [`${emailSQS.queueArn}/*`, `${backend.data.resources.tables['TemporaryCreateUsersTokens']}/*`]
})
createUserEmailLambda.addToRolePolicy(statement)
createUserEmailLambda.addEventSource(new SqsEventSource(emailSQS, {
  
}))

backend.addOutput({
  custom: {
    queueArn: emailSQS.queueArn,
  }
})