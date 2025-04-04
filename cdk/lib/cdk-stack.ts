import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as path from 'path';
import * as dotenv from 'dotenv';

// .env ファイルから環境変数を読み込む
dotenv.config();

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 環境変数からドメイン名を取得
    const domainName = process.env.DOMAIN_NAME;
    if (!domainName) {
      throw new Error('DOMAIN_NAME environment variable is not set in .env file');
    }

    // ホストゾーンの取得（既存のホストゾーンを使用）
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: domainName,
    });

    // SSL証明書の作成
    // 注意: CloudFrontで使用する証明書は us-east-1 リージョンに作成する必要があります
    // Certificate クラスでは region プロパティは使用できないため、CDKのデプロイ時に --region us-east-1 を指定するか
    // 証明書用の別スタックを us-east-1 リージョンに作成する必要があります
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: domainName,
      validation: acm.CertificateValidation.fromDns(hostedZone)
    });

    // S3バケットの作成（静的ウェブサイトホスティング用）
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `${domainName}-website`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // CloudFrontからのみアクセス可能
      removalPolicy: cdk.RemovalPolicy.DESTROY, // スタック削除時にバケットも削除（開発環境用）
      autoDeleteObjects: true, // スタック削除時にオブジェクトも削除（開発環境用）
    });

    // CloudFront ディストリビューションの作成
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      domainNames: [domainName],
      certificate: certificate,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html', // SPAのためのフォールバック
        },
      ],
    });

    // Route53 DNSレコードの作成
    new route53.ARecord(this, 'AliasRecord', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
    });

    // Next.jsのビルド成果物をS3にデプロイ
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../out'))],
      destinationBucket: websiteBucket,
      distribution: distribution,
      distributionPaths: ['/*'],
    });

    // CloudFrontのURLを出力
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
    });

    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `https://${domainName}`,
      description: 'Website URL',
    });
  }
}
