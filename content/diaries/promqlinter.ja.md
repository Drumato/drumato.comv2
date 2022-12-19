---
date: "2022-12-18"
lastmod: "2022-12-18"
title: "PromQL Linterをつくった"
tags: ["prometheus"]
---

## 概要

- promqlinterというlinterを作った
  - 構文検査を行ってくれる
  - デフォルトで組み込むべきLintルールを募集しています
  - GitHub Actionsで使えることを想定しています
- PromQL Linter Frameworkを作った
  - 追加で、ユーザ独自にLintルールをつなぎ込めるようになっています

## 背景

最近、業務でPrometheusを触っているのですが、
PromQLに慣れていないことから、組み込み関数に関する型検査でエラーを出してしまったり、
そもそもどんな演算が利用できるのかわかっていなかったりします。

私はなにか新しいプログラミング言語を勉強しようと思ったとき、
それについての公式ドキュメントや構文仕様を読んで勉強することが多いのですが、
PromQLも例にもれず、なんとなくパーサを書いてみようかな?と思っていました。

また、業務では[Prometheus Operator](https://prometheus-operator.dev/)を利用した宣言的なアラート管理を行ったりしています。
その関係で、Kubernetesマニフェスト内のPromQLをうまく検査できるツールを作ることにしました。
業務については、先日発表したこちらのスライドが参考になります。

<https://speakerdeck.com/drumato/activities-about-kubernetes-operation-improvements-as-an-sre>

## 実装

結局パーサは自作ではなく、Prometheusコミュニティのものを流用することにしたのですが、
このパッケージにより、構文エラーだけではなく、組み込み関数の型検査等も行ってくれることがわかりました。

これをうまく利用できるツールとして、 **promqlinter** を開発しました。
コンセプトが思い浮かんでから2日で実装したので、まだまだ機能は少ないですが。

<https://github.com/Drumato/promqlinter>

![img1.png](https://github.com/Drumato/promqlinter/raw/main/doc/example.png)

現在、主な機能として以下を備えています。

- 標準入力から、パイプでつなげて使えるようにしている
- PrometheusOperatorの `PrometheusRule` リソースにも対応している
  - CRDのexprフィールドを探索して、このLinterを起動
- エラーの箇所は、色付きで、わかりやすいフォーマット付きで表示

## PromQL Linter Frameworkについて

このプロジェクトで利用している仕組みとして、
ユーザが独自にLintルールを追加できる、 **PromQL Linter Framework** というものを用意しています。
といっても、単にGo interfaceで好きにLintルールが挟み込めるようになっているというだけの、シンプルなものです。

```go
// pkg/linter/plugin.go
package linter

import "github.com/prometheus/prometheus/promql/parser"

// PromQLinterPlugin is an interface that all linter plugin must implement.
type PromQLinterPlugin interface {
	// Name represents the name of the plugin.
	// the name is used in the reporting message from the linter.
	Name() string
	// Execute lints the PromQL expression.
	Execute(expr parser.Expr) (Diagnostics, error)
}
```

すべてのLintルールは、上記インタフェースを実装するようにするだけで、このFrameworkに挟み込むことができます。
例えば、 `examples/dummy` には、独自のルールを用意するサンプルが置いてあります。
このdummy pluginも、構文検査の恩恵が受けられる点と、
`pkg/linter.Diagnostic` の利用により、フォーマットされたエラーメッセージを利用できる点が便利です。

```go
// examples/dummy/main.go

package main

import (
	"fmt"
	"os"

	"github.com/Drumato/promqlinter/pkg/linter"
	"github.com/prometheus/prometheus/promql/parser"
)

type samplePlugin struct{}

// Execute implements linter.PromQLinterPlugin
func (*samplePlugin) Execute(expr parser.Expr) (linter.Diagnostics, error) {
	ds := linter.NewDiagnostics()
	ds.Add(linter.ColoredInfoDiagnostic(
		parser.PositionRange{},
		"foo",
	))
	ds.Add(linter.ColoredInfoDiagnostic(
		parser.PositionRange{},
		"bar",
	))
	ds.Add(linter.ColoredInfoDiagnostic(
		parser.PositionRange{},
		"baz",
	))

	return ds, nil
}

// Name implements linter.PromQLinterPlugin
func (*samplePlugin) Name() string {
	return "sample-plugin"
}

var _ linter.PromQLinterPlugin = &samplePlugin{}

func main() {
	l := linter.New(
		linter.WithPlugin(&samplePlugin{}),
		linter.WithOutStream(os.Stdout),
	)
	result, err := l.Execute("http_requests_total", linter.DiagnosticLevelWarning)
	if err != nil {
		fmt.Fprintf(os.Stderr, "%+v\n", err)
		os.Exit(1)
	}

	if result.Failed() {
		os.Exit(1)
	}
}
```

## GitHub Actions

業務では、このpromqlinterをCIに組み込んで、
Kubernetesマニフェスト内のPromQL Expressionが構文エラーを起こしていないかチェックさせようとしています。
そのために、本プロジェクトには `action.yml` を配置しています。

## おわりに

今回は、promqlinterというツールと、それが提供するフレームワークについてご紹介しました。
GitHub Actions及びツールはOSSとして公開しているので、
ぜひフィードバック頂けますと幸いです。

特に、promqlinterにデフォルトで導入してほしいLintルール等の要望があれば、
是非Issueでご共有ください。
