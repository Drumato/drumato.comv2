---
createdAt: "2021-09-19"
title: "About"
tags: []
---

- [Profile](#profile)
- [OSS Contributions](#oss-contributions)
- [GitHub Repositories](#github-repositories)
- [Slides](#slides)
- [Books](#books)
- [Events](#events)
- [Other Posts](#other-posts)
- [Career](#career)

## Profile

```yaml
personality:
  name: Yamato Sugawara
  handle: Drumato
  dateOfBirth: Apr 1st, 2000
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

## GitHub Repositories

- [Depth](https://github.com/Drumato/Depth)
  - developed a compiler driver from scratch
  - supports a toy programming language
  - it translates to x86_64 assembly
  - contains an x86_64 assembler/static linker
  - all of it is written in pure Rust
  - execution machine codes without calling any subprocesses
    - It uses a mechanism like JIT execution
  - an ELF analyzer
  - finally It was able to generate an ELF that can be executed in Linux
- [Peachili](https://github.com/Drumato/Peachili)
  - My 2nd compiler driver from scratch
  - supports a toy programming language
  - It doesn't depend on libc
  - can print Hello, World to stdout
  - all of it is written in pure Rust
- [asmpeach](https://github.com/Drumato/asmpeach)
  - an x86_64 assembler written in Rust
- [elfpeach](https://github.com/Drumato/elfpeach)
  - a TUI based ELF analyzer
- [elf-utilities](https://github.com/Drumato/elf-utilities)
  - a library suite for handling/manipulating ELF in Rust

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
      - It introduces how to write an ELF parser by using nom(a popular parser combinator)
      - I think this book is kind if you're new to analyze/parse ELF
  - Fanzines
    - [OtakuAssembly Vol.1(co-authored)](https://booth.pm/ja/items/1578084)

## Events

- seccamp2019 Y-ⅡCコンパイラを自作してみよう! Trainee
  - [Report](https://www.drumato.com/ja/posts/c-compiler-at-seccamp2019/)
- SecHack365'19 Trainee
  - [Report in Japanese](https://www.drumato.com/ja/posts/execution-program-infra-at-sechack365/)
  - [Report2 in Japanese](https://www.drumato.com/ja/posts/execution-program-infra-in-rust/)
- Cybozu Labs Youth 10th
  - [Report in Japanese](https://www.drumato.com/ja/posts/cybozu-labs-youth-10th/)
- Online Summer Internship for Gophers 2020
  - [Report in Japanese](https://www.drumato.com/ja/posts/online-summer-internship-for-gophers-2020/)
- KLab Expert Camp#3

## Other Posts

- as a part-timer of LINE Corporation
  - Japanese
    - [仮想ルータクラスタを自動でローリングアップデートする仕組みの検討と実装](https://engineering.linecorp.com/ja/blog/rollingupdate-vrouter-cluster/)
    - [BGP Graceful Restartに関わる各OSSルーティングプラットフォームの動向調査](https://engineering.linecorp.com/ja/blog/oss-routing-platform-involved-in-bgp-graceful-restart/)

## Career

See [LinkedIn](https://www.linkedin.com/in/drumato/)  
