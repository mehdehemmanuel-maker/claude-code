# When this is done

Written 2026-10-17, because 277 tasks had been opened and not one of them said what finishing looks like. A list of
tasks is not a definition of done: it is a definition of busy. This file says what the end is, why a feature list
cannot be it, where the line between my half and the user's half falls, and what the measured distance is today.

Every number here is printed by a command, named beside it. A number written into prose goes stale in a week.

## The end in one sentence

**He says what he wants; it is designed real down to the last part; the bill is ordered; the works in his garage
makes it; and he is taught to build it with his own hands as it happens — and the same engine maps him (his life,
his body, his business) as it maps machines.**

That is the nine asks with the repetition taken out. Ask 1 is the generator, 2 is the truth, 3 is the vocabulary,
6 is the novelty, 7 is what keeps the engine improving; 4 and 5 are the two transfers — into his hands and into the
physical world; 8 is him in it; 9 is the constraint on all of them.

## Why a feature list cannot be the definition

Three of the nine asks are infinite in the user's own words:

- *"generate trillions of different combination of just anything based on any condition"* (1)
- *"make it infinite like anything I request"* (4)
- *"recursively upgrade every process and sub-process"* (7)

An infinite list has no last item, so "every machine drawn" and "every part broken down" can never be reached and are
therefore not done-conditions. **Coverage is a rate, not a state.** Treating it as a state is what produced 277 tasks
and the drift the gate in CLAUDE.md exists to catch: each round adds coverage, coverage never ends, nothing closes.

What *is* finite is the **loop**. A loop that holds for an arbitrary member of an infinite set is a finite thing to
build, even though the set is not. So:

> **Done is: an ask drawn at random survives the whole loop.**

Drawn at random, not chosen. A chosen example is a template under another name, and ask 1 forbids templates.

## The loop

| | stage | from → to |
| --- | --- | --- |
| A | heard | words → conditions (loads, sizes, reach, limits) |
| B | designed | conditions → a thing, by the general rule, not a template |
| C | real | the thing → every part it is made of, down to materials |
| D | orderable | parts → a bill, each line priced, sourced and buyable today |
| E | teachable | bill + thing → a hands-on lesson per step, checked as he does it |
| F | made | lesson + works → it physically exists |
| G | his | it works in his hands |

## Where my half ends

F and G cannot happen inside this container, ever. No round will build a thing in a garage. So there are two
definitions and conflating them is dishonest:

- **The software is done** when a random ask comes out of E as a complete, correct, priced, teachable pack, and the
  two Bluetooth stations take their jobs from it. Stages A–E plus the drive. **This is mine.**
- **The project is done** when he has built one and it works. That needs $2,395, a room, and his hands. **This is his.**

Never report the first as the second. The engine finishing a lamp pack is not a lamp.

## The measured distance, 2026-10-17

| stage | the command | what it says today |
| --- | --- | --- |
| A | `node tools/loop.mjs "<ask>"` | reads the words; refuses honestly when a want is not a part |
| B | `npm run machine -- "<ask>"` | composes from the library, but only round a **named tool** — an ask with no verb gets a jointed arm |
| C | `npm run breakdown -- out.md` | 67,117 parts taken, 66,624 broken down, **37 waiting** |
| C | `node tools/unwired.mjs --all` | 2,714 exports: **178 test-only, 141 dead, 22 unreached files** |
| D | `npm run works` | the works itself: 16 stations, **$2,394.95**, every line priced |
| D | `npm run pack -- "<ask>" out/` | a build's own bill: **unpriced kinds remain** (7 distinct on one small arm: motor plates, 6805s, GT2 60, M5×12, 2020 extrusion, slot nuts) |
| E | `npm run pack` → `## Lessons` | the lesson is **generic** — "Put it together" never names the thing being built |
| F | `node tools/room-census.mjs "show me the works"` | 16 stations drawn: 13 real, **3 bare stand-ins**; 2 of 16 take a job over Bluetooth, the other 14 are hand-driven |
| G | — | **never happened.** The works has not been bought or built. |

## What this definition found the hour it was written

`node tools/loop.mjs` was built to ask every door the same question. It had never been asked. One ask —
*"a desk lamp with an arm that stays where you put it"* — through three doors:

```
part     0 parts named  — said: No family makes this.
machine  7 parts named  — said: nothing in those words says what the machine must *do*
pack     1 parts named  — said: "an arm that stays where you put it" is not a part any family makes
LOOP     machine named 7, pack bought 1, 0 of them the same part — the doors do not feed each other
```

**There is no loop. There are three doors that do not feed each other**, and no test had ever noticed because no test
had ever put one ask through more than one of them. The pack bought a 25-pack of 5 mm LEDs for $12.50 and called it
a desk lamp. The machine composed a two-link arm on NEMA 17s and GT2 belts — which is a robot arm, not a lamp.

A second finding, deeper, inside the machine's answer: **"stays where you put it" is passive equilibrium**, and the
composer has no such idea. It reached for steppers, because the only way it knows to hold a position is to drive it
there and keep the current on. An Anglepoise has held its position since 1932 with a spring and no power at all. The
library has springs, friction and gears; what is missing is the rule that a hold can be passive. Powered holding is
the expensive wrong answer to a question the user asked in four words.

## Reverse-engineered: the order to do it in

Working back from G, each step is the one that makes the next possible.

1. **Join the doors into one loop.** `part`, `machine`, `pack`, `plan` and the lessons each take an ask and answer
   alone. One route: heard → designed → real → orderable → teachable, each stage taking the last stage's output as
   data rather than re-reading the words. Nothing downstream of B is real until this exists, and every coverage
   round before it is coverage of a thing with no exit.
2. **Passive equilibrium as a way to hold.** Spring counterbalance, friction joints, over-centre, dead weight, as the
   general rule the lamp needed. This is ask 1 exactly: not a lamp template, a way of holding that any ask can reach.
3. **Price what the bill cannot price.** The works bill is complete; a *build's* bill is not. Blocked on this
   network (the sellers' size tables render in JavaScript it cannot run) — **widening the network unblocks the
   critical path to his half**, and nothing else does.
4. **A lesson that names the thing.** Ask 4 is explicit: *"don't say solder here"*. "Put it together" is exactly the
   generic instruction it forbids, shipped in every pack today.
5. **Then coverage, at whatever rate** — more machines, more parts, more inventions, forever. After 1–4, never before.

## What is not on the critical path

Most of what is open. The gear profile-shift case, the Pi 3B+'s layout, the Voron's Stealthburner, the substrate's
action principle, the three bare stand-ins — all real work, none of it between here and a thing in his hands. They
are coverage and polish, which is the rate, and the rate only matters once the loop closes. Say so when picking a
round, rather than picking the one nearest the last file touched.

## The one number

Once the loop exists, the top-level measure is the **pass rate on random asks**: draw N, run them end to end, count
how many reach a bill a person could order and a lesson that names the thing.

**Today: 0 of 2.** Not because the engine is poor — it holds 67,117 parts, 252 laws and a $2,395 works that costs
$4,973 to buy — but because nothing joins them, and until this week nothing had ever measured whether anything did.
