---
title: "Rustでつくる単相型システムもどき"
description: "単相型システムを実装しながら入門します."
createdAt: "2020-12-20"
tags: ["type-system", "rust"]
imageLink: "/images/type-system/eql2.png"
---

- [対象読者](#対象読者)
- [対象でない読者](#対象でない読者)
- [型システムについての前提知識](#型システムについての前提知識)
  - [型システムの用語](#型システムの用語)
  - [単一化](#単一化)
  - [単相と多相](#単相と多相)
- [型推論システムの実装](#型推論システムの実装)
- [MinCamlコンパイラの型推論を一部実装](#mincamlコンパイラの型推論を一部実装)
  - [リテラルに対する推論](#リテラルに対する推論)
  - [変数に対する推論](#変数に対する推論)
  - [let式に対する推論](#let式に対する推論)
  - [λ抽象に対する推論](#λ抽象に対する推論)
  - [関数適用に対する推論](#関数適用に対する推論)
  - [二項演算に対する推論おまけ](#二項演算に対する推論おまけ)
  - [MinCamlコンパイラの型推論を一部実装所感](#mincamlコンパイラの型推論を一部実装所感)
- [WIP: 多相型推論システムの実装](#wip-多相型推論システムの実装)
- [まとめ](#まとめ)
- [参考資料](#参考資料)

この記事は [IPFactory Advent Calendar 2020](https://qiita.com/advent-calendar/2020/ipfactory) の20日目です．  
このネタを [言語実装 Advent Calendar 2020](https://qiita.com/advent-calendar/2020/lang_dev) の記事に採用すればよかったかもしれない．  
私は[1日目にも記事](https://drumato.com//ja/posts/dive-into-nom-internals/)を上げていますので，興味があればそちらも見てください．  

言語処理系の勉強をしていればほぼ100%，そうでなくても一度は目にしたことがあるであろう，**"型システム"** という言葉．  
何やらかっこいい名前ですが，どういったものかは理解していても実装方法まで知っている人は多くありません．  
かくいう私も，今まで作ってきた言語達はすべて **"型の明示を強制する"** 言語だったので経験はありませんでした．  
また，そもそも型システムについて勉強しようという気になったことがありませんでした．

そんな私が [SecHack365](https://sechack365.nict.go.jp/) に参加していたとき，  
[同期の方](https://twitter.com/mkeiptr) が [サクッと実装](https://admarimoin.hatenablog.com/entry/2019/12/30/000337) していて大変びっくりした記憶があります．  
"よくわかんなければ作りましょう，作ったことなきゃ作りましょう" が私の技術に対するモチベーションなので，  
記事読んで満足するだけじゃなく，ちゃんと自分でも作ってみないとね，と思っていました(~~そして数千年の時が経ちました~~)．  

本記事はあくまで **"型システムを実装するための記事，実際にRustで実装した記事"** になるので，  
型システムについての詳細な解説等は行いません．  
記事末尾に参考資料を記載しておくので，  
そちらをご覧いただければと思います．  
当方型システムについての勉強はこれが初めてなので，間違っている点もあるかもしれません．  
その際は是非コメント等で教えていただけると助かります．

ソースコード全体が[GitHubで見れるよう](https://github.com/Drumato/blog_samples/tree/main/toy-type-system)になっているので，そちらも是非．  

## 対象読者

- 一番シンプルな型推論アルゴリズムを知りたい!という人
- Rustで型システムをどうやって作るのか知りたい人
  
## 対象でない読者

読んでほしくない，というわけではなく，  
このレベルに該当する人にとっては退屈かもよ，という意味です．  

- 型推論アルゴリズムの実装をしたことがある人
- 型システムの論文をよく読む人
- 関数型言語の実装をよくやる人
- その他詳しい人

## 型システムについての前提知識
  
ここでは最低限，型システム関連の情報を整理しておきます．  
後に，それら概念や知識を使って実装の解説をしていきます．  
また，本記事の後，型システムに関する論文や他記事を読む為の助けにもなるでしょう(なるといいな)．  
興味のない人は飛ばしてください．  
基本的には，[こちらのページ](https://www.fos.kuis.kyoto-u.ac.jp/~igarashi/class/isle4-06w/text/miniml011.html)等に書いてある知識の要約であり，n番煎じです．  
間違っていたらコメントお願いします．  

### 型システムの用語

まず， "**型環境( *type environment* )** `Γ` 下においてプログラム中の式 `e` が型 `T` を持つ" という表現を **型判断 (*type judgement* )** といいます．  
これは，以下のように書きます．

![eql1](/images/type-system/eql1.png)

*type judgement* は， **型付け規則( *typing rule* )** というものを使って導出されます．  
イメージとしては， "こんなコンテキストで前提xxが全て導出できれば，結論xx" みたいな感じです．  
下に示した型付け規則は，  
"型環境 `Γ` 下において `x` が `σ` 型を持つと言えるとき，そのようにして扱える" みたいな意味になります．

![eql1](/images/type-system/eql2.png)  

導出中において"未知の変数"を表すために **型変数 (*type variable*)** という概念が用いられます．  
これにより，関数適用 `((fn x -> x) 3)` のような式についても推論が可能になります．  
`a0 -> a0` な関数に対し `int` を適用すると，最終的に `int -> int` が導出されます．  
このとき， "型変数とその正体の対応関係" を **型代入( *type substitution* )** と呼びます．  

### 単一化

ここで，`fn x -> x + 3` という関数という推論について考えます  ．  
二項演算のオペランドである `x`, `3` の推論結果はそれぞれ `a0`, `int` となります．  
`a0` と `int` は単純比較すると異なるように見えますが，  
`a0 = int` であればこの関数はvalidであることがわかります．  
これを解決するために， **単一化( *unification* )** という操作を行います．  
`S(a0) = int` となるような型代入を得ることができれば，上式は推論可能であることがわかります．  

### 単相と多相

ここまでの仕組みを実装して得られる型推論器を **"単相的である"** と表現します．  
`let f = fn x -> x + 3 in f 4` のようなプログラムでは，  
`f :: 'a -> 'a` というシグネチャが `'a = int` という型代入を持ってして，  
"let式 `let f = fn x -> x + 3 in f 4` は型 `int` を持つ" という型判断が得られました．  

しかし，[こちら](https://www.fos.kuis.kyoto-u.ac.jp/~igarashi/class/isle4-06w/text/miniml011.html#toc15) で取り上げられているように，  
`let f = fn x -> x in if f true then f 2 else 3` のような式が推論できません．  
しかし，Haskellなどの関数型言語ではこのような使い方も可能です．  
Haskellを含むいくつかの言語は多相を実現するための言語機能を持っています．
(コードの意味は特にありません)

```haskell
main = do
    let r = let f = (\x -> x) in if f True then f 3 else f 5
    print r
```

これを実現するために導入されるのが **let多相( *let-polymorphism* )** という概念です．  
Haskellでは多相的なプログラムを構築することが可能です．  
同様に **型変数( *variable* )** という概念が存在しますが，  
それらは **全称量化** されていると考えることができます．  
推論途中の"未知変数"を表す型変数とは区別して， **型スキーム( *type scheme* )** と呼ばれます．  

## 型推論システムの実装

型推論を実現するいくつかのアルゴリズムを紹介します．  
他にもあったら教えて下さい．  

- [MinCamlの型推論](http://esumii.github.io/min-caml/tutorial-mincaml-8.htm)
  - [住井先生のMinCaml](https://github.com/esumii/min-caml) で用いられている型推論アルゴリズム
  - 単相型推論となっている
  - **今回はこちらのアルゴリズム(の一部)を実装**
- [Basic Polymorphic Typechecking](http://lucacardelli.name/Papers/BasicTypechecking.pdf)
  - 1987年の論文
  - プログラミング言語における多相についての歴史から入り，型推論アルゴリズムまで紹介
  - パラメトリック多相には明示的/暗黙的の，2つの実現手法があると主張
    - 例1: Zig言語のジェネリクスは*explicit polymorphism*に該当?
      - 参考: [Documentation](https://ziglang.org/documentation/master/#Generic-Data-Structures) の `List` 関数
    - 例2: Haskellの型変数を用いた多相は*implicit polymorphism*に該当?
- [Algorithm W](https://www.sciencedirect.com/science/article/pii/0022000078900144)
  - 1978年に提唱された型推論アルゴリズム
  - 構文木をトップダウン的に探索する
- [Algorithm M](https://dl.acm.org/doi/10.1145/291891.291892)
  - 1998年に提唱された，Wの対比となるアルゴリズム
  - Mの前に `folklore` と呼ばれていたアルゴリズムがあったけど，それは証明されていなかったっぽい
  - Wを高速化したっぽい(論文にもそう書かれてる)
- [level-based type inference](http://gallium.inria.fr/~remy/ftp/eq-theory-on-types.pdf)
  - 詳細は[こちら](https://rhysd.hatenablog.com/entry/2017/12/16/002048)
- [Generalized HMTI Algorithm](http://www.cs.uu.nl/research/techreps/repo/CS-2002/2002-031.pdf)
  - 2002年に発表された論文に記載
  - WやMではエラーメッセージが有益でないとし，それらを解決する為のアルゴリズムを提唱し，完全性を証明?  

今回はこのうち，MinCamlコンパイラの型推論システム(っぽいもの)を実装してみます．  
(いずれ全部やりたいなあ)  

## MinCamlコンパイラの型推論を一部実装

MinCamlは多くの言語機能を有していますが，  
ここでは言語機能をある程度制限します．  
また，コードすべてを載せるととんでもないことになってしまうので一部のみ取り上げます．  
[全体はこちら](https://github.com/Drumato/blog_samples/tree/main/toy-type-system/mincaml-inferer)に．  
`cargo test` を動かしていただければ雰囲気はつかめると思います．  

```rust
//! src/expr.rs

pub enum Expr {
    /// `x`
    Variable(String),
    /// `42`
    Integer(i64),
    /// `true` | `false`
    Boolean(bool),
    /// `x + 3`
    Plus(Box<Expr>, Box<Expr>),
    /// `\x -> x + 3`
    Lambda(String, Box<Expr>),
    /// `f 3`
    Application(Box<Expr>, Box<Expr>),
    /// `let x = 3 in x + 3`
    Let(String, Box<Expr>, Box<Expr>),
}
```

今回の型推論器で扱う式を表します．  
Rustではこのような再帰的データ構造を表現する場合，  
`Box<T>` を使用するのが最もシンプルなので，今回はそうしています．  
他には， [typed-arena](https://crates.io/crates/typed-arena) のようなアロケータクレートを用いるという方法もあります．  
私はこのtyped-arenaを好んでよく使っています．  

```rust
//! src/types.rs
pub enum Type {
    Boolean,
    Integer,
    Fn(Box<Type>, Box<Type>),
    Variable(String),
}
```

推論結果として使用する型です．  
`Type::Variable` は型変数であり，その名前を持ちます．  

実際の推論アルゴリズムを見てみましょう．  

```rust
fn infer(
    mut env: Env,
    mut iter: RangeInclusive<char>,
    e: Expr,
) -> Result<(Env, RangeInclusive<char>, Type), InferenceError> {
    match e {
        Expr::Boolean(_b) => { /* stripped */ },
        Expr::Integer(_v) => { /* stripped */ },
        Expr::Variable(name) => { /* stripped */ },
        Expr::Let(x, e1, e2) => { /* stripped */ },
        Expr::Lambda(var, expr) => { /* stripped */ }
        Expr::Application(f, param) => { /* stripped */ }
        Expr::Plus(lhs, rhs) => { /* stripped */ }
    }
}
```

第一引数の `env: Env` は，型変数から実際の型や，  
`Expr::Lambda`に登場する束縛変数から型を導出するために使用します．  
MinCamlでは `Type.t.Var` が `Type.t option` を持っており，  
導出結果を型自体に保存する手法を取っていますが，  
今回はハッシュマップを持って取り回す方がシンプルに実装できそうだったので，そうしています．  
しかし，`env`が **"関数の引数に関する型環境"** と **型変数の代入** という2つの意味を持って使用されてしまうので，少し読みづらいかもしれません．  
区別して読みやすくするために，単純なハッシュマップではなく，それをラップする構造体を定義しています(`src/types.rs`の `struct Env` を参照)．  

第2引数の `RangeInclusive<char>` は `'a'..='z'` というrange objectを生成して渡しています．  
これは型変数名のジェネレータです．  
他の実装では，呼び出すたびに+1される作用を持った関数を実装して，  
`a0, a1, a2, ..., an` という名前を生成する物を見つけました．  
Rustではイテレータを使う方が良さそうだったので，そうしています．  
`count: RefCell<usize>` 等の参照を `infer()` に渡せば同様の事が出来そうです．  

第3引数は推論の対象となるノードです．  
パターンマッチを行って，式の種類ごとに分岐しています．  
トップダウン的に推論を行うアルゴリズムですが，  
解説はボトムアップに行おうと思います．  
実際のコードについては， `src/inference.rs` に定義されたテストも合わせてご覧いただければと思います．  

### リテラルに対する推論

これは説明するまでもないですね．  

```rust
match e {
    Expr::Boolean(_b) => Ok((env, iter, Type::Boolean)),
    Expr::Integer(_v) => Ok((env, iter, Type::Integer)),
}
```

対応する型をそのまま返しています．  

### 変数に対する推論

```rust
match e {
    Expr::Variable(name) => match env.vars_in_fn.get(&name) {
        Some(var_ty) => Ok((env.clone(), iter, var_ty.clone())),
        None => Err(InferenceError::NotFoundSuchAVariable { v: name.to_string() }),
    },
}
```

後に示す `Expr::Lambda(var, expr)` に対する推論時に，  
`env.vars_in_fn.insert(var, new_type_var)` が行われ，更新された `env` が渡されます．  
`λx.x` のようなラムダ式の場合， `x => a` のような"変数と型変数の対応"がマップに存在するので，  
その対応が存在すれば取り出し，そうでなければエラーを返しています．  

MinCamlでは外部変数もうまく扱えるようになっていますが(自由変数のキャプチャも推論出来る)，  
今回は実装をシンプルにするためにその機能は無視しています．  

### let式に対する推論

```rust
match e {
    Expr::Let(x, e1, e2) => {
        let (mut env, iter, e1_t) = infer(env, iter, *e1)?;
        env.vars_in_fn.insert(x, e1_t);
        infer(env, iter, *e2)
    }
}
```

変数に代入する式 `e1` を推論して，変数の型が得られます．  
それを `env` に登録した状態で，変数の使用部分である `e2` を推論するだけです．

実はこれだけでネストした `let` の推論等も動いてしまいます．  
ここまで説明した内容を元に，`let x = 3 in let y = x in y` という式を理解してみましょう．  
階層構造的には， `Let("x", 3, Let("y", "x", "y"))` となっている点に注目すると良いです．  

1. `3` が推論され， `env` に `x => int` が登録される
2. `let y = x in y` の推論開始
   1. `x` が推論される． `env` をlookupして， `int` が返される
   2. `env` に `y => int` が登録される
   3. `y` が推論され，`int` が返される．これがinner-let-exprの型となる
3. inner-let-exprの型がouter-let-exprの型となる

言語処理系の実装をする人にとって再帰関数は馴染み深いものですが，  
何度作っても魔法のように見えますね．  

### λ抽象に対する推論

```rust
match e {
    Expr::Lambda(var, expr) => {
        let new_type_var = iter.next().unwrap().to_string();
        let new_type_var = Type::Variable(new_type_var);
        env.vars_in_fn.insert(var.to_string(), new_type_var.clone());

        let (env, iter, expr_ty) = infer(env, iter, *expr)?;
        Ok((
            env,
            iter,
            Type::Fn(Box::new(new_type_var), Box::new(expr_ty)),
        ))
    }
}
```

`id` 関数を例に考えましょう．  
`λx.x` に対する推論は，次のようになります．  

1. 新しく型変数 `a` を作る
2. `env` に `x => a` を登録する(これにより，`expr` に登場する束縛変数の型を推論できる)
3. `x` に対する推論を行う．2番の操作により，`a` 型が得られる
4. `a => a` な型を返す  

この関数型に登場する型変数`a`は，実際に適用されるまでわかりません．  
また，この関数 `a` はあくまでも "未知である単一の型" である点に注意です．  

### 関数適用に対する推論

```rust
match e {
    Expr::Application(f, param) => {
        let new_type_var_name = iter.next().unwrap().to_string();
        let new_type_var = Type::Variable(new_type_var_name.clone());

        let (env, iter, fn_ty) = infer(env, iter, *f)?;
        let (env, iter, param_ty) = infer(env, iter, *param)?;
        let env = unify(
            env,
            fn_ty,
            Type::Fn(Box::new(param_ty.clone()), Box::new(new_type_var)),
        )?;
        
        if let Some(resolved_ty) = env.type_vars..get(&new_type_var_name) {
            return Ok((env.clone(), iter, resolved_ty.clone()));
        }

        Ok((env, iter, param_ty))
    }
}
```

少し長いので複雑に見えますが，一つ一つじっくり追っていきましょう．  
やはり実例がわかりやすいと思うので，`((λx.x) 3)` について考えます．  
ASTを書き下すと， `Apply(Lambda("x", "x"), 3)` という感じです．

まず，新たな型変数 `a` を作ります．  
そして，`λx.x` に対して `infer()` を呼び出します．  
先程の解説から，この推論が `b => b` のような関数型を返すことがわかっています．  
そして，引数の`3`に対する推論で `int` が得られます．  

最後に，2つの型 `((b => b), (int => a))` に対して `unify()` を呼び出します．  
このような呼び出しになっている理由は，  
`f` の推論結果である `b => b` の `b` を `int` で置換したとき，  
`((int => int), (int => a))` となるかどうかをチェックしたい為です．  
すぐ後に説明しますが，`unify()` 内部では未知の型変数に対する代入(*substitution*)が行われる為，  
`a => int` もすぐに判明します．  

`int => a` な関数に対する適用とわかったところで，  
`a` の型が既に判明しているかどうか`env`に問い合わせます．  

`unify` 関数について定義を示します．  
少しキレイな書き方ではなくなってしまったので，概要だけ説明します．  
詳細に知りたい方はGitHubを御覧ください．

```rust
fn unify(
    mut env: Env,
    t1: Type,
    t2: Type,
) -> Result<Env, InferenceError> {
    match (t1.clone(), t2.clone()) {
        // シンプルな比較
        (Type::Integer, Type::Integer) | (Type::Boolean, Type::Boolean) => Ok(env),
        (Type::Fn(var_ty1, ret_ty1), Type::Fn(var_ty2, ret_ty2)) => {
            // 引数同士，返り値同士で型の比較
            let env = unify(env, *var_ty1, *var_ty2)?;
            unify(env, *ret_ty1, *ret_ty2)
        }
        (Type::Variable(name1), Type::Variable(name2)) if name1 == name2 => Ok(env),

        // 一方が型変数の場合を調べる
        (Type::Variable(var), _) => {
            // 定義済み(割り当て済み)の場合，単純比較
            if let Some(var_t) = env.type_vars.get(&var) {
                return unify(env.clone(), var_t.clone(), t2);
            }

            // 未定義(未知)の場合，occur check後代入
            if occur(&var, &t2) {
                return Err(InferenceError::FoundOccurrence);
            }

            env.type_vars.insert(var.to_string(), t2);
            Ok(env)
        }
        (_, Type::Variable(var)) => { /* 上記と同様にチェック */ }
        _ => Err(InferenceError::CannotUnify),
    }
}
```

- 渡された2つの型が等しいかチェック
- どちらか一方が型変数の場合，occur checkを行った後代入
  - occur checkとは， `t1: int => a, t2: a` な場合等で `a => (int => a)`としてしまうと無限ループに陥ってしまうので，そういったケースの検出をする手続き

をする関数だということだけ理解していただければ問題ありません．  
ちょっとぐちゃっとなってしまったので，まとめましょう  

- `((λx.x) 3)` に対する推論はじめ
  - この関数適用の結果 `a` が得られるとして型変数を持っておく
  - `λx.x` の型が `b => b` だとわかる
  - `3` の型が `int` だとわかる
  - ここまでで， `int => a` という関数に対する適用だとわかる
- `unify((b => b), (int => a))` を呼び出す
  - `unify(b, int)` が呼ばれ， `b => int` が`env`に登録される
  - `unify(b, a)` が呼ばれ，`b => int` がわかっているので， `unify(int, a)` としてもっかい呼ぶ
    - `a => int` が登録される
- `int => int` として導出できたので，返り値型である `int` を返す

という感じです．  
かなり複雑でしたが，実装することで理解が深まりました．  

### 二項演算に対する推論おまけ

```rust
match e {
    Expr::Plus(lhs, rhs) => {
        let (env, iter, lhs_ty) = infer(env, iter, *lhs)?;
        let (env, iter, rhs_ty) = infer(env, iter, *rhs)?;
        let env = unify(env, Type::Integer, lhs_ty.clone())?;
        let env = unify(env, Type::Integer, rhs_ty.clone())?;

        if let (Type::Variable(var), _) = (&lhs_ty, &rhs_ty) {
            let resolved_ty = env.type_vars.get(var).unwrap().clone();
            return Ok((env, iter, resolved_ty));
        }
            
        if let (_, Type::Variable(var)) = (&lhs_ty, &rhs_ty) {
            let resolved_ty = env.type_vars.get(var).unwrap().clone();
            return Ok((env, iter, resolved_ty));
        }

        Ok((env, iter, lhs_ty))
    }
}
```

`+` 演算子を，2つの引数を取る中置関数だと考えると，ほぼ同じことをしているとわかります．  
しかし `+` は今回想定する言語では `int` しか引数を持たないので，  
`unify` の呼び出し回数は少なくて済みます．  

### MinCamlコンパイラの型推論を一部実装所感

150行程度の実装でしたが比較的複雑で，実装にもある程度時間がかかってしまいました．  
OCamlで実装されたコードをRustに変換するとき，  
Rustの知識が足りないせいであまりキレイじゃない書き方になってしまい，若干悔しい思いをしています．  
Rustでもっと関数型っぽい書き方に慣れていきたいところですね．  

型推論アルゴリズムというとあれですが，  
自作言語では `let x : i64 = x + 3;` みたいな代入に対して，  
"右辺がちゃんと宣言通りの型を持っているか"みたいな型検査の実装をしたことがあったので，少し親近感はありました．  
しかし `unify()` はやはり複雑でしたし，ちゃんとテストが通ったときは凄いびっくりしました．  

## WIP: 多相型推論システムの実装

時間が足りずできませんでした(無念…)  
後日別記事にまとめてあげようかな，なんて思っていたりします．  

## まとめ

今回はRustで単相型推論アルゴリズムを実装しつつ，お勉強してみました．  
本当は多相型推論も実装しようとしたんですが何分記事のアイデアを思いついたのが期日ギリギリだったので厳しかったです．  
なんだかなあなあになってしまった感じがあるので，後日記事書きたいなあ，なんて思っています(できたら)．  

先程も述べましたが，Rustで関数型っぽく書く力をもっと身につけたいなあ，と感じることができましたね．  
ここらへんRustのベストプラクティスも調べながら知っていきたい．  
OCamlの `Map.add` のように，エントリ挿入後のマップが返るようなAPIが `std::collections::HashMap`にもほしいなと思います(おもいませんか?)  

とはいえ，効率を考えたら `&mut HashMap<K, V>` でごにょごにょするほうがいい気もします．  
うーん，難しい．

## 参考資料

- [Wikipedia](https://en.wikipedia.org/wiki/Hindley%E2%80%93Milner_type_system)
  - 単相型/多相型についての解説も記載
  - 具体的な定義とかが書いてある
  - このページの参考資料にある論文とか読むと良さそう(私は読んでません)
- [Hindley-Milner型推論をCで実装した話](https://admarimoin.hatenablog.com/entry/2019/12/30/000337)
  - 記事が比較的新しめ
  - ラムダ計算の知識も説明されているので，前提知識のない人におすすめ
  - `let f = λx -> x in ((pair (f 200)) (f true))` サンプルからもわかるように，多相が動いている
  - C言語で実装されているので，他言語よりも敷居が低い
    - Haskell/Scala読める人よりC読める人の方が多いんじゃないか?という予想からの発言です
- [型システムを学ぼう！](https://uhideyuki.sakura.ne.jp/studs/index.cgi/ja/HindleyMilnerInHaskell)
  - Haskell実装が掲載
    - `typeOf` が推論のエントリポイントなのでそこから読むといいです
- [OCaml でも採用されているレベルベースの多相型型推論とは](https://rhysd.hatenablog.com/entry/2017/12/16/002048)
  - 発展的な話題
  - 多相的型推論アルゴリズムのうち，実用されている高パフォーマンスな手法の解説
- [第16章 Hindley/Milner型推論](https://sites.google.com/site/scalajp/home/documentation/scala-by-example/chapter16)
  - [Scala By Example](https://www.scala-lang.org/old/sites/default/files/linuxsoft_archives/docu/files/ScalaByExample.pdf) の16章の実装
  - HMTS自体の解説は0なので，ドメイン知識を得たい場合はほか記事を読んでから実装だけ参照すると良さそう
- [Algorithm W Step By Stepを読んだ & 実装した](https://blog.waft.me/2017/10/08/algorithm-w/)
  - Algorithm Wの実装
  - Algorithm W Step By Step自体は [このPDF](https://github.com/wh5a/Algorithm-W-Step-By-Step/blob/master/AlgorithmW.pdf) だと思われる
- [型推論機構の実装](https://www.fos.kuis.kyoto-u.ac.jp/~igarashi/class/isle4-06w/text/miniml011.html)
  - 京都大学の講義資料?
  - 単相型推論に始まる型システムの基礎から詳しく説明されている
  - めちゃくちゃ読みました
