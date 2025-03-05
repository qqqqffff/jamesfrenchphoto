import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Schema } from "../../data/resource";
import { addTextToImage } from "./imageTextOverlay";

const client = new S3Client()

export const handler: Schema['AddPublicPhoto']['functionHandler'] = async (event) => {
  if(!event.arguments.path || !event.arguments.type || !event.arguments.name) return 'Type, Path and Name are Required'
  const privateBucket = process.env.PRIVATE_BUCKET_NAME
  if(!privateBucket) return 'Private Bucket Name Required'
  const publicBucket = process.env.PUBLIC_BUCKET_NAME
  if(!publicBucket) return 'Public Bucket Name Required'

  const file = await client.send(new GetObjectCommand({
    Bucket: privateBucket,
    Key: event.arguments.path,
  }))

  const trimmedFileName = event.arguments.path.substring(event.arguments.path.lastIndexOf('/') + 1)
  if(file.Body) {
    const key = `${event.arguments.type}/${trimmedFileName}`
    const s3file = new File([await file.Body.transformToByteArray()], trimmedFileName)

    const tempFile = await addTextToImage(s3file, event.arguments.name)

    if(tempFile){
      const upload = await client.send(new PutObjectCommand({
        Bucket: publicBucket,
        Key: key,
        Body: tempFile
      }))
    }

    return key
  }
  else {
    return 'Failed to find file in private bucket'
  }
}