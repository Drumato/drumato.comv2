---
title: "Online Summer Internship for Gophers 2020に参加しました"
date: "2020-09-04"
lastmod: "2020-09-04"
tags: ["static-analyzer", "go"]
---

お久しぶりです．  
2020/8/31 ~ 9/4の5日間に渡って開催された株式会社メルカリ様のインターンに参加しました．  
詳細は[こちらののページ](https://mercan.mercari.com/articles/22800/)を御覧ください．  

また，本インターンで使用されていた講義資料については，  
既に [**完全公開**](https://engineering.mercari.com/blog/entry/goforbeginners/) されています(ありがとうございます)．  

今回は本インターンに参加して勉強になったことや所感，  
講義資料に記載の課題や，自身の活動をまとめたいと思います．

<!-- more -->

## インターン概要

**Golangで学ぶ静的解析** を主なテーマに，  

- 前半2日間 ... Golangで静的解析を行う上で必要な知識のインプットやコード課題
  - **何故** 静的解析ツールを開発するのか
  - 実用的な静的解析ツールの例
  - Golangによる静的解析で頻繁に用いられる標準(準標準)パッケージの解説
  - 字句解析や構文解析などによって得られるデータ構造等，**静的解析に必要な前提知識**の解説
  - Golangに精通しているメンターさんだからこその言語仕様に関連した話題の紹介
- 後半3日間 ... 学んだことを生かして，実際に静的解析ツールを開発する
  - 自身でテーマを設定して取り組む
  - コーディング等で困ったことがあればメンターさんからサポートしていただける

という内容の予定でした．  
実際にはメンターさんの都合もあって開発の日にちが変更になりましたので，  
インプットとアウトプットの2つに分けて振り返りたいと思います．  

### 座学

記事冒頭に記載した資料をもとに，静的解析関連の知識を勉強しました．  
私は普段コンパイラ理論の勉強をしているので字句解析や構文解析，型検査やSSAについては多少の前提知識がありましたが，  
静的解析という目線ではただ｢データ構造を構築すること｣だけでなく，  
**ツールの目的** に応じてデータ構造を柔軟に利用することが求められることがわかり，勉強になりました．  

講義の具体的な内容についてはここでは触れません(講義資料が本当に素晴らしいので，そちらを参照ください)が，  
いくつか個人的に感じたことについて触れておきます．  
見たくない人は [開発セクション](#開発) まで読み飛ばしていただければ．  

#### Golangの良さ

私は最近，基本的にRust以外のプログラミング言語を触っていません．  
Atcoder等の解答にPythonを用いたり，ちょっとしたコード例としてHaskellを使うみたいなことはありますが，  
Golangをガッツリ触ったのは久しぶりなので，新鮮で楽しかったです．  

Golangの良さは既に語り尽くされていて，多くの人がブログ等で言及しているので，  
ここでは｢静的解析ツールを作る上で｣の利点について述べようと思っています．  

##### 標準パッケージの豊富さ･扱いやすさ

そんなことはもう知ってるよ! と思うかもしれませんが，改めて考えてみても優秀です．  
講義資料にも書いてありますが，静的解析ツールには  
フラットな **"ソースコード"** というテキストから **階層/親子構造** を抽出したり，  
識別子が参照する･される等の **依存関係** も解析する必要があります．  

そのために字句解析，構文解析，パッケージ間の依存グラフの構築等も必要になります．  
言語処理系をスクラッチで書いたことがある人はイメージしやすいと思いますが，  
これらアルゴリズムの実装には **多くのコスト** がかかり，  
かなりの労力を要します．  

しかし，GolangにはトークンやAST,構文解析や型関連の標準パッケージが存在します．  
また， `x/tools/go` 以下には静的解析系ツールやコールグラフ，CFGやSSA等の更に便利な機能が存在します．  
例えば，Golangのソースコードに対し構文解析を行い，インポートしているパッケージを表示するプログラムを見てみましょう．  

> 引用: [Example - ParseFile](https://golang.org/pkg/go/parser/#example_ParseFile)  

```go
package main

import (
	"fmt"
	"go/parser"
	"go/token"
)

func main() {
	fset := token.NewFileSet() // positions are relative to fset

	src := `package foo

import (
	"fmt"
	"time"
)

func bar() {
	fmt.Println(time.Now())
}`

	// Parse src but stop after processing the imports.
	f, err := parser.ParseFile(fset, "", src, parser.ImportsOnly)
	if err != nil {
		fmt.Println(err)
		return
	}

	// Print the imports from the file's AST.
	for _, s := range f.Imports {
		fmt.Println(s.Path.Value)
	}

}
```

このように非常にシンプルに解析資源を得られるので，  
静的解析ツールの書きやすさはかなり高いと思います．  

`x/tools/go/analysis` がその最たる例で， **静的解析ツールを開発するためのパッケージ** が用意されています．  
これについては上記講義資料に加えて，[こちらの記事](https://engineering.mercari.com/blog/entry/2018-12-16-150000/)も参考になると思います．   

このように，標準･準標準パッケージが豊富であり扱いやすいところからも，  
**Golangで静的解析ツールが書きやすい** と言えそうです．  

##### 静的解析ツールの開発しやすさ

実際に作り始めるにはいくつかのお作法が存在する静的解析ツールですが，  
本インターンのメンターである [@tenntennさん](https://twitter.com/tenntenn?s=20) も在籍する Org の  
[GoStaticAnalysis](https://github.com/gostaticanalysis) が [**雛形ジェネレータ**](https://github.com/gostaticanalysis/skeleton) を公開しています．  

使い方はREADMEや講義資料を参照してください．  
`skeleton` を利用すればすぐに静的解析ツールの開発を始める事ができます，非常に便利です．  
このあと紹介する課題を解く際に使ってみます．  

#### ｢ルールを作る場合はツールも作る｣

本インターンで一番共感した講義内容の一つです．  
講義資料の23ページに書かれています．  

コーディングルールやベストプラクティス，アンチパターンなど，  
プログラミング中に意識し，開発チーム内で注意しあわなければいけないことはいくつか存在します．  
(これは個人開発でも同様に重要だと考えています)  

これらを意識し続けることは簡単ではありません．  
コンパイルエラーが発生するのであれば特に大きな問題にはなりませんが，  
そういう訳ではないので｢無意識のうちに良くない書き方をする｣ということが考えられます．  

このようなミスを **エンジニアリングによって解決する** というのは非常にスマートで美しい考え方だと思います．  
GitのコミットやPRごとにCIが回るようにして，ルールに即した静的解析ツールが動く．  
そして自動的にアンチパターンを防げるようになれば，生産性は大幅に向上するはずです．  

学生で，かつ(長期インターン等を除き)個人の学習の範囲でしか開発していないような私からすると，  
このような **実際に業務で開発している人** の考え方に触れることができて，凄い勉強になりました．

#### 課題まとめ

ここからは，講義資料に記載されている課題について考え，実装してみたいと思います．  
本インターンの活動中には時間が足りず解答しきれなかったので，夜の時間等にちまちま解き進めていました．  

##### [構文解析でわかること，わからないこと](https://docs.google.com/presentation/d/1I4pHnzV2dFOMbRcpA-XD0TaLcX6PBKpls6WxGHoMjOg/edit#slide=id.g6298a0e67590aa1e_30)

- パッケージ変数の数
- ファイル中に定義されている構造体のフィールド名
- インポートしているファイルのパス

は構文解析で検出することができます．  
`go/ast` のAPIでは(おそらく)以下のように対応しています．

- パッケージ変数の数
  - `ast.File.Decls` のエントリを `*ast.GenDecl` にtype assertionし， `.Tok == token.VAR` を数える
- ファイル中に定義されている構造体のフィールド名
  - `ast.File.Decls` のエントリを `*ast.GenDecl` にtype assertionし， `.Tok == token.TYPE` を検査する
  - `ast.GenDecl.Specs` のエントリを `*ast.TypeSpec` にキャストし， `.Type` を `*ast.StructType` にキャストする
  - `go/types` から `Info.Defs` のマップを探索し，`types.Object.Type()` を `*types.Struct` にキャストして `NumFields()` 分ループ
- インポートしているファイルのパス
  - `ast.File.Imports` のエントリのそれぞれが， `$GOPATH/src` もしくは `$GOROOT/src` に存在するかどうかを調べれば良い
    - `$GOPATH/src` にはサードパーティ製パッケージが， `$GOROOT/src` には標準パッケージが存在

逆に，`context.Context` 型のフィールドを持つ構造体の検出は構文解析だけではできません．  
型チェックの機構やパッケージ解析を用いて， `std/context.Context` であるかどうか判断しないといけません．  
(別パッケージの `Context` 構造体をフィールドに持っている場合も，構文上は全く同じであり，ASTを探索するだけで検出できない)

##### [型チェックでわかること，わからないこと](https://docs.google.com/presentation/d/1I4pHnzV2dFOMbRcpA-XD0TaLcX6PBKpls6WxGHoMjOg/edit#slide=id.g6298a0e67590aa1e_36)

まず ｢`context.Context` 型のフィールドを持つ構造体の検出｣は型チェックで検出することができます．  
これについては[こちらのリポジトリ](https://github.com/gostaticanalysis/ctxfield)にそのまま同じ用途の静的解析ツールが存在するので，参考にすると良いでしょう．  

次に ｢使われていない非公開なパッケージ関数｣ ですが，これも構文解析や型チェックの情報で検出可能です．  
ASTを探索し，  

- 関数呼び出し
- 関数ポインタ代入
- 返り値に指定されているか

のいずれも行われていない場合を検出すれば良さそうです．

逆に， ｢`100 + 200` などの定数式の評価｣ は型チェックだけでは不可能です．  
`go/constants` のように定数評価器のパッケージを利用する等が必要です．  
講義資料には `go/types` や `go/constant` によって定数式の評価が可能と書いてあります．  
Golangのパッケージはとても優秀ですね．

また， ｢インタフェース型のメソッドを呼び出した場合のレシーバの実際の型｣ も型チェックだけでは難しいと思います．  
インタフェース型メソッドの呼び出しに渡される引数から **ポインタ解析( `golang.org/x/tools/go/pointer` )** を行う必要がありそうです．

##### [不要なパッケージ関数の判別](https://docs.google.com/presentation/d/1I4pHnzV2dFOMbRcpA-XD0TaLcX6PBKpls6WxGHoMjOg/edit#slide=id.g80c1410104_5_281)

パッケージ外部に公開されておらず，またどの関数からも呼び出されていないような関数の検出です．  
[こちらの課題](#型チェックでわかることわからないこと)で解き方を簡単に考察してみたので，これの通り実装してみましょう．  
ここからは静的解析ツールを実装する課題になるので， [gostaticanalysis/skeleton](https://github.com/gostaticanalysis/skeleton) の使い方も解説します．  

```go
package a

func a() { // want "unused function"
	println("a")
	b()
}
func b() { // OK
	println("b")
}
func B() { // OK
	println("B") 
}
```

における `a` のような関数を検出するのが目的．  

まずは `skeleton` をインストールし，静的解析ツールの雛形を作成しましょう．  

> Windows上で実行していますが，Golang製なのでその他多くの環境で動くはずです．

```text
$ go get -u github.com/gostaticanalysis/skeleton
$ skeleton try1
create try1\try1.go
create try1\try1_test.go
create try1\cmd\try1\main.go
create try1\plugin\main.go
create try1\testdata\src\a\a.go
```

このように，パッケージ名を指定するといい感じに雛形が作成されます．  
それぞれ解説します．  

- `cmd/try1/main.go` ... 静的解析ツールのエントリポイント
  - `cmd/pkgName` にエントリポイントを置くのはGolangの慣習
- `plugin/main.go` ... golangci-lint用のコード
- `testdata/src/a/a.go` ... 静的解析ツールのテストデータ
  - `testdata/src` 以下に適当にテストケースを置いていき `_test.go` を拡張すればガンガンTDDできる
  - 静的解析ツールはシンプルなケースから徐々に複雑なケースに対応できるように拡張する開発手法がやりやすい
- `try1.go` ... 実際の静的解析ロジック

`try1.go` の中身をいい感じに書き換えてみれば良さそうです．  
まずは以下のような実装方針に従って素朴に実装してみます．  

- パッケージ内に宣言されたunexportedな関数のマップを作る
- `CallExpr` を探索して，呼び出されている関数に対応するマップにマークする
- マップをイテレートして，マークのついていない関数を検出対象とする

```go
package try1

import (
	"go/ast"

	"golang.org/x/tools/go/analysis"
	"golang.org/x/tools/go/analysis/passes/inspect"
	"golang.org/x/tools/go/ast/inspector"
)

const doc = "try1 is ..."

// Analyzer is ...
var Analyzer = &analysis.Analyzer{
	Name: "try1",
	Doc:  doc,
	Run:  run,
	Requires: []*analysis.Analyzer{
		inspect.Analyzer,
	},
}

type identifier struct {
	base *ast.Ident
	used bool
}

func run(pass *analysis.Pass) (interface{}, error) {
	// 識別子 => 参照されているかのマップ
	usedFunctions := make(map[string]*identifier)

	inspect := pass.ResultOf[inspect.Analyzer].(*inspector.Inspector)

	// *ast.FuncDecl を探索し，対応する関数定義をマップに登録する
	visitAllFnDecl(usedFunctions, inspect)

	// *ast.CallExpr を探索し，マークを付ける
	markAsUsedToFuncs(usedFunctions, inspect)

	for _, id := range usedFunctions {
		if !id.used {
			pass.Reportf(id.base.Pos(), "unused function")
		}
	}

	return nil, nil
}

func visitAllFnDecl(ids map[string]*identifier, insp *inspector.Inspector) {
	insp.Preorder([]ast.Node{new(ast.FuncDecl)}, func(n ast.Node) {
		switch n := n.(type) {
		case *ast.FuncDecl:
			if n.Name.IsExported() {
				return
			}

			ids[n.Name.Name] = &identifier{base: n.Name, used: false}
		}
	})

}

func markAsUsedToFuncs(ids map[string]*identifier, insp *inspector.Inspector) {
	insp.Preorder([]ast.Node{new(ast.CallExpr)}, func(n ast.Node) {
		switch n := n.(type) {
		case *ast.CallExpr:
			id, ok := n.Fun.(*ast.Ident)
			if !ok {
				return
			}

			if _, exist := ids[id.Name]; !exist {
				return
			}

			ids[id.Name].used = true
		}
	})
}
```

このような素朴な実装でも，先述したテストをPASSすることができます．  
しかし，次のようなケースを検出することができません．  

```go
package b

func a() { // want "unused function"
	println("a")
	f := b
	f()
}

func b() { // OK
	println("b")
}

func B() { // OK
	println("B")
}
```

上記例のように， `b()` が直接呼び出されないケースがあるので，  
`*ast.CallExpr` だけの探索では不十分です．  
よって `*ast.Ident` も調査対象に含めましょう．  

```go
func markAsUsedToFuncs(pass *analysis.Pass, ids map[string]*identifier, insp *inspector.Inspector) {
	// *ast.Identも含める
	refFilter := []ast.Node{
		(*ast.CallExpr)(nil),
		(*ast.Ident)(nil),
	}
	insp.Preorder(refFilter, func(n ast.Node) {
		switch n := n.(type) {
		case *ast.CallExpr:
			// stripped
		case *ast.Ident:
			// 定義箇所に対する探索の可能性もあるため，uses集合に含まれているかチェック
			use, used := pass.TypesInfo.Uses[n]

			if use == nil || !used {
				return
			}

			if _, exist := ids[n.Name]; !exist {
				return
			}

			ids[n.Name].used = true
		}
	})
}
```

これで上記例も正しく動きました．  
実はこの変更で， **関数を引数に取る** ケースや **関数を返り値とする** ケースには対応することができます．  
具体的には，次のような場合ですね．

```go
package c

func c() { // want "unused function"
	e(d)
	f := h()
	f()
}

func d() { // OK
	println("d")
}

func d2() { // OK
	println("d")
}

func e(f func()) { // OK
	f()
}

func h() func() { // OK
	return d2
}
```

とりあえず課題1の回答はここまでとしておきます．  
これ以上のエッジケースを思いついた方はぜひご連絡ください．  
実装を変更して，記事修正を行います．

##### [自作のAnalyzerコレクションを作る](https://docs.google.com/presentation/d/1I4pHnzV2dFOMbRcpA-XD0TaLcX6PBKpls6WxGHoMjOg/edit#slide=id.g6298a0e67590aa1e_12)

`skeleton` コマンドで雛形を作成した後，  
`cmd/pkgName/main.go` を次のように編集します．  

```go
package main

import (
	"golang.org/x/tools/go/analysis"
	"golang.org/x/tools/go/analysis/unitchecker"
	"github.com/gostaticanalysis/unused"
	"github.com/gostaticanalysis/called"
	"github.com/gostaticanalysis/ctxfield"
)

func main() {
	analyzers := []*analysis.Analyzer{
		unused.Analyzer,
		called.Analyzer,
		ctxfield.Analyzer,
	}
	unitchecker.Main(analyzers...) 
	}
```

このように， `unitchecker.Main` にスライスを展開しつつ渡すだけです．  
`analysis` パッケージを用いて実装された静的解析ツールはモジュール化されており，  
組み合わせて簡単に用いることができるのも利点ですね．  

##### [skeletonのインストール](https://docs.google.com/presentation/d/1I4pHnzV2dFOMbRcpA-XD0TaLcX6PBKpls6WxGHoMjOg/edit#slide=id.g6298a0e67590aa1e_18)

[こちらのセクション](#不要なパッケージ関数の判別) を参照してください．  

##### [インポート文の重複を検出しよう](https://docs.google.com/presentation/d/1I4pHnzV2dFOMbRcpA-XD0TaLcX6PBKpls6WxGHoMjOg/edit#slide=id.g870cb4ff5f_0_989)

```go
package main

import fmt1 "fmt"
import fmt2 "fmt"

func main() {
    fmt1.Println("Hello")
    fmt2.Println("World")
}
```

のようなケースを検出できるようにするのが目的です．  
`skeleton` コマンドで雛形を作成した後，静的解析のロジックを次のように編集します．  

```go
package try2

import (
	"strconv"
	"golang.org/x/tools/go/analysis"
	"golang.org/x/tools/go/analysis/passes/inspect"
)

const doc = "try2 is ..."

// Analyzer is ...
var Analyzer = &analysis.Analyzer{
	Name: "try2",
	Doc:  doc,
	Run:  run,
	Requires: []*analysis.Analyzer{
		inspect.Analyzer,
	},
}

func run(pass *analysis.Pass) (interface{}, error) {
	for _, f := range pass.Files {
		
		// インポートパスはGoパッケージに対して1対1に存在するはず
		// エイリアス名がなんであれ，インポートパスは同じなので，それを検出する
		importedPkgs := make(map[string]bool)
		
		for _, i := range f.Imports {
			// *ast.BasicLit.Value はクォートで囲われているかもしれない
			path, err := strconv.Unquote(i.Path.Value)
			if err != nil {
				return nil, err
			}
			
			// もし既にエントリが存在すれば，import済みとして検出する
			if _, ok := importedPkgs[path]; ok {
				pass.Reportf(i.Pos(), "NG")
				continue
			}

			importedPkgs[path] = true
		}
	}

	return nil, nil
}
```

`*ast.ImportSpec.Name` には `fmt1/fmt2` のような，  
**実際にパッケージ内で用いられるときの名前** が格納されています．  
しかし `*ast.ImportSpec.Path` は必ずパッケージと1対1で存在するはずなので，それを使ってあげれば実装できます．  
クォーテーションのことを考えて， `strconv.Unquote` を使うのもポイントです．

##### 抽象構文木の確認

これは静的解析ツールを開発する課題ではないですし，  
非常にシンプルなコード片で実装可能なので，[Playgroundを共有](https://play.golang.org/p/tNi5Coj_hcX)いたします．  

これだけのコードでもかなり深い階層構造を持っていることがわかります．  

### 開発

私が今回作成したのは，次のようなツール群です．  
本当はこれに加えて **`const` 宣言すべきである識別子の検出** もやりたかったんですが，ちょっと実装速度が足りませんでした．  
やりたい人いらっしゃったら一緒にやりましょう!(投げやり)  
Golangでは `var` や `id :=` を用いると標準でミュータブルですが，  
プリミティブな型かつ不変性を許容できる場合については `const` 宣言を使うことができます．  
これを検出するようなツールも作ろうと考えていました．  
(パッケージ変数，自動変数のどちらも検出したかった)  

[リポジトリはこちら．](https://github.com/Drumato/goanalyzer)  

#### パッケージ間の依存関係可視化ツール

Golangパッケージを指定すると，そのパッケージが依存するパッケージを探索し，  
DOT言語( グラフ構造の記述言語 )を生成する，というツールです．

これはどちらかというと習作というか，勉強の為に作った感じがあります．  
というのも，今回私が作ったものよりも[更に高機能で便利なもの](https://github.com/ofabry/go-callvis)が[既に存在する](https://github.com/loov/goda)からです．  

しかし実際に作ってみると以下のような問題があり，勉強になりました．  

- Golangプログラミングではほぼ必ず **標準パッケージ** を利用する
  - 先述したように多くの機能が含まれている
  - これらを依存グラフに含むと，**真っ黒で何もわからなくなってしまう**
- 多くのパッケージが同じパッケージを参照する，みたいなこともよくある
  - **愚直に再帰で実装** すると，同じパッケージに対し何回も探索を実行してしまう
  - ちゃんと **枝刈り** することが求められる

実際にこのツールを用いて，  
`goanalyzer` パッケージ自体を解析してみた結果を示します．  

![scshot1](/images/gopher-2020/scshot1.png)  

ただノードの関係のみマッピングしている状態なのであんまりきれいではないんですが，  
graphvizの機能を使ってノードを区別したり色つけたり，サブグラフ使えばもうちょっときれいになりそうです．  
先程列挙した既存ツールでは **"どの関数に依存しているか"** もわかるので便利なんですが，  
この簡易な依存グラフを見るだけでもいろいろなことがわかります．  
例えば，非推奨のパッケージを使っていることが視覚的にわかるなど．  

#### スコープチェッカー

宣言されている識別子についてルールを適用し，  
背いていれば検出対象とする，みたいなチェッカです．  
これについては具体例を見るほうがわかりやすいと思います．

```go
package a

import "fmt"

func f() {
	x := f2() // want "This identifier is only referenced in a scope so should move the declaration to it"

	if true {
		y := f2() // OK
		fmt.Println(x, y)
	} else {
		fmt.Println(0)
	}
}

func f2() int {
	f()
	return 30
}
```

このように，  

- 識別子が定義されているスコープと参照されているスコープに**親子関係**がある
- 識別子を参照するスコープの集合に **定義スコープ自体が含まれない**

ような構造を見つけて検出します．  
これはあくまでも個人の意見ですが，  
Golangに限らず **"一般に"スコープは狭ければ狭いほうがいい** と思っているので，作ってみました．  

- `go func() { ... }()` として即時関数を定義するケース
- `if x := f(); condition {}` のようなケース
- ネストしたブロックのケース

でも一応正しく動作しています．  

関数内の識別子だけでなく，トップレベル( unexportedなパッケージ変数)でも動作します．  

```go
package a

import "fmt"

var (
	strGV1 string = "A" // want "NG"
)

const (
	strGC1 string = "A" // want "NG"
)

type strGT1 string   // want "NG"
type strGT2 = string // want "NG"

func A() {
	fmt.Println(strGV1)
	fmt.Println(strGC1)

	var a strGT1 = "A"
	var b strGT2 = "A"
	fmt.Println(a, b)
}

func B() {
	fmt.Println("B")
}

func C() {
	A()
}
```

Goでは，  

- type-alias( `type Name T` )
- named-type( `type Name = T` )
- `var`
- `const`

という種類の宣言がトップレベルで可能になっています(関数も可能だけど今回は関係ないので省略)．  
しかし，これらは関数内でも同様に可能です．  
関数内スコープと同じ概念で，  
**一つの関数からしか利用されない識別子はその中で定義すればいい** というシンプルなルールを持って解析します．  
注意したのは **unexportedな識別子に制限する** ということです．  
GolangでUpperCamelCaseで宣言された識別子はパッケージ内で使用されていないとしても，  
外部パッケージから参照される可能性があるので，そのような実装にしています．  
上の例の宣言を移動しても[Playgroundで正しく動き](https://play.golang.org/p/_vnfikFAZY0)ます．  

時間内に実装しきれなかった機能としては，例えば次のようなものがあります．  
機能というよりは痛いバグですね．

```go
package main

import (
	"fmt"
)

func main() {
	x := 30

	if true {
		fmt.Println(x)
	} else {
		fmt.Println(x)
	}
}
```

この場合の `x` はどちらのブロックでも用いられているため，宣言スコープが関数のトップレベルで正しいはずです．  
しかし現在の私のツールでは，これを"宣言を移動するべき"として検出してしまいます．  

#### ユニットテストが定義されていない関数の検出

[この例](https://github.com/Drumato/goanalyzer/tree/master/testdata/src/undefined_unit_test/a)を見ていただけるとわかりやすいのですが，  

- `f` ... 関数のテストが書かれていない
- `F2` ... 関数のテストが書かれている

みたいなコードです．  
この `f` みたいな関数を検出するようなアナライザを実装しました．  
どうしてもテストが難しいような関数や，テストが必要な場合もあるかもしれないので，  
そういう場合には `// @ignore` みたいなDocCommentがついていたら検出しないようにもしたかったのですが，  
スコープチェッカの実装に大きな穴が見つかってそっちを直していたらインターンが終わってしまいました． 

## まとめ

今回このような勉強の機会を与えてくださった株式会社メルカリ様，  
また講義やコードレビュー等をして頂いたメンターの方々，  
そしてインターンに一緒に参加していた受講生の方々，  
本当にありがとうございました!

上記以外にも，特筆すべき2つの点について述べておきます．  

### 静的解析はソフトウェア開発の生産性を向上させる選択肢の一つとなりうる

当たり前だと思うかもしれませんが，個人的にはこれを再認識できたのは非常に大きいと思っています．  
今まで静的解析ツールは **個人開発の時，IDEがバグを早期発見するために提供してくれる機能** ぐらいにしか意識していませんでした．  
しかし，[こちら](#ルールを作る場合はツールも作る)で話したように，  
静的解析ツールを作ることでプロジェクト全体の開発スピードが円滑に，そしてスマートになる可能性を知ることができました．  
私も普段のプログラミングでよくやってしまうミスなどはツール自作により技術的に解決したいなと，そう思うことができました．  

### 実装速度とロバスト性の大切さ

Golangに対する経験が少ないというのはありますが，  
実装速度が非常に遅かったのと，またバグもしばしば生んでしまいました．  
他のインターン生を見ると，皆まさに **爆速** で実装していて，それはもうゾクゾクしました．  
やはり周りが凄いと自分も頑張りたくなるもので，とても良い環境で勉強させていただきました．  
