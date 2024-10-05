---
title: "net/httpでAWS APIにGETリクエストするときのペイロードハッシュ"
date: "2024-10-05"
lastmod: "2024-10-05"
tags: ["memo", "go"]
---

最近業務で､aws-sdk-go-v2では実装されていないものの提供されているAPIがあって､
それをnet/httpのクライアントからリクエストする方法を調べたのでメモとして残す｡

## 前提

AWS APIを呼び出すにはリクエストに認証情報で署名する必要がある｡
これについては以下の記事が大変わかりやすかったので､ここでは説明を省く｡

- [AWSのAPIを理解しよう!中級編 ~ リクエストの署名や CLI/SDK の中身を覗いてみる - aws.amazon.com](https://aws.amazon.com/jp/builders-flash/202210/way-to-operate-api-2/)
- [API リクエストに対する AWS Signature Version 4 - docs.aws.amazon.com](https://docs.aws.amazon.com/ja_jp/IAM/latest/UserGuide/reference_aws-signing.html)

具体的な実装については､AWS SDKの[signer/v4](https://github.com/aws/aws-sdk-go-v2/tree/main/aws/signer/v4)を読むのがとても勉強になった｡

## 本題

上記で紹介した記事で説明されているように､APIリクエストにはペイロードをSHA256でハッシュ化しHex-Encodingを適用したものを含める｡
送りたいAPIリクエストのメソッドがGETのときはボディを付与しないが､
この際にも空の文字列に対してもSHA256を適用する｡

とはいえ､SHA256は決定性があるので､いちいち計算しなくても良い｡
ということで､ `signer/v4/Signer.SignHTTP()` では固定値がAPIドキュメントで紹介されている｡
この内容を利用して､ハッシュ計算を省略してAPIリクエストを送ることができる｡

```go
package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	v4 "github.com/aws/aws-sdk-go-v2/aws/signer/v4"
	"github.com/aws/aws-sdk-go-v2/config"
)

const hashedEmptyPayload = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

func main() {
	ctx := context.Background()
	cfg, err := config.LoadDefaultConfig(ctx)
	if err != nil {
		panic(err)
	}

	region := os.Getenv("AWS_REGION")
	s3BucketName := os.Getenv("AWS_S3_BUCKET_NAME")

	endpoint := s3GetObjectEndpoint(region, s3BucketName)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint+"/index.html", nil)
	if err != nil {
		panic(err)
	}
	creds, err := cfg.Credentials.Retrieve(ctx)
	if err != nil {
		panic(err)
	}
	req.Header.Set("x-amz-content-sha256", hashedEmptyPayload)

	signer := v4.NewSigner()
	if err := signer.SignHTTP(ctx, creds, req, hashedEmptyPayload, "s3", region, time.Now()); err != nil {
		panic(err)
	}

	client := http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	out, err := io.ReadAll(resp.Body)
	if err != nil {
		panic(err)
	}

	fmt.Println(string(out))
}

func s3GetObjectEndpoint(region string, bucketName string) string {
	return fmt.Sprintf("https://s3.%s.amazonaws.com/%s", region, bucketName)
}
```

