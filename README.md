# Next.js + AWS CDK (CloudFront + S3) プロジェクト

このプロジェクトは、Next.js で構築された静的サイトを AWS CDK を使用して CloudFront + S3 構成でホスティングするためのテンプレートです。

## 開発環境のセットアップ

### 前提条件

- Node.js (v16以上)
- AWS CLI がインストールされ、設定済み
- AWS CDK がインストールされていること (`npm install -g aws-cdk`)

### ローカル開発

開発サーバーを起動します:

```bash
npm run dev
# または
yarn dev
# または
pnpm dev
```

[http://localhost:3000](http://localhost:3000) をブラウザで開いて結果を確認できます。

`pages/index.tsx` を編集することでページの編集を開始できます。ファイルを編集すると、ページが自動的に更新されます。

## AWS へのデプロイ

### 1. 環境設定

`cdk/.env` ファイルにドメイン名を設定します:

```
DOMAIN_NAME=example.com
```

注意: Route53 でドメインが登録済みであることを確認してください。

### 2. Next.js アプリケーションのビルド

静的サイトとして Next.js アプリケーションをビルドします:

```bash
npm run build
# または
yarn build
```

これにより、`out` ディレクトリに静的ファイルが生成されます。

### 3. AWS CDK のデプロイ

初めて CDK をデプロイする場合は、ブートストラップが必要です:

```bash
cd cdk
cdk bootstrap
```

その後、CDK スタックをデプロイします:

```bash
cd cdk
cdk deploy
```

デプロイが完了すると、CloudFront のドメイン名と設定したカスタムドメインの URL が表示されます。

### 4. DNS の伝播を待つ

Route53 の DNS 変更が伝播するまで数分から数時間かかる場合があります。その後、設定したドメイン名でウェブサイトにアクセスできるようになります。

## GitHub Actions を使用したデプロイ

このプロジェクトでは、GitHub Actions を使用して CI/CD パイプラインを構築しています。手動トリガーでデプロイを実行できます。

### 1. GitHub Secrets の設定

GitHub リポジトリの Settings > Secrets and variables > Actions で以下のシークレットを設定します:

- `AWS_ACCESS_KEY_ID`: AWS アクセスキー ID
- `AWS_SECRET_ACCESS_KEY`: AWS シークレットアクセスキー
- `AWS_REGION`: AWS リージョン（例: `ap-northeast-1`）

注意: AWS IAM ユーザーには、CloudFront、S3、Route53、ACM などの必要なサービスへのアクセス権限が必要です。

### 2. 手動デプロイの実行

1. GitHub リポジトリの "Actions" タブに移動します
2. 左側のサイドバーから "Deploy" ワークフローを選択します
3. "Run workflow" ボタンをクリックします
4. "Run workflow" ボタンをクリックしてデプロイを開始します

デプロイが完了すると、ワークフローの実行ログで結果を確認できます。

## アーキテクチャ

このプロジェクトは以下の AWS リソースを使用しています:

- **S3 バケット**: Next.js の静的ビルド成果物を保存
- **CloudFront**: コンテンツ配信とキャッシュ
- **Route53**: DNS 設定
- **ACM**: SSL/TLS 証明書

## 更新とメンテナンス

コンテンツを更新する場合は、Next.js アプリケーションを再ビルドし、CDK スタックを再デプロイします:

```bash
# Next.js アプリケーションをビルド
npm run build

# CDK スタックをデプロイ
cd cdk
cdk deploy
```

## トラブルシューティング

- **証明書の検証エラー**: ACM 証明書の検証に時間がかかる場合があります。Route53 のホストゾーンが正しく設定されていることを確認してください。
- **アクセス権限エラー**: AWS CLI の設定が正しいことを確認し、必要な IAM 権限があることを確認してください。
- **デプロイエラー**: CDK デプロイログを確認して、具体的なエラーメッセージを確認してください。
