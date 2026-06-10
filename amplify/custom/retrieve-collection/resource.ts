import { Duration } from 'aws-cdk-lib'
import { FunctionUrl, FunctionUrlAuthType, HttpMethod, InvokeMode, Runtime } from 'aws-cdk-lib/aws-lambda'
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs'
import { IBucket } from 'aws-cdk-lib/aws-s3'
import { ITable } from 'aws-cdk-lib/aws-dynamodb'
import { PolicyStatement } from 'aws-cdk-lib/aws-iam'
import { Construct } from 'constructs'
import * as url from 'node:url'

interface RetrieveCollectionProps {
  bucket: IBucket
  photoSetTable: ITable
  photoPathsTable: ITable
  cognitoJwksUrl: string
}

export class RetrieveCollection extends Construct {
  public readonly fn: NodejsFunction
  public readonly functionUrl: FunctionUrl
  public readonly url: string

  constructor(scope: Construct, id: string, props: RetrieveCollectionProps) {
    super(scope, id)

    this.fn = new NodejsFunction(this, 'RetrieveCollectionFn', {
      entry: url.fileURLToPath(new URL('handler.ts', import.meta.url)),
      runtime: Runtime.NODEJS_22_X,
      timeout: Duration.seconds(900),
      environment: {
        BUCKET_NAME: props.bucket.bucketName,
        PHOTO_SET_TABLE: props.photoSetTable.tableName,
        PHOTO_PATHS_TABLE: props.photoPathsTable.tableName,
        COGNITO_JWKS_URL: props.cognitoJwksUrl,
      },
    })

    props.bucket.grantRead(this.fn)
    this.fn.addToRolePolicy(new PolicyStatement({
      actions: ['s3:ListBucket'],
      resources: [props.bucket.bucketArn],
    }))

    props.photoSetTable.grantReadWriteData(this.fn)
    props.photoPathsTable.grantReadWriteData(this.fn)

    this.functionUrl = new FunctionUrl(this, 'RetrieveCollectionUrl', {
      function: this.fn,
      authType: FunctionUrlAuthType.AWS_IAM,
      invokeMode: InvokeMode.RESPONSE_STREAM,
      cors: {
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
        allowedMethods: [HttpMethod.ALL],
      },
    })

    this.url = this.functionUrl.url
  }
}
