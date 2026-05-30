---
title: "Harness Engineering Series [2]: Your Harness Is a Control System. Check Out This Diagram."
date: 2026-05-30
tags: [controltheory, agentharness, ai, systemsthinking, cybernetics]
description: "This is the post I'd hand to anyone who wants to *get* harness engineering in five minutes. Not a list of tools. One diagram, and the realization that the diagram is 100 years old."
---

### The Canonical Control Loop

Every control system ever built — thermostat, cruise control, rocket
guidance, the float valve in your toilet tank — has the same four parts:

```
                         disturbance
                              ↓
  reference  ──►  ┌────────────┐      ┌──────────────┐  ──►  output
  input           │ controller │ ───► │ plant/process │       │
            ▲     └────────────┘      └──────────────┘        │
            │                                                  │
            │          ┌──────────────────────┐               │
            └──────────│   sensor / feedback   │ ◄─────────────┘
              error    └──────────────────────┘
            signal =
      (reference − actual output)
```

1. **Reference input** — what you *want* the output to be.
2. **Controller** — computes the action to take given the current error.
3. **Plant** — the thing being controlled (the furnace, the car, the model).
4. **Sensor + feedback** — measures the actual output and feeds it back so
   the controller can compute the error and correct.

Now watch what happens when I relabel the boxes.

---

### The Same Diagram, Wearing Agent Clothes

```
                    disturbance
              (bad input, prompt injection,
                    context drift)
                          ↓
  task/goal ──► ┌──────────┐     ┌────────────┐ ──► output
  (the spec)    │  HARNESS │ ──► │  LLM AGENT  │      │
           ▲    │ (guides, │     │ (the model) │      │
           │    │  tools,  │     └────────────┘       │
           │    │  context)│                          │
           │    └──────────┘                          │
           │     ┌────────────────────────────────┐   │
           └─────│ sensors: tests, linters, evals,  │◄─┘
       error =   │          LLM-as-judge            │
   (expected −   └────────────────────────────────┘
     actual
    behavior)
```

It isn't *like* a control diagram. It **is** one. The mapping is exact:

| Control Engineering        | Harness Engineering                          |
|----------------------------|----------------------------------------------|
| Reference input            | Task / goal / spec                           |
| Controller                 | Harness (guides, context, tools, the loop)   |
| Plant                      | The LLM agent                                |
| Disturbance                | Bad input, prompt injection, context drift   |
| Sensor                     | Tests, linters, type-checkers, LLM-as-judge  |
| Feedback signal            | Error: expected behavior − actual behavior   |
| Error correction           | Self-correction loop, retry, human-in-loop   |

The isomorphism isn't poetic. It exists because **both fields are solving
the same problem**: *how do you reliably steer a system whose behavior you
can't fully predict toward a desired output, in the presence of
disturbance?* Control engineers call the unpredictable thing a "plant."
We call it "the model." The math does not care what we name it.

---

### A Tiny Bit of History (Because It Earns You Credibility)

Feedback control is older than electronics.

- **1788** — James Watt's centrifugal *governor* regulates steam-engine
  speed. Spin too fast, the flyweights rise, the throttle closes. Pure
  mechanical negative feedback.
- **1868** — James Clerk Maxwell publishes *"On Governors,"* the first
  mathematical analysis of feedback stability. This is arguably the birth of
  control theory as a science.
- **1927** — Harold Black invents the negative-feedback amplifier at Bell
  Labs, taming distortion by feeding the output back against the input. The
  legend is he scribbled it on a newspaper on the ferry to work.
- **1948** — Wiener's *Cybernetics* unifies control engineering and biology:
  feedback is feedback, whether it's a thermostat or a nervous system.
- **1950s–60s** — PID control becomes the industrial workhorse it still is.

When you wire a type-checker's output back into your agent's next prompt,
you are standing in a line that runs straight back to a brass governor on a
Victorian steam engine. That's not a metaphor. It's the same control law.

---

### And Now The Payoff: 100 Years of Free Results

Because the structure is identical, control theory's solved problems map
*directly* onto problems the agent field is currently solving by intuition.
Five of them, each worth its weight:

