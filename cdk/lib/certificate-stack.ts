import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as dotenv from 'dotenv';

// .env ファイルから環境変数を読み込む
dotenv.config();

export class CertificateStack extends cdk.Stack {
  // 他のスタックから参照できるように証明書をパブリックプロパティとして公開
  public readonly certificate: acm.Certificate;

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

    // SSL証明書の作成（us-east-1リージョンに作成される）
    this.certificate = new acm.Certificate(this, 'Certificate', {
      domainName: domainName,
      validation: acm.CertificateValidation.fromDns(hostedZone)
    });

    // 証明書のARNを出力
    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      description: 'ACM Certificate ARN (us-east-1)',
      exportName: `${id}-CertificateArn`,
    });
  }
}
