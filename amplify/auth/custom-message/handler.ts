import { CustomMessageTriggerHandler } from "aws-lambda";

export const handler: CustomMessageTriggerHandler = async (event) => {
    if(event.triggerSource == 'CustomMessage_ForgotPassword'){
        console.log('hello world')
        return event.response.emailSubject + ', ' + event.response.emailSubject
    }
}