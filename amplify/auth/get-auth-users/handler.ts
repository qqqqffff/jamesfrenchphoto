import type { Schema } from "../../data/resource";
import { env } from '$amplify/env/get-auth-users'
import { CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";

type Handler = Schema['GetAuthUsers']['functionHandler']
const client = new CognitoIdentityProviderClient()

export const handler: Handler = async (event) => {
    const command = new ListUsersCommand({
        UserPoolId: env.AMPLIFY_AUTH_USERPOOL_ID,
    })
    let response = await client.send(command)

    let aggregatedResponse = [response]
    while(response.PaginationToken){
        const paginatedCommand = new ListUsersCommand({
            UserPoolId: env.AMPLIFY_AUTH_USERPOOL_ID,
            PaginationToken: response.PaginationToken
        })
        response = await client.send(paginatedCommand)

        aggregatedResponse.push(response)
    }

    return aggregatedResponse
}