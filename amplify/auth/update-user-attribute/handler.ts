import { CognitoIdentityProviderClient, UpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider"
import { Schema } from "../../data/resource"

type Handler = Schema['UpdateUserPhoneNumber']['functionHandler']
const client = new CognitoIdentityProviderClient()

export const handler: Handler = async (event) => {
    const command = new UpdateUserAttributesCommand({
        UserAttributes: [
            {
                Name: 'phone_number',
                Value: event.arguments.phoneNumber,
            },
        ],
        AccessToken: event.arguments.accessToken
    })
    const response = await client.send(command)
    return response
}