import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'AwsEmulatorE2EZoneStack', {
  env: {
    account: '000000000000',
    region: 'us-east-1',
  },
});

new route53.PublicHostedZone(stack, 'HostedZone', {
  zoneName: process.env.AWS_EMULATOR_E2E_DOMAIN ?? 'aws-emulator-e2e.test',
});
