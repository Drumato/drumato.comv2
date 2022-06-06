---
title: "FRR BGPdのbestpath selectionの3番までを動かして検証する"
description: "bestpath selectionのalgorithmを一部動かして理解します."
createdAt: "2021-10-04"
tags: ["bgp", "frr"]
imageLink: "/images/frr-bestpath/archey.png"
---

- [Weight check](#weight-check)
- [Local Preference Check](#local-preference-check)
- [Local Route Check](#local-route-check)
- [おわりに](#おわりに)

BGPでは複数のneighborから同じprefixに対する経路を受け取ることがあります．  
それに対して **bestpath selection** というalgorithmを適用し，  
実際にFIBにinstallする経路を決定します．  
ここではFRRを用いてそれを検証し，  
BGPのお気持ちを頑張って理解してみます．  
[FRRのalgorithm](https://docs.frrouting.org/en/latest/bgp.html#route-selection) はこちらに記載されています．  
今回はこのうち3番，Local Route Checkまでを検証してみます．  

> 恐らくですが全部のruleを検証するように，後々書きかえると思います．  
> もっといいtopoに変更したり，ちゃんとpacapして出すと思います．  
> それまでの暫定的な記事だと思っていただければ．  

今回用いるtinet configは，  
[こちら](https://github.com/Drumato/local-network-topologies/tree/main/bgp/frr-bestpath) に置いてあります．  

実行環境も載せておきます．  

![archey](/images/frr-bestpath/archey.png)

## Weight check

まずは経路につけるweightを制御することでbestpathにどう影響が出るのか見ていきます．  
まずはequal weightで経路広報してみて，  
その後weightをつけるとどうなるか，というようにして見てみます．  

次のようなnetworkを考えてみます．  
ここで，R2, R3からは `redistribute connected` を設定しています．  
configを見るとわかりますがprefix-listでroute filteringを行っているので，  
R2, R3は `10.0.0.0/16` , `10.0.1.0/24` のみ広報します．  
upperからdefault routeを広報し `neighbor PEER default-originate` を設定するというのもやってみたかったですが．  
[対応するtinet configはこちら](https://github.com/Drumato/local-network-topologies/blob/main/bgp/frr-bestpath/equal-weight-spec.yaml)に．  

```text
           +-----------------------------------+
           |                                   |
           |                                   |
           |              R1                   |
           |           AS65001                 |
           |                                   |
           |                                   |
           |         .1                   .2   |
           +----------+-------------------+----+
                      |    10.0.0.0/16    |
                      |                   |
+---------------------+---+    +----------+---------------+
|                    .251 |    |          .252            |
|           R2            |    |           R3             |
|         AS65002         |    |         AS65003          |
|                         |    |                          |
|                         |    |                          |
|              .1         |    |          .2              |
+-------------+-----------+    +---------+----------------+
              |          10.0.1.0/24     |
           +--+--------------------------+------+
           |   .251                      .252   |
           |                                    |
           |              C1                    |
           |           AS65004                  |
           |                                    |
           |                                    |
           |                                    |
           +------------------------------------+
```

一例として，R1 configを見てみましょう．  

```shell
$ docker exec R1 vtysh -c 'sh run'
Building configuration...

Current configuration:
!
frr version 8.0
frr defaults traditional
hostname R1
log syslog informational
no ipv6 forwarding
service integrated-vtysh-config
!
interface net1
 ip address 10.0.0.1/16
!
router bgp 65001
 bgp router-id 1.1.1.1
 bgp bestpath as-path multipath-relax
 neighbor 10.0.0.251 remote-as 65002
 neighbor 10.0.0.252 remote-as 65003
 !
 address-family ipv4 unicast
  neighbor 10.0.0.251 route-map RMAP_LOWER in
  neighbor 10.0.0.252 route-map RMAP_LOWER in
 exit-address-family
!
ip prefix-list PLIST_LOWER seq 5 permit 10.0.1.0/24
!
route-map RMAP_LOWER permit 10
 match ip address prefix-list PLIST_LOWER
!
line vty
!
end
```

`RMAP_LOWER` は C1が接続するnetwork prefixだけをpermitし，  
R2, R3からはその経路しかもらわないようにfilteringします．  
R2, R3は実際には `10.0.0.0/16` にも接続していますが，  
同じくR1も接続していてその経路はいらないので弾くイメージです．  

今度はC1でrib/fibを見てみましょう．  

```shell
$ docker exec C1 vtysh -c 'sh bgp ipv4 unicast'
BGP table version is 2, local router ID is 4.4.4.4, vrf id 0
Default local pref 100, local AS 65004
Status codes:  s suppressed, d damped, h history, * valid, > best, = multipath,
               i internal, r RIB-failure, S Stale, R Removed
Nexthop codes: @NNN nexthop's vrf id, < announce-nh-self
Origin codes:  i - IGP, e - EGP, ? - incomplete
RPKI validation codes: V valid, I invalid, N Not found

   Network          Next Hop            Metric LocPrf Weight Path
*= 10.0.0.0/16      10.0.1.2                 0             0 65003 ?
*>                  10.0.1.1                 0             0 65002 ?

Displayed  1 routes and 2 total paths
```

```shell
$ docker exec C1 vtysh -c 'sh ip route'
Codes: K - kernel route, C - connected, S - static, R - RIP,
       O - OSPF, I - IS-IS, B - BGP, E - EIGRP, N - NHRP,
       T - Table, v - VNC, V - VNC-Direct, A - Babel, F - PBR,
       f - OpenFabric,
       > - selected route, * - FIB route, q - queued, r - rejected, b - backup
       t - trapped, o - offload failure

B>* 10.0.0.0/16 [20/0] via 10.0.1.1, net2, weight 1, 00:00:14
  *                    via 10.0.1.2, net2, weight 1, 00:00:14
C>* 10.0.1.0/24 is directly connected, net2, 00:00:16
```

いい感じにmultipathが広報されていますね．  
それでは本題です．  
C1のroute-mapで `set weight` をかけてみましょう．  

```shell
$ docker exec C1 vtysh -c 'sh run'
Building configuration...

Current configuration:
!
frr version 8.0
frr defaults traditional
hostname C1
log syslog informational
no ipv6 forwarding
service integrated-vtysh-config
!
interface net2
 ip address 10.0.1.254/24
!
router bgp 65004
 bgp router-id 4.4.4.4
 bgp bestpath as-path multipath-relax
 neighbor 10.0.1.1 remote-as 65002
 neighbor 10.0.1.2 remote-as 65003
 !
 address-family ipv4 unicast
  neighbor 10.0.1.1 route-map RMAP_UPPER1 in
  neighbor 10.0.1.2 route-map RMAP_UPPER2 in
 exit-address-family
!
ip prefix-list PLIST_UPPER seq 5 permit 10.0.0.0/16
!
route-map RMAP_UPPER1 permit 10
 match ip address prefix-list PLIST_UPPER
 set weight 10
!
route-map RMAP_UPPER2 permit 10
 match ip address prefix-list PLIST_UPPER
 set weight 20
!
line vty
!
end
```

この状態でC1のrib/fibを見ると変化を確認できます．  

```shell
$ docker exec C1 vtysh -c 'sh bgp ipv4 unicast'
BGP table version is 2, local router ID is 4.4.4.4, vrf id 0
Default local pref 100, local AS 65004
Status codes:  s suppressed, d damped, h history, * valid, > best, = multipath,
               i internal, r RIB-failure, S Stale, R Removed
Nexthop codes: @NNN nexthop's vrf id, < announce-nh-self
Origin codes:  i - IGP, e - EGP, ? - incomplete
RPKI validation codes: V valid, I invalid, N Not found

   Network          Next Hop            Metric LocPrf Weight Path
*> 10.0.0.0/16      10.0.1.2                 0            20 65003 ?
*                   10.0.1.1                 0            10 65002 ?

Displayed  1 routes and 2 total paths
```

```shell
$ docker exec C1 vtysh -c 'sh ip route'
Codes: K - kernel route, C - connected, S - static, R - RIP,
       O - OSPF, I - IS-IS, B - BGP, E - EIGRP, N - NHRP,
       T - Table, v - VNC, V - VNC-Direct, A - Babel, F - PBR,
       f - OpenFabric,
       > - selected route, * - FIB route, q - queued, r - rejected, b - backup
       t - trapped, o - offload failure

B>* 10.0.0.0/16 [20/0] via 10.0.1.2, net2, weight 1, 00:01:10
C>* 10.0.1.0/24 is directly connected, net2, 00:01:12
```

これが **Weight Check** の挙動です．  
同じprefixの経路が複数広報されたとき，  
weightの高い方を優先してbestpathを選定します．  
weight以外の項目に変化がないのが重要です．  
`10.0.0.0/16` の経路はこのように重み付けされるが，  
`10.0.1.0/24` は普通にmultipathである点に注意してください．  
(route-mapを適用しているのは経路を受け取っているC1本人なので)  

## Local Preference Check

つづいてlocal preferenceです．  
これはiBGP内で用いられるpath attributeの `LOCAL_PREF` に関わってきます．  

ここで対象とするものは，先程のnetworkからほとんど変わっていません．  
loでpeeringする点くらい?  
loのaddressはIGPとかを使わずにstatic routeで横着しています．  
[対応するtinet configはこちら](https://github.com/Drumato/local-network-topologies/blob/main/bgp/frr-bestpath/localprefcheck-spec.yaml)に．  

> 記事では解説しませんが，repositoryにはequal-localpref.yaml も置いてあるので参考にしてください．  
> 先ほどと同じくmultipathがselectされるだけですが．  

さて，ここではR2, R3のconfigから，C1に適用するroute-mapを見てみます．  
LOCAL_PREF path attributeはAS内のすべてのiBGP peerを流れるので，  
R2で設定するとそれがC1に届くまで維持されます．  

まず，R2では `set local-preference 200` を設定しています．  

```shell
$ docker exec R2 vtysh -c 'sh route-map RMAP_UPPER'
ZEBRA:
route-map: RMAP_UPPER Invoked: 0 Optimization: enabled Processed Change: false
 permit, sequence 10 Invoked 0
  Match clauses:
    ip address prefix-list PLIST_UPPER
  Set clauses:
  Call clause:
  Action:
    Exit routemap
BGP:
route-map: RMAP_UPPER Invoked: 12 Optimization: enabled Processed Change: false
 permit, sequence 10 Invoked 6
  Match clauses:
    ip address prefix-list PLIST_UPPER
  Set clauses:
    local-preference 200
  Call clause:
  Action:
    Exit routemap
```

次に，R3では `set local-preference 400` を設定しています．  

```shell
$ docker exec R3 vtysh -c 'sh route-map RMAP_UPPER'
ZEBRA:
route-map: RMAP_UPPER Invoked: 0 Optimization: enabled Processed Change: false
 permit, sequence 10 Invoked 0
  Match clauses:
    ip address prefix-list PLIST_UPPER
  Set clauses:
  Call clause:
  Action:
    Exit routemap
BGP:
route-map: RMAP_UPPER Invoked: 13 Optimization: enabled Processed Change: false
 permit, sequence 10 Invoked 7
  Match clauses:
    ip address prefix-list PLIST_UPPER
  Set clauses:
    local-preference 400
  Call clause:
  Action:
    Exit routemap
```

この状態で `10.0.0.0/16` の経路が広報されるとき，  
UPDATE messageのLOCAL_PREF attributeが期待する値に書き換わり，
C1でのbestpath selectionに影響を与えるはずです．  

```shell
$ docker exec C1 vtysh -c 'sh bgp ipv4 unicast'
BGP table version is 1, local router ID is 4.4.4.4, vrf id 0
Default local pref 100, local AS 65002
Status codes:  s suppressed, d damped, h history, * valid, > best, = multipath,
               i internal, r RIB-failure, S Stale, R Removed
Nexthop codes: @NNN nexthop's vrf id, < announce-nh-self
Origin codes:  i - IGP, e - EGP, ? - incomplete
RPKI validation codes: V valid, I invalid, N Not found

   Network          Next Hop            Metric LocPrf Weight Path
*>i10.0.0.0/16      10.0.255.3               0    400      0 ?
* i                 10.0.255.2               0    200      0 ?

Displayed  1 routes and 2 total paths
```

```shell
$ docker exec C1 vtysh -c 'sh ip route'
Codes: K - kernel route, C - connected, S - static, R - RIP,
       O - OSPF, I - IS-IS, B - BGP, E - EIGRP, N - NHRP,
       T - Table, v - VNC, V - VNC-Direct, A - Babel, F - PBR,
       f - OpenFabric,
       > - selected route, * - FIB route, q - queued, r - rejected, b - backup
       t - trapped, o - offload failure

B>  10.0.0.0/16 [200/0] via 10.0.255.3 (recursive), weight 1, 00:00:19
  *                       via 10.0.1.2, net2, weight 1, 00:00:19
C>* 10.0.1.0/24 is directly connected, net2, 00:00:21
S>* 10.0.255.2/32 [1/0] via 10.0.1.1, net2, weight 1, 00:00:21
S>* 10.0.255.3/32 [1/0] via 10.0.1.2, net2, weight 1, 00:00:21
C>* 10.0.255.4/32 is directly connected, lo, 00:00:21
```

想定どおりの挙動ですね．  
`LOCAL_PREF` attributeに格納された値が大きい方をbestpathとして優先します．  
ところで `NEXT_HOP` attributeのrecursive lookupに全然詳しくないことがわかったので，  
これはいずれ勉強して記事にしなければ．  

## Local Route Check

最後にLocal Route Checkですが，  
これはsimpleにstatic/aggregates/redistributed routeを優先する，というものです．  
実はこのruleはすでに確認しています．  
[Local Preference Check](#local-preference-check) のR2でribを見てみましょう．  

```shell
$ docker exec R2 vtysh -c 'sh bgp ipv4 unicast'
BGP table version is 3, local router ID is 2.2.2.2, vrf id 0
Default local pref 100, local AS 65002
Status codes:  s suppressed, d damped, h history, * valid, > best, = multipath,
               i internal, r RIB-failure, S Stale, R Removed
Nexthop codes: @NNN nexthop's vrf id, < announce-nh-self
Origin codes:  i - IGP, e - EGP, ? - incomplete
RPKI validation codes: V valid, I invalid, N Not found

   Network          Next Hop            Metric LocPrf Weight Path
* i10.0.0.0/16      10.0.255.3               0    400      0 ?
*>                  0.0.0.0                  0         32768 ?
*> 10.0.1.0/24      0.0.0.0                  0         32768 ?
*> 10.0.255.2/32    0.0.0.0                  0         32768 ?

Displayed  3 routes and 4 total paths
```

ここで，R2は `10.0.0.0/16` に関する2つの経路を持っていることがわかります．  

- R3とiBGP peerを形成して，R3からもらった経路
- そもそものconnected route

bestpathに選ばれている経路を見ると，  
上記でいう2つ目，connected routeが対応していそうですね．  
というのがLocal Route Checkの挙動です．simple.  

逆にいうと，  
**static routeよりも高いweight( FRRなら `32768` より上 )** でneighborを設定すれば，  
static routeよりもらってきた経路を優先することができるわけです．  

## おわりに

ここでは簡単にFRRでBGPd bestpath selectionを感じながら色々動かしてみました．  
他にも，

- AS_PATH Length Check
- Route Origin Check
- MED Check
- External Check
- IGP Cost Check

を含む多くの項目が存在しますが，  
multipathよりも優先される項目は全部検証しておいても良いかな?と思っています．  

というか，BGP何もわかっていない...  
