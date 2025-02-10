import { Schema } from "../../data/resource";
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import JSZip from 'jszip';

const client = new S3Client();

export const handler: Schema['DownloadImages']['functionHandler'] = async (event) => {
  if(!event.arguments.paths || event.arguments.paths.length < 0) return null
  const bucketName = process.env.BUCKET_NAME
  if(!bucketName) return null

  const zip = new JSZip()

  for(const path in event.arguments.paths){
    const file = await client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: path
    }))
    if(file.Body){
      zip.file(path.substring(path.indexOf('_') + 1), await file.Body.transformToString())
    }
  }

  const zipContent = zip.generateAsync({ type: 'nodebuffer' })
  
  return (await zipContent).toString('base64')
}