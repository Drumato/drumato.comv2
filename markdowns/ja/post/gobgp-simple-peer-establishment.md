---
title: "GoBGPでpeer establishmentをやってみる"
description: ""
createdAt: "2021-03-26"
tags: ["bgp", "gobgp"]
imageLink: "/images/gobgp/img1.png"
---

- [本記事の目標](#本記事の目標)
- [GoBGP前提知識](#gobgp前提知識)
- [BGP Peerの確立](#bgp-peerの確立)
  - [環境構築と設定](#環境構築と設定)
  - [gobgpを動かす](#gobgpを動かす)
  - [`gobgp neighbor` で確認](#gobgp-neighbor-で確認)
  - [OPENメッセージのパケット解析](#openメッセージのパケット解析)
  - [BGP FSMにおけるOpen Message](#bgp-fsmにおけるopen-message)
- [まとめ](#まとめ)
- [参考資料](#参考資料)
- [おまけ: ブログの形式について](#おまけ-ブログの形式について)

BGPの勉強をする上で，しっかり実装まで追いたかったのでコードリーディングしつつメモを残す．  
ざっと調べるだけでも，BGPを実装するOSSはいくつか存在する．

- [FRRouting](https://github.com/FRRouting/frr) ... IPv4/v6 routing protocol suite
  - BGP以外にもOSPF/RIPを含む多くのルーティングプロトコルを実装する巨大OSS
  - C実装
- [exabgp](https://github.com/Exa-Networks/exabgp) ... Python実装
- [GoBGP](https://github.com/osrg/gobgp) ... Go実装
- [RustyBGP](https://github.com/osrg/rustybgp) ... Rust実装

今回は以下の理由により，GoBGPを対象とする．  

- Go言語で書かれていて読みやすい
- BGP実装に特化している
  - 最初FRRoutingを読もうと思ったが，なるべくコンパクトに理解したかった

リーディング対象は，[2021/3/25時点のmasterのHEAD](https://github.com/osrg/gobgp/tree/7ff15bfa54ac1b0ff7b03ee73e2bee4e7a3d3d73)．  
GoBGPのライセンスはApache License 2.0．  
ライセンス表記をしておく．  

```text
Copyright (C) 2014-2017 Nippon Telegraph and Telephone Corporation.
```

今回はその第一回として，まずはGoBGPを使ってみることにする．  
BGPについての知識整理と，OPENメッセージを飛ばして，BGP Peerの確立を確認する．  

## 本記事の目標

- コードリーディングの前段階として，CLIアプリを使いつつコマンド体系を把握する
- BGP Peerを張るときにどのようなメッセージが飛んでいるのか理解する
- BGP OPENメッセージをWiresharkでキャプチャして中身を見る

## GoBGP前提知識

GoBGPのリポジトリを覗いてみると，  
Goにおけるプロジェクト構成のベストプラクティスに則っていることがわかる．  
`cmd/` にはビルドの成果物であるアプリが用意されている．  
それぞれ，  

- `gobgp` ... 後述する`gobgpd`とinteractionするためのCLIアプリ
- `gobgpd` ... BGP実装の本体であるデーモン．
  - `gobgp`やそれ以外のアプリケーションとは **[gRPC](https://grpc.io/)** でやり取りする

という感じ．  

ユーザはまずgobgpdを動かす．  
gobgpdはconfig-fileに沿って基本的なプロトコル処理を実行する．  
例えば，BGP Neighborやポリシーの設定など．  
その後，対話的なBGPメッセージの送信/操作等をgobgpコマンドで行う．  

## BGP Peerの確立

一般的に，CLIアプリは(ライブラリによって異なるが)以下のような設計になる．  

- `App` 的な構造体がある
- `App` にサブコマンドを追加していく
- `App.Run()` 的な呼び出しをする

つまり，普通にmain関数から読んでいけば処理を理解できる，というわけではない．  
`Command.Handler` 的なメンバから処理が始まることを考慮する必要がある．  

ということで，まずは使ってみる．  
それにより，"xx機能は`add`コマンドで呼び出せる"みたいなことが把握できる．  

### 環境構築と設定

まず，VMを2つ立てて，仮想ネットワークに接続させる．  
このVMにそれぞれ `192.168.33.10` と `192.168.33.11`を割り当てる．  
(以後node1,node2と呼称)  

[GoBGPのReleases](https://github.com/osrg/gobgp/releases)に行き，`gobgp_2.25.0_linux_amd64.tar.gz` のリンクを取得．  
各VM上でwget，tarして，ビルド済みのバイナリをダウンロードする．  

node1, node2にそれぞれ以下の `bgp.toml` を作成する．  

```toml
# node1の設定ファイル
[global.config]
  as = 65001
  router-id = "192.168.33.10"
```

```toml
# node2の設定ファイル
[global.config]
  as = 65002
  router-id = "192.168.33.11"
```

### gobgpを動かす

双方で `sudo ./gobgpd -f bgp.toml` としてデーモンを作成．  
別シェルを立ち上げて，  

```shell
./gobgp neighbor add 192.168.33.11 as 65002 #node1で実行
./gobgp neighbor add 192.168.33.10 as 65001 #node2で実行
```

を実行する．  

```shell
$ ./gobgp neighbor #node1で実行した場合
Peer             AS  Up/Down State       |#Received  Accepted
192.168.33.11 65002 00:12:43 Establ      |        0         0
```

BGP Peerが確立できているのが確認できる．  
このように，gobgpを使ってinteractiveにBGPメッセージの送受信が可能．  

`bgp.toml` に設定を書いておくことで，  
デーモン起動時にPeer確立させることもできる．  
今回の場合，以下のようになる．  

```toml
# node1
[global.config]
  as = 65001
  router-id = "192.168.33.10"

[[neighbors]]
  [neighbors.config]
    neighbor-address = "192.168.33.11"
    peer-as = 65002
```

```toml
# node2
[global.config]
  as = 65002
  router-id = "192.168.33.11"

[[neighbors]]
  [neighbors.config]
    neighbor-address = "192.168.33.10"
    peer-as = 65001
```

### `gobgp neighbor` で確認

`sudo ./gobgpd -f bgp.toml` 後 `./gobgp neighbor` すると，  
同様にStateがEstablishedになっているのを確認できる．  

より詳しくBGP Peerの情報を確認したい場合，  
Peerを張った相手のIPアドレスを指定することで可能．  

```shell
$ ./gobgp neighbor 192.168.33.11 # node1で実行

BGP neighbor is 192.168.33.11, remote AS 65002
  BGP version 4, remote router ID 192.168.33.11
  BGP state = ESTABLISHED, up for 00:16:21
  BGP OutQ = 0, Flops = 0
  Hold time is 90, keepalive interval is 30 seconds
  Configured hold time is 90, keepalive interval is 30 seconds

  Neighbor capabilities:
    multiprotocol:
        ipv4-unicast:   advertised and received
    route-refresh:      advertised and received
    extended-nexthop:   advertised and received
        Local:  nlri: ipv4-unicast, nexthop: ipv6
        Remote: nlri: ipv4-unicast, nexthop: ipv6
    4-octet-as: advertised and received
  Message statistics:
                         Sent       Rcvd
    Opens:                  1          1
    Notifications:          0          0
    Updates:                0          0
    Keepalives:            33         33
    Route Refresh:          0          0
    Discarded:              0          0
    Total:                 34         34
  Route statistics:
    Advertised:             0
    Received:               0
    Accepted:               0
```

この出力から多くの情報を得ることができる．  

- `Hold Time` ... Peerのライフタイム
  - BGP SpeakerはPeer先からUPDATEかKEEPALIVEが一定時間送信されなかった場合Peerを切断する
- Neighbor Capabilities
  - BGP Speaker同士はOPENメッセージの送信時，"この機能に対応しています"というオプション列を送信する
    - この機能拡張の仕組みを **BGP Capabilities** という
    - これはOPENメッセージの *Optional Parameters* フィールドに載っける
  - `multiprotocol` ... MP-BGPに対応しているかどうか
    - BGP-4のコア仕様[^1]では，IPv4の経路情報しか扱うことができない
    - IPv6に適用するためにMP-BGP[^2]が策定
  - `route-refresh` ... [RFC2918](https://tools.ietf.org/html/rfc2918)で追加されたBGPメッセージ
    - 経路情報の再送信を要求するメッセージ
  - `extended-nexthop` ... **次回の記事で取り扱う**
  - `4-octet-as` ... 4octetでAS numberを表現できるか
- Message statistics ... ピア間をどのようなBGP Messageが流れたか
- 経路広報について(広報したか/受け取ったか)

### OPENメッセージのパケット解析

node1では `sudo tcpdump tcp port bgp -n -w node1.pcap` のようにしてパケットキャプチャも走らせておいた．  
ということで，OPENメッセージをパケットレベルでも見てみることにする．  

![img1](/images/gobgp/img1.png)  

- BGP Message Header
  - `Marker/16octet` ... BGP Peer間の同期を取るために用いられる領域
    - OPENメッセージの場合ビットはすべて1が立つ
    - Peer間で特別な認証を行う場合には認証情報が書き込まれる
  - `Length/2` ... ヘッダを含むBGP Message全体の長さを表現
    - 19~4096の範囲を取る
  - `Type/1` ... BGP Message Type
- Open Message
  - `Version/1` ... BGP-4の場合 `4`
  - `My Autonomous System/2` ... 情報を送信するBGP SpeakerのAS number
  - `HoldTime/2` ... BGP SpeakerがPeerを切断するまでの時間
    - KEEPALIVEかUPDATEを受け取るとタイマーリセット
  - `BGP Identifier/4` ... BGP Speakerの識別子
    - 通常，BGPスピーカの持つIPアドレスのうち1つ
  - `Option Parameter Length/1` ... Option Parameterの長さ
    - オプションが使われていなければ `0`
  - `Option Parameter/variable` ... `<Option Type, Option Length, Option Value>` という形式に
    - 今回の場合 `type=2(capabilities), length=22`という感じになっていうr
      - capabilitiesのvalueは更に可変長リストになっている[^3]

メッセージヘッダのフィールド数はそこまで多くないので，把握は難しくない．  

### BGP FSMにおけるOpen Message

BGP FSMを確認すると，  
Openメッセージを送信したSpeakerは `OpenSent` という状態に遷移し，  
Peer先からOpenメッセージが送信されてくるのを待つ．  
BGP SpeakerどちらもがOpenを送る側と受け取る側を経験すると，  
`OpenConfirm` 状態に遷移する．  
この状態でKEEPALIVEの送受信が完了すると，`Established`状態に遷移して終了．  

各状態ではNotificationメッセージが送信される可能性がある．  
BGPネットワークでデバッグしたいときはこのNotificationを解析すれば良い．  
とはいえ，本記事が対象とするようなミニマムで決め打たれたネットワークでピア確立は失敗しないと思うけど．  

## まとめ

今回はGoBGPを使って，サクッとPeer確立するまでをやってみた．  
次回はVMネットワークをもう少し拡大して，  
`gobgp global rib add -a ipv4 <ip-prefix>` のように経路広報を行い，  
どのようにUPDATEメッセージが流れるのかを確認したい．  

第三回からコードリーディングできたらいいな．  

## 参考資料

- [石田渉さんのRIPE71の発表資料](https://ripe71.ripe.net/presentations/135-RIPE71_GoBGP.pdf)
  - RIPE Meeting ... RIPE NCCというRIRが定期開催するミーティング
- [Capability Codes](https://www.iana.org/assignments/capability-codes/capability-codes.xhtml) ... BGP Capabilitiesの識別コード一覧
- [インターネットルーティング入門](https://www.shoeisha.co.jp/book/detail/9784798134819)
  - BGP以外にもRIPやOSPFなどのルーティングプロトコルを網羅
  - 正直この本の内容を知っている人にとって，この記事は何も新しくないかも(あくまで"動かした"というところを残しておきたかった)

## おまけ: ブログの形式について

今までは解説するようなブログの形式が多かったんですが，  
書く記事が対象とする技術のレベルが上ってくると，どうしても共有しなければならない事前知識が増えていったりして，  
執筆コストが大きくなっちゃうんですよね．  

そういった記事を書かなくなる，というわけではないんですが，  
普段勉強したことをアウトプットするレベルの記事はメモっぽくしようと思います．  
若干ハイコンテキストになってしまいますが，まずは自分にとって有用なものを心がける．  

[^1]: [RFC4271](https://tools.ietf.org/html/rfc4271)  
[^2]: [RFC4760](https://tools.ietf.org/html/rfc4760)  
[^3]: [RFC3392( *Capabilities Advertisement with BGP-4* )](https://tools.ietf.org/html/rfc3392)を読むと良い．  
