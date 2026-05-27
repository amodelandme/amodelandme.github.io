---
title: "Multi-agent orchestration is just distributed systems with worse error messages"
date: 2026-05-14
tags: [multi-agent, complexity, distributed-systems]
---

Every "multi-agent framework" I've used eventually rediscovers a paper from
1985. Sometimes badly. Here's a tour of what the field has been calling new
that isn't.
{: .post-lede}

I spent last weekend reading the changelogs of four popular multi-agent
frameworks. Three of them shipped, in the same quarter, a feature they each
called something different but which was, structurally, a vector clock.[^1]
One of them had a tutorial blog post explaining the design as "novel." It is
not novel. It is from 1978.

This isn't a complaint. It's an observation about where the field is: we are
collectively re-deriving the entire distributed systems literature, with
language-model latency added.

## The same problems, slightly relabelled

A short table of correspondences I keep on my desk:

| Multi-agent thing                        | Distributed systems thing             |
|:-----------------------------------------|:--------------------------------------|
| Agent loop                                | Event loop / actor                    |
| Tool dispatch                             | RPC                                   |
| Shared memory / blackboard                | Distributed cache                     |
| "Plan revision"                           | Optimistic concurrency control        |
| Supervisor agent                          | Cluster coordinator (Raft, Zab, …)    |
| "Long-term memory"                        | Replicated log + materialised views   |
| Hand-off                                  | Message passing with explicit channels |

The mapping is not 1:1. Some of these have genuinely new properties because
agents are non-deterministic in ways processes are not. But the *shape* of
the problems --- ordering, consistency, recovery, partial failure --- is
identical.

## Three orderings

A worked example: ordering. Suppose two agents both update the shared
blackboard concurrently. Which write wins?

Three answers, each with a long history outside AI:

```text
1. Last-write-wins                   ← lossy; fine for caches, never for plans
2. Lamport timestamps                ← logical clock; orders causally-related events
3. CRDT (e.g., G-Counter, OR-Set)    ← order doesn't matter; merge is deterministic
```

I've watched a popular framework reinvent option 1 (silent overwrites), get
burned, ship option 2 (calling it "agent-aware versioning"), get burned
again on concurrent merges, and finally land on option 3 (calling it
"convergent state"). The cycle took eight months. The original paper is from
*1986*.[^2]

> **note**
> If you're building a harness, read the CRDT survey by Shapiro et al.
> *before* you implement your shared-memory layer. It is genuinely much
> harder to retrofit consistency than to start with it.

## What's actually new

Some things really are new:

- **The dependency is non-deterministic.** RPC to a service returns the
  same answer for the same input (modulo state). RPC to an LLM does not.
  This breaks retry semantics in subtle ways --- a "deterministic retry"
  isn't.
- **The cost model is bizarre.** Latency you can model; per-token cost
  with caching makes the "is this retry free?" question much harder.
- **State is partially in natural language.** You cannot diff two
  agents' worldviews with `git diff`. You can with embeddings,
  approximately, but the tooling is bad.

These deserve their own literature. But the other 80% is just systems
engineering done in a louder room.

## What to read

If you only read three things before writing your next harness:

- Lamport, *Time, Clocks, and the Ordering of Events in a Distributed
  System* (1978). The original.
- Shapiro et al., *A comprehensive study of Convergent and Commutative
  Replicated Data Types* (2011). The CRDT survey.
- Nygard, *Release It!* (2007). Failure modes. The circuit-breaker
  chapter alone is worth the cover price.

I'm not against frameworks. I'm against pretending we're inventing what
we're rediscovering.

[^1]: A vector clock is a list of per-process counters that lets you
      establish a partial ordering of events in a distributed system. If
      that sentence sounds like every "agent context" feature you've seen
      shipped in 2025, you understand my point.

[^2]: Strictly: the foundational CRDT-ish work is from 1986 (Wuu &
      Bernstein on a replicated dictionary); the modern formalization is
      Shapiro et al. (2011).
