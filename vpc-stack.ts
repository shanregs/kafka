import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class ShanMskVpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'ShanMskVpc', {
      vpcName: 'shan-msk-vpc',
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      availabilityZones: ['us-east-1a', 'us-east-1b'],
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'shan-msk-private',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    console.log('VPC AZs:', this.vpc.availabilityZones);
    console.log('Private Subnets:', this.vpc.privateSubnets.map((s) => ({ subnetId: s.subnetId, az: s.availabilityZone })));
    console.log('Public Subnets:', this.vpc.publicSubnets.map((s) => ({ subnetId: s.subnetId, az: s.availabilityZone })));
    console.log('Isolated Subnets:', this.vpc.isolatedSubnets.map((s) => ({ subnetId: s.subnetId, az: s.availabilityZone })));

    const subnetIds = this.vpc.isolatedSubnets.map((subnet) => subnet.subnetId);
    console.log('ShanMskVpc Subnet IDs (isolatedSubnets):', subnetIds);
    if (subnetIds.length < 2) {
      throw new Error(`Expected at least 2 isolated subnets, but found ${subnetIds.length}.`);
    }

    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID for ShanMskVpc',
    });
  }
}