import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as iam from 'aws-cdk-lib/aws-iam';

export class KmsStack extends cdk.Stack {
  public readonly mskKmsKey: kms.Key;
  public readonly saslKmsKey: kms.Key;
  public readonly cloudwatchKmsKey: kms.Key;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // KMS Key for MSK Data Encryption
    this.mskKmsKey = new kms.Key(this, 'ShanMskKmsKey', {
      alias: 'shan-msk-kms-key',
      description: 'KMS key for MSK data encryption',
      enableKeyRotation: true,
      policy: new iam.PolicyDocument({
        statements: [
          // Allow MSK service to use the key for encryption/decryption
          new iam.PolicyStatement({
            sid: 'AllowMSKUse',
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('kafka.amazonaws.com')], // Corrected principal
            actions: [
              'kms:Encrypt',
              'kms:Decrypt',
              'kms:ReEncrypt*',
              'kms:GenerateDataKey*',
              'kms:DescribeKey',
            ],
            resources: ['*'],
          }),
          // Allow root account full control
          new iam.PolicyStatement({
            sid: 'AllowAdmin',
            effect: iam.Effect.ALLOW,
            principals: [new iam.AccountRootPrincipal()],
            actions: ['kms:*'],
            resources: ['*'],
          }),
        ],
      }),
    });

    // KMS Key for SASL/SCRAM Secret Encryption
    this.saslKmsKey = new kms.Key(this, 'ShanSaslKmsKey', {
      alias: 'shan-sasl-kms-key',
      description: 'KMS key for SASL/SCRAM secret encryption',
      enableKeyRotation: true,
      policy: new iam.PolicyDocument({
        statements: [
          // Allow Secrets Manager to use the key for encryption/decryption
          new iam.PolicyStatement({
            sid: 'AllowSecretsManagerUse',
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('secretsmanager.amazonaws.com')], // Corrected principal
            actions: [
              'kms:Encrypt',
              'kms:Decrypt',
              'kms:ReEncrypt*',
              'kms:GenerateDataKey*',
              'kms:DescribeKey',
            ],
            resources: ['*'],
          }),
          // Allow MSK to access the secret key
          new iam.PolicyStatement({
            sid: 'AllowMSKUse',
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('kafka.amazonaws.com')], // Corrected principal
            actions: [
              'kms:Decrypt',
              'kms:GenerateDataKey*',
              'kms:DescribeKey',
            ],
            resources: ['*'],
          }),
          // Allow root account full control
          new iam.PolicyStatement({
            sid: 'AllowAdmin',
            effect: iam.Effect.ALLOW,
            principals: [new iam.AccountRootPrincipal()],
            actions: ['kms:*'],
            resources: ['*'],
          }),
        ],
      }),
    });

    // KMS Key for CloudWatch Logs Encryption
    this.cloudwatchKmsKey = new kms.Key(this, 'ShanCloudwatchKmsKey', {
      alias: 'shan-cloudwatch-kms-key',
      description: 'KMS key for CloudWatch Logs encryption',
      enableKeyRotation: true,
      policy: new iam.PolicyDocument({
        statements: [
          // Allow CloudWatch Logs to use the key for encryption/decryption
          new iam.PolicyStatement({
            sid: 'AllowCloudWatchLogsUse',
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('logs.amazonaws.com')], // Corrected principal
            actions: [
              'kms:Encrypt',
              'kms:Decrypt',
              'kms:ReEncrypt*',
              'kms:GenerateDataKey*',
              'kms:DescribeKey',
            ],
            resources: ['*'],
            conditions: {
              StringEquals: {
                'kms:EncryptionContext:aws:logs:arn': `arn:aws:logs:us-east-1:${this.account}:log-group:shan-msk-logs`,
              },
            },
          }),
          // Allow root account full control
          new iam.PolicyStatement({
            sid: 'AllowAdmin',
            effect: iam.Effect.ALLOW,
            principals: [new iam.AccountRootPrincipal()],
            actions: ['kms:*'],
            resources: ['*'],
          }),
        ],
      }),
    });
  }
}