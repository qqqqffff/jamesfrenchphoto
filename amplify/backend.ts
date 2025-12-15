import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { PublicStorage } from './custom/public-storage/resource';
import { addPublicPhoto } from './functions/add-public-photo/resource';
import { deletePublicPhoto } from './functions/delete-public-photo/resource';
import { customMessage } from './auth/custom-message/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  addPublicPhoto,
  deletePublicPhoto,
  // addCreateUserQueue
  // getPaymentIntent,
});


const publicStorageInstance = new PublicStorage(
  backend.createStack('PublicStorage'),
  'PublicStorage',
  {
    addPublicPhoto: backend.addPublicPhoto.resources.lambda,
    deletePublicPhoto: backend.deletePublicPhoto.resources.lambda
  }
)

// const eventsStack = new Events( 
//   backend.createStack('jamesfrenchphoto-events'),
//   'jamesfrenchphoto-events-stack',
//   {
//     graphQLAPI: backend.data.resources.graphqlApi
//   }
// )

// backend.data.addEventBridgeDataSource('jamesfrenchphoto-eventbride-datasource', eventsStack.eventBus)


backend.addOutput({
  custom: {
    publicBucket: publicStorageInstance.publicBucket.bucketArn,
    cloudfrontDistributionName: publicStorageInstance.distribution.distributionDomainName,
  }
})


// const addCreateUserQueueLambda = backend.addCreateUserQueue.resources.lambda

// const tempTokensDbAccess = new PolicyStatement({
//   sid: 'AllowTokensReadWrite',
//   actions: ['dynamodb:PutItem'],
//   resources: [stackConstants.tempTokensArn]
// })

// addCreateUserQueueLambda.addToRolePolicy(tempTokensDbAccess)

// const customEmailerStepFunction = new EmailStepFunction(
//   backend.createStack('EmailStepFunction'),
//   'EmailStepFunction',
//   {
//     addCreateUserQueue: addCreateUserQueueLambda
//   }
// )

// backend.addOutput({
//   custom: {
//     emailQueueArn: customEmailerStepFunction.emailQueue.queueArn,
//     emailQueueName: customEmailerStepFunction.emailQueue.queueName,
//   }
// })