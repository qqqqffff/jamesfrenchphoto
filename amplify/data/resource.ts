import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { postConfirmation } from '../auth/post-confirmation/resource';
import { getAuthUsers } from '../auth/get-auth-users/resource';
import { addCreateUserQueue } from '../functions/add-create-user-queue/resource';
import { verifyContactChallenge } from '../functions/verify-contact-challenge/resource';
import { sendTimeslotConfirmation } from '../functions/timeslots/send-timeslot-confirmation/resource';
import { updateUserAttribute } from '../auth/update-user-attribute/resource';
import { downloadImages } from '../functions/collections/download-images/resource';
import { shareCollection } from '../functions/collections/share-collection/resource';
import { addPublicPhoto } from '../functions/collections/add-public-photo/resource';
import { deletePublicPhoto } from '../functions/collections/delete-public-photo/resource';
import { shareUserInvite } from '../functions/collections/share-user-invite/resource';
import { repairPaths } from '../functions/collections/repair-paths/resource';
import { registerUser } from '../functions/users/register-user/resource';
import { adminUpdateUserAttributes } from '../auth/admin-update-user-attributes/resource';
import { registerTimeslot } from '../functions/timeslots/register-timeslot/resource';
import { notifyUser } from '../functions/users/notify-user/resource';
import { chargeNoShowFee } from '../functions/timeslots/charge-no-show-fee/resource';
import { createShortNoticeCancelationOrder } from '../functions/timeslots/create-short-notice-cancelation-order/resource';
import { savePaymentInformation } from '../functions/users/save-payment-information/resource';
import { confirmSavePaymentInformation } from '../functions/users/confirm-save-payment-information/resource';
import { authorizeShortNoticeCancelationFee } from '../functions/timeslots/authorize-short-notice-cancelation-fee/resource';

/*== STEP 1 ===============================================================
The section below creates a Todo database table with a "content" field. Try
adding a new "isDone" field as a boolean. The authorization rule below
specifies that any unauthenticated user can "create", "read", "update", 
and "delete" any "Todo" records.
=========================================================================*/

