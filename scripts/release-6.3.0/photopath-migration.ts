import { DynamoDBClient, ScanCommand, UpdateItem$, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { env } from 'node:process'
import sizeOf from 'image-size'

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' })
const s3Client = new S3Client({ region: 'us-east-1' })
const PHOTOPATH_TABLE = env.PHOTOPATH_TABLE_NAME
const BUCKET = env.S3BUCKET

async function migrate() {
  let lastEvaluatedKey = undefined

  let response = await dynamoClient.send(new ScanCommand({
    TableName: PHOTOPATH_TABLE,
    ExclusiveStartKey: lastEvaluatedKey,
  }))
  console.log(response.ConsumedCapacity)
  const scannedItems = response.Items ?? []

  while(response.LastEvaluatedKey) {
    response = await dynamoClient.send(new ScanCommand({ 
      TableName: PHOTOPATH_TABLE,
      ExclusiveStartKey: response.LastEvaluatedKey,
    }))
    console.log(response.ConsumedCapacity)
    scannedItems.push(...(response.Items ?? []))
  }

  for(const photoPath of scannedItems) {
    if(
      !photoPath.id?.S || 
      !photoPath.path.S ||
      (photoPath.width.N !== undefined && photoPath.height.N !== undefined)
    ) continue

    const s3Response = await s3Client.send(new GetObjectCommand({
      Bucket: BUCKET,
      Key: photoPath.path.S
    }))
    console.log(s3Response)

    if(!s3Response.Body) continue

    const dimensions = sizeOf(await s3Response.Body.transformToByteArray())

    console.log(dimensions)

    const updateResponse = await dynamoClient.send(new UpdateItemCommand({
      TableName: PHOTOPATH_TABLE,
      Key: { id: { S: photoPath.id.S } },
      UpdateExpression: `SET width = :w, height = :h`,
      ExpressionAttributeValues: {
        ':w': { N: String(dimensions.width) },
        ':h': { N: String(dimensions.height) }
      }
    }))

    console.log(updateResponse)
  }
}

migrate().catch(console.error)