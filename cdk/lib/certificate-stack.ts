import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as dotenv from 'dotenv';

dotenv.config();

export class CertificateStack extends cdk.Stack {
  public readonly certificate: acm.Certificate;
  private readonly domainName: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.domainName = this.getDomainName();
    const hostedZone = this.getHostedZone();
    this.certificate = this.createCertificate(hostedZone);
    this.createOutputs(id);
  }

  private getDomainName(): string {
    const domainName = process.env.DOMAIN_NAME;
    if (!domainName) {
      throw new Error('DOMAIN_NAME environment variable is not set in .env file');
    }
    return domainName;
  }

  private getHostedZone(): route53.IHostedZone {
    return route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: this.domainName,
    });
  }

  private createCertificate = (hostedZone: route53.IHostedZone): acm.Certificate => 
    new acm.Certificate(this, 'Certificate', {
      domainName: this.domainName,
      validation: acm.CertificateValidation.fromDns(hostedZone)
    });

  private createOutputs(id: string): void {
    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      description: 'ACM Certificate ARN (us-east-1)',
      exportName: `${id}-CertificateArn`,
    });
  }
}
