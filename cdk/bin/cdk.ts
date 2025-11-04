#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkStack } from '../lib/cdk-stack';
import * as dotenv from 'dotenv';

dotenv.config();

const app = new cdk.App();

const commonTags = {
  Environment: 'Production',
  Project: 'NextJsStaticSite',
};

new CdkStack(app, 'NextJsCloudFrontS3Stack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: 'us-east-1'  // CloudFront requires certificate in us-east-1
  },
  description: 'Next.js static site hosted on CloudFront and S3 with Route53 domain',
  tags: commonTags,
});
