---
title: "Linuxのopen(2) syscallをもう一度復習する"
date: "2021-01-24"
lastmod: "2021-01-24"
tags: ["c", "linux"]
---

お久しぶりです．  
最近は自作コンパイラや，  
[YouTubeでのアウトプット活動](https://www.youtube.com/channel/UCUaqLN-HQUwLYRr2SEhmbxA) をやってたりしました．  

現在インフラ部門での就職活動に取り組んでおり，  
将来その分野で専門的に精進したいという思いから，  
Linuxに関する知識をもう一度整理しようと考えました．  

今回はLinuxの機能でも特に中核を担う"ファイル"と，  
ファイルを扱う上でまず必要になる `open(2)` システムコールについてまとめます．  
基本的にはユーザ視点のドキュメントになりますが，  
Linuxカーネルにあるシステムコールの実装をちょっと覗き見するまでの記事です．  

詳解UNIXプログラミング等，書籍の内容も含みます．  

## ユーザから見るopen(2)

### 基本

まずはmanの内容を引っ張り出してきます．  

```c
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>

       int open(const char *pathname, int flags);
       int open(const char *pathname, int flags, mode_t mode);

       int creat(const char *pathname, mode_t mode);

       int openat(int dirfd, const char *pathname, int flags);
       int openat(int dirfd, const char *pathname, int flags, mode_t mode);
```

引数にはファイルパスである `pathname` と，  
`open(2)` 時の挙動を制御する `flags` が存在します．  
また，`mode` は，`open(2)` によって新しくファイルが作成される場合，そのファイルに設定するパーミッションを設定します．  

返り値の `int` 型はファイルディスクリプタを表しますが，  
何らかの原因で失敗した場合は-1を返します．  

ファイルディスクリプタは非負の整数であるため `unsigned int` 型を返したくなりますが，  
C言語でエラーを表現する場合，負の数をエラーとする事は非常に多いのでしょうがないですね．  
`int open(const char *pathname, int flags, unsigned int *fd);` として， `fd` に書き込むという方式もよく取られます．  
こうすればエラーとファイルディスクリプタをうまく分けられるので，私がC言語でエラーを返す関数を定義する時はこのようにしがち．  

実際に`open(2)`に渡されるフラグを見てみましょう．  
すべてのフラグについて解説するわけではなく，  
私の方で特筆すべきと判断した内容にのみ触れます．  

#### `O_APPEND`

ファイルを追加モードでオープンします．  
イメージしづらいと思うので実際に使ってみます．  

以下のようなファイルを用意します．  

```text
Drumato
123

```

次のようなCプログラムをコンパイル&リンクして実行します．  

```c
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

int main()
{
    const char *msg = "New Drumato\n";
    int fd = open("sample.txt", O_WRONLY | O_APPEND);
    if (fd == -1)
    {
        fprintf(stderr, "open(2) failed\n");
        return 1;
    }

    ssize_t nbytes = write(fd, msg, strlen(msg));

    if (nbytes == -1)
    {
        fprintf(stderr, "write(2) failed\n");
        return 1;
    }

    return 0;
}
```

実行結果は以下のようになります．  

```shell
$ gcc c.c
$ ./a.out
$ cat sample.txt
Drumato
123
New Drumato
```

上記Cプログラムは以下のCプログラムと同じように振る舞います．  

```c
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

int main()
{
    const char *msg = "New Drumato\n";
    int fd = open("sample.txt", O_WRONLY);
    if (fd == -1)
    {
        fprintf(stderr, "open(2) failed\n");
        return 1;
    }

    if (lseek(fd, 0, SEEK_END) == -1)
    {
        fprintf(stderr, "lseek(2) failed\n");
        return 1;
    }

    ssize_t nbytes = write(fd, msg, strlen(msg));

    if (nbytes == -1)
    {
        fprintf(stderr, "write(2) failed\n");
        return 1;
    }

    return 0;
}
```

つまり，`O_APPEND`によって開かれた`fd`は，  
ファイルのオフセットをファイル末尾に設定した状態でユーザに渡されます．  

#### `O_CLOEXEC`

プロセスの親子関係において，  
親プロセスが開いているファイルディスクリプタは，子プロセスにもそのまま引き継がれます．  

この挙動を許したくない場合，つまり子プロセスにファイルディスクリプタ群をコピーしたくない場合，  
`open(2)` して開いたファイルディスクリプタに対して `fcntl(2)` を呼び出し，  
`FD_CLOEXEC` フラグを設定するというプログラムを書く必要があります．  
これを ***close-on-exec* フラグの設定** といいます．  

しかし， `open(2)` の呼び出し終了から `fcntl(2)` の呼び出しが行われるまでに，  
子プロセス等からfdを触られてしまうかもしれません．  
これを回避するためにLinux 2.6.23 以降から， `O_CLOEXEC` フラグを設定できるようになりました．  
`fcntl(2)` を明示的に呼び出さなくても，fdに対して*close-on-exec* フラグを設定してくれます．  

実際に試してみましょう．  
まずは子プロセスを生成する親プロセスのプログラムを作ります．

```c

#include <dirent.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>

static void print_file_descriptors_by_current();

void open_sample_txt_many_times()
{
    for (int i = 0; i < 20; i++)
    {
        int fd;
        if ((fd = open("sample.txt", O_RDONLY)) == -1)
        {
            fprintf(stderr, "open(2) failed\n");
            exit(1);
        }
    }
}
int main(void)
{
    open_sample_txt_many_times();

    print_file_descriptors_by_current();

    pid_t pid;
    if ((pid = fork()) == -1)
    {
        fprintf(stderr, "fork(2) failed\n");
        return 1;
    }
    else if (pid == 0)
    {
        fprintf(stderr, "\nchild process start\n");
        char *child_argv[] = {"./child", NULL};
        execve("./child", child_argv, NULL);
        return 0;
    }
    else
    {
        int status;
        if (waitpid(pid, &status, 0) == -1)
        {
            fprintf(stderr, "waitpid(2) failed\n");
            return 1;
        }
        fprintf(stderr, "child process end\n");

        return 0;
    }
}

static void print_file_descriptors_by_current()
{
    pid_t pid = getpid();
    DIR *dir;
    struct dirent *dp;

    if ((dir = opendir("/proc/self/fd")) == NULL)
    {
        fprintf(stderr, "opendir(3) failed");
        exit(1);
    }

    int i = 0;
    for (dp = readdir(dir); dp != NULL; dp = readdir(dir))
    {
        printf("files[%d] => %s (in pid=%d)\n", i, dp->d_name, pid);
        i++;
    }
}
```

procfsには `/proc/[pid]/fd` というディレクトリが存在し，  
`pid` に対応するプロセスが開いているファイルディスクリプタのエントリが存在します．  
親プロセスではたくさんのファイルを開いておきましょう．

次に，子プロセスのプログラムを作ります．  
このプログラムでも `print_file_descriptors_by_current()` を呼び出すことで，  
子プロセスに親プロセスのファイルディスクリプタが引き継がれているかどうか確認します．  

```c
#include <dirent.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/types.h>
#include <unistd.h>

static void print_file_descriptors_by_current();

int main()
{
    print_file_descriptors_by_current();
    return 0;
}

static void print_file_descriptors_by_current()
{
    pid_t pid = getpid();
    DIR *dir;
    struct dirent *dp;

    if ((dir = opendir("/proc/self/fd")) == NULL)
    {
        fprintf(stderr, "opendir(3) failed");
        exit(1);
    }

    int i = 0;
    for (dp = readdir(dir); dp != NULL; dp = readdir(dir))
    {
        printf("files[%d] => %s (in pid=%d)\n", i, dp->d_name, pid);
        i++;
    }
}
```

実行結果は以下のようになります．

```shell
$ gcc -o parent parent.c
$ gcc -o child child.c
$ ./parent
files[0] => . (in pid=10636)
files[1] => .. (in pid=10636)
files[2] => 0 (in pid=10636)
files[3] => 1 (in pid=10636)
# stripped
files[25] => 23 (in pid=10636)

child process start
files[0] => . (in pid=10637)
files[1] => .. (in pid=10637)
files[2] => 0 (in pid=10637)
files[3] => 1 (in pid=10637)
# stripped
files[25] => 23 (in pid=10637)
child process end
```

それでは，`sample.txt` のopen時に `O_CLOEXEC` を渡してみます．  
`parent.c` の `open(2)` 呼び出し部分を変更するだけです．  
実行結果は以下のようになります．

```shell
$ gcc -o parent parent.c
$ gcc -o child child.c
$ ./parent
files[0] => . (in pid=10796)
files[1] => .. (in pid=10796)
files[2] => 0 (in pid=10796)
files[3] => 1 (in pid=10796)
# stripped
files[25] => 23 (in pid=10796)

child process start
files[0] => . (in pid=10797)
files[1] => .. (in pid=10797)
files[2] => 0 (in pid=10797)
files[3] => 1 (in pid=10797)
files[4] => 2 (in pid=10797)
files[5] => 3 (in pid=10797)
child process end
```

確かに，各 `open(2)` によって開かれたfdがコピーされていない事がわかります．  

#### `O_CREAT`

ファイルを新規作成する場合にこのフラグを設定します．  
このフラグを設定せず，存在しないファイルをオープンしようとすると `-1` が返ります．  
逆に `O_CREAT` を設定して既に存在するファイルをオープンした場合には問題なくopenできます．  
この挙動を変更したい場合， `O_EXCL` フラグを使用します(後述)．  

`O_CREAT` を利用する場合，第三引数である `mode` を渡す必要が出てきます．  
`S_IRWXU` などのマクロ定数を利用できますが，8進数で `0644` などとした方が使いやすい印象．  

`O_CREAT` 単体で利用するよりは， `O_WRONLY` 等と組み合わせて使う事が多いですね．  

#### `O_DIRECTORY`

`pathname` がディレクトリでなければ失敗する，という条件を追加できるフラグです．  
`opendir(3)` の為に作られたものらしい．

#### `O_EXCL`

`open(2)` の呼び出しによってファイルが新規作成されることを保証するフラグです．  
これも実際に使ってみましょう．

```c
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

int main()
{
    const char *msg = "Drumato\n";
    int fd = open("new.txt", O_CREAT | O_EXCL, 0644);
    if (fd == -1)
    {
        fprintf(stderr, "open(2) failed\n");
        exit(1);
    }

    exit(0);
}
```

まだ存在しないファイル `new.txt` を上記フラグでopenします．  
このプログラムは一回目の実行は成功しますが，二回目の実行で失敗します．  

#### `O_PATH`

`fd` に対する操作を制限したい場合に，  
具体的には，  

- ファイルシステムツリー内の場所や存在を調べるため
- ファイルディスクリプタレベルで動作する操作を実行するため

の2つの用途に制限するフラグです．  

ファイルディスクリプタレベルとは，  
`open/close/fstat/dup/fcntl` など，  
ファイルの中身自体にアクセスしたりしなくても使用できるAPIのことです．  

#### `O_TMPFILE`

一時ファイルを作成する為のフラグです．  
このフラグを設定する場合， `pathname` には "作成する一時ファイルを含むディレクトリ"を指定します．  

#### `O_TRUNC`

通常ファイル(後述)が既に存在し，書き込み許可状態でopenされているとき，  
ファイルの長さを0に切り詰めます．  

実際に使ってみましょう．  

```c
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

int main()
{
    struct stat st;
    const char *msg = "Drumato\n";
    int fd = open("sample.txt", O_RDWR | O_TRUNC);

    if (fd == -1)
    {
        fprintf(stderr, "open(2) failed\n");
        exit(1);
    }

    if (fstat(fd, &st) == -1)
    {
        fprintf(stderr, "fstat(2) failed\n");
        exit(1);
    }

    char buf[2048];
    if (read(fd, buf, st.st_size) == -1)
    {
        fprintf(stderr, "read(2) failed\n");
        exit(1);
    }

    fprintf(stderr, "read from sample.txt: %s\n", buf);

    exit(0);
}
```

実行結果は以下のようになります．  

```text
$ cat sample.txt 
Hi! I'm Drumato.
$ gcc main.c
$ ./a.out 
read from sample.txt: 
$ cat sample.txt
```

readが行われる前に，中身が切り詰められているのがわかります．  
`O_CREAT` によるファイルの新規作成をしたいが，既にファイルが存在する場合初期化したい際に用いられます．  
`int creat(const char *pathname, mode_t mode);` は `open(pathname, O_CREAT|O_WRONLY|O_TRUNC, mode)` と等しいため，  
`creat()` を用いる際， `O_TRUNC` が暗黙的に渡されているということですね．  

## カーネルから見るopen(2)

ここからはLinuxカーネルの中身に入っていって，  
`open(2)` によってOSのどんな機能が動いているのかを理解していきましょう．  
対象となるLinuxカーネルは [v5.10.9](https://elixir.bootlin.com/linux/v5.10.9/source/kernel) です．  

### 前提知識

Linuxにおいて各ユーザプロセスはファイルディスクリプタを使ってメモリ上のマッピングにアクセスします．  
プロセスディスクリプタを表す `task_struct` 構造体には `struct files_struct *files;` というメンバがあり，  
これは **オープンファイルオブジェクト** を管理する構造体です．  
オープンファイルオブジェクトはオープンファイルディスクリプタとも，  
ファイルハンドルとも呼ばれます．  
オープンファイルディスクリプタという呼称はPOSIXで用いられるようです．  

`dup(2)` 等によってファイルディスクリプタが複製されることがありますが，  
この場合2つのファイルディスクリプタが同じオープンファイルオブジェクトを指すことになります．  

```c
/*
 * Open file table structure
 */
struct files_struct {
  /*
   * read mostly part
   */
	atomic_t count;
	bool resize_in_progress;
	wait_queue_head_t resize_wait;

	struct fdtable __rcu *fdt;
	struct fdtable fdtab;
  /*
   * written part on a separate cache line in SMP
   */
	spinlock_t file_lock ____cacheline_aligned_in_smp;
	unsigned int next_fd;
	unsigned long close_on_exec_init[1];
	unsigned long open_fds_init[1];
	unsigned long full_fds_bits_init[1];
	struct file __rcu * fd_array[NR_OPEN_DEFAULT];
};
```

このうち,`struct fdtable *fdt` を用いてオープンファイルオブジェクトにアクセスします．  
`int fd` は単にこのテーブルのインデックスでしかありません．  
例えば`read(2)` では `struct fd f = fdget_pos(fd);` のようにして `int` を `struct fd` に変換していますが，  
最終的に `rcu_dereference_raw(fdt->fd[fd]);` という関数呼び出しの中で `struct fdtable.fd` にアクセスしています．  

```c
struct fdtable {
	unsigned int max_fds;
	struct file __rcu **fd;      /* current fd array */
	unsigned long *close_on_exec;
	unsigned long *open_fds;
	unsigned long *full_fds_bits;
	struct rcu_head rcu;
};
```

`struct file __rcu **fd;` がオープンファイルオブジェクトのテーブルです．  
つまり `struct file` がオープンファイルオブジェクトの実体となります．  
大きな構造体なので，ここでは定義の紹介はしません．  
先程のサンプルで `sample.txt` を20回openしたように，  
同じファイルを複数回オープンする事はあり得るので，  
一つのファイル(inode)に対して複数のオープンファイルオブジェクトが存在する可能性があります．  

### "大まか"なコードリーディング

それでは実際に `open(2)` の中身に入っていきます．  
全ての関数を深堀りするわけではなく，あくまで大まかな理解にとどめます．  

#### 簡単なコールツリー

簡単にコールツリーを書き起こしておきました．  
私が後々本格的にコードリーディングする場合に使用するつもりで作りましたが，  
よかったら参考にしてください．  

```markdown
- `sys_open` ... `open(2)` のカーネル側エントリポイント
  - `force_o_largefile` ... プロセスの実行ドメインを検証し，必要に応じて `O_LARGEFILE` を設定
  - `do_sys_open` ... `struct open_how` の構築
    - `do_sys_openat2` ... `open(2)` の実体
      - `build_open_flags` ... より詳細なフラグの設定，検証
      - `getname` ... ユーザプロセス空間の`filename` を取得する
      - `get_unused_fd_flags` ... カレントプロセスが使用していないfdを探索して返す
      - `do_filp_open` ... `struct file` に必要な情報を突っ込んで返す
        - `path_openat` ... `do_filp_open` の本筋
          - `alloc_empty_file` ... `kmem_cache_zalloc()` で `struct file` を初期化
          - `do_open` ... ここまでの情報をもとにファイルを開く
            - `vfs_open` ... 仮想ファイルシステムに問い合わせ，実際にファイルを開く
      - `fd_install` ... 新しい `struct file` をfdtableに登録する
      - `putname` ... `kmem_cache_free` を呼んで `struct filename` を開放
```

#### `SYSCALL_DEFINE3`

システムコールの実装を追う場合，  
まずは `SYSCALL_DEFINEN` マクロ関数の呼び出しを見ると良いです．  
例えば`open(2)` であれば，[/fs/open.c#1192](https://elixir.bootlin.com/linux/v5.10.9/source/fs/open.c#L1192) にあります．  

```c
SYSCALL_DEFINE3(open, const char __user *, filename, int, flags, umode_t, mode)
{
	if (force_o_largefile())
		flags |= O_LARGEFILE;
	return do_sys_open(AT_FDCWD, filename, flags, mode);
}
```

`force_o_largefile()` マクロは，プロセスのパーソナリティを調べます．  
`PER_LINUX32` フラグが立っていなければtrueが返るという処理で，  
恐らく32bit Linuxかどうかのチェックだと思います．  

`O_LARGEFILE` フラグについては説明していませんでしたが，  
ファイルサイズが32bit幅で表せず，64bit幅を必要とする場合に設定します．  
プロセスのパーソナリティによっては，このフラグが自動で設定されるということですね．  

#### `do_sys_open()`

```c
long do_sys_open(int dfd, const char __user *filename, int flags, umode_t mode)
{
	struct open_how how = build_open_how(flags, mode);
	return do_sys_openat2(dfd, filename, &how);
}
```

`build_open_how()` 関数はその名の通り，  
`open(2)` の挙動を制御する構造体 `struct open_how` を組み立てる関数です．  
組み立てたあとは `open(2)` の実体である `do_sys_openat2()` に渡して呼び出します．  
`dfd` には `AT_FDCWD` が渡されています．  
これは， `open(2)` は `dfd` に `AT_FDCWD` を指定した `openat(2)` と実質的に同じ動作をするからです．  

#### `build_open_how()`

```c
inline struct open_how build_open_how(int flags, umode_t mode)
{
	struct open_how how = {
		.flags = flags & VALID_OPEN_FLAGS,
		.mode = mode & S_IALLUGO,
	};

	/* O_PATH beats everything else. */
	if (how.flags & O_PATH)
		how.flags &= O_PATH_FLAGS;
	/* Modes should only be set for create-like flags. */
	if (!WILL_CREATE(how.flags))
		how.mode = 0;
	return how;
}
```

`WILL_CREATE()` マクロによってファイルが作成されるかどうかのチェックが行われます．  
そうでない場合 `struct open_how.mode` は使用されません．  
`O_PATH_FLAGS` マクロは `(O_DIRECTORY | O_NOFOLLOW | O_PATH | O_CLOEXEC)` に展開されます．  
つまり， `O_PATH` フラグを渡した時点で，上記以外のフラグは全て無視されます．  

#### `do_sys_openat2()`

```c
static long do_sys_openat2(int dfd, const char __user *filename,
			   struct open_how *how)
{
	struct open_flags op;
	int fd = build_open_flags(how, &op);
	struct filename *tmp;

	if (fd)
		return fd;

	tmp = getname(filename);
	if (IS_ERR(tmp))
		return PTR_ERR(tmp);

	fd = get_unused_fd_flags(how->flags);
	if (fd >= 0) {
		struct file *f = do_filp_open(dfd, tmp, &op);
		if (IS_ERR(f)) {
			put_unused_fd(fd);
			fd = PTR_ERR(f);
		} else {
			fsnotify_open(f);
			fd_install(fd, f);
		}
	}
	putname(tmp);
	return fd;
}
```

`build_open_flags` によって，詳細なフラグの検証と設定が行われます．  
その後 `get_unused_fd_flags` で未使用のファイルディスクリプタを探索，取得します．  
実際にファイルを開くのは `do_filp_open` という手続きです．  

## まとめ

この記事では， `open(2)` システムコールについての知識を整理しました．  
カーネルのコードはすべてを紹介していませんが，  
大まかに把握することで詳細なコードリーディングをする時の助けになると思います．  

この調子でLinuxの勉強もがんばります．  

## 参考

- [open(2) — Linux manual page](https://man7.org/linux/man-pages/man2/open.2.html)
- [Man page of OPEN](https://linuxjm.osdn.jp/html/LDP_man-pages/man2/open.2.html)
- [Virtual File System](https://wiki.bit-hive.com/linuxkernelmemo/pg/Virtual%20File%20System)
- [Linux source code (v5.10.9) - Bootlin](https://elixir.bootlin.com/linux/v5.10.9/source)
