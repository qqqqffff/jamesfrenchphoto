import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Schema } from "../../data/resource";

const client = new S3Client()

export const handler: Schema['DeletePublicPhoto']['functionHandler'] = async (event) => {
  if(!event.arguments.path) return JSON.stringify('Path is required')
  const publicBucket = process.env.PUBLIC_BUCKET_NAME
  if(!publicBucket) return JSON.stringify('Public Bucket Name Required')

  const deleteObject = await client.send(new DeleteObjectCommand({
    Bucket: publicBucket,
    Key: event.arguments.path
  }))

  return JSON.stringify({ deleteResult: deleteObject })
}