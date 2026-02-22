import { DynamoDBClient, GetItemCommand, QueryCommand, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { env } from 'node:process'
import { DateTime } from 'luxon'
import 'dotenv/config'

const client = new DynamoDBClient({ region: 'us-east-1' });
const TIMESLOT_TABLE = env.TIMESLOT_TABLE_NAME_PROD;
const TIMESLOT_TAG_TABLE = env.TIMESLOT_TAG_TABLE_NAME_PROD;

async function migrate() {
  let lastEvaluatedKey = undefined;

  let response = await client.send(new ScanCommand({
    TableName: TIMESLOT_TABLE,
    ExclusiveStartKey: lastEvaluatedKey,
  }));
  console.log(`scan response (0):\n${JSON.stringify(response, null, 2)}`)
  const scannedItems = response.Items ?? []

  let order = 0
  while(response.LastEvaluatedKey) {
    order++
    response = await client.send(new ScanCommand({
      TableName: TIMESLOT_TABLE,
      ExclusiveStartKey: response.LastEvaluatedKey
    }))
    console.log(`scan response (${order}):\n${JSON.stringify(response, null, 2)}`)
    scannedItems.push(...(response.Items ?? []))
  }

  for (const timeslot of scannedItems) {
    if (
      !timeslot.start?.S || 
      !timeslot.id?.S
      // (timeslot.startDate !== undefined && timeslot.startMonth !== undefined)
    ) continue;

    const dateTimeObject = DateTime.fromISO(timeslot.start.S).setZone('America/Chicago'); //eg "03-01-2025"
    const startDate = dateTimeObject.toFormat('MM-dd-yyyy')
    const startMonth = dateTimeObject.toFormat('MM-yyyy')

    const taggingResponse = await client.send(new QueryCommand({
      TableName: TIMESLOT_TAG_TABLE,
      IndexName: 'timeslotTagsByTimeslotId',
      KeyConditionExpression: 'timeslotId = :tId',
      ExpressionAttributeValues: {
        ":tId": { S: timeslot.id.S }
      }
    }))
    console.log(`tagging response:\n${JSON.stringify(taggingResponse, null, 2)}`)

    const tagId = (taggingResponse.Items ?? []).find((item) => item.timeslotId.S === timeslot.id.S)?.tagId?.S

    const response = await client.send(new UpdateItemCommand({
      TableName: TIMESLOT_TABLE,
      Key: { id: { S: timeslot.id.S } },
      UpdateExpression: `SET startMonth = :sm, startDate = :sd${tagId ? ', tagId = :tId' : ''}`,
      ExpressionAttributeValues: tagId ? { 
        ':sm': { S: startMonth },
        ':sd': { S: startDate },
        ':tId': { S: tagId }
      } : {
        ':sm': { S: startMonth },
        ':sd': { S: startDate },
      },
    }));

    console.log(`update response\n${JSON.stringify(response, null, 2)}`)
  }
}

migrate().catch(console.error);