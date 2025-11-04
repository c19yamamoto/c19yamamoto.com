import { Construct } from 'constructs';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as path from 'path';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';
import { RemovalPolicy } from 'aws-cdk-lib';

export interface StaticWebsiteProps {
  readonly domainName: string;
  readonly hostedZone: route53.IHostedZone;
  readonly certificate: acm.ICertificate;
  readonly buildOutputPath?: string;
}

export class StaticWebsite extends Construct {
  public readonly cloudFrontToS3: CloudFrontToS3;
  public readonly dnsRecord: route53.ARecord;
  public readonly deployment: s3deploy.BucketDeployment;

  constructor(scope: Construct, id: string, props: StaticWebsiteProps) {
    super(scope, id);

    this.cloudFrontToS3 = new CloudFrontToS3(this, 'CloudFrontToS3', {
      bucketProps: {
        bucketName: `${props.domainName}-static-website`,
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      },
      cloudFrontDistributionProps: {
        domainNames: [props.domainName],
        certificate: props.certificate,
        defaultRootObject: 'index.html',
      },
      insertHttpSecurityHeaders: false,
      logS3AccessLogs: false, 
      logCloudFrontAccessLog: false,
    });

    this.dnsRecord = new route53.ARecord(this, 'AliasRecord', {
      zone: props.hostedZone,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(this.cloudFrontToS3.cloudFrontWebDistribution)
      ),
    });

    const buildOutputPath = props.buildOutputPath ?? '../../../out';
    this.deployment = new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, buildOutputPath))],
      destinationBucket: this.cloudFrontToS3.s3BucketInterface,
      distribution: this.cloudFrontToS3.cloudFrontWebDistribution,
      distributionPaths: ['/*'],
    });
  }
}
