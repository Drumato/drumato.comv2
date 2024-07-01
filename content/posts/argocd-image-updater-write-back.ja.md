---
title: "ArgoCD Image UpdaterでDeclarativeにイメージ更新する方法を試す"
date: "2024-07-01"
lastmod: "2024-07-01"
tags: ["kubernetes", "argocd"]
---

とっても便利な機能を教えてもらったので試しました｡

## 前提

ArgoCD Image Updaterはクラスタで使われているイメージの状態とコンテナレジストリの状態を取得して､
その差分からクラスタのコンテナイメージを書き換えてくれるとっても便利なOSSです｡

一方で､Everything in under ArgoCD の環境ではマニフェストがすべてGit管理されており､
Declarativeなイメージの更新を行う動機が存在します｡
ということを業務で相談したところ､Kubernetesの専門家が｢ArgoCD Image Updaterにそういう機能なかったっけ｣と教えてくれました｡

調べてみるとwrite-backという機構が存在し､
これを利用することでArgoCD ApplicationのrepoURLで指定されたリポジトリに対し､イメージの更新を行うコミットをしてくれる､というものです｡

## やってみる

今回の例は <https://github.com/Drumato/blog_samples/tree/main/kubernetes/argocd-image-updater> においてあります｡

まずは適当に､以下のシェルスクリプトを実行します｡

```shell
set -eux

function create_cluster() {
  kind create cluster
  kubectl cluster-info --context kind-kind
}

function install_argocd() {
  kubectl create namespace argocd
  kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
}

function install_argocd_image_updater() {
  kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj-labs/argocd-image-updater/stable/manifests/install.yaml
}

create_cluster
install_argocd
install_argocd_image_updater
```

これで環境は整ったので､ `kubectl port-forward` でargocd-serverにアクセスして､適当にRepositoryを追加します｡
このとき､HTTPSで追加するかSSHで追加するかによって後々作業が異なります｡
ここではSSHで作成しておきます｡

リポジトリの連携が完了したら､ArgoCD Applicationを作成します｡

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  annotations:
    argocd-image-updater.argoproj.io/write-back-method: git:secret:argocd/git-creds
    argocd-image-updater.argoproj.io/image-list: nginx=nginx
    argocd-image-updater.argoproj.io/git-branch: "main:image-updater{{range .Images}}-{{.Name}}-{{.NewTag}}{{end}}"
    argocd-image-updater.argoproj.io/write-back-target: "kustomization:/kubernetes/argocd-image-updater/old-nginx"
  name: old-nginx
  namespace: argocd
spec:
  destination:
    namespace: default
    server: https://kubernetes.default.svc
  project: default
  source:
    path: kubernetes/argocd-image-updater/old-nginx
    repoURL: git@github.com:Drumato/blog_samples
    targetRevision: main
    kustomize:
```

annotationにargocd-image-updaterの設定をいれるのは､従来のArgoCD Image Updaterと変わらないですが､
`write-back-method: git` を入れるのが重要です｡
また､コミット時に使う認証情報を `secret:<namespace>/<name>`として指定します｡

secret自体は､以下のように作りました｡
本当はArgoCD Image Updater用に別途アカウントを発行するのが良いと思います｡

```
kubectl -n argocd create secret generic git-creds --from-file=sshPrivateKey=/home/drumato/.ssh/id_rsa
```

また､ `write-back-target` はイメージをどこに書き込むか､またどのように書き込むかという設定です｡
デフォルトでは `.argocd-source-<app-name>.yaml` という名前で新しくファイルが作成され､
ArgoCD Applicationのsourceに書き込める感じで生成されますが､
`kustomization` を指定すると `kustomization.yaml` の `images` に書き込んでくれます｡これが非常に便利｡

そしたら `kubectl apply -f application.yaml` してみます｡
リポジトリを見に行くと､なんかブランチが生えています｡

例としてPR作ってみたので､こちらを見ていただけると雰囲気がつかめると思います｡
<https://github.com/Drumato/blog_samples/pull/1>

ということで､なんかめちゃくちゃ簡単にできてしまいました｡すごい｡

## 参考資料

- <https://argocd-image-updater.readthedocs.io/en/stable/>

