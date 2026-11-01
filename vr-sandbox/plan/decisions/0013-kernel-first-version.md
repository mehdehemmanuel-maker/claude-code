# 0013. The kernel's first version: three kinds, exact and closed, and what it leaves out

Date: 2026-11-01. State: accepted (by the builder: a technical choice, decision 0011; reversible).

## Context

Spec 10's T23 asks for a kernel (`src/kernel/`, research 31) that checks certificates of thirteen kinds with exact
rationals and outward-rounded intervals, refuses what it cannot decide, imports nothing outside itself, and has a second,
independent checker for the commonest kinds; T18 asks that every change the AI makes come with a certificate a small
checker verifies (constitution C29: the checker is the gate, a model a judge beside it). Three independent build plans
were drawn up and agreed on a first slice. Research 31 budgets the whole kernel at about 2,160 lines in 16 files.

## Options

1. All thirteen kinds at once, before any reaches the app
2. A first slice, sound from its first line, reached by the app now: the envelope and the kinds the laws and the wires
   need every day (dims and witness), and judged (shown, never a pass); the rest later, each a refusal until then
3. No kernel of its own: check by the app's own float arithmetic and its dimension code

## Choice

The second. The kernel holds: exact BigInt rationals (a double read exactly from its bits); intervals with rational
endpoints rounded outward to 96 bits (not float `nextUp`, so no rounding mode is trusted); exp, ln and roots by series
whose remainder is bounded, never the host's `Math`; dimensions as six rational exponents, angle dimensionless as
decision 0009 keeps it (research 31 B1.4 proposed angle as a base: not taken, to agree with the wire check); a unit
table that is the units' own dimensions (`src/kernel/units.json`, the gate fails if they differ); a strict envelope
(an unknown field, kind or size is malformed); every value at every step held to 2^±16384, past it undecided (added
2026-11-01, when a red team stacked legal powers into a check of 75 s: rounding to 96 bits bounds a number's digits, not
its size), the second checker holding the same bound; the kinds dims, witness and judged. A certificate of any other kind is
refused as malformed; sin, cos, tan, their inverses, erf and integrals are refused as undecided. The second checker
(`scripts/kernel2.py`) is Python with `fractions` and `decimal` at 60 digits: other language, other methods, the same
unit data. Values in a witness are in SI, converted outside the kernel by `src/ganglia/units.ts`, and the term is
translated outside it (`src/nexus/certify.ts`): both are named in each certificate's `trustedBase`.

## The assumption it rests on

That a value checked at the point a node ran (a witness) is worth a badge though it says nothing of other points; that
96 bits of enclosure is far finer than any tolerance a node claims (1e-9 of the value); and that the translation of a
law's term into the kernel's, which the kernel cannot check, is small enough to read and is tried on every law in the
book by the gate.

## When to test it again

When a law the app relies on is refused as undecided (sine and its kin are the next kinds of function to add); when a
certificate of another kind is needed (gap for interference, T24; cover for a value over a range); or when the two
checkers disagree on anything.
