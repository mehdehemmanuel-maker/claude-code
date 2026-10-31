# 0001. The plan's structure: a constitution with checks, specs with failing tasks, decisions, an evaluator

Date: 2026-10-31. State: accepted (proposed to the user with the plan).

## Context

The user asked how to keep a long AI-built project from forgetting, drifting, going in circles or tripping. Today the rules live in CLAUDE.md as words; tasks are done when the builder says so; choices are re-argued after a context reset.

## Options

1. Keep going as now (CLAUDE.md, ROADMAP, REALITY) and add more words
2. Adopt spec-driven development (GitHub Spec Kit, Kiro) wholesale
3. Take its pieces that the evidence supports and enforce them with checks and hooks

## Choice

The third: `plan/CONSTITUTION.md` (rules with checks), `plan/specs/` (requirements traced to the user's words, tasks that start failing), `plan/decisions/` (this), `evals/`, `PROGRESS.md`, hooks, and an evaluator apart from the builder.

## The assumption it rests on

That executable checks and a separate evaluator reduce drift more than more words do (Anthropic's harness reports; Cursor's; one study finding context files written by a model did not help, `research/03-agents-structure.md`).

## When to test it again

After phase 1: count the tasks that were called done and later found not done, and the questions re-argued without a record; if neither fell, change the structure.
