---
date: 2022-06-07
lastmod: 2022-06-07
title: "The 1st TypeScript output"
tags: ["typescript"]
---

Blogを移行したのをきっかけに, ときどき日記みたいなのを投稿していくことにした.
今日はその, Blogを移行した話をつらつらと.
repositoryはこちら.

<https://github.com/Drumato/drumato.comv2>

## 経緯

まず, そもそもなんでBlogを移行しようと思っていたのか, みたいな話だけど, 理由は特にない.
ある日新卒同期に, 
｢鈴木僚太さんが執筆されている[ブルーベリー本](https://gihyo.jp/book/2022/978-4-297-12747-3) と呼ばれる本が欲しいんだよね｣って話をしてたら,
なんと恵んでくれることになった.
それを機にTypeScriptに入門したので, **せっかくならなにか作らないと** と思って手を出したのが自作Blogだった.
ちなみにTypeScriptのcodeを初めて書いた日から1週間ぐらいしか経ってないので,
今考えると普通に無茶だと思う.

以前運用していたBlogは **Hugo** と呼ばれるGo製のSSG frameworkで, すごいお手軽にtemplateを利用するだけでBlogを作り上げられる優れもの.
当時私が書いたのはblog templateに設定を注ぎ込むtomlと, ちょっと好みでstyleを書き換えたぐらい.
それでとてもきれいなBlogが動いていたので, UI/Frontend を書いたことがない私にはうってつけだった.

しかし今, 新卒engineerとして色々な分野の知識をcatch upしていると, Web Programmingに対する興味というか,
**｢これはinfra engineerとして活躍していきたいとしても, 身につけておかなければいけない"引き出し"だな｣** と感じる機会が増えてきた.
なので自作Blogを作ろうと思ったと, そういう感じ.

## 対応している機能

- あるdirectoryにmarkdownを置いておくと, build時に頑張ってcontentsを作ってくれる
- 記事/日記一覧機能が一応ある(paginationはまだない)
  - tagで検索することもできる
- code snippetはsyntax highlightが効くようになっている
- ToCだけvscodeの拡張機能で作れば, heading idは勝手に作ってくれる
- 一応頑張ってPC/mobileで最低限見れるものを作る
- 英語と日本語に対応している

こうしてみると, Frontendのcodingを一切したことがない私にしては頑張ったんじゃないかと思えてくる.
`yarn create next-app` は実行したけど, それ以外は基本的に全部自分で書いたし.

実際の記事画面を下に.
fontはKlee Oneというもので統一してる. 可愛い.

![img1](/images/the-1st-typescript/screenshot1.png)

Chromeの検証機能を使ってmobile画面を想定してみた.
こちらもそれなりに見やすいんじゃないかなーって思っている.
ずっとheaderが崩れる問題に直面してたんだけど, hamburger menuにすることで解決した.

![img2](/images/the-1st-typescript/screenshot2.png)

## 使った技術

さて, どのように作ろうかと思っていたのだけれど, 特段comment機能みたいなものも求めていなかったし,
これ結局SSGで完結しそうだなー, みたいな感覚があった.
なので結局は以下のような構成に.
Material UIを採用した理由は特になくて, 名前を知っていたから.

- language: TypeScript
- framework: Next.js(only SSG mode)
- UI library: MUI(Material UI)
- markdown rendering: react-markdown

## まだ作り込みたい部分

- dark mode
- 月別で記事を表示する機能
- SNS share

## 感想

TypeScript自体はかなり好きな言語だと思う.
私はtype systemに乗っかってcodingするのが大好きだし, script languageならではの軽快さもある.
GoやRustばかり書いているしそれらも大好きだけれど, TypeScriptはそれに続くぐらい好きな言語になるかもしれない.

Next.js自体はかなり入門しやすいんじゃないかなって思った.
少なくとも今回実装する上で必要になった機能については特に苦労しなかった.
もちろんperformanceの観点で最適化するべき部分はたくさんあるのかもしれないし,
SSG onlyだったから簡単だったんだよって話もあるかもしれないけど.
次はISRを触ってみたい.

強いて苦労した点をあげるなら, library云々というよりもstyling全般だと思う.
特にstyleが崩れる問題とかを解決するのはそれなりに時間がかかった.
あとはreact-markdownの仕様とか使い方かな.

## これから

個人的な趣味で2022年4月からbackend開発みたいな分野にはちょくちょく手を出していたんだけど,
今回ついにTypeScriptでなにかものを作ってみて, Web Programmingに真剣に挑戦してみる動機が十分にあると再確認できた.
私はinfra software engineeringの分野で活躍していきたいと思っているし, それは変わらないのだけれど,
そもそもCloud Technologyをどんどん使っていかないと持つことのできない視点があると思うし,
いずれuser friendlyなものを作る必要があると思う. そのためにWeb UIを作る経験が役立つと思う.

ということで, 次はもう少し仕様が大きく, 動的に色々扱うWeb Applicationを作って見ようと思う.
serviceとして公開するかはわからないけど, 必ずoutputはする予定.

