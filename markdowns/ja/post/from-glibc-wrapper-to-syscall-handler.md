---
title: "glibc wrapperから読み始めてsystem call handlerまで"
description: "勢いだけでcode readingをはじめて, sytem callの流れを追ってみます."
createdAt: "2019-12-01"
tags: ["c", "linux"]
imageLink: "/Drumato.png"
---

- [システムコールの流れ](#システムコールの流れ)
	- [glibcでのシステムコールラッパーの処理](#glibcでのシステムコールラッパーの処理)
	- [`syscall` 命令の実行](#syscall-命令の実行)
	- [Linuxのシステムコールハンドラ](#linuxのシステムコールハンドラ)
- [おわりに](#おわりに)

[IPFactory Advent Calendar 2019](https://qiita.com/advent-calendar/2019/ipfactory) 一日目.  
急遽開いた弊サークルのカレンダー,既に一日目が終わろうとしている.  

私は日頃から勉強した内容をMarkdownにまとめ,  
Gitリポジトリに保存するようにしている.  

ここではそのリポジトリから,  
Linuxにおけるシステムコールの流れのメモを取り出して紹介しよう.  

誰も投稿しないよりよっぽどマシだし,  
おそらく誰かの何かになれると思う.  

> 要は急にやることになったので何もなかった.

## システムコールの流れ

アプリケーションプログラムがシステムコールを発行した時,  
内部ではどのようなフローをたどるのかについて解説する.  
これを一度理解しておくことで,  
ユーザランドとカーネルランドのインタフェースについて理解を深められる.  

### glibcでのシステムコールラッパーの処理

まず,ユーザアプリケーションでシステムコールを呼び出す時,  
往々にして **glibc等で定義されたシステムコールラッパー** を利用する.  
後々実際に見ていくが,  
このラッパーは内部で **`syscall`命令** を実行している.

例えば **[brk(2)](https://code.woboq.org/userspace/glibc/sysdeps/unix/sysv/linux/x86_64/brk.c.html#31)** は以下のようなラッパーが定義されている.  

```c
/* This must be initialized data because commons can't have aliases.  */
void *__curbrk = 0;
int
__brk (void *addr)
{
  void *newbrk;
  __curbrk = newbrk = (void *) INLINE_SYSCALL (brk, 1, addr);
  if (newbrk < addr)
    {
      __set_errno (ENOMEM);
      return -1;
    }
  return 0;
}
weak_alias (__brk, brk)

```

このコードで重要なのは,  
`INLINE_SYSCALL (brk, 1, addr);` マクロの実行である.  

```c
# define INLINE_SYSCALL(name, nr, args...) \
  ({                                                                              \
    unsigned long int resultvar = INTERNAL_SYSCALL (name, , nr, args);              \
    if (__glibc_unlikely (INTERNAL_SYSCALL_ERROR_P (resultvar, )))              \
      {                                                                              \
        __set_errno (INTERNAL_SYSCALL_ERRNO (resultvar, ));                      \
        resultvar = (unsigned long int) -1;                                      \
      }                                                                              \
    (long int) resultvar; })
```

少し見づらいが,簡単にまとめる.  

- `INTERNAL_SYSCALL` マクロでシステムコールを実行する
  - このマクロについては後述
  - `INLINE_SYSCALL` の第一引数を直接受け取る( 上記例なら `brk` )
  - `INTERNAL_SYSCALL` の第三引数に引数の個数が渡る( 仮引数名 -> `nr` )
- `INTERNAL_SYSCALL_ERROR_P` はエラーチェック

`INTERNAL_SYSCALL` 内部について見てみる.  

```c
#define INTERNAL_SYSCALL(name, err, nr, args...)                        \
        internal_syscall##nr (SYS_ify (name), err, args)

```

引数で渡された `nr` と `internal_syscall` が結合される.  
つまり, `1` が渡されれば `internal_syscall1()` という関数マクロの呼び出しになる.  

```c
#define SYS_ify(syscall_name)        __NR_##syscall_name
```

と定義されているので,brk(2)における `INTERNAL_SYSCALL` の呼び出しは次のようになる.  
(`__NR_brk` は 12 とマクロ定数で定義されている).

```c
internal_syscall1(12, , addr)
```

```c
#undef internal_syscall1
#define internal_syscall1(number, err, arg1)                                \
({                                                                        \
    unsigned long int resultvar;                                        \
    TYPEFY (arg1, __arg1) = ARGIFY (arg1);                                 \
    register TYPEFY (arg1, _a1) asm ("rdi") = __arg1;                        \
    asm volatile (                                                        \
    "syscall\n\t"                                                        \
    : "=a" (resultvar)                                                        \
    : "0" (number), "r" (_a1)                                                \
    : "memory", REGISTERS_CLOBBERED_BY_SYSCALL);                        \
    (long int) resultvar;                                                \
})
```

`syscall` 命令の実行が確認できる.  

### `syscall` 命令の実行

Intel x64 SDM を読むと,  
`syscall` 命令時には `IA32_LSTAR` というレジスタの値を `RIP` に入れていることが分かる.  
なんとなくこの `IA32_LSTAR` にLinuxカーネルのシステムコールハンドラ(のアドレス)が入っていそうだなあ,という予感がする  

[linux/arch/x86/kernel/cpu/common.c](https://github.com/torvalds/linux/blob/master/arch/x86/kernel/cpu/common.c) を見ると,  
`syscall_init()` 関数を発見できる.  
この関数は [linux/arch/x86/kernel/cpu/common.c](https://github.com/torvalds/linux/blob/master/arch/x86/kernel/cpu/common.c)  の `cpu_init()` で呼ばれている.  

```c

/* May not be marked __init: used by software suspend */
void syscall_init(void)
{
	wrmsr(MSR_STAR, 0, (__USER32_CS << 16) | __KERNEL_CS);
	wrmsrl(MSR_LSTAR, (unsigned long)entry_SYSCALL_64);
``` 

### Linuxのシステムコールハンドラ

`MSR_LSTAR` に `entry_SYSCALL_64` というアドレスを格納している.  
このシンボルが **システムコールハンドラ** だと推測できる.  
[linux/arch/x86/entry/entry_64.S](https://github.com/torvalds/linux/blob/master/arch/x86/entry/entry_64.S) を見てみる.  

```asm
SYM_CODE_START(entry_SYSCALL_64)
	UNWIND_HINT_EMPTY
	/*
	 * Interrupts are off on entry.
	 * We do not frame this tiny irq-off block with TRACE_IRQS_OFF/ON,
	 * it is too small to ever cause noticeable irq latency.
	 */

	swapgs
```

`swapgs` 命令によって, ` IA32_KERNEL_GS_BASE;` に格納されたカーネルデータ構造へのポインタを  
`gs` レジスタに格納できる.  

```asm
/* Construct struct pt_regs on stack */
	pushq	$__USER_DS				/* pt_regs->ss */
	pushq	PER_CPU_VAR(cpu_tss_rw + TSS_sp2)	/* pt_regs->sp */
	pushq	%r11					/* pt_regs->flags */
	pushq	$__USER_CS				/* pt_regs->cs */
	pushq	%rcx					/* pt_regs->ip */
SYM_INNER_LABEL(entry_SYSCALL_64_after_hwframe, SYM_L_GLOBAL)
	pushq	%rax					/* pt_regs->orig_ax */

	PUSH_AND_CLEAR_REGS rax=$-ENOSYS

	TRACE_IRQS_OFF

	/* IRQs are off. */
	movq	%rax, %rdi
	movq	%rsp, %rsi
	call	do_syscall_64		/* returns with IRQs disabled */

```

LinuxにおけるC言語の呼び出し規約として,  
第一引数は `rdi` , 第二引数は `rsi` レジスタを用いる.  
つまり `rax` (先程のインラインアセンブリによるシステムコール番号)が第一引数,  
`rsp` ( `pt_regs` 構造体がスタックにつまれていて,そのアドレス) が第二引数ということになる.
そして呼ばれる `do_syscall_64`.  

```c
#ifdef CONFIG_X86_64
__visible void do_syscall_64(unsigned long nr, struct pt_regs *regs)
{
	struct thread_info *ti;

	enter_from_user_mode();
	local_irq_enable();
	ti = current_thread_info();
	if (READ_ONCE(ti->flags) & _TIF_WORK_SYSCALL_ENTRY)
		nr = syscall_trace_enter(regs);

	if (likely(nr < NR_syscalls)) {
		nr = array_index_nospec(nr, NR_syscalls);
		regs->ax = sys_call_table[nr](regs);
#ifdef CONFIG_X86_X32_ABI
	} else if (likely((nr & __X32_SYSCALL_BIT) &&
			  (nr & ~__X32_SYSCALL_BIT) < X32_NR_syscalls)) {
		nr = array_index_nospec(nr & ~__X32_SYSCALL_BIT,
					X32_NR_syscalls);
		regs->ax = x32_sys_call_table[nr](regs);
#endif
	}

	syscall_return_slowpath(regs);
}
#endif
```

`sys_call_table` から該当するシステムコールの番号で検索し,  
対応する `__x64_sys_name()`  の関数ポインタを取得, `rax` に入れる.  

## おわりに

取り敢えずここまでで,  

- システムコールラッパー
- `syscall` 命令
  - 内部で `RIP` に `MSR_LSTAR` の値を格納していることが分かる
- システムコールハンドラ

までの流れが確認できた.  
ユーザランドとカーネルランドの切り替わり部分が理解出来たので,良しとする.  

後で更に深くまで書き足すかもしれないが,  
~~急にやることになった記事としては~~ 悪くない.  
