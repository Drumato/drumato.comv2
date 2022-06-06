---
title: "Figure out my technical inabilities"
description: "Introducting my technical inabilities briefly."
createdAt: "2021-09-20"
tags: ["essay"]
imageLink: "/Drumato.png"
---


{{< table_of_contents >}}  

> If you feel hard to read the sentences as below,  
> I prefer you to translate [the corresponding article](https://drumato.com/ja/posts/figure-out-my-technical-inabilities) to it.  

My hiring date have been get closer slowly, but certainly.  
I'm looking forward to reach the day,  
because I want to know how my abilities perform in the real world.

Accordingly, I wanted to know the technical abilities that now I have exactly.
So today I'll recap the abilities of mine briefly.
especially, I set today's important goal to figure out the inabilities to operate/develop/handle.
To confess my own disadvantages takes a little bit courages, but maybe it's important.  

Some of my weaknesses are omitted because maybe the enumeration never ends :(

## Git

I can't execute Git command rapidly cuz I'm scared if the command's execution fails.  
everytime I open the Git reference, validates the effect carefully, and finally I execute.  
so I can't say I'm good at using Git ably.  

Next, I quite roughly use `git checkout` command.  
I can't explain the command behavior in detail.  

I don't really use the `git merge` command.  
Usually I branch from `remote/main` and switch to `local/feature` and push it to remote.  
So the history of the branch is slightly dirty.  
maybe I prefer to use the `local/feature-dev` branch and merge it to `local/feature`.  
this method cleans the history of the branch more than the previous method.  

And I have no experiences of the `bisect` command.  

Finally, I don't know how Git works internally.  
what are inside of commit/branch/blob object, and how are these processed with Git commands?  
How I use the low-level API commands of Git?  

I don't configure git configurations in detail.  
Should I write a script for switching multiple configs?  
maybe I should use local config in a repository.  

## Web programming

First, I have no experiences about all of web development.  
This site( <https://www.drumato.com> ) is built with Hugo, an SSG.  
Hugo is so kind for beginners, because I could set up this site easily.

So if someone requests the login feature of web application to me, I confuse.  

- how the login feature is implemented in the real world?
- what is the best way to program the feature in secure/robust?
- are there any best-practicies for implementing a login feature?

Let's see the difference btw web development and compiler development(I used to develop).  

- compiler dev
  - already I know how tokenizer/parser/semantics analyzer/IR generator is constructed commonly
  - and I had developed it more than once
- web development
  - maybe I should take a tutorial or something for getting started  

Finally, I think this is the most weakness of mine,  
I don't know how to develop the web application incrementally.  
for examples, if I start to develop an compiler,  
I add a feature that generates an assembly of `return 42`.  
Is it able to do this in web development?  
First I should know how to snowball the web application.  

## Programming Language Processor

I'm not good at optimization's methods.  
I had read dragon book/tiger book/etc,  
so I can explain the elementary optimization (e.g. data-flow analysis/constant folding) briefly.  
but I can't discuss the algorithm and correctness formally.  

I've never read the papers of compiler design/theory/etc.  
I don't know set theory, predicate logic, category theory, etc.  
I can't discuss the formal definition of dependent types/refinement types/parametric polymorphism.  

I've only developed LL parser.  
So I don't know how to implement an LR/LALR parser from scratch.  

I don't know how a lexer generator(e.g. flex) works correctly.  
I know it behaves like a regex engine.  
It parses regex, construct NFA, and compiles it to DFA, and generate a lexer that verifies an input is matched to the DFA.  
but why it works? how efficient? what is the comparison to hand-written lexer?  

Oops, I've forgot the important one, the interpreter.  
there are no interpreters in my repositories.  
what are the interpreter's optimizations they often used?  
I know one method, called "stack caching", because [one of my friends(arbitrarily I call him)](https://twitter.com/m421m0) develops a fast VM interpreter that executes program written in the his language.  

I've only developed an interpreter what walks an AST and just inteprets the semantics the tree has.  
It's just like the [Monkey](https://interpreterbook.com/).  

## Network

Network area is one of my current interested things, so I come up with some inabilities of mine.  

First, I've never designed any networks even if a network is tiny.  
so I don't have any tips such as below.  

- best way to aggregate routes in a datacenter
- what is the best capacity of iBGP RR
  - how much is the performance deadline of iBGP full-mesh peering

Next, my reading speed to read RFCs is too slow more than I expected.  
it's caused by the poor of my English skills.  

And my trouble shooting is slow.  
I start to try the packet capturing from the sender node, and look at all nodes one by one.  
I should grow the sense of network troubles.  

## conclusion

Today I recapped the skills they I don't have yet.  
I'll hope this post encourages when I join the company I'm hired.  
