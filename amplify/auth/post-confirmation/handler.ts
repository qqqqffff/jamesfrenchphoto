import type { PostConfirmationTriggerHandler } from "aws-lambda";
import { 
    CognitoIdentityProviderClient,
    AdminAddUserToGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import { env } from '$amplify/env/post-confirmation'

const client = new CognitoIdentityProviderClient();

export const handler: PostConfirmationTriggerHandler = async (event) => {
    //TODO: add logic to change depending
    const admin = event.request.userAttributes['email'] == process.env.ADMIN_ACCOUNT
    const group = admin ? env.ADMIN_GROUP_NAME : env.GROUP_NAME
    const command = new AdminAddUserToGroupCommand({
        GroupName: group,
        Username: event.userName,
        UserPoolId: event.userPoolId,
    })
    const response = await client.send(command)
    console.log('processed', response.$metadata)
    return event;
}