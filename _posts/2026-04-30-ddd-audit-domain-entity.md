---
title: "I Thought My Domain Entity Was Fine. A DDD Audit Said Otherwise."
date: 2026-04-30
tags: [ddd, dotnet, architecture, cleancode]
description: "My Flag entity had private setters, behavior methods, timestamps — all the right signals. Then I ran a DDD audit and found out it was a database row wearing a domain costume."
---

I'm building **Banderas**, an open-source feature flag management system for .NET teams on Azure. A few weeks in, I had a working API — CRUD endpoints, evaluation logic, integration tests, the works. Phase 1 was done.
{: .post-lede}

My entity bugged me. It just didn't look right. As I continue to study DDD, my eyes have started seeing things.

Then I ran a DDD audit on my core domain entity, `Flag.cs`. What I found was uncomfortable and illuminating: my entity wasn't really a domain entity. **It was a database row wearing a domain costume.** This post is about what I found, why it mattered, and how I'm fixing it.

---

## What I Started With

Here's the original `Flag.cs`, simplified slightly:

```csharp
public class Flag
{
    public Guid Id { get; private set; }
    public string Name { get; private set; }
    public EnvironmentType Environment { get; private set; }
    public bool IsEnabled { get; private set; }
    public bool IsArchived { get; private set; }
    public bool IsSeeded { get; private set; }
    public RolloutStrategy StrategyType { get; private set; }
    public string StrategyConfig { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
    public DateTime? ArchivedAt { get; private set; }

    public void SetEnabled(bool enabled) { ... }
    public void UpdateStrategy(RolloutStrategy strategyType, string? strategyConfig) { ... }
    public void Update(bool isEnabled, RolloutStrategy strategyType, string? strategyConfig) { ... }
    public void Archive() { ... }
}
```

On the surface, it looks fine. Private setters, behavior on the entity, timestamps — all the right signals. But when I started asking DDD questions, problems surfaced quickly.

---

## Problem 1: `StrategyConfig` Is a Trust Exercise

The `StrategyConfig` property is a raw JSON string. Its default value is `"{}"`. That means this is completely legal:

```csharp
flag.UpdateStrategy(RolloutStrategy.Percentage, "{}");
```

A percentage rollout with no threshold defined. The entity accepts it without complaint. Nothing breaks until runtime, when downstream code tries to deserialize the threshold and gets nothing.

In DDD terms, this violates a core principle: **make illegal states unrepresentable**. The entity's job is to protect its own consistency. `Flag` was not doing that job.

The fix is to replace the raw string with typed Value Objects:

```csharp
public sealed class PercentageConfig
{
    public int Threshold { get; }

    public PercentageConfig(int threshold)
    {
        if (threshold < 0 || threshold > 100)
            throw new ArgumentOutOfRangeException(nameof(threshold),
                "Threshold must be between 0 and 100.");

        Threshold = threshold;
    }
}
```

Now invalid state can't be constructed. The type system enforces the rule — not a validator somewhere downstream.

---

## Problem 2: `IsSeeded` Has No Business Being Here

```csharp
public bool IsSeeded { get; private set; }
```

This flag tells the system whether a record was inserted by the database seeder. It's an infrastructure concern sitting in the middle of a domain entity.

Its presence created a rule we had to document explicitly: *"`IsSeeded` must never appear on any DTO or API response."*

That rule exists because `IsSeeded` is in the wrong place. If it lived in the infrastructure layer where it belongs, the rule would be unnecessary — the property couldn't leak to the API because the domain entity wouldn't have it.

**The documented rule was a symptom. The misplaced property was the disease.**

---

## Problem 3: The Archive Method Doesn't Enforce Its Own Invariant

```csharp
public void Archive()
{
    IsArchived = true;
    ArchivedAt = DateTime.UtcNow;
    UpdatedAt = DateTime.UtcNow;
}
```

Nothing stops you from calling `Archive()` on an already-archived flag. Nothing stops you from calling `SetEnabled(true)` on an archived flag. Archived is supposed to be a terminal state — once a flag is archived, it's frozen. But the entity doesn't enforce that.

The fix is a guard clause at the top of every mutating method:

```csharp
public void Archive()
{
    if (IsArchived)
        throw new FlagDomainException("Cannot archive a flag that is already archived.");

    IsArchived = true;
    ArchivedAt = DateTime.UtcNow;
    UpdatedAt = DateTime.UtcNow;
}
```

Note: `FlagDomainException` is not `ArgumentException` or `InvalidOperationException`. It's a domain exception — a type that lives in the domain layer and speaks the language of business rules. The distinction matters when you're debugging at 2am.

