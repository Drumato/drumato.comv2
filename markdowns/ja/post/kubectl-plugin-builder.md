---
title: "Kubectl Plugin Builder"
description: "kubectl pluginをpracticalに実装するideaを紹介します."
createdAt: "2021-12-06"
tags: ["kubernetes", "go", "kubectl"]
imageLink: "/Drumato.png"
---

- [Background](#background)
  - [kubectl pluginとは](#kubectl-pluginとは)
  - [kubectl pluginの作り方](#kubectl-pluginの作り方)
  - [Goでkubectl pluginを作ることで見えてくる問題](#goでkubectl-pluginを作ることで見えてくる問題)
- [kubectl-plugin-builder](#kubectl-plugin-builder)
  - [簡単な使い方](#簡単な使い方)
  - [今後の展望](#今後の展望)
- [Conclusion](#conclusion)
- [References](#references)

この記事は [IPFactory Advent Calendar 2021](https://qiita.com/advent-calendar/2021/ipfactory) の11日目です．
私がIPFactoryとして活動するのは今年度が最後なので，何かしら技術的知見が残せればと思って執筆しています．  

ご存知の通り，Kubernetesはたくさんの拡張性をuserに提供しています．
これは [公式document](https://kubernetes.io/docs/concepts/extend-kubernetes/) でも紹介されています．  

|        Extensibility        |                                        Description                                        |
| :-------------------------: | :---------------------------------------------------------------------------------------: |
|      Custom Controller      |                        独自にresource reconcilerを記述できる仕組み                        |
|             CRD             | OpenAPI Schemaをもとに，新たなresourceを定義できるような機能で，CRD自体が組み込みresource |
|      Admission Webhook      |     API request時にValidation/Mutationを行えるようなWebhook Serverを建てられる仕組み      |
| Kubernetes Scheduler Plugin |     NodeのScoring/Filtering algorithmに影響を与え，Pod Schedulingの挙動を変更する機能     |
|         CNI Plugin          |      flannelやCalicoに代表される，Container Networkingを実現するためのPluggable機構       |

これと同じように，Kubernetes運用者のほとんどが使用する **kubectl** でも拡張性が提供されています．
それを **kubectl plugin** といい，それを開発/利用することで運用を効率化できます．  

本記事ではこのkubectl pluginについて紹介しつつ，
kubectl plugin開発に関連する話題を取り上げて，
最終的に私が開発しているcode generatorを解説します．  

---

## Background

### kubectl pluginとは

ここではkubectl pluginについて復習します．
kubectl pluginとはその実ただの実行形式です．
kubectl本体が認識できるpathに置かれ， `kubectl-*` という命名がされていればkubectl pluginとして扱われます．
[公式document](https://kubernetes.io/docs/concepts/extend-kubernetes/)ではShell Scriptで実装する例が紹介されています．
kubectl pluginの利点はいくつかありますが，Kubernetes運用者にとって，kubectl本体のcommandと自作のoperation toolを統一的に扱えるのは非常に便利です．
`kubectl plugin list` でどのようなpluginがinstallされているか確認することもできます．  

著名なkubectl pluginの一つに，**[postfinance/kubectl-ns](https://github.com/postfinance/kubectl-ns)** があります．
[kubernetes/sample-cli-plugin](https://github.com/kubernetes/sample-cli-plugin)の題材でもありますし，
[awesome-kubectl-plugins](https://github.com/ishantanu/awesome-kubectl-plugins)でも紹介されています．
kubeconfigにはcontextを埋め込めるfieldが存在しますが，
そのうちnamespaceの情報を簡単に扱うためのpluginです．  

kubectl-nsは多くのことを成し遂げないtoolに見えますが，
個人的には， **小さな仕事を実現するpluginを組み合わせる** という作り方がとても良いと思っています．
この理由は後述します．

### kubectl pluginの作り方

先程述べたように，kubectl plugin自体はただのexecutableであるため，
shell scriptやPythonにGoなど，特定の言語に限らず実装することができます．
よってここでは，私が考える **kubectl pluginをうまく実装する方法** にfocusしたいと思います．
私はGoで，かつ [spf13/cobra](https://github.com/spf13/cobra) などのCLI application builderを使用して開発するのを強くおすすめします．  

第一に，Kubernetesの運用者にとっての最も大きな関心は **Kubernetesの運用を簡単に便利にする** というものであり，
それをどのように構築するかについてはあんまりcostを割きたくないからです．これは **本当に小さなpluginはshell script等でサクッと作るべき** という主張にも見えますが，どちらかというと **小さくても，scaleしても管理しやすい言語でやったほうが良い** ということを意味しています．
この発想から， **小さなpluginを組み合わせる** 方法の利点も見えてくると思います．  

第二に，GoはKubernetes Ecosystemのほとんどすべてが採用している言語であり，
Kubernetes Engineerにとって親しい言語だと言えるからです．
kube-apiserverやkube-scheduler, kubectl本体などのcore componentなどもGoで書かれています．
operation toolであると考えたとき，新しくteamに入ってきたmemberがすぐに使えるほうが便利です．
これは，その分野でmainstreamとなっている言語で開発する利点を活かした形です．  

最後に，kubectl pluginのほとんどが実際にGoで開発されており，
更にそれら殆どがcobraを使用している，という点です．
kubectl pluginは **case by caseで必要なものが異なる** という点から実例を起点とした文献がほとんどですが，
多くの実装は公開されているため，それらを参照して書くということがやりやすくなります．  

### Goでkubectl pluginを作ることで見えてくる問題

いざGoでkubectl pluginを書こうとしたとき，いくつかのboilerplateが必要であることがわかります．

- client-goの初期化処理
- cli-runtimeの初期化処理
  - `-n/--namespace` などに代表される汎用的なcli flagの利用
- `Complete/Validate/Run` という，kubectl plugin implsで頻出するpractice

これらは一度書くだけなら特に難しくないですが，
やはり何度も書くと退屈な部分になってきますし，
この書き方が微妙に異なることで素早く理解/改修できないと困ります．
また，kubectl pluginも一般的にAPI clientを初期化して使用しますが，
maintainabilityの高いpluginを開発するためにはいい感じにinterfaceを整備して，
testableに開発する，みたいなことが必要になってきます．
しかし，これをきれいに設計して，というのも一種のcostとして考えられます．  

---

## kubectl-plugin-builder

そこで，私はkubebuilder(本記事では解説しません)の思想や実績を参考にして，
kubectl pluginの開発をサクッと始められるものを作り始めました．
kubebuilderほどKubernetes communityで認められるものにできるかはわかりませんが，
少なくともidea自体はだいぶ便利な自負があるので，これからも開発は継続していきます．
実装は [GitHub](https://github.com/Drumato/kubectl-plugin-builder) においてあります．
また，かんたんな使い方については[Document](https://github.com/Drumato/kubectl-plugin-builder/blob/main/docs/introduction.md)を書いています．
主な機能は次のとおりです．

- project初期化機能
- cli application architectureをyamlから宣言的に生成する機能
  - flag
  - command alias
- yamlに新しいcommand definitionを追加する機能
- pluginの出力formatを制御する機構

高々数k行の実装なのですぐ理解できると思いますし，
実装を読まなくても適当にcommand打って生成されたfile眺めてたらわかります．

### 簡単な使い方

まずは適当なdirectoryでprojectを初期化します．

```shell
$ mkdir kubectl-demo && cd kubectl-demo
$ kubectl-plugin-builder new github.com/Drumato/kubectl-demo
Initialization Complete!
Run `go mod tidy` to install third-party modules.
```

するといくつかのfileが生成されます．
`kubectl-plugin-builder new` 実行直後のprojectは以下のような構成になっています．  

```shel
$ tree
.
├── cli.yaml
├── cmd
│   └── kubectl-demo
│       └── main.go
├── go.mod
├── internal
│   └── cmd
│       ├── demo
│       │   ├── command.go
│       │   └── handler.go
│       └── node.go
├── LICENSE
└── Makefile

5 directories, 8 file
```

- `cli.yaml` ... pluginのCLI app architectureを定義するspec
  - `make generate(kubectl-plugin-builder generate)` で使用される
- `LICENSE` ... 現在はMITのみ対応している
- `Makefile` ... 開発に便利なtaskを持つtask runner
  - `format` ... すべてのGo packageのformat
  - `test` ... すべてのGo packageのtest
  - `build` ... plugin build
  - `generate` ... 宣言的にGo filesを生成する
  - `install` ... pluginを `INSTALL_DIR` にinstallする(defaultだと `/usr/bin`)
- `internal/cmd/node.go` ... `CLINodeOptions` interfaceを定義するfile
  - plugin内のすべてのcommandがこのinterfaceを実装していることを仮定する
- `internal/cmd/demo` ... root commandの定義
- `cmd/kubectl-demo/main.go` ... the plugin's entrypoint

もちろんこの段階でbuildすることができます．  

```shell
$ go mod tidy
$ make > /dev/null
$ ./kubectl-demo -h
Usage:
  demo [flags]

Flags:
  -h, --help            help for demo
  -o, --output string   the command's output mode (default "normal")
```

さて，それぞれのfileについて紹介します．
まず `cmd/kubectl-demo/main.go` からです．  

```go
// Code generated by kubectl-plugin-builder.
package main

import (
        "fmt"
        "github.com/Drumato/kubectl-demo/internal/cmd/demo"
        "os"

        "k8s.io/cli-runtime/pkg/genericclioptions"
)

func main() {
        streams := genericclioptions.IOStreams{
                In:     os.Stdin,
                Out:    os.Stdout,
                ErrOut: os.Stderr,
        }

        if err := demo.NewCommand(&streams).Execute(); err != nil {
                fmt.Fprintf(os.Stderr, "ERROR: %+v\n", err)
                os.Exit(1)
        }
}
```

ここで `genericclioptions.IOStreams` のinstanceを渡します．
これは各commandがtestを書く場合を想定して，I/O Captureのために渡している感じです．
testの際には `IOSTreams.Out` に `bytes.Buffer` などを渡せば，出力結果をtestすることができます．
次に `internal/cmd/node.go` です．

```go
// Code generated by kubectl-plugin-builder.

/* MIT License
 *
 * Copyright (c) 2021 you
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
package cmd

import (
        "github.com/spf13/cobra"
)

type CLINodeOptions interface {
        Complete(cmd *cobra.Command, args []string) error
        Validate() error
        Run() error
}

type OutputMode = string

const (
        OutputModeNormal OutputMode = "normal"
        // OutputModeJSON
        // OutputModeYAML
)
```

ここでは `CLINodeOptions` interfaceの定義と，
`OutputMode` と呼ばれる，各commandの出力結果を制御するための型が出力されます．
すべてのcommandがこのinterfaceを実装するようになっているので，
自動的に `Complete/Validate/Run` modelを踏襲することができる，というわけです．
`Code generated by kubectl-plugin-builder.` と `// Code generated by kubectl-plugin-builder; DO NOT EDIT.` の区別があり，
前者の場合はuserによる更新を許容していて，後者は宣言的にreplaceされ続けます．
実際のcommand定義である `internal/cmd/demo/command.go` を見てみましょう．  

```go
$ cat internal/cmd/demo/command.go
// Code generated by kubectl-plugin-builder; DO NOT EDIT.

/* MIT License
 *
 * Copyright (c) 2021 you
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
package demo

import (
        "github.com/spf13/cobra"

        "github.com/Drumato/kubectl-demo/internal/cmd"
        "k8s.io/cli-runtime/pkg/genericclioptions"
)

var (
        // demoOutputModeFlag provides
        // user-passed option to options.
        demoOutputModeFlag string
)

// WARNING: don't rename this function.
func NewCommand(streams *genericclioptions.IOStreams) *cobra.Command {
        c := &cobra.Command{
                Use: "demo",

                Aliases: []string{},

                RunE: func(cmd *cobra.Command, args []string) error {
                        o := &options{streams: streams}
                        if err := o.Complete(cmd, args); err != nil {
                                return err
                        }

                        if err := o.Validate(); err != nil {
                                return err
                        }

                        return o.Run()
                },
        }

        hangChildrenOnCommand(c, streams)
        defineCommandFlags(c)

        return c
}

// hangChildrenOnCommand enumerates command's children and attach them into it.
func hangChildrenOnCommand(c *cobra.Command, streams *genericclioptions.IOStreams) {
}

// defineCommandFlags declares primitive flags.
func defineCommandFlags(c *cobra.Command) {
        c.Flags().StringVarP(
                &demoOutputModeFlag,
                "output",
                "o",
                cmd.OutputModeNormal,
                "the command's output mode",
        )
}
```

`*cobra.Command` を返す関数を定義しています． `cmd/kubectl-demo/main.go` で呼び出されるものです．
このGo fileの内容は `cli.yaml` によって決まります．  

```yaml
license: MIT
packageName: github.com/Drumato/kubectl-demo
root:
  name: demo
  year: 2021
  author: you
  defPath: internal/cmd/demo
  children:
```

最後に `internal/cmd/demo/handler.go` を紹介します．
これは `internal/cmd/demo/command.go` で呼び出される `Complete/Validate/Run` の実装がおいてあり，
userが好きに変更することを想定しています．inplaceに書き換わってしまうことはありません．  

```go
// Code generated by kubectl-plugin-builder.

/* MIT License
 *
 * Copyright (c) 2021 you
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
package demo

import (
        "fmt"

        "github.com/Drumato/kubectl-demo/internal/cmd"
        "github.com/spf13/cobra"
        "k8s.io/cli-runtime/pkg/genericclioptions"
)

// this assignment ensures
// options struct must implement CLINodeOptions interface.
var _ cmd.CLINodeOptions = &options{}

type options struct {
        cmd        *cobra.Command
        args       []string
        streams    *genericclioptions.IOStreams
        outputMode cmd.OutputMode
}

// Complete implements CLINodeOptions interface.
func (o *options) Complete(cmd *cobra.Command, args []string) error {
        o.cmd = cmd
        o.args = args
        o.outputMode = demoOutputModeFlag
        return nil
}

// Validate implements CLINodeOptions interface.
func (o *options) Validate() error {
        return nil
}

// Run implements CLINodeOptions interface.
func (o *options) Run() error {
        switch o.outputMode {
        // case cmd.OutputModeJSON:
        // case cmd.OutputModeYAML:
        case cmd.OutputModeNormal:
                _, err := fmt.Fprintf(o.streams.Out, "%s\n", o.cmd.Use)
                return err
        }

        return fmt.Errorf("unsupported output format '%s' found", o.outputMode)
}
```

次に `cli.yaml` を書き換えて宣言的に生成してみます．  

```yaml
license: MIT
packageName: github.com/Drumato/kubectl-demo
root:
  name: demo
  year: 2021
  author: you
  defPath: internal/cmd/demo
  flags:
  - name: flag1 # added
    type: string
    description: controls root command behavior
  - name: flag2 # added
    type: string
    description: controls root command behavior
  children:
  - name: subcmd1
    year: 2021
    author: you
    defPath: internal/cmd/demo/subcmd1
  - name: subcmd2
    year: 2021
    author: you
    defPath: internal/cmd/demo/subcmd2
```

```shell
$ make > /dev/null
$ ./kubectl-demo -h
Usage:
  demo [flags]
  demo [command]

Available Commands:
  completion  generate the autocompletion script for the specified shell
  help        Help about any command
  subcmd1
  subcmd2

Flags:
      --flag1 string    controls root command behavior
      --flag2 string    controls root command behavior
  -h, --help            help for demo
  -o, --output string   the command's output mode (default "normal")

Use "demo [command] --help" for more information about a command.
```

このように，cobra CLI applicationのconstruction，つまりcommand同士の親子関係もうまく扱ってくれます．

### 今後の展望

ここまでで基盤となるbuilder部分は作れたと思うので，
あとはcmd argを自動でparseしてくれるようにしたり，`client-go/pkg/clientset` の初期化をしてくれたりという，
開発する上で便利な細々としたcode生成，
そして `tests/spec.yaml` に書いた期待出力からそれをtestする `internal/cmd/<CMD_NAME>/handler_test.go` を自動生成するといった機能を作ろうと思っています．

---

## Conclusion

本日はkubectl pluginについての関心事から紹介しつつ，
私が開発しているkubectl-plugin-builderを紹介しました．
よろしかったらこれを使って遊んでみてください!

## References

- [Extend kubectl with plugins](https://kubernetes.io/docs/tasks/extend-kubectl/kubectl-plugins/)
