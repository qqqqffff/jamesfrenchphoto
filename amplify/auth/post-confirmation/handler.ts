import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { 
    CognitoIdentityProviderClient,
    AdminAddUserToGroupCommand,
    GetUserCommand
} from '@aws-sdk/client-cognito-identity-provider'
import { env } from '$amplify/env/post-confirmation'

const client = new CognitoIdentityProviderClient();

const admins = [
    'aws.jfphoto@gmail.com',
]

export const handler: PostConfirmationTriggerHandler = async (event) => {
    //TODO: add logic to change depending
    const command = new AdminAddUserToGroupCommand({
        GroupName: admins.includes(event.request.userAttributes.email) ? env.GROUP_NAME : env.ADMIN_GROUP_NAME,
        Username: event.userName,
        UserPoolId: event.userPoolId,
    })
    const response = await client.send(command)
    console.log('processed', response.$metadata)
    return event;
}