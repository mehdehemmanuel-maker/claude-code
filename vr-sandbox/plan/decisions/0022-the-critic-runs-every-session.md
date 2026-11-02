# 0022. The critic runs every session: what the user would have to point out is found first

Date: 2026-11-02. State: accepted (the user: "we need an agent who really make this app functional like everything I'm
saying I shouldn't have to say").

## Context

The user had to point out what should have been found without them: code left over from what was replaced, an engine
whose pieces ran through each other and looked blocky, and a node creator researched and specified (spec 13) but never
built. The checks that ran were the tests, which measure what they were written to measure; nothing opened the app as
a person does, looked at what it draws, or held it to the user's words.

## Options

1. Keep the round questions in CLAUDE.md as prose, asked when remembered
2. A script that opens every starter board in the built app and records what fails, freezes and throws, with a
   screenshot of each; and an agent that runs it, looks at every picture, holds the app to `docs/WANTED.md`, finds dead
   code and planned work never built, ranks it by what a person would notice, and fixes the worst; run every session
   and before anything is reported done

## Choice

The second: `scripts/audit.cjs` (its results in `.audit/`, out of git) and the agent `../.claude/agents/critic.md`, with
a rule in CLAUDE.md. What the user has to point out is the critic's miss, and is added to its checks.

## The assumption it rests on

That most of what the user has had to say is visible by opening the app and reading their own words against it, so a
standing look finds it first; and that a picture judged by eye or a blind model catches what tests do not.

## When to test it again

When the user points out something the critic should have found: then the critic's checks are short of it, and are
widened.
