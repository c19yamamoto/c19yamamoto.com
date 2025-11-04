import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as dotenv from 'dotenv';
import { StaticWebsite } from '../construct/static-website-construct';

dotenv.config();

export class StaticWebsiteStack extends cdk.Stack {
  private readonly domainName: string;
  private readonly certificate: acm.ICertificate;
  private readonly website: StaticWebsite;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Get domain name from environment variables
    this.domainName = this.getDomainName();
    
    // Get the existing hosted zone
    const hostedZone = this.getHostedZone();
    
    // Create SSL certificate in us-east-1 for CloudFront
    this.certificate = this.createCertificate(hostedZone);
    
    // Create the website construct
    this.website = new StaticWebsite(this, 'Website', {
      domainName: this.domainName,
      hostedZone,
      certificate: this.certificate,
    });
    
    // Output CloudFront and website URLs
    this.createOutputs();
  }

  private getDomainName = (): string => {
    const domainName = process.env.DOMAIN_NAME;
    if (!domainName) {
      throw new Error('DOMAIN_NAME environment variable is not set in .env file');
    }
    return domainName;
  };

  private getHostedZone = (): route53.IHostedZone =>
    route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: this.domainName,
    });

  private createCertificate = (hostedZone: route53.IHostedZone): acm.ICertificate =>
    new acm.Certificate(this, 'Certificate', {
      domainName: this.domainName,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

  private createOutputs = (): void => {
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.website.cloudFrontToS3.cloudFrontWebDistribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
    });

    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `https://${this.domainName}`,
      description: 'Website URL',
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      description: 'ACM Certificate ARN',
    });
  };
}
