declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TIMESLOT_TABLE_NAME: string,
      TIMESLOT_TAG_TABLE_NAME: string,
      PHOTOPATH_TABLE_NAME: string,
      S3BUCKET: string
    }
  }
}

// This line is necessary to make the file a module
export {};