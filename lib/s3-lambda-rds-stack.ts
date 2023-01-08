import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as s3 from '@aws-cdk/aws-s3';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as rds from '@aws-cdk/aws-rds';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaEventSources from '@aws-cdk/aws-lambda-event-sources';
import * as secretsManager from '@aws-cdk/aws-secretsmanager';

export class S3LambdaRdsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const databaseCredentialsSecret = new secretsManager.Secret(this, 'DBCredentialsSecret', {
      secretName: 'credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'admin',
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password'
      }
    });
    
    // const passKey = cdk.SecretValue.unsafePlainText('12345678');
    // passKey.unsafeUnwrap();
    const vpc = new ec2.Vpc(this, 'my-vpc');
    const securityGroup = new ec2.SecurityGroup(this, 'rds-entry-group', {
      vpc,
      description: 'Allows Inbound To RDS',
      allowAllOutbound: true,
    })
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.allTraffic());
    const instanceType = ec2.InstanceType.of(ec2.InstanceClass.R6G, ec2.InstanceSize.LARGE);
    
    const s3Bucket = new s3.Bucket(this, 'techwondoe-bucket', {
      bucketName: 'techwondoe-bucket',
      autoDeleteObjects: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const lambdaFunction = new lambda.Function(this, 'Function', {
      code: lambda.Code.fromAsset('src'),
      handler: 'lambda.handler',
      functionName: 'BucketPutHandler',
      runtime: lambda.Runtime.NODEJS_16_X
    });

    const cluster = new rds.DatabaseCluster(this, 'my-db', {
      engine: rds.DatabaseClusterEngine.auroraMysql({version: rds.AuroraMysqlEngineVersion.VER_3_01_0}),
      instanceProps: {
        vpc, 
        instanceType, 
        publiclyAccessible: true,
        securityGroups: [securityGroup],
        vpcSubnets: {subnetType: ec2.SubnetType.PUBLIC}
      },
      instances: 1,
      defaultDatabaseName: 'db',
      clusterIdentifier: 'my-db',
      credentials: {
        username: databaseCredentialsSecret.secretValueFromJson('username').unsafeUnwrap(), 
        password: databaseCredentialsSecret.secretValueFromJson('password')
      },
      
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    cluster.connections.allowDefaultPortFromAnyIpv4();

    const s3PutEventSource = new lambdaEventSources.S3EventSource(s3Bucket, {
      events: [
        s3.EventType.OBJECT_CREATED_PUT
      ]
    });

    const s3ListBucketAndGetObjectPolicy = new iam.PolicyStatement({
      actions: ['s3:ListAllMyBuckets', 's3:GetObject'],
      resources: ['arn:aws:s3:::*'],
    });

    lambdaFunction.addEventSource(s3PutEventSource);

    lambdaFunction.role?.attachInlinePolicy(
      new iam.Policy(this, 'list-buckets-get-object-policy', {
        statements: [s3ListBucketAndGetObjectPolicy],
      }),
    );
  }
}
