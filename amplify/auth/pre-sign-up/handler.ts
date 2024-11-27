import type { PreSignUpTriggerHandler } from 'aws-lambda'

export const handler: PreSignUpTriggerHandler = async (event) => {
    event.response.autoConfirmUser = true
    event.response.autoVerifyEmail = true

    console.log(`processed: `, event)
    return event
}