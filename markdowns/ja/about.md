---
createdAt: "2021-09-19"
title: "About"
tags: []
imageLink: ""
description: ""
---

- [Profile](#profile)
- [OSS Contributions](#oss-contributions)
- [My Products](#my-products)
- [Slides](#slides)
- [Books](#books)
- [Events](#events)
- [Other posts](#other-posts)
- [Career](#career)

## Profile

```yaml
personality:
  name: Yamato Sugawara
  handle: Drumato
  dateOfBirth: 2000年4月1日
currentInterests:
- Computer Science
- Network
- Infrastructure
- Cloud Technology
- System Programming
- All Hot Things🔥
natualLanguages:
  native:
  - Japanese
  baby:
  - English
programmingLanguages:
  fluent:
  - Go
  - Rust
  - Python
  intermediate:
  - C
  elementary:
  - TypeScript
```

## OSS Contributions

- FRRouting
  - Zebra SRv6 Manager
    - [zebra: Add support for json output in srv6 locator detail command](https://github.com/FRRouting/frr/pull/9899)
    - [enable to transition to SEGMENT_ROUTING_NODE when pathd is disabled](https://github.com/FRRouting/frr/pull/10350)

## My Products

- [Depth](https://github.com/Drumato/Depth)
  - Compiler Driverをscratchで自作しました
  - 自作言語をsupportしています
  - x86_64に向けた翻訳を行います
  - assembler/static linkerも含みます
  - すべてRustで書かれています
  - ちょっとだけLLVM IRを生成することもできます
  - subprocess callを使わずに自作ELFを実行します
    - これはJIT executionの仕組みを流用しています
  - readelfっぽい機能が入っています
  - 最終的に，gccを使わずに実行可能なELFを生成することができました
- [Peachili](https://github.com/Drumato/Peachili)
  - 第二作目の自作Compiler Driverです
  - 自作言語をsupportしています
  - libc非依存で，Hello, worldもできます
  - すべてRustで書かれています
- [asmpeach](https://github.com/Drumato/asmpeach)
  - Rustで書かれたx86_64 assemblerです
- [elfpeach](https://github.com/Drumato/elfpeach)
  - TUI basedなELF解析toolです
- [elf-utilities](https://github.com/Drumato/elf-utilities)
  - RustでELFを扱うためのlibrary suiteです

## Slides

- Japanese
  - [x64/aarch64コンパイラを含むミニツールチェーン+αの開発 - Cybozu Labs Youth 10th](https://speakerdeck.com/drumato/cybozu-labs-youth-10th)
  - [an incremental approach to implement an admission controller](https://speakerdeck.com/drumato/an-incremental-approach-to-implement-an-admission-controller)
  - [eBPF disassemblerを作る](https://speakerdeck.com/drumato/writing-an-experimental-ebpf-disassembler)
- English
  - [Components of Kubernetes Cluster](https://speakerdeck.com/drumato/components-of-kubernetes-cluster)

## Books

- Japanese
  - Zenn.dev
    - [[全部無料]最小限で理解しつつ作るELF parser入門 in Rust](https://zenn.dev/drumato/books/afc3e00a4c7f1d)
      - Rustでpopularに使われるparser combinatorであるnomを使ってELF parserを作る本です
      - ELFについて全く知らない人にもおすすめです
  - 技術同人誌
    - [OtakuAssembly Vol.1(co-authored)](https://booth.pm/ja/items/1578084)
      - OtakuAssemblyというサークルに所属してELFのことを書きました
      - 行動力のある人たちと一緒に本を書き上げる経験はとても貴重でした

## Events

- seccamp2019 Y-Ⅱ Cコンパイラを自作してみよう! 受講生
  - [report](https://www.drumato.com/ja/posts/c-compiler-at-seccamp2019/)
- SecHack365'19 Trainee
  - [SecHack365での1年間をまとめたreport](https://www.drumato.com/ja/posts/execution-program-infra-at-sechack365/)
  - [成果物についてfocusしてまとめたreport](https://www.drumato.com/ja/posts/execution-program-infra-in-rust/)
- 第10期サイボウズ･ラボユース生
  -  [Report in Japanese](https://www.drumato.com/ja/posts/cybozu-labs-youth-10th/)
- Online Summer Internship for Gophers 2020参加
  - [Report in Japanese](https://www.drumato.com/ja/posts/online-summer-internship-for-gophers-2020/)
- KLab Expert Camp#3

## Other posts

- as a part-timer of LINE Corporation
  - Japanese
    - [仮想ルータクラスタを自動でローリングアップデートする仕組みの検討と実装](https://engineering.linecorp.com/ja/blog/rollingupdate-vrouter-cluster/)
    - [BGP Graceful Restartに関わる各OSSルーティングプラットフォームの動向調査](https://engineering.linecorp.com/ja/blog/oss-routing-platform-involved-in-bgp-graceful-restart/)

## Career

See [LinkedIn](https://www.linkedin.com/in/drumato/)  
