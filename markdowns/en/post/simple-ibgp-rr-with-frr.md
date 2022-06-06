---
title: "Simple iBGP Route Reflector With FRR"
description: "playing with the simplest iBGP RR"
createdAt: "2021-09-23"
tags: ["bgp", "frr"]
imageLink: "/images/ibgp-rr/rr-cluster2.png"
---

- [Recap iBGP full mesh](#recap-ibgp-full-mesh)
- [route-reflector](#route-reflector)
- [route-reflector cluster](#route-reflector-cluster)

I know one mechanism called **route-reflector** ,  
it's a way to prevent iBGP full mesh.  
I have no experience to construct any network that uses iBGP.  
So maybe this verification helps me to understand how is the difficulty of iBGP full-mesh network.  
the configurations are used in this post, are placed [in here](https://github.com/Drumato/local-network-topologies/tree/main/bgp/ibgp).

## Recap iBGP full mesh

We know iBGP messages are exchanged with TTL more than `1` .  
This indicates iBGP peers can be established via multiple intermediate nodes.  
Next, routes received from iBGP peers aren't advertised to another iBGP peers generally.
This behavior is called BGP split-horizon.  
BGP split-horizon are used for preventing the loops of route advertisements.  

From this,  
We should know the one rule, "iBGP speakers are connected by full mesh iBGP peer in general".  
If you want to understand in detailed,  
maybe [this document](https://docs.frrouting.org/en/latest/bgp.html#route-reflector) help you to make sense.  

> By the way,  
> Using split-horizon to prevent loops of route advertisements is just popular way.  
> It's not limited with BGP.  
> For example, RIP applies a similar rule to archieve the same goal.  

Let's consider if the number of iBGP speakers are increased rapidly.  
we regard the number of iBGP speakers as `S`,  
we can represents the number of iBGP sessions as `S * (S - 1) / 2`.  

the difficulty of the iBGP config management will be appeared in this situation,  
And maybe some performance issues are occured.  
For examples, the caluculation speed for each prefix of RIBs.  
So now we have a motivation to introduce the route-reflector mechanism.  

For now, we'll start from the configuration of iBGP full mesh for understanding its inconvenience.  
I prepared a tinet specification for constructing a local verification environment.  
please don't care if you don't know how to use tinet,  
I'll introduce the configurations of FRR side.  

> In general, to establish sessions among routers,  
> network engineers use loopback interfaces in the iBGP/OSPF/etc network.  
> because loopback interfaces are never down until network nodes actually down.  
> It's good characteristic for keeping iBGP sessions.  
> in FRR bgpd, we can configure it like `neighbor PEER update-source <IFNAME|ADDRESS>`.  
> this post won't discuss about loopback interfaces,  
> but I recommend you to use loopback interfaces if you play with iBGP network.  

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

![fullmesh](/images/ibgp-rr/fullmesh.png)

```shell
tinet upconf -c spec | sudo sh -x
tinet test -c spec | sudo sh -x
```

To construct the network we execute the commands such as above.  
the contents of each rib was dumped in the repository.  

```shell
$ docker exec -it R0 tcpdump -nni net0 -w /tinet/r0-net0.pcap # 別のshellで実行
$ tinet test -c spec.yaml | sudo sh -x
```

## route-reflector

Even through there are 6 iBGP speakers in our network,  
we felt the inconvenience of full mesh.  
So now we'll move the next step.  
We'll configure iBGP speakers as route-reflector-clients,  
and aggregate the neighbor configurations to a route-reflector.  

First, we'll look at the `RR0` 's configuration.  

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

It seems like a star topology.  
so the `R0` 's configurations slight be slim after previous.  

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

yay we archieved the construction of simple iBGP route-reflector!  

## route-reflector cluster

By the way,  
Do you remember the weakness of iBGP full mesh?  
Let's consider if the number of iBGP speakers are increased furthermore.  
What will be occured if the route-reflector fails?  

So we should recognize the route-reflector is the SPoF.  
Let's try to construct **route-reflector clusters** to prevent that issues!  

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

we'll check the below conditions will be satisfied.  

- failed to re-receive routes from route-reflectors when both of them are failed
- succeed to re-receive routes from the rr cluster even if one route-reflector pf them is failed

![rr-cluster1](/images/ibgp-rr/rr-cluster1.png)  
![rr-cluster2](/images/ibgp-rr/rr-cluster2.png)  

Wow it works correctly!  
We forgot the discussion of `CLUSTER_LIST` path attribute,  
but this verification has succeed for now.  
