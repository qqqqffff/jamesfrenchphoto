import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";

const sesClient = new SESClient()

export function sendEmail(message: string, subject: string, source: string, destination: string){
    const sendEmailCommand = new SendEmailCommand({
        Destination: {
            ToAddresses: [
                destination
            ]
        },
        Message: {
            Body: {
                Html: {
                    Charset: 'UTF-8',
                    Data: message
                }
            },
            Subject: {
                Charset: 'UTF-8',
                Data: subject
            }
        },
        Source: source
    })

    return sesClient.send(sendEmailCommand)
}