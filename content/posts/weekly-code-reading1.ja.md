---
title: "Weekly Code Reading1-Goのsyscallパッケージを読む"
date: "2025-03-16"
lastmod: "2025-03-16"
tags: ["weekly-code-reading","go"]
---

最近は今の自分の知識を使ってなにかをするばかりで､インプットが欠けているなあと思ってきたので､
ベストエフォートで､週1でOSSコードリーディングをやっていく会です｡

｢コードを読むこと｣が目的にならないように､以下のフォーマットで進めていくことにします｡

```markdown
## 読む対象

- どのようなOSSの､どの部分を読むのかを決める

## 目的

- 読むことによってどのような知識を獲得したいかを書く
```

---

というわけで､早速第一回です｡

## 読む対象

今回は､Goのsyscallパッケージを読むことに､
特にLinuxのシステムコールまでどのように流れるのかを見ることにします｡
対象は [1.23.5](https://github.com/golang/go/releases/tag/go1.23.5) です｡

ライセンスは適宜コードスニペットの先頭に掲載します｡

本記事では、Goのソースコードを引用しています。GoはBSD 3-Clause Licenseのもとで提供されており、著作権は "The Go Authors" に帰属します。

## 目的

言語処理系､特にコンパイラを作っていると､標準ライブラリで各種システムコールを発行するような実装が求められます｡
実行バイナリにlibcをリンクするような形式であれば､glibcのシステムコールラッパーを呼べば解決できるのですが､
フリースタンディングなバイナリを生成するようなツールチェーンを開発しようとすると､ここらへんの理解が正確に求められます｡
過去､ 学生時代に [glibcのシステムコールラッパー](https://www.drumato.com/ja/posts/glibc-reading/) を読む記事を書いたことがありますが､
Goの場合はglibcに依存しないstatically linkedなバイナリを生成するので､この知識をそのまま流用することはできません｡

私は今趣味で言語処理系を書いていて､かつ自作言語なので､
このような低レベルAPIをどのような言語仕様で担保しようかなと思い､参考実装としてGoを見ることにしました｡

ということで目的は以下の通りになります｡

- Goにおいて､実際にシステムコールが発行される部分を眺める
  - 主に､自分が言語処理系を作る際の実装パターンの一つとして参考にする
- Goのように低レベルな機能が隠蔽された言語において､どのように実現されているのかを知る

---

## 本題

どこから読み始めるのか､ということで､今回は [syscall.Openat](https://pkg.go.dev/syscall#Openat) から見ることにします｡

<https://github.com/golang/go/blob/go1.23.5/src/syscall/syscall_linux.go#L287-L291>

```go
// Copyright 2009 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

//sys	openat(dirfd int, path string, flags int, mode uint32) (fd int, err error)

func Openat(dirfd int, path string, flags int, mode uint32) (fd int, err error) {
	return openat(dirfd, path, flags|O_LARGEFILE, mode)
}
```

この関数から全てが始まります｡
このソースコードが `syscall_linux.go` と､ `*_linux` がついているため､
GoはGOOSをもとにこの関数をを探してくることができます｡

コメントで `sys` から始まる行が入っているのが確認できます｡
これが何を意味しているのかは後ほど説明します｡

`openat()` 関数は､それぞれのアーキテクチャごとに異なるものが再度ビルドタグで解決されてよびだされます｡

<https://github.com/golang/go/blob/go1.23.5/src/syscall/zsyscall_linux_amd64.go>

```go
// Copyright 2009 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// mksyscall.pl -tags linux,amd64 syscall_linux.go syscall_linux_amd64.go
// Code generated by the command above; DO NOT EDIT.

// (中略)

// THIS FILE IS GENERATED BY THE COMMAND AT THE TOP; DO NOT EDIT

func openat(dirfd int, path string, flags int, mode uint32) (fd int, err error) {
	var _p0 *byte
	_p0, err = BytePtrFromString(path)
	if err != nil {
		return
	}
	r0, _, e1 := Syscall6(SYS_OPENAT, uintptr(dirfd), uintptr(unsafe.Pointer(_p0)), uintptr(flags), uintptr(mode), 0, 0)
	fd = int(r0)
	if e1 != 0 {
		err = errnoErr(e1)
	}
	return
}
```

ファイル先頭で `mksyscall.pl` の行が書いてあるのが気になります｡
コメント内容からみて､ `zsyscall_*.go` 系はこのプログラムを介して生成されたものが配置されているのがわかります｡
このPerlスクリプトについて､詳細に知りたい方は以下をご覧ください｡
私個人的に､Perlは読むのにすごく時間がかかるのと､
このスクリプトがなくても(原理的には)愚直に一つずつ手で書くことで同様のことが実現できるため､
今回はChatGPTに完全に助けてもらいました｡

<https://github.com/golang/go/blob/go1.23.5/src/syscall/mksyscall.pl>

Goプログラムのコメントから関数の情報を取得し､
それぞれの引数型ごとに(アーキテクチャの特性を考慮しながら)変換して､
`Syscall*()` 関数を呼ぶブリッジを生成するものです｡

openatの場合だと `Syscall6()` が呼ばれますが､
これはユーザが直接呼び出すことのできる公開された関数になっています｡

<https://pkg.go.dev/syscall#Syscall6>
<https://github.com/golang/go/blob/go1.23.5/src/syscall/syscall_linux.go#L91-L99>

```go
// Copyright 2009 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import (
  runtimesyscall "internal/runtime/syscall"
  // (省略)
)

// Pull in entersyscall/exitsyscall for Syscall/Syscall6.
//
// Note that this can't be a push linkname because the runtime already has a
// nameless linkname to export to assembly here and in x/sys. Additionally,
// entersyscall fetches the caller PC and SP and thus can't have a wrapper
// inbetween.

//go:linkname runtime_entersyscall runtime.entersyscall
func runtime_entersyscall()

//go:linkname runtime_exitsyscall runtime.exitsyscall
func runtime_exitsyscall()

// (省略)

//go:uintptrkeepalive
//go:nosplit
//go:norace
//go:linkname RawSyscall6
func RawSyscall6(trap, a1, a2, a3, a4, a5, a6 uintptr) (r1, r2 uintptr, err Errno) {
	var errno uintptr
	r1, r2, errno = runtimesyscall.Syscall6(trap, a1, a2, a3, a4, a5, a6)
	err = Errno(errno)
	return
}

//go:uintptrkeepalive
//go:nosplit
//go:linkname Syscall6
func Syscall6(trap, a1, a2, a3, a4, a5, a6 uintptr) (r1, r2 uintptr, err Errno) {
	runtime_entersyscall()
	r1, r2, err = RawSyscall6(trap, a1, a2, a3, a4, a5, a6)
	runtime_exitsyscall()
	return
}
```

なかなかトリッキーになってきました｡

`runtime_entersyscall/runtime_exitsyscall` については､
`go:linkname` が指定されています｡
このCompiler Directiveについては､以下の記事が参考になります｡

<https://www.sobyte.net/post/2022-07/go-linkname/#1-golinkname-basics>

これらは `runtime` パッケージの非公開関数として定義されていますが､
`go:linkname` を使って `syscall` や `golang.org/x/sys` から使われることを想定しています｡
これら関数ではGoroutineを制御したりといろいろ複雑なコードが動いていて､
実に読みがいのありそうなコードが並んでいるんですが､
今回は ｢実際にシステムコールが呼び出される部分｣が知りたいので省略します｡

実際にシステムコールを呼んでいそうなのは､ `internal/runtime/syscall` パッケージの `Syscall6` に見えるので､
それを追ってみることにします｡

<https://github.com/golang/go/blob/go1.23.5/src/internal/runtime/syscall/syscall_linux.go#L15-L16>

```go
// Copyright 2009 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Syscall6 calls system call number 'num' with arguments a1-6.
func Syscall6(num, a1, a2, a3, a4, a5, a6 uintptr) (r1, r2, errno uintptr)
```

なんとここにきて､Bodyの実装がない関数宣言が登場しました｡
Goでこういう構文があること自体を初めて知りました｡
Cで関数宣言だけ行うパターンと似ていますね｡

この関数が何をするのかを読もうとすると､Go Assemblyの世界に足を踏み入れることになります｡
以下のコードを読んでみましょう｡

<https://github.com/golang/go/blob/go1.23.5/src/internal/runtime/syscall/asm_linux_amd64.s>


```asm
// Copyright 2022 The Go Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.


// func Syscall6(num, a1, a2, a3, a4, a5, a6 uintptr) (r1, r2, errno uintptr)
//
// We need to convert to the syscall ABI.
//
// arg | ABIInternal | Syscall
// ---------------------------
// num | AX          | AX
// a1  | BX          | DI
// a2  | CX          | SI
// a3  | DI          | DX
// a4  | SI          | R10
// a5  | R8          | R8
// a6  | R9          | R9
//
// r1  | AX          | AX
// r2  | BX          | DX
// err | CX          | part of AX
//
// Note that this differs from "standard" ABI convention, which would pass 4th
// arg in CX, not R10.
TEXT ·Syscall6<ABIInternal>(SB),NOSPLIT,$0
	// a6 already in R9.
	// a5 already in R8.
	MOVQ	SI, R10 // a4
	MOVQ	DI, DX  // a3
	MOVQ	CX, SI  // a2
	MOVQ	BX, DI  // a1
	// num already in AX.
	SYSCALL
	CMPQ	AX, $0xfffffffffffff001
	JLS	ok
	NEGQ	AX
	MOVQ	AX, CX  // errno
	MOVQ	$-1, AX // r1
	MOVQ	$0, BX  // r2
	RET
ok:
	// r1 already in AX.
	MOVQ	DX, BX // r2
	MOVQ	$0, CX // errno
	RET
```

Go Assemblerについては､以下の公式ドキュメントが存在します｡

<https://go.dev/doc/asm>

アセンブリに慣れている人的には､AT&T記法だと思って読めばだいたい理解できると思います｡

GoのInternal ABIとシステムコールのABIの対応表はコメントに書いてあるとおりであり､
それを変換するコードが書いてあります｡

### 余談: GoのInternal ABIとはどのようなものか

そもそも､Goプログラムが実行バイナリに変換されたとき､
どのような機械語に変換されるのでしょうか｡
また､そのABIはどのようになっているのでしょうか｡

すべてを理解するのは大変難しそうですが､以下のドキュメントが見つかったので興味のある人は読んでみてください｡

<https://go.googlesource.com/go/+/refs/heads/dev.regabi/src/cmd/compile/internal-abi.md>

ここでは､普通に `func F(a, b, c, d, e, f, g uintptr) (uintptr, uintptr, uintptr)` な関数を定義して､
そのアセンブル結果を見てみることにします｡
普通に定数だけを渡したら､関数 `f` はインライン化され､
また定数畳み込みされた結果が使われていそうだったので､randを使ってみました｡

```go
package main

import (
        "fmt"
        "math/rand"
)

func f(a, b, c, d, e, f, g uintptr) (uintptr, uintptr, uintptr) {
        x := a + b
        y := c + d
        z := e + f + g + uintptr(rand.Int())

        return x, y, z
}

func main() {
        r1, r2, r3 := f(1, 2, 3, 4, 5, 6, 7)
        fmt.Println(r1, r2, r3)
}
```

以下がアセンブル結果です｡

```asm
000000000048ffc0 <main.main>:
  48ffc0:       49 3b 66 10             cmp    0x10(%r14),%rsp
  48ffc4:       0f 86 c1 00 00 00       jbe    49008b <main.main+0xcb>
  48ffca:       55                      push   %rbp
  48ffcb:       48 89 e5                mov    %rsp,%rbp
  48ffce:       48 83 ec 78             sub    $0x78,%rsp
  48ffd2:       b8 01 00 00 00          mov    $0x1,%eax
  48ffd7:       bb 02 00 00 00          mov    $0x2,%ebx
  48ffdc:       b9 03 00 00 00          mov    $0x3,%ecx
  48ffe1:       bf 04 00 00 00          mov    $0x4,%edi
  48ffe6:       be 05 00 00 00          mov    $0x5,%esi
  48ffeb:       41 b8 06 00 00 00       mov    $0x6,%r8d
  48fff1:       41 b9 07 00 00 00       mov    $0x7,%r9d
  48fff7:       e8 04 ff ff ff          call   48ff00 <main.f>
  48fffc:       48 89 5c 24 40          mov    %rbx,0x40(%rsp)
  490001:       48 89 4c 24 38          mov    %rcx,0x38(%rsp)
  490006:       44 0f 11 7c 24 48       movups %xmm15,0x48(%rsp)
  49000c:       44 0f 11 7c 24 58       movups %xmm15,0x58(%rsp)
  490012:       44 0f 11 7c 24 68       movups %xmm15,0x68(%rsp)
  490018:       e8 43 0a fd ff          call   460a60 <runtime.convT64>
  49001d:       48 8d 15 bc 9b 00 00    lea    0x9bbc(%rip),%rdx        £ 499be0 <type:*+0x8be0>
  490024:       48 89 54 24 48          mov    %rdx,0x48(%rsp)
  490029:       48 89 44 24 50          mov    %rax,0x50(%rsp)
  49002e:       48 8b 44 24 40          mov    0x40(%rsp),%rax
  490033:       e8 28 0a fd ff          call   460a60 <runtime.convT64>
  490038:       48 8d 15 a1 9b 00 00    lea    0x9ba1(%rip),%rdx        £ 499be0 <type:*+0x8be0>
  49003f:       48 89 54 24 58          mov    %rdx,0x58(%rsp)
  490044:       48 89 44 24 60          mov    %rax,0x60(%rsp)
  490049:       48 8b 44 24 38          mov    0x38(%rsp),%rax
  49004e:       e8 0d 0a fd ff          call   460a60 <runtime.convT64>
  490053:       48 8d 15 86 9b 00 00    lea    0x9b86(%rip),%rdx        £ 499be0 <type:*+0x8be0>
  49005a:       48 89 54 24 68          mov    %rdx,0x68(%rsp)
  49005f:       48 89 44 24 70          mov    %rax,0x70(%rsp)
  490064:       48 8b 1d c5 87 0c 00    mov    0xc87c5(%rip),%rbx        £ 558830 <os.Stdout>
  49006b:       48 8d 05 a6 62 04 00    lea    0x462a6(%rip),%rax        £ 4d6318 <go:itab.*os.File,io.Writer>
  490072:       48 8d 4c 24 48          lea    0x48(%rsp),%rcx
  490077:       bf 03 00 00 00          mov    $0x3,%edi
  49007c:       48 89 fe                mov    %rdi,%rsi
  49007f:       90                      nop
  490080:       e8 9b a5 ff ff          call   48a620 <fmt.Fprintln>
  490085:       48 83 c4 78             add    $0x78,%rsp
  490089:       5d                      pop    %rbp
  49008a:       c3                      ret
  49008b:       e8 d0 9a fd ff          call   469b60 <runtime.morestack_noctxt.abi0>
  490090:       e9 2b ff ff ff          jmp    48ffc0 <main.main>
```

内容をまとめると､以下のようになるでしょうか｡

第一引数から順に､ `eax, ebx, ecx, edi, esi, r8d, r9d` に格納されていますが､
amd64における`System V AMD64 ABI` と同じなのでしょうか｡

以下に､Cのコードを用意してgccでコンパイルしてみました｡

`gcc version 14.2.1 20241116 (GCC)` を利用しています｡

```c
int func(int a, int b, int c, int d, int e, int f, int g) {
  return a + b + c + d + e + f + g;
}
int main(void) {
  volatile int a = 1;
  volatile int b = 2;
  volatile int c = 3;
  volatile int d = 4;
  volatile int e = 5;
  volatile int f = 6;
  volatile int g = 7;
  return func(a, b, c, d, e, f, g);
}
```

結果は次のようになり､
私のよく知っている､
`edi, esi, edx, ecx, r8d, r9d, 以降スタック` という感じになりました｡

```asm
0000000000401020 <main>:
  401020:       48 83 ec 30             sub    $0x30,%rsp
  401024:       c7 44 24 0c 01 00 00    movl   $0x1,0xc(%rsp)
  40102b:       00
  40102c:       c7 44 24 10 02 00 00    movl   $0x2,0x10(%rsp)
  401033:       00
  401034:       c7 44 24 14 03 00 00    movl   $0x3,0x14(%rsp)
  40103b:       00
  40103c:       c7 44 24 18 04 00 00    movl   $0x4,0x18(%rsp)
  401043:       00
  401044:       c7 44 24 1c 05 00 00    movl   $0x5,0x1c(%rsp)
  40104b:       00
  40104c:       c7 44 24 20 06 00 00    movl   $0x6,0x20(%rsp)
  401053:       00
  401054:       c7 44 24 24 07 00 00    movl   $0x7,0x24(%rsp)
  40105b:       00
  40105c:       8b 44 24 24             mov    0x24(%rsp),%eax
  401060:       44 8b 4c 24 20          mov    0x20(%rsp),%r9d
  401065:       44 8b 44 24 1c          mov    0x1c(%rsp),%r8d
  40106a:       8b 4c 24 18             mov    0x18(%rsp),%ecx
  40106e:       8b 54 24 14             mov    0x14(%rsp),%edx
  401072:       8b 74 24 10             mov    0x10(%rsp),%esi
  401076:       8b 7c 24 0c             mov    0xc(%rsp),%edi
  40107a:       50                      push   %rax
  40107b:       e8 00 01 00 00          call   401180 <func>
  401080:       48 83 c4 38             add    $0x38,%rsp
  401084:       c3                      ret
  401085:       66 2e 0f 1f 84 00 00    cs nopw 0x0(%rax,%rax,1)
  40108c:       00 00 00
  40108f:       90                      nop
```

## まとめ

ここまでで､システムコールが発行されるまでの流れを大雑把に掴むことができました｡
`asm_linux_amd64.s` がどのようにGo toolchainに渡され､バイナリ生成されるのかも気になるところですが､
そこまでは追わないことにします｡

実はここらへんのコードは一度読んだことがあったのですが､完全に頭から揮発していたのでここでまとめておけて良かったです｡
Goにはインラインアセンブリがないのでどのようにやっているのか気になっていたのですが､
なんとGo独自のアセンブリ言語でブリッジし､Go Assemblerによって解釈されるようになっていた､ということですね｡

次回はRustの標準ライブラリから､なにかデータ構造をピックアップして読んでみることにします｡
