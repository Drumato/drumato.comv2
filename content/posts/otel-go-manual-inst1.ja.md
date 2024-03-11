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

コードは以下に。

<https://github.com/Drumato/otel-go-manual-instrumentation-playground>

## 本題

いきなり各パッケージの説明を見てもイメージが湧きづらいから、まずは適当にひな形をつくる。

```go
package main

import (
        "context"
        "fmt"
        "os"
        "os/signal"
        "time"

        "go.opentelemetry.io/otel"
        "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
        "go.opentelemetry.io/otel/propagation"
        "go.opentelemetry.io/otel/sdk/resource"
        sdktrace "go.opentelemetry.io/otel/sdk/trace"
        semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
        "go.opentelemetry.io/otel/trace"
)

func main() {
        ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
        defer stop()

        exporter, err := otlptracegrpc.New(ctx)
        if err != nil {
                panic(err)
        }

        tp := sdktrace.NewTracerProvider(
                sdktrace.WithResource(newResource()),
                sdktrace.WithSyncer(exporter),
        )
        defer tp.Shutdown(ctx)
        otel.SetTracerProvider(tp)
        otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(propagation.TraceContext{}, propagation.Baggage{}))

        tracer := otel.Tracer("chapter1")

        count := 0
loop:
        for {
                select {
                case <-ctx.Done():
                        break loop
                default:
                        ctx, span := tracer.Start(ctx, fmt.Sprintf("chapter1.%d", count))
                        f1(ctx, tracer, count)
                        span.End()

                        count++
                        time.Sleep(1 * time.Second)
                }
        }
}

func f1(ctx context.Context, tracer trace.Tracer, count int) {
        ctx, span := tracer.Start(ctx, fmt.Sprintf("chapter1.%d.f1", count))
        defer span.End()

        time.Sleep(1 * time.Second)
}

func newResource() *resource.Resource {
        return resource.NewWithAttributes(
                semconv.SchemaURL,
                semconv.ServiceName("chapter1-main"),
        )
}
```

適当に以下のようなdocker-compose.yamlを用意して、トレースを見てみる。

```yaml
version: "3"

services:
  jaeger:
    image: "jaegertracing/all-in-one:latest"
    network_mode: "host"
    ports:
      - "16686:16686"
      - "14268"
      - "14250"
      - "4317"
    environment:
      - COLLECTOR_OTLP_ENABLED=true
```

```shell
$ docker compose up -d --build
<略>
$ OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="http://localhost:4317" go run main.go
```

![](/images/otel1.png)

だいたい想定通りの結果になった。
次のセクションから、上のコードについて一つひとつ実装ベースで理解していく。

### OpenTelemetry Go SDKを読む

とはいっても、APIは非常に多岐にわたるので、一つ一つ徹底的に読んでいくわけではない。
<https://github.com/open-telemetry/opentelemetry-go/releases/tag/v1.24.0> が読む対象。

```go
// Tracer creates a named tracer that implements Tracer interface.
// If the name is an empty string then provider uses default name.
//
// This is short for GetTracerProvider().Tracer(name, opts...)
func Tracer(name string, opts ...trace.TracerOption) trace.Tracer {
	return GetTracerProvider().Tracer(name, opts...)
}
```

`otel.Tracer()` としてtracerを初期化したコード。
`GetTracerProvider()` を含むいくつかのAPIは <https://github.com/open-telemetry/opentelemetry-go/tree/v1.24.0/internal/global> でグローバルに定義されている。

> <https://github.com/open-telemetry/opentelemetry-go/blob/e6e186bfa485f679e35bb775cba63ca24029590d/trace.go#L22-L28> より

```go
type compositeTextMapPropagator []TextMapPropagator

func (p compositeTextMapPropagator) Inject(ctx context.Context, carrier TextMapCarrier) {
	for _, i := range p {
		i.Inject(ctx, carrier)
	}
}

func (p compositeTextMapPropagator) Extract(ctx context.Context, carrier TextMapCarrier) context.Context {
	for _, i := range p {
		ctx = i.Extract(ctx, carrier)
	}
	return ctx
}

func (p compositeTextMapPropagator) Fields() []string {
	unique := make(map[string]struct{})
	for _, i := range p {
		for _, k := range i.Fields() {
			unique[k] = struct{}{}
		}
	}

	fields := make([]string, 0, len(unique))
	for k := range unique {
		fields = append(fields, k)
	}
	return fields
}
```

`NewCompositeTextMapPropagator()` の内部実装。とてもシンプル。

> <https://github.com/open-telemetry/opentelemetry-go/blob/e6e186bfa485f679e35bb775cba63ca24029590d/propagation/propagation.go#L113-L141> より

先程のサンプルでは `Baggage` と `TraceContext` を指定したが、これらはW3Cで定義されている。
フォーマットがABNFで定義されているのは勉強になった。

<https://www.w3.org/TR/baggage/>  
<https://www.w3.org/TR/trace-context/>  

せっかくなのでコードを書き換えて中身を見てみたいところだが、今回は分散トレーシングの例ではないし、インターセプタを導入していないので次回以降に持ち越し。

```go
// NewTracerProvider returns a new and configured TracerProvider.
//
// By default the returned TracerProvider is configured with:
//   - a ParentBased(AlwaysSample) Sampler
//   - a random number IDGenerator
//   - the resource.Default() Resource
//   - the default SpanLimits.
//
// The passed opts are used to override these default values and configure the
// returned TracerProvider appropriately.
func NewTracerProvider(opts ...TracerProviderOption) *TracerProvider {
	o := tracerProviderConfig{
		spanLimits: NewSpanLimits(),
	}
	o = applyTracerProviderEnvConfigs(o)

	for _, opt := range opts {
		o = opt.apply(o)
	}

	o = ensureValidTracerProviderConfig(o)

	tp := &TracerProvider{
		namedTracer: make(map[instrumentation.Scope]*tracer),
		sampler:     o.sampler,
		idGenerator: o.idGenerator,
		spanLimits:  o.spanLimits,
		resource:    o.resource,
	}
	global.Info("TracerProvider created", "config", o)

	spss := make(spanProcessorStates, 0, len(o.processors))
	for _, sp := range o.processors {
		spss = append(spss, newSpanProcessorState(sp))
	}
	tp.spanProcessors.Store(&spss)

	return tp
}
```

> <https://github.com/open-telemetry/opentelemetry-go/blob/e6e186bfa485f679e35bb775cba63ca24029590d/sdk/trace/provider.go#L96-L134> より

`otel/trace` の `TracerProvider` および `Tracer` はinterfaceとなっているが、
サンプルコードでは `sdktrace.TracerProvider` および `sdktrace.tracer` を間接的に利用している。

## 次回

シンプルなケースはここらへんにして、
分散トレーシングのサンプルとコードリーディングを進めていく。

## 参考文献

- <https://opentelemetry.io/docs/languages/go/>
- <https://pkg.go.dev/go.opentelemetry.io/otel>
- <https://github.com/open-telemetry/opentelemetry-go-contrib>