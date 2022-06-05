---
title: "Kubectl Plugin Builder"
description: ""
createdAt: "2021-12-06"
tags: ["kubernetes", "go", "kubectl"]
imageLink: "/Drumato.png"
---

- [Background](#background)
- [What is kubectl plugin](#what-is-kubectl-plugin)
  - [How to develop a new plugin](#how-to-develop-a-new-plugin)
- [Issues they are appeared by using Go](#issues-they-are-appeared-by-using-go)
- [kubectl-plugin-builder](#kubectl-plugin-builder)
- [Conclusion](#conclusion)
- [References](#references)

As you know Kubernetes provides many extensibilities to users.
These extensibilities are explained in [the official docs](https://kubernetes.io/docs/concepts/extend-kubernetes/).  

- Custom Controller
- CRD
- Admission Webhook
- Kubernetes Scheduler Plugin
- CNI Plugin

In the same way, **kubectl** that is used by almost k8s operators, provides an extensibility to us.
That is called **kubectl plugin**, we use the extensibility and utilize our operations.  

In this post I'll describe you the overview of kubectl plugin.
I'll take up some subject about kubectl plugin,
and finally I'll introduce my project that is called **kubectl-plugin-builder**.  

---

## Background

## What is kubectl plugin

kubectl plugin is just an executable.
A executable can be a kubectl plugin when it is located in a directory that kubectl can recognize.
the executable's name must follow a naming convension(`kubectl-*`).
The official docs introduces us to implement a kubectl plugin by using shell script.
I think kubectl plugin has some merits but I think the most merit for k8s operators is **uniformity**.
we unify k8s operations among kubectl and its plugins.
we can check installed plugins using `kubectl plugin list`.  

There is a famous plugin called **[postfinance/kubectl-ns](https://github.com/postfinance/kubectl-ns)**.
[kubernetes/sample-cli-plugin](https://github.com/kubernetes/sample-cli-plugin) takes the concept.
And [awesome-kubectl-plugins](https://github.com/ishantanu/awesome-kubectl-plugins) introduces the plugin.
This plugin manages the namespace context in a kubeconfig.
I think kubectl plugin should follow one principle, **"One Plugin Does One Thing"** like this.  

### How to develop a new plugin

I described in above, a kubectl plugin is just an executable.
we can develop plugins whatever we use shell script/Python/Go as programming language.
For now I focus one subject **"My thought abount implementing kubectl plugins in best practices"**
I'll strongly recommend you to use Go and its CLI application builder like [spf13/cobra](https://github.com/spf13/cobra).
There are 3 reasons.  

First, the biggest concern for kubernetes operators is **Simplifying kubernetes operations**.
they don't want to waste time about how to construct a new plugin.
It means **even if you develop a tiny plugin you should use scalable programming languages.**  

Second, almost kubernetes ecosystems adopt Go. Core components(kube-apiserver/kube-scheduler/kubectl) are also.
So Kubernetes engineers are close to Go.
A plugin should be easy to understand when A newbie join to kubernetes operation team.
This merit comes up with one idea that recommend us to use a mainstream programming language.  

Last, almost famous kubectl plugins are written in Go actually.
Moreover they're constructed with cobra.
Development of kubectl plugin depends each case so there are few documents in the internet I think.
but almost implementations of plugins are published.  

## Issues they are appeared by using Go

You need some boilerplates to implement a kubectl plugin by using Go.  

- initialization client-go
- initialization cli-runtime
  - for using common CLI flags(e.g. `-n/--namespace`)
- follows the practical ways
  - `Complete/Validate/Run` model

And we know some issues about development api client.
how we develop it as testable/maintainable/simple?

---

## kubectl-plugin-builder

So I referenced kubebuilder's philosophy and achievements,
and developed a builder that helps our plugin developments.
It's already published at [GitHub](https://github.com/Drumato/kubectl-plugin-builder).
You can see the brief introduction [here](https://github.com/Drumato/kubectl-plugin-builder/blob/main/docs/introduction.md).
There are some features.  

- initializes a new plugin project
- constructs a cli application architecture from yaml declaratively
  - flag
  - command alias
- add a new command definition to the yaml
- controls the plugin's output-format

The implementation consists of few thousand LoC so it's easy to understand.

---

## Conclusion

Today I introduced some concerns about kubectl plugins and kubectl-plugin-builder.
Please play with it and share your experiences with me!  

## References

- [Extend kubectl with plugins](https://kubernetes.io/docs/tasks/extend-kubectl/kubectl-plugins/)
