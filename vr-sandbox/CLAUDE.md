# Nexus and the forge: read this before any work here

This file is the anchor against drift. Long recursive work loses the point when each round optimises what it can measure
(tests green, numbers sourced, findings fixed) and forgets what the person asked for. Summaries after a context reset keep
the task list and lose the why. So the why lives here, and every round is checked against it.

## What is wanted (the user's own words, kept)

- "don't make templates for individual generation paths that's mock, make it have a pipeline where it can generate
  trillions of different combination of just anything based on any condition improve realism … there needs to be an
  attention to detail part of the pipeline"
- "merge them don't discard one or just not incorporate it, they may complement each other … why are there two different
  generators"
- "parts need to have more rules on them like if there a moving part like a tire an auger … then it's recommended it has a
  given amount of space"
- "I'm not sure how the car or go karts you made are such low qualities when you have so many parts mapped out and
  interconnectable and can expand any part for its sub parts"
- "generate every single vehicle, every vehicle type, make, model … forklift, semi, crane … plane, jet, with real parts …
  every go kart, four wheeler, dirt bike … every mower, every power tool, really buildable … click it and it is a 1-1
  exact model of the real product, expandable"
- "ask yourself what aren't you asking yourself; don't just think of math, think of emotion: how would they think about
  this, what would they say is bad about this, and then recursively fix it"
- Always: no mocks; every number sourced, or labelled typical or an estimate; failures reported honestly.

## What can honestly be promised

A real product's exact surfaces are its maker's CAD and are not public. What is public and can be matched: its published
dimensions (length, width, height, wheelbase, track, seat height), its tyre and wheel sizes, its engine or motor and its
ratings, its mass, its part list and how it goes together. A product made here is true to those, with each figure's
source, and its shape approximates the surface. Say that plainly. Never call a model exact when it is not.

## One owner per concern: extend these, never write a second one

| Concern | Owner |
| --- | --- |
| Words to wants, figures, questions; designs from laws | `src/nexus/conceive.ts` |
| Generated structure for any intent; its body in space | `src/nexus/generate.ts`, `src/nexus/realize-space.ts` |
| Machines as real hardware from generated elements | `src/nexus/embody/` (`any.ts`, `tree.ts` load path, `stock.ts`) |
| Real products and what each contains, down to elements | `src/nexus/inventory.ts` (about 1,500 items) |
| Parts made to any size by their standard | `src/nexus/families.ts`, `catalogue.ts`, `partspace.ts` |
| What an inventory item looks like, how it comes apart | `src/nexus/pieces.ts`, `looks.ts` |
| Things with choices, as a placed tree of parts | `src/nexus/kits.ts` (drawn by `view/kit3d.ts`) |
| Conditions on loads, holds and reach | `src/nexus/conditions.ts` |
| Conditions on how a made thing is (age, setting, material, size) | `src/nexus/make/conditions.ts` |
| Edges as made (radius by material and process) | `src/nexus/finish.ts` |
| Oriented-box layout and contacts of a placed tree | `src/nexus/make/space.ts` |
| Attention to detail (joints, fasteners, seals, finishes, wear) | `src/nexus/make/detail.ts` |
| Critic (room to move, held up, walls, through, standing) | `src/nexus/make/critic.ts` |
| The make pipeline (conditions, detail, critic, in rounds) | `src/nexus/make/pipeline.ts` |
| Places, rides and games | `places.ts`, `karting.ts`, `coaster.ts`, `pingpong.ts` |

Known gaps (from the 2026-10-08 audit, still open):
- the inventory knows what is in a product but not where it sits; the kits know where but not what. Joining them, so
  every placed part is an inventory item that expands into its sub-parts, is the merge that ends "two generators";
- the forge routes a make ask to three generators (`embodyAny`, `conceive`, `kits`) by guesswork;
- the go-kart on the track (`view/kart3d.ts`) is drawn by hand, apart from any maker.

## Before writing a new file or function

1. `ls src/nexus` and grep for the concern. If it is in the table, extend its owner.
2. If what you are about to write makes one named thing (a car builder, a kart builder), stop. Find the general rule
   that makes it and its relatives from data (a wheeled vehicle from its axles, tyres, frame, seats, power, implements).
   Per-product data (a real model's published figures) is fine; per-product code is a template.

## The drift gate: before spending a round on a fix

Recursive work drifts toward the most efficient path for the measurement, not toward what was asked. The gate is
the pause before a round where you ask whether this fix is still worth making. Pass it before tuning anything:

- **Will what I am tuning against still exist?** Do not tune a critic, a test or a threshold against a thing about
  to be replaced. (2026-10-08: the critic was not tuned to the box-bodied car, because that car was being replaced by
  a general vehicle maker. Tuning to it would have made the critic fit a template.)
- **Is the number I am moving the thing they care about?** Joint counts, test totals and finding counts are proxies.
  The person cares whether the thing is real, recognisable, buildable and expandable.
- **Am I picking this fix because it is easy to measure, or because it matters most?** If the most visible flaw
  in the screenshot is not what this round fixes, say why.
- **Would the user call this round progress if they saw only its result?** If not, stop and re-aim.

Say the gate's answer out loud in the round's notes when it changes what gets done, so the choice can be seen.

## Every round, ask these, then act on the answers

1. Does this already exist somewhere? Am I about to make a second one?
2. What does a person see first? Render it, framed so it can be seen whole, take a screenshot, and look at it.
   Would they recognise it at a glance? What would they call cheap, wrong or fake?
3. Blind check: give the screenshot to an agent with no context. Ask what it is and what is wrong with it. If it
   cannot name the thing, the thing is not done, whatever the tests say.
4. Am I measuring what they care about, or what is easy to measure?
5. Re-read "What is wanted" above. Is this round still aimed at it?
6. What am I not asking? (Scale against a person? How does it move? What does it sound like? What happens when it
   is clicked, taken apart, driven?)

## Working here

- Gate: `npm run gate` (long; run it in the background and log to a file). Build the viewer:
  `npx vite build --config vite.view.config.ts --logLevel error`.
- Probe tests go in `tests/nexus/zz_probe_*.test.ts` and are deleted before committing.
- Never put API keys in the repo or in client code.
