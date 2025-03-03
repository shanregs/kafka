import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as msk from 'aws-cdk-lib/aws-msk';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { KmsStack } from './kms-stack';
import { ShanMskVpcStack } from './vpc-stack';
import { getEnvConfig } from '../config';

export interface MskCdkStackProps extends cdk.StackProps {
  kmsStack: KmsStack;
  vpcStack: ShanMskVpcStack;
}

export class MskCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MskCdkStackProps) {
    super(scope, id, props);

    const envConfig = getEnvConfig('dev');

    const mskKmsKey = kms.Key.fromKeyArn(this, 'MskKmsKey', envConfig.MSK_KMS_KEY_ARN);
    const saslKmsKey = kms.Key.fromKeyArn(this, 'SaslKmsKey', envConfig.SASL_KMS_KEY_ARN);
    const cloudwatchKmsKey = kms.Key.fromKeyArn(this, 'CloudwatchKmsKey', envConfig.CLOUDWATCH_KMS_KEY_ARN);

    const vpc = props.vpcStack.vpc;

    const subnetIds = vpc.isolatedSubnets.map((subnet) => subnet.subnetId);
    console.log('MskCdkStack Subnet IDs (isolatedSubnets):', subnetIds);
    if (subnetIds.length < 2) {
      throw new Error(`Expected at least 2 isolated subnets, but found ${subnetIds.length}. Check VPC stack configuration.`);
    }

    const mskSecurityGroup = new ec2.SecurityGroup(this, 'ShanMskSecurityGroup', {
      vpc,
      securityGroupName: 'shan-msk-sg',
      description: 'Security group for shan-msk-cluster',
      allowAllOutbound: true,
    });

    const mskPorts = [9092, 9094, 9096, 9098, 2181, 2182];
    mskPorts.forEach((port) => {
      mskSecurityGroup.addIngressRule(
        mskSecurityGroup,
        ec2.Port.tcp(port),
        `Allow port ${port} for MSK internal communication`
      );
    });

    const ec2SecurityGroup = new ec2.SecurityGroup(this, 'Ec2SecurityGroup', {
      vpc,
      securityGroupName: 'shan-ec2-sg',
      description: 'Security group for EC2 producer and consumer instances',
      allowAllOutbound: true,
    });

    ec2SecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH access to EC2 instances');
    mskPorts.forEach((port) => {
      mskSecurityGroup.addIngressRule(
        ec2SecurityGroup,
        ec2.Port.tcp(port),
        `Allow port ${port} from EC2 producer and consumer instances`
      );
    });

    const saslSecret = new secretsmanager.Secret(this, 'ShanMskSaslSecret', {
      secretName: 'shan-msk-sasl-secret',
      description: 'SASL/SCRAM credentials for shan-msk-cluster',
      encryptionKey: saslKmsKey,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'shan-user' }),
        generateStringKey: 'password',
        passwordLength: 16,
        excludePunctuation: true,
      },
    });

    // Use existing log group if it exists, otherwise create a new one
    const logGroupName = 'shan-msk-logs';
    const logGroup = logs.LogGroup.fromLogGroupName(this, 'ShanMskLogGroup', logGroupName) ||
      new logs.LogGroup(this, 'ShanMskLogGroup', {
        logGroupName: logGroupName,
        retention: logs.RetentionDays.ONE_MONTH,
        encryptionKey: cloudwatchKmsKey,
      });
    logGroup.node.addDependency(cloudwatchKmsKey);

    const mskCluster = new msk.CfnCluster(this, 'ShanMskCluster', {
      clusterName: 'shan-msk-cluster',
      kafkaVersion: '3.6.0',
      numberOfBrokerNodes: 2,
      brokerNodeGroupInfo: {
        instanceType: 'kafka.t3.small',
        storageInfo: {
          ebsStorageInfo: {
            volumeSize: 10,
          },
        },
        clientSubnets: subnetIds,
        securityGroups: [mskSecurityGroup.securityGroupId],
      },
      encryptionInfo: {
        encryptionAtRest: {
          dataVolumeKmsKeyId: mskKmsKey.keyArn,
        },
        encryptionInTransit: {
          clientBroker: 'TLS',
          inCluster: true,
        },
      },
      clientAuthentication: {
        sasl: {
          scram: { enabled: true },
          iam: { enabled: true },
        },
      },
      loggingInfo: {
        brokerLogs: {
          cloudWatchLogs: {
            enabled: true,
            logGroup: logGroup.logGroupName,
          },
        },
      },
    });

    new cdk.CfnOutput(this, 'ClusterArn', {
      value: mskCluster.attrArn,
      description: 'ARN of the MSK Cluster',
    });
    new cdk.CfnOutput(this, 'Ec2SecurityGroupId', {
      value: ec2SecurityGroup.securityGroupId,
      description: 'Security Group ID for EC2 producer and consumer instances',
    });
    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      description: 'VPC ID for MSK and EC2 instances',
    });
    new cdk.CfnOutput(this, 'SaslSecretArn', {
      value: saslSecret.secretArn,
      description: 'ARN of the SASL/SCRAM secret for MSK cluster',
    });
  }
}