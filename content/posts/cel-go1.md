---
title: "cel-goで一番シンプルな例を動かしてみる"
date: "2024-03-20"
lastmod: "2024-03-20"
tags: ["memo", "kubernetes"]
---

<https://www.drumato.com/ja/posts/validating-admission-policy/> で触れたように、
google/celはシンプルで汎用性を持った言語仕様を持っており、
新しくなにかソフトウェアを作るときに、設定ファイルのインタフェースとしてとても良いのではないかと感じた。

今回はこのgoogle/celの仕様をもとに実装された <https://github.com/google/cel-go> を使い、
簡単なサンプルを動かしてみることにする。

## 本題

ここでは、以下のようなJSONファイルに対してCELの条件式を記述し、
Goプログラム内でコンパイル、評価してtrueかfalseを出力する、ということをやってみる。

```json
{
  "apiVersion": "apps/v1",
  "kind": "Deployment",
  "metadata": {
    "name": "nginx",
    "labels": {
      "app": "nginx"
    }
  },
  "spec": {
    "replicas": 3,
    "selector": {
      "matchLabels": {
        "app": "nginx"
      }
    },
    "template": {
      "metadata": {
        "labels": {
          "app": "nginx"
        }
      },
      "spec": {
        "containers": [
          {
            "name": "nginx",
            "image": "nginx:1.14.2",
            "ports": [
              {
                "containerPort": 80
              }
            ]
          }
        ]
      }
    }
  }
}
```

コードはここに。

<https://github.com/Drumato/blog_samples/tree/main/2024/03/cel-go1>

Go内でcelの処理系や評価器を動かすためにやることは以下。

- **Environment** を初期化する
  - <https://pkg.go.dev/github.com/google/cel-go@v0.20.1/cel#NewEnv>
  - CELに対してプラグインを定義して拡張することが可能
  - 例えばKubernetesでは [URLをうまく表現して扱う](https://pkg.go.dev/k8s.io/apiserver/pkg/cel/library#URLs) ようなプラグインを作り、提供している
- 環境下でCELプログラムをコンパイルする
  - これにより [Ast](https://pkg.go.dev/github.com/google/cel-go@v0.20.1/cel#Ast) が得られる
- `Program` 構造体を用意し、評価器にわたす
  - 

ここまでの内容をもとに、コードを紹介する。

```go
package main

import (
	"context"
	"fmt"
	"os"
	"reflect"

	"github.com/google/cel-go/cel"
	"github.com/google/cel-go/checker"
	"github.com/google/cel-go/ext"
	"github.com/google/cel-go/interpreter"

	"google.golang.org/protobuf/types/known/structpb"
	"k8s.io/apimachinery/pkg/util/yaml"
)

func main() {
	args := os.Args
	f, err := os.Open("deployment.json")
	if err != nil {
		panic(err)
	}
	defer f.Close()

	deployment := map[string]any{}
	if err := yaml.NewYAMLOrJSONDecoder(f, 4096).Decode(&deployment); err != nil {
		panic(err)
	}

	celEnvOptions := []cel.EnvOption{
		cel.HomogeneousAggregateLiterals(),
		cel.EagerlyValidateDeclarations(true),
		cel.DefaultUTCTimeZone(true),

		cel.CrossTypeNumericComparisons(true),
		cel.OptionalTypes(),

		cel.ASTValidators(
			cel.ValidateDurationLiterals(),
			cel.ValidateTimestampLiterals(),
			cel.ValidateRegexLiterals(),
			cel.ValidateHomogeneousAggregateLiterals(),
		),

		ext.Strings(ext.StringsVersion(2)),
		ext.Sets(),

		cel.CostEstimatorOptions(checker.PresenceTestHasCost(false)),
	}
	for k := range deployment {
		celEnvOptions = append(celEnvOptions, cel.Variable(k, cel.DynType))
	}
	env, err := cel.NewEnv(celEnvOptions...)
	if err != nil {
		panic(err)
	}
	ast, issues := env.Compile(args[1])
	if issues != nil {
		panic(issues.String())
	}

	celProgramOptions := []cel.ProgramOption{
		cel.EvalOptions(cel.OptOptimize, cel.OptTrackCost),
		cel.CostTrackerOptions(interpreter.PresenceTestHasCost(false)),
	}

	prog, err := env.Program(ast, celProgramOptions...)
	if err != nil {
		panic(err)
	}

	val, _, err := prog.ContextEval(context.Background(), deployment)
	if err != nil {
		panic(err)
	}

	value, err := val.ConvertToNative(reflect.TypeOf(&structpb.Value{}))
	if err != nil {
		panic(err)
	}

	fmt.Println(value.(*structpb.Value).GetBoolValue())
}
```

ここではJSONの読み込み結果をuntypedな形にデコードして、それを環境に定義したあとに評価プロセスを動かしている。
実行してみると、次のようになる。

```shell
❯ go build -o main ./simple/
❯ ./main "spec.replicas != 1"
true
❯ ./main "spec.replicas != 3"
false
```

期待通りの値っぽい。
関数定義したり、というのも諸々行えるが、一旦はここまで。

## まとめ

CEL(およびcel-go)、とても便利かもしれない...  
ほとんどの｢設定等にプログラムを埋め込んでうまくハンドリングしたい｣というケースをカバーするには十分な仕様であるし、
仕組みも揃っていて、かつKubernetesという非常に大きなユースケースが存在するので、使用する上での心理的ハードルも低い。

## 次回

そろそろ趣味で作っているカスタムコントローラが最小のデモを動かせるようになりそうなので、
次回はそれについて紹介する予定。

## 参考文献

- <https://github.com/google/cel-go>
- <https://pkg.go.dev/github.com/google/cel-go@v0.20.1>
- <https://playcel.undistro.io/>
