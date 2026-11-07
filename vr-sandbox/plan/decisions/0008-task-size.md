# 0008. Task size: a budget for the builder; passes with gates for the AI in the app

Date: 2026-10-31. State: accepted (the user's answer to U5).

## Context

Spec 00 proposed a change budget per task. The user asked whether that was for the AI building the app or the AI in the
app, and said: "in app a task can be however big as long as it's context and hallucination aware before piping forward
to another pass or just branching in the first place".

## Options

1. One budget for both
2. A budget for the builder only; for the AI in the app, no limit on size, but every pass gated

## Choice

The second.

- **The builder** (the AI changing this codebase): a task stays within its owner, its tests and its docs; past that, a
  decision record (spec 00, S3).
- **The AI in the app**: a request may be as large as it needs. It is broken into passes; before any pass hands its
  result forward, or the work branches, a gate checks it: does it have the context it needs (the nodes, the data, the
  user's words), and is everything it states grounded in a tool's result (no number or claim without a source in the
  steps)? What fails the gate goes back with why, or is asked of the person; it is never piped forward.

## The assumption it rests on

That size itself is not what makes AI work go wrong in the app, but ungrounded hand-offs between passes.

## When to test it again

When the AI's evaluation set includes large requests (a house, a city block): compare gated passes with one long pass.
