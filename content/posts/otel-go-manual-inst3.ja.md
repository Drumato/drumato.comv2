---
title: "OpenTelemetryのGo手動計装3-Metrics APIを触ってみる-"
date: "2024-03-13"
lastmod: "2024-03-13"
tags: ["memo", "opentelemetry"]
---

- <https://www.drumato.com/ja/posts/otel-go-manual-inst1/>
- <https://www.drumato.com/ja/posts/otel-go-manual-inst2/>
 
の続き。
otel SDKでメトリクスを送信してみる。
<https://opentelemetry.io/docs/languages/go/>

コードは以下に。

<https://github.com/Drumato/otel-go-manual-instrumentation-playground>

## 本題

公式のexample等を参考に、counter metricを使ってみる。

```go
package main

import (
        "context"
        "log/slog"
        "os"
        "os/signal"
        "time"

        "go.opentelemetry.io/otel"
        "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
        "go.opentelemetry.io/otel/metric"
        sdkmetric "go.opentelemetry.io/otel/sdk/metric"
        "go.opentelemetry.io/otel/sdk/resource"
        semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

var meter = otel.Meter("chapter3-meter")

type MetricRegistry struct {
        F1Counter metric.Int64Counter
}

func main() {
        ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
        defer stop()

        logger := slog.New(slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug}))
        res, err := newResource()
        if err != nil {
                panic(err)
        }

        meterProvider, err := newMeterProvider(ctx, res)
        if err != nil {
                panic(err)
        }

        defer func(ctx context.Context) {
                if err := meterProvider.Shutdown(ctx); err != nil {
                        logger.ErrorContext(ctx, "failed to shutdown meter provider", "error", err)
                }
        }(ctx)

        otel.SetMeterProvider(meterProvider)

        f1Counter, err := meter.Int64Counter("f1.counter")
        if err != nil {
                panic(err)
        }

        reg := MetricRegistry{
                F1Counter: f1Counter,
        }

        ticker := time.NewTicker(1 * time.Second)

loop:
        for {
                select {
                case <-ctx.Done():
                        break loop
                case <-ticker.C:
                        f1(ctx, reg.F1Counter)
                }
        }
}

func f1(ctx context.Context, counter metric.Int64Counter) {
        counter.Add(ctx, 1)
}

func newResource() (*resource.Resource, error) {
        return resource.Merge(resource.Default(),
                resource.NewWithAttributes(semconv.SchemaURL,
                        semconv.ServiceName("chapter3"),
                        semconv.ServiceVersion("0.1.0"),
                ))
}

func newMeterProvider(ctx context.Context, res *resource.Resource) (*sdkmetric.MeterProvider, error) {
        exporter, err := otlpmetricgrpc.New(
                ctx,
                otlpmetricgrpc.WithInsecure(),
        )
        if err != nil {
                return nil, err
        }

        meterProvider := sdkmetric.NewMeterProvider(
                sdkmetric.WithResource(res),
                sdkmetric.WithReader(sdkmetric.NewPeriodicReader(exporter,
                        // Default is 1m. Set to 3s for demonstrative purposes.
                        sdkmetric.WithInterval(1*time.Second))),
        )
        return meterProvider, nil
}
```

ほぼtrace APIと変わらずに使えるっぽい。
otel-collectorのコンフィグは以下。

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

exporters:
  debug:
  prometheusremotewrite:
    endpoint: "http://victoriametrics:8428/api/v1/write"
    tls:
      insecure: true

service:
  pipelines:
    metrics:
      receivers: [otlp]
      exporters: [prometheusremotewrite, debug]
```

`prometheusremotewrite` を使って、collectorからVictoriaMetricsにプッシュする。
最後に以下のようなdocker-compose設定を用意して終わり。

```yaml
version: '3.7'
services:
  otel-collector:
    image: otel/opentelemetry-collector:0.96.0
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"
      - "8888:8888"
      - "9090:9090"
    depends_on:
      - victoriametrics

  victoriametrics:
    image: victoriametrics/victoria-metrics:latest
    ports:
      - "8428:8428"

  grafana:
    image: grafana/grafana:10.0.12
    depends_on:
      - victoriametrics
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: "secret"
```

```shell
$ docker compose up
$ OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="http://localhost:4317" go run ./main.go # tmux 別ペイン1
```

GrafanaでVictoriaMetricsのDatasourceを追加して、Exploreで見ると単調増加の様子が見れる。
Go側ではインターバル1秒で設定しているけど、Grafanaで見ると結構荒いresolutionになっているのはVictoriaMetricsの設定とかいじれば改善するのかな。

![](/images/otel3.png)

## 次回

あまりMetrics APIを手作業で書いて動かす例が見つけられなかったので、動いて良かった。
今度ログやトレースからメトリクスを生成するやつとか、普通にPrometheus Exporterを書いてPrometheus経由でcollectorに流すやつとかやりたい。

一旦このシリーズは終わり、またネタを思いついたら追加で色々やってみる。

## 参考文献

- <https://opentelemetry.io/docs/languages/go/>
- <https://pkg.go.dev/go.opentelemetry.io/otel>
