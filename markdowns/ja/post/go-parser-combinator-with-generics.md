---
title: "Go GenericsでつくるParser Combinator"
createdAt: "2022-04-10"
tags: ["go", "parser"]
imageLink: "/Drumato.png"
description: "Genericsを使用してParser Combinatorを実装したのでそれを紹介します."
---

- [概要](#概要)
- [仕組み](#仕組み)
	- [Parser Signature](#parser-signature)
	- [Type Resolving](#type-resolving)
	- [Custom Input Types](#custom-input-types)
- [実装で妥協した点](#実装で妥協した点)
	- [`string` を受け取れない](#string-を受け取れない)
- [終わりに](#終わりに)

現在も活発に開発しているため，仕様が大きく変更される場合があります．

お久しぶりです．
最近は新卒社員として研修を頑張ったり，趣味時間には自分に足りていない技術のcatch upを行っているDrumatoです．  
[Go 1.18からGenericsが導入](https://go.dev/doc/go1.18) されましたね，皆さん使ってますか?
私は最近になってようやく仕様を勉強し始めたのですが，
そもそも楽しかったGo Programmingが更に楽しくなって，私はとても嬉しいです．
私のGo Generics Debutは[Singly-Linked-Listの実装](https://scrapbox.io/drumato-medley/Simple_Singly-Linked-List_in_Go1.18_with_Generics)でした．凄い簡略化したものですが．  

より高度に扱いたくなってきた私にとって，Parser Combinatorは非常に良い練習の題材だったのですが，
作っていくうちに，練習に限らず普通に便利なlibraryができているんじゃないか，とうぬぼれ始めています．
そこで今回は，私が作って遊んでいるParser Combinatorの紹介をしたいと思います．RepositoryとDocumentはこちら．  

<https://github.com/Drumato/peachcomb>  
<https://pkg.go.dev/github.com/Drumato/peachcomb>

idea自体はGo Genericsのtutorialを見た段階である程度思いついていて，あとはそれをある日の朝適当に実装してみた，というのが始まりです．
ちなみにGo Genericsの説明は既に多くのGopherさん達が書いてくださっているので，そちらを参照されるのがよいと思います．
私はofficial tutorial以外の資料を読まずに作れたので，この記事を読む上でそれら資料の内容を完全に理解している必要はないかもしれません．

<https://go.dev/doc/tutorial/generics>

---

## 概要

peachcombは， **parserを初期化** して 呼び出すだけで使える，というような原始的な機能を提供します．
ということで，早速使用例をお見せしたいと思います．
次のsampleは， `|` 記号で区切られた数列をparseするものです．  

<https://go.dev/play/p/qIbzx_IWxbr>

```go
package main

import (
	"github.com/Drumato/peachcomb/pkg/strparse"
	"github.com/Drumato/peachcomb/pkg/combinator"
)

func main() {
	element := strparse.Digit1()
	separator := strparse.Rune('|')
	p := combinator.Separated1(element, separator)
	i, o, err := p([]rune("123|456|789Drumato"))
	fmt.Println(i)
	fmt.Printf("%s\n", o)
	fmt.Println(err)
}
```

```shell
$ go run main.go
Drumato
[123 456 789]
<nil>
```

`i` は入力全体から，parser `p` によって消費された文字列を除いた残りの入力が格納されています．
`o` はparser `p` の成果物が含まれます．ここでは `[]string{"123", "456", "789"}` のようになっています．
使い方は以上です．特に難しい点はないと思います．

## 仕組み

設計は基本的にRust製のParser Libraryである [Geal/nom](https://github.com/Geal/nom) をかなり参考にしています．
[こちらの記事](https://www.drumato.com/ja/posts/dive-into-nom-internals/)で解説していますが，dynamic dispatchをほぼ使わずにgeneralなparserを構成できる点が魅力で，
私がRust applicationでなにかparserを書くとき，基本的にnomを使っています．
nomの仕組みを簡単に説明すると，"trait boundsでゴリゴリに強制することで高速かつ汎用的にparserを組み合わせられる"ように頑張っているlibraryです．
**parser inputに要求するtrait** を細かく分けることで，基本的にほぼすべてのparserがtype-parametricに扱えるようになっています．

一方peachcombは，nomよりだいぶlooseではあるものの，近いものを実現しようと頑張っています．
ここではその仕組みを簡潔に説明します．code base自体はそこまで大きくないので，
私の説明が分かりづらかったらcodeを読んでいただければと思います．

### Parser Signature

まずはじめに，peachcomb内のすべてのparserは `type Parser[E comparable, O parser.ParseOutput]` を満たすようになっています．
つまり，このsignatureを理解できればほぼ勝ったも同然です．
具体的には，以下のように定義されています．

```go
type Parser[E comparable, O ParseOutput] func(input ParseInput[E]) (ParseInput[E], O, ParseError)

type ParseInput[E comparable] []E

type ParseOutput interface{}

type ParseError interface {
	error
}
```

特に難しくないですね．現状parsecomb parsersは `[]E` というsliceを受け取るに過ぎません．
これは実装の妥協点の一つです．詳しくは後述します．
このようにparser typeを定義する利点は数多く存在しますが，
特に利益を実感してもらいやすい点を説明します．

まずはじめに，peachcombを利用するある時点において， もしpeachcombに機能が足りなくても，
自分で `Parser[E, O]` を満たすparserを作れば，それを `Map()` などの汎用関数に引き渡すことができます．
ある良いparserを作ったら，それをpeachcombにcontributionしつつ，mergeされるまでは自分のprojectで定義したものを代用してもうまく動作します．

次に，ほとんどのparserをgenericに作ることができます．ただのhigher order functionですね．
先述したように， `package combinator` にあるparser関数はすべて **`Parser[E, O]`を満たすすべてのparserを受け取る** ことができます．
これによって文字列やbyte列など，入力の種類ごとに `Map()` などを実装する必要がなくなります．
`package strparse` や `package byteparse` にあるのは，それぞれの入力でのみ必要な特殊関数のみ置くようになっています．

最後に，userはparserの使い方を一貫して理解することができるようになっています．ただの関数なので．

### Type Resolving

実際に型が解決される様子を見てみましょう．
ここで，次のようなparserを構築します．
わかりやすさのために型を明示していますが，明示しなくてももちろん使えます．
ちなみにGo Playgroundを用意したので，そちらで実行することもできます．

<https://go.dev/play/p/oiZCn732MOh>

```go
package main

import (
	"fmt"

	"github.com/Drumato/peachcomb/pkg/combinator"
	"github.com/Drumato/peachcomb/pkg/parser"
	"github.com/Drumato/peachcomb/pkg/strparse"
)

func main() {
	var element parser.Parser[rune, string] = strparse.Digit1()
	var separator parser.Parser[rune, rune] = strparse.Rune('|')
	var p parser.Parser[rune, []string] = combinator.Separated1(element, separator)

	var i []rune
	var o []string
	var err error
	i, o, err = p([]rune("123|456|789Drumato"))

	fmt.Println(string(i))
	fmt.Printf("%d\n", len(o))
	fmt.Printf("%s %s %s\n", o[0], o[1], o[2])
	fmt.Println(err)
}
```

それぞれ，

- `element` ... `[]rune` を受け取り `string` を成果物とするparser
- `separator` ... `[]rune` を受け取り `rune` を成果物とするparser
- `p` ... `[]rune` を受け取り `[]string` を成果物とするparser

という感じです．
ではこれに対し，genericなfunction signatureを照らし合わせて考えてみましょう．

```go
func Digit1() parser.Parser[rune, string]
func Rune(expected rune) parser.Parser[rune, rune]
func Separated1[
    E comparable, 
    EO parser.ParseOutput, 
    SO parser.ParseOutput,
](
    element parser.Parser[E, EO], 
    separator parser.Parser[E, SO]) parser.Parser[E, []EO]
```

`Digit1()` によって `element` は `[]rune` を入力し `string` を返すものとわかり，
`Rune()` によって `separator` は `[]rune` を入力し `rune` を返すものだとわかります．

これによって `Separated1()` のtype parameterは次のようになります．

- `E` ... `rune`
- `EO` ... `string`
- `SO` ... `rune`

`Separated1()` は `SO` 型の成果物をparser内部で捨てて， `[]EO` を構築します．
ということで， `p` が無事 `parser.Parser[rune, []string]` を満たすことがcompile時にわかります．

---

次に，compileが失敗する例を紹介します．
実用的には型を明示しないで使いたいので，次は推論させつつ使ってみます．
**実行時ではなくcompile timeで警告されるのがGenericsを使用している最大の利点** なので，
ここは丁寧に説明したいと思います．

<https://go.dev/play/p/J0pRsPk4_Pf>

```go
package main

import (
	"fmt"

	"github.com/Drumato/peachcomb/pkg/byteparse"
	"github.com/Drumato/peachcomb/pkg/combinator"
)

func main() {
	sub := byteparse.UInt8()
	p := combinator.Many1(sub)
	i, o, err := p([]rune("aaaabaa"))

	fmt.Println(string(i))
	fmt.Println(string(o))
	fmt.Println(err)
}
```

pkg devを見ていただければわかりますが，それぞれのparserは次のように解決されます．

- `sub` ... `parser.Parser[byte, uint8]`
- `p` ... `parser.Parser[byte, []uint8]`

Go Playgroundで実行してみるとわかりますが，これはcompileが失敗します．
error messageを以下に示します．
内容を要約すると， `p.Parse()` は `[]byte` を要求するが， `[]rune` を受け取っている，というものです．

```text
./prog.go:13:23: cannot use []rune("aaaabaa") (value of type []rune) as type parser.ParseInput[byte] in argument to p
```

今回は入力が間違っている例を紹介しましたが，parser間に不整合がある場合も同様にcompile errorが発生します．

<https://go.dev/play/p/Zssq5aSvheM>

```go
package main

import (
	"fmt"

	"github.com/Drumato/peachcomb/pkg/combinator"
	"github.com/Drumato/peachcomb/pkg/strparse"
)

func main() {
	sub := strparse.Digit1()
	p := combinator.Map(sub, func(v byte) (bool, error) { return v == 0, nil })
	i, o, err := p([]byte("11112222abc"))

	fmt.Println(string(i))
	fmt.Println(o)
	fmt.Println(err)
}
```

実行しようとすると，以下のようなcompile errorが起こります．

```text
./prog.go:12:27: type func(v byte) (bool, error) of func(v byte) (bool, error) {…} does not match inferred type func(string) (O, error) for func(SO) (O, error)
```

めちゃくちゃ長くて読みづらいですが，これも簡単にまとめると，
`combinator.Map()` が推論した型と `func(v byte) (bool, error)` の内容が一致しません，的なあれです．
まず，例によってparser関数は以下のように解決されます．

- `sub` ... `parser.Parser[rune, string]`
- `p` ... `parser.Parser[rune, bool]`
  - `Map()` は簡略化すると `Map[E, SO, O](sub Parser[E, SO], fn SO -> (O, error))` です

ここで `Map()` は `E: rune, SO: string` から， `func (v string) -> (O, error)` なfn literalを求めますが，
実際には `func(v byte) -> (bool, error)` が来たので怒った．という感じです．

### Custom Input Types

user interfaceに注力した結果， `[]rune` や `[]byte` などの想定された入力にかぎらず，ある制約を満たしたいかなる型も受け入れられるようになりました．
これによって， `[]myToken` のような独自の型を入力できるようになります．
実際にcustom input typeを扱うexampleを用意しているので，よろしければそちらをご覧ください．

<https://github.com/Drumato/peachcomb/blob/v0.2.0/examples/custominput/main.go>

compiler開発などではよくあるのですが，tokenizerが各tokenにsource code上の位置情報を付与して， errorを詳細にする，ということがあります．
この場合，普通に `[]rune` を使ったり `[]byte` の入力を受け取るとそれらを扱うことができません．
このようなneedsを満たすためにも，interfaceを公開するmotivationが存在します．

ちなみに, peachcombでは `[]rune` や `[]byte` を受け取るようにしていても，
positionを保持する構造体のmethod内でそれぞれpeachcombのparserを呼ぶようにすれば，custom input typeを使用しなくても位置情報を取り回すことはできます．

## 実装で妥協した点

ここでは今後やりたいことや，現在の実装で妥協している点をお話します．

### `string` を受け取れない

Goでは，`strings` などによって `string` に対する便利関数がたくさん提供されています．
また，userからも直感的に扱えるので，こちらとしてはぜひ `string` を入力できるようにしたいところです．
実際，実装当初はそれを想定して開発していました．

super genericに実装しようとしたところ，`string` と `rune` の親子関係( `string` は `rune` の集合と考えることができる)を表現する必要が出てきます．
これは， `Satisfy()` などが入力の先頭を切り出す操作を実行するときに切り出されたものの型を把握する必要があるためです．
しかし，Goは `string` と `rune` に親子関係を見出すようにはなっていません．
よって `parser.Parser` にその対応関係を外部から渡すようにしたいのですが，こうなると煩雑になるだけでなく，以下のような問題が起こります．

Goでは `string` に対するindex accessを行うと `byte` が切り出されます．
つまり明示的に `[]E()` のようなcastを行って `[]rune` として切り出すなどの仕組みが必要です．

これは私があと少しGo Genericsに詳しくなったり，頭を捻れば解決できそうな問題なので，とりあえず `[]rune` を受け取ることで妥協しました．
いずれ対応したいと思っているので，以下のようなissueを立てています．

<https://github.com/Drumato/peachcomb/issues/7>

---

## 終わりに

今回はGo Genericsを使って遊んでいたら意外と使えそうなものができているかも，みたいな話をしました．
新しい言語機能に触ることで知識のupdateが発生し，最新の技術にもついていけるようになるので，積極的に取り組んでいきたいところです．
一方，言語自体も色々触ることで見えてくるものがあるので，RustとGoだけしか書かない私ですが，最近はNimを触っています．
ここらへんの話題は先日投稿したpodcastでも触れているので，よかったらお聞きください．

<https://youtu.be/mwW8i0pHaAU>
