---
title: "Kubernetes v1.26のValidating Admission Policyを試す"
date: "2022-12-22"
lastmod: "2022-12-22"
tags: ["kubernetes"]
---

## 概要

お久しぶりです。最近ドラム式洗濯機を購入して、快適な生活ができているDrumatoです。

12/20, Kubernetes公式ブログに、 **[Kubernetes 1.26: Introducing Validating Admission Policies](https://kubernetes.io/blog/2022/12/20/validating-admission-policies-alpha/)** という記事が投稿されました。
そこで本記事では、公式ブログの記事の内容を復習しつつ、実際に使ってみます。
公式ブログの内容を素早くレポートするのが目的なので、あまり凝ったことはしていないですが、
すぐに使い始める方にとって十分な情報はカバーできていると思います。

今回の検証環境を以下に示します。

- ホスト
  - OS: Windows 10
  - VirtualBox: 6.1.38
- ゲスト
  - OS: Ubuntu 22.04.01 LTS
  - メモリ: 8GB
  - ディスク: 100GB

ミニマムな検証環境としてはKinDをよく利用していますが、
検証段階では、デフォルトのノードイメージとしてv1.25.3が採用されていたので、明示的に指定しています。

```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
featureGates:
  "ValidatingAdmissionPolicy": true
runtimeConfig:
  "admissionregistration.k8s.io/v1alpha1": true
nodes:
- role: control-plane
  image: kindest/node:v1.26.0@sha256:691e24bd2417609db7e589e1a479b902d2e209892a10ce375fab60a8407c7352
```

## 背景 

## Kubernetes APIに対するアクセスコントロール

Kubernetesでは、APIに対するアクセスコントロールを行う仕組みが複数用意されています。

<https://kubernetes.io/docs/concepts/security/controlling-access/>

|                   |                                                                             |
| :---------------: | :-------------------------------------------------------------------------: |
|  Authentication   |   クライアント証明書やServiceAccountを利用して、APIクライアントを認証する   |
|   Authorization   |              RBAC等の仕組みを用いて、ユーザのAPI権限を管理する              |
| Admission Control | APIリクエストの内容を検査して、期待しない用法を防いだり、ある種の強制を行う |

### Admission Webhookについて

このうち、Admission Controlの部分でAPIリクエストのバリデーションを実現する方法としては、
**validation webhook** というやり方が主流です。

これは、クラスタ運用者が独自にWebhookエンドポイントを用意してデプロイすることで、
Kubernetes APIに対するリクエストの検査をおこないます。
**リクエスト検査のロジックをプログラマブルに記述できる** ことから、自由度はかなり高いです。

また、kubebuilder(controller-runtime)などは、admission webhookに対するサポートをおこなっているので、
カスタムリソースに対するadmission webhookの適用を比較的簡単に始める事ができます。

実際に、著名のK8s Operatorもこれらを導入しています。
validation webhookを導入しているK8s Operatorとして、以下に例を示します。

- [cert-manager/cert-manager](https://github.com/cert-manager/cert-manager)
- [prometheus-operator/prometheus-operator](https://github.com/prometheus-operator/prometheus-operator)
- [cybozu-go/moco](https://github.com/cybozu-go/moco)

余談ですが、私も現在業務でvalidation webhookを導入したK8s Operatorを運用しています。

<https://speakerdeck.com/drumato/activities-about-kubernetes-operation-improvements-as-an-sre>

### validation webhookの苦労

上述したように、validation webhookはよく設計された、非常に便利なしくみであり、
実際に著名のプロジェクトが採用している状況ですが、
いくつか、運用者側が持たなければならない負担が存在します。

#### webhookエンドポイントの運用コスト

例えば、クラスタ運用者が、validation webhookのプログラムを実装し、デプロイする、という仕組みにより、
運用者側がそのエンドポイントの面倒を見る必要があります。

具体的には、以下のポイントについて継続的な努力が必要です。

- バグによって、K8s Control Planeの動きに影響を与える
  - 想定しないdenyが起こることで、ユーザのオペレーションや、コントローラ間のやり取りがうまく機能しません
- エンドポイント自体の監視
  - きちんと動き続けていることを保証したくなります
- バリデーションルールの変更が、再デプロイと等価になります
  - 運用上、バリデーションルールが頻繁に更新される場合、これはネックです

#### validation webhookに役割を持たせすぎない選択

また、APIリクエストのバリデーションを行いたいという目的のうち、
**自由度の高いGoプログラミングが必要な場面** はそこまで多くありません。
例えば、ある特定のフィールドが決まった値であるかどうかがチェックできれば良い、
みたいなパターンがほとんどだと思います。

もちろん一部のケースでは、Kubernetes外部のシステムと密に連携したOperatorを開発しているときなど、
外部システム固有のロジックや仕様をプログラミングしたくなることもあるかもしれませんが、
それとは別に、YAMLに対するlinterを用意するなど、
APIリクエストそのものを弾く、という以外にも選択肢はあると思います。

## Validating Admission Policy

今回、Kubernetes v1.26で1st Alphaとして導入された **Validating Admission Policy** ですが、
これは先述したvalidation webhookとは異なる発想で利用することができる、新しいAdmission Controlのアプローチです。

- バリデーションルールをK8sマニフェスト上に直接記述できる
  - バリデーションルールが宣言的に管理できる
  - ルールの更新は、単にAPIオブジェクトの更新だけ
    - validation webhookではエンドポイントを再デプロイしていた
- K8s運用者が管理するのは **相変わらず** マニフェストだけ
- **[Common Expression Language](https://github.com/google/cel-spec)** の表現力が高く、多くのケースをカバーできる
  - すでにCRDに対するバリデーション機能としてKubernetesに採用されていたので、親しみやすい

### シンプルなケース 

それでは、実際にValidating Admission Policyを利用してみましょう。
まず、`ValidatingAdmissionPolicy` というリソースを定義します。
これは、実際にCELが記述される、バリデーリョンルールを表すリソースとなっています。

```yaml
apiVersion: admissionregistration.k8s.io/v1alpha1
kind: ValidatingAdmissionPolicy
metadata:
  name: "sample1.drumato.com"
spec:
  matchConstraints:
    resourceRules:
    - apiGroups:   ["apps"]
      apiVersions: ["v1"]
      operations:  ["CREATE", "UPDATE"]
      resources:   ["deployments"]
  validations:
    - expression: "object.spec.replicas != 1"
```

`.spec.matchConstraints` で、ポリシーがマッチする条件を記述します。
`NetworkPolicy.networking.k8s.io` やRBACのマニフェストで近い概念があるので、比較的わかりやすいと思います。
利用できる制約は以下の通りです。
また、 `excludeResourceRules` で、ポリシーが対象としないAPIオブジェクトを明示することもできます。

|                     |                                                                                         |
| :-----------------: | :-------------------------------------------------------------------------------------: |
| `namespaceSelector` | 特定のLabelを持ったNamespaceにマッチし、そのNamespace以下のすべてのリソースを対象とする |
|  `objectSelector`   |                     特定のNamespaceを持ったオブジェクトにマッチする                     |
|   `resourceRules`   |                     APIリソースに対する細かいマッチルールを記述する                     |

例えば、 **`environment: test` を持ったNamespace内の、 `app: nginx` を持ったDeployment** をマッチさせる場合は以下のようにします。

```yaml
apiVersion: admissionregistration.k8s.io/v1alpha1
kind: ValidatingAdmissionPolicy
metadata:
  name: "sample1.drumato.com"
spec:
  matchConstraints:
    namespaceSelector:
      matchLabels:
        environment: test 
    objectSelector:
      matchLabels:
        app: nginx
    resourceRules:
    - apiGroups:   ["apps"]
      apiVersions: ["v1"]
      operations:  ["CREATE", "UPDATE"]
      resources:   ["deployments"]
  validations:
    - expression: "object.spec.replicas != 1"
```

あとは、これを実際にバインドするリソースである、 `ValidatingAdmissionPolicyBinding` リソースをデプロイします。

```yaml
apiVersion: admissionregistration.k8s.io/v1alpha1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: "sample1-bind.drumato.com"
spec:
  policyName: "sample1.drumato.com"
```

実際に `app: nginx` のLabelがつけられたDeploymentの作成を弾く様子を以下に示します。

```bash
$ kubectl get ns default -o json | jq .metadata.labels # 該当Labelを持ったns
{
  "environment": "test",
  "kubernetes.io/metadata.name": "default"
}

$ kubectl apply -f policy.yaml
validatingadmissionpolicy.admissionregistration.k8s.io/sample1.drumato.com created
validatingadmissionpolicybinding.admissionregistration.k8s.io/sample1-bind.drumato.com created

$ kubectl apply -f deployment.yaml # バリデーションで弾かれる
The deployments "nginx-deployment" is invalid: : ValidatingAdmissionPolicy 'sample1.drumato.com' with binding 'sample1-bind.drumato.com' denied request: failed expression: object.spec.replicas != 1

$ nvim deployment.yaml # "app: nginx" を "app: nginx2" に変える
$ kubectl apply -f deployment.yaml # バリデーションがパスされる
deployment.apps/nginx-deployment created
```

ちなみに、リソースへのマッチルールは、 `ValidatingAdmissionPolicyBinding` 側に記述することもできます。
個人的には、thinなポリシーを `ValidatingAdmissionPolicy` で定義しておいて、
それを `Binding` で条件づけてマッチさせる、という運用法を取ったほうが、
マニフェストもといバリデーションルールの再利用性が高まると思います。

```yaml
apiVersion: admissionregistration.k8s.io/v1alpha1
kind: ValidatingAdmissionPolicy
metadata:
  name: "sample1.drumato.com"
spec:
  matchConstraints:
    resourceRules:
    - apiGroups:   ["apps"]
      apiVersions: ["v1"]
      operations:  ["CREATE", "UPDATE"]
      resources:   ["deployments"]
  validations:
    - expression: "object.spec.replicas != 1"
---
apiVersion: admissionregistration.k8s.io/v1alpha1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: "sample1-bind.drumato.com"
spec:
  policyName: "sample1.drumato.com"
  matchResources:
    namespaceSelector:
      matchLabels:
        environment: test 
    objectSelector:
      matchLabels:
        app: nginx
```

### 少し複雑なCEL式の例

CELはかなり表現力が高いので、以下のようなルールを定義することもできます。

| index |                       目的                       |                  CEL Expression                   |
| :---: | :----------------------------------------------: | :-----------------------------------------------: |
|   1   |    `.metadata.labels`をExact Matchで検査する     |    `object.metadata.labels == {'app':'nginx'}`    |
|   2   | `.spec.template.spec.containers[]`の数を制御する | `size(object.spec.template.spec.containers) <= 1` |
|   3   |      `.spec.replicas` の書き換えを禁止する       | `oldobject.spec.replicas == object.spec.replicas` |

```bash
# index 1 の例
$ kubectl apply -f deployment.yaml
deployment.apps/nginx-deployment created

$ kubectl delete -f deployment.yaml
deployment.apps "nginx-deployment" deleted

# foo: barというLabelを追加
$ nvim deployment.yaml 
$ kubectl apply -f deployment.yaml
The deployments "nginx-deployment" is invalid: : ValidatingAdmissionPolicy 'sample1.drumato.com' with binding 'sample1-bind.drumato.com' denied request: failed expression: object.metadata.labels == {'app':'nginx'}

# index 2の例
$ nvim deployment.yaml # containersの数を2個に増やす

$ kubectl apply -f deployment.yaml
```

### パラメータリソースを利用する

<https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/#parameter-resources>

また、`ValidatingAdmissionPolicy` に渡すパラメータを定義することができます。
例えば、さきほどDeploymentの `.spec.replicas` に上限を設定する際に、
定数ではなく、 `object.spec.replicas <= params.maxReplicas` のように渡すことも可能です。

公式リファレンスでは、 ポリシーをバインドする際に実際のパラメータオブジェクトを指定することでポリシーをインスタンス化します。

---

## 所感とまとめ

CELの仕様を初めて読んでみたんですけど、かなり表現力が高いところに感動しました。
`matches()` で正規表現にかけてみたりもできるのは魅力ですね。

運用者的には、validation webhookとどう使い分けるかを判断する必要があります。
ただし、今までvalidation webhookで行っていたプリミティブな検証は移行しても良さそうですね。
ちゃんと `oldobject` という識別子が参照できるので、移行もスムーズにおこなえそうです。

## 参考資料

- [Kubernetes 1.26: Introducing Validating Admission Policies](https://kubernetes.io/blog/2022/12/20/validating-admission-policies-alpha/)
- [Validating Admission Policy](https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/)
- [ValidatingAdmissionPolicy v1alpha1 admissionregistration.k8s.io](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.26/#validatingadmissionpolicy-v1alpha1-admissionregistration-k8s-io)
