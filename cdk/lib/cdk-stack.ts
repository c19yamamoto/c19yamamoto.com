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

dotenv.config();

interface CdkStackProps extends cdk.StackProps {
  certificateStack?: CertificateStack;
}

export class CdkStack extends cdk.Stack {
  private readonly domainName: string;
  private readonly hostedZone: route53.IHostedZone;
  private readonly certificate: acm.ICertificate;
  private readonly websiteBucket: s3.Bucket;
  private readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: CdkStackProps) {
    super(scope, id, props);

    // Get domain name from environment variables
    this.domainName = this.getDomainName();
    
    // Get the existing hosted zone
    this.hostedZone = this.getHostedZone();
    
    // Get or create SSL certificate
    this.certificate = this.getCertificate(props);
    
    // Create S3 bucket for website content
    this.websiteBucket = this.createWebsiteBucket();
    
    // Create CloudFront distribution
    this.distribution = this.createCloudFrontDistribution();
    
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

  private createWebsiteBucket(): s3.Bucket {
    return new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `${this.domainName}-website`,
    });
  }

  private createCloudFrontDistribution(): cloudfront.Distribution {
    return new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.websiteBucket, {}),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
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
    });
  }

  private createDnsRecord(): route53.ARecord {
    return new route53.ARecord(this, 'AliasRecord', {
      zone: this.hostedZone,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
    });
  }

  private deployWebsiteContent(): s3deploy.BucketDeployment {
    return new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../../out'))],
      destinationBucket: this.websiteBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    });
  }

  private createOutputs(): void {
    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
    });

    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `https://${this.domainName}`,
      description: 'Website URL',
    });
  }
}
