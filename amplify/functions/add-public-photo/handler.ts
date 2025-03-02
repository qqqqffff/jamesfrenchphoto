import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Schema } from "../../data/resource";

const client = new S3Client()

export const handler: Schema['AddPublicPhoto']['functionHandler'] = async (event) => {
  if(!event.arguments.path || !event.arguments.type) return 'Type and Path are Required'
  const privateBucket = process.env.PRIVATE_BUCKET_NAME
  if(!privateBucket) return 'Private Bucket Name Required'
  const publicBucket = process.env.PUBLIC_BUCKET_NAME
  if(!publicBucket) return 'Public Bucket Name Required'

  const file = await client.send(new GetObjectCommand({
    Bucket: privateBucket,
    Key: event.arguments.path,
  }))
  if(file.Body) {
    const key = `${event.arguments.type}/${event.arguments.path.substring(event.arguments.path.lastIndexOf('/') + 1)}`

    const upload = await client.send(new PutObjectCommand({
      Bucket: publicBucket,
      Key: key,
      Body: await file.Body.transformToByteArray()
    }))

    return key
  }
  else {
    return 'Failed to find file in private bucket'
  }
}