---
title: "KWOKでPDBやPod Topology Spread Constraintsを検証できるか"
date: "2024-03-17"
lastmod: "2024-03-17"
tags: ["memo", "kubernetes"]
---

Kubernetes SIGでKWOK-Kubernetes WithOut Kubelet-というものが開発されている。
これはkubeletを起動しないことで、Podに実体を持たせず、大量のNodeやPodをデプロイして検証できるようなサンドボックス環境を作ることができる。

<https://kwok.sigs.k8s.io/>

実際にPodが起動するわけではないがkube-apiserverやkube-scheduler自体は構築されるので、
これを使えばScheduling Algorithmの検証はできるのではないか?という仮説のもと、動かしてみる。

## 本題

まずは以下のコマンドを実行してインストールする。
インストール方法にはいくつかの選択肢があるが、 `go install` を利用した方法を選択した。

```shell
# KWOK repository
KWOK_REPO=kubernetes-sigs/kwok
# Get latest
KWOK_LATEST_RELEASE=$(curl "https://api.github.com/repos/${KWOK_REPO}/releases/latest" | jq -r '.tag_name')

go install sigs.k8s.io/kwok/cmd/{kwok,kwokctl}@${KWOK_LATEST_RELEASE}
```

結果、 `kubectl cluster-info --context kwok-kwok` で接続できるようになる。
この状態でnode listを取ってきても、まだ誰もいない。

```shell
❯ kubectl get nodes
No resources found
```

`kwokctl scale node` コマンドを使うことで、Fake Nodeを増減できる。
ここでは雑に10台足してみたが、本当に一瞬で追加された。

```shell
❯ kwokctl scale node --replicas 10
No resource found, use default resource                                                                                                                           resource=node cluster=kwok
Load resources
❯ kubectl get nodes
NAME          STATUS   ROLES   AGE   VERSION
node-000000   Ready    agent   11m   kwok-v0.5.1
node-000001   Ready    agent   11m   kwok-v0.5.1
node-000002   Ready    agent   11m   kwok-v0.5.1
node-000003   Ready    agent   11m   kwok-v0.5.1
node-000004   Ready    agent   11m   kwok-v0.5.1
node-000005   Ready    agent   11m   kwok-v0.5.1
node-000006   Ready    agent   11m   kwok-v0.5.1
node-000007   Ready    agent   11m   kwok-v0.5.1
node-000008   Ready    agent   11m   kwok-v0.5.1
node-000009   Ready    agent   11m   kwok-v0.5.1
```

適当にサフィックスが偶数か奇数かで分けてLabelをつけておく。

```shell
> cat add-label.sh
#!/bin/bash

for i in {0..9}; do
  if (( i % 2 == 0 )); then
    kubectl label nodes "node-00000${i}" number=even
  else
    kubectl label nodes "node-00000${i}" number=odd
  fi
done
> bash add-label.sh

❯ kubectl get nodes -o json | jq ".items[].metadata.labels[\"number\"]"
"even"
"odd"
"even"
"odd"
"even"
"odd"
"even"
"odd"
"even"
"odd"
```

### PDBの検証

ここからはPDBの検証。
まずはminAvailableとmaxUnavailableをそれぞれやってみる。

```bash
❯ cat nginx.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 10
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
      nodeSelector:
        kubernetes.io/hostname: node-000000
```

適当に1台のノードにPodを集中させてみて、minAvailableがreplicasと同じ場合にdrainが行われないことを試す。

```yaml
apiVersion: policy/v1 
kind: PodDisruptionBudget 
metadata: 
  name: pdb-sample
spec: 
  minAvailable: 95% # round upにより、固定値で10を指定した場合と同義
  selector:
    matchLabels:
      app: nginx
```

