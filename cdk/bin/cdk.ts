#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkStack } from '../lib/cdk-stack';
import { CertificateStack } from '../lib/certificate-stack';
import * as dotenv from 'dotenv';

dotenv.config();

const app = new cdk.App();

const commonTags = {
  Environment: 'Production',
  Project: 'NextJsStaticSite',
};

const createCertificateStack = (app: cdk.App): CertificateStack => 
  new CertificateStack(app, 'NextJsCertificateStack', {
    env: { 
      account: process.env.CDK_DEFAULT_ACCOUNT, 
      region: 'us-east-1'
    },
    description: 'ACM Certificate for CloudFront in us-east-1 region',
    tags: commonTags,
  });

const createMainStack = (app: cdk.App, certStack: CertificateStack): CdkStack =>
  new CdkStack(app, 'NextJsCloudFrontS3Stack', {
    env: { 
      account: process.env.CDK_DEFAULT_ACCOUNT, 
      region: process.env.CDK_DEFAULT_REGION 
    },
    description: 'Next.js static site hosted on CloudFront and S3 with Route53 domain',
    tags: commonTags,
    crossRegionReferences: true,
    certificateStack: certStack
  });

const certStack = createCertificateStack(app);
createMainStack(app, certStack);
