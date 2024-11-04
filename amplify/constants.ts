import { secret } from "@aws-amplify/backend";

export const stackConstants = {
    emailQueueName: secret('emailQueue') ?? 'amplify-jamesfrenchphoto-apollo-sandbox-da786b10-EmailQueue9C1DA90F-4qnPxpXc2Vlf',
    stateMachineArn: secret('stateMachineArn') ?? 'arn:aws:states:us-east-1:911167908910:stateMachine:EmailStepFunctionEmailStateMachineF23B2927-oJUPNzx8p9FF',
    tempTokensArn: secret('tempTokensArn') ?? 'arn:aws:dynamodb:us-east-1:911167908910:table/TemporaryCreateUsersTokens-syymw3momfhyfcpmjctmbhhsie-NONE',
    tempTokensDbName: secret('tempTokensDbName') ?? 'TemporaryCreateUsersTokens-syymw3momfhyfcpmjctmbhhsie-NONE',
}