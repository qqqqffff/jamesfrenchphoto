import { RemovalPolicy } from "aws-cdk-lib";
import { CachePolicy, Distribution, IDistribution, IOriginAccessIdentity, OriginAccessIdentity, PriceClass, SecurityPolicyProtocol, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";
import { S3BucketOrigin, S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { AnyPrincipal, Effect, IRole, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { Bucket, IBucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";


export class PublicStorage extends Construct {
  public readonly publicBucket: IBucket 
  public readonly originAccessIdentity: IOriginAccessIdentity
  public readonly distribution: IDistribution

  constructor(scope: Construct, id: string, props: { 
    addPublicPhoto: IFunction,
    deletePublicPhoto: IFunction,
  }){
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
    this.publicBucket.grantReadWrite(props.addPublicPhoto)
    this.publicBucket.grantDelete(props.deletePublicPhoto)

    this.originAccessIdentity = new OriginAccessIdentity(scope, 'jamesfrenchphoto-public-cloudfront-oai', {
      comment: `OAI for ${id}`
    })
    this.publicBucket.grantRead(this.originAccessIdentity)

    this.distribution = new Distribution(scope, 'jamesfrenchphoto-public-cloudfront-distribution', {
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessIdentity(this.publicBucket, { 
          originAccessIdentity: this.originAccessIdentity
        }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      },
      priceClass: PriceClass.PRICE_CLASS_100,
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021
    })
  }
}