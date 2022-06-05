---
title: "Go Parser Combinator with Go Generics"
description: ""
createdAt: "2022-04-10"
tags: ["go", "parser"]
categories: ["go"]
aliases: []
series: []
author: "Drumato"
---

Maybe this post will be old cuz I'm developing peachcomb actively!

This post introduces a Go parser-library that is being developed by me, called **peachcomb** .
this library is aimed to reduce overhead with dynamically dispatching, and notify mismatching among parsers.
To achieve them, I use Go Generics in peachcomb.
[Go Generics was released in Go 1.18](https://go.dev/doc/go1.18).

<https://github.com/Drumato/peachcomb>  
<https://pkg.go.dev/github.com/Drumato/peachcomb>

This post won't describe the detail of Go Generics.
I'll recommend you this tutorial to understand Go Generics briefly.

<https://go.dev/doc/tutorial/generics>

---

## Sample

To use peachcomb, You should follow just 2-steps.
**Initialization** and **Calling it**.
Before describing in detail, I'll show you the simplest sample to understand peachcomb's usage.
The below sample parses numbers that they're separated by `|`.

<https://go.dev/play/p/qIbzx_IWxbr>

```go
package main

import (
	"github.com/Drumato/peachcomb/pkg/strparse"
	"github.com/Drumato/peachcomb/pkg/combinator"
)

func main() {
	element := strparse.Digit1()
	separator := strparse.Rune('|')
	p := combinator.Separated1(element, separator)
	i, o, err := p([]rune("123|456|789Drumato"))
	fmt.Println(i)
	fmt.Printf("%s\n", o)
	fmt.Println(err)
}
```

```shell
$ go run main.go
Drumato
[123 456 789]
<nil>
```

`i` is the rest input that parser `p` consumed.
`o` is the `p` 's output.
In this case, `o` forms like `[]string{"123", "456", "789"}`.
It's just all of the `peachcomb`'s usage.

## Internals

I strongly refered [Geal/nom](https://github.com/Geal/nom), that is a parser library in Rust.
**Nom achieves to construct fast/generic parsers by constrainting trait bounds**.

### Parser Signature

First of all, all parsers in peachcomb implements one signature, `type Parser[E comparable, O parser.ParseOutput]` .
It's defined such as below.

```go
type Parser[E comparable, O ParseOutput] func(input ParseInput[E]) (ParseInput[E], O, ParseError)

type ParseInput[E comparable] []E

type ParseOutput interface{}

type ParseError interface {
	error
}
```

I think there are some merits caused by designing `Parser` signature.
First, if users want to use a certain parser but peachcomb doesn't suppport it,
users can implement in their project, and pass them into generalized function in `package combinator` (e.g. `Map()`).
Second, almost parsers can be implemented generically.
We don't need to prepare almost parsers by each input type.
Last, users only needs to know the interface. **Initialization and Calling**.

### Type Resolving

Now let's see the type resolving among peachcomb's parsers.
The playable sample code is placed in Go Playground.

<https://go.dev/play/p/oiZCn732MOh>

```go
package main

import (
	"fmt"

	"github.com/Drumato/peachcomb/pkg/combinator"
	"github.com/Drumato/peachcomb/pkg/parser"
	"github.com/Drumato/peachcomb/pkg/strparse"
)

func main() {
	var element parser.Parser[rune, string] = strparse.Digit1()
	var separator parser.Parser[rune, rune] = strparse.Rune('|')
	var p parser.Parser[rune, []string] = combinator.Separated1(element, separator)

	var i []rune
	var o []string
	var err error
	i, o, err = p([]rune("123|456|789Drumato"))

	fmt.Println(string(i))
	fmt.Printf("%d\n", len(o))
	fmt.Printf("%s %s %s\n", o[0], o[1], o[2])
	fmt.Println(err)
}
```

- `element` ... A parser that receives `[]rune` and returns `string`
- `separator` ... A parser that receives `[]rune` and returns `rune`
- `p` ... A parser that receives `[]rune` and returns `[]string`

the actual function signatures are like this.

```go
func Digit1() parser.Parser[rune, string]
func Rune(expected rune) parser.Parser[rune, rune]
func Separated1[
    E comparable, 
    EO parser.ParseOutput, 
    SO parser.ParseOutput,
](
    element parser.Parser[E, EO], 
    separator parser.Parser[E, SO]) parser.Parser[E, []EO]
```

`Separated1()`'s type parameters will be resolved to ...

- `E` ... `rune`
- `EO` ... `string`
- `SO` ... `rune`

So finally we know `p` implements `parser.Parser[rune, []string]` at compiliation time.

---

Next example shows us the peachcomb's constraints.

<https://go.dev/play/p/J0pRsPk4_Pf>

```go
package main

import (
	"fmt"

	"github.com/Drumato/peachcomb/pkg/byteparse"
	"github.com/Drumato/peachcomb/pkg/combinator"
)

func main() {
	sub := byteparse.UInt8()
	p := combinator.Many1(sub)
	i, o, err := p([]rune("aaaabaa"))

	fmt.Println(string(i))
	fmt.Println(string(o))
	fmt.Println(err)
}
```

parsers in the sample will be resolved to...

- `sub` ... `parser.Parser[byte, uint8]`
- `p` ... `parser.Parser[byte, []uint8]`

As you know in Playground, this sample will be failed to compile.
the actual error message is below.

```text
./prog.go:13:23: cannot use []rune("aaaabaa") (value of type []rune) as type parser.ParseInput[byte] in argument to p
```

the above sample mismatched btw the actual input and the expected input.
peachcomb can also detect inconsistencies among parsers.

<https://go.dev/play/p/bmPc3n7k5Jq>

```go
package main

import (
	"fmt"

	"github.com/Drumato/peachcomb/pkg/combinator"
	"github.com/Drumato/peachcomb/pkg/strparse"
)

func main() {
	sub := strparse.Digit1()
	p := combinator.Map(sub, func(v byte) (bool, error) { return v == 0, nil })
	i, o, err := p([]byte("11112222abc"))

	fmt.Println(string(i))
	fmt.Println(o)
	fmt.Println(err)
}
```

the actual error message is below.

```text
./prog.go:12:27: type func(v byte) (bool, error) of func(v byte) (bool, error) {…} does not match inferred type func(string) (O, error) for func(SO) (O, error)
```

- `sub` ... `parser.Parser[rune, string]`
- `p` ... `parser.Parser[rune, bool]`
  - in brief, `Map()` forms like `Map[E, SO, O](sub Parser[E, SO], fn SO -> (O, error))`

in this sample, `p` has `E: rune, SO: string` type parameters so `p` requires `func (v string) -> (O, error)` as the 2nd argument，
but the actual argument forms `func(v byte) -> (bool, error)`.

### Custom Input Types

Almost parsers can receive any custom input types to parse.
If you want to know this mechanism in detail, please read the below example.

<https://github.com/Drumato/peachcomb/blob/v0.2.0/examples/custominput/main.go>

---

## Conclusion

Today I described you a Go parser library called peachcomb.
If you're interested in the project, pleace use this and send me feedbacks!
