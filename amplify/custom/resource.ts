import { Duration } from "aws-cdk-lib";
import { IFunction, Runtime } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { IQueue, Queue } from "aws-cdk-lib/aws-sqs";
import { Chain, Choice, Condition, DefinitionBody, IStateMachine, StateMachine } from "aws-cdk-lib/aws-stepfunctions";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";
import * as url from 'node:url'

type EmailStepFunctionProps = {
    addCreateUserQueue: IFunction
} 

export class EmailStepFunction extends Construct {
    public readonly emailQueue: IQueue
    public readonly emailStateMachine: IStateMachine
    constructor(scope: Construct, id: string, props: EmailStepFunctionProps){
        super(scope, id)

        this.emailQueue = new Queue(scope, 'EmailQueue', {
            deliveryDelay: Duration.seconds(15)
        })

        // lambda functions
        const createUserEmailLambda = new NodejsFunction(this, 'createUserEmailer', {
            entry: url.fileURLToPath(new URL('createUserEmailer/handler.ts', import.meta.url)),
            runtime: Runtime.NODEJS_18_X,
        })

        const receiveMeessageLambda = new NodejsFunction(this, 'receiveMessage', {
            entry: url.fileURLToPath(new URL('receiveMessage/handler.ts', import.meta.url)),
            runtime: Runtime.NODEJS_18_X,
        })
        this.emailQueue.grantConsumeMessages(receiveMeessageLambda)
        receiveMeessageLambda.addEventSource(new SqsEventSource(this.emailQueue, {
            batchSize: 1
        }))

        const receiveMessageTask = new LambdaInvoke(this, 'Receive Message', {
            lambdaFunction: receiveMeessageLambda,
            outputPath: '$.Payload'
        })

        const createUserEmailTask = new LambdaInvoke(this, 'Create User Email', {
            lambdaFunction: createUserEmailLambda,
            outputPath: '$.Payload',
            inputPath: '$.Payload',
        })

        const emailerChoice = new Choice(this, 'Email Handler Choise')

        this.emailQueue.grantSendMessages(props.addCreateUserQueue)

        const chain = Chain
            .start(receiveMessageTask)
            .next(
                emailerChoice
                    .when(Condition.numberEquals('$.emailType', 0), createUserEmailTask)
            )

        this.emailStateMachine = new StateMachine(this, 'EmailStateMachine', {
            definitionBody: DefinitionBody.fromChainable(chain)
        })
    }
}