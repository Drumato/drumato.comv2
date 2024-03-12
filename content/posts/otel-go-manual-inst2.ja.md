---
title: "OpenTelemetryのGo手動計装2-HTTP server/clientで分散トレーシングしてみる-"
date: "2024-03-12"
lastmod: "2024-03-12"
tags: ["memo", "opentelemetry"]
---

# OpenTelemetryのGo手動計装2-HTTP server/clientで分散トレーシングしてみる-

<https://www.drumato.com/ja/posts/otel-go-manual-inst1/> の続き。
前回はシンプルなトレーシングだったので、今回はclient/server間のトレースを取ってみる。

そして、それを実現するためのSDK側の実装を見てみる。  
<https://opentelemetry.io/docs/languages/go/>

コードは以下に。

<https://github.com/Drumato/otel-go-manual-instrumentation-playground>

## 本題

前回はotel-collectorを入れていなかったけど、今回から入れてみた。

```yaml
version: "3"

services:
  opentelemetry-collector-contrib:
    image: "otel/opentelemetry-collector-contrib:latest"
    ports:
      - "55678:55678"
    volumes:
      - "./otel-collector-config.yaml:/etc/otel/config.yaml"
    depends_on:
      - jaeger
    command: ["--config=/etc/otel/config.yaml"]
  jaeger:
    image: "jaegertracing/all-in-one:latest"
    ports:
      - "16686:16686"
      - "14268"
      - "14250"
      - "4317"
    environment:
      - COLLECTOR_OTLP_ENABLED=true
```

`otel-collector-config.yaml` は適当に以下のような感じで。

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:55678"
processors:
  batch:
    send_batch_size: 1
    send_batch_max_size: 1

exporters:
  debug:
  otlp:
    endpoint: "jaeger:4317"
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [debug, otlp]
```

server側の実装は以下。 `otelhttp.NewHandler()` でラップするだけで良い。

```go
package main

import (
        "context"
        "fmt"
        "log"
        "net/http"
        "os"
        "os/signal"
        "time"

        "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
        "go.opentelemetry.io/otel"
        "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
        "go.opentelemetry.io/otel/propagation"
        "go.opentelemetry.io/otel/sdk/resource"
        sdktrace "go.opentelemetry.io/otel/sdk/trace"
        semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
)

func indexHandler(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("Hello, World!"))
}

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
        mux := http.NewServeMux()
        mux.HandleFunc("/", indexHandler)

        server := &http.Server{
                Addr:         ":8080",
                Handler:      otelhttp.NewHandler(mux, "chapter2-server"),
                ReadTimeout:  5 * time.Second,
                WriteTimeout: 10 * time.Second,
        }

        go func() {
                fmt.Println("Server is running on port 8080...")
                if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
                        log.Fatalf("Server error: %v", err)
                }
        }()

        <-ctx.Done()
        if err := server.Shutdown(ctx); err != nil {
                log.Fatalf("Server shutdown failed: %v", err)
        }
}

func newResource() *resource.Resource {
        return resource.NewWithAttributes(
                semconv.SchemaURL,
                semconv.ServiceName("chapter2-server"),
        )
}
```

client側も `otelhttp.NewTransport()` でラップした `http.Client` を使うだけで良い。

```go
package main

import (
        "context"
        "fmt"
        "net/http"
        "os"
        "os/signal"
        "time"

        "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
        "go.opentelemetry.io/otel"
        "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
        "go.opentelemetry.io/otel/propagation"
        "go.opentelemetry.io/otel/sdk/resource"
        sdktrace "go.opentelemetry.io/otel/sdk/trace"
        semconv "go.opentelemetry.io/otel/semconv/v1.17.0"
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

loop:
        for {
                select {
                case <-ctx.Done():
                        break loop
                default:
                        client := http.Client{
                                Transport: otelhttp.NewTransport(http.DefaultTransport),
                        }
                        req, err := http.NewRequestWithContext(ctx, http.MethodGet, "http://localhost:8080/", nil)
                        if err != nil {
                                fmt.Printf("failed to create request: %v\n", err)
                                continue
                        }

                        resp, err := client.Do(req)
                        if err != nil {
                                fmt.Printf("request failed: %v\n", err)
                                continue
                        }
                        defer resp.Body.Close()

                        if resp.StatusCode != http.StatusOK {
                                fmt.Printf("got status: %v\n", resp.Status)
                                continue
                        }

                        fmt.Printf("%v\n", resp.Status)
                        time.Sleep(1 * time.Second)
                }
        }
}

