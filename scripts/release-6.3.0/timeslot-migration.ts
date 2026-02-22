import { DynamoDBClient, GetItemCommand, ScanCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { env } from 'node:process'
import { DateTime } from 'luxon'

const client = new DynamoDBClient({ region: 'us-east-1' });
const TIMESLOT_TABLE = env.TIMESLOT_TABLE_NAME; // replace this
const TIMESLOT_TAG_TABLE = env.TIMESLOT_TAG_TABLE_NAME

async function migrate() {
  let lastEvaluatedKey = undefined;
  let updatedCount = 0;

  let response = await client.send(new ScanCommand({
    TableName: TIMESLOT_TABLE,
    ExclusiveStartKey: lastEvaluatedKey,
  }));
  console.log(response.ConsumedCapacity)
  const scannedItems = response.Items ?? []

  while(response.LastEvaluatedKey) {
    response = await client.send(new ScanCommand({
      TableName: TIMESLOT_TAG_TABLE,
      ExclusiveStartKey: response.LastEvaluatedKey
    }))
    console.log(response.ConsumedCapacity)
    scannedItems.push(...(response.Items ?? []))
  }

  for (const timeslot of response.Items ?? []) {
    if (!timeslot.start?.S || !timeslot.id?.S || (timeslot.startDate.S && timeslot.startMonth)) continue;

    const dateTimeObject = DateTime.fromISO(timeslot.start.S).setZone('America/Chicago'); //eg "03-01-2025"
    const startDate = dateTimeObject.toFormat('MM-dd-yyyy')
    const startMonth = dateTimeObject.toFormat('MM-yyyy')

    const taggingResponse = await client.send(new GetItemCommand({
      TableName: TIMESLOT_TAG_TABLE,
      Key: {
        timeslotId: { S: timeslot.id.S }
      }
    }))

    const tagId = taggingResponse.Item?.tagId?.S

    const response = await client.send(new UpdateItemCommand({
      TableName: TIMESLOT_TABLE,
      Key: { id: { S: timeslot.id.S } },
      UpdateExpression: `'SET startMonth = :sm, startDate = :sd${tagId ? ', tagId = :tId' : ''}`,
      ExpressionAttributeValues: tagId ? { 
        ':sm': { S: startMonth },
        ':sd': { S: startDate },
        ':tId': { S: tagId }
      } : {
        ':sm': { S: startMonth },
        ':sd': { S: startDate },
      },
    }));

    console.log(response)
  }

  console.log(`Migration complete. Updated ${updatedCount} records.`);
}

migrate().catch(console.error);