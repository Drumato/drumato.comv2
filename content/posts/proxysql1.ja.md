---
title: "ProxySQL1: とりあえずKubernetesで動かす"
date: "2024-07-23"
lastmod: "2024-07-23"
tags: ["kubernetes", "proxysql"]
---

## 概要

proxysqlに関する運用ツールをゴリゴリ開発していくうえで､挙動検証に便利なコンフィグ例があると便利だと思ったので作りました｡

<https://github.com/Drumato/blog_samples/tree/main/kubernetes/proxysql>

## やってみる

まずは適当にMySQLのDeployment/Serviceを立てます｡

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
  labels:
    app: mysql
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        ports:
        - containerPort: 3306
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: rootpassword
        - name: MYSQL_DATABASE
          value: mydatabase
        - name: MYSQL_USER
          value: user
        - name: MYSQL_PASSWORD
          value: password
---
apiVersion: v1
kind: Service
metadata:
  name: mysql-service
  labels:
    app: mysql
spec:
  ports:
  - port: 3306
    targetPort: 3306
  selector:
    app: mysql
  type: ClusterIP
```

次に､ProxySQLの設定をConfigMapで入れます(本当はSecretであるべきです)
設定の内容は適当です｡
今後ProxySQL Clusterを動かすために､proxysql_serversディレクティブも埋めています｡

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: proxysql-config
  labels:
    app: proxysql
data:
  proxysql.cfg: |
    datadir="/var/lib/proxysql"
    admin_variables=
    {
      admin_credentials="admin:admin_creds"
      mysql_ifaces="0.0.0.0:6032"
    }
    mysql_variables=
    {
      threads=4
      max_connections=2048
      default_query_delay=0
      default_query_timeout=36000000
      poll_timeout=2000
      interfaces="0.0.0.0:6033"
      default_schema="information_schema"
      stacksize=1048576
      server_version="5.7.30"
      connect_retries_on_failure=10
      monitor_history=60000
      monitor_connect_interval=200000
      monitor_ping_interval=200000
      ping_interval_server_msec=120000
      ping_interval_server_max_failures=3
      commands_stats=true
      sessions_sort=true
    }
    mysql_servers=
    (
      {
        address="mysql-service"
        port=3306
        hostgroup=0
        max_connections=100
      }
    )
    mysql_users=
    (
      {
        username = "user"
        password = "password"
        default_hostgroup = 0
        active = 1
        max_connections = 10000
      }
    )
    proxysql_servers=
    (
      {
        hostname="proxysql-0"
        port=6032
        weight=1
        comment="proxysql0"
      },
      {
        hostname="proxysql-1"
        port=6032
        weight=1
        comment="proxysql1"
      },
      {
        hostname="proxysql-2"
        port=6032
        weight=1
        comment="proxysql2"
      }
    )
```

最後に､statefulsetを配置します｡
デフォルトでは `/etc/proxysql.cnf` を使うので､
`command` を書いて好きな設定を書き込むようにしているのと､
ヘルスチェックを追加してちゃんとクエリできるのを確かめています｡

```yaml
apiVersion: apps/v1
kind: StatefulSet

metadata:
  name: proxysql
  labels:
    app: proxysql
spec:
  serviceName: "proxysql"
  replicas: 3
  selector:
    matchLabels:
      app: proxysql
  template:
    metadata:
      labels:
        app: proxysql
    spec:
      containers:
      - name: proxysql
        command: 
          - proxysql
          - -f
          - --idle-threads
          - -D
          - /var/lib/proxysql
          - --config
          - /etc/proxysql.cfg
        image: proxysql/proxysql:latest
        ports:
        - containerPort: 6033
          name: mysql
        - containerPort: 6032
          name: admin
        volumeMounts:
        - name: proxysql-config
          mountPath: /etc/proxysql.cfg
          subPath: proxysql.cfg
        readinessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - mysql -h 127.0.0.1 -P 6033 -uuser -ppassword -e "SELECT 1"
          initialDelaySeconds: 10
          periodSeconds: 10
      volumes:
      - name: proxysql-config
        configMap:
          name: proxysql-config
```

実際にコンテナに入って､admin_credentials等の設定がデフォルトの `admin:admin` ではなくファイルを読み込めていることを確認します｡
以下では､DBの内容を書き換えたあともCONFIGからのロードでもとの値が復元できることを確認しました｡

```shell
root@proxysql-0:/# mysql -h 127.0.0.1 -P 6032 -u admin -padmin_creds
Welcome to the MariaDB monitor.  Commands end with ; or \g.
Your MySQL connection id is 65
Server version: 5.7.30 (ProxySQL Admin Module)

Copyright (c) 2000, 2018, Oracle, MariaDB Corporation Ab and others.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

MySQL [(none)]> use main;
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A

Database changed
MySQL [main]> select * from global_variables WHERE variable_name = "admin-admin_credentials";
+-------------------------+-------------------+
| variable_name           | variable_value    |
+-------------------------+-------------------+
| admin-admin_credentials | admin:admin_creds |
+-------------------------+-------------------+
1 row in set (0.001 sec)

MySQL [main]> UPDATE global_variables SET variable_value='admin:new_admin_creds' WHERE variable_name='admin-admin_credentials';
Query OK, 1 row affected (0.001 sec)

MySQL [main]> select * from global_variables WHERE variable_name = "admin-admin_credentials";
+-------------------------+-----------------------+
| variable_name           | variable_value        |
+-------------------------+-----------------------+
| admin-admin_credentials | admin:new_admin_creds |
+-------------------------+-----------------------+
1 row in set (0.001 sec)

MySQL [main]> load ADMIN VARIABLES from config;
Query OK, 2 rows affected (0.000 sec)

MySQL [main]> select * from global_variables WHERE variable_name = "admin-admin_credentials";
+-------------------------+-------------------+
| variable_name           | variable_value    |
+-------------------------+-------------------+
| admin-admin_credentials | admin:admin_creds |
+-------------------------+-------------------+
1 row in set (0.001 sec)
```

## 参考資料

- <https://proxysql.com/documentation/proxysql-cluster/>
- <https://hub.docker.com/r/proxysql/proxysql>

