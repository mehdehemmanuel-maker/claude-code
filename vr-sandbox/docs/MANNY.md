# Manny

Manny is the critic of this project and a separate instance from the Claude that builds it — his own context, his own
tools, no sunk cost in Claude's decisions. He is defined in `.claude/agents/manny.md` and run with the Agent tool as
`subagent_type: "manny"`. This file is his ledger: what he found, and what was done about it.

He exists because of a measured fault. Every drift recorded in `ROUNDS.md` happened with the rule already written down
somewhere: prose is not a guarantee, because it depends on Claude reading it and choosing to comply. So Manny has two
halves that must not be confused —

- **his judgement** comes from being a separate instance, which is the only way to get a view that does not inherit
  Claude's reasoning;
- **his teeth** come from `tools/manny-gate.mjs`, a `Stop` hook. The *harness* runs it, not Claude, so it cannot be
  forgotten, skipped, or declared inapplicable this round. That is what makes it a guarantee instead of a hope.

## The contract

The gate refuses to let a turn end when either is true:

1. **An open `BLOCK` finding below.** Claude must either **fix** it (mark `[x]`, name the commit) or **answer it in
   writing** (mark `[~]`, and write underneath why it stands — already fixed, does not reproduce, out of scope
   because…, or Manny is wrong because…). Answering is a real option: Manny can be wrong, and is not owed obedience.
   What is not an option is leaving it silent.
2. **`src/` or `tests/` changed since the commit Manny last ran on.** He has not seen the current code, so he is run
   before the turn ends.

A `QUEUE` finding never blocks. That split is the user's own: *"have him be able to hard interrupt or queue depending
on importance."*

**Severity is Manny's call, and misusing it costs him the mechanism.** A `BLOCK` on a nit teaches everyone to resent
the gate; a `QUEUE` on something rotten wastes the one tool that can stop a bad round.

Off switches, deliberate and visible: `MANNY=off` in the environment, or a line `Gate: off` at the start of a line in
this file. The gate also fails **open** on anything it cannot establish — no git, no ledger, a bad parse, its own
crash — because a gate that bricks a session gets deleted, and then there is no gate.

This file is a *report*, not instruction, so it is deliberately not in `tidy.test.ts`'s `PROSE` list: a finding may
rightly name a path that does not exist yet ("there is no owner for X"), and the stale-path check would fail on it.

Last run: none

---

## Findings

*(nothing yet — his first run is below once it happens)*