```shell
> kubectl apply -f nginx.yaml
> kubectl apply -f pdb-sample.yaml
❯ kubectl get pod,pdb -o wide
NAME                         READY   STATUS    RESTARTS   AGE   IP          NODE          NOMINATED NODE   READINESS GATES
pod/nginx-74499fddc4-8ndtg   1/1     Running   0          16s   10.0.0.1    node-000000   <none>           <none>
pod/nginx-74499fddc4-96jdb   1/1     Running   0          16s   10.0.0.4    node-000000   <none>           <none>
pod/nginx-74499fddc4-9m7n5   1/1     Running   0          16s   10.0.0.7    node-000000   <none>           <none>
pod/nginx-74499fddc4-c6l6v   1/1     Running   0          16s   10.0.0.10   node-000000   <none>           <none>
pod/nginx-74499fddc4-h9fnf   1/1     Running   0          16s   10.0.0.2    node-000000   <none>           <none>
pod/nginx-74499fddc4-ltnzl   1/1     Running   0          16s   10.0.0.3    node-000000   <none>           <none>
pod/nginx-74499fddc4-pjbwq   1/1     Running   0          16s   10.0.0.8    node-000000   <none>           <none>
pod/nginx-74499fddc4-s4st4   1/1     Running   0          16s   10.0.0.6    node-000000   <none>           <none>
pod/nginx-74499fddc4-z7nzx   1/1     Running   0          16s   10.0.0.5    node-000000   <none>           <none>
pod/nginx-74499fddc4-zgjlr   1/1     Running   0          16s   10.0.0.9    node-000000   <none>           <none>

NAME                                    MIN AVAILABLE   MAX UNAVAILABLE   ALLOWED DISRUPTIONS   AGE
poddisruptionbudget.policy/pdb-sample   95%             N/A               0                     12s
❯ kubectl drain node-000000
node/node-000000 cordoned
evicting pod default/nginx-74499fddc4-zgjlr
evicting pod default/nginx-74499fddc4-8ndtg
evicting pod default/nginx-74499fddc4-pjbwq
evicting pod default/nginx-74499fddc4-9m7n5
evicting pod default/nginx-74499fddc4-z7nzx
evicting pod default/nginx-74499fddc4-ltnzl
evicting pod default/nginx-74499fddc4-c6l6v
evicting pod default/nginx-74499fddc4-h9fnf
evicting pod default/nginx-74499fddc4-96jdb
evicting pod default/nginx-74499fddc4-s4st4
error when evicting pods/"nginx-74499fddc4-z7nzx" -n "default" (will retry after 5s): Cannot evict pod as it would violate the pod's disruption budget.
error when evicting pods/"nginx-74499fddc4-96jdb" -n "default" (will retry after 5s): Cannot evict pod as it would violate the pod's disruption budget.
error when evicting pods/"nginx-74499fddc4-h9fnf" -n "default" (will retry after 5s): Cannot evict pod as it would violate the pod's disruption budget.
error when evicting pods/"nginx-74499fddc4-8ndtg" -n "default" (will retry after 5s): Cannot evict pod as it would violate the pod's disruption budget.
error when evicting pods/"nginx-74499fddc4-ltnzl" -n "default" (will retry after 5s): Cannot evict pod as it would violate the pod's disruption budget.
error when evicting pods/"nginx-74499fddc4-9m7n5" -n "default" (will retry after 5s): Cannot evict pod as it would violate the pod's disruption budget.
error when evicting pods/"nginx-74499fddc4-s4st4" -n "default" (will retry after 5s): Cannot evict pod as it would violate the pod's disruption budget.
error when evicting pods/"nginx-74499fddc4-pjbwq" -n "default" (will retry after 5s): Cannot evict pod as it would violate the pod's disruption budget.
error when evicting pods/"nginx-74499fddc4-zgjlr" -n "default" (will retry after 5s): Cannot evict pod as it would violate the pod's disruption budget.
error when evicting pods/"nginx-74499fddc4-c6l6v" -n "default" (will retry after 5s): Cannot evict pod as it would violate the pod's disruption budget.
```

