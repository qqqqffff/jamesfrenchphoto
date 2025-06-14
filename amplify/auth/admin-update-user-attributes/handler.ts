import { AdminUpdateUserAttributesCommand, CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { Schema } from "../../data/resource";
import { env } from '$amplify/env/admin-update-user-attributes'

type Handler = Schema['AdminUpdateUserAttributes']['functionHandler']
const client = new CognitoIdentityProviderClient()

export const handler: Handler = async (event) => {
  const attributes = [
    {
      Name: 'family_name',
      Value: event.arguments.last,
    },
    {
      Name: 'given_name',
      Value: event.arguments.first
    }
  ]
  if(event.arguments.phone) {
    attributes.push({
      Name: 'phone_number',
      Value: event.arguments.phone
    })
  }
  const command = new AdminUpdateUserAttributesCommand({
    UserAttributes: attributes,
    Username: event.arguments.userId,
    UserPoolId: env.AMPLIFY_AUTH_USERPOOL_ID,
  })
  env

  const response = await client.send(command)
  return response
}