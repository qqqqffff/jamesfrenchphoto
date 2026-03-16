import type { Schema } from "../../data/resource";
import { env } from '$amplify/env/get-auth-users'
import { CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";

type Handler = Schema['GetAuthUsers']['functionHandler']
const client = new CognitoIdentityProviderClient()

export const handler: Handler = async (event) => {
    const paginationToken = event.arguments.paginationToken ? event.arguments.paginationToken : undefined

    const command = new ListUsersCommand({
        UserPoolId: env.AMPLIFY_AUTH_USERPOOL_ID,
        PaginationToken: paginationToken,
    })
    let response = await client.send(command)


    return {
        response: response,
        paginationToken: response.PaginationToken
    }
}