func newResource() *resource.Resource {
        return resource.NewWithAttributes(
                semconv.SchemaURL,
                semconv.ServiceName("chapter2-client"),
        )
}
```

```shell
$ docker compose up
$ OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="http://localhost:55678" go run ./server/main.go # tmux 別ペイン1
$ OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="http://localhost:55678" go run ./client/main.go # tmux 別ペイン2
```

jaegerを見ると、いい感じに親子のspanができあがっていた。ナイス。

![](/images/otel2.png)

注意点として、serverがすぐにspanを生成して送ったあとに、clientが遅れてspanを送るタイミングでjaegerを開くと、
serverは｢リクエストに含まれる `traceparent` ヘッダをもとにparent span idを埋め込んだspan｣を送るものの、
jaeger側で該当のspanが見つからない、みたいなことになってwarningが出る。

## コード読む

前回設定した `TextMapPropagator` が活躍していそうなので、コードを読んでいく。

### `TextMapPropagator`

```go
// TextMapPropagator propagates cross-cutting concerns as key-value text
// pairs within a carrier that travels in-band across process boundaries.
type TextMapPropagator interface {
	// DO NOT CHANGE: any modification will not be backwards compatible and
	// must never be done outside of a new major release.

	// Inject set cross-cutting concerns from the Context into the carrier.
	Inject(ctx context.Context, carrier TextMapCarrier)
	// DO NOT CHANGE: any modification will not be backwards compatible and
	// must never be done outside of a new major release.

	// Extract reads cross-cutting concerns from the carrier into a Context.
	Extract(ctx context.Context, carrier TextMapCarrier) context.Context
	// DO NOT CHANGE: any modification will not be backwards compatible and
	// must never be done outside of a new major release.

	// Fields returns the keys whose values are set with Inject.
	Fields() []string
	// DO NOT CHANGE: any modification will not be backwards compatible and
	// must never be done outside of a new major release.
}
```

> <https://github.com/open-telemetry/opentelemetry-go/blob/e6e186bfa485f679e35bb775cba63ca24029590d/propagation/propagation.go#L91-L111> より

`NewCompositeTextMapPropagator()` によって `compositeTextMapPropagator` が作られるが、これは単に `[]TextMapPropagator` として宣言されている。
このインタフェースが `Extract` によってcarrierからotel contextを引っ張って `context.Context` に詰めたり、
`Inject` で逆に `context.Context` に格納されたotel contextをcarrierに詰めたりする。

具体的な実装として、 `TraceContext` を見てみよう。

### `TraceContext`

```go
// Inject set tracecontext from the Context into the carrier.
func (tc TraceContext) Inject(ctx context.Context, carrier TextMapCarrier) {
	sc := trace.SpanContextFromContext(ctx)
	if !sc.IsValid() {
		return
	}

	if ts := sc.TraceState().String(); ts != "" {
		carrier.Set(tracestateHeader, ts)
	}

	// Clear all flags other than the trace-context supported sampling bit.
	flags := sc.TraceFlags() & trace.FlagsSampled

	var sb strings.Builder
	sb.Grow(2 + 32 + 16 + 2 + 3)
	_, _ = sb.WriteString(versionPart)
	traceID := sc.TraceID()
	spanID := sc.SpanID()
	flagByte := [1]byte{byte(flags)}
	var buf [32]byte
	for _, src := range [][]byte{traceID[:], spanID[:], flagByte[:]} {
		_ = sb.WriteByte(delimiter[0])
		n := hex.Encode(buf[:], src)
		_, _ = sb.Write(buf[:n])
	}
	carrier.Set(traceparentHeader, sb.String())
}

// Extract reads tracecontext from the carrier into a returned Context.
//
// The returned Context will be a copy of ctx and contain the extracted
// tracecontext as the remote SpanContext. If the extracted tracecontext is
// invalid, the passed ctx will be returned directly instead.
func (tc TraceContext) Extract(ctx context.Context, carrier TextMapCarrier) context.Context {
	sc := tc.extract(carrier)
	if !sc.IsValid() {
		return ctx
	}
	return trace.ContextWithRemoteSpanContext(ctx, sc)
}

