#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { StaticWebsiteStack } from '../lib/static-website-stack';
import * as dotenv from 'dotenv';

dotenv.config();

const app = new cdk.App();

const commonTags = {
  Environment: 'Production',
  Project: 'StaticWebsite',
};

new StaticWebsiteStack(app, 'StaticWebsiteStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: 'us-east-1'  // CloudFront requires certificate in us-east-1
  },
  description: 'Static website (SSG) hosted on CloudFront and S3 with Route53 domain',
  tags: commonTags,
});
