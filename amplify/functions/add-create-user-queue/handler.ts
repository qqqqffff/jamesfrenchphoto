import { SQSClient, SendMessageCommandInput, SendMessageCommand, GetQueueUrlCommand } from '@aws-sdk/client-sqs'
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { Schema } from "../../data/resource";
import { v4 } from 'uuid'
import { stackConstants } from '../../constants';
import { EmailType } from '../../custom/email/types';

const sqsClient = new SQSClient()
const dynamoClient = new DynamoDBClient()

export const handler: Schema['AddCreateUserQueue']['functionHandler'] = async (event) => {
    let { email, sittingNumber } = event.arguments

    if(!email) {
        return JSON.stringify('no email - failed')
    }

    // const uid = String(sittingNumber)
    // const expires = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).getTime().toString()

    // const dynamoResponse = await dynamoClient.send(new PutItemCommand({
    //     TableName: stackConstants.tempTokensDbName,
    //     Item: {
    //         'email': { S: email },
    //         'uid': { S: uid },
    //         'expires': { S: expires },
    //     }
    // }))

    // const urlResponse = (await sqsClient.send(new GetQueueUrlCommand({
    //     QueueName: stackConstants.emailQueueName
    // })))

    // if(!urlResponse.QueueUrl){
    //     return JSON.stringify(['No url found', urlResponse])
    // }
    // const sendEmailMessage: SendMessageCommandInput = {
    //     QueueUrl: urlResponse.QueueUrl,
    //     MessageBody: `${v4()}-send-email-message`,
    //     MessageAttributes: {
    //         'email': {
    //             DataType: 'String',
    //             StringValue: email
    //         },
    //         'uid':  {
    //             DataType: 'String',
    //             StringValue: uid
    //         },
    //         'expires': {
    //             DataType: 'String',
    //             StringValue: expires
    //         },
    //         'emailType': {
    //             DataType: 'String',
    //             StringValue: String(EmailType.CreateUserEmail)
    //         }
    //     }
    // }
    // const queueMessageResponse = await sqsClient.send(new SendMessageCommand(sendEmailMessage))
    
    // return JSON.stringify([queueMessageResponse, dynamoResponse])
    return JSON.stringify([])
}