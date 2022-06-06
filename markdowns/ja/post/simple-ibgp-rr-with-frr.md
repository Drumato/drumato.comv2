---
title: "simpleなiBGP route-reflectorをFRRでやってみる"
description: "iBGP RR構成をFRRで検証しながら入門します."
createdAt: "2021-09-23"
tags: ["bgp", "frr"]
imageLink: "/images/ibgp-rr/rr-cluster2.png"
---

- [iBGP full meshについておさらい](#ibgp-full-meshについておさらい)
- [route-reflector](#route-reflector)
- [route-reflector cluster](#route-reflector-cluster)
- [おわりに](#おわりに)

こんにちは．  
せっかく [こんな記事](https://www.drumato.com/ja/posts/figure-out-my-technical-inabilities/) を書いたのだから，  
ここに書いてあることを一つずつ消化しようかなー，と思ったり．  

ということで，iBGP route-reflectorを触ってみます．  
まずはfullmeshをやってconfig mgmtの大変さを経験したあと，  
route-reflector導入 -> RR clusterに拡張，の流れです．  
今回使用するconfigは [こちら](https://github.com/Drumato/local-network-topologies/tree/main/bgp/ibgp) に置いてあります．  

## iBGP full meshについておさらい

まず前提として，iBGP messageはeBGPと異なり1より大きいTTL(64とか255)でやり取りされます．  
つまり，いくつかのnodeを経由するようなpeer establishmentが可能です．  
そして，BGP split horizonにより，iBGP peerから受け取った経路は他のiBGP peerに広報しません．  
以上のことから，  
一般的にiBGP speakerはfull meshにpeerを貼ることが想定されています．  
ここらへんの話のconceptは [こちら](https://docs.frrouting.org/en/latest/bgp.html#route-reflector) を読むと理解できます．  

> 余談ですが，split horizonでloopを回避する，という概念はRIPとかにもあるものだと思います．  
> そこらへんの話は [3分間ルーティング 基礎講座](https://gihyo.jp/book/2013/978-4-7741-5737-5) がとても参考になりましたので紹介します．  

このとき，iBGP speakerの数が増えるにつれてpeerの組み合わせが膨大になります．  
具体的には，iBGP speakerの数を `S` としたとき，  
peerの数は `S * (S - 1) / 2`  となります．  

これは管理が大変になりますし，performance上の問題も出てくるかもしれません．  
ということで，いくつかの手法のうちどれかを適用してこれを回避します．  
そのうち最も一般的(だと思われる)手法がroute-reflectorです．  

とはいえ本当に大変なのかよくわからないと思うので，  
まずはfull meshから試してみましょう．  
適当にtinet specを用意します．  
tinetについての紹介はここでは省略します．  
ちゃんと使い方を解説する記事を上げると思います．  
tinet specについてはrepoを御覧ください．  
ここでは `write mem` の内容のうち，  
R0のものを取り上げます．  
広報するnetworkは適当にしておきます．  

> 通常，iBGPやOSPFで扱うinterfaceはloopback interfaceです．  
> これはloopback interfaceにdownしないという特徴があり，  
> iBGP sessionを落とさずに運用できるという利点があります．  
> FRRでは `neighbor PEER update-source <IFNAME|ADDRESS>` のようにして使えます．  
> 本記事ではこの設定は使わないですが，  
> 実際にiBGPで遊ぶときはこれを設定すると良いでしょう．  

```text
frr version 8.0
frr defaults traditional
hostname R0
log syslog informational
no ipv6 forwarding
service integrated-vtysh-config
!
interface net0
 ip address 10.0.1.100/24
!
interface net1
 ip address 10.0.2.1/24
!
router bgp 100
 bgp router-id 10.0.1.100
 neighbor 10.0.1.101 remote-as 100
 neighbor 10.0.1.102 remote-as 100
 neighbor 10.0.1.103 remote-as 100
 neighbor 10.0.1.104 remote-as 100
 neighbor 10.0.1.105 remote-as 100
 !
 address-family ipv4 unicast
  network 10.0.2.0/24
 exit-address-family
!
line vty
!
```

configだけ見てもよくわからないかもしれないので，  
network topologyの図を用意しました．  

![fullmesh](/images/ibgp-rr/fullmesh.png)

```shell
tinet upconf -c spec | sudo sh -x
tinet test -c spec | sudo sh -x
```

のようにしてcontainerを起動，test commandを実行できます．  
repositoryにはribの内容とかをdumpしておいたので，よかったら御覧ください．  
実際にinterfaceにpacketが着弾しているのを確認しましょう．  

```shell
$ docker exec -it R0 tcpdump -nni net0 -w /tinet/r0-net0.pcap # 別のshellで実行
$ tinet test -c spec.yaml | sudo sh -x
```

tinetではcontainerの `/tinet` にhostの `/tmp/tinet` をmountしているので，  
かんたんにpcap fileを共有したりできます． 便利．  

![r0-net0](/images/ibgp-rr/r0-net0pcap.png)  

良さそうですね．  

## route-reflector

6台構成でも実感できるぐらい管理が大変なので，  
route-reflectorを使ってかんたんにしたいと思います．  
ospfとか使ってもうちょっと実践的なnetworkにしても良かったんですが，とりあえず．  
[こちら](https://github.com/Drumato/local-network-topologies/tree/main/ibgp/route-reflector) にすべてのconfigとかがおいてあります．  

まずはrouter-reflectorとして動作する `RR0` のconfigを見てみましょう．  

```text
interface net0
 ip address 10.0.1.99/24
!
router bgp 100
 bgp router-id 10.0.1.99
 neighbor 10.0.1.100 remote-as 100
 neighbor 10.0.1.101 remote-as 100
 neighbor 10.0.1.102 remote-as 100
 neighbor 10.0.1.103 remote-as 100
 neighbor 10.0.1.104 remote-as 100
 neighbor 10.0.1.105 remote-as 100
 !
 address-family ipv4 unicast
  neighbor 10.0.1.100 route-reflector-client
  neighbor 10.0.1.101 route-reflector-client
  neighbor 10.0.1.102 route-reflector-client
  neighbor 10.0.1.103 route-reflector-client
  neighbor 10.0.1.104 route-reflector-client
  neighbor 10.0.1.105 route-reflector-client
 exit-address-family
!
```

route-reflectorはすべてのpeerを礼儀正しく作って，  
誰に対しても経路を届けられるようにします．  
star topologyを組む感覚ですね．  

すると， `R0` のconfigは以下のようにスッキリします．  

```text
interface net0
 ip address 10.0.1.100/24
!
interface net1
 ip address 10.0.2.1/24
!
router bgp 100
 bgp router-id 10.0.1.100
 neighbor 10.0.1.99 remote-as 100
 !
 address-family ipv4 unicast
  network 10.0.2.0/24
 exit-address-family
!
```

## route-reflector cluster

ところで，このroute-reflector1台に対してどんどんspeakerを接続していくのは得策ではありません．  
このroute-reflectorの障害によって全体に影響が及んでしまいますし，  
結局route-reflectorが持つconfigが肥大化してしまいます．  

ということで，これを回避する方法として，route-reflectorのclusterを組む，というものがあります．  
大まかには，次のような感覚です．

- route-reflectorが管理するiBGP speakerの集合をclusterとします
- clusterに責任を持つroute-reflectorをn台構成で管理します
  - rr同士はcluster-idで相互に識別しpeerを組み，loopは防がれます

ということで，最後にclusterを作ってみます．  
今回はsubnetを分けたりせず単純に2冗長の構成とするだけですが，  
subnetを分けて，管理する経路やpeerをそれぞれ分けて，という感じに構成することも可能です．  
具体的には，  
clusterごとにn台のrrを運用して，  
clusterのrrごとにpeerを組めば良いと思います．  
~~今回はそこまでの体力がなかった...~~  

ここでは `RR0` のconfigを紹介します．  
`RR1` でも同じcluster-idを指定するのがpointです．  
[すべてのconfigはこちら](https://github.com/Drumato/local-network-topologies/tree/main/ibgp/rr-cluster) に．  

```text
interface net0
 ip address 10.0.1.91/24
!
router bgp 100
 bgp router-id 10.0.1.91
 bgp cluster-id 10.0.1.90
 neighbor 10.0.1.92 remote-as 100
 neighbor 10.0.1.100 remote-as 100
 neighbor 10.0.1.101 remote-as 100
 neighbor 10.0.1.102 remote-as 100
 neighbor 10.0.1.103 remote-as 100
 neighbor 10.0.1.104 remote-as 100
 neighbor 10.0.1.105 remote-as 100
 !
 address-family ipv4 unicast
  neighbor 10.0.1.92 route-reflector-client
  neighbor 10.0.1.100 route-reflector-client
  neighbor 10.0.1.101 route-reflector-client
  neighbor 10.0.1.102 route-reflector-client
  neighbor 10.0.1.103 route-reflector-client
  neighbor 10.0.1.104 route-reflector-client
  neighbor 10.0.1.105 route-reflector-client
 exit-address-family
!
line vty
!
```

- rrを2台ともstopして, `R5` で `clear bgp ipv4 unicast *` すると `C0` へのreachabilityが失われる
- どちらか1台stopして `clear bgp ipv4 unicast *` しても経路をもらえる

というのを確認してみましょう．  

![rr-cluster1](/images/ibgp-rr/rr-cluster1.png)  
![rr-cluster2](/images/ibgp-rr/rr-cluster2.png)  

おぉー，うまくできていますね．  
`CLUSTER_LIST` path attributeについてはまた別途記事を上げるかもしれません．  
上げないかもしれません．  

## おわりに

今回はiBGP full meshからやり始めて，  
simple route-reflectorと，これまたsimpleなrr clusterを組んでみました．  
個人的に一番勉強になったのはroute-reflectorではなく，  
loopback interfaceの使われ方でした．  
