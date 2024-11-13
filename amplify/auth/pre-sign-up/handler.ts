import { AdminConfirmSignUpCommand, AdminCreateUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { PreSignUpTriggerHandler } from 'aws-lambda'

const client = new CognitoIdentityProviderClient();

export const handler: PreSignUpTriggerHandler = async (event) => {
    event.response.autoConfirmUser = true
    event.response.autoVerifyEmail = true

    console.log(`processed: `, event)
    return event
}