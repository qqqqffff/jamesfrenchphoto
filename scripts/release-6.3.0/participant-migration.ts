import { DynamoDBClient, ScanCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { env } from 'node:process'
import 'dotenv/config'

const client = new DynamoDBClient({ region: 'us-east-1' })
const PARTICIPANT_TABLE = env.PARTICIPANT_TABLE_NAME_PROD;

async function migrate() {
  let lastEvaluatedKey = undefined

  let response = await client.send(new ScanCommand({
    TableName: PARTICIPANT_TABLE,
    ExclusiveStartKey: lastEvaluatedKey,
  }))
  console.log(`scan response (0):\n${JSON.stringify(response, null, 2)}`)
  const scannedItems = response.Items ?? []

  let order = 0
  while(response.LastEvaluatedKey) {
    order++
    response = await client.send(new ScanCommand({
      TableName: PARTICIPANT_TABLE,
      ExclusiveStartKey: response.LastEvaluatedKey
    }))
    console.log(`scan response (${order}):\n${JSON.stringify(response, null, 2)}`)
    scannedItems.push(...(response.Items ?? []))
  }

  for(const participant of scannedItems) {
    if(
      participant.flag?.S !== undefined||
      participant.id?.S === undefined
    ) continue

    const response = await client.send(new UpdateItemCommand({
      TableName: PARTICIPANT_TABLE,
      Key: { id: { S: participant.id.S } },
      UpdateExpression: `SET flag = :flag`,
      ExpressionAttributeValues: {
        ':flag': { S: 'true' }
      }
    }))

    console.log(`update response\n${JSON.stringify(response, null, 2)}`)
  }
}

migrate().catch(console.error)