良さそう。
先ほどのDeploymentからnodeSelectorを外しておく。

```diff
diff -u -N /tmp/LIVE-4262645919/apps.v1.Deployment.default.nginx /tmp/MERGED-1729619659/apps.v1.Deployment.default.nginx
--- /tmp/LIVE-4262645919/apps.v1.Deployment.default.nginx       2024-03-17 11:04:21.000796193 +0900
+++ /tmp/MERGED-1729619659/apps.v1.Deployment.default.nginx     2024-03-17 11:04:21.000796193 +0900
@@ -6,7 +6,7 @@
     kubectl.kubernetes.io/last-applied-configuration: |
       {"apiVersion":"apps/v1","kind":"Deployment","metadata":{"annotations":{},"name":"nginx","namespace":"default"},"spec":{"replicas":10,"selector":{"matchLabels":{"app":"nginx"}},"template":{"metadata":{"labels":{"app":"nginx"}},"spec":{"containers":[{"image":"nginx:latest","name":"nginx"}],"nodeSelector":{"kubernetes.io/hostname":"node-000000"}}}}}
   creationTimestamp: "2024-03-17T02:00:53Z"
-  generation: 1
+  generation: 2
   name: nginx
   namespace: default
   resourceVersion: "3411"
@@ -37,8 +37,6 @@
         terminationMessagePath: /dev/termination-log
         terminationMessagePolicy: File
       dnsPolicy: ClusterFirst
-      nodeSelector:
-        kubernetes.io/hostname: node-000000
       restartPolicy: Always
       schedulerName: default-scheduler
       securityContext: {}
```

```shell
> kubectl apply -f nginx.yaml
❯ kubectl get pods -o wide
NAME                     READY   STATUS    RESTARTS   AGE   IP         NODE          NOMINATED NODE   READINESS GATES
nginx-56fcf95486-6f5lr   1/1     Running   0          3s    10.0.6.1   node-000006   <none>           <none>
nginx-56fcf95486-75kn4   1/1     Running   0          3s    10.0.8.1   node-000008   <none>           <none>
nginx-56fcf95486-7dn98   1/1     Running   0          2s    10.0.9.1   node-000009   <none>           <none>
nginx-56fcf95486-b9dds   1/1     Running   0          2s    10.0.2.2   node-000002   <none>           <none>
nginx-56fcf95486-f4bjz   1/1     Running   0          3s    10.0.1.1   node-000001   <none>           <none>
nginx-56fcf95486-h925h   1/1     Running   0          3s    10.0.5.1   node-000005   <none>           <none>
nginx-56fcf95486-lx7x8   1/1     Running   0          3s    10.0.2.1   node-000002   <none>           <none>
nginx-56fcf95486-n5rpr   1/1     Running   0          2s    10.0.3.1   node-000003   <none>           <none>
nginx-56fcf95486-tgmj6   1/1     Running   0          3s    10.0.4.1   node-000004   <none>           <none>
nginx-56fcf95486-vp8qm   1/1     Running   0          3s    10.0.7.1   node-000007   <none>           <none>
```

`node-000002` に2台スケジュールされている状態になった。


### Pod Topology Spread Constraintsの検証

続いて、Pod Topology Spread Constraintsのサンプルを動かしてみる。

