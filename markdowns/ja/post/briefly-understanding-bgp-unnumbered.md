---
title: "BGP unnumberedをちょっとだけ理解する"
description: "初めてBGP unnumberedを試してみた記事."
createdAt: "2021-03-31"
tags: ["bgp", "gobgp"]
imageLink: "/images/gobgp/img10.png"
---

- [従来のBGP IPv4 Advertisement](#従来のbgp-ipv4-advertisement)
- [MP-BGPについて](#mp-bgpについて)
- [Advertising IPv4 Network Layer Reachability Information (NLRI) with an IPv6 Next Hop](#advertising-ipv4-network-layer-reachability-information-nlri-with-an-ipv6-next-hop)
- [とにかくやってみる](#とにかくやってみる)
  - [本格的にパケット解析するよ](#本格的にパケット解析するよ)
    - [ICMPv6 Neighbor Discovery](#icmpv6-neighbor-discovery)
    - [BGP OPEN](#bgp-open)
    - [UPDATE](#update)
- [おわりに](#おわりに)
- [おまけ: iBGP/eBGPのNEXT_HOPについて](#おまけ-ibgpebgpのnext_hopについて)
- [参考文献](#参考文献)
- [脚注](#脚注)

> この記事は初めてBGP unnumberedを試してみた記事であり，その動作の詳細を解説するものではありません．
> 簡潔な解説であればこちらに記載されているので，良ければこちらもご参照いただければと思います．
> <https://scrapbox.io/drumato-medley/BGP_Unnumbered>  

前回のGoBGPメモに記載した通り，今は `gobgp neighbor add <ip-addr> as <peer-as>` コマンドに関するコードを読んでいて，それについての記事も執筆中である．  

コードを読んでいたところ，`gobgp neighbor add interface <ifname>` という形式でPeerを張ることができる事に気づいた．Peerのipv4 addressがわかっていない状態でどうやってPeerを張るんだろうと思っていたら，**BGP Unnumbered** という技術があることを知った． [GoBGP公式のドキュメント](https://github.com/osrg/gobgp/blob/master/docs/sources/unnumbered-bgp.md)もある．  

しかし，実際にやってみないことにはよくわからない．私の場合v6やBGPについての知識も足りないので，色々知識補完しなければ理解できなかった．  

ということで，BGP Unnumberedを理解するのに必要な知識(の概要)をここにまとめてみる．すべての知識をまとめることはできないので，あくまで **キーワードをまとめつつ，実際にBGP Unnumberedを動かす** というのを記事の趣旨としておく．  

## 従来のBGP IPv4 Advertisement

ここではまず，従来のBGP-4におけるIPv4経路広報についてまとめておく．  

- TCP port 179でTCPコネクションを張り，その上でBGP sessionを確立する
- session確立後，互いの持つ経路情報を広報しあう
  - このとき，NEXT_HOPにipv4 addressを含める必要がある
  - NEXT_HOPは基本的にadvertiseするBGP Speakerのaddressである
  - そのために，各eBGP Speakerはipv4 addressを持っている必要がある

第一回/第二回で行ったGoBGPデモがまさにこの例である．NEXT_HOPの挙動はiBGP/eBGPによって異なるが，これについては[おまけ](#おまけ-ibgpebgpのnext_hopについて)にまとめた．  

## MP-BGPについて

次に，IPv6とBGPの関係についてまとめる．RFC4760では，BGP-4には3つのipv4 dependencyがあるとしている．  

- NEXT_HOP attribute ... 単一のIPv4 address表現
- AGGREGATOR ... Optional transitiveに指定されたpath attribute
- NLRI ... IPv4 address prefix

このうち，NEXT_HOP, NLRIをmulti network protocolに対応させることが求められるとしている．(Route Aggregationについてはあまり理解していないので今回は省略，また記事を出すかも)  

RFC4760で拡張されたPath attributeは2つ．  

- **MP_REACH_NLRI** ... option non-transitive
  - `AFI( Address Family Identifier )/2octet` ... 伝達するnetwork protocolのaddressを識別する情報
    - 後述するSAFIと合わせて判断される
  - `SAFI( Subsequent Address Family Identifier )/1octet` ... AFIで識別されたprotocolの詳細識別
  - `Length of Next Hop Network Address/1octet` ... `Network Address of Next Hop` のoctet長
  - `Network Address of Next Hop/variable` ... 経路のNext Hop情報
  - `Reserved/1octet` ... 予約
  - `NLRI/variable`
- **MP_UNREACH_NLRI** ... option non-transitive
  - `AFI/2octet`
  - `SAFI/1octet`
  - `Withdrawn Routes/variable` ... 削除される経路

例えばIPv6 unicast routeの広報の場合，`AFI = 2, SAFI = 1`となる．  

## [Advertising IPv4 Network Layer Reachability Information (NLRI) with an IPv6 Next Hop](https://tools.ietf.org/html/rfc8950)

IPv4経路広報をIPv6 nexthopで行う，というもの．RFC5549から始まり，現在はObsoleted by: RFC8950ということになっている．BGP unnumberedではIPv6 Link-Local Unicast addressを利用してBGP peerを張るが，その上でIPv4の経路を広報するときに，このRFC8950の技術を利用する．  

## とにかくやってみる

実際に動かしてみつつ，BGP Messageをキャプチャして中身を読んで見る．今回の検証環境は[こちらのdocument](https://cumulusnetworks.com/blog/bgp-unnumbered-overview/)を参考にした．Vagrantは2.2.14, VirtualBoxは6.1.18. 図にすると，こんな感じだろうか．  

![img5](/images/gobgp/img5.png)  

Vagrantfileを載せておく．もしこのファイルそのままで動かなかったら，上ドキュメントのように，  

- まずはipv4 interfaceを使って普通にBGP Peering
- その後unnunmered BGP

というように段階を踏んでみたら動くと思う．  

```ruby
Vagrant.configure("2") do |config|
    config.vm.define "spine1" do |dev|
        dev.vm.box = "CumulusCommunity/cumulus-vx"
        dev.vm.hostname = "spine1"

        dev.vm.network "private_network", virtualbox__intnet: "link1", auto_config: false    # swp1
        dev.vm.network "private_network", virtualbox__intnet: "link2", auto_config: false    # swp2

        dev.vm.provision :shell, inline: <<-SHELL
            sudo net add bgp autonomous-system 65020
            sudo net add loopback lo ip address 192.168.0.21/32
            sudo net add bgp neighbor swp1 interface remote-as external
            sudo net add bgp neighbor swp2 interface remote-as external
            sudo net add bgp neighbor swp1 capability extended-nexthop
            sudo net add bgp neighbor swp2 capability extended-nexthop
            sudo net commit
        SHELL
    end

    config.vm.define "leaf1" do |dev|
        dev.vm.box = "CumulusCommunity/cumulus-vx"
        dev.vm.hostname = "leaf1"

        dev.vm.network "private_network", virtualbox__intnet: "link1", auto_config: false    # swp51
        dev.vm.provision :shell, inline: <<-SHELL
            sudo net add bgp autonomous-system 65011
            sudo net add loopback lo ip address 192.0.2.1/32
            sudo net add bgp neighbor swp1 interface remote-as external
            sudo net add bgp neighbor swp1 capability extended-nexthop
            sudo net add bgp network 192.0.2.1/32
            sudo net commit
        SHELL
    end

    config.vm.define "leaf2" do |dev|
        dev.vm.box = "CumulusCommunity/cumulus-vx"
        dev.vm.hostname = "leaf2"

        dev.vm.network "private_network", virtualbox__intnet: "link2", auto_config: false    # swp51

        dev.vm.provision :shell, inline: <<-SHELL
            sudo net add bgp autonomous-system 65012
            sudo net add loopback lo ip address 192.0.2.2/32
            sudo net add bgp neighbor swp1 interface remote-as external
            sudo net add bgp neighbor swp1 capability extended-nexthop
            sudo net add bgp network 192.0.2.2/32
            sudo net commit
        SHELL
    end
end
```

spine1上でコマンドを実行してみる．  

```shell
$ sudo net show route bgp # spine1で実行
RIB entry for bgp
=================
Codes: K - kernel route, C - connected, S - static, R - RIP,
       O - OSPF, I - IS-IS, B - BGP, E - EIGRP, N - NHRP,
       T - Table, v - VNC, V - VNC-Direct, A - Babel, D - SHARP,
       F - PBR, f - OpenFabric,
       > - selected route, * - FIB route, q - queued, r - rejected, b - backup
       t - trapped, o - offload failure
B>* 192.0.2.1/32 [20/0] via fe80::a00:27ff:fe0e:d39, swp1, weight 1, 00:00:49
B>* 192.0.2.2/32 [20/0] via fe80::a00:27ff:febb:4464, swp2, weight 1, 00:00:37
```

各プレフィックス( `192.0.2.1/32`や`192.0.2.2/32`)のnext hopが，`fe80` から始まるipv6 link local unicast addressになっているのがわかる．  

### 本格的にパケット解析するよ

このとき，leaf1/2で同時にtcpdumpを動かしておいた．ここではleaf1でのキャプチャを読んで，理解を深める．  

#### ICMPv6 Neighbor Discovery

まず目につくのは，ICMPv6のNSパケットが飛んでいる点だ．  

![img7](/images/gobgp/img7.png)  

- src ipv6 addr ... `fe80::a00:27ff:fe0e:d39`
  - 先程spine1のRIBを見たときにあったように，leaf1のipv6 link local address
- dst ipv6 addr ... `ff02::1:ff1d:d01d`
  - `ff02` から始まるのはIPv6 link-local multicast addressである
- dst mac addr  ... `33:33:ff:1d:d0:1d`
  - これもIPv6マルチキャストにおけるMAC addressの形式

これに対しNAパケットが返ってくる，つまり，ipv6 link local unicast addressを交換しあう．(neighbor tableをダンプするコマンドとかの実行例も載せておけばよかった)  

![img8](/images/gobgp/img8.png)  

- src ipv6 addr ... `fe80::a00:27ff:fe1d:d01d`
  - leaf2のipv6 link local addressは `fe80::a00:27ff:febb:4464` なので，spine1のものだと予想できる

#### BGP OPEN

これでPeeringの準備は整った．OPENメッセージを送り合う．  

![img9](/images/gobgp/img9.png)  

ipv6ヘッダのdstを見ると，  
icmpv6で得られたspine01のipv6 link local addressが入っているのがわかる．  
また，このときのcapabilitiesを見てみると，  

- Multiprotocol extensions
- **Extended Next Hop Encoding**
- Route refresh
  - なんかCisco印がついているものもあった，これはなんだかわかってない
- Support for 4-octet AS number
- Support for Additional Paths
- FQDN
- Graceful Restart

がついていた．重要なのは2番目．

> ご指摘があったのでちゃんと書いておく．  
> BGP OPEN時にCapability-negotiationされるけど，  
> これはあくまでBGP Speaker同士で"私はこの機能に対応していますよ"という声かけでしかない．  
> 例えば，普通にipv4 nexthop for ipv4 prefixの設定をした場合でも，  
> `net add bgp neighbor swp1 capability extended-nexthop` さえついていればcapabilitiesにENHEが入っている．  
> capがついている => 拡張機能を利用したMessage passingが行われるわけではない．という点に注意．  

#### UPDATE

leaf1には予め `net add bgp network 192.0.2.1/32` として経路を注入しておいた．spine1に対しこのUPDATEが飛んでいるはずである．  

![img10](/images/gobgp/img10.png)  

- MP_REACH_NLRI attribute
  - `Address Family Identifier/2octet`, `SAFI/1octet` ... `1`
    - [RFC8950](https://tools.ietf.org/html/rfc8950)のケース6.1と同じ
  - `next hop network address/32 octet` .. `fe80::a00:27ff:fe0e:d39`
  - `Network Layer reachability information/5octet` ... `192.0.2.1/32`
    - `length(1 octet) + ipv4 addr(4octet)`

ということで，Vagrantfileに書いてあるように，neighbor interfaceにIPv4 addressを割り当てなくても経路広報ができた．(loopback interfaceは実際にping通したりして遊ぶためのもので，別になくて良い)  

## おわりに

今回はUnnumbered BGPについて調べてまとめた．BGPがわかったって言えるのは数十年先なのではないか，という気すらしてくるけど，GoBGPのコードリーディングをしたことでUnnumbered BGPの存在を知って，新しく勉強することが増えたんだから，素直に喜びたい．やっぱりわからなくて難しいことに挑戦することは楽しい．  

## おまけ: iBGP/eBGPのNEXT_HOPについて

なんか全然関係ないからまたまとめると思うけど，NEXT_HOPについて全く知らなかったので，ここでは，iBGPとeBGPのNEXT_HOP attributeにおける挙動の違いについて振り返っておく．iBGPでは原則，"AS内のBGP Speaker同士はフルメッシュにBGP Peerが張られている"ことを前提とする[^1]．IGPやstatic routingでIP到達性があることが条件だが，iBGP Peerは間接的に接続されていてもPeerを張ることができる．このため，iBGP Peerから経路情報(BGP UPDATE)を受け取った場合，他のiBGP Peerに**再送信しない**．ここでnode1から経路を広報する場合，NEXT_HOPにはnode1のip addressが格納されているが，node3とnode1は直接接続されていないために，ルーティングテーブルに経路情報が書き込まれても，**実際には到達性がない**，という問題が起こる．  

これを回避するために，**next-hop-self** という設定をnode2に投入する場合がある．node2がnode3にUPDATEを広報する際に，NEXT_HOPを **node2のaddressに書き換える**．  これによってnode3はプレフィックスに対する送信先をnode2に設定し，node2はnode1への到達性を持つため，結果としてうまく動作する．  

> next-hop-selfは"AS内にAS外の経路情報を流したくない場合"などにも用いられる．  
> これはNATシステムにおけるpublic/private ip translationと似たような仕組みだな，と見ていて思った．  

ここまでの情報をまとめると，  

- iBGP PeerからUPDATEを受け取った場合
  - eBGP PeerにはUPDATEを再送信する
    - このときNEXT_HOPは自身のIPに書き換える
  - 別のiBGP Peerには再送信しない
    - フルメッシュでPeerが張られていることを前提とする
- eBGP PeerからUPDATEを受け取った場合
  - eBGP PeerにはUPDATEを再送信する
    - このときNEXT_HOPは自身のIPに書き換える
  - iBGP Peerにも再送信する[^2]
    - このときnext-hop-selfが有効であればNEXT_HOPを自身のIPに書き換える

という感じ．  

## 参考文献

- [IPv6 リンクローカル・ユニキャストアドレスの割り当て](https://www.itbook.info/study/ipv6-7.html)
- [BGP Unnumbered で遊んでみた](https://tekunabe.hatenablog.jp/entry/202005/16/bgp_unnumbered) ... [よこちさん](https://twitter.com/akira6592)の記事
  - スライド資料や，Cumulus Linuxを使ったデモもあり，非常にわかりやすかったです
- [Cumulus Linux の仮想アプライアンス「Cumulus VX」を Vagrant で構築する](https://tekunabe.hatenablog.jp/entry/2019/11/17/cumulus_vx_vagrant)
  - 同じくよこちさんの記事
  - Vagrantfileの設定で参考にしました．
- [BGP unnumbered overview](https://cumulusnetworks.com/blog/bgp-unnumbered-overview/)
  - Cumulus Linuxのdocumentation
- [BGP NEXT_HOP Attribute](https://www.janog.gr.jp/meeting/janog42/application/files/8715/3114/9465/janog42-bgpnethop-shtsuchi-00.pdf)
- [インターネットルーティング入門](https://www.shoeisha.co.jp/book/detail/9784798134819) ... いつもの
- [RFC4760](https://www.rfc-editor.org/rfc/rfc4760.html)
- [RFC8950](https://tools.ietf.org/html/rfc8950)

## 脚注

[^1]: 実際にはRoute reflectorといって，フルメッシュを防ぐ方法もある．  
[^2]: 厳密には，現在保有する経路とLOCAL_PREFの値を比べたりと，いろいろな条件を満たしたときのみ再送信される．  
この条件はeBGP Peerに対する再送信に対しても適用される．  
[^3]:Neighbor Discoveryの略．  