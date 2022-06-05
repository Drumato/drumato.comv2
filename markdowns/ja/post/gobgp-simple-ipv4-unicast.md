---
title: "GoBGPでipv4 unicast addressを広報してみる"
description: ""
createdAt: "2021-03-27"
tags: ["bgp", "gobgp"]
imageLink: "/images/gobgp/img3.png"
---

- [本記事の目標](#本記事の目標)
- [環境構築と仮説](#環境構築と仮説)
  - [Vagrantfileの用意](#vagrantfileの用意)
  - [Ansible playbookの用意](#ansible-playbookの用意)
- [経路広報してみる](#経路広報してみる)
- [Updateメッセージを覗いてみる](#updateメッセージを覗いてみる)
- [まとめ](#まとめ)
- [参考資料](#参考資料)

> この記事はBGPに入門したての時期に試行錯誤しながら書いたものであり，
> 情報の正確性については保証しかねますので，ご了承ください．

前回の続き．  
[まだ読んでない方はそちら](http://drumato.com/ja/posts/gobgp-simple-peer-establishment/)を．  

リーディング対象は，[2021/3/25現在のmasterのHEAD](https://github.com/osrg/gobgp/tree/7ff15bfa54ac1b0ff7b03ee73e2bee4e7a3d3d73)．  
GoBGPのライセンスはApache License 2.0．  
ライセンス表記をしておく．  

```text
Copyright (C) 2014-2017 Nippon Telegraph and Telephone Corporation.
```

今回は実際にPeerに対して経路広報を行う．  
BGP UPDATE Messageをキャプチャして，  
各フィールドにどんな値が入っているのかを確認する．  

## 本記事の目標

- コードリーディングの前段階として，CLIアプリを使いつつコマンド体系を把握する
- 最もシンプルなBGP UpdateメッセージをWiresharkでキャプチャして中身を見る

## 環境構築と仮説

前回はVMを2つ立ち上げてPeer Establishmentをやってみたが，  
経路広報の検証となると，もうちょい大きいネットワークが欲しくなる．  
本記事では，以下のようなVMネットワークを作ってみた．  

![img2](/images/gobgp/img2.png)  

このネットワークで，  
ASN001(実際には65001を割り当てている)から `192.168.33.11/32` を広報してみる．  

私のBGP前知識が正しければ，  
以下のようにAS_PATH attributeを含むUPDATEメッセージが流れるはずである．  

![img3](/images/gobgp/img3.png)  

node5上でtcpdumpを実行しておき，  
UPDATEメッセージの中身を実際に読んでみる．  

GoBGPはSDNにおけるControl-Planeの機能のみを提供している．  
各BGP Speakerが経路を覚える(=OSのFIBに経路を書き込む)ような機能は存在しない．  
それを実現するには，GNU Zebra integration等の機能を利用する必要がある．  
本記事はあくまでもBGP Updateの中身を理解するに留めるため，  
FIBへの書き込みは行わない．

### Vagrantfileの用意

ここでは，次のようなVagrantfileを用意した．  

```ruby
# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "bento/ubuntu-18.04"

  config.vm.provider :virtualbox do |vb|
    vb.customize ["setextradata", :id, "VBoxInternal2/SharedFoldersEnableSymlinksCreate/.","1"]
  end

  config.vm.define "node1" do |node|
    node.vm.network "private_network", ip: "192.168.33.11"
  end

  config.vm.define "node2" do |node|
    node.vm.network "private_network", ip: "192.168.33.12"
  end

  config.vm.define "node3" do |node|
    node.vm.network "private_network", ip: "192.168.33.13"
  end

  config.vm.define "node4" do |node|
    node.vm.network "private_network", ip: "192.168.33.14"
  end

  config.vm.define "node5" do |node|
    node.vm.network "private_network", ip: "192.168.33.15"
  end
end
```

適当に`vagrant up`しておく．  

### Ansible playbookの用意

GoBGPはGitHub Releasesにバイナリが落ちていて，  
それを拾ってくるだけで使える．便利．  
ということで，それを5台に適用するplaybookを作る．  
まずはinventory.  
本当はAnsible resources内でパスワードを扱う際は，  
適宜`ansible-vault create`等の機能を使う必要がある．  
とはいえ，今回は検証後すぐに破壊するVMなので，特に気にしない．  

```text
[ubuntu]
192.168.33.11
192.168.33.12
192.168.33.13
192.168.33.14
192.168.33.15

[all:vars]
ansible_ssh_user=vagrant
ansible_ssh_pass=<vm's password>
```

次にplaybook.  

```yaml
---
- hosts: ubuntu
  user: vagrant
  vars:
    gobgp_version: 2.25.0
  tasks:
  - name: download gobgp
    get_url:
      url: https://github.com/osrg/gobgp/releases/download/v{{ gobgp_version }}/gobgp_{{ gobgp_version }}_linux_amd64.tar.gz
      dest: /home/vagrant/
  - name: extract gobgp from gz
    unarchive:
      src: /home/vagrant/gobgp_{{ gobgp_version }}_linux_amd64.tar.gz
      dest: /home/vagrant
      remote_src: yes
```

```shell
ansible-playbook -i inventory gobgp.yaml
```

とかして，全VMにgobgpバイナリを落とす．  
関係ないけど，私は `bgp-testing-environment`なるprivate repositoryを作って，  
そこにこのplaybookを置いておいた．  
これで検証環境を建てるのは多少楽になったと思う．  

## 経路広報してみる

Peer張る為に必要な設定は省略．  
前記事を見てほしい．  

それではnode1から経路を流す．  

```shell
./gobgp global rib add -a ipv4 192.168.33.11/32 # node1で実行
```

node1のRIBに経路を追加する，というコマンドそのままの意味．  
GoBGPでは経路追加された時点でPeerを張っている他BGP Speakerに経路を流してくれるっぽい．  

実際に流れているか確認してみよう．  
node2で以下のコマンドを実行してみる．  

```shell
$ ./gobgp neighbor # node2で実行
Peer             AS  Up/Down State       |#Received  Accepted
192.168.33.11 65001 00:32:15 Establ      |        1         1
192.168.33.13 65003 00:32:12 Establ      |        0         0
$ ./gobgp neighbor 192.168.33.11 adj-in
   ID  Network              Next Hop             AS_PATH              Age        Attrs
   0   192.168.33.11/32     192.168.33.11        65001                00:30:04   [{Origin: ?}]
```

node1から受け取った経路をAdj-RIB-inに格納している．  
node3でも同様に確認．  

```shell
$ ./gobgp neighbor # node3で実行
Peer             AS  Up/Down State       |#Received  Accepted
192.168.33.12 65002 00:02:28 Establ      |        1         1
192.168.33.15 65005 00:01:47 Establ      |        1         1
$ ./gobgp neighbor 192.168.33.12 adj-in
   ID  Network              Next Hop             AS_PATH              Age        Attrs
   0   192.168.33.11/32     192.168.33.12        65002 65001          00:00:28   [{Origin: ?}]
```

node2はAS_PATH属性に自身のASNを書き込んで，node3にadvertiseしてきたっぽい．  
出力を見るとわかるけど，node5からもadvertisementが飛んできている．  
最後に，node5でも確認してみる．  

```shell
$ ./gobgp neighbor
Peer             AS  Up/Down State       |#Received  Accepted
192.168.33.13 65003 00:34:31 Establ      |        1         1
192.168.33.14 65004 00:34:33 Establ      |        1         1
$ ./gobgp neighbor 192.168.33.13 adj-in
   ID  Network              Next Hop             AS_PATH              Age        Attrs
   0   192.168.33.11/32     192.168.33.13        65003 65002 65001    00:32:51   [{Origin: ?}]
$ ./gobgp neighbor 192.168.33.14 adj-in
   ID  Network              Next Hop             AS_PATH              Age        Attrs
   0   192.168.33.11/32     192.168.33.14        65004 65001          00:32:53   [{Origin: ?}]
```

PeerごとのAdj-RIB-inを確認すると，  
仮説通りにAS_PATH属性にASNが書き込まれているのが確認できた．  
とりあえず，最低限やりたかったことは達成．  

おそらくだけど，  
同じ `192.168.33.11/32` というIPに対して得られた2つの経路をベストパス選択アルゴリズムに入力し，  
最終的にAS_PATHが短い( `192.168.33.14` にホップさせる)経路を学習すると思う．  

そして，もしnode5が新たに別のBGP SpeakerとPeerを張ったとき，  
Adj-RIB-outにはベストパス選択アルゴリズムを"生き残った"最適経路が書き込まれ，  
`AS_PATH: [65005, 65004, 65001]` の経路を送信すると思う．  

## Updateメッセージを覗いてみる

最後に，  
node5でキャプチャしていたBGP Messageの中身を見てみる．  
具体的には，node4から届いたUpdate．  

- BGP Message Header
  - 前回紹介したので省略
- UPDATE Message
  - `Unfeasible Routes Length/2octet` ... `Withdrawn Routes`フィールドの長さ
    - `0`なら`Withdrawn Routes`は未使用
  - `Withdrawn Routes/variable` ... 到達できなくなりネットワークから削除される経路のリスト
  - `Total Path Attributes Length/2` ... `Path Attributes`フィールドの長さ
    - この値からNLRIの長さを計算することもできる
      - このフィールドが`0`ならNLRIは存在しない
  - `Path Attributes/variable` ... パス属性のリスト
    - `<attribute type, attribute length, attribute value>`という構成
    - `ORIGIN` ... 経路情報がどのようなプロトコルで生成されたものかを表す
    - `AS_PATH` ... UPDATEメッセージが経由したASのリスト
    - `NEXT_HOP` ... 経路情報の出口となる **Border Router** のアドレス
      - NLRIに到達するためにルーティングするルータアドレス
      - 前記事で省略した `extended-nexthop` はこのフィールドサイズを拡張するもの
        - おそらくipv6ネットワークの経路広報ではパス属性の `extended-length`ビットが立つ?
  - `Network Layer Reachability Information/variable` ... ip-prefixで示される宛先

あくまで簡単にだけど，まとめるとこんな感じ．  
各フィールド/パス属性について，まだまだ考えなきゃいけないことはたくさんあるけど，  
まずはシンプルなケースを理解できた．  

## まとめ

今回はシンプルなケースでの経路広報を動かしてみて，  
UPDATEメッセージの中身を覗いてみた．  

次からはいよいよGoBGPの実装を読んでいく．  
とても楽しみ．

## 参考資料

- [石田渉さんのRIPE71の発表資料](https://ripe71.ripe.net/presentations/135-RIPE71_GoBGP.pdf)
  - RIPE Meeting ... RIPE NCCというRIRが定期開催するミーティング
- [Capability Codes](https://www.iana.org/assignments/capability-codes/capability-codes.xhtml) ... BGP Capabilitiesの識別コードを定義
- [インターネットルーティング入門](https://www.shoeisha.co.jp/book/detail/9784798134819)
  - 正直この本の内容を知っている人にとって，この記事は何も新しくない(あくまで"動かした"というところを残しておきたかった)
- [BGPチュートリアル](https://www.janog.gr.jp/meeting/janog40/application/files/7915/0097/6730/janog40-bgp-tutorial.pdf)
  - めちゃくちゃ詳しいスライド資料
