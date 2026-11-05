# 0025. Three ways to build, and the tokens it costs

Date: 2026-11-05. State: accepted (the user, 2026-11-05: "for this app and vibing features I want a
manual-semiautomatic-automatic(fully ai vibing) okay and try to minimize Claude's token usage with applications").

## Context

The phone page (decision 0023) built one way: every request went to the agent's loop (`agentBuild`), up to 40 steps and
180 s, and a second model read every answer against its steps. There was no way to build there without the AI (only the
starter boards a tap away), and nothing between a tap and a full agent run. Nothing on the page said what a run cost.
Measured before any change, for the fixed request "Two 3 mm aluminium plates, 80 by 50 mm, bolted with four M5 bolts"
(agentBuild as the phone's relay called it, run under Node): 10 steps (find, find, open, card four times, build, build,
read), 27.8 s; tokens 2,031 in, 11,186 written to the cache, 51,271 read from it, 4,574 out, the second model's check
among them (its reading: "FAULTS: 6"). The model searched for and read the cards of pieces the guide already named, and
was never shown the board it was asked to change.

## Options

1. One way still, the agent made cheaper
2. Three pages, one for each way
3. One page with a switch of three modes, all three making one thing, a plan in the build or change tool's own form
   (nodes and wires, no place in it), run by the AI's own tools (`toolsFor`) on the page

## Choice

The third. A switch on the page, remembered per browser:

- **By hand** (no AI, nothing sent): a palette of the library's pieces (`piece.*` and `room.make`), each setting a small
  field read from the block; the new piece joined to what is there by an operation the room offers (onto a face, through
  a hole or line it offers, over a shaft, into a room, stacked beside), the line or room chosen from what the host's
  `offers` lists. Each step is a plan (`joinPlan` in `agent.ts`), run at once by `runPlan`; Undo goes back a step. A
  refusal (a nut's bore with no room on a slide fit) is said with both sizes, as the operation says it.
- **Assist** (semi-automatic): one call (`agentPlan`: no tool loop, no second model), the relay's `mode: 'plan'`. The
  model answers with one JSON object in the build or change tool's form (`planOf` reads it, and says what is wrong
  rather than guess); the page shows each node with its settings as fields to change, and Build runs it by `runPlan`.
  When lines fail, one tap asks again with the board listed and only the failing lines (`planAsk`, `failingOf`).
- **Auto**: the agent's streamed loop as before, at most 16 steps and 120 s on a phone, the second model's check only
  when its toggle is on.

The cuts, all three ways: the guide (`docs/FOR-AI.md`) shortened from 6,590 to 5,149 bytes, every rule kept (the rule
test and the guide's plan test pass); after it the cards of the pieces, the operations, the bolted joint and the show,
measure and assert nodes (`piecesCard`, read from the library, 2,569 characters), cached with the guide, so a build needs
no `find` or `card` for them; the board open listed a line a node with each request (`boardBrief`), so a change can be a
change; the chat sent with a request cut to four turns of 160 characters. Every run's tokens (in, written to the cache,
read from it, out) are shown on its message, and their running total is kept in the browser (tap to reset).

Measured after, the same request, on the page at a phone's size (`tests/evals/phone.cjs`, the relay on port 5174):

| | steps | time | in | written | read | out |
| --- | --- | --- | --- | --- | --- | --- |
| Auto before (check on) | 10 | 27.8 s | 2,031 | 11,186 | 51,271 | 4,574 |
| Auto after (check off) | 7 | 18 s | 12 | 8,863 | 26,045 | 3,542 |
| Assist (one call) | 1 | 7.9 s | 4 | 3,628 | 0 | 1,675 |

At the cache's usual prices (a read a tenth of an input token, a write a quarter more: an estimate, the bill not read),
the input is worth about 21,100 tokens before, 13,700 after in Auto and 4,500 in Assist. Assist's plan built on the page:
two plates and four joints, 18 pieces, 81 g, nothing failed. Auto's run after showed "8 nodes, nothing shown yet": the
page drew only what a board ends with, and a joint read by a `measure` and an `assert` was not drawn (fixed after: only a
node that gives a thing builds on another). Its board was not kept by the script, so whether it was the right build is
not known; the script now prints each board's nodes.

## The assumption it rests on

That a plan in the tool's own form is plain enough for a person to read and change on a phone; that one cheap call
writes a plan that builds for small asks more often than not; that the cards cost less, read from the cache every turn,
than the turns they save.

## When to test it again

When Assist's plans fail more often than they build (each failing line is shown on the page), when the cards pass 6,000
characters (the test holds them under), when the user asks for voice (spec 06, M3), or when the dashboard's Ask Claude is
given the same switch.
