---
title: "OpenTelemetryのGo手動計装1-Go SDKについてまとめる-"
date: "2024-03-08"
lastmod: "2024-03-08"
tags: ["memo", "opentelemetry"]
---

# OpenTelemetryのGo手動計装1-SDKについてまとめる-

最近アウトプットが滞っていて、このままアウトプットのハードルが上がり続けるのは良くないと思っていた。
せっかく個人ブログという自由な遊び場を持っているので、気ままに技術メモを残していくことにする。
このようなメモには `memo` というタグをつける。

転職してからというものOpenTelemetryのことばかりやっているから、一度基礎から整理してみる。しばらくGoでのOpenTelemetry手動計装についてまとめる予定。
とはいえ、Otelについての詳細をぽろぽろ説明するわけではなく、あくまで備忘録として。

今回は、手動計装時に利用することになるOpenTelemetry SDKについて、その使い方や構成をまとめる。

<https://opentelemetry.io/docs/languages/go/>

## 本題

いきなり各パッケージの説明を見てもイメージが湧きづらいから、まずは適当にひな形をつくる。

```go

```

## 参考文献

- <https://opentelemetry.io/docs/languages/go/>
- <https://pkg.go.dev/go.opentelemetry.io/otel>
- <https://github.com/open-telemetry/opentelemetry-go-contrib>