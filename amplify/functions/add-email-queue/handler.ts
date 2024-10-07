import { SQSClient, SendMessageCommandInput, SendMessageCommand, GetQueueUrlCommand } from '@aws-sdk/client-sqs'
import { Schema } from "../../data/resource";
import { v4 } from 'uuid'
import { stackConstants } from '../../constants';
import { EmailType } from '../../custom/types';

const sqsClient = new SQSClient()

export const handler: Schema['AddEmailQueue']['functionHandler'] = async (event) => {
    let { email } = event.arguments

    if(!email) {
        return JSON.stringify('no email - failed')
    }

    const uid = v4()

    const urlResponse = (await sqsClient.send(new GetQueueUrlCommand({
        QueueName: stackConstants.emailQueueName
    })))

    if(!urlResponse.QueueUrl){
        return JSON.stringify(['No url found', urlResponse])
    }
    const sendEmailMessage: SendMessageCommandInput = {
        QueueUrl: urlResponse.QueueUrl,
        MessageBody: `${v4()}-send-email-message`,
        MessageAttributes: {
            'email': {
                DataType: 'String',
                StringValue: email
            },
            'uid':  {
                DataType: 'String',
                StringValue: uid
            },
            'expires': {
                DataType: 'String',
                StringValue: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).getTime().toString()
            },
            'emailType': {
                DataType: 'String',
                StringValue: String(EmailType.CreateUserEmail)
            }
        }
    }
    const queueMessageResponse = await sqsClient.send(new SendMessageCommand(sendEmailMessage))
    
    return JSON.stringify([queueMessageResponse])
}