import { RemovalPolicy } from "aws-cdk-lib";
import { AnyPrincipal, Effect, IRole, PolicyStatement, StarPrincipal } from "aws-cdk-lib/aws-iam";
import { Bucket, BucketAccessControl, IBucket, ObjectOwnership } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";


export class PublicStorage extends Construct {
  public readonly publicBucket: IBucket 
  constructor(scope: Construct, id: string, props: { adminRole: IRole }){
    super(scope, id)
    
    this.publicBucket = new Bucket(scope, 'jamesfrenchphoto-public', {
      blockPublicAccess: {
        blockPublicAcls: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
        blockPublicPolicy: false,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    })

    this.publicBucket.grantRead(new AnyPrincipal())

    this.publicBucket.addToResourcePolicy(
      new PolicyStatement({
        actions: ['s3:*'],
        effect: Effect.ALLOW,
        principals: [props.adminRole],
        resources: [this.publicBucket.arnForObjects('*')]
      })
    )
  }
}