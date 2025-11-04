import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';
import { CertificateStack } from './certificate-stack';

dotenv.config();

interface CdkStackProps extends cdk.StackProps {
  certificateStack?: CertificateStack;
}

export class CdkStack extends cdk.Stack {
  private readonly domainName: string;
  private readonly hostedZone: route53.IHostedZone;
  private readonly certificate: acm.ICertificate;
  private readonly cloudFrontToS3: CloudFrontToS3;

  constructor(scope: Construct, id: string, props?: CdkStackProps) {
    super(scope, id, props);

    // Get domain name from environment variables
    this.domainName = this.getDomainName();
    
    // Get the existing hosted zone
    this.hostedZone = this.getHostedZone();
    
    // Get or create SSL certificate
    this.certificate = this.getCertificate(props);
    
    // Create CloudFront distribution with S3 bucket using AWS Solutions Construct
    this.cloudFrontToS3 = this.createCloudFrontToS3();
    
    // Create Route53 DNS record
    this.createDnsRecord();
    
    // Deploy Next.js build output to S3
    this.deployWebsiteContent();
    
    // Output CloudFront and website URLs
    this.createOutputs();
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

  private getCertificate(props?: CdkStackProps): acm.ICertificate {
    if (props?.certificateStack) {
      const certificate = props.certificateStack.certificate;
      console.log('Using certificate from us-east-1 region:', certificate.certificateArn);
      return certificate;
    }
    
    console.warn('WARNING: Creating certificate in the current region. This may not work with CloudFront if the region is not us-east-1.');
    return new acm.Certificate(this, 'Certificate', {
      domainName: this.domainName,
      validation: acm.CertificateValidation.fromDns(this.hostedZone)
    });
  }

  private createCloudFrontToS3(): CloudFrontToS3 {
    return new CloudFrontToS3(this, 'CloudFrontToS3', {
      bucketProps: {
        bucketName: `${this.domainName}-website`,
      },
      cloudFrontDistributionProps: {
        domainNames: [this.domainName],
        certificate: this.certificate,
        defaultRootObject: 'index.html',
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
          },
        ],
      },
      insertHttpSecurityHeaders: false,
    });
  }

  private createDnsRecord(): route53.ARecord {
    return new route53.ARecord(this, 'AliasRecord', {
      zone: this.hostedZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.cloudFrontToS3.cloudFrontWebDistribution)),
    });
  }

  private deployWebsiteContent(): s3deploy.BucketDeployment {
    return new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../out'))],
      destinationBucket: this.cloudFrontToS3.s3BucketInterface,
      distribution: this.cloudFrontToS3.cloudFrontWebDistribution,
      distributionPaths: ['/*'],
    });
  }

  private createOutputs(): void {
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.cloudFrontToS3.cloudFrontWebDistribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
    });

    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `https://${this.domainName}`,
      description: 'Website URL',
    });
  }
}
