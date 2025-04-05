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
import { CertificateStack } from './certificate-stack';

// .env ファイルから環境変数を読み込む
dotenv.config();

// StackPropsを拡張して証明書スタックを含めるインターフェース
interface CdkStackProps extends cdk.StackProps {
  certificateStack?: CertificateStack;
}

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: CdkStackProps) {
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

    // SSL証明書の参照
    // 証明書スタックから証明書を取得するか、証明書スタックが提供されていない場合は新しく作成
    let certificate: acm.ICertificate;
    
    if (props?.certificateStack) {
      // us-east-1リージョンの証明書スタックから証明書を参照
      certificate = props.certificateStack.certificate;
      console.log('Using certificate from us-east-1 region:', certificate.certificateArn);
    } else {
      // 証明書スタックが提供されていない場合は、警告を出して現在のリージョンに証明書を作成
      // 注意: CloudFrontで使用する場合、これはus-east-1でない限り機能しません
      console.warn('WARNING: Creating certificate in the current region. This may not work with CloudFront if the region is not us-east-1.');
      certificate = new acm.Certificate(this, 'Certificate', {
        domainName: domainName,
        validation: acm.CertificateValidation.fromDns(hostedZone)
      });
    }

    // S3バケットの作成（静的ウェブサイトホスティング用）
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `${domainName}-website`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // SPAのためのフォールバック
      publicReadAccess: true, // 静的ウェブサイトホスティングには公開アクセスが必要
    });

    // CloudFront ディストリビューションの作成
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3StaticWebsiteOrigin(websiteBucket),
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
