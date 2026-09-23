import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { StaticWebsite } from '../lib/construct/static-website-construct';
import { StaticWebsiteStack } from '../lib/stack/static-website-stack';

const domainName = 'example.com';
const certificateArn =
  'arn:aws:acm:us-east-1:123456789012:certificate/test-certificate';

type Resource = {
  Type: string;
  Properties?: Record<string, unknown>;
  DeletionPolicy?: string;
  UpdateReplacePolicy?: string;
};

function createWebsiteTemplate(): Template {
  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'StaticWebsiteTestStack');
  const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
    stack,
    'HostedZone',
    {
      hostedZoneId: 'Z1234567890',
      zoneName: domainName,
    },
  );
  const certificate = acm.Certificate.fromCertificateArn(
    stack,
    'Certificate',
    certificateArn,
  );

  new StaticWebsite(stack, 'Website', {
    domainName,
    hostedZone,
    certificate,
    buildOutputPath: '../../test/fixtures/site',
  });

  return Template.fromStack(stack);
}

let websiteTemplate: Template;

beforeAll(() => {
  websiteTemplate = createWebsiteTemplate();
});

test('creates a private S3 origin with the expected website bucket settings', () => {
  const template = websiteTemplate;

  template.resourceCountIs('AWS::S3::Bucket', 2);
  template.hasResourceProperties('AWS::S3::Bucket', {
    BucketName: `${domainName}-static-website`,
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    },
  });

  const resources = template.toJSON().Resources as Record<string, Resource>;
  const websiteBucket = Object.values(resources).find(
    (resource) =>
      resource.Type === 'AWS::S3::Bucket' &&
      resource.Properties?.BucketName === `${domainName}-static-website`,
  );

  expect(websiteBucket).toBeDefined();
  expect(websiteBucket?.DeletionPolicy).toBe('Delete');
  expect(websiteBucket?.UpdateReplacePolicy).toBe('Delete');
});

test('configures HTTPS CloudFront delivery and Route53 aliasing', () => {
  const template = websiteTemplate;

  template.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: Match.objectLike({
      Aliases: [domainName],
      DefaultRootObject: 'index.html',
      ViewerCertificate: {
        AcmCertificateArn: certificateArn,
        MinimumProtocolVersion: 'TLSv1.2_2021',
        SslSupportMethod: 'sni-only',
      },
    }),
  });
  template.hasResourceProperties('AWS::Route53::RecordSet', {
    Name: `${domainName}.`,
    Type: 'A',
    AliasTarget: Match.objectLike({
      DNSName: Match.anyValue(),
      HostedZoneId: Match.anyValue(),
    }),
  });
});

test('invalidates CloudFront after deploying the static export', () => {
  const resources = websiteTemplate.toJSON().Resources as Record<string, Resource>;
  const deployments = Object.values(resources).filter(
    (resource) => resource.Type === 'Custom::CDKBucketDeployment',
  );

  expect(deployments).toHaveLength(1);
  expect(deployments[0].Properties).toEqual(
    expect.objectContaining({
      DistributionPaths: ['/*'],
      Prune: true,
      WaitForDistributionInvalidation: true,
    }),
  );
});

test('matches the synthesized CloudFormation template snapshot', () => {
  expect(websiteTemplate.toJSON()).toMatchSnapshot();
});

test('requires the domainName context before looking up Route53', () => {
  const app = new cdk.App();

  expect(() => new StaticWebsiteStack(app, 'StaticWebsiteStackTest')).toThrow(
    'domainName context variable is not set',
  );
});
