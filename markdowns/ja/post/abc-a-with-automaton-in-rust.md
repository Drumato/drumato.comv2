---
title: "Rustで有限オートマトンを書いてAtcoder Beginner ContestのA問題を解いてみる"
description: "ネタも交えて, Rustで有限オートマトンを書いて遊んでみます."
createdAt: "2020-07-21"
tags: ["programming-competition", "joke", "rust"]
imageLink: "/images/automaton-in-rust/img2.png"
---

- [前提知識](#前提知識)
- [本題](#本題)
- [素朴な回答](#素朴な回答)
- [オートマトン解法](#オートマトン解法)
  - [Rustにおけるオートマトン実装](#rustにおけるオートマトン実装)
  - [サンプルコード](#サンプルコード)
- [おまけ](#おまけ)
- [まとめ](#まとめ)

お久しぶりです．  
最近は [Peachili](https://github.com/Drumato/peacili) というコンパイラドライバの実装や，  
今までやってこなかった大学数学の勉強，  
アルゴリズムやデータ構造を含むCSの基礎知識を1から勉強し直しているという感じで，  
あまり記事を書けていませんでした．  
~~Goコンパイラを読む記事シリーズは何処へ~~

とても短い+ネタ記事になってしまいますが，  
最近 **計算理論** や **正規言語** らへんの勉強もやり始めたので，  
それに関連した知識としてオートマトンを取り上げ，  
競プロの問題をオートマトンを用いて解いてみようと思います．  

私はコンパイラ自作のとき毎回手書きでTokenizerを書いているのですが，  
自分で作った字句解析器生成系を使って簡略化したいなあと思っているので，  
正規言語･表現周辺の知識を身につけるモチベが上がってきているのです．  

> Rust言語で字句解析器生成系を実装し，  
> クレートとして公開しようと思っているので，その時は利用していただけるとありがたいです．  

本記事の内容としては，  
[こちらの本](https://www.kyoritsu-pub.co.jp/bookdetail/9784320122079)を参考にしています．  

再度述べておきますが，  
この記事はあくまでもネタ記事であり，  
**有限オートマトンを含む計算理論を体系的に解説する記事ではありません．**  

｢オートマトンを使って遊んだんだな｣ くらいの認識で見ていただければ．

## 前提知識

まずは，  
有限オートマトンを実装する上で必要な前提知識をサラッと復習します．  
私は最近計算理論の勉強をし始めたばかりで，わかりやすい解説にはならないと思うので詳細は省略します．  
しっかりと勉強したい人は記事先頭で紹介した書籍を読んでいただければと思います．  

まずは以下の図を見てください．  

> 開始状態はsrcのない矢印で明記するのが一般的ですが，  
> ここではわかりやすさを重視するため，`s` という状態を別途用意しています．  
> 後に，有限オートマトンの正式な定義で下図を記述しますが，  
> その際には `s` について取り扱わないので，注意してください．

![img](/images/automaton-in-rust/img.png)  

これは，**二進記数法で表現された数が奇数であるか** チェックするオートマトンの状態遷移図になります．  
ここで，有限オートマトンの定義を以下に示します．  

```text
有限オートマトン(finite automaton) は計算モデルの一種であり, 一般に以下の要素を持つ．

- Q は状態(state)の集合
- Σ はアルファベット(alphabet)と呼ばれる集合
- δ: Q × Σ -> Q は遷移関数(transition function)
- q_0 ∈Q は開始状態(start state)
- F ⊆Q は受理状態の集合( set of accept states)
```

上記定義を持って，先程の有限オートマトンを表現してみます．  

```plain-text
M = (Q, Σ, δ, q_0, F)

Q = {q_0, q_1}
Σ = {0, 1}
q_0 は開始状態
F = {q_1}
```

δについてですが，これは **状態遷移表** で表現してみます．  
状態遷移表は **`集合Σの要素数` × `集合Qの要素数`** で表現することができます．  

| 初期状態 |   0   |   1   |
| :------: | :---: | :---: |
|   q_0    |  q_0  |  q_1  |
|   q_1    |  q_0  |  q_1  |

## 本題

ここからは， [ABC158-A](https://atcoder.jp/contests/abc158/tasks/abc158_a) という問題を解いてみます．  
問題の解説は省きますので，気になる方は上記リンクを参照してください．

## 素朴な回答

まずはオートマトン云々の前に，普通に解いてみます．  
愚直に解くと，次のようになりますね．  

> 実装にはRustを用いますが，  
> 適宜解説コメントを加えているので他言語を勉強している人にも読めるはずです．

```rust
// Atcoderで用いることのできる，便利な入出力クレートのインポート
use proconio::input;

fn solve(s: &str) -> &'static str {
    if s == "AAA" || s == "BBB" {
        return "No";
    }

    "Yes"
}

fn main() {
    // 適当に期待する型を列挙しておけば，入力文字列をパースしてくれる
    input! {
        s: String,
    }

    println!("{}", solve(&s));
}
```

なんてことないコードだと思います．  

## オートマトン解法

ではこれを，オートマトンを用いて解いてみます．  
今回は入力文字列がとても小さいので，  
状態遷移図を考えるのが簡単です．  
よって，まずは状態遷移図を作ってみます．  

ABC158-Aは **判定問題** なので，  
`Yes` を出力すべき文字列を受理するオートマトンを考えればいい，ということになります．  
あとは題意に従って作っていくだけです．  

![img2](/images/automaton-in-rust/img2.png)  

```text
M = (Q, Σ, δ, q_0, F)

Q = {q_0, q_1, q_2, q_3}
Σ = {'A', 'B'}
δは下記に記載
q_0 は開始状態
F = {q_3}
```

|       |  'A'  |  'B'  |
| :---: | :---: | :---: |
|  q_0  |  q_1  |  q_2  |
|  q_1  |  q_1  |  q_3  |
|  q_2  |  q_3  |  q_2  |
|  q_3  |  q_3  |  q_3  |

あとはこれを実装していけばいい，  
という感じになります．  

### Rustにおけるオートマトン実装

- 状態
  - 受理状態
  - 開始状態
- 遷移関数

をRustで実現する方法について考えます．  

まずは状態です．  

```rust
struct State {
    /// 受理状態かどうか
    is_accept: bool,
    /// State間を比較できるように，IDをつけておく
    id: usize,
}
```

開始状態はオートマトンが知っていればいいので，  
`State` にメンバをもたせる必要はありません．  
後述しますが，`State` はマップのキーに指定するため，  
状態同士を比較できるように `id` を持たせています．  
状態名を表すような `name: String` を持たせてもいいかもしれません

次に遷移関数ですが，  
遷移関数とは **オートマトン内の各状態に対応した関数** になります．  
文字を受け取って比較し，各文字に対する遷移先の状態を返す1引数関数だと仮定すると，  
各状態とその遷移関数は **1対1** であることがわかります．  
よって，  
`HashMap<State, Box<dyn Fn(char) -> String>>` のようなものを作り，状態遷移表を実現します．  
`Box<Fn()>` としているのは，関数オブジェクトをヒープに割り当てることで `Sized` を充足するためです．  
遷移関数の返り値が `String` となっている理由ですが，  

- 遷移は **状態と状態の関係** であり，状態が持つ情報ではないと考える
- `Fn(char) -> State` とすると， `State` が遷移関数を持つことになり，非直感的である

というのが理由です．  

### サンプルコード

ここまでの情報をまとめつつ実装すると，以下のようになります．  
実際に提出して正解することを確認しています．

```rust
use proconio::input;
use std::collections::HashMap;

/// 状態
#[derive(Hash, Eq, PartialEq, Ord, PartialOrd, Clone, Copy)]
struct State {
    /// 受理状態かどうか
    is_accept: bool,
    /// State間を比較できるように，IDをつけておく
    id: usize,
}

/// 有限オートマトンを表す構造体
struct Automaton {
    /// 状態の有限集合Q
    states: HashMap<String, State>,
    /// 遷移関数群
    transitions: HashMap<State, Box<dyn Fn(char) -> String>>,
    /// Stateにつける通し番号
    id: usize,
}

impl Automaton {
    /// ある状態qと, qからの遷移関数を登録する
    fn add_states(&mut self, name: &str, is_accept: bool, transition: fn(char) -> String) {
        let state = State {
            is_accept,
            id: self.id,
        };
        self.id += 1;
        self.states.insert(name.to_string(), state);
        self.transitions.insert(state, Box::new(transition));
    }

    /// 言語Lで記述された文字列sを受理するか判定
    fn run(&self, s: String) -> bool {
        // 開始状態からスタート
        let mut current_state = *self.states.get("q0").unwrap();

        // 文字列をイテレートして，状態遷移を次々と行う
        for c in s.chars() {
            let transition = self.transitions.get(&current_state).unwrap();
            let next_state_name = transition(c);
            current_state = *self.states.get(&next_state_name).unwrap();
        }
        
        // 入力文字列を処理し終わったあと，最終的な遷移先が集合Fの元であるかチェック
        current_state.is_accept
    }
}

fn transition_q0(c: char) -> String {
    if c == 'A' {
        return "q1".to_string();
    }

    "q2".to_string()
}
fn transition_q1(c: char) -> String {
    if c == 'B' {
        return "q3".to_string();
    }

    "q1".to_string()
}
fn transition_q2(c: char) -> String {
    if c == 'A' {
        return "q3".to_string();
    }

    "q2".to_string()
}
fn transition_q3(_c: char) -> String {
    "q3".to_string()
}

fn main() {
    input! {
        s: String,
    }

    let mut m = Automaton {
        states: HashMap::new(),
        transitions: HashMap::new(),
        id: 0,
    };

    m.add_states("q0", false, transition_q0);
    m.add_states("q1", false, transition_q1);
    m.add_states("q2", false, transition_q2);
    m.add_states("q3", true, transition_q3);

    if m.run(s) {
        println!("Yes");
    } else {
        println!("No");
    }
}
```

## おまけ

本問題は文字列が3文字であることが決定していたので [素朴な回答](#素朴な回答) が使えましたが，  
文字列長が可変長である場合はそうもいきません．  

文字列をsetに格納して， `len(set) == 1` かどうかでチェックができそうです．  
文字列を一度ループする必要があるので `O(len(S))` ですね．

```python
s = set()
for c in input():
  s.add(c)

print('No' if len(s) == 1 else 'Yes')
```

## まとめ

今回は有限オートマトンを使って簡単に遊んでみました．  
Rustを用いるとスッキリ実装できて，楽しかったです．  

このままレキサージェネレータの実装もスパッとできればいいなあ．  