func (tc TraceContext) extract(carrier TextMapCarrier) trace.SpanContext {
	h := carrier.Get(traceparentHeader)
	if h == "" {
		return trace.SpanContext{}
	}

	var ver [1]byte
	if !extractPart(ver[:], &h, 2) {
		return trace.SpanContext{}
	}
	version := int(ver[0])
	if version > maxVersion {
		return trace.SpanContext{}
	}

	var scc trace.SpanContextConfig
	if !extractPart(scc.TraceID[:], &h, 32) {
		return trace.SpanContext{}
	}
	if !extractPart(scc.SpanID[:], &h, 16) {
		return trace.SpanContext{}
	}

	var opts [1]byte
	if !extractPart(opts[:], &h, 2) {
		return trace.SpanContext{}
	}
	if version == 0 && (h != "" || opts[0] > 2) {
		// version 0 not allow extra
		// version 0 not allow other flag
		return trace.SpanContext{}
	}

	// Clear all flags other than the trace-context supported sampling bit.
	scc.TraceFlags = trace.TraceFlags(opts[0]) & trace.FlagsSampled

	// Ignore the error returned here. Failure to parse tracestate MUST NOT
	// affect the parsing of traceparent according to the W3C tracecontext
	// specification.
	scc.TraceState, _ = trace.ParseTraceState(carrier.Get(tracestateHeader))
	scc.Remote = true

	sc := trace.NewSpanContext(scc)
	if !sc.IsValid() {
		return trace.SpanContext{}
	}

	return sc
}
```

> <https://github.com/open-telemetry/opentelemetry-go/blob/e6e186bfa485f679e35bb775cba63ca24029590d/propagation/trace_context.go#L49-L139> より

長めに貼ったけど、やっていることは以下の通り。

- `Inject()`
  - `context.Context` から [`trace.SpanContext`](https://github.com/open-telemetry/opentelemetry-go/blob/9a515ceb749ea347aaa1522a4ac581e5ac3b2b69/trace/trace.go#L198) を抜き出して、 W3C Trace Contextのフォーマットに沿って情報を書き込んで `traceparent` キーで値を格納
- `Extract()`
  - `traceparent/tracestate` の値を取ってきて、適宜バリデーションしつつ `trace.SpanContext` を作り、リモートからSpanが渡されてることを前提に `context.Context` に値を詰める

ということで、次はCarrier.

### `HeaderCarrier`

[`otelhttp.NewHandler()`](https://github.com/open-telemetry/opentelemetry-go-contrib/blob/f3ba8c2d8932aa24685483404167211719c7d34d/instrumentation/net/http/otelhttp/handler.go#L47-L51)を掘っていくと、最終的にExtract/Injectで `http.Request` のヘッダをもとに `propagation.HeaderCarrier` を作ってことがわかるので、それを見てみる。とは言っても、 `map[string][]string` なので大したことはしていない。

```go
// HeaderCarrier adapts http.Header to satisfy the TextMapCarrier interface.
type HeaderCarrier http.Header

// Get returns the value associated with the passed key.
func (hc HeaderCarrier) Get(key string) string {
	return http.Header(hc).Get(key)
}

// Set stores the key-value pair.
func (hc HeaderCarrier) Set(key string, value string) {
	http.Header(hc).Set(key, value)
}

// Keys lists the keys stored in this carrier.
func (hc HeaderCarrier) Keys() []string {
	keys := make([]string, 0, len(hc))
	for k := range hc {
		keys = append(keys, k)
	}
	return keys
}
```

> <https://github.com/open-telemetry/opentelemetry-go/blob/9a515ceb749ea347aaa1522a4ac581e5ac3b2b69/propagation/propagation.go#L58-L78> より

良さそう。

## 次回

基本的なユースケースについてはだいぶわかってきた。
次回はメトリクスAPIを使ってみることにする。

## 参考文献

- <https://opentelemetry.io/docs/languages/go/>
- <https://pkg.go.dev/go.opentelemetry.io/otel>