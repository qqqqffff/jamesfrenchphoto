import { type ClientSchema, a, defineData, defineFunction } from '@aws-amplify/backend';
import { getPaymentIntent } from '../functions/get-payment-intent/resource';
import { postConfirmation } from '../auth/post-confirmation/resource';
import { getAuthUsers } from '../auth/get-auth-users/resource';

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
      name: a.string(),
      subCategories: a.hasMany('SubCategory', 'id')
    }).identifier(['id'])
    .authorization((allow) => [allow.group('ADMINS')]),
  SubCategory: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      headers: a.string().array(),
      fields: a.hasMany('SubCategoryFields', 'id'),
      collection: a.hasOne('PhotoCollection', 'id'),
      type: a.string().required(),
      eventId: a.id().required(),
      event: a.belongsTo('Events', 'id')
    })
    .identifier(['id'])
    .authorization((allow) => [allow.group('ADMINS')]),
  PhotoCollection: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      imagePaths: a.string().array(),
      subCategoryId: a.id().required(),
      subCategory: a.belongsTo('SubCategory', 'id'),
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [index('subCategoryId')])
    .authorization((allow) => [allow.authenticated()]),
  SubCategoryFields: a
    .model({
      id: a.id().required(),
      subCategoryId: a.id().required(),
      subCategory: a.belongsTo('SubCategory', 'id'),
      row: a.integer().required(),
      key: a.string().required(),
      value: a.string().required(),
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [index('subCategoryId')])
    .authorization((allow) => [allow.group('ADMINS')]),
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
    .authorization((allow) => [allow.guest()])
    .handler(a.handler.function(getPaymentIntent)),
  UserProfile: a
    .model({
      email: a.string(),
      firstName: a.string(),
      lastName: a.string(),
      phoneNumber: a.string(),
      options: a.string().array()
    })
    .authorization((allow) => [allow.ownerDefinedIn("email"), allow.group('ADMINS')]),
  GetAuthUsers: a
    .query()
    .authorization((allow) => [allow.group('ADMINS')])
    .handler(a.handler.function(getAuthUsers))
    .returns(a.json())
  
})
.authorization((allow) => [allow.resource(postConfirmation)]);

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
