#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { KmsStack } from '../lib/kms-stack';
import { MskCdkStack } from '../lib/msk-stack';
import { ShanMskVpcStack } from '../lib/vpc-stack';

const app = new cdk.App();

const kmsStack = new KmsStack(app, 'KmsStack', {
  env: { region: 'us-east-1' },
});

const vpcStack = new ShanMskVpcStack(app, 'ShanMskVpcStack', {
  env: { region: 'us-east-1' },
});

new MskCdkStack(app, 'MskCdkStack', {
  env: { region: 'us-east-1' },
  kmsStack: kmsStack,
  vpcStack: vpcStack,
});