---
title: "ArgoCDとArgoCD Image UpdaterはデフォルトでどういうAPIでやりとりしているのか"
date: "2024-10-12"
lastmod: "2024-10-12"
tags: ["kubernetes", "argocd", "memo"]
---

## 背景

少し前 [このような記事](https://www.drumato.com/ja/posts/argocd-image-updater-write-back/) を上げたが､
このインストール方法ではArgoCDおよびArgoCD Image Updaterの(連携用の)設定は特に入っていないように見える｡

```
❯ kubectl get cm -n argocd
NAME                              DATA   AGE
argocd-cm                         0      2m20s
argocd-cmd-params-cm              0      2m20s
argocd-gpg-keys-cm                0      2m20s
argocd-image-updater-config       0      2m19s
argocd-image-updater-ssh-config   0      2m19s
argocd-notifications-cm           0      2m20s
argocd-rbac-cm                    0      2m20s
argocd-ssh-known-hosts-cm         1      2m20s
argocd-tls-certs-cm               0      2m20s
kube-root-ca.crt                  1      2m18s
❯ kubectl get secrets -n argocd
NAME                          TYPE     DATA   AGE
argocd-image-updater-secret   Opaque   0      2m59s
argocd-initial-admin-secret   Opaque   1      2m28s
argocd-notifications-secret   Opaque   0      3m
argocd-redis                  Opaque   1      2m30s
argocd-secret                 Opaque   5      3m
```

どのようにして初期設定で実現できているのかが気になったので調べてみる｡

## TL;DR

## 調査

### ArgoCD

ArgoCDは以下のようにそれぞれのアプリケーションが協調動作して実現されている｡

```
> kubectl get pods -n argocd
NAME                                                READY   STATUS    RESTARTS   AGE
argocd-application-controller-0                     1/1     Running   0          7m59s
argocd-applicationset-controller-5b866bf4f7-sssrs   1/1     Running   0          7m59s
argocd-dex-server-7b6987df7-6k4z9                   1/1     Running   0          7m59s
argocd-image-updater-9f4c96989-2qcnn                1/1     Running   0          7m59s
argocd-notifications-controller-5ddc4fdfb9-bgpgx    1/1     Running   0          7m59s
argocd-redis-ffccd77b9-45kf5                        1/1     Running   0          7m59s
argocd-repo-server-55bb7b784-6cccx                  1/1     Running   0          7m59s
argocd-server-7c746df554-948xg                      1/1     Running   0          7m59s
```

しかしコンテナイメージは特に分かれていなさそうだったのでmain.goを見に行くと､
どうやらファイルパスによって実行するコンポーネントを切り替えるようなモノリス構成で実装されているようだった｡

<https://github.com/argoproj/argo-cd/blob/cf498f674de7082f5d34d5c9df4f0b4c9b4fabd5/cmd/main.go#L35-L64>

今回はargocd-serverなのでそちらの線で追ってみる｡

<https://github.com/argoproj/argo-cd/blob/cf498f674de7082f5d34d5c9df4f0b4c9b4fabd5/cmd/argocd-server/commands/argocd_server.go#L280>

ここらへんを見るとデフォルトで `insecure: false` となっている｡
ArgoCD的には､ [`insecure: true` か証明書の設定が行われていると `useTLS()` が真を返す](https://github.com/argoproj/argo-cd/blob/cf498f674de7082f5d34d5c9df4f0b4c9b4fabd5/server/server.go#L753) 実装になっており､
`argocd-secret` を見に行くと `tls.crt` などが設定されていたので以下のようなサーバが立ち上がる｡

- gRPC
- HTTP (HTTPSにリダイレクトする)
- HTTPS

### ArgoCD Image Updater

ArgoCDとしてArgoCDのApplicationリソースを取得する方法はデフォルトで2つあり､

- Kubernetes(client-goベースのクライアント)
- ArgoCD(ArgoCDの[apiclient](https://github.com/argoproj/argo-cd/blob/master/pkg/apiclient/apiclient.go) パッケージを使ったクライアント)

のどちらかを選択できる｡

<https://github.com/argoproj-labs/argocd-image-updater/blob/2e631b02289acbc15c40879994eaf2fd30b4ab2c/cmd/run.go#L221> を見るとデフォルトではKubernetesモードで動いているので､
先ほど調査したgRPC/HTTPSサーバに通信していないことがわかった｡

SA周りの設定を見てみると､確かにargoproj.io apiGroupのリソースに対する権限が割り当てられていそうだった｡

```shell
❯ kubectl get sa -n argocd argocd-image-updater
NAME                   SECRETS   AGE
argocd-image-updater   0         22m
❯ kubectl get role -n argocd argocd-image-updater  -o yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  # 中略
  name: argocd-image-updater
  namespace: argocd
rules:
- apiGroups:
  - ""
  resources:
  - secrets
  - configmaps
  verbs:
  - get
  - list
  - watch
- apiGroups:
  - argoproj.io
  resources:
  - applications
  verbs:
  - get
  - list
  - update
  - patch
- apiGroups:
  - ""
  resources:
  - events
  verbs:
  - create
❯ kubectl get rolebindings.rbac.authorization.k8s.io -n argocd argocd-image-updater -o yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  # 中略
  name: argocd-image-updater
  namespace: argocd
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: argocd-image-updater
subjects:
- kind: ServiceAccount
  name: argocd-image-updater
❯ kubectl get deployments.apps -n argocd argocd-image-updater  -o yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  # 中略
  name: argocd-image-updater
  namespace: argocd
spec:
  # 中略
      serviceAccount: argocd-image-updater
      serviceAccountName: argocd-image-updater
```

## 感想

だからなんだろうという結果になってしまったけど､ちゃんとエビデンス取るのは大事｡
デフォルトのRole ruleでK8s APIのほかリソースに影響を与える感じにはなっていないし､
ArgoCDのRBACを利用して詳細に権限管理したいというモチベーションがない限りKubernetesモードの連携のほうが簡単な気がする｡