//TODO: break me out into different schemas, and join together to decrease complexity
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
      packageItem: a.hasOne('PackageItemCollection', 'collectionId'),
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
    .authorization((allow) => [
      allow.group('ADMINS'), 
      allow.authenticated('userPools').to(['get', 'list']), 
      allow.guest().to(['get', 'list'])]
    ),
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
      favorites: a.hasMany('UserFavorites', 'pathId'),
      width: a.integer().required(),
      height: a.integer().required()
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [
      index('setId').sortKeys(['order']),
    ])
    .authorization((allow) => [
      allow.group('ADMINS'), 
      allow.authenticated('userPools').to(['get', 'list']), 
      allow.guest().to(['get', 'list'])
    ]),
  UserFavorites: a
    .model({
      id: a.id().required(),
      collectionId: a.id().required(),
      setId: a.id().required(),
      pathId: a.id().required(),
      path: a.belongsTo('PhotoPaths', 'pathId'),
      participantId: a.id().required(),
      participant: a.belongsTo('Participant', 'participantId'),
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [
      index('participantId').sortKeys(['setId']),
      index('participantId').sortKeys(['collectionId']),
      index('collectionId')
    ])
    .authorization((allow) => [
      allow.group('ADMINS'), 
      allow.authenticated('userPools').to(['get', 'delete', 'create', 'list']), 
      allow.guest().to(['get', 'delete', 'create', 'list'])
    ]),
  UserTag: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      color: a.string(),
      createdAt: a.datetime().required(),
      flag: a.string().default('true').required(),
      collectionTags: a.hasMany('CollectionTag', 'tagId'),
      timeslotTags: a.hasMany('TimeslotTag', 'tagId'),
      packages: a.hasOne('Package', 'tagId'),
      notifications: a.hasMany('NotificationUserTags', 'tagId'),
      participants: a.hasMany('ParticipantUserTag', 'tagId'),
      childTags: a.hasMany('PackageParentTag', 'tagId'),

    })
    .identifier(['id'])
    .secondaryIndexes((index) => [index('flag').sortKeys(['createdAt'])])
    .authorization((allow) => [
      allow.group('ADMINS'), 
      allow.authenticated('userPools').to(['get', 'list']), 
      allow.guest().to(['get', 'list'])
    ]),
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
    .secondaryIndexes((index) => [index('tagId'), index('timeslotId')])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated('userPools').to(['get', 'list'])]),
  Package: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      description: a.string(),
      items: a.hasMany('PackageItem', 'packageId'),
      tagId: a.id().required(),
      tag: a.belongsTo('UserTag', 'tagId'),
      packageParentTag: a.hasOne('PackageParentTag', 'packageId'),
      pdfPath: a.string(),
      createdAt: a.datetime().required(),
      flag: a.string().default('true'),
      advertise: a.boolean().default(true).required(),
      price: a.string(),
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [index('tagId'), index('flag').sortKeys(['createdAt'])])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated('userPools').to(['get', 'list'])]),
  PackageParentTag: a
    .model({
      id: a.id().required(),
      packageId: a.id().required(),
      package: a.belongsTo('Package', 'packageId'),
      tagId: a.id().required(),
      tag: a.belongsTo('UserTag', 'tagId')
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [index('packageId'), index('tagId')])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated('userPools').to(['get', 'list'])]),
  PackageItem: a
    .model({
      id: a.id().required(),
      name: a.string().required(),
      description: a.string(),
      //grouped for default
      quantity: a.integer(),
      packageId: a.id().required(),
      package: a.belongsTo('Package', 'packageId'),
      //grouped for selectable
      max: a.integer(),
      hardCap: a.integer(),
      price: a.string(),
      order: a.integer().required(),
      unique: a.boolean(),
      aLaCarte: a.boolean(),
      itemCollections: a.hasMany('PackageItemCollection', 'packageItemId'),
      //grouped for tiered
      statements: a.string().array(),
      //grouped for dependent
      dependent: a.string(),
      display: a.boolean().default(true),
      flag: a.string().default('true'),
      createdAt: a.datetime().required(),
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [index('packageId'), index('flag').sortKeys(['createdAt'])])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated('userPools').to(['get', 'list'])]),
  PackageItemCollection: a
    .model({
      id: a.id().required(),
      collectionId: a.id().required(),
      collection: a.belongsTo('PhotoCollection', 'collectionId'),
      packageItemId: a.id().required(),
      packageItem: a.belongsTo('PackageItem', 'packageItemId'),
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [index('collectionId'), index('packageItemId')])
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
      order: a.integer().required(),
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
      type: a.enum(['value', 'date', 'choice', 'tag', 'file', 'notification']),
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
      description: a.string(),
      register: a.string(),
      startDate: a.string().required(), //of form 'MM-dd-yyyy'
      startMonth: a.string().required(), //of form 'MM-yyyy'
      noshowFee: a.float(),
      cancelationFee: a.customType({
        amount: a.float().required(),
        window: a.string().required() // of form Duration (ISO string) until start
      }),
      start: a.datetime().required(), 
      end: a.datetime().required(),
      tagId: a.string(),
      timeslotTag: a.hasOne('TimeslotTag', 'timeslotId'),
      participant: a.belongsTo('Participant', 'participantId'),
      participantId: a.id().authorization((allow) => [allow.group('ADMINS'), allow.authenticated('userPools').to(['read'])]), 
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [
      index('participantId'), 
      index('startDate'), 
      index('startMonth')
    ])
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated('userPools').to(['get', 'list'])]),
  UserProfile: a
    .model({
      sittingNumber: a.integer(),
      email: a.string().required(),
      preferredContact: a.enum(['EMAIL', 'PHONE']),
      participant: a.hasMany('Participant', 'userEmail'),
      activeParticipant: a.id(),
      temporaryCreate: a.hasOne('TemporaryCreateUsersTokens', 'userEmail'),
      customerProfile: a.hasOne('CustomerProfile', 'userEmail'),
      firstName: a.string(),
      lastName: a.string(),
    })
    .identifier(['email'])
    .authorization((allow) => [
      allow.group('ADMINS'), 
      allow.ownerDefinedIn('email').identityClaim('email').to(['read', 'update', 'delete']), 
      allow.guest().to(['get'])
    ]),
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
      favorites: a.hasMany('UserFavorites', 'participantId'),
      flag: a.string().default('true'),
      createdAt: a.datetime().required(),
    })
    .identifier(['id'])
    .secondaryIndexes((index) => [
      index('userEmail'),
      index('flag').sortKeys(['createdAt'])
    ])
    .authorization((allow) => [
      allow.group('ADMINS'), 
      allow.ownerDefinedIn('userEmail').identityClaim('email').to(['get', 'update', 'list']),
      allow.guest().to(['get', 'list'])
    ]),
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
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated().to(['get', 'list']), allow.guest().to(['list', 'get'])]),
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
  CustomerProfile: a.
    model({
      userEmail: a.string().required(),
      userId: a.string().required(), //Cognito userid -> used for customer profile id generation
      paypalCustomerId: a.id().required(),
      savedPaymentMethods: a.hasMany('SavedPaymentMethod', 'paypalCustomerId'),
      orders: a.hasMany('Orders', 'paypalCustomerId'),
      userProfile: a.belongsTo('UserProfile', 'userEmail')
    })
    .identifier(['userEmail'])
    .authorization((allow) => [
      allow.group('ADMINS'),
      allow.ownerDefinedIn('userEmail').identityClaim('email').to(['get'])
    ]),
  SavedPaymentMethod: a.
    model({
      paymentMethodId: a.id().required(),
      paypalCustomerId: a.id().required(),
      customerProfile: a.belongsTo('CustomerProfile', 'paypalCustomerId'),
      paypalVaultId: a.string().required(),
      type: a.enum(['PAYPAL', 'CARD', 'APPLEPAY']),
      isDefault: a.boolean().default(false),
      lastDigits: a.integer(),
      brand: a.string(),
      expireMonth: a.integer(),
      expireYear: a.integer(),
      userEmail: a.string().required().authorization((allow) => [
        allow.group('ADMINS'),
        allow.ownerDefinedIn('userEmail').identityClaim('email').to(['read', 'delete'])
      ])
    })
    .identifier(['paymentMethodId'])
    .secondaryIndexes((index) => [
      index('paypalCustomerId')
    ])
    .authorization((allow) => [
      allow.group('ADMINS'),
      allow.ownerDefinedIn('userEmail').identityClaim('email').to(['get', 'list', 'update', 'delete'])
    ]),
  Orders: a.
    model({
      paypalOrderId: a.string().required(),
      paypalCustomerId: a.id(), // only used if customer uses a saved payment method
      customerProfile: a.belongsTo('CustomerProfile', 'paypalCustomerId'),
      amount: a.float().required(),
      serviceFee: a.float().required(),
      currency: a.string().default('USD').required(),
      status: a.enum(['CREATED', 'SAVED', 'APPROVED', 'VOIDED', 'COMPLETED', 'PAYER_ACTION_REQUIRED']),
      transactionType: a.enum(['timeslot']),
      items: a.json().required(), //format -> array of OrderItems,
      userEmail: a.string().required()
    })
    .identifier(['paypalOrderId'])
    .secondaryIndexes((index) => [
      index('userEmail').sortKeys(['transactionType'])
    ])
    .authorization((allow) => [
      allow.group('ADMINS'),
      allow.ownerDefinedIn('userEmail').identityClaim('email').to(['get', 'list'])
    ]),
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
    .arguments({
      paginationToken: a.string(),
    })
    .authorization((allow) => [allow.group('ADMINS')])
    .handler(a.handler.function(getAuthUsers))
    .returns(a.json()),
  UpdateUserPhoneNumber: a
    .mutation()
    .arguments({
      phoneNumber: a.string().required(),
      accessToken: a.string().required(),
    })
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(updateUserAttribute))
    .returns(a.json()),
  AdminUpdateUserAttributes: a
    .mutation()
    .arguments({
      userId: a.string().required(),
      last: a.string().required(),
      first: a.string().required(),
      phone: a.string(),
    })
    .authorization((allow) => [allow.group('ADMINS')])
    .handler(a.handler.function(adminUpdateUserAttributes))
    .returns(a.json()),
  RegisterTimeslot: a
    .mutation()
    .arguments({
      timeslotId: a.string().required(),
      unregister: a.boolean().required(),
      userEmail: a.string().required(),
      participantId: a.string().required(),
    })
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(registerTimeslot))
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
  RegisterUser: a
    .mutation()
    .arguments({
      userProfile: a.string().required(), //json object with the user profile
      token: a.string(),
    })
    .authorization((allow) => [allow.group('ADMINS'), allow.guest()])
    .handler(a.handler.function(registerUser))
    .returns(a.string()),
    // TODO: add a consumed field for more verbose error handling
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
  SendTimeslotConfirmation: a
    .query()
    .arguments({
      email: a.string().required(),
      start: a.datetime().required(),
      end: a.datetime().required(),
      participantId: a.string().required(),
      tagId: a.string(),
      additionalRecipients: a.string().array(),
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
    .authorization((allow) => [allow.group('ADMINS')])
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
    .returns(a.json()),
  DeletePublicPhoto: a
    .query()
    .arguments({
      path: a.string().required(),
    })
    .handler(a.handler.function(deletePublicPhoto))
    .authorization((allow) => [allow.group('ADMINS')])
    .returns(a.json()),
  NotifyUser: a
    .query()
    .arguments({
      email: a.string().required(),
      subject: a.string().required().default('Notification from James French Photography'),
      content: a.string().required(),
      additionalRecipients: a.string().required().array(),
    })
    .handler(a.handler.function(notifyUser))
    .authorization((allow) => [allow.group('ADMINS')])
    .returns(a.json()),
  ChargeNoShowFee: a
    .mutation()
    .arguments({
      timeslotId: a.string().required(),
      userEmail: a.string().required(),
    })
    .handler(a.handler.function(chargeNoShowFee))
    .authorization((allow) => [allow.group('ADMINS')])
    .returns(a.json()),
  CreateShortNoticeCancelationOrder: a
    .mutation()
    .arguments({
      timeslotId: a.string().required(),
      userEmail: a.string().required(),
    })
    .handler(a.handler.function(createShortNoticeCancelationOrder))
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated()])
    .returns(a.json()),
  AuthorizeShortNoticeCancelationOrder: a
    .mutation()
    .arguments({
      timeslotId: a.string().required(),
      userEmail: a.string().required(),
      userId: a.string().required(),
    })
    .handler(a.handler.function(authorizeShortNoticeCancelationFee))
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated()])
    .returns(a.json()),
  SavePaymentInformation: a
    .mutation()
    .arguments({
      userEmail: a.string().required(),
      userId: a.string().required(),
      vaultRequest: a.json().required()
    })
    .handler(a.handler.function(savePaymentInformation))
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated()])
    .returns(a.json()),
  ConfirmSavePaymentInformation: a
    .mutation()
    .arguments({
      userEmail: a.string().required(),
      setupToken: a.string().required(),
      requestDefault: a.boolean()
    })
    .handler(a.handler.function(confirmSavePaymentInformation))
    .authorization((allow) => [allow.group('ADMINS'), allow.authenticated()])
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
  allow.resource(repairPaths),
  allow.resource(registerUser),
  allow.resource(registerTimeslot),
  allow.resource(notifyUser),
  allow.resource(sendTimeslotConfirmation),
  allow.resource(chargeNoShowFee),
  allow.resource(createShortNoticeCancelationOrder),
  allow.resource(savePaymentInformation),
  allow.resource(confirmSavePaymentInformation),
  allow.resource(authorizeShortNoticeCancelationFee)
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
