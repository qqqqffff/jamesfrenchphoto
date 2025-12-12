
import { CognitoIdentityProviderClient, ListUsersCommand, UserType } from '@aws-sdk/client-cognito-identity-provider';
import sgMail from '@sendgrid/mail';
import type { CustomMessageTriggerEvent, CustomMessageTriggerHandler } from 'aws-lambda';
import {
  KmsKeyringNode,
  buildClient,
  CommitmentPolicy,
} from '@aws-crypto/client-node'
import { env } from '$amplify/env/custom-message'


// Initialize clients
const cognitoClient = new CognitoIdentityProviderClient();

const { decrypt } = buildClient(CommitmentPolicy.REQUIRE_ENCRYPT_REQUIRE_DECRYPT)
const keyIds = [env.KEY_ARN]
const keyring = new KmsKeyringNode({ keyIds })

sgMail.setApiKey(env.SENDGRID_API_KEY);

const FROM_EMAIL = 'no-reply@jamesfrenchphotography.com'; // Change this to your verified SendGrid email


async function decryptCode(encryptedCode: string): Promise<string> {
    try {
        const { plaintext, messageHeader } = await decrypt(keyring, Buffer.from(encryptedCode))
        console.log(plaintext, messageHeader)
        return plaintext.toString('utf-8')
    } catch (error) {
        console.error('Error decrypting code:', error);
        console.error('Encrypted code format:', encryptedCode);
        throw error;
    }
}

/**
 * Verify that a user with the given email exists in the user pool
 */
async function userExistsWithEmail(userPoolId: string, email: string): Promise<UserType | null> {
  try {   
    let response = await cognitoClient.send(new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${email}"`,
      Limit: 1,
    }));

    let usersResponse: UserType[] = response.Users ?? []

    while(response.PaginationToken && usersResponse.length === 0) {
        response = await cognitoClient.send(new ListUsersCommand({
            UserPoolId: userPoolId,
            Filter: `email = "${email}"`,
            Limit: 1,
            PaginationToken: response.PaginationToken
        }))
        usersResponse.push(...(response.Users ?? []))
    }

    return usersResponse.length === 1 ? usersResponse[0] : null;
  } catch (error) {
    console.error('Error checking if user exists:', error);
    // In case of error, return true to not block the flow
    // Cognito will handle invalid requests appropriately
    return null;
  }
}

export const handler: CustomMessageTriggerHandler = async (event: CustomMessageTriggerEvent) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    if(event.triggerSource == 'CustomMessage_ForgotPassword'){
        event.response.emailSubject = null;
        event.response.emailMessage = null;
        event.response.smsMessage = null;

        try {
            const { codeParameter } = event.request;
            const { email } = event.request.userAttributes;
            const userPoolId = event.userPoolId;

            // Verify user exists with this email before sending
            const user = await userExistsWithEmail(userPoolId, email);
            
            if (user === null) {
                console.log(`No user found with email: ${email}. Skipping email send.`);
                return event;
            }

            console.log(`User verified. Sending password reset email to: ${email}`);

            const firstName = (user.Attributes ?? []).find((attribute) => attribute.Name === 'given_name')
            const lastName = (user.Attributes ?? []).find((attribute) => attribute.Name === 'family_name')

            const structuredName = firstName !== undefined && lastName !== undefined ? ` ${firstName.Value} ${lastName.Value}` : ''

            const code = await decryptCode(codeParameter)

            // Compose the email
            const msg = {
                to: email,
                from: FROM_EMAIL,
                subject: 'James French Photo Password Reset Code',
                text: `Hello${structuredName},\n\nYou requested to reset your password. Use the following code to reset it:\n\n${codeParameter}\n\nIf you didn't request this, please ignore this email.\n\nThis code will expire in 1 hour.`,
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Password Reset Request</h2>
                    <p>Hello${structuredName},</p>
                    <p>You requested to reset your password. Use the following code to reset it:</p>
                    <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0;">
                    ${code}
                    </div>
                    <p>If you didn't request this password reset, please ignore this email.</p>
                    <p style="color: #666; font-size: 12px;">This code will expire in 1 hour.</p>
                </div>
                `
            };

            // Send email via SendGrid
            const sendGridResponse = await sgMail.send(msg);
            console.log(`Response: ${sendGridResponse}`);

        } catch (error) {
            console.error('Error sending email:', error);
            
            // Log more details if available
            if (error instanceof Error && 'response' in error) {
                console.error('SendGrid error response:', (error as any).response?.body);
            }
            
            // Don't throw - return event to avoid blocking user flow
            // Cognito will fall back to default message if custom one fails
        }
    }

    return event
}