```diff
diff -u -N /tmp/LIVE-441460715/apps.v1.Deployment.default.nginx /tmp/MERGED-2606689879/apps.v1.Deployment.default.nginx
--- /tmp/LIVE-441460715/apps.v1.Deployment.default.nginx        2024-03-17 11:10:57.350767219 +0900
+++ /tmp/MERGED-2606689879/apps.v1.Deployment.default.nginx     2024-03-17 11:10:57.350767219 +0900
@@ -6,7 +6,7 @@
     kubectl.kubernetes.io/last-applied-configuration: |
       {"apiVersion":"apps/v1","kind":"Deployment","metadata":{"annotations":{},"name":"nginx","namespace":"default"},"spec":{"replicas":10,"selector":{"matchLabels":{"app":"nginx"}},"template":{"metadata":{"labels":{"app":"nginx"}},"spec":{"containers":[{"image":"nginx:latest","name":"nginx"}]}}}}
   creationTimestamp: "2024-03-17T02:00:53Z"
-  generation: 2
+  generation: 3
   name: nginx
   namespace: default
   resourceVersion: "3908"
@@ -41,6 +41,13 @@
       schedulerName: default-scheduler
       securityContext: {}
       terminationGracePeriodSeconds: 30
+      topologySpreadConstraints:
+      - labelSelector:
+          matchLabels:
+            app: nginx
+        maxSkew: 1
+        topologyKey: number
+        whenUnsatisfiable: DoNotSchedule
 status:
   availableReplicas: 10
   conditions:
```

`number: even` と `number: odd` の間でPod数の差が1以下じゃないとスケジュールが行われないようにしてみた。
nginx Deploymentのreplicasを11にして実行する。
今回は必ず差が1になるようなスケジュール戦略が存在するので、問題なくスケジュールできるはず。

```shell
> kubectl apply -f nginx.yaml
> kubectl get pods -o wide
NAME                     READY   STATUS    RESTARTS   AGE     IP         NODE          NOMINATED NODE   READINESS GATES
nginx-544bdcf6b7-5k5w8   1/1     Running   0          2m56s   10.0.9.2   node-000009   <none>           <none>
nginx-544bdcf6b7-6nv4s   1/1     Running   0          2m56s   10.0.2.1   node-000002   <none>           <none>
nginx-544bdcf6b7-75vxz   1/1     Running   0          2m56s   10.0.9.1   node-000009   <none>           <none>
nginx-544bdcf6b7-ckcms   1/1     Running   0          2m56s   10.0.8.2   node-000008   <none>           <none>
nginx-544bdcf6b7-fbkxh   1/1     Running   0          2m56s   10.0.3.1   node-000003   <none>           <none>
nginx-544bdcf6b7-kkxbh   1/1     Running   0          2m56s   10.0.9.3   node-000009   <none>           <none>
nginx-544bdcf6b7-lb6xz   1/1     Running   0          2m56s   10.0.8.1   node-000008   <none>           <none>
nginx-544bdcf6b7-rnxlq   1/1     Running   0          2m56s   10.0.6.1   node-000006   <none>           <none>
nginx-544bdcf6b7-whs4r   1/1     Running   0          2m56s   10.0.2.3   node-000002   <none>           <none>
nginx-544bdcf6b7-x6hkb   1/1     Running   0          2m56s   10.0.7.1   node-000007   <none>           <none>
nginx-544bdcf6b7-xk8zr   1/1     Running   0          2m56s   10.0.2.2   node-000002   <none>           <none>
❯ kubectl get pods -o json | jq .items[].spec.nodeName | sort -u
"node-000002"
"node-000003"
"node-000006"
"node-000007"
"node-000008"
"node-000009"
```

ちゃんとスケジュールはできたが、特定のノードに集中してしまった。
これにはpreferred, required pod anti affinityの設定が必要。

とはいえ、KWOKでいい感じにScheduling Algorithmの検証ができることを確認できたので、今回の目的は達成。

## まとめ

KWOKではNode,Podの実体がないということで、どのようなユースケースがあるか考えていたが、
kube-scheduler等の挙動検証にはかなり役立つことに気づいた。

今私はPodの分布をうまーく調整するコントローラを書いているので、そのテストとかでも役立ちそうかな。

## 次回

次回はOpenTelemetryのLogs APIを、Railsで使ってみる、みたいな記事とかを書きたい。

## 参考文献

- <https://kwok.sigs.k8s.io/>
- <https://engineering.mercari.com/blog/entry/20231204-k8s-understanding-pdb/>
