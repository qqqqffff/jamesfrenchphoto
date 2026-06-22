import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { PublicStorage } from './custom/public-storage/resource';
import { RetrieveCollection } from './custom/retrieve-collection/resource';
import { addPublicPhoto } from './functions/collections/add-public-photo/resource';
import { deletePublicPhoto } from './functions/collections/delete-public-photo/resource';
import { customMessage } from './auth/custom-message/resource';
import { chargeNoShowFee } from './functions/timeslots/charge-no-show-fee/resource';
import { createShortNoticeCancelationOrder } from './functions/timeslots/create-short-notice-cancelation-order/resource';
import { captureShortNoticeCancelationOrder } from './functions/timeslots/capture-short-notice-cancelation-order/resource';
import { savePaymentInformation } from './functions/users/save-payment-information/resource';
import { autoCompleteAddress } from './functions/utils/auto-complete-address/resource';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';
// import { autoCompleteAddress } from './functions/utils/auto-complete-address/resource';
// import { FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  storage,
  addPublicPhoto,
  deletePublicPhoto,

  chargeNoShowFee,
  createShortNoticeCancelationOrder,
  captureShortNoticeCancelationOrder,
  savePaymentInformation,

  autoCompleteAddress
  // autoCompleteAddress
  
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

const userPool = backend.auth.resources.userPool
const region = Stack.of(userPool).region
const userPoolId = userPool.userPoolId

const retrieveCollection = new RetrieveCollection(
  backend.createStack('RetrieveCollection'),
  'RetrieveCollection',
  {
    bucket: backend.storage.resources.bucket,
    photoSetTable: backend.data.resources.tables['PhotoSet'],
    photoPathsTable: backend.data.resources.tables['PhotoPaths'],
    cognitoJwksUrl: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
  }
)

// backend.autoCompleteAddress.resources.lambda.
const geoPlacesAutoComplete = new PolicyStatement({
  sid: 'AllowAutoCompleteAddress',
  actions: ['geo-places:Autocomplete'],
  resources: ['*']
})

backend.autoCompleteAddress.resources.lambda.addToRolePolicy(geoPlacesAutoComplete)

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
    retrieveCollectionUrl: retrieveCollection.url,
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