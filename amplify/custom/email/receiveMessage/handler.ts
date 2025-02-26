import { SQSEvent } from "aws-lambda";
import { EmailType, IEmail } from "../types";
import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn'

const client = new SFNClient()

export const handler = async (event: SQSEvent): Promise<String> => {
    const records = event.Records

    if(records.length <= 0 || !records[0].messageAttributes){
        throw new Error(JSON.stringify(['Failed to receive a message', event.Records]))
    }

    let attributes: Record<string, string> = Object.fromEntries(Object.entries(records[0].messageAttributes).map(([key, value]) => ([key, value.stringValue ?? ''])))
    let email = attributes['email']
    let emailType: EmailType = EmailType.InvalidType
    switch(attributes['emailType']){
        case '0':
            emailType = EmailType.CreateUserEmail
            break
        default:
            break
    }

    if(!email || emailType == EmailType.InvalidType) throw new Error(JSON.stringify(['Event bridge error or invalid message', attributes, email, emailType]))

    const response = await client.send(new StartExecutionCommand({
        stateMachineArn: process.env.STATEMACHINE_ARN,
        input: JSON.stringify({ 
                address: email,
                attributes: attributes,
                emailType: emailType
            }
        )
    }))

    return JSON.stringify(response)
}