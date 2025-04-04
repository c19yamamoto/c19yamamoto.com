#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkStack } from '../lib/cdk-stack';
import * as dotenv from 'dotenv';

// .env ファイルから環境変数を読み込む
dotenv.config();

const app = new cdk.App();
new CdkStack(app, 'NextJsCloudFrontS3Stack', {
  // 現在の AWS CLI 設定から暗黙的に指定されるアカウントとリージョンを使用
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: process.env.CDK_DEFAULT_REGION 
  },
  
  // スタックの説明
  description: 'Next.js static site hosted on CloudFront and S3 with Route53 domain',
  
  // タグ
  tags: {
    Environment: 'Production',
    Project: 'NextJsStaticSite',
  },
});
