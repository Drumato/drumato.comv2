---
title: "Rust製のパーサコンビネータnom v6.0.0を解剖する"
description: "nomというparser libraryの実装を深く追っていきます."
createdAt: "2020-12-01"
tags: ["parser-combinator", "code-reading", "nom", "rust"]
imageLink: "/Drumato.png"
---

- [前提: nomとは](#前提-nomとは)
  - [サンプル](#サンプル)
- [nomを解剖する3ステップ](#nomを解剖する3ステップ)
  - [`nom::IResult<I, O, E>`](#nomiresulti-o-e)
  - [パーサ関数とトレイト境界](#パーサ関数とトレイト境界)
- [nomのモジュール，パーサ紹介](#nomのモジュールパーサ紹介)
  - [`nom::bytes::complete::tag`](#nombytescompletetag)
  - [`nom::character::complete::satisfy`](#nomcharactercompletesatisfy)
- [まとめ](#まとめ)
- [余談: IPFactoryについて](#余談-ipfactoryについて)
- [余談2: `nom::branch::alt` について](#余談2-nombranchalt-について)

この記事は [IPFactory Advent Calendar 2020](https://qiita.com/advent-calendar/2020/ipfactory) の1日目です．  
IPFactoryという技術サークルについては [余談](#余談-IPFactoryについて) を御覧ください．  

普段コンパイラ自作をしていて，LLパーサを手書きすることが多い私ですが，  
｢そういえばパーサライブラリ使ったことないな｣と思い，現在 [自作コンパイラプロジェクト](https://github.com/Drumato/peachili) のパーサを書き換えています．  
そこで使っているのが， [Geal/nom](https://github.com/Geal/nom) というパーサコンビネータのライブラリです．

Rustの強力な型システムの上でジェネリックなパーサ関数を実装しているということで，  
きっと様々なRustのエッセンスが含まれていると思い，コードリーディングしようと感じました．  
また，いずれパーサライブラリも自作したいなと思っているので，  
その前段階として既存実装を調べる必要があると思いました．  

Rustのパーサライブラリとしてもう一つ有名なものに [Marwes/combine](https://github.com/Marwes/combine) がありますが，  
これも記事上げようかなーなんて考えています．  
IPFカレンダーにあげようかなー，他メンバーの記事で埋まらなかったら上がるのでお楽しみに．

今回はv6.0.0を対象とします．  
~~投稿前日に見返したら6.0.1がリリースされていたけど気にしない~~

## 前提: nomとは

nom内部の解説を前に，nom自体の解説をしておきます．  
[README.md](https://github.com/Geal/nom/blob/master/README.md)を読むと，次のように書いてあります．

> nomはRustで書かれたパーサコンビネータのライブラリです．  
> nomは速度やメモリ消費を犠牲にすることなく安全なパーサを構築することを支援します．  
> 高速で正確なパーサを実現するために，Rustの強力な型システムやメモリ安全性を活用しています．  
> バグを生みやすい"パイプライン"を抽象化するための関数やマクロ，トレイトなども提供しています．

実際の設計は後述しますが，  
nomの設計はコンパイル時に決まるような **"静的ディスパッチ"** の集合で実現されています．  
(実行時に型を解決する"動的ディスパッチ"ではなく)  
パーサコンビネータを使用するときにパーサ同士を連携させる部分のバグが起こりやすい，みたいな話なのでしょうか．  
確かに暗黙的で動的な型システムの上で動かそうと思ったらヒヤヒヤしてしまいますね．  

### サンプル

[README.md](https://github.com/Geal/nom/blob/master/README.md)に記載のサンプルを見てみます．  
コメントで簡単に解説を加えているので，参考にしてください．

```rust
extern crate nom;
use nom::{
  IResult,
  bytes::complete::{tag, take_while_m_n},
  combinator::map_res,
  sequence::tuple
};

#[derive(Debug,PartialEq)]
pub struct Color {
  pub red:   u8,
  pub green: u8,
  pub blue:  u8,
}

fn from_hex(input: &str) -> Result<u8, std::num::ParseIntError> {
  u8::from_str_radix(input, 16)
}

fn is_hex_digit(c: char) -> bool {
  c.is_digit(16)
}

fn hex_primary(input: &str) -> IResult<&str, u8> {
  // take_while_m_n(min, max, condition) は，
  // 入力列の各要素に対しconditionを適用し，それがtrueを返した回数が[min..max]に含まれるかどうか判別する．
  // map_res(parser, f) は，parserの返す値に関数fを適用して返す．
  // 今回はtake_while_m_nが二桁の16進数(の文字列)を返すはずなので，それに対してfrom_hexを適用し，u8型を返すという感じ．
  map_res(
    take_while_m_n(2, 2, is_hex_digit),
    from_hex
  )(input)
}

fn hex_color(input: &str) -> IResult<&str, Color> {
  // tag() はシンプルに引数のパターンと合致するかチェック．
  // カラーコードにおいて "#" は意味を持たないので，パーサの成果物は捨ててしまう．
  let (input, _) = tag("#")(input)?;

  // tupleは関数に渡したタプル内のパーサを順次適用して，その結果をタプルに格納して返す．  
  // カラーコードは先頭から順にRGBとなっているため，その数値をパターン代入で受け取り，
  // Color構造体を構築して返す，ということをしている．
  let (input, (red, green, blue)) = tuple((hex_primary, hex_primary, hex_primary))(input)?;

  Ok((input, Color { red, green, blue }))
}

fn main() {}

#[test]
fn parse_color() {
  // パース関数の返り値チェック
  // hex_color のシグネチャを見ると分かる通り，返り値はResultになっている．
  // タプルの第一要素には"パース成功後のeatされた文字列"が，
  // 第二要素には"パース関数が成功した時に返す成果物"が格納されている．
  assert_eq!(hex_color("#2F14DF"), Ok(("", Color {
    red: 47,
    green: 20,
    blue: 223,
  })));
}
```

## nomを解剖する3ステップ

nomのパーサ定義は次のような手順で読みすすめるとシンプルに理解できます．  

- nomのパーサ関数のほとんどは `nom::IResult<I, O, E>` を返す
- パーサ関数が受け取る型はnomが定義するトレイトのいくつかを実装している必要がある
  - `nom::bytes` や `nom::character` はこれらトレイト境界を利用して制約付きジェネリクスを実現している
  - 例えば `nom::bytes` はバイトストリームを扱う関数群が定義するが，引数にはバイトストリームの振る舞いを定義したトレイト境界を設けている
- パーサ関数の実装は，これらトレイトが持つ関数を組み合わせて実現している

### `nom::IResult<I, O, E>`

まずは基本的な型から見ていきましょう．  
nomでは殆どすべてのパーサ関数が [`IResult`](https://docs.rs/nom/6.0.0/nom/type.IResult.html) という型を返すようになっています．  

```rust
type IResult<I, O, E = Error<I>> = Result<(I, O), Err<E>>;
```

`I` は *Input* を表し，パーサ関数に入力するパース対象の型を示します．  
`O` は *Output* を表し，パース成功時に返す型を示します．  
パーサは **パース成功後のeatされた文字列** を返すので，  
`Result::Ok` には `(eatされた文字列, パース成功時に生成される成果物の型)` という値の組が入ります．

コンパイラのコードでは `fn integer_literal(i: &str) -> nom::IResult<&str, ast::Node>` のように，  
パース結果をASTノードにすることが多いです．  

ここで `Error` は `std::error::Error` ではなく `nom::error::Error` であり， `Err` は `nom::Err` です．  

```rust
#[derive(Debug, PartialEq)]
pub struct Error<I> {
  /// position of the error in the input data
  pub input: I,
  /// nom error code
  pub code: ErrorKind,
}

pub enum ErrorKind {
  Tag,
  MapRes,
  MapOpt,
  // stripped
}

pub enum Err<E> {
  Incomplete(Needed),
  Error(E),
  Failure(E),
}

pub enum Needed {
  Unknown,
  Size(NonZeroUsize),
}
```

まず，nomのパーサが返す可能性のあるエラーは  

- `Incomplete` ... パースが完了しなかった
- `Error` ... 回復可能なエラー
- `Failure` ... 回復不可能なエラー

の三種類です．  
それぞれがどのような場面で使われるのかについては後述します．  
デフォルトでは `nom::IResult<I, O, E = Error<I>>` となっているので， `IResult<&str, ast::Node>` とすると `Error.input: &str`  のようになります．  
`nom::Err` は `std::error::Error` を実装しているので，  
`Result<T, Box<dyn std::error::Error>>` のような関数内で `?` 演算子を使用することも可能です．  

### パーサ関数とトレイト境界

先程 `nom::IResult<I, O, E>` について紹介しましたが，  
パーサ関数内での `I` は，[`traits.rs`](https://github.com/Geal/nom/blob/6.0.0/src/traits.rs) に記載されているトレイト群(のいくつか)を実装していることを強制します．  
nomでは `&str` や `&[u8]` など，これらのトレイトが既に実装済みの型を使うこともできますが，  
ユーザが自身で定義した型にこれらトレイトを実装することで任意の型が扱えるようになっています．  

実際に一つパーサ関数を見てみましょう．  
[`nom::bytes::complete::is_a`](https://docs.rs/nom/6.0.0/nom/bytes/complete/fn.is_a.html) という，  
パターンに適合する先頭部分文字列をeatして返す関数を例にあげます．  

```rust
pub fn is_a<T, Input, Error: ParseError<Input>>(
  arr: T,
) -> impl Fn(Input) -> IResult<Input, Input, Error>
where
  Input: InputTakeAtPosition,
  T: FindToken<<Input as InputTakeAtPosition>::Item>,
{
  move |i: Input| {
    let e: ErrorKind = ErrorKind::IsA;
    i.split_at_position1_complete(|c| !arr.find_token(c), e)
  }
}
```

まず取り上げるべきなのは， `T: FindToken<<Input as InputTakeAtPosition>::Item>` という構文です．  
これは **Fully Qualified Syntax** というもので，  
今回の例で言えば，  

- `Input` 型が実装する `InputTakeAtPosition` トレイト
- その関連型である `Item` をパラメータとして渡した `FindToken` トレイト
- それを実装する 型 `T`

という意味です．  
Fully Qualified Syntaxについては[こちらのサンプル](https://doc.rust-lang.org/book/ch19-03-advanced-traits.html#fully-qualified-syntax-for-disambiguation-calling-methods-with-the-same-name)も合わせてご覧ください．  

例えば `Input = &str` とします．  
[`impl<'a> InputTakeAtPosition for &'a str`](https://github.com/Geal/nom/blob/master/src/traits.rs#L760) を見ると，  
`type Item = char;` と宣言されています．  
また，[`impl<'a> FindToken<char> for &'a str`](https://github.com/Geal/nom/blob/master/src/traits.rs#L1119) が実装されているので，  
この関数に `&str` を渡すことができるとわかります．  
つまり， **"`&str` 型のパーサを書くとき，`is_a` の引数に指定するパターンも `&str` でかけるよ"** という意味になるのです．  

返り値はクロージャですが，クロージャを返す関数では `impl trait` 型を指定するのが一般的です([Rust by Example](https://doc.rust-lang.org/rust-by-example/fn/closures/output_parameters.html) を参照)．  
Rustにおけるクロージャについては[こちらの記事](https://keens.github.io/blog/2016/10/10/rustnokuro_ja3tanewotsukutterikaisuru/)がとてもわかりやすいです．  

[トレイト定義](https://github.com/Geal/nom/blob/master/src/traits.rs#L801)を見るとわかりますが，  
第一引数に指定した `P: Fn(Self::Item) -> bool` を [`str::find`](https://doc.rust-lang.org/std/primitive.str.html#method.find) に渡し，  
`Some(i) if i != 0` ならばパース成功とする，というようなイメージです．  

追うのが中々大変だと思うので，まずは `Input = &str, Item = char` に限定した実装を用意しました．  
下記サンプルは[GitHub](https://github.com/Drumato/blog_samples/tree/main/dive_into_nom/special_is_a)にも置いてあります．

```rust
/// 適当なエラー型
#[derive(Debug)]
enum Error {
    Failed,
}

/// impl FindToken<char> for &strの簡易実装
/// 単にnomの実装の中身を持ってきただけ
fn find_char<'a>(arr: &'a str, c: char) -> bool {
    arr.chars().any(|i| i == c)
}

/// impl InputTokenAtPosition for &str の簡易実装
/// これも実際の中身を取り出した
fn split_at_position1_complete<'a, P>(s: &'a str, predicate: P) -> Result<(&'a str, &'a str), Error>
where
    P: Fn(char) -> bool,
{
    match s.find(predicate) {
        Some(0) => Err(Error::Failed),
        Some(i) => Ok((&s[i..], &s[..i])),
        None => {
            if s.is_empty() {
                Err(Error::Failed)
            } else {
                Ok((&s[s.len()..], &s[..s.len()]))
            }
        }
    }
}

/// nom::bytes::complete::is_a の実装ほぼそのまま
fn specialized_is_a<'a>(arr: &'a str) -> impl Fn(&'a str) -> Result<(&'a str, &'a str), Error> {
    move |i: &str| split_at_position1_complete(i, |c| !find_char(arr, c))
}

fn main() {
    let digit = specialized_is_a("1234567890");
    eprintln!("is_a(\"1234567890\")(\"123abc\") => {:?}", digit("123abc")); //=> is_a("1234567890")("123abc") => Ok(("abc", "123"))

    eprintln!(
        "is_a(\"1234567890\")(\"Drumato\") => {:?}",
        digit("Drumato")
    ); //=> is_a("1234567890")("Drumato") => Err(Failed)

    eprintln!("is_a(\"1234567890\")(\"\") => {:?}", digit("")); //=> is_a("1234567890")("") => Err(Failed)
}
```

これだけであれば，文字列操作で実現された単なる(関数を返す)関数です．  
これを **Rustの強力な静的ディスパッチ** によって汎用的にし,  
`specialized_is_a` の引数や，返すクロージャの引数や返り値をジェネリクスによって実現したものがnomというわけです．  

かなり複雑な型パズルになっているので初見は分かりづらいかもしれませんが，  
これらは全てコンパイル時に決定し `Box<dyn trait>` 等の動的ディスパッチによるコストもない，非常にキレイな設計になっていると言えます．  

ここまでで，nomのパーサを読む前提知識が身につきました．  

- パーサの殆どは `IResult<I, O, E = Error<I>> = Result<(I, O), Err<E>>` という型を返す
- パーサ関数はnomが定義するトレイトを用いて制約付きジェネリクスを実現している
  - `&[u8]` や `&str` 等の関してはデフォルト実装が存在し，すぐに使い始められる
  - それ以外の型にトレイトを実装することで，任意の型をパーサ関数に入力できる
- パーサ関数は各トレイトに定義された振る舞いの関数を組み合わせて実現されている
  - 例えば `nom::bytes::complete::is_a` は `FindToken::find_token` や `InputTakeAtPosition::split_at_position1_complete` など

## nomのモジュール，パーサ紹介

nomは以下のモジュールを公開しています．  

|   モジュール名    |                             説明                             |
| :---------------: | :----------------------------------------------------------: |
|    `nom::bits`    |                     ビットレベルのパーサ                     |
|   `nom::bytes`    |                   バイトストリームのパーサ                   |
| `nom::character`  |                     `char` 単位のパーサ                      |
| `nom::combinator` |                     パーサコンビネータ群                     |
|   `nom::error`    |                       nomのエラー管理                        |
|   `nom::multi`    | パーサを引数に受け取って，複数回適用したりみたいなことに使う |
|   `nom::number`   |                       数値関連のパーサ                       |
|   `nom::regexp`   |                  正規表現を用いたパーサ定義                  |
|  `nom:sequence`   |           `(a, b, c)`など，シーケンス構造のパーサ            |

これらの関数をすべて紹介していたら大変なことになっていますので，  
いくつか取り上げて実装を見てみる，ということをやってみましょう．  

### `nom::bytes::complete::tag`

以下のようにして使うことができる，シンプルなパターンマッチングのパーサです．  
下記サンプルコードは[GitHub](https://github.com/Drumato/blog_samples/blob/main/dive_into_nom/bytes_tag/src/main.rs) にもおいてあります．

```rust
fn elf_magic_number(i: &[u8]) -> nom::IResult<&[u8], &[u8]> {
    nom::bytes::complete::tag(&[0x7f, 0x45, 0x4c, 0x46])(i)
}

fn drumato(i: &str) -> nom::IResult<&str, &str> {
    nom::bytes::complete::tag("drumato")(i)
}

#[test]
fn drumato_test() {
    assert_eq!(Ok((";", "drumato")), drumato("drumato;"));
    assert!(drumato("not_drumato;").is_err());
}

#[test]
fn elf_magic_number_test() {
    assert_eq!(
        Ok((&[0x00][..], &[0x7f, 0x45, 0x4c, 0x46][..])),
        elf_magic_number(&[0x7f, 0x45, 0x4c, 0x46, 0x00])
    );

    assert!(elf_magic_number(&[0x01, 0x02, 0x03, 0x04, 0x05]).is_err());
}
```

ELFバイナリのパーサもバイトストリームパーサを構築することで実装できますし，  
`&str` のような型も勿論使うことが出来ます．  
今回はELFバイナリのマジックナンバーをパースする関数を作っています．  

非常にシンプルな関数なので，その実装も直感的です．  
[実際の定義](https://docs.rs/nom/6.0.0/src/nom/bytes/complete.rs.html#33) を見てみます．  

```rust
pub fn tag<T, Input, Error: ParseError<Input>>(
  tag: T,
) -> impl Fn(Input) -> IResult<Input, Input, Error>
where
  Input: InputTake + Compare<T>,
  T: InputLength + Clone,
{
  move |i: Input| {
    let tag_len = tag.input_len();
    let t = tag.clone();
    let res: IResult<_, _, Error> = match i.compare(t) {
      CompareResult::Ok => Ok(i.take_split(tag_len)),
      _ => {
        let e: ErrorKind = ErrorKind::Tag;
        Err(Err::Error(Error::from_error_kind(i, e)))
      }
    };
    res
  }
}
```

- 入力文字列とパターン `tag` を比較して，成功すればパターンの長さで分割して返す
  - 後述しますが， `take_split()` はある一点で区切って，**"区切りより前の列"** をタプルの第一引数にして返すので注意です
  - `"Drumato".take_split(4) => ("ato", "Drum")` という感じ
  - これはまさに序盤で説明した `(eatされた文字列, パーサ関数の成果物)` という構成．
- 失敗すれば，適切に `ErrorKind` を設定して返します．
  - `Err(Err::Error(Error::from_error_kind(i, e)))` と非常に分かりづらくなっています
  - 冗長に書くと `Result::Err(nom::Err::Error(nom::error::Error::from_error_kind(i, e)))` となる

先程[`nom::bytes::complete::is_a`](https://docs.rs/nom/6.0.0/nom/bytes/complete/fn.is_a.html)を見たのと同じように，  
クロージャを返す関数になっています．  
先程詳しくは説明しませんでしたが，引数の型 `T` はあくまでマッチを判断するパターンのために使われます．  
パーサに入力される型は `Input` であり， `T` と同じではない点に注意してください．  

ここでは `T == Input == &str` と限定して，  
この関数を読むために必要な部分を持ってきました．  
といっても，メソッド名からある程度予想ができますが．

```rust
// Tに必要な実装
impl<'a> InputLength for &'a str {
  #[inline]
  fn input_len(&self) -> usize {
    self.len()
  }
}

// Inputに必要な実装
impl<'a> InputTake for &'a str {
  #[inline]
  fn take(&self, count: usize) -> Self { /* stripped */ }

  // return byte index
  #[inline]
  fn take_split(&self, count: usize) -> (Self, Self) {
    (&self[count..], &self[..count])
  }
}

// Inputに必要な実装
impl<'a, 'b> Compare<&'b str> for &'a str {
  #[inline(always)]
  fn compare(&self, t: &'b str) -> CompareResult {
    self.as_bytes().compare(t.as_bytes())
  }

  #[inline(always)]
  fn compare_no_case(&self, t: &'b str) -> CompareResult { /* stripped */ }
}
```

これだけ見ると素朴な実装に見えますね．  
実際にはこれらがコンパイル時にガチャガチャと組み合わされて実現されます．  
なんだか魔法のように見えますが，これこそRustの実現する型システムの恩恵，という感じがしますよね．

### `nom::character::complete::satisfy`

`satisfy` に渡した関数 `fn(char) -> bool` が真を返す場合，その文字をパースして返すという関数です．  
これ単体で用いることは少なく，以下のように他のパーサ関数と組み合わせて使う事が多いです．

```rust
use nom::character::complete::satisfy;
use nom::combinator::map;
use nom::multi::many1;

fn bin(i: &str) -> nom::IResult<&str, String> {
    map(
        many1(satisfy(|c| c == '0' || c == '1')),
        |chars: Vec<char>| chars.into_iter().collect(),
    )(i)
}
fn main() {}

#[test]
fn bin_test() {
    assert_eq!(Ok(("", "0".to_string())), bin("0"));
    assert_eq!(Ok(("", "11010".to_string())), bin("11010"));
    assert!(bin("").is_err());
}
```

これも [実際の定義](https://github.com/Geal/nom/blob/da6d9a13682d7e8245b992598903f28df4a531e1/src/character/complete.rs#L57)を見てみましょう．  

```rust
pub fn satisfy<F, I, Error: ParseError<I>>(cond: F) -> impl Fn(I) -> IResult<I, char, Error>
where
  I: Slice<RangeFrom<usize>> + InputIter,
  <I as InputIter>::Item: AsChar,
  F: Fn(char) -> bool,
{
  move |i: I| match (i).iter_elements().next().map(|t| {
    let c = t.as_char();
    let b = cond(c);
    (c, b)
  }) {
    Some((c, true)) => Ok((i.slice(c.len()..), c)),
    _ => Err(Err::Error(Error::from_error_kind(i, ErrorKind::Satisfy))),
  }
}
```

`InputIter::next()` が返す，シーケンスの最初の要素に対して `cond` を適用し，  
その返り値が真であった場合のみパース成功としています．  
非常にシンプルで分かりやすい実装なので特に取り上げることもありませんが，  
`iter_elements()` で返ってくるのはイテレータそのものという点に注意です．  
`&str` であれば `chars()` を呼び出しています．

## まとめ

今回はnomを徹底解剖することで，Rustの強力な言語機能を使ったパーサライブラリの実装方法を学びました．  
トレイトやジェネリクスの機能等の機能を活用することでRustっぽいキレイなコードを書くことができますが，  
意識せず惰性で作っているとごちゃっとしたコードが出来上がってしまいがちです．  
今回のコードリーディングはそのような自分のプログラミングに喝を入れるという意味でとても勉強になりました．  

今回取り上げた関数以外にも非常に多くの機能が実現されているnomですが，  
本記事で身につけた知識を活かせば，実装を読むことはそう難しくないはずです．  
使い方のサンプルが紹介されていない関数についても，今回踏んだ流れで読んでいけば使えそうですね．

## 余談: IPFactoryについて

IPFactoryとは，情報科学専門学校という学校に存在する学内サークルです．  
IPFに在籍するメンバーがそれぞれ自身の専門分野についての勉強やアウトプット活動を行っています．  
サークル内有志メンバーで **[CTFを主催](https://caya8.hatenablog.com/entry/2020/10/28/080123)** したりもしています．  
IPFに所属する各メンバーのTwitterやブログ等は [こちらのページ](https://ipfactory.github.io/) を参照してください．  

## 余談2: `nom::branch::alt` について

ここらへんのツイートが関連しています．  
[https://twitter.com/drumato/status/1329698474049249280:embed]  

先述したように，  
`nom::branch::alt` は引数に [`nom::branch::Alt`](https://docs.rs/nom/6.0.0/nom/branch/trait.Alt.html) トレイトを実装することを強制しています．  
`nom::branch::Alt` は **パーサのリスト** に対して実装されていて，  
リストの要素である各パーサは `nom::Parser` トレイトが実装されていることになっています．  

[実際の定義](https://docs.rs/nom/6.0.0/src/nom/internal.rs.html#282-289) を見てみると，  
`FnMut(I) -> nom::IResult<I, O, E>` トレイトを実装する引数は全て受け取れるようになっていますが，  
`nom::branch::alt` にインプット以外の資源を渡したいことがあります．  

わたしが実際に取り組んでいる [自作コンパイラ](https://github.com/Drumato/peachili/blob/replace-parser/src/compiler/common/frontend/pass/parser/expression.rs) では，  
ASTの実装に [`typed-arena`](https://crates.io/crates/typed-arena) を使用している為に，  
アリーナアロケータを使いまわしたい，というモチベーションがあります．  

Rustの型システムの限界か?(というかそれこそが型システムの恩恵なので当たり前なんですが)と思いとても困っていたのですが，  
そこで [keen](https://twitter.com/blackenedgold) さんの [webml](https://github.com/KeenS/webml) という実装を見つけました．  

この実装を見ると，構造体メソッドとして実装された各パーサ関数が **`FnMut(I) -> nom::IResult<I, O, E>` を実現するクロージャを返す** ようになっています．  
クロージャ内部では構造体のメンバやパーサ関数に渡される引数を利用しても上手くキャプチャされ，  
返されるクロージャは上記トレイトを返すので `nom::branch::alt` に渡すことができるという仕組みです．  

非常に感動し，すぐに私の実装にも取り入れました．  
[こちら](https://github.com/Drumato/peachili/blob/replace-parser/src/compiler/common/frontend/pass/parser/expression.rs#L58) などが参考になるかと．  

Keenさんの実装にはとても助けられました．  
ここで改めて紹介しておきたいとおもいます．  
