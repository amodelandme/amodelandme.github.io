---
title: "Why your AI harness needs a circuit breaker"
date: 2026-05-22
tags: [harness, ai-engineering, patterns]
---

Multi-agent systems fail in correlated ways. One bad tool call cascades into
twenty retries, and the bill arrives Monday. A pattern from electrical
engineering, ported badly into software.
{: .post-lede}

The first time I shipped a multi-agent harness to anything resembling
production, it took out our OpenAI quota in ninety seconds. Not because the
prompts were expensive --- they weren't --- but because one agent's tool call
returned malformed JSON, the planner agent retried, and the supervisor
cheerfully scheduled the same broken plan eight more times.

The fix is older than I am. It's borrowed wholesale from electrical
engineering: a circuit breaker. When the same failure pattern repeats,
stop. Open the circuit. Let the system cool down before you try again.[^1]

## A naive first attempt

My first cut was an `int _failures` field on the harness root. After three,
throw. It worked for about a day.

```csharp
// don't do this
public class NaiveBreaker
{
    private int _failures = 0;

    public async Task<T> InvokeAsync<T>(Func<Task<T>> op)
    {
        if (_failures >= 3)
            throw new CircuitOpenException();
        try { return await op(); }
        catch { _failures++; throw; }
    }
}
```

> **note**
> A counter without a half-open state isn't a circuit breaker — it's a kill
> switch. The system never recovers on its own.

The real pattern has three states: **closed** (normal), **open** (failing
fast), and **half-open** (cautiously probing). The transition between them is
the entire trick.

## The three states

| State       | What's happening                                | Transition out                          |
|:------------|:------------------------------------------------|:----------------------------------------|
| Closed      | Calls flow through. Failures are counted.       | Failure threshold → **Open**            |
| Open        | Calls fail fast without invoking the dependency. | Cooldown elapses → **Half-Open**        |
| Half-Open   | One probe call is allowed.                      | Probe succeeds → **Closed**, fails → **Open** |

The math for the cooldown matters more than I expected. Linear backoff is
wrong for AI harnesses --- model providers tend to recover in bursts. I've
been running an exponential with jitter:

$$ t_{cooldown} = \min\left(t_{max},\; t_{base} \cdot 2^{n}\right) \cdot \big(1 + U(-0.2, 0.2)\big) $$

where $n$ is the number of consecutive open transitions. The jitter prevents
a thundering herd when many breakers reopen simultaneously --- a real failure
mode if you're running parallel agents that share a downstream tool.

## Implementation in C# 13

A working version, with the half-open state and an injectable clock for
testing:

```csharp
public sealed class CircuitBreaker(
    int failureThreshold = 5,
    TimeSpan? cooldown = null,
    TimeProvider? time = null)
{
    private readonly TimeSpan _cooldown = cooldown ?? TimeSpan.FromSeconds(30);
    private readonly TimeProvider _time = time ?? TimeProvider.System;
    private readonly Lock _gate = new();

    private int _failures;
    private CircuitState _state = CircuitState.Closed;
    private DateTimeOffset _openedAt;

    public async Task<T> InvokeAsync<T>(
        Func<CancellationToken, Task<T>> op,
        CancellationToken ct = default)
    {
        EnsureCanProceed();
        try
        {
            var result = await op(ct).ConfigureAwait(false);
            OnSuccess();
            return result;
        }
        catch when (!ct.IsCancellationRequested)
        {
            OnFailure();
            throw;
        }
    }

    private void EnsureCanProceed()
    {
        lock (_gate)
        {
            if (_state is CircuitState.Open)
            {
                if (_time.GetUtcNow() - _openedAt < _cooldown)
                    throw new CircuitOpenException();
                _state = CircuitState.HalfOpen;
            }
        }
    }

    private void OnSuccess()  { lock (_gate) { _failures = 0; _state = CircuitState.Closed; } }
    private void OnFailure()
    {
        lock (_gate)
        {
            _failures++;
            if (_failures >= failureThreshold || _state is CircuitState.HalfOpen)
            {
                _state = CircuitState.Open;
                _openedAt = _time.GetUtcNow();
            }
        }
    }
}

public enum CircuitState { Closed, Open, HalfOpen }
public sealed class CircuitOpenException : Exception;
```

A few notes on this version:

- The `Lock` type is the C# 13 named lock. Reads and writes to the state
  fields are short, so a single lock is fine; if you're seeing contention,
  you've got bigger problems than the breaker.
- `TimeProvider` is injectable so the test suite can advance time
  deterministically. Don't use `DateTime.UtcNow` directly --- you'll regret it.
- `ConfigureAwait(false)` because this is library-ish code.

> **tip**
> In production, prefer **Polly's** `ResiliencePipelineBuilder` with
> `AddCircuitBreaker`. The above is for teaching --- Polly handles the edges
> (timeouts inside the breaker, isolation between breakers, telemetry) that
> a hand-rolled version misses.

## Tuning the thresholds

Three knobs, in order of how often I touch them:

1. **Failure threshold.** Start at 5 for chatty providers, 3 for ones you
   pay per call. Lower for cold paths.
2. **Cooldown base.** 10s is fine for most providers; 30s if you're seeing
   rate-limit-and-recover patterns.
3. **Sliding window vs. consecutive count.** Consecutive is simpler and
   surprisingly good. Switch to a sliding window only if you're seeing
   intermittent failures that should trip the breaker but don't.

> **warn**
> Don't share a single breaker across logically distinct dependencies. One
> bad tool shouldn't blackhole the entire agent. Scope breakers to the
> narrowest unit that makes sense --- usually `(tool_id, provider)`.

## What it doesn't fix

Circuit breakers stop cascades; they don't stop bad plans. If your agent is
asking the wrong question, the breaker will dutifully stop you from asking
it twenty times --- and then the agent will pick the next-most-confident
question and keep going. That's a separate problem, and a more interesting
one. I'll write it up next.

[^1]: Michael Nygard, *Release It!* (2007). The book that put this pattern
      in front of a generation of services engineers. The original Hystrix
      docs at Netflix are also worth reading; the project itself is retired
      but the concepts hold.
