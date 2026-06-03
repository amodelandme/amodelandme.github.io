---
title: "Harness Engineering Series [3]: The 2 Axes of Harness Design"
date: 2026-05-30
tags: [ai, agentharness, controltheory, softwarearchitecture, devops]
description: "Last post established that your harness is a controller. This post is about
*what kind* of control you're applying — and the most common failure is
applying only half of it."
---

> *"Separately, you get either an agent that keeps repeating the same
> mistakes, or an agent that encodes rules but never finds out whether they
> worked."*
> — Birgitta Böckeler, martinfowler.com

Last post established that your harness is a controller. This post is about
*what kind* of control you're applying — and the most common failure is
applying only half of it.

Teams add an `AGENTS.md` full of conventions and call it done. Or they bolt
on a linter that runs after the agent commits and call *that* done. Then they
wonder why the agent keeps making the same class of mistake. The reason is
that effective control needs *two things working together across two
dimensions.* Miss either and you have half a harness.

---

### Axis 1: Direction — Feedforward and Feedback

These are control-theory terms. We're using them on purpose.

**Feedforward controls (Guides)** act *before* the agent does anything. They
raise the odds it gets things right the first time. Examples: `AGENTS.md`
conventions, skill files, reference docs, how-to guides, prompt templates,
bootstrap scripts. In control terms: you're anticipating a known disturbance
and pre-compensating for it.

**Feedback controls (Sensors)** act *after* the agent produces output. They
observe what happened and let the agent self-correct. Examples: test suites,
linters, type-checkers, architectural fitness functions, LLM-as-judge review.
In control terms: you're measuring the actual output and computing error.

These aren't optional complements — they're a **circuit**:

```
   FEEDFORWARD                                    FEEDBACK
   (act before)                                  (act after)
       │                                             ▲
       ▼                                             │
   ┌────────┐        ┌───────────┐         ┌──────────────┐
   │ guides │ ─────► │   AGENT   │ ──────► │   sensors     │
   └────────┘        └───────────┘  output └──────────────┘
                          ▲                        │
                          └────────────────────────┘
                            self-correction prompt
```

> **Feedforward without feedback is hope. Feedback without feedforward is
> nagging. You need the whole loop.**

The single most powerful feedback design trick: **optimize sensor output for
the model, not the human.** A lint error that says `line 47: function too
long` is written for a developer. A lint error that says `line 47: function
too long — extract the validation logic into a separate pure function per
project conventions` is written for an LLM. The second can feed straight back
into the loop as a self-correction prompt. That's a positive form of prompt
injection — one you designed on purpose. (In control terms: you're shaping
the *error signal* so the controller can act on it directly.)

---

### Axis 2: Execution Type — Computational and Inferential

**Computational controls** are deterministic and fast — run by the CPU.
Tests, linters, type-checkers, ArchUnit-style structural analysis, complexity
metrics. Milliseconds, reliable, nearly free to run on every change.

**Inferential controls** are semantic — run by a GPU. LLM-as-judge review,
AI architecture audits, "janitor" agents scanning for drift. Slower, pricier,
non-deterministic. But they render judgments no linter ever could: *"this
solves the wrong problem," "this abstraction will hurt in three months," "the
author misunderstood the requirement."*

Cross the two axes and you get the full design space:

```
                 FEEDFORWARD (before)          FEEDBACK (after)
               ┌───────────────────────────┬───────────────────────────┐
 COMPUTATIONAL │ LSP, codemods, type        │ Tests, linters,           │
 (deterministic)│ system, bootstrap         │ type-check, structural    │
               │ scripts                    │ fitness functions         │
               ├───────────────────────────┼───────────────────────────┤
 INFERENTIAL   │ AGENTS.md, skills,         │ LLM-as-judge review,      │
 (LLM-based)   │ ref docs, how-to guides,   │ semantic dup detectors,   │
               │ coding conventions         │ drift agents              │
               └───────────────────────────┴───────────────────────────┘
                          │                            │
                          ▼                            ▼
                  ┌──────────────────────────────────────┐
                  │              THE AGENT                │
                  │       (model + tools + context)       │
                  └──────────────────────────────────────┘
                          ▲     self-correction loop     │
                          └──────────────────────────────┘
            HUMAN steers by iterating on guides & sensors
```

