---
title: "Replace FRR Zebra SRv6 Manager with YANG Backend"
description: "FRR ZebraのSRv6基盤をYANG Backendで置き換えるPoCを解説します."
createdAt: "2022-01-04"
tags: ["frr", "srv6"]
imageLink: "/Drumato.png"
---

- [前提知識](#前提知識)
  - [FRR Zebra SRv6 Manager](#frr-zebra-srv6-manager)
  - [Northbound gRPC](#northbound-grpc)
  - [FRR YANG backend](#frr-yang-backend)
- [本題](#本題)
  - [現状](#現状)
  - [目標](#目標)
- [現段階での実装](#現段階での実装)
  - [YANG fileの定義](#yang-fileの定義)
  - [Northbound API Callbacks](#northbound-api-callbacks)
  - [SRv6 Manager CLI](#srv6-manager-cli)
- [今後取り組むべきこと](#今後取り組むべきこと)
  - [`segment-routing` blockの扱い](#segment-routing-blockの扱い)
  - [`show yang operational-data`](#show-yang-operational-data)
  - [mgmtdについての調査と検証](#mgmtdについての調査と検証)
- [まとめ](#まとめ)
- [参考資料](#参考資料)

私は現在趣味で [FRRouting](https://frrouting.org/) の開発に手を出しており，
ちょこちょこ遊んだり，contribution chanceを狙っているのですが(mainstream mergeは2回のみ経験)，
その中でも現在取り組んでいるSRv6 ManagerのYANG backend対応です．
これはNorthbound APIという興味深い仕組みに関わるものであり，とてもやりごたえがあるtaskです．
日々ウンウン唸りながら頑張ってcodingしているので，その内容をまとめておこうと思います．
本実装の内容はまだ不完全であり，実装方針のmemoみたいな側面が大きいですが，
ともかく何かしら知見になるかもしれないので．
本記事が対象とするPoCは [こちら](https://github.com/Drumato/frr/pull/4) に．

---

## 前提知識

ここではごく簡単に事前知識を共有します．

### FRR Zebra SRv6 Manager

まず，FRRではZebra daemonがSRv6 locator等の資源を管理しており，
bgpdやisisdなどのrouting daemonはzebraに問い合わせることでそれら資源の使用権を受け取り，
それらを広報などに使用する，というような **"server - client" model** を採用しています．
このうち前者，Zebraに存在するSRv6資源の管理者を **SRv6 Manager** と呼びます．
FRR repoには [BGP SRv6でVPNv6を構築するtopotest](https://github.com/FRRouting/frr/tree/frr-8.1/tests/topotests/bgp_srv6l3vpn_to_bgp_vrf) が置いてあるので，
その内容を読んでみると仕組みがわかりやすいかなと思います．  

### Northbound gRPC

FRRoutingで最もpopularかつ手軽に扱えるdynamic configuration interfaceにvtyshがあります．
これはCisco routerなどで使用できるInteractive CLIとほぼ同等の機能を提供するものです．  

一方，FRRは **Northbound gRPC** と呼ばれる，
gRPC communicationによるNorthbound APIの提供を実装しています．
userはgRPC clientを実装して使用することで，それぞれのrouting daemonに対するRPCを発行でき，
programmableにnetwork configurationを行える，というものです．
詳細は [こちらのdocument](http://docs.frrouting.org/en/latest/grpc.html) や [こちら](http://docs.frrouting.org/projects/dev-guide/en/latest/grpc.html) を御覧ください．  

### FRR YANG backend

先述したNorthbound gRPCですが，FRRではこれを以下のようにして実現しています．

- **[YANG](https://datatracker.ietf.org/doc/html/rfc7950)** でFRRが扱う資源をmodeling
- 上記Data Modelに **Northbound API Callbacks** を紐付ける

このように，YANG data storeを中心とした実装にする利点はいくつか存在します．
まず1つ目に，operatorはYANG fileを参照するだけで **"何がreadonlyで，何がoperationalで"** というのを確認できます．
YANGは特定のprogramming language, 及び実装に依存しないので，network engineerなら誰でも理解することができます．
2つ目に，Ciscoなどのnetwork vendorはそれぞれの製品が使用する [YANG modelを公開](https://github.com/YangModels/yang) しています．
実装の中心にYANGを置き，それをnetwork vendorとcompatibilityがあるように整備すれば，
できるだけcisco routerなどと同じように扱うことができます．

---

## 本題

### 現状

先述したようにFRRのdaemonをYANG backendに置き換えることには大きなmotivationがあり，
**[FRR communityでも2019年頃から率先して置き換えよう](https://github.com/FRRouting/frr/issues/5428)** という動きがありました．
本記事の内容からは離れますが， **[mgmtdという新たなplatformを導入しようという動き](https://github.com/FRRouting/frr/pull/10000)** もあります．
そこで私は，このYANG backendの実装を通じてFRRについて詳しくなろうと思いました．  

先述したZebra SRv6 Managerは現在YANG backendに非対応であり，従来のprimitiveな方法で実装されていますが，
SRv6 Managerはその責任と仕事に反して小さな規模で実装されており，また読みやすく注意されています．
私はSRv6 Manager全体を大まかに読んだ経験もあるため，"土地勘"もあるし，書き換えるイメージもなんとなくできていました．
ということで，現在私はSRv6 ManagerをYANG backendに置き換えようと取り組んでいます．
最終的に，mainstreamへのmergeを行うかはとりあえずおいておいて，
私がFRRを勉強したり，それについての知見を共有できるところを目指します．  

### 目標

ここまでの状況をもとに，本taskの目標を整理してみます．

- それぞれのcomponentをpracticalに置き換えること
  - daemon side
  - SRv6 Manager vtysh command
  - config management
- もちろんSRv6 Managerとしての機能は損なわないこと
  - topotestsで使われているSRv6 Managerの機能は動作すること

---

## 現段階での実装

ここからは実際に，どのようにしてこれを実現しているかを解説していきます．
本taskのPoCは，以下3つのsub-taskに分けて考える事ができます．

- YANG fileの定義
- YANG data nodeに対応するcallbackの定義，実装
- vtyshの実装変更

現在は，srv6_locatorというSRv6 Managerの機能に関するtopotestが存在し，
それがうまく動くまで実装できています．  

### YANG fileの定義

まずはじめに，data modelとなるYANG fileの定義を行います．
このfileはdaemon/vtyshの実装の基点となるため，慎重に設計する必要があり，これは簡単ではありません．
そこで現在は，IOS-XR 7.5.1のYANGを参照して設計しています．
CiscoやJuniperなどのnetwork vendorは使用しているyangを公開しており，
それを参考にすることでwell-definedなYANGを設計することができます．
例えば，CiscoのYANGは [こちら](https://github.com/YangModels/yang/tree/master/vendor/cisco) にあります．  

SRv6に関するyangを探してみると，大別して以下の種類が存在することがわかります．
このうち，まずは `cfg` と `datatypes` に絞って考えることにします．

- [Cisco-IOS-XR-segment-routing-srv6-oper.yang](https://github.com/YangModels/yang/blob/master/vendor/cisco/xr/751/Cisco-IOS-XR-segment-routing-srv6-oper.yang)
- [Cisco-IOS-XR-segment-routing-srv6-datatypes.yang](https://github.com/YangModels/yang/blob/master/vendor/cisco/xr/751/Cisco-IOS-XR-segment-routing-srv6-datatypes.yang)
- [Cisco-IOS-XR-segment-routing-srv6-cfg.yang](https://github.com/YangModels/yang/blob/master/vendor/cisco/xr/751/Cisco-IOS-XR-segment-routing-srv6-cfg.yang)

さて，このyangを読んでみると， `segment-routing-srv6-cfg:srv6` というcontainer blockは `segment-routing-ms-cfg:sr` をaugmentする形で作られています．
これはSegment Routing自体のdata modelであり，そのsub treeとしてsrv6 blockが付属するようになっているのです．
これを踏襲して，本PoCでは以下のようなyangを用意します．
現状，FRRのZebraにSegment Routing自体の統一的な基盤はありませんが(後述)，それはひとまず考えないことにします．

- `frr-srv6.yang` ... `segment-routing-srv6-datatypes` 相当のyang
- `frr-zebra-sr.yang` ... `segment-routing-ms-cfg` 相当のyang
  - SRv6 Managerとはあまり関係ないが，今後必要になるかもしれない
- `frr-zebra-srv6.yang` ... `segment-routing-srv6-cfg` 相当のyang
  - `frr-zebra-sr` をaugmentする

yangの内容をすべて取り上げるのは大変なので，PoCをご覧いただければと思います．
後々，vtyshの実装を紹介する際にxpathの内容を見るので，そこでなんとなく感覚がつかめると思います．  

### Northbound API Callbacks

YANGでSRv6に関するdata modelを記述したあとは，それぞれのdata nodeに対してNorthbound API callbacksを実装する必要があります．
例えばisisdでは， `router isis AREA_TAG` として新しいisis instanceを作成しますが，
これに対応してYANG list-nodeのentryが新しく作成され，data storeに保存されるようになっています．
これはFRR内で `NB_OP_CREATE` と呼ばれるAPI callによって行われ，
また， `create` と呼ばれるcallbackが紐付いて呼ばれるようになっています．
ここでは簡単にNorthbound APIで使用されるCallback(の一部)について解説しておきます．

|    Callback    |     Type      |                                       Description                                        |
| :------------: | :-----------: | :--------------------------------------------------------------------------------------: |
|    `create`    | Configuration |               list-node entry/type empty/leaf-list entryの作成時に呼ばれる               |
|    `modify`    | Configuration |                         leaf-node valueが変更される際に呼ばれる                          |
|   `destroy`    | Configuration |             あるlist-node entry/leaf-list entry/etcが削除される際に呼ばれる              |
|   `get_elem`   |   Operation   | あるleaf/leaf-list entry/etcを取得するcallbackで，operational-dataを取得する際に呼ばれる |
| `lookup_entry` |   Operation   |                   あるlist-nodeについて，あるkeyを持つentryを探索する                    |
|   `cli_show`   |   Operation   |                         あるnodeに対応するCLI commandを出力する                          |
| `cli_show_end` |   Operation   |    container/listnodeなどはCLI command blockを生成するため，そのterminationを出力する    |

これらcallbackを，先述したYANGに対して定義する，というのが次のtaskです．
まずは `struct frr_yang_module_info` という構造体を定義して，
daemonのinstantiation( `FRR_DAEMON_INFO` というmacroで行われます )時に引き渡すという実装を行います．  

<https://github.com/Drumato/frr/blob/a41251800b09b9b93726a18fb891127a3e10340b/zebra/zebra_srv6_nb.c#L31>  

```c
/* stripped */
const struct frr_yang_module_info frr_zebra_srv6_info = {
  .name = "frr-zebra-srv6",
  .nodes = {
    {
      .xpath = "/frr-zebra-sr:sr/frr-zebra-srv6:srv6",
      .cbs = {
        .cli_show = cli_show_segment_routing_srv6,
        .cli_show_end = cli_show_segment_routing_srv6_end,
      },
      .priority = NB_DFLT_PRIORITY - 1,
    },
    {
      .xpath = "/frr-zebra-sr:sr/frr-zebra-srv6:srv6/locators",
      .cbs = {
        .cli_show = cli_show_srv6_locators,
        .cli_show_end = cli_show_srv6_locators_end,
      },
    },
    {
      .xpath = "/frr-zebra-sr:sr/frr-zebra-srv6:srv6/locators/locators",
      .cbs = {
        .cli_show = cli_show_srv6_locators_locators,
        .cli_show_end = cli_show_srv6_locators_locators_end,
      },
    },
    {
      .xpath = "/frr-zebra-sr:sr/frr-zebra-srv6:srv6/locators/locators/locator",
      .cbs = {
        .cli_show = cli_show_srv6_locator,
        .cli_show_end = cli_show_srv6_locator_end,
        .create = nb_lib_srv6_locator_create,
        .destroy = nb_lib_srv6_locator_destroy,
      },
    },
    /* stripped */
  }
};
```

同じようにして `struct frr_yang_module_info frr_zebra_sr_info` も定義します．
あとは，ここで指定したcallbacksを地道に頑張って実装していくだけです．
まずは， `nb_lib_srv6_locator_create` をご紹介します．
これは先述した `create` callbackであり，
新しいSRv6 locatorが作成された際に呼び出されます．
以下に示す，callbackの中身について解説します．  

まず，FRRではいくつかの理由から， **YANG data treeとそれに対応する状態を管理するC data** の2つを管理しています．
YANGに対するlist-node appendは自動的に行われますが，
ここでは `zebra_srv6_locator_add()` を呼ぶことで，SRv6 Managerが管理するmaster変数を更新しています．  

次に，このcallbackが呼び出された時点で `args` には対応するdnodeが格納されています．
また，API clientからnameが渡されているので(後述)，
それをもとにSRv6 Manager側の関数を呼び出してあげて初期化します．
また， `nb_running_set_entry()` という関数を呼び出します．
これによって，以後 `list locator` のchild nodeに対する `modify` callback等では，
lookup等を呼び出さずに 親nodeに対応する `struct srv6_locator` を引っ張ってこれます．  

<https://github.com/Drumato/frr/blob/a41251800b09b9b93726a18fb891127a3e10340b/zebra/zebra_srv6_nb_config.c#L29>  

```c
// stripped

/*
 * XPath: /frr-zebra-sr:sr/frr-zebra-srv6:srv6/locators/locators/locator
 */
int nb_lib_srv6_locator_create(struct nb_cb_create_args *args)
{
  struct srv6_locator *loc;
  struct srv6_locator_chunk *chunk;
  const char *loc_name;

  if (args->event != NB_EV_APPLY) return NB_OK;

  loc_name = yang_dnode_get_string(args->dnode, "./name");
  loc = zebra_srv6_locator_lookup(loc_name);
  if (!loc) {
    /* SRv6 manager pre-allocates one chunk for zclients */
    loc = srv6_locator_alloc(loc_name);
    chunk = srv6_locator_chunk_alloc();
    chunk->proto = NO_PROTO;
    listnode_add(loc->chunks, chunk);
  }

  zebra_srv6_locator_add(loc);
  nb_running_set_entry(args->dnode, loc);

  return NB_OK;
}

// stripped
```

続いてlocator prefixを変更する `nb_lib_srv6_locator_prefix_modify` をご紹介します．
これは `list locator` が管理する `leaf prefix` (厳密には `container prefix` を経由しています)を書き換える際に呼ばれる `modify` callbackです．
`nb_running_get_entry()` で対応する `struct srv6_locator` を引っ張ってきて， `prefix` を書き換えます．  

<https://github.com/Drumato/frr/blob/a41251800b09b9b93726a18fb891127a3e10340b/zebra/zebra_srv6_nb_config.c#L124>  

```c
// stripped

/*
 * XPath: /frr-zebra-sr:sr/frr-zebra-srv6:srv6/locators/locators/locator/prefix/prefix
 */
int nb_lib_srv6_locator_prefix_modify(struct nb_cb_modify_args *args) {
  struct srv6_locator *locator;

  if (args->event != NB_EV_APPLY) return NB_OK;

  locator = nb_running_get_entry(args->dnode, NULL, true);
  yang_dnode_get_prefix(&locator->prefix, args->dnode, NULL);

  return NB_OK;
}

// stripped
```

このようにして地道にcallbackを定義したあと，
最終的に `struct frr_yang_module_info` を `FRR_DAEMON_INFO` に引き渡します．
Zebraはすでに `struct frr_yang_module_info *const zebra_yang_modules[]` を定義しているので，
それに私が定義したものを追加するだけでOKです．  

<https://github.com/Drumato/frr/blob/a41251800b09b9b93726a18fb891127a3e10340b/zebra/main.c#L261>  

```c
// stripped

static const struct frr_yang_module_info *const zebra_yang_modules[] = {
  &frr_filter_info,
  &frr_interface_info,
  &frr_route_map_info,
  &frr_zebra_info,
  &frr_vrf_info,
  &frr_routing_info,
  &frr_srv6_info, // 追加
  &frr_zebra_route_map_info,
  &frr_zebra_sr_info, // 追加
  &frr_zebra_srv6_info, // 追加
};

// stripped
```

### SRv6 Manager CLI

ここまででdaemon側のNorthbound API対応はできているのですが，
vtysh側の実装がdaemon側の関数を直接叩くように実装されているままなので，これを変更します．
具体的には，vtysh command側の実装を単なるNorthbound API callで実装することができます．
まずは， `srv6_locator_cmd` という， locator config modeに遷移するcommandの実装です．
まずxpathを構築しますが，このときに `name` を渡し，locatorの初期化時に使えるようにします．
あとは `nb_cli_enqueue_change()` でAPI callをenqueueして，
`apply_changes()` でこれを適用します．
この際に， `NB_OP_CREATE` を指定するのがpointです．  

<https://github.com/Drumato/frr/blob/a41251800b09b9b93726a18fb891127a3e10340b/zebra/zebra_srv6_vty.c#L246>  

```c
// stripped

DEFPY_YANG_NOSH(srv6_locator,
                srv6_locator_cmd,
                "locator LOC_NAME$name",
                SRV6_LOCATOR_CMD_STR)
{
  char xpath[XPATH_MAXLEN];
  int rv;

  snprintf(xpath, sizeof(xpath),
           "/frr-zebra-sr:sr"
           "/frr-zebra-srv6:srv6"
           "/locators/locators/locator[name='%s']", name);

  nb_cli_enqueue_change(vty, xpath, NB_OP_CREATE, NULL);

  rv = nb_cli_apply_changes(vty, xpath);
  if (rv == CMD_SUCCESS)
    VTY_PUSH_XPATH(SRV6_LOC_NODE, xpath);

  return rv;
}

// stripped
```

続いて， `cli_show` callbackの実装をご紹介します．
`struct lyd_node *node` (FRRが使用するlibyang側の構造体) には対応するdata nodeが含まれています．  

<https://github.com/Drumato/frr/blob/a41251800b09b9b93726a18fb891127a3e10340b/zebra/zebra_srv6_vty.c#L405>  

```c
// stripped

void cli_show_srv6_locator(struct vty *vty, const struct lyd_node *dnode,
      bool show_defaults)
{
  const char *loc_name = NULL;

  loc_name = yang_dnode_get_string(dnode, "./name");
  vty_out(vty, "   locator %s\n", loc_name);
}

// stripped
```

このようにcli_showを地道に実装していくと，Zebra SRv6に関するconfigがcli_showですべて置換できるようになります．
詳細は省略しますが，vtyshで `show running-config` を実行したときに `zebra_sr_config()` という関数が呼ばれます．
isisdと同じように，この関数もすべて `cli_show` で置換します．
FRRではすでに `nb_cli_show_dnode_cmds()` という，再帰的にdnodeのcli_showを呼び出してくれる便利な関数があります．
これを使用して，簡潔に記述することができます．  

<https://github.com/Drumato/frr/blob/a41251800b09b9b93726a18fb891127a3e10340b/zebra/zebra_srv6_vty.c#L453>  

```c
// stripped

static int zebra_sr_config(struct vty *vty)
{
  int write_count = 0;
  struct lyd_node *dnode;

  if (zebra_srv6_is_enable()) {
    dnode = yang_dnode_get(running_config->dnode, 
                "/frr-zebra-sr:sr"
                "/frr-zebra-srv6:srv6");

    if (dnode) {
      nb_cli_show_dnode_cmds(vty, dnode, false);
      write_count++;
    }
  }

  return write_count;
}

// stripped
```

---

## 今後取り組むべきこと

ここまででsrv6_locator topotestが動作するようになったのですが，
実際にNorthbound API backendとしてほしい機能はまだ存在します．
よって，ここからはそれについて解説します．
また，発展的話題として，先述したmgmtdについても少しだけ触れることにします．  

### `segment-routing` blockの扱い

現状FRRでSRv6 locatorを定義する際には，以下のように指定します(ref: <https://github.com/FRRouting/frr/blob/master/tests/topotests/srv6_locator/r1/zebra.conf#L11> )．

```text
segment-routing
 srv6
  locators
   locator loc1
    prefix 2001:db8:1:1::/64
   exit
  exit
 exit
exit
```

一方，Cisco CLIは先述したものとは異なります(ref: <https://www.cisco.com/c/en/us/td/docs/routers/asr9000/software/asr9k-r7-3/segment-routing/configuration/guide/b-segment-routing-cg-asr9000-73x/m-configure-srv6-usid.html?referring_site=RE&pos=1&page=https://www.cisco.com/c/en/us/td/docs/routers/asr9000/software/asr9k-r6-6/segment-routing/configuration/guide/b-segment-routing-cg-asr9000-66x/b-segment-routing-cg-asr9000-66x_chapter_011.html#Cisco_Concept.dita_9cdec09b-6edf-4bb8-8137-6d546bfe0093> )．

```text
segment-routing srv6
 locators
  locator loc1
   prefix 2001:db8:1:1::/64
  exit
 exit
exit
```

この非一貫性を解消する，というtaskがあります．
FRRではpathdとZebra SRv6 Managerの双方で `SEGMENT_ROUITNG_NODE` ( `segment-routing` block) を定義しており，
またconfigure時に `--enable-pathd` を入力しないとZebra SRv6 vtysh commandsが動作しないという問題があります．
これを防ぐためには `segment-routing srv6` をうまく定義する必要がありますが，
私の調査ではこの実装にはいくつかの落とし穴があり，簡単ではありません．
しかしCisco CLIと同様の運用体験を実現するためには必要なpatchだと考えています．

### `show yang operational-data`

ここまでの実装はNorthbound API callbacksにおける configuration callbackに限定されており，
operational callbackは考慮されていません．
これによって， `show yang operational-data` などのcommandでSRv6資源の情報を取得したりすることはできません．
これは，PythonやGoなどでgrpc clientを実装してFRRにinteractした場合も同様です．  

これを実現するためには `get_keys/get_next/get_elem/lookup_entry` 等のcallbackに対応する必要があります．
ここまでもそうだったのですが，依然として網羅的なdocumentは存在せず，FRRの実装を深く読み込んで理解しなければ動作させることはできません．

### mgmtdについての調査と検証

先述したように，YANG basedにFRR managementを行うことに責任を持つmgmtdというdaemonが提案されています．
このdaemonは以下の機能を持ち，FRRの開発/運用体験を高めるという意味で非常に期待しています．

- API client等に対するfrontend interfaceの提供
  - running/candidate/startup datastoreが明確になり，わかりやすいAPIが定義される
- すべてのFRR daemonに対するbackend interfaceの提供
  - それぞれはmgmtdに対する問い合わせによってconfig/dataを操作する
  - これによりdaemonごとに異なる実装が減る
- Candidate Config CommitのRollback/History機能

mgmtdはFRR全体を巻き込む大きな変更を伴いますが(ただし段階的にmigrationはできそう)，
これによって現在私が抱えている多くの実装上の問題が解消されるかもしれません．
なのでmgmtdの実現が待ち遠しいですし，積極的にcontributionしたいとも思っています．  

初のmgmtd backend clientとしてstaticdが選ばれていますが，
これをbgpd含む他のrouting daemonに対応する，という仕事にはすごい魅力を感じます．
ぜひやってみたいですね．  

---

## まとめ

今回は，FRRoutingを改造して遊んでいる様子をご紹介しました．
このように巨大で実績のあるOSSのcodingは魅力がありますし，
迅速な理解と環境構築，coding力など様々なskillを要求されるのはとても楽しいです．  

しかし，FRRoutingへのcontributionはまだまだ足りないので，もっと頑張りたい．
できれば次のcontributionは，ちゃんとしたNetworking featureの実装をやりたいですね．  

---

## 参考資料

- <http://docs.frrouting.org/en/latest/grpc.html>
  - <http://docs.frrouting.org/projects/dev-guide/en/latest/grpc.html>
- [【インターンレポート】FRRouting IS-IS SRv6 Extension 設計と実装に関して](https://engineering.linecorp.com/ja/blog/internship2021-frrouting/)
- [zebra: srv6 manager](https://github.com/FRRouting/frr/pull/5865)
