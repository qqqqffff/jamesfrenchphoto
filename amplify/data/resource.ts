import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { getPaymentIntent } from '../functions/get-payment-intent/resource';
import { postConfirmation } from '../auth/post-confirmation/resource';
import { getAuthUsers } from '../auth/get-auth-users/resource';
import { addCreateUserQueue } from '../functions/add-create-user-queue/resource';
import { verifyContactChallenge } from '../functions/verify-contact-challenge/resource';
import { sendTimeslotConfirmation } from '../functions/send-timeslot-confirmation/resource';
import { updateUserAttribute } from '../auth/update-user-attribute/resource';

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any unauthenticated user can "create", "read", "update", 
and "delete" any "Todo" records.
=========================================================================*/

const schema = a.schema({
  Events: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      collections: a.hasMany('PhotoCollection', 'eventId')
    })
    .identifier(['id'])
    .authorization((allow) => [allow.group('ADMINS')]),
  PhotoCollection: a
    .model({
      id: a.id().required(),
      eventId: a.id().required(),
      event: a.belongsTo('Events', 'eventId'),
      coverPath: a.string(),
      name: a.string().required(),
      imagePaths: a.hasMany('PhotoPaths', 'collectionId'),
      tags: a.hasMany('CollectionTag', 'collectionId')
    })
    .identifier(['id'])
    .authorization((allow) => [allow.authenticated()]),
  PhotoPaths: a
    .model({
      id: a.id().required(),
      path: a.string().required(),
      displayHeight: a.integer(),
      displayWidth: a.integer(),
      order: a.integer().required(),
      collectionId: a.id().required(),
      collection: a.belongsTo('PhotoCollection', 'collectionId')
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [index('collectionId')])
    .authorization((allow) => [allow.authenticated()]),
  UserTag: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      color: a.string(),
      collectionTags: a.hasMany('CollectionTag', 'tagId'), //TODO: improve authorization
      timeslotTags: a.hasMany('TimeslotTag', 'tagId'),
      packages: a.hasOne('Package', 'tagId')
    })
    .identifier(['id'])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated('userPools').to(['get', 'list']), allow.guest().to(['get'])]),
  CollectionTag: a
    .model({
      collectionId: a.id().required(),
      collection: a.belongsTo('PhotoCollection', 'collectionId'),
      tagId: a.id().required(),
      tag: a.belongsTo('UserTag', 'tagId')
    })
    .secondaryIndexes((index) => [index('tagId')])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated('userPools').to(['get', 'list'])]),
  TimeslotTag: a
    .model({
      tagId: a.id().required(),
      tag: a.belongsTo('UserTag', 'tagId'),
      timeslotId: a.id().required(),
      timeslot: a.belongsTo('Timeslot', 'timeslotId')
    })
    .identifier(['timeslotId'])
    .secondaryIndexes((index) => [index('tagId')])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated('userPools').to(['get', 'list'])]),
  Package: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      tagId: a.id().required(),
      tag: a.belongsTo('UserTag', 'tagId'),
      pdfPath: a.string().required()
    })
    .identifier(['id'])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated('userPools').to(['get', 'list'])]),
  UserColumnDisplay: a
    .model({
      id: a.string().required(),
      heading: a.string().required(),
      color: a.hasMany('ColumnColorMapping', 'columnId'),
      display: a.boolean().default(true),
      tag: a.string().required(),
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [index('tag'), index('heading')])
    .authorization((allow) => [allow.group('ADMINS')]),
  ColumnColorMapping: a
    .model({
      id: a.id().required(),
      columnId: a.id().required(),
      column: a.belongsTo('UserColumnDisplay', 'columnId'),
      value: a.string().required(),
      bgColor: a.string(),
      textColor: a.string()
    })
    .secondaryIndexes((index) => [index('columnId')])
    .authorization((allow) => [allow.group('ADMINS')]),
  Timeslot: a
    .model({
      id: a.id(),
      register: a.string().authorization((allow) => [allow.group('ADMINS'), allow.authenticated('userPools')]),
      user: a.belongsTo('UserProfile', 'register'),
      start: a.datetime().required(),
      end: a.datetime().required(),
      timeslotTag: a.hasOne('TimeslotTag', 'timeslotId'),
      participant: a.belongsTo('Participant', 'participantId'),
      participantId: a.id().authorization((allow) => [allow.group('ADMINS'), allow.authenticated('userPools')]),
    })
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated('userPools').to(['get', 'list'])]),
  UserProfile: a
    .model({
      sittingNumber: a.integer().required(),
      email: a.string().required(),
      userTags: a.string().array().authorization((allow) => [allow.group('ADMINS'), allow.authenticated().to(['read']), allow.guest().to(['create'])]),
      timeslot: a.hasMany('Timeslot', 'register'),
      participantFirstName: a.string(),
      participantLastName: a.string(),
      participantMiddleName: a.string(),
      participantPreferredName: a.string(),
      preferredContact: a.enum(['EMAIL', 'PHONE']),
      participantContact: a.boolean().default(false),
      participantEmail: a.string(),
      participant: a.hasMany('Participant', 'userEmail'),
      activeParticipant: a.id(),
    })
    .identifier(['email'])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated().to(['get', 'update']), allow.guest().to(['create'])]),
  Participant: a.
    model({
      id: a.id().required(),
      userEmail: a.string().required(),
      user: a.belongsTo('UserProfile', 'userEmail'),
      userTags: a.string().array().authorization((allow) => [allow.group('ADMINS'), allow.authenticated().to(['read', 'create']), allow.guest().to(['create'])]),
      timeslot: a.hasMany('Timeslot', 'participantId'),
      firstName: a.string().required(),
      lastName: a.string().required(),
      middleName: a.string(),
      preferredName: a.string(),
      contact: a.boolean().default(false),
      email: a.string(),
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [index('userEmail')])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated().to(['create', 'get', 'update']), allow.guest().to(['create'])]),
  GetAuthUsers: a
    .query()
    .authorization((allow) => [allow.group('ADMINS')])
    .handler(a.handler.function(getAuthUsers))
    .returns(a.json()),
  UpdateUserPhoneNumber: a
    .query()
    .arguments({
      phoneNumber: a.string().required(),
      accessToken: a.string().required(),
    })
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(updateUserAttribute))
    .returns(a.json()),
  VerifyContactChallenge: a
    .query()
    .arguments({
      token: a.string().required(),
      contact: a.string()
    })
    .authorization((allow) => [allow.guest(), allow.authenticated('userPools')])
    .handler(a.handler.function(verifyContactChallenge))
    .returns(a.json()),
  AddCreateUserQueue: a
    .query()
    .arguments({
      email: a.string().required(),
      sittingNumber: a.integer().required()
    })
    .authorization((allow) => [allow.group('ADMINS')])
    .handler(a.handler.function(addCreateUserQueue))
    .returns(a.json()),
  TemporaryCreateUsersTokens: a
    .model({
      id: a.string().required(),
      tags: a.string().array(),
      sittingNumberPrefix: a.integer(),
    })
    .identifier(['id'])
    .authorization((allow) => [allow.group('ADMINS'), allow.guest().to(['get'])]),
  Pricing: a
    .model({
      object: a.string(),
      price: a.integer(),
    })
    .authorization((allow) => [allow.authenticated()]),
  PaymentIntent: a
    .customType({
      objects: a.string().array(),
      total: a.integer(),
      currency: a.string(),
    }),
  GetPaymentIntent: a
    .query()
    .arguments({
      objects: a.string().array(),
    })
    .returns(a.ref('PaymentIntent'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(getPaymentIntent)),
  SendTimeslotConfirmation: a
    .query()
    .arguments({
      email: a.string().required(),
      start: a.datetime().required(),
      end: a.datetime().required(),
    })
    .handler(a.handler.function(sendTimeslotConfirmation))
    .authorization((allow) => [allow.authenticated()])
    .returns(a.json()),
})
.authorization((allow) => [allow.resource(postConfirmation), allow.resource(addCreateUserQueue)]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