That bottom line is the whole job, so let's name it.

---

### The Steering Loop (Your New Job Title)

Your role in this system is to **steer the harness** — not to fix individual
agent outputs, but to fix the *system that produces outputs.*

The rule of thumb: when the agent makes a mistake **once**, you correct it.
When it makes the same class of mistake **twice**, you update the harness —
add a feedforward guide that prevents it, or a feedback sensor that catches
it. The goal is to drive the *repeat-occurrence rate* of each failure class
to zero through infrastructure, not vigilance.

Concretely:

- It didn't know a naming convention → add it to `AGENTS.md` (feedforward).
- It ran a destructive command → add a hook that blocks it (feedback).
- It got lost in a 40-step task → restructure as planner/executor (topology).
- It kept "finishing" broken code → wire a type-check backpressure signal
  into the loop (feedback).

None of those fixes needed a smarter model. They needed a better controller.

This is the cybernetic move in its purest form: **you don't chase the output,
you redesign the loop that produces it.** Wiener would recognize it instantly.

---

### Three Categories of Regulation (Easy → Impossible)

It helps to name *what* you're regulating, because the difficulty varies
enormously.

**Maintainability harness** — internal code quality: naming, structure,
complexity, duplication, coverage. *The easy category.* Decades of tooling.
Computational sensors catch the structural stuff reliably; inferential
sensors partially catch the semantic stuff (redundant tests, brute-force
fixes, over-engineering) — expensive and probabilistic but useful.

**Architecture fitness harness** — checking that architectural properties
hold: module boundaries, dependency directions, performance envelopes,
security constraints, observability standards. This connects directly to
**fitness functions** from *Building Evolutionary Architectures* (Ford,
Parsons, Kua, 2017) — executable architectural rules that fire automatically
when the system drifts from its intended shape. A fitness function is just a
sensor with an architectural setpoint.

**Behaviour harness** — does the software actually *do what was asked?* *The
hardest category,* and honest practitioners call it "the elephant in the
room." Most teams currently verify behavior with AI-generated tests, which is
circular — you're using the agent's output to verify the agent's output. We
don't have a clean answer. (Hold this thought; Post 7 is where it bites.)

---

### Historical Context: Ashby's Law and Why Topology Matters

Remember Ashby's **Law of Requisite Variety** from Post 1? Here's where it
pays off. *A regulator must possess at least as much variety as the system it
governs — otherwise some states are unregulable.*

Applied to harnesses: if your agent can produce *anything* (near-infinite
variety), a harness with a handful of rules cannot govern it. You're a
one-switch thermostat trying to regulate a ten-zone building. One practical
response is **variety reduction** — shrink what the agent is *allowed* to
produce. Commit to a topology ("CRUD API on .NET," "event processor in Go")
and the harness becomes comprehensible, because the space of valid outputs is
now bounded.

This is why mature orgs build **harness templates** alongside service
templates: a pre-built bundle of guides and sensors for a known shape. Pick a
stack, get governance almost for free.

There's a lovely historical rhyme here. Agile's **two-week sprint** is *also*
a variety-reduction move — fix the scope and the time window, and the
regulatory burden on the process drops to something a team can actually
manage. The sprint was never magic; it was Ashby's Law applied to humans. Now
AI agents can produce in two weeks what used to take two months, and the open
question becomes: *what's the harness-template that governs that much output?*

---

### What This Means In Practice

Start with the **computational** layer — cheap, fast, reliable. A strongly
typed language (hello, C#) hands you type-checking as a feedback sensor for
free. Add a linter. Add structural rules. Run them on every change.

Then add **feedforward**: write an `AGENTS.md` encoding your conventions,
skill files for common workflows, machine-readable context.

Then — and *only* then — reach for the **inferential** layer. LLM-as-judge is
expensive and non-deterministic; spend it on the semantic judgments
computational sensors genuinely can't make.

Close the loop between them. Measure the repeat-occurrence rate of each
failure class. When it's non-zero, fix the harness — not the output.

**Next post:** two rival philosophies of how much harness is too much.
