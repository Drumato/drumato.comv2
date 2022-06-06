---
title: "Researching the Behavior of FRR BGPd Bestpath Selection Partially"
description: "studying the BGP bestpath selection with the simple test networks"
createdAt: "2021-10-04"
tags: []
imageLink: "/images/frr-bestpath/archey.png"
---

- [Weight Check](#weight-check)
- [Local Preference Check](#local-preference-check)
- [Local Route Check](#local-route-check)
- [Conclusion](#conclusion)

> If you feel hard to read the sentences as below,  
> I prefer you to translate [the corresponding article](https://drumato.com/ja/posts/frr-bgpd-bestpath-selection) to it.  

We know one mechanism called the **"bestpath selection"** in BGP, that is a decision process what the BGP implementation select a route as forwarding rule actually.  
In BGP we may encounter some cases that receives some routes for same prefix from different neighbors.  
A BGP implementation decides one route from them and select it as the only forwarding rule to the prefix.  

> Maybe you know the multipath routing, that controls multiple routes to the same prefix and uses all of them as the forwarding rules.  
> this mechanism is related with the bestpath selection quitely but this posts won't describe it in detail.  

For example, FRRouting exposes [an algorithm](https://docs.frrouting.org/en/latest/bgp.html#route-selection) called **Route Selection** .  
Today I'll try to understand the algorithm by using Linux Networking.  
The route selection algorithms consists of 13 roles but for now I'll check 1st, 2nd 3rd rule of all.

> This post will be changed for covering all rules someday.  

All tinet configurations in this post are placed in [here](https://github.com/Drumato/local-network-topologies/tree/main/bgp/frr-bestpath).  

I'll show you the runtime environment.  

![archey](/images/frr-bestpath/archey.png)

## Weight Check

The 1st rule is called **Weight Check** .  
Before describing this rule I'll check the behavior if routes for the same prefix are advertised with different weight value.  
Let's compare the difference between advertising with equal weights.  

So I'll assume there is a network such as below.  
the corresponding specification is [here](https://github.com/Drumato/local-network-topologies/blob/main/bgp/frr-bestpath/equal-weight-spec.yaml).  
I'll configure the BGPd with `redistribute connected` in R2 and R3.  
You can see the prefix-list in the specification so R2 and R3 only advertises routes for `10.0.0.0/16` and `10.0.1.0/24`.  

> Someday I'll try the advertisement of default routes with `neighbor PEER default-originate` from UPPER.  

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

Let's see the R1's configuration.  

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

You can see one route-map `RMAP_LOWER` set the limitation of network prefix `10.0.1.0/24`.  
So R1 can receive only this prefix from R2 and R3.  
this config works for reduction the entries of fib because R1 doesn't need `10.0.0.0/16` routes.  

Next I'll check the C1's rib/fib.  

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

The multipath routing seems worked correctly!  
So now we move the main subject.  
Let's set the weight value for each neighbor in C1.  

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

How it works on C1's rib/fib?  

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

Yeah we can see the behavior of the neighbor weight!  
if routes are advertised for the same prefix with different weight A BGP speaker prefer to select the route from the neighbor who has the highest weight.  
Note that no difference are found excepting weight.  

the weighting works at C1 so R1 still forwards traffics for `10.0.1.0/24` via R2 and R3.  

## Local Preference Check

Next I'll check the behavior of Local Preference Check.  
It is related with the `LOCAL_PREF` path attribute that is used in iBGP.  

I'll assume another network.  
but there is a little bit difference btw this network and previous network.  
the network uses the lo interface for peering iBGP speakers instead of veth.  
we simplify the routes for lo's address are configured statically.  
the corresponding tinet specification is [here](https://github.com/Drumato/local-network-topologies/blob/main/bgp/frr-bestpath/localprefcheck-spec.yaml).  

Let's see the route-maps of R2/R3.  
The `LOCAL_PREF` attribute is exchanged in the entire of an AS so the local-preference value flows into C1 from R2.


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

I think the `LOCAL_PREF` attribute is updated to the configured value in this contextwhen the route of `10.0.0.0/16` is advertised.  
So I think this config effects the bestpath selection in C1.  

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

It makes sense!  
I found a weakness that I don't know how the `NEXT_HOP` attribute works for recursive lookup.  

## Local Route Check

Finally I reached the rule, Local Route Check.  
This rule prioritize static/aggregates/redistbuted routes.  
It's so simple!  
And I confirmed the rule already.  
Let's check the rib of R2 with [Local Preference Check](#local-preference-check) specification.  

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

here R2 has two routes.  

- received routes from R3 with iBGP peering
- connected route

And the selected route as bestpath is the letter.  

If you want to use the received route as bestpath,  
you should weight the route higher than `32768`.  

## Conclusion

Today I briefly recapped the precedence of BGP bestpath selection.  
But BGP bestpath selection uses more rules like below.  

- `AS_PATH` Length
- Route Origin
- MED
- External
- IGP Cost
- etc

Someday I may research these rules for upderstanding more complicated routes.  
I don't know all of BGP actually.  
