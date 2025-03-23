---
title: "Weekly Code Reading2: samber/loのChannelDispatcherを読む"
date: "2025-03-16"
lastmod: "2025-03-16"
tags: ["weekly-code-reading","go"]
---

第2回です｡

## 読む対象

前回Rustの `std::collections::BTreeMap` を読むと言ったのですが､
完全に忘れていて､短い時間で読むには明らかに実装が大きいので､
今回は [samber/lo](https://github.com/samber/lo) を読むことにします｡

最近Xでも話題に上がっていたりと､Hotなライブラリだと思っています｡
といっても､ちょろっと眺めてみたところ実装はとてもシンプルで素朴であり､
とても読みやすいものだったので､今回は特にGo channel周りの実装にフォーカスしてみることにします｡
今回は､ `ChannelDispatcher` という関数を読んでみます｡

本記事では `samber/lo` ライブラリのバージョン 1.49.1 を対象にします｡
コピーライトは適宜コードスニペットの先頭に掲載します｡

本記事には、samber/loのコードの引用や解説が含まれています。これらのコードスニペットはMIT Licenseの下で使用されており､権利はSamuel Bertheに帰属します。

詳細については、以下をご参照ください｡

<https://github.com/samber/lo/blob/master/LICENSE>

## 目的

今回は仕組みを理解したいというモチベーションもありますが､
個人的にsamber/loを使って趣味開発していきたいと考えているため､
使うものはよく知ろう､の精神で読んでみたくなった､というのが本音です｡

- samber/lo の`ChannelDispatcher`関数を読み､samber/loを理解して使えるようにする

---

## 本題

<https://github.com/samber/lo/blob/v1.49.1/channel.go#L13-L41>

```go
// Copyright (c) 2022-2025 Samuel Berthe

// ChannelDispatcher distributes messages from input channels into N child channels.
// Close events are propagated to children.
// Underlying channels can have a fixed buffer capacity or be unbuffered when cap is 0.
func ChannelDispatcher[T any](stream <-chan T, count int, channelBufferCap int, strategy DispatchingStrategy[T]) []<-chan T {
	children := createChannels[T](count, channelBufferCap)

	roChildren := channelsToReadOnly(children)

	go func() {
		// propagate channel closing to children
		defer closeChannels(children)

		var i uint64 = 0

		for {
			msg, ok := <-stream
			if !ok {
				return
			}

			destination := strategy(msg, i, roChildren) % count
			children[destination] <- msg

			i++
		}
	}()

	return roChildren
}
```

あるinput channelから､N個のchild channelに分配する関数です｡
`createChannels()` でchild channelsを作成し､
`<-stream` で受け取ったメッセージを､ `DispatchingStrategy[T]` に従っていずれかのchild channelに分配します｡

これを理解するためには､まずこの関数内部で使われている `DispatchingStrategy[T]` というものを理解する必要があります｡

<https://github.com/samber/lo/blob/v1.49.1/channel.go#L11>

```go
// Copyright (c) 2022-2025 Samuel Berthe
type DispatchingStrategy[T any] func(msg T, index uint64, channels []<-chan T) int
```

child channelに対しどのように分配するかのポリシーが満たすインタフェースです｡
`msg` にはinput channelから取り出されたメッセージが入ります｡
`index` には､ `ChannelDispatcher()` で回るループの回数が入ります(例えば3回目なら `i=2` となります)｡

`channels` には､ `createChannels()` で作成されたchild channelが入ります｡
これは後ほど見ていきます｡

実際にいくつかのポリシーが定義され､使えるようになっています｡
その実装を見ていきましょう｡

<https://github.com/samber/lo/blob/v1.49.1/channel.go#L73-L154>

```go
// Copyright (c) 2022-2025 Samuel Berthe

// DispatchingStrategyRoundRobin distributes messages in a rotating sequential manner.
// If the channel capacity is exceeded, the next channel will be selected and so on.
func DispatchingStrategyRoundRobin[T any](msg T, index uint64, channels []<-chan T) int {
	for {
		i := int(index % uint64(len(channels)))
		if channelIsNotFull(channels[i]) {
			return i
		}

		index++
		time.Sleep(10 * time.Microsecond) // prevent CPU from burning 🔥
	}
}

// DispatchingStrategyRandom distributes messages in a random manner.
// If the channel capacity is exceeded, another random channel will be selected and so on.
func DispatchingStrategyRandom[T any](msg T, index uint64, channels []<-chan T) int {
	for {
		i := rand.IntN(len(channels))
		if channelIsNotFull(channels[i]) {
			return i
		}

		time.Sleep(10 * time.Microsecond) // prevent CPU from burning 🔥
	}
}

// DispatchingStrategyWeightedRandom distributes messages in a weighted manner.
// If the channel capacity is exceeded, another random channel will be selected and so on.
func DispatchingStrategyWeightedRandom[T any](weights []int) DispatchingStrategy[T] {
	seq := []int{}

	for i := 0; i < len(weights); i++ {
		for j := 0; j < weights[i]; j++ {
			seq = append(seq, i)
		}
	}

	return func(msg T, index uint64, channels []<-chan T) int {
		for {
			i := seq[rand.IntN(len(seq))]
			if channelIsNotFull(channels[i]) {
				return i
			}

			time.Sleep(10 * time.Microsecond) // prevent CPU from burning 🔥
		}
	}
}

// DispatchingStrategyFirst distributes messages in the first non-full channel.
// If the capacity of the first channel is exceeded, the second channel will be selected and so on.
func DispatchingStrategyFirst[T any](msg T, index uint64, channels []<-chan T) int {
	for {
		for i := range channels {
			if channelIsNotFull(channels[i]) {
				return i
			}
		}

		time.Sleep(10 * time.Microsecond) // prevent CPU from burning 🔥
	}
}

// DispatchingStrategyLeast distributes messages in the emptiest channel.
func DispatchingStrategyLeast[T any](msg T, index uint64, channels []<-chan T) int {
	seq := Range(len(channels))

	return MinBy(seq, func(item int, min int) bool {
		return len(channels[item]) < len(channels[min])
	})
}

// DispatchingStrategyMost distributes messages in the fullest channel.
// If the channel capacity is exceeded, the next channel will be selected and so on.
func DispatchingStrategyMost[T any](msg T, index uint64, channels []<-chan T) int {
	seq := Range(len(channels))

	return MaxBy(seq, func(item int, max int) bool {
		return len(channels[item]) > len(channels[max]) && channelIsNotFull(channels[item])
	})
}
```

- `DispatchingStrategyRoundRobin` : ラウンドロビンで分配
    - 内部でループし､  `index % len(channels)` でchannelを選択
    - そのchannelがfullでない場合はそのchannelに分配
- `DispatchingStrategyRandom` : ランダムで分配
- `DispatchingStrategyWeightedRandom` : 重み付きランダムで分配
    - 重みはポリシーを初期化する際に指定
    - 詳細な実装としては､ `seq` に `[<channel index>] * <weight>` な配列を詰めていく
      - 例えば､ `[1, 2, 3]` という重みが指定された場合､ `seq` に `[0, 1, 1, 2, 2, 2]` が詰まる
    - その後､ `seq` からランダムに一つ取り出し､そのchannel indexが示すchannelに分配
- `DispatchingStrategyFirst` : 最初に見つかった空きchannelに分配
    - `RoundRobin` が剰余で先頭を決定してループしていたのに対し､常に先頭から優先する
- `DispatchingStrategyLeast` : 最も空きが多いchannelに分配
- `DispatchingStrategyMost` : 最も空きが少ないchannelに分配

## まとめ

とても短い記事になってしまいました｡
かなり素朴に作られているので､ライブラリが保守されなくなった場合でも､自分で同様の独自ライブラリを実装することができると思います｡

余談ですが､内部で使われている `Range()` や`MaxBy/MinBy` もそれぞれ定義されて使えるようになっています｡
中には `If/Else` というものもあり､Goで `if-else` を式として扱える機能が実装されていました｡
とはいえ､Goの一般的なコーディングスタイルから離れてしまうものではあるので､業務で書くコードに採用するかは検討したいですね｡
個人の趣味開発としては最高にほしかったものなので､ガンガン使っていこうかなと思います｡

次回はこの調子で､ [samber/mo](https://github.com/samber/mo) を読んでみたいと思います｡
