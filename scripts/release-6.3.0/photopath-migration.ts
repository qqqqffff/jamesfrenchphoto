import { DeleteItemCommand, DynamoDBClient, ScanCommand, UpdateItem$, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { GetObjectCommand, GetObjectCommandOutput, S3Client } from '@aws-sdk/client-s3'
import { env } from 'node:process'
import sizeOf from 'image-size'
import 'dotenv/config'

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' })
const s3Client = new S3Client({ region: 'us-east-1' })
const PHOTOPATH_TABLE = env.PHOTOPATH_TABLE_NAME_PROD
const BUCKET = env.S3BUCKET_PROD

async function migrate() {
  let lastEvaluatedKey = undefined

  let response = await dynamoClient.send(new ScanCommand({
    TableName: PHOTOPATH_TABLE,
    ExclusiveStartKey: lastEvaluatedKey,
  }))
  console.log(`scan response (0):\n${JSON.stringify(response, null, 2)}`)
  const scannedItems = response.Items ?? []

  let order = 0
  while(response.LastEvaluatedKey) {
    order++
    response = await dynamoClient.send(new ScanCommand({ 
      TableName: PHOTOPATH_TABLE,
      ExclusiveStartKey: response.LastEvaluatedKey,
    }))
    console.log(`scan response (${order}):\n${JSON.stringify(response, null, 2)}`)
    scannedItems.push(...(response.Items ?? []))
  }

  for(const photoPath of scannedItems) {
    if(
      !photoPath.id?.S || 
      !photoPath.path.S ||
      (photoPath.width !== undefined && photoPath.height !== undefined)
    ) continue

    let s3Response: GetObjectCommandOutput | undefined
    try {
      s3Response = await s3Client.send(new GetObjectCommand({
        Bucket: BUCKET,
        Key: photoPath.path.S
      }))
    } catch(error) {
      //non-existant key -> cleanup scanned item
      const deleteItemResponse = await dynamoClient.send(new DeleteItemCommand({
        TableName: PHOTOPATH_TABLE,
        Key: { id: { S: photoPath.id.S }}
      }))

      console.log(`delete response:\n${JSON.stringify(deleteItemResponse, null, 2)}`)
      continue
    }

    if(!s3Response) continue
    
    console.log(`s3response:\n${JSON.stringify(s3Response.$metadata, null, 2)}`)

    if(!s3Response.Body) continue

    const dimensions = sizeOf(await s3Response.Body.transformToByteArray())

    console.log(`picture dimensions:\n${JSON.stringify(dimensions, null, 2)}`)

    const updateResponse = await dynamoClient.send(new UpdateItemCommand({
      TableName: PHOTOPATH_TABLE,
      Key: { id: { S: photoPath.id.S } },
      UpdateExpression: `SET width = :w, height = :h`,
      ExpressionAttributeValues: {
        ':w': { N: String(dimensions.width) },
        ':h': { N: String(dimensions.height) }
      }
    }))

    console.log(`update response:\n${JSON.stringify(updateResponse, null, 2)}`)
  }
}

migrate().catch(console.error)