**1. Gain tuning (a.k.a. why your agent thrashes).**
In a PID controller, if your correction signal is too aggressive you get
*oscillation* — the system overshoots, overcorrects, overshoots again. In a
harness: if your feedback sensors are too aggressive (fire on everything,
block constantly), the agent thrashes — fixing the lint error breaks the
test, fixing the test trips the type-checker, around and around. Too
permissive and it drifts off-task. Tuning your sensors' sensitivity *is*
tuning gain. You're a control engineer who didn't know the job title.

**2. The stability–responsiveness tradeoff.**
Every control designer knows you can't max both at once. A highly responsive
system is prone to instability; a highly stable system is sluggish. Sound
familiar? A tightly-constrained harness (stable) moves slowly and loses
creative problem-solving. A loose harness (responsive) goes off the rails.
Same tradeoff, different vocabulary — and naming it lets you *reason* about
it instead of fiddling.

**3. Feedforward control.**
Control engineers learned that pure feedback is *slow* — you only correct
after the error has already happened. **Feedforward** anticipates a known
disturbance and acts *before* it hits the output. That is *exactly* what
guides do: an `AGENTS.md`, a skill file, a reference doc — they shape
behavior before the agent produces anything. The field reinvented feedforward
control and called it "prompt engineering." (Post 3 is entirely about getting
the feedforward/feedback balance right.)

**4. Dead time / latency.**
One of the hardest problems in control: if there's a *delay* between
applying a correction and seeing its effect, the system can go unstable —
you keep correcting for an error that's already been fixed, and you induce
oscillation. In a multi-agent pipeline, one agent's "correction" reaches
another agent several steps later. Long pipelines with delayed feedback are a
classic stability hazard. Control theory has formal tools (Smith predictors,
phase-margin analysis) for this. Agent pipelines currently handle it with…
hope. (This becomes a genuine crisis in Post 9.)

**5. Cascade control.**
For complex plants, control engineers nest loops: a slow *outer* loop sets
the target for a fast *inner* loop. A furnace's outer loop controls room
temperature; its inner loop controls fuel-valve position. That nested
structure is **exactly the orchestrator–worker pattern** (Post 5). The
orchestrator is the outer loop; the workers are inner loops. Different
words, identical topology.

---

### The Uncomfortable Part: Some Things Cannot Be Controlled

Here's where control theory gets humbling, and where it's most valuable.

Control theory contains *impossibility proofs*. There are systems that are
provably unstable for **any** controller. And **Bode's sensitivity integral**
(Hendrik Bode, 1940s) says something brutal and beautiful: if you push error
*down* in one frequency band, you must accept *more* error in another. The
total is conserved. You cannot get something for nothing. Engineers call this
the **"waterbed effect"** — push the water down here, it bulges up over
there.

Harness engineering hasn't formalized its waterbed effect yet, but you can
already feel it: **the tighter you constrain an agent to suppress one kind of
error (going off the rails), the more you suppress the emergent, creative
problem-solving that made the agent worth using.** That's not a tooling gap
you'll patch next sprint. It's a conservation law. Control theory proved the
shape of it decades ago, and the sooner harness engineers internalize that
some tradeoffs are *fundamental* rather than *temporary*, the fewer
person-years we'll waste chasing a guardrail config that maximizes safety
*and* capability *and* speed simultaneously. It doesn't exist.

---

### What To Actually Do With This

1. **Draw the loop.** For any harness you build, literally sketch the four
   boxes. Where's the reference? The sensor? Is there feedback at all, or are
   you running open-loop and praying?
2. **Name your gain.** When the agent thrashes, don't add more rules —
   ask whether your sensors are over-tuned. When it drifts, ask whether
   they're under-tuned.
3. **Use feedforward first, feedback second.** Prevention is cheaper than
   correction. Then close the loop.
4. **Respect the waterbed.** Decide *deliberately* where on the
   stability–responsiveness curve you want to sit for a given task. Don't
   pretend you can have both ends.

> The next time someone calls harness engineering "a new discipline," you get
> to say: *"It's a control system. The plant just happens to be
> probabilistic. We have a hundred years of theory for this — we've just been
> ignoring it."* That sentence is a job offer.

**Next post:** the two axes every harness needs — and why feedforward without
feedback is just hope.