---

## Problem 4: The API Surface Is Confusing

`Flag` exposes three overlapping methods for state changes:

```csharp
public void SetEnabled(bool enabled) { ... }
public void UpdateStrategy(RolloutStrategy strategyType, string? strategyConfig) { ... }
public void Update(bool isEnabled, RolloutStrategy strategyType, string? strategyConfig) { ... }
```

`Update()` does what the other two do together, atomically. So you can change enabled state and strategy either as one operation or as two separate calls — with no domain rule telling you which to use or when.

This is what DDD practitioners call **API confusion** — the entity is offering multiple paths to the same state change with no clear intent. The caller has to make an architectural decision that the domain should be making.

The right approach is to separate by *concern*, not by *field*. Name changes are a distinct business operation. Rollout configuration changes are another. You don't need three methods covering overlapping ground.

---

## Problem 5: The Wrong Aggregate Boundary

This was the finding that surprised me most.

`Flag` in Banderas looks like this:

```csharp
public EnvironmentType Environment { get; private set; }
public bool IsEnabled { get; private set; }
public RolloutStrategy StrategyType { get; private set; }
```

One flag. One environment. One strategy. If you want the same flag in both Production and Staging, you need **two rows in the database** — two separate `Flag` entities that happen to share a name.

That's not a flag with two environments. That's two flags.

Compare that to how a mature feature flag platform structures the same concept:

```json
{
  "name": "Alternate product page",
  "kind": "boolean",
  "variations": [
    { "value": true,  "name": "true" },
    { "value": false, "name": "false" }
  ],
  "environments": {
    "production": {
      "on": true,
      "rules": [],
      "fallthrough": { "rollout": {} }
    },
    "staging": {
      "on": false,
      "rules": [],
      "fallthrough": { "variation": 1 }
    }
  }
}
```

The flag is a **definition** — name, variations, metadata. The behavior of that flag is **environment-specific configuration**. One flag entity, multiple environment configurations. Same concept in Production and Staging, completely independent behavior in each.

In Banderas, a `Flag` *is* an environment. It should *have* environment configurations.

---

## Fixing the Aggregate Boundary

The DDD solution is to split `Flag` into two distinct aggregates.

**`Flag` — pure definition:**

```csharp
public class Flag
{
    public Guid Id { get; private set; }
    public string Name { get; private set; }
    public string? Description { get; private set; }
    public IReadOnlyList<string> Tags { get; private set; }
    public IReadOnlyList<Variation> Variations { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime UpdatedAt { get; private set; }
}
```

**`FlagEnvironmentConfig` — per-environment behavior:**

```csharp
public class FlagEnvironmentConfig
{
    public Guid Id { get; private set; }
    public Guid FlagId { get; private set; }   // reference by ID only
    public EnvironmentType Environment { get; private set; }
    public bool IsEnabled { get; private set; }
    public bool IsArchived { get; private set; }
    public IReadOnlyList<TargetingRule> Rules { get; private set; }
    public Fallthrough Fallthrough { get; private set; }
    public DateTime? ArchivedAt { get; private set; }
}
```

Notice `FlagId` is a `Guid`, not a navigation property. **Aggregates reference each other by ID only** — never by object reference. This enforces the boundary. `FlagEnvironmentConfig` knows a `Flag` exists, but can't reach across the boundary and mutate it.

These two aggregates also get their own repositories: one for flags, one for environment configs. Independent persistence, independent consistency boundaries.

---

## Lessons Learned — DDD Edition

**1. Make illegal states unrepresentable.**
If bad data can be constructed, it will be. Design your types so that invalid state literally cannot exist. Value Objects validate at construction and are immutable after that.

**2. A documented workaround is a symptom.**
Every time you write a rule like "this field must never appear in the API response," ask yourself why the field is there at all. The rule is usually telling you something is in the wrong layer.

**3. Aggregates are about consistency boundaries, not object containment.**
Two things belong in the same aggregate only if they must coordinate to stay consistent. If they're independent, make them separate aggregates.

**4. Aggregates reference each other by ID only.**
Never hold a navigation reference across an aggregate boundary. A `Guid` is a reference. An object reference is a dependency.

**5. Reference production systems.**
Looking at how others model a domain didn't give me the answer — it gave me the right *questions*. Good systems teach you what problems look like when they're solved.

**6. Refactor the model before the codebase grows.**
Every week you wait, the rigid model grows more calluses — more code that works around the problem instead of solving it. The right time to fix the domain model is before the next phase, not after.

---

If you're building something on .NET and working through similar DDD questions, I'd genuinely love to hear how you're approaching it.
