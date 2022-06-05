---
title: "GoBGPのneighbor addが何をやっているか見る"
description: ""
createdAt: "2021-04-04"
tags: ["bgp", "gobgp", "code-reading"]
imageLink: "/Drumato.png"
---

- [本記事の目標](#本記事の目標)
- [本題1: client側で何をしているのか](#本題1-client側で何をしているのか)
  - [client側結論](#client側結論)
  - [client実装詳細](#client実装詳細)
- [本題2: server側で何をしているのか](#本題2-server側で何をしているのか)
  - [server側結論](#server側結論)
  - [server実装詳細](#server実装詳細)
    - [BGP neighborの追加](#bgp-neighborの追加)
    - [TCPコネクションの確立](#tcpコネクションの確立)
- [おわりに](#おわりに)
- [参考資料](#参考資料)

前回の続き．  
[まだ読んでない方はそちら](http://drumato.com/ja/posts/gobgp-simple-ipv4-unicast/)を．  

また，**BGP unnumbered** についても記事を上げた．  
[興味のある人はそちら](https://drumato.com/ja/posts/briefly-understanding-bgp-unnumbered/)も．  
今回読むコードにはBGP unnumberedの設定が結構はいっている．  

リーディング対象は，2021/3/25現在の [masterのHEAD](https://github.com/osrg/gobgp/tree/7ff15bfa54ac1b0ff7b03ee73e2bee4e7a3d3d73)．  
GoBGPのライセンスはApache License 2.0．  
ライセンス表記をしておく．  

```text
Copyright (C) 2014-2017 Nippon Telegraph and Telephone Corporation.
```

今回から実際にGoBGPの実装を読んでいく．  
第一回の記事では `./gobgp neighbor add <peer-ip> as <peer-as>` のようにして，  
BGP Peerを張る，ということをしてみた．  

このとき，  

- `gobgp` ではデーモン側に対しどのようなgRPCメッセージを送信するのか
- `gobgpd` ではどのようにしてBGP OPENメッセージを作るのか

に着目しつつコードリーディングしてみる．  
コードリーディングの記事は読み手にとって得るものがあるように書くのは結構難しいので，  

- **大まかに何やってるのか** を言語化している部分
- 実装を詳細に追う部分

を分けることにした．  
ほとんどの人は前者だけを見れば十分だと思う．  

コードリーディングの方法だけど，  
`ghq get` でリポジトリ持ってきて，  
vim-lsp で定義ジャンプしつつ読んでる感じ．  

最後にも言うけど，GoBGPは命名が非常にわかりやすく，  
コード量はめちゃくちゃ多いけどずっと **"読みやすい!"** って言ってた．  

## 本記事の目標

- BGP implementation内の"BGP Peerを張る部分"を読む
- ついでにGo言語でgRPCを扱う方法も勉強する
  - gRPC client/serverを使ったことがないので

## 本題1: client側で何をしているのか

### client側結論

ここでは"`gobgp ...` というコマンド実行でclientは何をするのか"というのを言語化してみる．  

- [spf13/cobra](https://github.com/spf13/cobra)を利用した，CLIアプリ特有のコマンドライン引数解析
- `api/gobgp.proto` の `message Peer`に突っ込む情報を引数等から集める
- `/gobgpapi.GobgpApi/AddPeer` というエンドポイントにリクエストを送る

つまり，client側では **"引数をうまく処理して，gRPCリクエストを送信する"** 以上のことはしていない．  
プロトコル実装の本体はやはりgobgpdにある，ということがわかる．  

CLIとして用意するコマンドやオプションが多いのでコードは大きいが，  
クライアント側の理解はそこまで難しくない．  

では，  
`message Peer` という情報が，  
BGP Peer establishmentにおいてどのように作用するのか，という部分に注目してclientを読むことにする．  

それは恐らくBGPの勉強にも繋がるし，  
後でserver側を読む足がかりにもなるからだ．  

### client実装詳細

ここからは詳しくコードを読んでいくが，  
大まかに知りたいだけという人は読み飛ばしてもらって構わない．  

`message Peer` を作り上げる部分まで辿り着こう．  
まずは，`neighbor` サブコマンドがどこで定義されているのか探すことにする．  

`package main` の `func main()` を読むと，  
`newRootCmd()` という，`cobra.Command` を作る関数を見つける．  
これがCLIアプリのルートとなっているので，  
`newRootCmd()` から `neighbor` サブコマンドを辿り，  
更に `add` コマンドを探せば良いとわかる．  

`add` コマンドをぶら下げる部分を下に示す．  

```go
func newNeighborCmd() *cobra.Command {
	// stripped
	
	for _, v := range []string{cmdAdd, cmdDel, cmdUpdate} {
		cmd := &cobra.Command{
			Use: v,
			Run: func(c *cobra.Command, args []string) {
				if err := modNeighbor(c.Use, args); err != nil {
					exitWithError(err)
				}
			},
		}
		neighborCmd.AddCommand(cmd)
	}
	
	// stripped
}
```

`c.Use` には `add/del/update` のいずれかが入っていて，  
`args` は(今回の場合) `[]string{<peer-router-ip>, "as", <peer-as>}` のようになっている．  

`modNeighbor()`のやっていることというと，  

- `api.Peer` の情報を集める
  - これは後述する`client.AddPeer()`を呼び出す際に必要となる情報の集約である
  - `api.Peer` はまさしく(Go言語で表現された) `message Peer` である
- `client.AddPeer()`を呼び出す
  - これは `/gobgpapi.GobgpApi/AddPeer` というエンドポイントにgRPCリクエストを送信する関数
  - 厳密にはinterfaceとそのinstanceって感じになってるっぽい

という感じ．  
`modNeighbor()` を細かく見ていくことで，  
client側の実装を読む目的は達成されそうである．  

`modNeighbor()`の中身を見てみると，  
関数内でクロージャをたくさん作っていて読むのにコツが必要．  
こういうとき，定義はとにかく無視して，実行順に考えると良い．  

- `getNeighborConfig()`
  - `getNeighborAddress()` ... 通常は引数 `<peer-ip>` を返すだけ
    - BGP unnumberedなら `GetIPv6LinkLocalNeighborAddress(inteface)` を呼び出す
      - `netlink` パッケージで `ip neighbor show` 相当の出力を得る
- `updateNeighborConfig()`
  - 引数の多くを変換したりしつつ `api.Peer`に渡す
    - ここを読めば，Peer確立にどんな情報が使われるかがわかる

ここまで来て，ついに `client.AddPeer()` が呼び出される．  
ここまでがclient側の実装．

`updateNeighborConfig()` のようなコードの位置を知る事が大きな目的だったので，  
client実装はこれ以上深堀りしないこととする．  

## 本題2: server側で何をしているのか

### server側結論

こちらも同じく，  
どんなことをやっているのか大まかに書いてしまおう．  

- BGP Serverのスタート時，TCPコネクションを受け付けるListenerを作る
- clientからのリクエストに対するハンドラを呼び出す
  - ハンドラ `AddPeer()` はGo channelに登録されて，動的に呼び出される
    - `AddPeer()` ではPeerの設定と，サーバの持つneighbor mapへの登録などが行われる
- TCPコネクションが張られると，適宜別のハンドラが呼ばれる
  - すでにneighbor mapにpeerが存在する場合は再度張り直すっぽい?
  - そうでない場合，peerのFSM stateをACTIVEにする
- ACTIVE stateで実行するべき処理が行われる
  - `opensent()` という関数でOPEN Messageを用意して送信

それでは実際に見ていく．  
例によって，詳細に興味がない人は飛ばして構わない．  

### server実装詳細

先程client側から `client.AddPeer()` の呼び出しを無事に確認したので，  
server側で用意されている，エンドポイントハンドラから読んでいく．  
とはいっても結構複雑になっていて，到達するのも一苦労．  
BGP実装の本題はここからなので，正念場．  
ここで読み方のコツを紹介しておく

エンドポイントが `/gobgpapi.GobgpApi/AddPeer` なのはわかっているのでそれをgrepすると，  
`gobgp.pb.go` という自動生成ファイルにたどり着く．  
grepして飛ぶ，grepして飛ぶというのを繰り返すと，  
最終的に `pkg/server/server.go` の `newAPIserver()` にたどり着く．  
この関数は `pkg/server/server.go` の `NewBgpServer()` という関数で呼ばれていて，  
`cmd/gobgpd/main.go` から呼ばれている．  

ということで `main`関数を超絶おおざっぱに書くと，  

- `newAPIserver()` でエンドポイントに対するハンドラを用意する
- `go bgpServer.Serve()` でリクエストを待つ
- `InitialConfig()` という関数を呼び出す
  - ここで `BgpServer.StartBgp()` という関数が呼ばれ，後述する `reflect.Select()` 時に `passConnToPeer()` が実行される

構成になっていることがわかった．  
ハンドラの定義を実際に持ってこよう．  

```go
func (s *BgpServer) AddPeer(ctx context.Context, r *api.AddPeerRequest) error {
	return s.mgmtOperation(func() error {
		c, err := newNeighborFromAPIStruct(r.Peer)
		if err != nil {
			return err
		}
		return s.addNeighbor(c)
	}, true)
}
```

`mgmtOperation()` は `BgpServer` が持つ `chan *mgmtOp` というqueueに(第一引数の)関数を登録する処理で，  
`BgpServer.Serve()` によって `*mgmtOp` がpopされ，処理が実行される．  
これには `reflect` パッケージの `Select([]reflect.SelectCase)` という関数が使われている．  
この関数の存在を知らなかったけど，  
**可変数(実行時に個数が決定するような)のchannelから待ち受ける場合** にはこの関数を使い，  
"channelへのenqueueを監視して，対応するチャネルから値を取り出す"，みたいな時に使う．  

ということで，いい感じにスケジュールされて，  
(`newNeighborFromAPIStruct()`は文字通りリクエストからNeighbor構造体を作るだけなので)  
`addNeighbor()` が呼ばれることがわかった．  

#### BGP neighborの追加

`addNeighbor()`, いかにもな名前が来た．  
その名の通り，neighborを追加する処理の本体である．  
とはいえ結構長いので，コード自体は載せない．  
やっていることは，以下の通りである．  

- neighbor addressに対して既にPeerを張っているかチェック
  - `BgpServer.neighborMap` という分かりやすいマップが存在する
- peer groupが設定されている場合，指定されたgroupが存在するかチェック
  - GoBGPは複数のneighborをpeer groupにまとめてconfigurationする機能がある
- `vrf`が設定されている場合のチェックを行う
  - vrf ... BGP Peerごとにルーティングテーブルをもたせる，一種のisolation機能
  - vrfについてはいずれ記事を上げる予定なので省略
- `newPeer()` で新しくBGP Peerの構造体を作る
  - このとき `newFSM()` という関数でPeerの初期状態を定義している
    - 初期状態は **`BGP_FSM_IDLE`**
  - (当たり前だけど)GoBGPではBGP FSMを意識した設計がされている
- ポリシーの設定等を行う
  - `BgpServer.Policy`というメンバがあり， `assignmentMap` という `key: BGP Peer, value: Assignment`なマップがある
    - `Assignment` ... [ここ](https://github.com/osrg/gobgp/blob/master/docs/sources/policy.md) にあるように，BGP tableごとのpolicyを管理する構造体
- `neighborMap`に新しく加える
  - もしpeer groupが設定されていたら，そのグループにも追加する
- `startFSMHandler()`で **current stateで行うべき処理** に移行
  - ここらへんはRFC通りの実装になっているはず

あれ， `BGP_FSM_IDLE` なの?と思った方もいるかもしれない．  
私も結構長い間OPEN Messageが送られるパスに辿り着くことができず，苦労した．  
それについては次のセクションで説明する．  

#### TCPコネクションの確立

先程，  

> ここで `BgpServer.StartBgp()` という関数が呼ばれ，後述する `reflect.Select()` 時に `passConnToPeer()` が実行される

と書いたのを覚えているだろうか．  
ということで，`InitialConfig()` を見てみる．  
~~ここまでブログに載せていなかったので普通に後出し感があるけど~~  

```go
func InitialConfig(ctx context.Context, bgpServer *server.BgpServer, newConfig *config.BgpConfigSet, isGracefulRestart bool) (*config.BgpConfigSet, error) {
	if err := bgpServer.StartBgp(ctx, &api.StartBgpRequest{
```

ここから `StartBgp()` を掘り下げて行くと，  
`BgpServer.acceptCh` にTCPコネクションをenqueueするコードに出会うことができる．  

そして，`Serve()`内の`reflect.Select()`で `acceptCh` からpopされたコネクションを `passConnToPeer()` に渡す．  
まだ`neighborMap`に存在しないPeerとのコネクションが張られた場合，  
`BGP_FSM_ACTIVE`のPeerを作って`neighborMap`に格納．  

`pkg/fsm/fsm.go` を読むとACTIVEに対応する関数が存在し，  
内部を読んでみると，  

- `BGP_FSM_OPENSENT`に遷移(なんか送る前に移行してるっぽい)
  - ここらへんRFCちゃんと読んだらそういう実装にするべきって書いてあるかも?
- `opensent()` が動く
  - `NewBGPOpenMessage()` が呼び出され，TCPコネクションに対し送信される

という感じで，  
Peer確立への一歩を踏み出すところを発見できる．  

今回はここまでにしておこう．  

## おわりに

今回はGoBGPを読んで，  

- client側の実装
- server側の実装

をそれぞれ大まかに理解する，という趣旨のもとコードリーディングしてみた．  

かなり疲れたが，理解しやすいように注力されていたのでとても助かった．  
今後は経路広報のコードを読んだりしてみてもいいし，  
issue contributeしてもいいなー，と思っている(どう改変を加えればいいかは大体わかった)  

## 参考資料

- [石田渉さんのRIPE71の発表資料](https://ripe71.ripe.net/presentations/135-RIPE71_GoBGP.pdf)
  - RIPE Meeting ... RIPE NCCというRIRが定期開催するミーティング
- [Capability Codes](https://www.iana.org/assignments/capability-codes/capability-codes.xhtml) ... BGP Capabilitiesの識別コードを定義
- [インターネットルーティング入門](https://www.shoeisha.co.jp/book/detail/9784798134819)
  - 正直この本の内容を知っている人にとって，この記事は何も新しくない(あくまで"動かした"というところを残しておきたかった)
- [BGPチュートリアル](https://www.janog.gr.jp/meeting/janog40/application/files/7915/0097/6730/janog40-bgp-tutorial.pdf)
  - めちゃくちゃ詳しいスライド資料
- [Go | gRPC](https://grpc.io/docs/languages/go/) ... `google.golang.org/grpc`の使い方を調べるため
