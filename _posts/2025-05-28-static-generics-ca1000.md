---
title: "Static + Generics = Trouble? Why Your C# Code Smells and How to Clean It Up"
date: 2025-05-28
tags: [csharp, dotnet, cleancode, programming]
description: "The CA1000 warning explained — why static members on generic types are a problem, and the clean pattern to fix it."
---

So there I was, writing some C# code, minding my own business, when the compiler drops this on me:
{: .post-lede}

> **CA1000: Do not declare static members on generic types**

Let's break it down.

---

## Static + Generics: What's Actually Going On?

You might write something like this:

```csharp
public class SnackBox<T>
{
    public static int SnackCount;
}
```

Seems harmless. But if you use it:

```csharp
SnackBox<string>.SnackCount = 5;
SnackBox<int>.SnackCount = 10;

Console.WriteLine(SnackBox<string>.SnackCount); // 5
Console.WriteLine(SnackBox<int>.SnackCount);    // 10
```

Each version of `T` gets its own static member. You've now got multiple copies of the same state floating around in memory — each one independent, each one a potential source of confusion.

---

## What This Looks Like in Real Code

Here's a common pattern that triggers CA1000 — a specification evaluator:

```csharp
public static class SpecificationEvaluator<T>
    where T : BaseEntity
{
    public static IQueryable<T> GetQuery(IQueryable<T> query, ISpecification<T> spec)
    {
        if (spec.Criteria != null)
        {
            query = query.Where(spec.Criteria);
        }

        return query;
    }
}
```

Looks fine at a glance. But this triggers CA1000 for good reason:

- You now have a separate static class per type — `SpecificationEvaluator<Product>`, `SpecificationEvaluator<Order>`, etc.
- That increases memory usage
- It's harder to call — you have to specify the type every time
- The compiler is quietly judging you

---

## The Fix: Static Class, Generic Method

Move the generic parameter from the class to the method:

```csharp
public static class SpecificationEvaluator
{
    public static IQueryable<T> GetQuery<T>(IQueryable<T> query, ISpecification<T> spec)
        where T : BaseEntity
    {
        if (spec.Criteria != null)
        {
            query = query.Where(spec.Criteria);
        }

        return query;
    }
}
```

Call it like:

```csharp
var result = SpecificationEvaluator.GetQuery(products, productSpec);
```

- No generic class instantiations
- Cleaner call-site syntax
- CA1000 gone

---

## Summary

| Don't do this | Do this instead |
|---------------|-----------------|
| `static class MyHelper<T>` | `static class MyHelper` |
| Static method inside generic class | Generic static method inside static class |
| One copy of state per `T` | One reusable method for all types |
| CA1000 warning | No warning, no surprises |

---

> Static classes are like toolboxes. You don't need a separate toolbox for every kind of screw.

Have you encountered CA1000 before? I'd love to hear how you resolved it.
