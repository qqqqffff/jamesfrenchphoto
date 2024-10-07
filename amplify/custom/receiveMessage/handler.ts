import { Handler, SQSEvent } from "aws-lambda";
import { EmailType, IEmail } from "../types";

export const handler = async (event: SQSEvent): Promise<IEmail> => {
    const records = event.Records

    if(records.length <= 0 || !records[0].messageAttributes){
        throw new Error(JSON.stringify(['Failed to receive a message', event.Records]))
    }

    let attributes: Record<string, string> = Object.fromEntries(Object.entries(records[0].messageAttributes).map(([key, value]) => ([key, value.stringValue ?? ''])))
    let email = attributes['email']
    let emailType: EmailType | undefined
    switch(attributes['emailType']){
        case '0':
            emailType = EmailType.CreateUserEmail
            break
        default:
            break
    }

    if(!email || !emailType) throw new Error(JSON.stringify(['Event bridge error or invalid message', attributes]))
    return {
        address: email,
        // attributes: attributes,
        emailType: EmailType.CreateUserEmail
    } as IEmail
}