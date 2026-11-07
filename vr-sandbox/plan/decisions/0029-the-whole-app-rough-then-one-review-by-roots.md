# 0029. The whole app rough, then one review that fixes by roots

Date: 2026-11-06. State: accepted (the user, 2026-11-06: "We need A but we need faster progress I want you to stop
testing everything and just populate the library and abilities and just get shit done and then at the end we will
reveiw everything and create a fix plan because instead of 1 by 1 we can find the same fixes in one place for some
reason you get caught up in tunnel vision and start trying to correct tiny peices in a build and then make the same
type of mistake somewhere else because you didn't fix the root you fixed the outcome so just do the whole app roughly
really roughly like carelessly"; every word in `docs/WANTED.md`).

## Context

Each round so far built a few things, tested each with real calls, pictures and blind checks, and mended what the tests
showed, one outcome at a time: a wheelbase here, a bolt there. The same fault then turned up in the next build, because
the rule under it (a block resting past the highest piece under it; a bolt turning for ever on holes facing two ways)
had not been touched. A round took two to three hours, most of it testing and mending; the library grew by tens.

## Options

1. Keep testing and mending each thing as it is built
2. Build the whole app rough first (the library, the operations, the movement, the pages), each builder noting the
   faults it meets without fixing them, then one review that groups every fault by the rule under it and a fix plan by
   those roots, agreed with the user before any fixing
3. Stop building and fix the roots known today first

## Choice

The second. The engineering route stays (route A: real parts, real sizes, the operations, physics). Rounds build rough:
sizes typical and said so, no pictures, no blind checks, no evaluations with real calls, no probe-and-mend; each thing
built once to show it runs, so the gate still dates it. Every builder returns the faults it met (file, what, the rule
it suspects under it). At the end of the rough pass, one review reads all of them together, finds the same faults in
one place, and writes the fix plan by roots. The user reviews that plan; then the roots are fixed, each once.

## The assumption it rests on

Most faults seen one at a time share a few roots in the operations, the joints and the AI's prompts; fixing a root once
mends every outcome it had. A thing built rough and wrong is cheaper to build again on a fixed root than to mend on a
broken one.

## When to test it again

At the review: if the faults do not group (most have a root of their own), the rough pass cost more than it saved.

## Consequences

- The gate still runs before every push (it is the repository's rule, not a test of each thing); nothing else is tested
  until the review.
- The library will hold things that look wrong and some that are wrong; `docs/REALITY.md` says so for each round.
- The last gated commit, the docs passes and the fold are run once at each merge, by one script.
