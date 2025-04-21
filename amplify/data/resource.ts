import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { getPaymentIntent } from '../functions/get-payment-intent/resource';
import { postConfirmation } from '../auth/post-confirmation/resource';
import { getAuthUsers } from '../auth/get-auth-users/resource';
import { addCreateUserQueue } from '../functions/add-create-user-queue/resource';
import { verifyContactChallenge } from '../functions/verify-contact-challenge/resource';
import { sendTimeslotConfirmation } from '../functions/send-timeslot-confirmation/resource';
import { updateUserAttribute } from '../auth/update-user-attribute/resource';
import { downloadImages } from '../functions/download-images/resource';
import { shareCollection } from '../functions/share-collection/resource';
import { addPublicPhoto } from '../functions/add-public-photo/resource';
import { deletePublicPhoto } from '../functions/delete-public-photo/resource';
import { shareUserInvite } from '../functions/share-user-invite/resource';
import { repairPaths } from '../functions/repair-paths/resource';

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any unauthenticated user can "create", "read", "update", 
and "delete" any "Todo" records.
=========================================================================*/

const schema = a.schema({
  PhotoCollection: a
    .model({
      id: a.id().required(),
      coverPath: a.string(),
      publicCoverPath: a.string(),
      coverType: a.customType({
        textColor: a.string(),
        bgColor: a.string(),
        date: a.string(),
        placement: a.enum(['center', 'left', 'right']),
        textPlacement: a.enum(['center', 'top', 'bottom']),
        bgOpacity: a.integer()
      }),
      name: a.string().required(),
      tags: a.hasMany('CollectionTag', 'collectionId'),
      sets: a.hasMany('PhotoSet', 'collectionId'),
      tokens: a.hasMany('TemporaryAccessToken', 'collectionId'),
      participants: a.hasMany('ParticipantCollections', 'collectionId'),
      watermarkPath: a.string(),
      downloadable: a.boolean().default(false),
      items: a.integer().default(0),
      published: a.boolean().default(false),

    })
    .identifier(['id'])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated('userPools').to(['get', 'list']), allow.guest().to(['get'])]),
  PhotoSet: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      paths: a.hasMany('PhotoPaths', 'setId'),
      order: a.integer().required(),
      collection: a.belongsTo('PhotoCollection', 'collectionId'),
      collectionId: a.id().required(),
      watermarkPath: a.string(),
      items: a.integer().default(0)
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [index('collectionId')])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated('userPools').to(['get', 'list']), allow.guest().to(['get', 'list'])]),
  Watermark: a
    .model({
      id: a.id().required(),
      path: a.string().required(),
    })
    .identifier(['id'])
    .authorization((allow) => [allow.group('ADMINS')]),
  PhotoPaths: a
    .model({
      id: a.id().required(),
      path: a.string().required(),
      order: a.integer().required(),
      setId: a.id().required(),
      set: a.belongsTo('PhotoSet', 'setId'),
      favorites: a.hasMany('UserFavorites', 'pathId')
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [
      index('setId').sortKeys(['order']),
    ])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated('userPools').to(['get', 'list']), allow.guest().to(['read'])]),
  UserFavorites: a
    .model({
      id: a.id().required(),
      collectionId: a.id().required(),
      pathId: a.id().required(),
      path: a.belongsTo('PhotoPaths', 'pathId'),
      participantId: a.id().required(),
      participant: a.belongsTo('Participant', 'participantId'),
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [
      index('participantId').sortKeys(['collectionId']),
    ])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated('userPools').to(['get', 'delete', 'create', 'list']), allow.guest().to(['get', 'delete', 'create', 'list'])]),
  UserTag: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      color: a.string(),
      collectionTags: a.hasMany('CollectionTag', 'tagId'), //TODO: improve authorization
      timeslotTags: a.hasMany('TimeslotTag', 'tagId'),
      packages: a.hasOne('Package', 'tagId'),
      notifications: a.hasMany('NotificationUserTags', 'tagId'),
      participants: a.hasMany('ParticipantUserTag', 'tagId')
    })
    .identifier(['id'])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated('userPools').to(['get', 'list']), allow.guest().to(['get'])]),
  CollectionTag: a
    .model({
      id: a.id().required(),
      collectionId: a.id().required(),
      collection: a.belongsTo('PhotoCollection', 'collectionId'),
      tagId: a.id().required(),
      tag: a.belongsTo('UserTag', 'tagId')
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [index('tagId'), index('collectionId')])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated('userPools').to(['get', 'list'])]),
  TimeslotTag: a
    .model({
      id: a.id().required(),
      tagId: a.id().required(),
      tag: a.belongsTo('UserTag', 'tagId'),
      timeslotId: a.id().required(),
      timeslot: a.belongsTo('Timeslot', 'timeslotId')
    })
    .identifier(['id'])
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
    .secondaryIndexes((index) => [index('tagId')])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated('userPools').to(['get', 'list'])]),
  TableGroup: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      tables: a.hasMany('Table','tableGroupId')
    })
    .identifier(['id'])
    .authorization((allow) => [allow.group('ADMINS')]),
  Table: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      tableGroupId: a.id().required(),
      tableGroup: a.belongsTo('TableGroup', 'tableGroupId'),
      tableColumns: a.hasMany('TableColumn', 'tableId')
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [index('tableGroupId')])
    .authorization((allow) => [allow.group('ADMINS')]),
  TableColumn: a
    .model({
      id: a.string().required(),
      header: a.string().required(),
      values: a.string().array(),
      choices: a.string().array(),
      type: a.enum(['value', 'user', 'date', 'choice', 'tag', 'file']),
      color: a.hasMany('ColumnColorMapping', 'columnId'),
      tag: a.string().array(),
      tableId: a.id().required(),
      table: a.belongsTo('Table', 'tableId'),
      order: a.integer().required()
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [index('tableId')])
    .authorization((allow) => [allow.group('ADMINS')]),
  ColumnColorMapping: a
    .model({
      id: a.id().required(),
      columnId: a.id().required(),
      column: a.belongsTo('TableColumn', 'columnId'),
      value: a.string().required(),
      bgColor: a.string(),
      textColor: a.string()
    })
    .secondaryIndexes((index) => [index('columnId')])
    .authorization((allow) => [allow.group('ADMINS')]),
  Timeslot: a
    .model({
      id: a.id().required(),
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
      sittingNumber: a.integer(),
      email: a.string().required().authorization((allow) => [allow.group('ADMINS'), allow.authenticated().to(['read', 'update']), allow.guest().to(['create', 'read'])]),
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
      temporaryCreate: a.hasOne('TemporaryCreateUsersTokens', 'userEmail'),
      firstName: a.string(),
      lastName: a.string(),
    })
    .identifier(['email'])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated().to(['get', 'update']), allow.guest().to(['create', 'get'])]),
  Participant: a.
    model({
      id: a.id().required(),
      userEmail: a.string().required(),
      user: a.belongsTo('UserProfile', 'userEmail'),
      timeslot: a.hasMany('Timeslot', 'participantId'),
      firstName: a.string().required(),
      lastName: a.string().required(),
      middleName: a.string(),
      preferredName: a.string(),
      contact: a.boolean().default(false),
      email: a.string(),
      collections: a.hasMany('ParticipantCollections', 'participantId'),
      notifications: a.hasMany('NotificationParticipants', 'participantId'),
      tags: a.hasMany('ParticipantUserTag', 'participantId'),
      favorites: a.hasMany('UserFavorites', 'participantId')
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [index('userEmail')])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated().to(['create', 'get', 'update', 'list']), allow.guest().to(['create'])]),
  ParticipantUserTag: a.
    model({
      id: a.id().required(),
      tagId: a.id().required(),
      tag: a.belongsTo('UserTag', 'tagId'),
      participantId: a.id().required(),
      participant: a.belongsTo('Participant', 'participantId')
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [index('tagId'), index('participantId')])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated().to(['get', 'list'])]),
  ParticipantCollections: a.
    model({
      id: a.id().required(),
      participant: a.belongsTo('Participant', 'participantId'),
      participantId: a.id().required(),
      collection: a.belongsTo('PhotoCollection', 'collectionId'),
      collectionId: a.id().required()
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [index('participantId'), index('collectionId')])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated().to(['get', 'list'])]),
  Notifications: a.
    model({
      id: a.id().required(),
      content: a.string().required(),
      location: a.enum(['dashboard']),
      participant: a.hasMany('NotificationParticipants', 'notificationId'),
      tags: a.hasMany('NotificationUserTags', 'notificationId'),
      expiration: a.string(),
      //TODO: implment me
      closable: a.boolean(),
      textSettings: a.customType({
        alignment: a.enum(['center', 'left', 'right'])
      })
    })
    .identifier(['id'])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated().to(['get', 'list'])]),
  NotificationUserTags: a
    .model({
      id: a.id().required(),
      notificationId: a.id().required(),
      notification: a.belongsTo('Notifications', 'notificationId'),
      tagId: a.id().required(),
      tag: a.belongsTo('UserTag', 'tagId')
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [index('tagId'), index('notificationId')])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated().to(['get', 'list'])]),
  NotificationParticipants: a
    .model({
      id: a.id().required(),
      notificationId: a.id().required(),
      notification: a.belongsTo('Notifications', 'notificationId'),
      participantId: a.id().required(),
      participant: a.belongsTo('Participant', 'participantId')
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [index('participantId'), index('notificationId')])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated().to(['get', 'list'])]),
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
      userProfile: a.belongsTo('UserProfile', 'userEmail'),
      userEmail: a.string().required(),
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
  ShareCollection: a
    .query()
    .arguments({
      email: a.string().required().array().required(),
      header: a.string(),
      header2: a.string(),
      body: a.string(),
      footer: a.string(),
      coverPath: a.string().required(),
      link: a.string().required(),
      name: a.string().required(),
    })
    .handler(a.handler.function(shareCollection))
    .authorization((allow) => [allow.group('ADMINS')])
    .returns(a.json()),
  ShareTemplates: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      header: a.string(),
      header2: a.string(),
      body: a.string(),
      footer: a.string(),
    })
    .authorization((allow) => [allow.group('ADMINS')])
    .identifier(['id']),
  ShareUserInvite: a
    .query()
    .arguments({
      email: a.string().required(),
      firstName: a.string().required(),
      lastName: a.string().required(),
      link: a.string().required()
    })
    .handler(a.handler.function(shareUserInvite))
    .authorization((allow) => [allow.authenticated()])
    .returns(a.json()),
  DownloadImages: a
    .query()
    .arguments({
      paths: a.string().required().array()
    })
    .handler(a.handler.function(downloadImages))
    .authorization((allow) => [allow.authenticated()])
    .returns(a.string()),
  AddPublicPhoto: a
    .query()
    .arguments({
      path: a.string().required(),
      type: a.string().required(),
      name: a.string().required()
    })
    .handler(a.handler.function(addPublicPhoto))
    .authorization((allow) => [allow.group('ADMINS')])
    .returns(a.string()),
  RepairPaths: a
    .query()
    .arguments({
      collection: a.string().required(),
      set: a.string().required(),
    })
    .handler(a.handler.function(repairPaths))
    .authorization((allow) => [allow.group('ADMINS')])
    .returns(a.string()),
  DeletePublicPhoto: a
    .query()
    .arguments({
      path: a.string().required(),
    })
    .handler(a.handler.function(deletePublicPhoto))
    .authorization((allow) => [allow.group('ADMINS')])
    .returns(a.json()),
  TemporaryAccessToken: a
    .model({
      id: a.id().required(),
      expire: a.string(),
      sessionTime: a.string(),
      collectionId: a.id().required(),
      collection: a.belongsTo('PhotoCollection', 'collectionId')
    })
    .identifier(['id'])
    .authorization((allow) => [allow.group('ADMINS'), allow.guest().to(['read'])])
})
.authorization((allow) => [
  allow.resource(postConfirmation),
  allow.resource(addCreateUserQueue),
  allow.resource(shareUserInvite),
  allow.resource(repairPaths)
]);

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
