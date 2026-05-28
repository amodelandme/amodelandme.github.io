---
title: "IEnumerable vs IReadOnlyList in .NET: When Should You Use Each?"
date: 2025-05-23
tags: [dotnet, csharp, collections]
description: "Both let you work with a set of items in a read-only way. So when should you use each? A breakdown with real-world examples."
---

If you're working in C# and .NET, you'll quickly run into different collection interfaces like `IEnumerable<T>` and `IReadOnlyList<T>`. At first glance they seem pretty similar — both let you work with a set of items in a read-only way. So when should you use each?
{: .post-lede}

---

## Quick Definitions

**`IEnumerable<T>`** — the simplest way to represent a sequence of items you can iterate over (with `foreach`). It doesn't let you access by index or get the count directly.

**`IReadOnlyList<T>`** — represents a read-only list of items. You can access items by index and get the count, but you can't change the collection.

---

## Code Examples

### Using `IEnumerable<T>`

```csharp
public IEnumerable<string> GetAllProductNames()
{
    // Could return from a database query, LINQ, etc.
    return products.Select(p => p.Name);
}

// Usage
foreach (var name in GetAllProductNames())
{
    Console.WriteLine(name);
}
```

When to use:

- When you only need to iterate over the items
- When the results might be streamed, generated, or filtered on-the-fly
- When you don't need to know the exact count or item positions

---

### Using `IReadOnlyList<T>`

```csharp
public IReadOnlyList<Product> GetFeaturedProducts()
{
    return featuredProducts.AsReadOnly();
}

// Usage
var products = GetFeaturedProducts();
for (int i = 0; i < products.Count; i++)
{
    Console.WriteLine($"{i}: {products[i].Name}");
}
```

When to use:

- When you need to access items by index (`list[0]`)
- When you want to expose the count (`list.Count`)
- When you want to guarantee the collection is fixed and can't be changed by the consumer

---

## Comparison

| Feature | `IEnumerable<T>` | `IReadOnlyList<T>` |
|---------|------------------|--------------------|
| `foreach` | ✅ | ✅ |
| Access by index | ❌ | ✅ |
| Get count | ❌ | ✅ |
| Read-only contract | ❌ (just iterates) | ✅ |
| Deferred execution | ✅ (often) | ❌ (usually materialized) |

---

## How to Decide

**Use `IEnumerable<T>`** when you want to keep things simple, just need to loop, or want to allow streaming of results.

**Use `IReadOnlyList<T>`** when you want the safety and convenience of a fixed, read-only list that exposes both count and index-based access.

### Real-world examples

**Repository pattern**
- `IEnumerable<T>` for large datasets you want to stream or filter on demand
- `IReadOnlyList<T>` for methods returning a fixed result set (e.g., top 10 products)

**API responses**
- `IReadOnlyList<T>` to return a clear, fixed collection — helps with serialization and contracts
- `IEnumerable<T>` internally when chaining LINQ queries

---

## Quick tip for juniors

- If you want to let others loop through your data → `IEnumerable<T>`
- If you want to let others see the count and access by index, but not modify anything → `IReadOnlyList<T>`
