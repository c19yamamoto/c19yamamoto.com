import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { StaticWebsite } from '../construct/static-website-construct';

export class StaticWebsiteStack extends cdk.Stack {
  private readonly domainName: string;
  private readonly certificate: acm.ICertificate;
  public readonly website: StaticWebsite;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);    
    this.domainName = this.getDomainName();

    const hostedZone = this.getHostedZone();
    this.certificate = this.createCertificate(hostedZone);
    
    this.website = new StaticWebsite(this, 'Website', {
      domainName: this.domainName,
      hostedZone,
      certificate: this.certificate,
    });
  }

  private getDomainName(): string {
    const domainName = this.node.tryGetContext('domainName');
    if (!domainName) {
      throw new Error('domainName context variable is not set. Use -c domainName=example.com');
    }
    return domainName;
  }

  private getHostedZone(): route53.IHostedZone {
    return route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: this.domainName,
    });
  }

  private createCertificate(hostedZone: route53.IHostedZone): acm.ICertificate {
    return new acm.Certificate(this, 'Certificate', {
      domainName: this.domainName,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });
  }
}
