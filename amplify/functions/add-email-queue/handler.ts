import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import { SQSClient, SendMessageCommandInput, SendMessageCommand, GetQueueUrlCommand } from '@aws-sdk/client-sqs'
import { Schema } from "../../data/resource";
import { v4 } from 'uuid'

const dynamoClient = new DynamoDBClient()
const sqsClient = new SQSClient()

export const handler: Schema['AddEmailQueue']['functionHandler'] = async (event) => {
    let { email } = event.arguments

    if(!email) {
        return JSON.stringify('no email - failed')
    }

    const uid = v4()

    const putUUIDCommand = new PutItemCommand({
        TableName: 'TemporaryCreateUsersTokens-syymw3momfhyfcpmjctmbhhsie-NONE',
        Item: {
            'id': { S: uid },
            'email': { S: email },
            'expires': { S: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toString() }
        }
    })

    const responseUUID = await dynamoClient.send(putUUIDCommand)

    const sendEmailMessage: SendMessageCommandInput = {
        QueueUrl: (await sqsClient.send(new GetQueueUrlCommand({
            QueueName: 'EmailQueue'
        }))).QueueUrl,
        MessageBody: `${v4()}-send-email-message`,
        MessageAttributes: {
            'email': {
                DataType: 'String',
                StringValue: email
            },
            'uid':  {
                DataType: 'String',
                StringValue: uid
            }
        }
    }
    const queueMessageResponse = await sqsClient.send(new SendMessageCommand(sendEmailMessage))
    
    return JSON.stringify([responseUUID, queueMessageResponse])
}