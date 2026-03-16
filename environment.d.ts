declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TIMESLOT_TABLE_NAME_PROD: string,
      TIMESLOT_TABLE_NAME: string,
      TIMESLOT_TAG_TABLE_NAME_PROD: string,
      TIMESLOT_TAG_TABLE_NAME: string,
      PHOTOPATH_TABLE_NAME_PROD: string,
      PHOTOPATH_TABLE_NAME: string,
      TAGS_TABLE_NAME_PROD: string,
      TAGS_TABLE_NAME: string,
      PARTICIPANT_TABLE_NAME_PROD: string,
      PARTICIPANT_TABLE_NAME: string,
      S3BUCKET_PROD: string,
      S3BUCKET: string,
      PAYPAL_MERCHANT_ID: string,
      PAYPAL_SANDBOX_MERCHANT_ID: string,
      PAYPAL_SANDBOX_SECRET_KEY: string,
      PAYPAL_SANDBOX_CLIENT_ID: string,
      PAYPAL_SECRET_KEY: string,
      PAYPAL_CLIENT_ID: string,
    }
  }
}

// This line is necessary to make the file a module
export {};