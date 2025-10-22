import { IGraphqlApi } from "aws-cdk-lib/aws-appsync";
import { CfnRule, EventBus, IEventBus } from "aws-cdk-lib/aws-events";
import { Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export class Events extends Construct {
  public readonly eventBus: IEventBus
  public readonly eventBusPolicyStatement: PolicyStatement
  public readonly eventBusRole: Role
  public readonly lambdaFailureRule: CfnRule

  constructor(scope: Construct, id: string, props: {
    graphQLAPI: IGraphqlApi
  }) {
    super(scope, id)

    this.eventBus = EventBus.fromEventBusName(
      scope,
      'jamesfrenchphoto-eventbus',
      'default'
    )

    this.eventBusPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["appsync:GraphQL"],
      resources: [`${props.graphQLAPI}/types/Mutation/*`]
    })

    this.eventBusRole = new Role(scope, 'AppSyncInvokeRole', {
      assumedBy: new ServicePrincipal('events.amazon.com'),
      inlinePolicies: {
        PolicyStatement: new PolicyDocument({
          statements: [this.eventBusPolicyStatement]
        })
      }
    })

    this.lambdaFailureRule = new CfnRule(scope, "lambda-failure-rule")
    //found out that rules cost a lot and i only get 10
  }
}