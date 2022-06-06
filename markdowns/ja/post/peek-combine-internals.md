---
title: "Rust製のパーサコンビネータcombine v4.4.0を覗き見する"
description: "combineというparser libraryの実装を覗き見します."
createdAt: "2020-12-10"
tags: ["parser-combinator", "code-reading", "combine", "rust"]
imageLink: "/Drumato.png"
---

- [Motivation](#motivation)
- [サンプルから読み始める](#サンプルから読み始める)
  - [`parser::char::letter`](#parsercharletter)
    - [`letter()` で使われている各種トレイトや型](#letter-で使われている各種トレイトや型)
    - [`letter()` 内部](#letter-内部)
- [まとめ](#まとめ)
- [余談: `any` について](#余談-any-について)

この記事は [言語実装 Advent Calendar 2020](https://qiita.com/advent-calendar/2020/lang_dev) の10日目です．  
昨日は [@kimiyuki](https://qiita.com/kimiyuki) さんの記事でした．  
明日は [@fukkun](https://qiita.com/fukkun) さんの記事です．  

Twitter等で **rustcのコードリーディングを助ける為の記事** を書くみたいなこと言っていましたが，  
ある理由により実現できませんでした．  

## Motivation

つい先日，[このような記事](https://drumato.com/ja/posts/dive-into-nom-internals/)を上げました．  

nomという比較的よく使われるパーサコンビネータについて解析し，  
パーサコンビネータとRustに詳しくなろう，みたいな目的の記事です．  
思ったより多くの方にご覧頂けたようで，大変嬉しく思っております．  

この記事の冒頭で言っていた，まさにそれです．  
combineも同様に理解することで，更にRustに詳しくなろうと考えています．

パーサコンビネータについての解説等は特にしないですし，  
｢nomと比較してxxな実装なんですね｣という切り口で解説したいと思っているので，  
是非nom解説の記事もご覧頂ければと思います．  
実際にnom解説を理解したあとこちらの記事に戻ってくると，  
あまり理解するのに時間はかからないんじゃないかなと思います．  
~~nom解説の記事は2,3週間練って作ったものなので出来がいいのもあります~~  

2つのプロジェクトの規模感を把握するために，  
clocを使って比較してみました．  

```text
$ cloc nom/src/
      32 text files.
      32 unique files.
       0 files ignored.

github.com/AlDanial/cloc v 1.82  T=0.04 s (853.9 files/s, 581289.6 lines/s)
-------------------------------------------------------------------------------
Language                     files          blank        comment           code
-------------------------------------------------------------------------------
Rust                            32           1480           7348          12957
-------------------------------------------------------------------------------
SUM:                            32           1480           7348          12957
-------------------------------------------------------------------------------

$ cloc combine/src/
      23 text files.
      23 unique files.
       0 files ignored.

github.com/AlDanial/cloc v 1.82  T=0.03 s (778.9 files/s, 551101.4 lines/s)
-------------------------------------------------------------------------------
Language                     files          blank        comment           code
-------------------------------------------------------------------------------
Rust                            23           1401           3594          11278
-------------------------------------------------------------------------------
SUM:                            23           1401           3594          11278
-------------------------------------------------------------------------------
```

こうしてみると，そこまで大きな差はなさそうですね．  

今回は [v4.4.0](https://github.com/Marwes/combine/tree/v4.4.0) を対象に読み進めていきます．  

## サンプルから読み始める

READMEに書いてあるサンプルから読み始めて，  
サンプルで使われている各関数の実装を見てみることにしましょう．  
適宜コメントを加えているので，combineを使ったことない人も理解できると思います．  
~~nomの記事もそうでしたし今回もそうですが，私はほぼ使ったことないまま記事を書いています~~

```rust
use combine::{many1, Parser, sep_by};
use combine::parser::char::{letter, space};

// parser::char::letter はchar型の入力がstd::char::is_alphabeticを満たせばeatして返す
// many1 は引数に受け取ったパーサが一回以上適用できればパース成功とする
// ここで得られるwordという変数ももちろんパーサである(後述)
let word = many1(letter());

// sep_by は2つ目の引数に渡したパーサをseparatorとする構造をパースする
// 今回で言えばparser::char::space なので，スペース区切りの文字列をパースすると考えてくれれば良い
// 後述するが，各パーサはmap()メソッドを持つ．
// sep_by の返り値が Vec<String> であると注釈することで， 
// rustcは parser.parse() の成果物がStringだとわかる
let mut parser = sep_by(word, space())
    .map(|mut words: Vec<String>| words.pop());

// parse() メソッドを呼び出すことで，実際にパースを実行する
// 今回は入力文字列としてとして &'static strを渡している
let result = parser.parse("Pick up that word!");

// パース成功時，(パーサの成果物， eatされた文字列)というタプルが返る
// タプルの順番がnomと真逆なので注意
assert_eq!(result, Ok((Some("word".to_string()), "!")));
```

私の解説では(個人的好みにつき)一切触れませんでしたが，  
一般的には **"マクロのnomと関数のcombine"** みたいな比較をされることが多いです．  
但し前回の記事で散々説明したようにnomには関数APIも存在するので，  
この比較は現在あまり意味がありません．  

### `parser::char::letter`

非常にシンプルな機能を提供する関数だとわかったので，  
この関数を見ていくことでcombineの設計を覗き見ることにします．  
実際のコードを見てみると，  
提供する機能と同じく非常にシンプルな実装になっていることがわかります．  

```rust
/// Parses an alphabet letter according to [`std::char::is_alphabetic`].
///
/// [`std::char::is_alphabetic`]: https://doc.rust-lang.org/std/primitive.char.html#method.is_alphabetic
///
/// ```
/// use combine::Parser;
/// use combine::parser::char::letter;
/// assert_eq!(letter().parse("a"), Ok(('a', "")));
/// assert_eq!(letter().parse("A"), Ok(('A', "")));
/// assert!(letter().parse("9").is_err());
/// ```
pub fn letter<Input>() -> impl Parser<Input, Output = char, PartialState = ()>
where
    Input: Stream<Token = char>,
    Input::Error: ParseError<Input::Token, Input::Range, Input::Position>,
{
    satisfy(|ch: char| ch.is_alphabetic()).expected("letter")
}

```

`where` 句で設けられているトレイト境界ですが，nomの時と似たような感じになっていますね．  
この関数を **ボトムアップ** 的に理解することにしましょう．  
ボトムアップ式理解の欠点として，  
**ずっと不安感を覚えながら読みすすめる必要がある** というのがあるので，  
ここで簡潔に `letter()` の理解の方針を示します．  

- まず `letter()` の定義で用いられているトレイトや型を簡潔に説明します
  - これによって，`letter()` が生成するパーサはどんな入力を受け取れて何を返すかがわかります
- 次に関数内部を理解します
  - 今回で言えば `satisfy()` が何をするのか，ということです

#### `letter()` で使われている各種トレイトや型

まず気になるのは返り値の型とされているimpl Objectです．  
これは`Parser`トレイトを実装する型を返すようです．  
nomでは `Fn(Input) -> IResult<Input, Output, Error>` のように `Fn` トレイトがそのまま使われていましたが，  
combineでは少し異なる実装がされているようですね．  
[ドキュメント](https://docs.rs/combine/4.4.0/combine/trait.Parser.html)を見てみましょう．  

いくつかのメソッドがありますが，  
とりあえずは `fn parse(&mut self, input: Input) -> Result<(Self::Output, Input), <Input as StreamOnce>::Error>` だけ理解できていれば大丈夫です．  
そしてこれ，まさしく先程言っていたように，  
nomにおける `Fn(Input) -> IResult<Input, Output, Error>` に似たものを感じます．

ドキュメントの内容と合わせるとかなり多くの型が出てきたので，整理したいと思います．  

- `Parser<Input: Stream>` は各関数が返す"パーサが実装するトレイト"
  - associated typeとして `Output` を持ち，これはパーサの成果物の型を指定する
    - 今回でいえば `Output = char`
  - `fn parse()` はパース実行のエントリポイント
- [`Stream`](https://docs.rs/combine/4.4.0/combine/trait.Stream.html) は3つのトレイトの集合的存在
  - [`StreamOnce`](https://docs.rs/combine/4.4.0/combine/trait.StreamOnce.html)
  - [`Positioned`](https://docs.rs/combine/4.4.0/combine/trait.Positioned.html)
  - [`ResetStream`](https://docs.rs/combine/4.4.0/combine/stream/trait.ResetStream.html)
- [ParseError](https://docs.rs/combine/4.4.0/combine/trait.ParseError.html) はそのままパーサエラーの定義

と，ここまで言われても"ナンノコッチャ"ってなってると思います，  
nomと同様，トレイトとジェネリクスを最大限活用してゼロコスト抽象化を実現している点は変わらないようです．  

今回も同じく `&str` に限定して考えます．  
まずは以下のコードを見てみましょう．  

```rust
impl<'a> StreamOnce for &'a str {
    type Token = char;
    type Range = &'a str;
    type Position = PointerOffset<str>;
    type Error = StringStreamError;

    #[inline]
    fn uncons(&mut self) -> Result<char, StreamErrorFor<Self>> {
        let mut chars = self.chars();
        match chars.next() {
            Some(c) => {
                *self = chars.as_str();
                Ok(c)
            }
            None => Err(StringStreamError::Eoi),
        }
    }
}

impl<'a, T> Positioned for &'a [T]
where
    T: Clone + PartialEq,
{
    #[inline]
    fn position(&self) -> Self::Position {
        PointerOffset::new(self.as_ptr() as usize)
    }
}

impl<'a> Positioned for &'a str {
    #[inline]
    fn position(&self) -> Self::Position {
        PointerOffset::new(self.as_bytes().position().0)
    }
}

#[doc(hidden)]
#[macro_export]
macro_rules! clone_resetable {
    (( $($params: tt)* ) $ty: ty) => {
        impl<$($params)*> ResetStream for $ty
            where Self: StreamOnce
        {
            type Checkpoint = Self;

            fn checkpoint(&self) -> Self {
                self.clone()
            }
            #[inline]
            fn reset(&mut self, checkpoint: Self) -> Result<(), Self::Error> {
                *self = checkpoint;
                Ok(())
            }
        }
    }
}

clone_resetable! {('a) &'a str}
```

やっぱりこうして一つのトレイト実装を見てみると非常にわかりやすいですね．  
`StreamOnce::uncons()` を見ると，[`std::collections::VecDeque::pop_front()`](https://doc.rust-lang.org/std/collections/struct.VecDeque.html#method.pop_front) のような動作に見えます．  
`Positioned::position()` は， `impl<'a, T> Positioned for &'a [T]` によってスライスに対する定義が行われ，  
それを流用する形で `<&[u8]>::position()` を呼び出しています．  
`ResetPosition` に関してはマクロによって実装されていますが，  
`impl<'a> ResetStream for &'a str` のような展開がされることがわかれば，あとは普通のimplブロックです．  
私は普段Rustを書くとき一切マクロを使わないですが，  
Rustのマクロは比較的分かりやすい上に [ドキュメント](https://doc.rust-lang.org/reference/macros-by-example.html) もあるので，  
あまり読むのに困ったことはありません．  

3つのトレイトの実装について大まかにわかったところで，  
`Stream` トレイトも見てみます．  
とはいっても，3つのトレイトを頑張って理解した私達にとって難しいことは特にありません．  

```rust
pub trait Stream: StreamOnce + ResetStream + Positioned {}

impl<Input> Stream for Input
where
    Input: StreamOnce + Positioned + ResetStream,
    Input::Error: ParseError<Input::Token, Input::Range, Input::Position>,
{
}
```

`&str` に限定して考えたとき，  
`Input::Token = char`, `Input::Range = &str`, `Input::Position = PointerOffset<str>` であるとわかっています．  
また先程説明を省略しましたが，  
`Input::Error = StringStreamError` であり， `impl ParseError for StringStreamError` はデフォルトのものが存在します．  

ここまでの説明を経て，やっと `letter()` が生成するパーサに `&str` を渡せることがわかったのです．  

#### `letter()` 内部

ここでもう一度 `parser::char::letter()` の定義を持ってきましょう．  

```rust
pub fn letter<Input>() -> impl Parser<Input, Output = char, PartialState = ()>
where
    Input: Stream<Token = char>,
    Input::Error: ParseError<Input::Token, Input::Range, Input::Position>,
{
    satisfy(|ch: char| ch.is_alphabetic()).expected("letter")
}
```

もう特に説明しなくても関数シグネチャについては理解できそうですね．  

`parser::token::satisfy()` についても [前の貯金](https://drumato.hatenablog.com/entry/dive-into-nom#nomcharactercompletesatisfy) があるので予想はつきますが，  
この記事は "nomとcombineの違いを知る" のが趣旨なので，素直に読むとしましょう．  

```rust
#[derive(Copy, Clone)]
pub struct Satisfy<Input, P> {
    predicate: P,
    _marker: PhantomData<Input>,
}

pub fn satisfy<Input, P>(predicate: P) -> Satisfy<Input, P>
where
    Input: Stream,
    P: FnMut(Input::Token) -> bool,
{
    Satisfy {
        predicate,
        _marker: PhantomData,
    }
}
```

`parser::token::satisfy()` は構造体 `parser::token::Satisfy<Input, P>` を返すようですね．  
この段階で，この構造体が `Parser` トレイトを実装しているんだろうなあ，という予想が付きます．  

`PhantomData<T>` ってなんだろう，と疑問に思った方もいるかもしれません．  
これについては [qnighy](https://qnighy.hatenablog.com/entry/2018/01/14/220000) さんの記事が非常に詳しいです．  

`impl<Input, P> Parser<Input> for Satisfy<Input, P>` を見てみましょう．  

```rust
impl<Input, P> Parser<Input> for Satisfy<Input, P>
where
    Input: Stream,
    P: FnMut(Input::Token) -> bool,
{
    type Output = Input::Token;
    type PartialState = ();

    #[inline]
    fn parse_lazy(&mut self, input: &mut Input) -> ParseResult<Self::Output, Input::Error> {
        satisfy_impl(input, |c| {
            if (self.predicate)(c.clone()) {
                Some(c)
            } else {
                None
            }
        })
    }
}

fn satisfy_impl<Input, P, R>(input: &mut Input, mut predicate: P) -> ParseResult<R, Input::Error>
where
    Input: Stream,
    P: FnMut(Input::Token) -> Option<R>,
{
    let position = input.position();
    match uncons(input) {
        PeekOk(c) | CommitOk(c) => match predicate(c) {
            Some(c) => CommitOk(c),
            None => PeekErr(Input::Error::empty(position).into()),
        },
        PeekErr(err) => PeekErr(err),
        CommitErr(err) => CommitErr(err),
    }
}
```

`fn stream::uncons()` は `method Stream::uncons()` のラッパーです．  
返り値は [`ParseResult`](https://docs.rs/combine/4.4.0/combine/enum.ParseResult.html) というenumです．  
これも `&str` に限定して考えてしまいましょう．  
`&str` に対し `Stream::uncons()` を呼び出すと `std::collections::VecDeque::pop_first()` のように振る舞うとお話しました．  
この切り出された文字に対し `predicate` を適用したとき，  
その結果が `Option::Some` であればパース成功としその結果を保存します．  
そうでなければパースは失敗したとして `PeekErr` を返します．  

---

## まとめ

- combineの提供する関数は `Parser` トレイトを実装する構造体を返す
  - 返す構造体はAPI関数によって異なるが， `Parser` トレイトを実装するという点で共通している
  - `Parser` トレイトは `Stream` トレイトを実装する入力を受け付ける
  - 返り値は `Result<(Self::Output, Input), <Input as StreamOnce>::Error>` である

ここまでの道のりで分かる通り，  
nomと同じく"汎用性の高いパーサコンビネータライブラリ" を実現するための設計がされていることがわかります．  
Rustの型システムを最大限に活用するコードは見ていて楽しいですし，学びもありますね．  

急ピッチで作成したので少しごちゃっとした，自分用メモみたいな記事になってしまいました．  
本当は **Dockerfileの静的解析ツール** みたいなやつを作って発表しようかなーなんて構想もありましたが，後の祭り．  
来年も絶対に参加するつもりなので，その時はちゃんと既存記事がないかどうかチェックしてから書くことにします．

## 余談: [`any`](https://docs.rs/combine/4.4.0/combine/fn.any.html) について

最もシンプルなパーサはこれだったんじゃないかと，今になって思い始めました．  
とにかくeatできればなんでもいい，なパーサを作ってくれます．

```rust
pub fn any<Input>() -> Any<Input>
where
    Input: Stream,
{
    Any(PhantomData)
}

#[derive(Copy, Clone)]
pub struct Any<Input>(PhantomData<fn(Input) -> Input>);

impl<Input> Parser<Input> for Any<Input>
where
    Input: Stream,
{
    type Output = Input::Token;
    type PartialState = ();

    #[inline]
    fn parse_lazy(&mut self, input: &mut Input) -> ParseResult<Input::Token, Input::Error> {
        uncons(input)
    }
}
```

`fn stream::uncons()` に渡しているだけなのがわかります．  
要は先頭アイテムが切り取れればそれでいい，な実装です．  
わかりやすい．  
