---
title: "Building a deterministic agent loop in C# 13"
date: 2026-04-29
tags: [.net, harness, code]
---

A walk-through of the agent loop I've been running in production, with the
parts that surprised me marked.
{: .post-lede}

C# 13's primary constructors and `field` keyword make this kind of code
shorter than it used to be. Here's the minimum viable shape of an agent
loop, fully deterministic given a fixed model temperature and a seedable
tool layer.

## The contract

An agent loop, at minimum, is:

```csharp
public interface IAgent
{
    Task<AgentResult> RunAsync(
        AgentRequest request,
        CancellationToken ct = default);
}
```

Everything else is implementation detail. The request carries the seed
context; the result carries the final output plus a trace.

## The loop

```csharp
public sealed class Agent(
    IModelClient model,
    IToolRegistry tools,
    AgentPolicy policy) : IAgent
{
    public async Task<AgentResult> RunAsync(
        AgentRequest request,
        CancellationToken ct = default)
    {
        var trace = new AgentTrace(request.Id);
        var conversation = request.SeedMessages.ToList();

        for (var step = 0; step < policy.MaxSteps; step++)
        {
            ct.ThrowIfCancellationRequested();

            var response = await model.ChatAsync(conversation, tools.Schema, ct);
            conversation.Add(response.Message);
            trace.Record(step, response);

            if (response.Message.ToolCalls is not { Count: > 0 } calls)
                return AgentResult.Final(response.Message.Content, trace);

            foreach (var call in calls)
            {
                var observation = await tools.InvokeAsync(call, ct);
                conversation.Add(ToolMessage.From(call, observation));
                trace.Record(call, observation);
            }
        }

        return AgentResult.Exhausted(trace);
    }
}
```

> **note**
> Determinism comes from three places: (1) `temperature=0` on the model
> client, (2) `tools` deterministic for a given input, and (3)
> `policy.MaxSteps` finite. Drop any one and you've got nondeterminism
> back.

## What surprised me

Three things, in increasing order of how long it took me to notice.

### 1. Tool ordering inside a single turn matters

The loop above iterates tool calls in the order the model returned them.
If a model returns `[search, calculator]` in one turn and the search depends
on a value the calculator produces, you've lost. I've been splitting these
across turns (one tool per response) and getting better behaviour, at the
cost of latency.

### 2. The trace is the product

The thing I wish I'd known on day one: the trace --- not the final answer
--- is what you debug from, what you replay from, what you cache against.
Make it a first-class object from the start. Mine has shape:

```csharp
public sealed record AgentTrace(Guid RunId)
{
    public ImmutableList<TraceEntry> Entries { get; init; } = [];
    public DateTimeOffset StartedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? FinishedAt { get; init; }
}
```

I serialize one of these per run. They're cheap, they replay exactly, and
they're the only way I've found to debug a failed run two weeks later.

### 3. `IAsyncEnumerable` is right, but later

You'll be tempted to make `RunAsync` an `IAsyncEnumerable<TraceEntry>` so
callers can stream. Resist for v1. Streaming complicates cancellation,
cancellation complicates the breaker, the
breaker complicates everything. Ship the `Task<AgentResult>` version first.
Stream when the product team asks for it twice.

> **tip**
> If you're going to expose streaming, do it as a separate `RunStreamingAsync`
> method that internally calls into the same primitives. Keep the simple
> path simple.

## Where this goes

Next post: tool dispatch under contention --- what happens when two agents
in the same harness want the same tool at the same time, and how
deterministic ordering survives.
