# 0019. The node creator extends its owners; what is done on a board is recorded once, and read by every agent that needs it

Date: 2026-11-02. State: proposed with spec 13, accepted when 13.NC1 lands (by the builder: a technical choice,
decision 0011; reversible). If 0019 is taken by then, the next free number is used and every reference moves with it.

## Context

The user asked, 2026-11-02: "Create a node creator agent that can see what everyone is doing manually and learns how
to make nodes,node types, node boards collapsed into one node to make everything more efficient" (`docs/WANTED.md:342`).
The same day they asked for an efficiency agent ("see what's taking too long … flags negative repetition … see token
usage") and a context agent (`:345-349`), being designed as spec 14; and: "don't over complicate things something needs
to be asking is all this really necessary kind of like the finding of collapsing nodes boards into one node"
(`:355-357`), being designed apart for the space and its networks.

The pieces exist, spread over owners, and are not honest yet: a fold can reorder a many-input (fault D32,
`src/nexus/dataflow.ts:325`, `:482`, `:539`, `:610`); a fold reads stronger than its inside and drops what it warns of
(`dataflow.ts:127`, `evidence.ts:91`); Open a copy drops a made node's values (fault D33,
`src/nexus/view/nodes.ts:482`); repeats are found in overlapping windows on the open board only (`dataflow.ts:620`);
five places convert a saved block and none keeps its author or tests (`view/nodes.ts:36-37`, `:650`, `agent.ts:179`,
`dataflow.ts:705`, `trial-worker.ts:14`), and a pool worker registers only the one block carried with its job (fault
D34); nothing records who did what (`view/nodes.ts:77` keeps snapshots only; `Board.calls`, `boards.ts:29`, is unused).
Other agents being designed need to know who changed a board: spec 14's efficiency and context agents, and, where they
need it, spec 11's run record (11.LW2) and chronicle (11.LW6).

## Options

1. A new `src/nexus/creator.ts` owning the record, the search, the making, the proof and the offer.
2. Each concern extends its owner (design section 5 of spec 13): the record's shape and rules in `boards.ts`, the
   operations in `certify.ts` (`diffOf` computed from them), the search, the making, the proof (`offersOf`) and Use in
   `dataflow.ts`, `into`, identity and tests by digest in `blocks.ts`, the saved-block conversion beside `groupBlock`
   (with the pool's carry, `pool.ts` and `trial-worker.ts`), the recorder and the card in `view/nodes.ts`, Claude's fold
   in `agent.ts`. One record; every other agent reads it.
3. Spec 07's Evolve: it improves one board against a check; it does not learn blocks.

## Choice

The second.

- **One record.** The board's event log (spec 13, design 2.2) is the one record of what is done on a board, by whom,
  operation by operation, Claude's changes as anyone's. The event holds who changed which board, and how. The
  efficiency and context agents (spec 14) read it and write no second one. A run's tokens and steps stay with
  `AgentRun` (`src/nexus/agent.ts:79`), their owner; an 'edit' by 'claude' may point to it; the rest is spec 14's to
  decide. Spec 11's run record (11.LW2) and chronicle (11.LW6) record runs, not changes to a board, and keep their
  own records of runs; where either needs who changed a board, it reads this record and writes no second record of it.
  Any other task that needs to know who changed a board (00.S11's dailies among them) reads it the same way.
- **The hand-action rule**, fixed here before any code: one action for each node placed, one for each wire made, one for
  each setting or unwired input given a value other than its block's default; a label is not counted. It is counted
  from a board. An offer is a proposal that is proved and saves nodes, ranked by hand actions saved, fewer inputs first
  on a tie (research 26, A10: "count the free parameters … not the lines"). No other measure decides an offer; changing
  the rule is a new record.
- **Proved against the board's own run.** The board's last run is the reference (cached equals fresh, 11.LW15's rule);
  a proof runs only the rewritten places and what they feed, on a copy, and refuses a proposal with a block that is not
  pure below a place, so it never runs a model or a side effect again.
- **The person decides.** Nothing changes a board or the library without the person's yes, and Use proves again on the
  board as it is before it takes anything. A made node is the person's ('you'), so it is taken out like any saved block;
  the record names what the creator made. The thresholds are the builder's and reversible: a card at 3 places; one
  budget of 2 s for each call of `offersOf`, its finding and proving together; 3 proposals proved a call. The budget is
  a deadline read from the clock (`performance.now()`) between nodes, never a timer: a timer fires during a run only
  while a node waits on outside work (the pool's workers), and the clock stops both kinds of run (measured, spec 13
  design 2.5). Every run the creator makes lets the page draw between nodes, and only the page that shows the card runs
  it (`view/index.html`, never `view/space.html`). A shape has no size limit.
- **No model in it.** Code finds, makes, proves and offers, and names what it makes (C27). Claude in the app folds
  through the same functions, by 'claude'.
- **How the rest relates.** 09.P3 (C26) runs the tests the proof keeps on every saved block when it loads; the proof is
  the fold test for made blocks. 01.I18 (C19): a node type is never changed in place; a constant made an input gives a
  new id. 10.T23: a kernel certificate for fold equality waits on it. Research 26: item 15 (`learn.blocks`) is taken up
  in part, as proposals with the person's yes over the person's boards, with no node of its own; item 17 (a validation
  certificate on every fold, re-run when the inside changes) waits on 10.T23; item 16 (`by.example`) stays with spec 01.
- **What is not built**, because it is not needed to build or prove what was asked (the user's "is all this really
  necessary"), is listed in spec 13's design, section 8; among it a model to name nodes, the creator as a board of its
  own beside `suggest`, Claude's `every`, and the ± carried through a fold (a place into which one comes is refused).
- Faults D32, D33 and D34 are recorded in `plan/DEFECTS.md`, fixed by 13.NC2, 13.NC10 and 13.NC8.

## The assumption it rests on

That every change to a board on the page passes `pushUndo` or `useBoard` (the start-up given a record call of its
own); that a cached run equals a fresh one, so the board's last run can stand for it; that the person wants offers, not
folds made for them; and that the hand-action rule ranks first what saves the person the most work.

## When to test it again

When hosting starts (other people's work, and the three devices sharing a record); when spec 14 or spec 11 needs to know
something of who changed a board that the record does not hold (it is added here, never kept apart); when a call of
`offersOf` is stopped at its budget, or runs far past it, on a board the person uses; when near repeats (formulas alike
under other names) are wanted (research 26, A10).
