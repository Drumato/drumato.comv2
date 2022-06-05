---
title: "今の私が持っていないskillを考える"
description: ""
createdAt: "2021-09-20"
tags: ["essay"]
imageLink: "/Drumato.png"
---

- [Git](#git)
- [Web programming](#web-programming)
- [Programming Language Processor](#programming-language-processor)
- [Network](#network)
- [Misc](#misc)
- [終わりに](#終わりに)

お久しぶりです．  
**新卒入社の日** が近づいてきました．  
自分がどれだけengineering performanceを出せるのか，というのがしっかり現れるので，  
そういう意味でも早く入社日か来ないかなー，と楽しみにしていたりします．

それに伴って，今の自分が持つ技術力をなんとなく振り返りたくなりました．  
特に， **何ができないのか** については振り返ったことがないですし，  
これからengineerになるまでに身につけておこうという活動方針にもなるので，  
一度考えてみるのが大事かな，という風に思います．  
"できること" については今回は扱わないことにします．  

だいぶ赤裸々に書くのでがっかりされるかもしれませんが，  
自分を過大評価することほど虚しいものはないですよね．正直に．  

書き始めたら永遠に書けることに気がついてしまったので，  
適度に切り上げています．  
またcategorizeも無限にできるので，  
横着してMiscに書いています．  

何ができないのか，というのを正確に知ることは意外と難しかったりするものです．  
というのも，そういうものは大抵，自分の思慮の及ぶ範囲から外に存在していて，  
その大きさや全容を推し量ることができないからです．  

しかし，それをあえてやってみることで，  
**あぁ，ここまでしか理解していないのか** とわかるかもしれません．  
ということで，やってみましょう．

## Git

まず，基本的に失敗が怖いので調べながら使っています．  
初歩的なことを除いて， **やりたいことをO(1)で実行** できません．  
たいてい `mkdir tmp && cd tmp` して，そこで挙動の確認を行ってから，  
実際に作業したいrepo上で同じことを行います．  
なので使いこなせているとは到底言えません．  

`checkout`は **結構雰囲気** で使っています．  
なので何をやっているか，という具体的な話はできません．  

**`merge`はあまり使いません．**  
たいていmainからbranch切って，そのbranchをremote pushするので完結させてしまいます．  
なのでちょっと **logが汚くなりがち** です．  
本当は`remote/main` -> `local/feature` -> `local/feature-dev` のように切って,  
featureにmergeしてからpushした方がきれいなんでしょう．  

`bisect` を使ったことは全くありません．  

**内部構造にも全然詳しくない** です．  
commit/branch/blob objectの具体的な仕組みについては説明できません．  
low-level APIとかを使ってtrouble shootingする，みたいなのもできないと思います．  
調べたらできるかもしれませんが，特にそういうことをやろうと思ったこともないです．  

gitconfigも特に凝ったものを使っていません．  
普段のaccountだけじゃなくて会社用，みたいなのも使うかもしれないし，  
そこらへんのscriptは書いて好きにswitchingするといいんだろうなあー．  
というか， **local configを使えばいいんだと思います．**  
多分調べないと使い方わからないですが．  

## Web programming

まずほぼやったことがありません．  
このBlog( <https://www.drumato.com> ) はHugoで作られていて，  
これは私のように全然わからない人でもsiteが作れてしまうスグレモノなのです．  

なので1からlogin機構作ってとか，SNS連携してとか言われると **だいぶ困っちゃいます．**  
ほぼほぼすべて調べながらやることになってしまうので，おそらくめちゃくちゃ効率が悪いです．  
調べながらcodingすること自体は当たり前なのですが，  
わかりやすいようにcompiler devと比較します．  

- compiler devの場合
  - tokenizer/parser/semantics analyzer/IR generatorなど， **基本的なmoduleの構成法** がある程度わかっている
  - また， **一度以上作ったことがある**
  - よって，調べながらではあるけどそれなりに書ける
- web programmingの場合
  - 何も知らないので，まずはtutorialとかやらないといけない
  - "今はこうやって書くのが良いとされている"みたいな **土地勘** もないので，変なように作ってしまうかも

というような感じです．  
調べるときって，何を調べたいか具体的になっていたほうがいいと思いますが，  
**技術に対する解像度がだいぶ異なる** ので，手の動くspeedがだいぶ違います．  

Web技術に関連する用語は，たいてい1行ぐらいの説明，または全く説明できません．  
幸い技術については高い関心があるので，色々調べてちょっと理解するまでのspeedには少し自信がありますが，  
そもそもよくわからないものに関しては，背景知識からガガーっと仕入れないといけないので時間がかかりがち．  
Web界隈は特に"新しい技術が新しい技術によって置き換えられる"みたいなのが多い印象なので，  
そこらへんの歴史から追っていくとだいぶ時間がかかります．  

最後に，これは一番感じているpointですが，  
(frontendにしてもbackendにしても) **incrementalに開発する方法** が全く想像できません．  
例えばcompilerなら"まずは `return 42` する" とか，  
network protocolなら"細かいevent processingはまずは無視する"とか，  
こうminimalに開発をはじめて，どんどんsnowballさせる妄想をするのができますが，  
Web開発でそれをやる方法が全然わかりません．  
これが，今Web programmingに全く触れていない一番大きな理由ですね．  

## Programming Language Processor

学生生活のほぼすべてを費やしてきたこの分野ですが，  
**もちろんできないことだらけ** です．  
ただ他の分野と違ってだいぶ具体的な話ができると思います．  

まず，"high performance"なcompiler devについては経験がありません．  
**特に考えずでっかいstructを用意** して突っ込んだり，  
まずは`Vec<T>`にしちゃうか，みたいなのを軽率に行います．  

例えば入力されたsource codeに対して，FILE streamのまま扱うのではなく，  
それら全体をheap allocateしたあとで更にそれぞれのtokenにcopyしたり，  
source codeをなめる処理を何回か行ったり，みたいなことをやったりします．  

これは **"字句解析と構文解析を分けるか問題"** とか，  
**"手動最適化を早くからやるな問題"** にも関わってくるので一概には言えないんですが，  
ともかくそういう配慮を持ってcodeを書く，みたいなことを日常的に行なえません．  

"`Box<dyn trait>` で書きたいけどdispatching遅いらしいし `enum` にするか"  
みたいな漠然としたideaしかありません．  

次に，optimizationについては全然詳しくありません．  
一応dragon bookとかtiger book, その他言語処理系の本や記事は結構読んできたので，  
data-flow analysisやconstant foldingみたいな凄い基本的な話はできますが，  
数理的な解説や，実際のalgorithmについてはあんまりわかりません．  
本当に簡単な，AST levelの最適化しか作ったことがありません．  

conferenceに参加したり，最新の論文を読んだりすることもあんまりしたことがないです．  
集合論や述語論理，圏論などにも詳しくないですし，  
type-systemは実装ベースでしか理解できないからですね．  
なので依存型やrefinement types, parametric polymorphismなどの形式的な議論ができません．  

LL parser以外の実装経験はありません．  
LRやLALRなどはそれなりに有名な構文解析法で，  
一度手作業で実装してみようとしましたが普通に断念しました．  
正直parser generatorはちゃんと作ってみたいと思っているんですが，  
なかなか難しいですね．  

同じく，字句解析器生成系の実装経験もないです．  
regex engineと似たようにしてつくる，みたいななんとなくの感覚はあります．  
tiger bookを一応真剣に読んだ経験からですが...  
もっというと，flexとかを使った経験もほぼないですね．  
いつもいつも手書きしていました．  

言語処理系というと，intepreterについてはもっと知らないことが多いです．  
まずoptimizationはほぼほぼ何も知りません．  
幸い [Fast VM Interpreterを書いていた友達(と勝手に思っている)](https://twitter.com/m421m0)がlabs youthの同期にいたので，  
stack cachingとかの話をなんとなーく覚えていたりしますがもちろん実装したことはありません．  

なのでJIT系の知識も特になかったりします．  
JITといえば川合さんですが，川合さんに面倒を見てもらっていたのにそれを触らなかったのはなぜだ...  
assembler作りたかったのでしょうがないですね．  

簡単なTree-Walking Interpreterとかは作ったことあります．  
[Monkey](https://www.oreilly.co.jp/books/9784873118222/) +αみたいなやつ．  

## Network

最近一生懸命勉強しているところなので，  
"できないこと"の感覚は一番つかめているかもしれません．  

まず，小規模でも大規模でも，実際にnetwork applianceを触って構築したことはありません．  
なので，"Datacenterなどではこうやって経路集約するのが基本だよ"みたいな話とか，  
"以前はこうやってBroadcast Stormを防いでいたんだよ"みたいな肌感覚は人から教えられないとわからないです．  

本当は学生生活でこういうのを経験する機会がちょっとはあったんですが，  
なんか参加せずにここまで来てしまいました．  
入社したらCCIEとか取りたいなー．  

同じようにして，Routing Protocolの運用もそこまで経験がないので，  
よくあるdesign patternみたいなものとかには明るくありません．  

iBGP RRとかを例にとっても，  
どのくらいでfull meshが厳しくなってRRを採用するのかとか，  
RR clusterみたいなのは何台構成にするのかとか，そういうのもあんまりわかりません．  

次に，ベンダ製品についてはほぼほぼ無知です．  
Ciscoはこんな製品を出していてxxに使える，みたいな話とか，  
Aは対応しているがBは対応していない，みたいなのも知りません．  

RFCを読むspeedですが，英語がそもそも得意ではないのも相まってめちゃくちゃ遅いです．  
知らない単語ばっか出てきて毎度戸惑いますし，  
"つまりどういうことだってばよ"となって結局全部調べたりするのでよくstopします．  

特定のOSSに対するcontributionの経験がありません．  
なのでnetworkに関わるsoftware developmentの経験は薄いと言えます．  

まだnetworkに関するsenseが十分に養われていないので，trouble shootingにはちょっと時間がかかります．  
**"どうせここにrouteが入っていないでしょ"** みたいなエスパーができないので，  
大体senderから一つずつpacapしたりfib見て解決します．  

## Misc

ここからは適当に書きまくります．  

- Programming
  - Common
    - software design/architectureは知りません
      - 教養程度にDDD等を勉強したことはありますが，実践して大規模appを作ったりはしていません
    - OSS contributionの経験が非常に少ないです
      - code readingはよくやります
    - 仰々しいcodeを書きがちです
      - 最近YAGNIを強く意識しはじめました
      - code baseが大きくなりがち
  - Rust
    - たくさん書いてきましたが，すごい凝ったことができるわけではありません．
    - lifetimeはownershipについてはある程度理解していますが，普通にcompile errorを出すことはあります
    - その時解決法に困ったりすることも全然あります
    - unsafe/free-standing programmingの経験はほぼありません
  - Go
    - goroutineやpackage contextに対して深い知見は持っていません
      - 使う分にはできますが，goroutine schedulerやruntimeについて詳しいわけではないです
      - またそこまでたくさんの経験もありません
    - Garbage Collectionのalgorithmは説明できません
  - C
    - manが使えない環境ではめちゃくちゃ効率が落ちます
    - gdb/lldbについても基本的な機能しか知りません
    - memory efficiencyを最大限意識したprogrammingはできません
  - Python
    - 書くのは早いですが，読むのは遅いです
    - 1k LoC以上のprojectをやったことがありません
  - Haskell
    - 最低限の文法は知っていますが，細かい言語思想は知りません
    - ちょっとしたことで困って書き方を調べます
    - 1k LoC以上のprojectをやったことがありません
- Linux
  - awk/sedはほぼ使えません
  - もっというとshell scriptをサクッと書くことができません
    - たいていめちゃくちゃ調べます
  - shell shortcutも数個しか使っていません
  - kernel data structure/algorithmにも詳しくありません
    - 知る/読むのに抵抗はないですしよく調べますが，たいてい時間がかかります
  - system callはuser interfaceまでしか意識できていません
  - Debian以外のdistroはほぼ使ったことがありません
    - 最近arch linuxに乗り換えて感動しています
  - 知らないsysctl parameterがたくさんあります
- Infra
  - Reliability Engineeringに対する感覚が備わっていません
    - alertはどれを削るべきで，metricsはどうautomationに活用できて，みたいな経験がありません
  - "入門 監視" とかは読んで入門的な知識は入っていますが，real serviceを運用した経験がありません
  - storageに関する知識はほぼ0です
    - どういうqueryが早くて，どうscaleさせて，みたいなのを試行錯誤したことはありません
- Docker/Container
  - Docker imageのprivate registryを運用した経験はありません
  - imageのbuild speedやsizeを最適化する，みたいなことをじっくり取り組んだことはありません
    - multistaging buildとかはいつも調べてやっています
  - namespaceやcgroupsなどの基本的な話は知っていますが，詳細に解説することはできません
- Kubernetes
  - CNI pluginやCSI pluginを実装した経験はありません
  - Kubernetes code readingが不十分です
    - 特にapi-serverとkubeletは全く手がつけられていません
  - podのscheduling algorithmに手を加える，みたいなことをやったことはありません
  - HA構成について詳しくありません
- Vim/Neovim
  - pluginの開発経験はありません
  - vimscriptやluaを自分で書いたりすることはできません
  - 普段使いしていますが，そこまで操作speedは早くありません
    - 日に日にちょっとずつ新しい操作を覚えていますが...

## 終わりに

なんか凄い大きな記事になってしまいました．だいぶ削ったのに．  
しかもcodeは全然載せていないから，純粋に日本語を1万字ぐらい書いたことになります．  
でも，凄い良い整理になりました．お勉強頑張ります．  
