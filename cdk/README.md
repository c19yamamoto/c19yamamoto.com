#  Static Website with S3 and CloudFront

静的 Webサイトを S3 と CloudFront でホスティングするための AWS CDK。　　
Route53 でドメインを取得後、 `DOMAIN_NAME` に設定することで、ACM で SSL 証明書を取得し、ドメインのエイリアスを CloudFront に設定する。