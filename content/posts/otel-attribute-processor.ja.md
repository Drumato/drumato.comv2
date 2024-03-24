---
title: "OpenTelemetry Attributes Processorを使う"
date: "2024-03-24"
lastmod: "2024-03-24"
tags: ["memo", "opentelemetry"]
---

サクッとやっていこう。
コードはここ。
<https://github.com/Drumato/blog_samples/tree/main/2024/03/otel-attribute-processor>

## 本題

以下のようなotel-collector-configを用意

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:55678"
processors:
  attributes/all:
    actions:
      - key: "value-insert"
        action: insert
        value: "fixed-value"
      - key: "value-update"
        action: update
        value: "updated-tracer-value"
      - key: "value-upsert1"
        action: upsert
        value: "fixed-upsert-value"
      - key: "value-upsert2"
        action: upsert
        value: "fixed-upsert-value"
      - pattern: "delete-pattern.*"
        action: delete
      - key: "destination"
        action: update
        from_attribute: "from-attribute-1"

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
      processors: [attributes/all, batch]
      exporters: [debug, otlp]
```

`value-update`/`value-upsert1`/`destination` はprocessorから書き換えられることを期待する。

Goプログラムは以下。

```go
package main

import (
        "context"
        "fmt"
        "os"
        "os/signal"
        "time"

        "go.opentelemetry.io/otel"
        "go.opentelemetry.io/otel/attribute"
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
                        _, span := tracer.Start(
                                ctx,
                                fmt.Sprintf("chapter1.%d", count),
                                trace.WithAttributes(
                                        attribute.KeyValue{
                                                Key:   attribute.Key("value-update"),
                                                Value: attribute.StringValue("default"),
                                        },
                                        attribute.KeyValue{
                                                Key:   attribute.Key("value-upsert1"),
                                                Value: attribute.StringValue("default"),
                                        },
                                        attribute.KeyValue{
                                                Key:   attribute.Key("delete-pattern1"),
                                                Value: attribute.StringValue("default"),
                                        },
                                        attribute.KeyValue{
                                                Key:   attribute.Key("delete-pattern2"),
                                                Value: attribute.StringValue("default"),
                                        },
                                        attribute.KeyValue{
                                                Key:   attribute.Key("destination"),
                                                Value: attribute.StringValue("default"),
                                        },
                                        attribute.KeyValue{
                                                Key:   attribute.Key("from-attribute-1"),
                                                Value: attribute.StringValue("DRUMATO"),
                                        },
                                ),
                        )
                        span.End()

                        count++
                        time.Sleep(1 * time.Second)
                }
        }
}

func newResource() *resource.Resource {
        return resource.NewWithAttributes(
                semconv.SchemaURL,
                semconv.ServiceName("chapter1-main"),
        )
}
```

![](/images/attr-proc1.png)

良さそう。

## 次回

そろそろ趣味で作っているカスタムコントローラが最小のデモを動かせるようになりそうなので、
次回はそれについて紹介する予定。

## 参考文献

- <https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/attributesprocessor>
