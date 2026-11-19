import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const cdkDirectory = path.resolve(scriptDirectory, '../..');
const repositoryRoot = path.resolve(cdkDirectory, '..');
const domainName = process.env.AWS_EMULATOR_E2E_DOMAIN ?? 'aws-emulator-e2e.test';
const cdk = path.join(cdkDirectory, 'node_modules', '.bin', 'cdk');
const zoneApp = 'npx ts-node --prefer-ts-exts test/e2e/zone-app.ts';
const contextFile = path.join(cdkDirectory, 'cdk.context.json');
const hadContextFile = existsSync(contextFile);
const originalContext = hadContextFile ? readFileSync(contextFile) : undefined;
const builtIndex = path.join(repositoryRoot, 'out', 'index.html');
const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), 'aws-emulator-e2e-'));
const downloadedIndex = path.join(temporaryDirectory, 'index.html');
const environment = {
  ...process.env,
  AWS_EMULATOR_E2E_DOMAIN: domainName,
  CDK_DEFAULT_ACCOUNT: '000000000000',
  CDK_DEFAULT_REGION: 'us-east-1',
  AWS_REGION: 'us-east-1',
  AWS_DEFAULT_REGION: 'us-east-1',
};

function run(command, args, cwd = cdkDirectory) {
  const result = spawnSync(command, args, {
    cwd,
    env: environment,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}`);
  }
}

function runCdk(args, app) {
  const appArguments = app ? ['--app', app] : [];
  run(cdk, [...appArguments, ...args]);
}

try {
  if (!readFileSync(builtIndex).length) {
    throw new Error(`The static export is empty: ${builtIndex}`);
  }

  const awsVersion = spawnSync('aws', ['--version'], {
    env: environment,
    encoding: 'utf8',
  });
  if (awsVersion.error || awsVersion.status !== 0) {
    throw new Error('AWS CLI is required for the emulator end-to-end test.');
  }

  runCdk(
    ['bootstrap', 'aws://000000000000/us-east-1', '--require-approval', 'never'],
    zoneApp,
  );
  runCdk(
    ['deploy', 'AwsEmulatorE2EZoneStack', '--require-approval', 'never'],
    zoneApp,
  );

  runCdk([
    'deploy',
    '--all',
    '--require-approval',
    'never',
    '--context',
    `domainName=${domainName}`,
    '--context',
    'certificateArn=arn:aws:acm:us-east-1:000000000000:certificate/00000000-0000-0000-0000-000000000000',
  ]);

  const bucketName = `${domainName}-static-website`;
  run(
    'aws',
    [
      's3api',
      'get-object',
      '--bucket',
      bucketName,
      '--key',
      'index.html',
      downloadedIndex,
      '--no-cli-pager',
    ],
    repositoryRoot,
  );

  const builtContents = readFileSync(builtIndex);
  const deployedContents = readFileSync(downloadedIndex);
  if (!builtContents.equals(deployedContents)) {
    throw new Error('The S3 object deployed by CDK does not match out/index.html.');
  }

  const cloudFront = spawnSync(
    'aws',
    ['cloudfront', 'list-distributions', '--output', 'json', '--no-cli-pager'],
    { cwd: repositoryRoot, env: environment, encoding: 'utf8' },
  );
  if (cloudFront.error) throw cloudFront.error;
  if (cloudFront.status !== 0) {
    throw new Error('Could not list CloudFront distributions in AWS Emulator.');
  }
  const distributionList = JSON.parse(cloudFront.stdout).DistributionList?.Items ?? [];
  const distributionFound = distributionList.some((distribution) =>
    distribution.Aliases?.Items?.includes(domainName),
  );
  if (!distributionFound) {
    throw new Error(`No CloudFront distribution was created for ${domainName}.`);
  }

  process.stdout.write(
    `AWS Emulator E2E passed: ${bucketName}/index.html matches the static export, and CloudFront has the ${domainName} alias.\n`,
  );
} finally {
  if (hadContextFile) {
    writeFileSync(contextFile, originalContext);
  } else {
    rmSync(contextFile, { force: true });
  }
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
