---
title: "一定時間でSecretを消すttlsecret controllerを作った"
date: "2025-01-20"
lastmod: "2025-01-20"
tags: ["kubernetes", "go"]
---

あんまりユースケースがあるかわからないんですが､
Kubernetes Secretを一時的な情報保存APIとして利用し､
最終的に削除する､みたいなパターンのロジックを作るときに便利そうだったので作ってみました｡

<https://github.com/Drumato/ttlsecret>

## 使い方

kubebuilder projectでの通常のデプロイフローを利用したあとに､
Secretリソースに以下のようなannotationをつけるだけで使えます｡

```yaml
apiVersion: v1
data:
  username: YWRtaW4=
  password: MWYyZDFlMmU2N2Rm
kind: Secret
metadata:
  annotations:
    # 以下どちらかを指定する
    ttlsecret.drumato.com/ttl: "2025-01-20 23:59:59" # 絶対的な日時指定
    ttlsecret.drumato.com/layout: "datetime" # ttlsecret.drumato.com/ttl のフォーマット
    ttlsecret.drumato.com/ttl-after-age: "3d" # Secret作成から3日後に削除される
  name: mysecret
  namespace: default
type: Opaque
```

CRDを必要とせず､いつでもオプトインできるように､Secret自体のコントローラとして動くようになっています｡
