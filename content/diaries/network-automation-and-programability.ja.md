---
date: 2022-10-11
lastmod: 2022-10-11
title: "｢ネットワーク自動化とプログラマビリティ｣を読んで"
tags: ["network"]
---

久しぶりに更新。
最近も変わらず、Kubernetesのことばかりやっている。
特にCluster APIの検証とか、それに関わるエコシステムの実装とかを重点的にやっている。

4月に新卒入社し、7月に配属されて以来、ずっと業務に関することや、
それに繋がりそうな技術ばかり調べていたので、
久しぶりに趣味の勉強したいなと思い、いくつか技術書を買った。
そして、沖縄に向かう飛行機でまとまった読書時間を確保できそうだったので、
**｢ネットワーク自動化とプログラマビリティ｣** をざっと流し読みした。

<https://www.oreilly.co.jp/books/9784873119816/>

ここでは短く、雑に感想をまとめておこうと思う。

## 概要

本書の内容を個人的にまとめるなら、以下の成分をちょうど均等にまとめたもののように感じた。

- **"ネットワーク自動化とはなにか、どのように実践するか"** を説明できるようにするための情報
  - ネットワーク自動化を実現する技術の背景
  - 注目されることとなった歴史的理由
  - ネットワーク自動化を実現することの重要性
  - どういった目的で導入するべきなのかの紹介
- 上記を実践したい **"ネットワークエンジニア"** に向けた、具体的な技術知識
  - Linuxのファイルシステムやコマンド、sysctlパラメータを制御したネットワーク機能の紹介
  - Linuxと合わせてよく利用されるPythonの簡単な紹介
  - Jinjaなどのテンプレート言語実用例
  - AnsibleやSaltなどの自動化ツール
  - それらをGitで管理して、CIに組み込むまでの流れ解説

本書を読む前提として、私はSDNやネットワーク自動化、関連したReliability Engineeringまでの考え方や実例を学ばさせていただいたことから、これらの概念を読み進めるのに苦労しなかった。

- [仮想ルータクラスタを自動でローリングアップデートする仕組みの検討と実装](https://engineering.linecorp.com/ja/blog/rollingupdate-vrouter-cluster/)
- [BGP Graceful Restartに関わる各OSSルーティングプラットフォームの動向調査](https://engineering.linecorp.com/ja/blog/oss-routing-platform-involved-in-bgp-graceful-restart/)

一方で本書を読み、改めてOpenFlow周りの歴史的経緯や、今日のネットワーキングに与える影響度みたいな部分を勉強した。
これらの内容はは、読み物的な意味でとても貴重だった。
こういった内容をきちんと日本語で言語化されている本が出版されていることは非常に大きいと思う。
監訳者の土屋さんには、YouTubeでshow intを通じた活動も相まって、本当に頭が上がらない。

## 特にしたい話

### ソフトウェアエンジニアがネットワークに取り組むということ

私はソフトウェア開発のレイヤからネットワーク、
特にSDNコントローラの開発やアーキテクチャに興味を持ち取り組んできた経緯がある。
したがって、3章から6章、そして8/9章は既知で、慣れ親しんだ内容が多かった。
しかし、XML-RPCやNETCONFコンフィグレーション/オペレーションの実例はあまり詳しくなかったので、勉強になった。

全体で600ページ弱の分厚い本だが、3章以降の各章はある程度独立しているので、
目次で内容を俯瞰してつまみ食いすれば、そこまで読むハードルは高くないと思う。

必ずしもそうとはいえないが、
ソフトウェア開発について取り組んできた人間がネットワークアーキテクチャや運用等に関わるパターンには、
｢ソフトウェアによる運用の効率化、あるいはプログラマビリティの実現を **"ネイティブに"** 考え始められる｣ という利点があるように感じた。

上述した記事のように、私はKubernetesを利用したSDNプラットフォームの開発に参加させていただいた背景もあり、
Webアプリケーションやその他ソフトウェアシステムの運用と、ネットワーク運用に対するアプローチの違いをそこまで大きく認識していない。
もちろんネットワークレイヤでは、より物理的な障害特性等を考慮したりなど、考えるべきポイントが異なるのは言うまでもないが、
**"ソフトウェアないし何らかの自動化ソリューションを適用して改善する"** ことに対する抵抗が全くない。
これは、GoogleがSREの採用方針として **"ピュアなソフトウェアエンジニアスキルを持っていること"** を掲げているのに近いものだと感じている。

### 組織の中でどうネットワークインテリジェンスを高めるか

SRE界隈でよく議論されるものと近い話題として、
こうした自動化やプログラマビリティの導入等、運用方針の大規模な刷新にはビジネスレイヤや組織への考慮が欠かせない、というものがある。
そのような点もきれいに書かれていて好印象だった。

## 総評

私はこの本を、以下のような人に薦めたいと感じた。

- ネットワークに関する知識はあるが、既存ソリューションや独自システムを構築して自動化に手を出してみたいネットワークエンジニアの方
- 今日のネットワーキングがどのようなことに感心を持っているかという一例を勉強したいソフトウェアエンジニアの方
  - 今日においては、単にSDNなどを利用して自動化するだけでなく、DCN用に新たな輻輳制御アルゴリズムが考案されたりと様々ある
  - その中でも、ネットワーク自動化については長い間取り組まれてきた、大きな分野であり、勉強の価値はある

---

## 余談

そろそろ社内で作っていたり動かしている諸々を外部成果に切り出せそうな気がしている。
これができれば、自分のKubernetesエンジニア/SREとしてのキャリアになりそうな気がするので、努力あるのみ。

それとは別に、こういった趣味の勉強は欠かさず行って、エンジニアとしての価値を高め続けたいと感じている。
