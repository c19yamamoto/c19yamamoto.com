#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CdkStack } from '../lib/cdk-stack';
import { CertificateStack } from '../lib/certificate-stack';
import * as dotenv from 'dotenv';

// .env ファイルから環境変数を読み込む
dotenv.config();

const app = new cdk.App();

// 証明書スタックを us-east-1 リージョンに作成
const certStack = new CertificateStack(app, 'NextJsCertificateStack', {
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: 'us-east-1' // SSL 証明書は us-east-1 に作成する必要がある
  },
  
  // スタックの説明
  description: 'ACM Certificate for CloudFront in us-east-1 region',
  
  // タグ
  tags: {
    Environment: 'Production',
    Project: 'NextJsStaticSite',
  },
});

// メインのスタックを作成（デフォルトリージョン ap-northeast-1 に作成）
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

  // クロスリージョン参照を有効化
  crossRegionReferences: true,
  
  // 証明書スタックの参照
  certificateStack: certStack
});
