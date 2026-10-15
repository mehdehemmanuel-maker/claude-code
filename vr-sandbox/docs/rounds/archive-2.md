# Rounds archive 2 — 2026-10-13 to Run 8a

Split out of `docs/ROUNDS.md` in Run 8g. Manny's findings, the pulley fault, the machine kit, the two-mass
check, the default that lies, and Runs 7a-8a (the doors, the citations, the gear library and the internal gear).

## Manny's first findings, fixed by cause (2026-10-13)

The critic built the round before found five blocking faults on his first cold pass, by attempting the user's own
named mix (a Unitree Z1 Air, a CreatBot D400 HS, a filament line, camera rails, a floor grid) rather than by reading
the code. Three were verified in the source before being accepted and are fixed here; two are answered in writing and
are the next round. The ledger is `docs/MANNY.md`.

**A pulley's size was read by one door and not the other.** The pulley family's `read` took teeth only from `60t` or
`60 teeth` and a bore only from `8mm`, so `pulley GT2 60 8` matched neither and fell to its 20-tooth, 5 mm defaults
**silently** — which is what every composed machine ordered, whatever its bill said. The same family asked in its own
grammar (`pulley 1000t 8mm`) refused honestly: one door told the truth and the other did not. It now reads the tagged
forms first and then the bare numbers nobody tagged, in the order written, so both doors arrive at the family's own
range check. `pulley GT2 60 8` was `pulley-gt2-20t-5` and is `pulley-gt2-60t-8`; `pulley GT2 1000 8` was that same
silent default and is now refused by name. The general lesson is the one this file keeps relearning: **two
vocabularies for one thing, and the lenient one wins silently.** And the reason it survived a round that was
*specifically about* declarations against drawings: `mate.ts` holds the drawing to the declaration and the
declaration to nothing, so `misdeclared()` returned 0 the whole time. A pulley *is* the gear ratio, so every arm's
torque table was arithmetic over a ratio the drawing did not have.

**An unknown work envelope passed.** `works/can.ts` guarded the size check with `if (e)`, so a station that never
said how big its work area is was never refused — which routed a 710 × 630 × 1100 mm frame to "forging on a propane
forge", 42 minutes, and then said the schedule could not be beaten, while correctly refusing a 400 × 300 × 8 bed.
The smaller part failed and the metre-long one passed. Unknown is a refusal now, and the four stations that *make*
and declared nothing — forge, welder, spot welder, soldering — declare one, each an estimate of what limits the work
rather than the machine's own outside, and each saying so.

**A machine's mass included what it was holding.** `stack` and `armStack` both added `payloadKg` into the mass they
returned, so a 1.39 kg arm holding a 3 kg brick reported 4.39 kg and the forge then attributed 3.17 kg to a 55 g
servo. `kg` is the machine's own now and `holding` is said separately. Every stage still carries the payload in its
own check and every joint's moment still includes it — that was never wrong; only the total was.

Found while fixing the first of those, and logged rather than lost: the pulley family makes one belt profile and
silently substitutes it, so `pulley HTD5 30 12` comes back as a GT2.

The two answered rather than fixed, with the reason written down: the inventor throws most of an ask away and says
nothing (`composeMachine` needs the `notDone` return path `ask/route.ts` already has), and **no tool can render an
invented machine at all**, so this file's own round step 2 — render it, look at it — has never once been possible for
that door. That is why the other faults survived, and it is why nothing said about how a composed machine *looks* is
evidence. Both next, together, because a `notDone` nobody can see is worth little.

## The fault hiding behind the pulley, and the check that would have caught both (2026-10-13)

Fixing the pulley's silent default exposed the fault it had been covering, which is the better half of the story.
`turnAxis(ratio)` orders its driven wheel as `pulley GT2 ${20 * ratio} 8` — 100 teeth at 5:1, 1000 at 50:1. **No
pulley has 1000 teeth.** While the family silently returned its 20-tooth default, every one of those resolved and a
50:1 shoulder was drawn as 20 teeth driven by 20 teeth: 1:1. With the family now refusing honestly, the arm would
have ordered a part that does not exist — so the two had to be fixed together, and the second is the real engineering
fault. **One GT2 stage cannot reduce more than the pulleys it is made of**: 20 teeth is the smallest driver worth
making and 80 the family's largest wheel, so 4:1 is a real ceiling and not a table's opinion. A ratio is staged now
(`beltStages`): 4:1 in one stage, 16:1 in two, 64:1 in three, and beyond that a belt is simply the wrong machine and
is refused — which is what the arm's own refusal text has said all along ("put a worm or cycloidal reducer there
instead of a belt, which is where a cheap arm stops being cheap"). What the stages *deliver* is what the torque is
taken from, not what was asked for, and each stage costs its own 5 % rather than 5 % of any ratio. `RATIOS` is
filtered by what a belt can really give, so the ladder cannot offer a fiction again.

**The check, because a judge costs a round and a check is paid once.** The completeness test next to it could not see
any of this: the pulley *resolved*, it was simply the wrong part. **Resolving is not agreeing.** So every unit the
inventor affords is now asked for each of its parts by the words it orders them with, and every number in those words
must appear in the part that comes back. Verified to bite rather than assumed: re-breaking the pulley read fails it by
name, and restoring it passes. That is the words↔part half of the triangle Manny named — Onshape holds a
configuration to its drawing, `mate.ts` holds a drawing to its declaration, and nothing held either to the words that
asked.

And the list of units existed in **three** places — `cli/machine-main.ts` printed its own copy, `tests/nexus/machine.test.ts`
declared another, and neither could check the other. `everyUnit()` in `ask/machine.ts` is the one list; both read it.
A unit added to one and not the others was checked by nothing, in the very file whose own test asserts that fault.

`perf dump` byte-identical across the round: nothing any kit draws moved. Gate 178 files, 2,087 tests.

## #46 — the machine kit, and the turn that was applied twice

The inventor had no door into the look page. `view/look.ts` picks its kit by id from `KITS`, there was no `machine`
kit in that list, and so every picture the critic judged for six runs was the part kit's family example — a 400 mm
MGN12 rail — whatever sentence it had been given. The fix is one `addKit({ id: 'machine', … })`, registered at the end
of `ask/machine.ts` rather than in `parts/kits.ts`, because a kit that composes a machine must import `ask/` and
`parts/` importing `ask/` is the up-layer import the tidy lint forbids (`world/creatures.ts` registers its own for the
same reason).

That uncovered a second one-line condition behind it: `parts/kits.ts` read `if (k.id === 'part') out.said = words`, so
the ask's raw text reached exactly one kit **by name** and the machine kit was built six times from an empty string,
drawing the 300 mm default each time. It is a declared flag now — `saidWhole?: true` on `Kit` — so a kit that reads
the sentence says so instead of being appended to a growing chain of ids.

**What the first honest picture showed.** A length of stock is declared z-long (`npm run part -- "extrusion 2040 2000"`
gives `20 × 40 × 2000`), and `layUnit` carried three Euler constants built on that declaration, under a comment citing
`kits.ts` as their source. But the part `components.ts` returns has already been stood upright by a `rot` on a child of
its own, so each constant turned it a **second** time: the four members meant to be a frame's uprights cancelled to
flat, the four meant to lie across stood up, and a 2000 mm rail's beam was drawn standing on end. A near-cube frame
(700 × 700 × 750) looks like a frame however its twelve members are permuted — which is exactly why six rounds of
looking at it never caught this, and why the comment claiming to have fixed the blind judge's "a spidery frame whose
uprights terminate in empty space" had only moved it.

The fix is a measurement rather than a better constant: `layAlong(part, axis)` in `parts/space.ts`, the owner of
oriented boxes, lays the part out, finds which way its longest side actually points, and returns the turn from there to
the wanted axis. `layUnit` calls it at the six places that set a length of stock down; every other call site keeps its
literal turn, so nothing but prisms moved. The declared convention can now change in `parts/` without silently
breaking `ask/`. Two tests hold it: a frame's twelve members must run four along each axis (the old code
measures 0 along x, 8 up and 4 across), and a 2000 mm rail's beam must be longer in x than ten times its y or z.

Still wrong and written down rather than left to be found again: the rail's brackets lie along the beam instead of
standing under it, the turn axis and gripper float above it rather than hanging off the carriage, and `machineParts`
still draws only two of the four arrangements it declares — `arm` has its own loop, `gantry` has the quarter-turn
rule, and `rail` and `table` share the gantry's upward stack.

## #55, #49, #50 — the two-mass check measured, then mended

**The instrument, measured (#55).** `npm run part -- --audit` walks both populations and splits every mass by where it
came from. The split needed something that did not exist: `parts/mass.ts` returned one number whatever its source, so
a mass a drawing DECLARES and a mass summed from solids came back indistinguishable, and `npm run part` printed the
two against each other as independent opinions. It now has `ownKg` extracted (one rule used by both, rather than the
arithmetic written twice) and `massWhy`, which splits a total into declared / solved-back / summed; `Part` gained
`fillFrom`, and the five places that solve a hollow casting's fill out of a published mass say what they solved from.
Without that marker the fourth class cannot be told from the second at all.

The answer: **2214 of 2404 inventory items (92.1 %) and 279 of 395 catalogue families (70.6 %) are not drawn**, so for
nine things in ten "no disagreement reported" is evidence of nothing. Of what IS drawn, nothing is wholly declared or
wholly solved; 23 figures (5 items, 18 families) are part summed and part not, and those are the ones where a `0.0 %`
meant arithmetic rather than agreement. `npm run part` now prints which it is and withholds the percentage where the
two numbers are one number.

Three faults in the audit itself, found before quoting any number from it: it asked for drawings by id only, and a
maker file registers its drawing when asked BY WORDS, so 28 drawn items read as undrawn — including the Quest 3, the
item that raised the finding; it counted "equal" as "lighter" on float noise; and it let a part-summed figure print a
percentage. A sweep that silently misses a class is the fault being audited.

**The tests that could not fail (#49c).** `headset.test.ts` is renamed to what it checks — the published mass is
*reachable with this envelope* — and asserts the summed share separately. It also turned out the two items in that
loop are not the same claim: the headset's shell has its fill solved back, so 20 % is a reachability bound, while the
controller is summed throughout, so for it the same 20 % is a real agreement. The test now states which, per item.
Proved by breaking it: `QUEST3.kg` at 5.15 → red, back at 0.515 → green.

**The fabricated mass (#50).** `(size / 10) ** 3 * 9` gave an NMRV 030 243 g while the same family's own `of` named
two 6204 bearings the library weighs at 106.18 g each — 212 g of the 243 g was bearings. It is summed from its own
declared parts now, each term shape × density: a die-cast shell over the envelope, the bronze wheel, the steel worm,
the two bearings, the oil. 030 → 986 g, 110 → 25.6 kg, and `std` labels it a **lower bound**: a published NMRV 030 is
1.6 kg, so this is 62 % of it and the rest is ribs, feet, flanges and the output boss the envelope does not draw. A
maker's weight table is still wanted and could not be reached from this container (Firecrawl credits low, Tavily
rate-limiting) — a network limit, stated rather than papered over with a second invented law.

**The check that would have caught it.** `inventory.test.ts`: no item may declare a mass less than the parts its own
`of` names. It found two more — `servo-micro` (9 g containing an 18 g `motor-130`) and `n20-motor` (10 g, the same) —
and the cause was one id: `families.ts` gave every servo a 130-size can, 20 mm across, including the micro. There is a
`motor-micro` now and the family picks by its own mass, as `gearmotor` already did for the N20. Offenders 2 → 0, and
the test fails by name when `motor-130` is put back.

## The default that lies: two instances in two rounds

`tools/look.mjs` adds `kit=part` when a query does not name a kit. That default is why the critic's eyes showed a
400 mm rail for seven runs (#56) — and then, one commit after it was fixed, why a measurement of the critic's output
on "a small hatchback" came back empty and got written up as "the critic is silent". With `kit=car` the same ask
gives a hundred findings. Both times the tool answered a question nobody had asked it, and both times the answer was
confident. The pattern is worth more than either instance: **a default that makes a tool convenient is the one that
makes its output a lie when you forget it**, and the defence is that the tool says which door it took — `look.mjs`
and `manny-see` both name the kit now, in the line they print.

## Run 7g — coverage, not complaint: the critic's test stops requiring the car to stay broken

`tests/nexus/critic-speaks.test.ts` was built to catch a check that cannot fail, and the first two versions of it were
that fault in a new shape. #83 was one `Set` across five fixtures, so `standing` was satisfied by a park. #87 is worse
and was invisible until Manny read the `fixed` flag on every finding the pins stood on: **eighteen of the twenty-three
pins were `fixed: false` findings — open defects.** Read plainly, the file required a hatchback to go on misdeclaring
its own bores, a panel to go on meeting its mirror out of tangent, and a park to go on being about to tip. The commit
that fixed any of them would have turned the test red saying *"these checks went quiet"*.

What the file was reaching for is whether the rule **ran**, and the two come apart exactly where it matters. So
`critique` now fills a `Looked` census — how many candidates each check considered, zero included — and the kit
fixtures pin coverage. A check that looked at 46 skins and said nothing is working, and fairing those skins keeps the
test green; a check that looked at **0** is dead, and that is #78 and #79 said in one number. Complaint is still
asserted, but on three `Part` literals built wrong on purpose (a cubic metre weighing half a kilo, a bowl taken past
its equator so no die can part it, a ⌀20 bore on a ⌀25 shaft), where pinning the finding is sound because nobody will
ever want to fix the fixture.

**The measurement answered the question I had asked Manny.** Across five kits × three seeds, every coverage count that
was nonzero was nonzero at all three seeds — while two of the old complaint pins moved with the seed: the park said
`standing` at seed 1 only, the street said `interfaces` at seeds 2–3 only. So the old file passed or failed on the luck
of a seed, and two of the pins I had asked about were never structural. That is written into the test's own comment, so
the next reader does not have to re-run it.

### Three faults of my own this round, each found by measuring instead of asserting

1. **"`standing` cannot fire on the machine because nothing declares a foot."** I wrote that in the test file at #83 and
   never measured it; Manny then repeated it back as established fact. It is false — **six 2040 extrusions stand at
   y = 0** and `standing` looked at seven grounded parts. This is #56's rule again (*a claim that code does something is
   a claim about a file, and it gets a check before it gets written down*), and the new thing it shows is the cost of
   getting it wrong in a shared document: the critic inherits the error and hands it back with his authority on it.
2. **`critic.ts` crossed its 860-line ratchet** (to 900) under this round's additions. The number was not raised. The
   three skin checks and their four caches went to `critic-skin.ts` (68 lines), which is what the ratchet's own message
   asks for — one rule per file — and `critic.ts` came back to 847.
3. **The split silently broke the thing I had just built.** #84 derived `EVERY` by reading `say('…')` out of
   `critic.ts`; the split moved `continuity`, `draft` and `radius` into `critic-skin.ts`, so the derived list would have
   **shrunk from twelve to nine and every assertion below it would have gone on passing**. Measured, not guessed:
   `critic.ts` alone yields 9 names, both files yield 12. It now reads every `critic*.ts` in the directory. *A list
   derived from one file is a list a refactor can empty* — the same fault as a check that cannot fire, committed inside
   the fix for it, twenty minutes later.

### Proved by breaking it, both halves

```
saw('room to slide', 0)        → machine: these checks LOOKED AT NOTHING on this fixture … expected ['room to slide']
draft threshold −0.5° → −50°   → draft: a defect built for it, and it said nothing: expected [] to include 'draft'
```

### What the picture tool now says (#89, and two faults in my own #77)

`contracts` reached `lookReady` in the same commit as `critic` and no tool printed it — the comment three lines above it
reads *"the one thing that must not happen is that it arrives and is still unread"*, and its own author broke it in the
same sitting. `look.mjs` now prints the interface verdict, and the census line: *"10 of the critic's checks looked at
this picture; these looked at nothing in it: room to slide, through"*.

Two more faults showed up the moment it was run rather than grepped. The critic's twelve printed lines were the **least
interesting twelve** — `slice(0, 12)` in emission order, which is twelve identical `walls … thickened` normalisations,
so a reader never reached one open defect. Open defects now come first; and then the twelve were all `declared` about
the same five wheel studs, so it is capped at three per check. The car reads honestly for the first time: **53 still
wrong, 47 put right**, with the hub bore 9.6 mm out of what it declares and the hood standing 394 mm from the fender it
is supposed to meet.

Gate green. `critic.ts` 847 lines, `critic-skin.ts` 68.

## Run 7h — what turns is what says it turns

The user's instruction was the right one: *"don't fix the car, give yourself the right tools to accurately regenerate
the car."* So the car's 59 open findings were grouped by cause before anything was touched, and the grouping is the
whole round:

```
declared      38     a part states a feature size its own solid does not draw
room to move  16     something sweeping into something else
radius         3     a panel bending tighter than its sheet is pressed
continuity     2     the hood standing 411 mm from the fender it is to meet
```

`room to move` was taken first, and it took **three wrong hypotheses before a right one**, each refuted by a
measurement rather than by argument. That sequence is worth more than the fix:

1. **"The stub spindles are the cause — they declare `joint: 'bearing'` and the critic ignores it."** Half right: the
   declaration *was* being ignored, and `turning()` now reads it. But it was worth only **2 of 16** findings.
2. **"The exact test uses the whole group's axial extent where the prefilter uses the tyre's ring."** True of the code
   and irrelevant here: measured, `along` = 66 mm against `alongRing` = 65 mm, and the parts complained of lie
   240–670 mm inboard of either.
3. **"A part that other parts `passes` through is the enclosure, not the thing enclosed."** False. Across five kits,
   rims (`passes: [tyre valve]`) and brake discs (`passes: [wheel stud 1…5]`) genuinely turn and genuinely declare it.

The measurement that ended it was the one that should have come first: **attribute each finding to its mover**, which
the finding already names.

```
4 wheels                        6 findings   the fender and the wheelhouse liners over them
reduction gear and differential 8 findings   inner joint housing, subframe cross member, rack,
                                             rack housing, motor, inverter, torque rod
```

**Eight of sixteen came from one part, and its own `says` gives the cause: "a cast housing round its reduction gears
… and its differential".** The drawn solid is the *casing*. `turning()` called it a rotor because its **name contains
the word "gear"** — and so the subframe it is bolted to, the rack beside it, the motor and inverter it sits between,
and the torque rod that holds it were all reported as being in the way of a casting that does not move.

### The root, and the tool

`turning()` — the predicate behind every `room to move` finding — asked the part's **name**: a regex of twenty-two
words with a hand-kept list of name exceptions beside it (`steering|hand|fifth ?wheel|wheel ?(nut|bolt|stud|arch|…)`).
That is this session's recurring fault in the critic's most load-bearing predicate: *a general rule written as a
condition on names*, maintained by adding names.

Nothing in the model said whether a part rotates. Everything else about motion was declarable and declared —
`travel` (range of motion: steer, bump, slide from–to), `swing`, `link` (moves as one), `movesWith` (carried with,
by name), `joint` (the kind of joint), `iface {kind:'drive', torque, to}` (what drives what, with numbers) — but not
the one fact the predicate needed. So `Part.rotates` now exists:

```ts
rotates?: false | { within?: string };
```

`false` says it does not turn however it is named. `{ within }` says it turns inside the member it names — it sweeps
its own drawn solid and no more, and what it must clear is that member's bore, which is an interface and is checked
as one. Left off, the name list still answers, so nothing that does not say is changed. `turning()` reads the
declaration first, the joint second, the name last.

### Measured, against a prediction written beforehand

```
                 predicted   got
open findings     59 → 49    49
room to move      16 → 6     6
```

The numbers were right and the attribution in the prediction was wrong (it blamed the spindles for 10 of the 16; they
were 2, and the casing was 8). `room to move` on the hatchback is now its four wheels against the bodywork over them
and nothing else — a real question, and a small one. `tests/nexus/turns.test.ts` holds the three answers apart (what
the part declares, what its joint implies, the name list for what says nothing) and ratchets the hatchback's count:
it may fall as the bodywork is fixed, never rise.

`critic.ts` reached 863 against its 860 ratchet. The number was not raised; my own comment was cut to 857.

### What is left, in order of size

`declared` is now 78% of what remains — 38 findings on 12 parts, every one of the form *"it says ⌀24 and the nearest
it draws is ⌀14.4"*. That is the same shape as this round's fault one level in: a number stated in one place and
drawn in another, with nothing making the two agree. It is the next root, not the next patch.

## Run 7j — the critic's own review, acted on in the same sitting

Manny returned no BLOCK on 7g/7h and four questions worth more than a verdict. Three were taken immediately because he
was right and each was small:

- **A field written and never read, inside the fix for exactly that fault.** `rotates` shipped as
  `false | { within?: string }` — the named MOVES_WITHIN edge — and `turning()` returned `null` for both, so the
  member's name was carried and nothing read it. `Part.rotates` is `false` only now, and the comment says the named
  form comes back when `contracts` reads it. *Within the hour of writing "nothing is carried across a boundary without
  something that reads it" into the ledger.*
- **A cap dressed as a ratchet.** `toBeLessThanOrEqual(6)` stays at six after two of the six are fixed and permits
  them back. `CLAUDE.md` asks a ratchet to fail on a new one by name **and** on a fixed one until its line is deleted;
  `<=` does only the first. Now `toBe(6)`, with "measured, not chosen" and the breakdown in the file. The two-way form
  had been written two commits earlier and then not reached for.
- **The prefilter: containment, not magnitude** — *and the conclusion below was wrong, corrected in Run 7l.* I had
  looked at the 1 mm difference and left it, which was the wrong question; the right one is whether the box *contains*
  the cylinder. The two were the wrong way round (box = the tyre's ring, exact = the whole group), so the shape
  shipped is box = group, exact = ring. Hatchback findings unchanged at 6 — **and that is what the algebra predicts,
  not weak evidence**: see Run 7l.

### The census he asked for, run once, and it found something bigger than the casting

He asked: how do you find the next `reduction gear and differential` without another round of grouping findings by
cause? Answer: list every part the name list calls a rotor that declares nothing and has nothing round under it.

```
4-rotor drone battery · camera · foot 1–4 · flight controller · radio receiver
· speed controller 1–4 · top plate · bottom plate · motor mount 1–4 · arm clamp 1–4
```

**`TURNS` contains `rotors?` and the thing is called "4-rotor drone", so every part of it matches.** A battery is a
rotor. A foot is a rotor. A radio receiver is a rotor. They raise no findings today only because `movers` keeps the
outermost of what turns and the drone's own root matches too — the whole aircraft reads as one rotor and its three
hundred parts as its insides. So the name list is not merely answering for parts that say nothing: on this kit it
matches **the product's name**, three words from the part's own identity, and the silence is an accident of which
match happens to be outermost.

The census is the right instrument and wants `movers`' own filter (outermost, not detail, not sealed) before it earns
a place in the gate. Not built this round.

### Deferred, with the reason written down

`declared` at 38 is next and **not** by fixing twelve parts. Three reasons to doubt the instrument first, all his:
`roundsIn` pushes a tube's **outer** diameter so a walled tube's bore is invisible to it; `axesFrom` may read no
prism `holes` branch, making every bore through a rolled section invisible too; and the `studs` comparison is
asymmetric — thread **labels** for a `requires` (under a comment explaining why root-against-nominal is wrong) and a
raw diameter against nominal for a `provides` eight lines later. Two experiments decide it before any part moves: run
`declared()` over catalogue parts drawn from published standards (clean there and dirty on the car means the car is
lying), and group the 38 by sign and by branch. And a property of the check itself: `near()` takes the closest
diameter anywhere under the part, so strictness **falls** as a part gets more detailed.

Three of his doubts stand unacted: no check owns *"nothing is below what it stands on"* (the machine's PTFE tube at
−24 mm); refuted hypotheses live in prose where no future round would look for them; and the three-seed result is a
sentence rather than a thing that runs.

**A process slip in this round worth more than its cost — and the lesson I first wrote for it was the wrong one.**
`critic.ts` crossed its 860 ratchet again on the comment explaining the prefilter fix, and I "verified" tidy with
`npm run tidy 2>&1 | tail -3`, which passed while the gate failed on it four minutes later. I recorded the cause as
"three lines was too few, use a filter that would show the failure". **That is not the cause.** `tail -100` would have
passed too, and so would `| head -20`: **a pipe replaces the exit status**, so the command exits with `tail`'s 0
whatever `tidy` did. The check could not fail at *any* truncation. The durable rule is **read a check's exit code,
never its stdout** — or `set -o pipefail` before piping one. A lesson that names the wrong cause is worse than none,
because it feels learned (docs/MANNY.md #98).

## Run 7l — the critic corrects himself, and I had repeated his error as fact

Manny returned no BLOCK on 7j and the most valuable item on his page was a retraction of his own #94, which I had
already shipped and written into this file as established.

**The two tests are ANDed, so swapping which quantity each uses did not change the region at all.**

```
before:  box (hub, alongRing + sideRoom)  ∧  cylinder (ctr, along + sideRoom)
after:   box (ctr, along + sideRoom)      ∧  cylinder (hub, alongRing + sideRoom)
```

Axially, ring-interval ∩ group-interval = the ring either way; radially, the square of half-width `sweep + clearance`
∩ the circle of that radius = the circle either way. **The conjunction is identical** — which is why the hatchback
stayed at 6, and that count was not weak evidence, it was the arithmetic. So the sentence *"a part the cylinder would
have caught was never tested"*, his and then mine, is **false**: anything the old box rejected was outside the
conjunction and the cylinder would have rejected it too. His own diagnosis of the mistake: *ask whether a thing is a
filter or a term before asking which direction it errs.* Mine is worse than his, because I took a claim about
behaviour from a report and put it in the ledger without deriving it.

**What the commit actually bought, which is real.** Before, the box set the *axial* extent and the cylinder the
*radial* one — **both load-bearing in different directions** — so anyone deleting the box as "just a prefilter" would
have silently widened the region to the group's whole length. Now the cylinder is the region and the box is a genuinely
removable fast-reject. Worth the commit, for a different reason than the finding gave.

**And his remaining hole, closed by construction.** `along` is measured over nodes filtered with `ownLink`; `ring` is
filtered **without** it, so a mover carrying a rubber ring on another link can reach past the group and the box stops
containing the cylinder. The containment was an argument in a comment. It is now arithmetic: the box's axial
half-length is `max(along, |hub − ctr| + alongRing)`, so it holds whatever the two filters disagree about — the
project's own rule, *coincidence by construction, not by checking*.

### Standing questions of his I have not answered, recorded so they are not re-derived

- **Does `camera` match `TURNS` on its own name?** No — the census printed `n.p.name` and the names carry the kit's
  prefix, so they are `4-rotor drone camera` and the **product name is inside every part name**. His one-line
  candidate follows from that and is untested: match a part's name with its root's name stripped from it first, which
  would kill the whole drone class with no declarations at all.
- **Why does `turning()` guess when `parts/mechanism.ts` owns "how many jointed parts can still move, and which
  ways", and `critic.ts` never calls it?** Same shape as `joint` was, and `JOURNALLED` is the proof that reading the
  model beats improving the list.
- **`rotates?: false` can only ever say no.** A rotor cannot declare itself one, so the name list can be patched
  around but never retired. If the intent is "declaration first, name last", the field has to be able to say yes,
  or "last" means "always".
- **The drone's silence is a load-bearing coincidence.** Twenty matches are suppressed only because the root matches
  too and `movers` keeps the outermost. A rename, or a change to that rule, turns them into twenty findings at once —
  and the same suppression means the drone's *real* rotors are not being checked either.
- **`rotates: false` has one declaration in the tree** and the test that holds it uses a `Part` literal. Deleting the
  real one would fail only the hatchback's `toBe(6)`, and not say why.

## Run 7m — the edges I proposed would have caught almost nothing, measured

The user's diagnosis: *the reason things get missed, or take too long, is a lack of edges that make a class of mistake
impossible — only habits — and too few tools that make the work precise.* The diagnosis is right. **The four edges I
proposed in answer to it were mostly wrong, and Manny broke three of them with claims I verified rather than adopted.**

| My candidate | Verdict | Checked |
|---|---|---|
| a hook rejecting `npm run gate\|tidy` piped into anything | **forbids a syntax, not the cause** — `npm run tidy > /tmp/x; tail -3 /tmp/x` has no pipe, keeps `$?`, and fails the same way if nobody reads it | by inspection |
| every optional field on `Part` must have a read site outside its own file | **defeated by its own motivating example**: `if (p.rotates === false \|\| p.rotates?.within)` in `critic.ts` *is* a read of `.within` outside `kits.ts`. The rule passes it, and it had a passing test | `git show 316ea63` |
| a claim about code in the ledger must carry a `file.ts:line` | **institutionalises a citation that rots.** Three cited lines, all written this week, all already wrong — and a line-number rule marks all three compliant | all three read at head |
| a `why` door (not built, so not named as a script) — findings grouped by check and attributed to source | **survives.** It claims nothing, so there is nothing in it to be wrong | — |

The three rotted citations, read at `97d3e66`:

```
cited  critic.ts:246   as the `through` skip        → today: "// ---- held up: the embodiment's load path …"
cited  critic.ts:182   as the exact cylinder test   → today: the BOX test (env.intersectsBox … sat)
cited  view/look.ts:100 as the line that binned it  → today: a comment header
```

The second is the sharpest: it now points at *the other clause of the `&&`* — the precise confusion Run 7l existed to
correct. A citation that decays into pointing at the opposite thing is worse than none.

### The count that decides the direction

Of the nine faults in this session's log, **what found each**:

```
rules    2   critic.ts over its line ratchet (4 crossings, 4 catches) · the gate catching the `tail -3` consequence
looking  7   Manny running the tool I described wrongly · me re-running with the right kit · Manny reading the `fixed`
             flag · Manny reading the test a park could pass · Manny finding the unread field · Manny deriving the
             algebra I had adopted · the blind judge naming two faults in one picture
```

**Rules caught two. Looking caught seven, and five of those were Manny or the blind judge.** So the shortest path is
not a fifth lint. It is that **every judge already in the tree prints its verdict where a person sees it without
asking** — which is the wire this week kept finding missing: the critic's verdict at `look.ts`, `contracts` on
`lookReady`, the `Looked` census. Three built, by hand, one at a time.

### The one edge on the table that makes a mistake impossible, and it was not mine

**Every check prints its verdict as its last line** — `TIDY: PASS`, `TIDY: FAIL (1 rule: critic.ts 864 > 860)`. Then
`tail -3` is *correct*, `tail -1` is correct, a log read a week later is correct, and a future tool that truncates is
correct. It removes the cause instead of banning one spelling of it, and it survives `tee`, scripts and re-quoting.
Not built this round; it is the next one.

### And the fifth edge, which is a habit with teeth rather than a lint

Run 7h wrote its predicted numbers before the change: `59 → 49`, `16 → 6`, and got both. **The valuable part was that
the attribution was wrong** — the prediction blamed the spindles for 10 of 16; they were 2. Unexamined, "most of this
comes from the spindles" becomes a false sentence in this file that the next round builds on. So: a round that changes
behaviour records predicted-against-measured **including what did not match**, and every fault fixed carries one line —
*the guard that now makes this impossible: `<name>`*, or *none, because `<reason>`*. Eight of nine had no guard. That
turns the eight into a list with a count that can only fall, and makes "fixed without a guard" a visible choice.

### And the best evidence in the whole argument arrived while writing this entry

The first draft of the table above named the surviving candidate as a runnable script. `npm run tidy` refused the commit:

```
every npm script the prose names is in package.json
the prose names `npm run <a script>`, which package.json does not have
```

**One of the two claim-checking rules that already exist caught me naming an unbuilt tool as though it were real, in
the paragraph arguing that such rules are what is missing, within a minute of writing it.** Nothing else in the loop
would have caught it: it would have shipped, and a later reader — or a later me — would have run it and
found nothing. That is what the user's "edges that don't allow failure" means, working, and it is the strongest
argument for extending that one family rather than inventing new ones: it does not depend on anybody remembering.

## Run 7n — the verdict line: the one edge that removes the mistake instead of forbidding it

Built. `tools/verdict.mjs` runs a check and prints, as its **last line**, `TIDY: PASS — 2.1s` or
`TIDY: FAIL (exit 1) — 2.3s`, taken from the **exit status and nothing else** — never parsed out of the child's own
output, which would be the same fault one level up. The status is passed through unchanged, so `&&`, `set -e` and CI
behave exactly as before. `test`, `tidy`, `gate` and `quick` go through it; each keeps a `:run` twin with the real
command.

**Demonstrated on the exact command that lied.** With the line ratchet deliberately broken:

```
$ npm run tidy 2>&1 | tail -3
   Duration  1.58s …
TIDY: FAIL (exit 1) — 2.3s        ← the lie is now the truth

$ npm run tidy 2>&1 | tail -3 >/dev/null ; echo $?     → 0      (the pipe still eats the status)
$ npm run tidy >/dev/null 2>&1    ; echo $?            → 1      (unpiped, unchanged)
```

The pipe still swallows `$?` — that cannot be fixed from inside a program. What changed is that **the status is no
longer the only place the answer lives**, so reading the output is now sufficient however it is truncated. `tail -1`
is correct, `tail -100` is correct, a log read next week is correct, and a future tool that truncates is correct. It
survives `tee`, a shell function, a script, and being re-quoted by someone who never reads the file.

Why this and not the hook that bans the pipe: **a ban addresses a spelling.** `npm run tidy > /tmp/x; tail -3 /tmp/x`
has no pipe, keeps `$?`, and ends in the same false conclusion if nobody reads it. This removes the condition under
which the mistake is possible, which is what "an edge that does not allow failure" has to mean.

**And it is held by a ratchet, not by memory.** `tidy` now asserts that each of the four checks matches
`^node tools/verdict.mjs [A-Z]+ ` and has its `:run` twin. Proved by unwrapping `tidy` and watching the rule name it:

```
`npm run tidy` does not go through tools/verdict.mjs, so its output can be truncated into a lie:
expected 'vitest run tests/nexus/tidy.test.ts' to match /^node tools\/verdict\.mjs [A-Z]+ /
```

So the next check added without a verdict fails by name, which is the difference between this and a resolution.

Gate: `GATE: PASS — 182.9s`, 180 files, 2116 tests.

## Run 7o — the verdict line was half finished, and the half missing was a pass that could not fail

Manny ran one command against the thing I had just shipped as "the edge that removes the mistake":

```
vitest run tests/nexus/tidy.test.ts -t "zzzz_no_such_test_name"
   Test Files  1 skipped (1)
        Tests  16 skipped (16)                exit 0   →   TIDY: PASS — 0.2s
```

**Sixteen skipped, nothing run, exit 0, and a pass with my name on it.** Same family as #39, #49 and #82: a verdict
taken from the exit status alone cannot fail when the child does nothing. Verified before adopting.

His distinction is the one I had missed and it is the whole fix: **what must never come from the child's own words is
the VERDICT. A count is not a verdict, it is evidence** — and evidence may come from a structured artefact written to
a path the wrapper chooses. So `verdict.mjs` now passes `--reporter=json --outputFile=<f>`, deletes `<f>` first so a
stale count cannot be read as this run's, and says `PASS (2123 of 2123 ran)`. A test run that wrote no count is a
FAIL, not a pass. `tsc` is asked for no count because it has no test to count, and the line says so —
`TYPECHECK: PASS (no work counted)` — an honest hedge instead of a bare PASS.

**And my first attempt at the count was the same fault again.** I read `numTotalTests`, which counts **skipped** tests,
so the fix printed `PASS (0 of 16 ran)` on the exact run it was written to catch. What skipping cannot fake is a test
that *passed*. Measured both ways afterwards:

```
all skipped →  FAIL (exit 0 but nothing ran: 0 of 16 tests passed, the rest skipped)   exit 1
a real run  →  PASS (16 of 16 ran)                                                     exit 0
```

### The name list I had written straight back in

The rule holding the verdict listed four script names — *which is the fault two rounds were spent taking out of
`turning()`*. A fifth check under a new name passed it. It is now a property of the command: **a script is a check if
it runs a verifier** (`vitest run`, `tsc --noEmit`). It caught `typecheck` on its first run — a fifth check I had
missed while hand-listing four — and it leaves `test:watch` alone, which is `vitest` without `run`, a watcher rather
than a check, something a name list gets right only by luck.

### The bypass I built and then mandated

`gate:run` held the real command, had no verdict, sat one keystroke from `npm run gate` under tab completion, **and the
ratchet required it to exist**. The twins existed only because the commands are chains and a nested `npm run` of the twin
was how to get a chain into one argv. `verdict.mjs` now takes several commands separated by `--`, runs them in order
and stops at the first failure — no shell, no twin, and the clause of the lint that mandated the bypass is gone with
it.

### And nothing checked the thing every check now speaks through

`tests/nexus/verdict.test.ts`, six cases: PASS, FAIL **with the child's own status passed through** (so `&&` and
`set -e` still work), a killed child, a command that is not there, a chain stopping at the first failure, and the
zero-run case in both directions. Each is silent when broken, because every one only shows up on a day when something
else is already going wrong.

**One residual, written down because the convention has to live where a reader meets it:** `tail` is safe now, `head`
is not. A log cut from the top, a killed run or a crashed wrapper prints **no verdict line at all** — and *no verdict
line is not a pass, it is no answer*. That sentence is in `tools/verdict.mjs`'s own header.

Gate: `GATE: PASS (2123 of 2123 ran) — 182.3s`, 181 files.

## Run 7q — the tool I had written five times by hand

The user, cutting through two rounds of mine: *"fuck the car ... that's not the point forget the car fix your tools."*
Right, and the measurement was already on the page: **of nine faults this session, looking caught seven and rules
caught two** — and the thing looking cost was that every look had to be rebuilt first.

**Five throwaway `zz_probe_*` tests in one session, each deleted before committing, each asking the same question of a
different thing:** findings grouped by check; which mover owns each; which obstacle each names; the ratio between what
a part declares and what it draws; whether the instrument is clean where the truth is published. Between them they
found that 92 % of a car's findings were two checks, that eight of sixteen came from one cast housing, that three
hypotheses about the cause were wrong, and that thirty-eight `declared` findings fall on **exactly three ratios —
1.26 ×20, 0.6 ×14, 1.2 ×4**, which is a sizing bug rather than twelve broken parts.

Every one of those was one pass over `perfect()`'s own output. Having to rebuild the pass each time is *why three
hypotheses got formed before the first measurement*: reasoning was cheap and looking was expensive. That is the whole
of what `npm run why` changes.

```
why: "a small hatchback"   kit=car  seed=1  →  hatchback
49 still wrong, 40 put right, 2 rounds

declared  —  38 of 49 (78%)
  12 parts: hub ×8, wheel stud 1 ×4, wheel stud 2 ×4, …
  drawn / declared = 1.2600  ×20   e.g. wheel stud 1: ⌀12 → ⌀15.12
  drawn / declared = 0.6000  ×14   e.g. hub: ⌀24 → ⌀14.4
  drawn / declared = 1.2000  ×4    e.g. hub: ⌀12 → ⌀14.4
…
10 of the critic's 12 checks looked at this; these looked at NOTHING: room to slide, through
```

**A repeated ratio is one bug; a spread of them is many.** That line is the door's reason for existing: it turns
thirty-eight findings on twelve parts into three constants, and three constants into one question instead of twelve.

### And the fault reproduced itself inside the tool built to stop it

The first run printed `kit=part → end cap for 2020 profile` and `0 still wrong`, because I had given it the same
guess-a-kit fallback `look.mjs` has — the default that twice turned a measurement of the critic into "the critic is
silent". **So it no longer guesses:** no kit named in the words, no answer, and it prints what it would take instead.
Three instances of one fault, the third inside its own fix, is the clearest case this log has for why a convenience
default is a liability in an instrument.

Gate: `GATE: PASS (2123 of 2123 ran) — 174.9s`.

**Still unbuilt, and still the thing my own count points at:** every judge printing its verdict where a person meets
it without asking. Three of those wires exist (the critic under the picture, `contracts`, the census) and each was
built by hand after the fault it would have caught.

## Run 7r — the judges that had no caller, and the solver that had no caller

Four things were built, and all four were wires to work that already existed and never reached a person.

**1. Three judges on the look page spoke under every picture for the first time.** `view/look.ts` has exposed
`held()`, `frame()` and `clash()` on `window.look` for four rounds, and no tool printed one **unasked**.

> **Correction, written the same day (docs/MANNY.md #105).** This round first claimed they had *zero callers in
> `tools/`*, and that was false: `tools/bench.mjs` has had `held:` and `frame:` subcommands since the commits that
> added the judges, and called `clash` before that. The measurement behind the claim grepped two of the eight tools
> and I wrote "zero" from two — the word-for-a-use fault, in my own evidence, in the round whose subject was tools
> that lie. The true statement is the narrower one above, and it is still worth the round: a verdict behind a
> subcommand is a verdict you must already suspect you need. `tools/look.mjs` now prints all
three under every picture, and the first run on a hatchback said:

```
$ node tools/look.mjs dist-view-dev <out> "hatch|kit=car&words=a%20small%20hatchback&view=three"
held: 13 groups held by nothing, 0 joints with something rigid laid across, 8 links that rub
  worst float: 195 parts, 36.4 kg — 21 in steel rim, tyre 275/35R21, wheel disc
frame: its sheet is 9 pieces joined by structure alone, the largest 35 parts / 32.4 kg
clashes: 1177 touching pairs, 16 where one passes into another — worst: tunnel top into battery by 54.0 mm
```

None of that was being reported anywhere. A 54 mm interpenetration had been in every render for rounds.

**2. A rule so the next one cannot happen quietly.** `tidy.test.ts` now reads the page's API and requires every
member to be printed by `tools/look.mjs` — the door that speaks under every picture without being asked — or to
carry its reason on its own comment line. (As first written it asked only that *some* tool name the member, which
`bench.mjs` already did, so the rule passed on the very case that motivated it; corrected with #105, along with
seven member spellings it could not see and a `prev()` off-by-one that let one member's excuse cover its neighbour.) It is a condition on the API's members,
not on three names, so a new member is caught by *being new* — and it is two-way: an excuse fails once a tool reads
that member. It found two more on its first run (`project`, `unproject`), and both halves were mutation-tested:
adding a `probe:` member failed it, and making a tool mention an excused member failed the other half.

**3. `mobility()` was called only by its own unit test.** A rank-based degrees-of-freedom solver — joints written by
what they leave free, redundant constraints reported, Grübler's formula deliberately not used — sat in
`parts/mechanism.ts` for the whole session with **no caller in the make pipeline at all**. So no made thing had ever
been asked how many ways it could move.

**4. `npm run moves`** — the motion graph, from what parts already declare. The edges are the ones a mechanism has:
`CONNECTED_TO` (joins), `MOVES_WITHIN` (what passes through what), `CONSTRAINED_BY` (its joint and what that leaves
free), `RANGE_OF_MOTION` (travel), `REQUIRES_CLEARANCE` (the envelope that sweep needs), `TRANSFERS_FORCE_TO` (a
provided interface met by a required one). Each from a declaration, never from a name.

### Three faults in the new tool, found by running it

- **`⌀NaN swept`** on every arm, bush and ball joint: I had written `{ cyl: { r, h } }` and `{ sph: { r } }`, and the
  real shapes are `{ cyl: [r, h, r2?] }` and `{ sphere: n }`. An unknown shape now returns `null` and is *said* to be
  unknown, because a zero half-size is a part that needs no room, which is a lie.
- **"turns about its own axis"** printed for coil springs and damper rods, because the draft asked whether a part had
  a joint rather than whether that joint leaves a *turn*. A `slide` and a `spring` leave it prismatic.
- **Every wheel on every car reported as moving with nothing saying how** — an artefact of where the declaration
  lives: travel is on the wheel and the bearing is on the hub beside it, both of one rigid link. The question is
  whether anything *in its link* says what holds it.

### The one that matters: a DOF number over axes I had made up

The first wire into `mobility()` guessed each joint's axis — `/slide|rod|damper/` in the name meant up, anything else
sideways — and printed **"43 degrees of freedom"** for a hatchback. That is the exact fault two rounds of this session
were spent removing from `turning()`, rebuilt inside the tool meant to replace guessing with measurement, and it
produces something worse than no answer: a confident wrong number with no way to tell it from a right one.

So the axis is now **derived or refused**. A declared slide direction is the axis; a solid of revolution has exactly
one axis by construction (`lathe`, `cyl`, `cone`, `torus`, `capsule` are all spun about y in `kits.ts`'s own words,
and a `prism` is drawn along z), carried round by the part's own `rot`. Anything else is **left out of the mechanism
and counted**, and what was left out is printed before what was computed:

```
$ npm run moves -- --kit car "a small hatchback"      (this run's numbers; Run 7t and 7u changed them)
its mechanism: 18 rigid bodies (its own frame the ground), 23 joints it could use of 38 declared
  15 left out, so the count below is of what is left:
    stub spindle left: nothing says which way its bearing acts: no slide direction declared and its shape has no axis
    rack bush left: both ends are the same link (the frame), so it joins nothing
```

Reading only `cyl` and `cone` had dropped every bearing, race and spindle in the car — a bearing is *lathed* — which
is why the honest first count was 61 and meaningless. With the declarations read properly it is 23 of 38, and the 15
left out are **two named data gaps, not tool bugs**: a part whose shape cannot say which way its joint acts, and a
part whose `joins` names nothing across the joint. Both were silently un-fixable before the number existed.

`tests/nexus/moves.test.ts` ratchets that coverage both ways — 38 declared pinned exactly, 23 usable a floor, 15
dropped a ceiling — so coverage cannot fall without the gate saying so, and `npm run why` now prints the motion
verdict unasked beside the critic's.

**The count this round adds to Run 7m's:** of the four things built, three were wires to finished work nobody could
reach, and the fourth was a general rule. Nothing new was computed. The whole round was *delivery*.

## Run 7s — merge, reattach, or delete: what was built and could not be reached

Run 7r found `mobility()` by accident. This round built the measurement that finds the rest of them, and then acted
on its answer under the user's own rule for it: **merge, reattach, or delete**.

`node tools/unwired.mjs` walks the module graph from the real entry points — `src/nexus/cli/*.ts` and
`src/nexus/view/*.ts`, the only places execution starts — and reports what no running path arrives at. The first
honest answer:

```
2064 exported functions, consts and classes; 196 of 219 files reached from 44 doors
153 exports named by nothing but tests/ — finished work with no door
 89 exports named nowhere at all, tests included
 22 whole files not reached from any door          ← 2,750 lines, behind a green gate
```

**A passing test is indistinguishable from a working feature when the test is the only caller.** Nothing in the gate
can tell them apart, which is how a rank-based degrees-of-freedom solver sat unreachable for the whole session.

### The tool got its own answer wrong three times, and each error was a known fault of mine

It would have been very easy to publish the first number. It was wrong, and so were the next two:

1. **`makeMachine` reported unreachable.** Nothing outside `machines.ts` names it — and `VEHICLE_KITS`, in that same
   file, calls it on every car the kit route builds. "No caller outside its own file" is not "unreachable". Fixed by
   classifying *live (internal)* separately.
2. **`mobility` reported live, citing `ask/conceive.ts`.** That file has `'mobility'` as a `NeedKind` string and in
   nine comments, and calls nothing. A word-boundary regex counts string literals, type members and prose as callers.
   Fixed by counting **imports**, resolved against the module graph — exact, and the same question the graph already
   answers.
3. **`world/creatures.ts` reported unreachable.** `view/look.ts:38` has `import '../world/creatures';` — a
   side-effect import, which has no `from` clause for the walk to see, and `ask/machine.ts:684` says in plain words
   that this is how it runs.

All three were found by checking the tool's answer against a case whose answer was already known. A census earns
belief no other way, and two of the three were the exact faults — the guessed shape, the word taken for a use — that
this session has been removing from other code all day.

### Then the rule, applied

- **The root barrel `index.ts` → deleted.** A barrel re-exporting fifteen directories: a second owner for every name in
  the tree, named by nothing in `src/` and by no test. The lint caught the deletion twice (its root-file list and a
  stale path in this very document), which is the lint doing its job.
- **`ask/rules.ts` (under `src/nexus/`) → deleted** with its 3 tests. IFS, THENS, `due()` and a robot's rule list: the
  superseded first version of robot rules. `view/forge.ts:3327` makes each robot's rules a pipeline on the boards
  instead. Two owners for one concern is what `docs/OWNERS.md` exists to prevent, so the older owner went.
- **The three Nexus slices → reattached.** `npm run substrate` runs the beam on two supports, the bracket on a post
  and the bar on a free hinge, and prints each one's verdict. Eleven `substrate/` files became reachable.

```
$ npm run substrate
the beam on two supports — a load at rest on a span, its section left free
  its system: 24 symbols bound, 17 left free (b, h, q); 3 constraints: a constraint CANNOT BE DECIDED
  its choice: 5 of 16 admissible → one picked
```

The door's own first draft printed `0 bound, 0 left free` for every slice, because `Solution.bound` is a Record and
the free list is `free`, not `unbound`. **Third guessed shape of the session** — after `{ cyl: { r, h } }` and
`{ sph: { r } }` in `moves.ts`. The pattern is exact and worth naming: *writing a field name from memory instead of
reading the type produces a confident zero, and a confident zero reads as good news.*

After all of it: **119 test-only, 63 dead, 11 unreached files** — from 153 / 89 / 22.

### What is left, named rather than quietly dropped

The 11 remaining are all `substrate/`: `attempt`, `clock`, `compose`, `explore`, `hold`, `project`, `rate`, `scale`,
`study-joint`, `study-swing`, `tune` (978 lines). Three of them need Jolt, which lives in `tests/conformance/helpers`
and not in `src/`, so a door cannot start one yet. The other eight need their types read before they can be called
correctly — and after being wrong about a field name three times today, writing eight more calls from memory is the
one thing this round has earned the right not to do. They are reattach-or-delete next, each on its own merits.

## Run 7t — Manny was right four times, and the worst of it was mine

Four BLOCK findings on Run 7r, all upheld, all fixed. The round that was about tools that lie shipped four of them.

**#105 — "zero callers in `tools/`" was false.** `tools/bench.mjs` has called `look.held()` and `look.frame()` since
the commits that added them. My evidence grepped `look.mjs` and `manny-see.mjs` — two of eight tools — and I wrote
*zero*. That is the word-for-a-use fault from Run 7s's own census, committed in my own measurement, in a round whose
subject was instruments that overstate. Worse: the rule written "so the next one cannot happen quietly" asked only
that *some* tool name the member, which `bench.mjs` already did, so **it would have passed on the case that
motivated it** — proved by running the reader against `bench.mjs` alone.

Now the rule holds the property that is true and worth holding: printed by `tools/look.mjs`, the door that speaks
under every picture without being asked. It reads seven member spellings it was blind to, excludes JavaScript's
keywords by name, resolves an `Object.assign` member's excuse at its own definition, and `prev()` reads the line
above the member instead of the line above *that* — which had been letting a one-line member's trailing excuse cover
its neighbour. First run caught seven more members. `mass` and `lint` now print under every picture, and `lint`
immediately reported **9 faults on a hatchback** — eight paper-thin walls and one part hidden inside another — that
nothing in the tree had been saying.

**#108 — the degrees-of-freedom number was fabricated, and the ledger blamed the data for it.** When nothing across a
joint named a link, `mechanismOf` attached the joint to the thing's own frame. Not an edge case: **56 of 56**. Every
joint that reached `mobility()` had been grounded by that line, so the engine, the rack and the anti-roll bar were
welded to the shell — which is why an engine mount "joins nothing". Run 7r called this "two named data gaps rather
than tool bugs"; one of the two *was* the tool's default. And the lookup was narrow on top of being wrong: it
resolved the far end against movers only, so a rail — which declares no joint and is still what a carriage slides
along — could never be found. Both fixed: the far end is derived against every part's link, and an underivable end
is **dropped with its reason**, never grounded.

**The honest number is `0 of 56 joints usable`, not 23.** The 46 degrees of freedom were entirely this line's doing.

**#106 — a body no joint touches is not a degree of freedom, it is a missing joint.** 21 of the car's bodies floated,
carrying six freedoms each into a total printed as the mechanism's mobility. Both doors now name the floats *before*
any total, and with no usable joint there is no mobility at all: `npm run moves` prints `NO DOF (no usable joint)`
and `npm run why` prints no number. A kit with one declared joint and none usable had been reporting twelve.

**#107 — keyed by name, so 348 of 605 parts never entered the graph.** `damper tube` ×4 collapsed to one. Keyed by
path: 46 movers → 66, "38 declared" → its real 56. The left/right asymmetry on a symmetric car is gone.

### The pins were a floor, and a floor cannot catch a number wrong in the admissible direction

`moves.test.ts` asserted `joints >= 23` and `dropped <= 15`. Both passed while both measured a fabrication. Every
number in it is now pinned **exactly** — 56 declared, 0 usable, 21 floating, 66 movers — each to be moved by hand
with a ledger line saying why. That is the same lesson as `toBeLessThanOrEqual(6)` in Run 7h, re-learnt: a ratchet
that only resists one direction is blind to being wrong in the other.

**#104 — `npm run quick` failed on its own ordinary path**, because `vitest run --changed HEAD` exits 1 when it
selects nothing and selecting nothing is the point of `quick`. `--passWithNoTests`. An alarm that fires on the
normal path teaches its reader to ignore the alarm, and the first casualty would have been the verdict line.

Five more findings (#109–#113) are answered in writing rather than fixed: `half()` duplicating `space.ts:shapeBox()`,
three rotation faults including a ZYX/XYZ Euler mismatch that is a trap rather than a wound today, the shared-`''`
link bucket silencing `unsaid`, and one missing import that hides the `machine` kit from both new doors. Each says
why it waits — mostly that this turn re-pinned the car's numbers twice already, and changing the envelope maths in
the same pass would leave no way to tell which change moved which number.

**The count for this round: of nine findings, I had already written four of them into a ledger as facts.** The gate
was green for every one.

## Run 7u — one owner for the geometry, and the second answer deleted

Manny's four queued findings, done in the order he set. All of them were one fault wearing four faces: **this file
kept its own answer for geometry that `parts/space.ts` already owned.**

`half()` is deleted. `rot3()` is deleted. `moving()` no longer walks the tree: it walks `space.ts:layout()`, which
composes every part's world matrix under every ancestor and boxes its shape with `shapeBox`. What that removed:

- **13 of 46 movers said "its shape does not say how wide it sweeps"** about tubes, lofts, prisms and surfaces that
  `shapeBox` sizes exactly. Now **0**.
- **The Euler order is right by construction, not by my agreeing with it.** `rot3` composed Rz·Ry·Rx — three.js's
  `ZYX` — against the `XYZ` the renderer and `space.ts` use: 40° apart on a part turned about two axes. No car joint
  had two non-zero `rot` components, so it was a trap rather than a wound, and it was a trap I set.
- **Ancestors' rotations count.** The hand walk summed `at` down the tree and ignored every ancestor's `rot`, putting
  5 of 46 movers up to 199 mm from where they are drawn — and those points are the joints' `at`, which is to say the
  moment arms the solver works from.
- **A declared slide direction is carried out of its own frame.** On a composed gantry the tool had said "slides along
  [0,0,1]" for an axis that moves along x.
- **The torus disagreement is settled against me**: `space.ts` and `THREE.TorusGeometry` say z, this file said y.

Three regression cases pin the rotation work so it cannot drift back, and one of them asserts against the renderer's
own answer — `new THREE.Vector3(0,1,0).applyEuler(new THREE.Euler(...rot))` — rather than against a number I wrote
down, so the two cannot diverge silently again.

### Right boxes exposed the next wrong number immediately

With the sizes correct, a steering column reported a **397.7 mm swept diameter**. That is its *length*: a world box
holds a part's length along whichever axis it lies along, and the sweep was being read off x and z. **A turn sweeps
across its axis**, so the radius is now the larger of the two half-sizes perpendicular to the axis, taken in the
part's own frame where `shapeBox` puts them. A hub bearing reads ⌀60.3 mm, which is its size.

This is the shape of the whole round: each fix made the next fault visible, and none of them was visible while two
owners disagreed quietly.

**#112:** an undeclared link is not a link. Every part declaring none shared the name `''`, so one jointed part
anywhere in that bucket silenced the unheld-part rule for all of them. Only a declared link vouches for a part now.

**#113:** both doors import `world/creatures` and `ask/machine` for their side effect, as the two pages already did,
so the user's own composed-machine theme is reachable: `npm run moves -- --kit machine` gives 198 movers and 197
declared joints, of which — honestly, on the fixed graph — **none** is usable. Still open, and named as the more
serious half of that finding: `manny-see.mjs` still guesses a kit, which is the third instance of the default that
lies, in the tool the critic sees through.

Gate: `GATE: PASS (2138 of 2138 ran) — 190.3s`.

## Run 7v — the critic agent retired, and the one thing it did kept as a rule

The user's decision, in their words: *"kill Manny agreed but keep the critic for builds and stuff."* So the two were
separated, which they should have been from the start.

**Gone:** the agent (`.claude/agents/manny.md`), its turn-blocking `Stop` hook (`tools/manny-gate.mjs`, and the hook
entry out of `.claude/settings.json`), and the `BLOCK`/`QUEUE`/`SIGHT` contract that let a critic hold a turn open
until a *feature* was built. That last power was the clearest mistake: the user had already said he was *"supposed to
question thing and then ye"*, and a critic who can demand a build is setting the roadmap.

**Kept, untouched:** the critic that judges builds — `make/critic.ts` and `critic-skin.ts`, running in the gate and
printed under every picture — plus the judges this session made speak unasked (`held`, `frame`, `clash`, `mass`,
`lint`) and the instruments (`npm run why`, `npm run moves`, `node tools/unwired.mjs`, `tools/manny-see.mjs`).

### The measurement the decision rests on, and what had to replace him

Over his last three passes he raised 14 findings, and **four were sentences already written into this file as
established fact**, with 2,100+ tests and 18 lint rules green over every one: a degrees-of-freedom number that was
entirely an artefact of my own silent fallback and that this ledger blamed on the data; *"zero callers in `tools/`"*,
written from a grep of two of eight tools; 21 floating bodies counted as motion; 348 of 605 parts never entering the
graph.

**Nothing automated caught any of them, and nothing automated could: they were prose, and nothing in this tree read
prose.** Retiring him without replacing that would have thrown away the only thing he did that the gate cannot.

So `tidy.test.ts` gained the rule, as a fifth ratchet: **a block of figures in `ROUNDS.md` names the command that
produced it**, in the block or within six lines above it, and **every command a ledger block cites must exist** — a
script in `package.json`, a file on disk. A count still cannot be verified statically, but a pasted figure can be
made re-runnable by the next reader instead of quotable on trust.

Its first run found **15 blocks of figures in this file and 10 with no command beside them.** Three were genuinely
tool output and got their commands (the `held`/`frame`/`clash` block, the mechanism block, the substrate block); the
other eight are hand-made tables — a predicted-against-measured column, the tally of what rules caught against what
looking caught — and are listed in `UNSOURCED`, which may only shrink, with a second test that fails when a listed
line stops matching so a fixed one cannot linger. Both halves were mutation-tested: a bare block of figures fails by
line number, and a block citing a script that package.json does not have fails by name — which the older
`every npm script the prose names` rule then proved on this very entry, where the example was first written out in
full and caught as a script that does not exist. The lint reading the lint's own write-up is the shape this file keeps
asking for.

**And the last thing he raised was closed on the way out.** `manny-see.mjs` chose its kit with
`has('part') ? 'part' : 'machine'`, so words naming no kit drew with `machine` — which is how *"a small hatchback"*
was once judged on a 300 mm extrusion cube. It takes `--kit <id>` now, and without one it still draws (the tool's job
is to look, so refusing outright would leave nothing to see) but says on its own line that the kit was a **guess**
and what to pass instead. That was the third instance of the default that lies, in the one tool a round looks through.

Nothing he raised is left unanswered. `docs/MANNY.md` keeps every finding as a record, with a header saying it is no
longer a contract and that no mark in it blocks anything.

## Run 7w — the motion tool stops refusing: the far end read off the drawing

`npm run moves` was honest and useless. On declarations alone it reported **0 of 56 joints usable** for a car,
because `joins` is hand-written and not one of the 56 jointed parts names a link across its joint. A tool that can
only say "I cannot" is not superior to one that lies; it is just safer.

**The drawing knows what the data does not.** `space.ts:contacts()` finds what meets what, over the very layout
`moves.ts` already walks. Measured before building anything:

```
$ npx vitest run tests/nexus/zz_probe_contacts.test.ts     (a probe, deleted after measuring, as probes are)
605 nodes, 1324 contacts in 58 ms
jointed parts: 56   far end declared: 0   far end from TOUCHING: 53   still none: 3
```

So a bearing's far end is **the thing it meets in another link** — a derivation from the geometry, not a guess at the
data. The result:

```
$ npm run moves -- --kit car "a small hatchback"
its mechanism: 24 rigid bodies (its own frame the ground), 43 joints it could use of 56 declared
  of those, 0 had the thing across them NAMED by the part, and 43 were found by what the part is drawn TOUCHING
  46 degrees of freedom: front left wheel turns about [0, 0, 1] through [1.407, 0.334, -0.762]; front left inner
  joint turns about [0, 0, 1] …; front left drive shaft turns about [0, 0, 1] …
  3 rigid bodies are touched by no joint at all: rear right wheel, rear left wheel, front anti-roll bar
```

**0 → 43 usable joints. 21 → 3 floating bodies.** And the motions now read as a mechanism rather than a list of free
bodies: a wheel turning on its own axis, a drive shaft and its inner joint turning together.

### Two things kept it honest

**The two sources are never merged into one number.** Every line says `0 named, 53 from touching`, because a joint
whose other end the part itself declares is stronger evidence than one read off geometry, and a count that hides the
difference cannot be weighed. The ledger's own figure above is the proof: the interesting fact about this car is not
the 43, it is that **zero** of its parts say what their joints act against.

**The nearest contact, not the first.** The probe caught it before it shipped: taking the first touching part in
another link married a right-hand CV spider to the **left**-hand drive shaft, because "first" over 605 parts is an
accident of iteration order. A joint acts against what it meets *where it is*, so the contact whose middle is nearest
the part's own centre wins. That is a regression case now, along with one proving a declared far end is still
labelled `declared`, and one proving a part touching nothing in another link is still dropped with its reason.

Pins re-measured and exact: 56 declared, 43 usable, 53 from touching, 3 floating, 66 movers, 13 dropped.

**Correction, by `node tools/cite.mjs` (Run 7x), an hour after this was written:** the block above first said *19*
rigid bodies. The real number is 24. I had typed a figure into a block presented as command output, and the claim
lint accepted it because a command was named — which is exactly the hole I flagged when I built that lint, proved on
myself in the first entry written after it.

## Run 7x — the citation checked, and a cost I assumed that was not there

Two tool questions this round, and the first answer was "do nothing", which is the point of measuring.

### The cost I was about to optimise does not exist

Every door rebuilds the bundle before it runs, and I was going to cache that. Measured first:

```
$ node tools/cost.mjs        (a wall clock, so these figures differ every run)
cold build            1679 ms
rebuild, no change    1069 ms
run built door        1877 ms
```

The build is **one second** of a three-second command, and the door's own work is the larger half. I had carried
"30–60 s" in my head from nothing, and the only reason it did not become a day's work is that timing it took ninety
seconds.

> **Two corrections, by Run 7y, which built the tool this block now cites.** As first written, this block had no such
> tool: its figures were timed by hand and the citation read `node tools/cite.mjs --list`, a command that has never
> printed a millisecond. `npm run cite` caught it — the second wrong citation it found, in the entry about wrong
> citations. And the conclusion it carried, *"a cache would have saved a third of a second and added a staleness bug
> to every tool. Not built."*, was wrong: 1069 ms of a 2946 ms command is 36% of it, and the floor I believed I was
> judging against turned out, once written down, to be 10%. The saving was never the issue; the staleness was, and a
> cache keyed on the hash of its inputs cannot go stale. Run 7y built it. See that entry.

### The hole I flagged in my own lint, closed

Run 7v's claim rule makes a block of figures name its command. I said plainly at the time that it catches a *missing*
citation and not a *wrong* one. That hole was then proved on me inside the hour: Run 7w's first draft cited
`node tools/unwired.mjs` for numbers a deleted probe had produced, and the lint accepted it.

`npm run cite` re-runs them. It takes the figures out of each cited block (two digits or more, so a version or a line
number is not mistaken for a measurement), runs the command, and reports whether those figures are still in its
output. A block the ledger marks historical reads as `historic` rather than drift, because an old round's numbers are
supposed to have moved — without that it would fire on its ordinary path, which is the fault that teaches a reader to
ignore the alarm (Run 7o). It is a door, not a gate: the gate keeps the cheap half (a command is named and exists),
this is the expensive half, run when a round wants its figures trusted.

**Its first run found one.** Run 7w's own block said **19 rigid bodies**; the command says **24**. A figure typed into
a block presented as command output — in the first ledger entry written after the lint built to stop exactly that.
Corrected above, with a note at the entry saying what caught it.

```
$ npm run cite
holds    :2454  npm run substrate   (3 figures still in its output)
historic :2385  npm run moves -- --kit car "a small hatchback"
           2 of 4 figures have moved on, as the ledger says they did
holds    :2646  npm run moves -- --kit car "a small hatchback"   (7 figures still in its output)
CITE: 2 hold, 1 historical, 0 DRIFTED, 0 would not run, 3 skipped, of 6 citations
```

**The pattern worth keeping from both halves:** the lint that checks prose caught the write-up of the lint that
checks prose, and the tool that checks citations caught its own round's citation. Each rule's first real catch has
been the round that built it. That is not luck — it is that a new rule is written at the moment its author is least
able to see the fault, and the only cure is a rule that does not depend on seeing it.

## Run 7y — the citation that caught the conclusion

Run 7x ended with `npm run cite` reporting one DRIFTED, and the drifted block was its own. That is the third round
running whose new rule's first real catch was the round that wrote it, and this one caught more than a citation.

### The citation was wrong, and so was what it said

The block citing `node tools/cite.mjs --list` for three millisecond figures: that command has never printed a
millisecond. The figures were timed by hand in a shell and typed in under the nearest command that happened to be in
the paragraph. Two faults in one block — a citation nobody can re-run, and a measurement that exists nowhere but in
prose.

So the measurement became a command, `node tools/cost.mjs`, which times a door's three legs. It reads the legs out of
the door's **own npm script** rather than from a command typed into it (split on `&&`: the last leg is the door's
work, the rest is what it pays to get there), because a tool that holds a command it believes is right goes on
reporting that after the scripts change. It prints the build's share of a second run and what skipping the build could
save, against the floor it judges by.

**Writing the floor down reversed the answer.** Run 7x's conclusion was *"a cache would have saved a third of a second
and added a staleness bug to every tool. Not built."* The tool, run once: 1069 ms of a 2946 ms command is **36%**, and
the floor is 10%. A third of a second was never the question — a third *of the command* was, and I had compared the
saving against nothing and called it small. The staleness fear was the real argument and it was about a cache I had
not designed.

### A cache that cannot go stale, because its key is not a proxy

A build cache goes stale when its key stands in for the inputs: a timestamp, a marker file, a list of directories
someone must remember to extend. `tools/bundle.mjs` keys on the inputs themselves — the SHA-256 of all 403 files under
`src/`, plus the vite config, `package.json`, the lockfile, the tsconfig and the tool's own source. There is no window
in which the key matches and the output is wrong. All sixteen door scripts now go through it.

```
$ node tools/cost.mjs        (a wall clock, so these figures differ every run)
cold build            1900 ms
rebuild, no change      96 ms
run built door        2013 ms
```

A repeat door run: **2946 ms → 2108 ms**, the build from 36% of it to 5%, and the same tool now says there is nothing
left to win. Two checks hold the key honest, neither of them a memory:

- **`npm run tidy` rule 22** (new): no relative import under `src/` reaches outside `src/`. That is the single way a
  file could enter the bundle without being hashed, and it was *true when I looked* — which is exactly the standard
  this session keeps finding insufficient. Rule 23 checks that every file `doors.mjs` names beside `src/` exists, so
  a moved config cannot make the cache quietly blind to it.
- **The stamp records the bundles it emitted, by name.**

### And the name was already taken

The first draft of that cache was written to `tools/doors.mjs`, straight over a 70-line tool of that name — the map
of every door into the project, what each one opens and when it was last touched, built three rounds ago and listed
in `docs/TOOLS.md`. Nothing complained: the file was overwritten, the gate passed, and it surfaced only because
`git status` showed the file as *modified* where I expected *new*. CLAUDE.md's rule is one line long — *"Before
writing a file, check that it does not already exist"* — and it is there because this has happened before
(`vehicle.ts`, overwritten after `ls | head` hid it). I wrote a tool whose whole purpose is to know what is already
there, and did not look. Restored from git, and the cache is `tools/bundle.mjs`.

### The floor, rebuilt by the hand that had just removed it

The first version of that second check counted the bundles and asked for more than zero. Deleting `dist-nexus/moves.mjs`
left fifteen others, the count passed, and `--why` reported **"up to date"** with the door's own bundle missing. A floor
cannot catch a number wrong in the admissible direction — written down as fault #37 two rounds ago, when `joints >= 23`
passed while the real answer was 0, and rebuilt here inside the hour by the same hand, in the correctness check of a
cache whose whole defence is that it cannot be wrong. It only surfaced because I probed the four cases instead of the
one I expected to pass.

### A wall clock is not drift

`cite` would have failed this block every run: a timing never reproduces, and a check that always fails is deleted as
fast as one that never can. A block the ledger marks a **wall clock** is now held to the claim that is actually
checkable — the command still runs, and still prints as many figures as the block quotes — which catches the command
gone, renamed, or no longer timing anything, and does not pretend to catch what nothing can. The note must say so; an
unmarked timing block drifts like any other.

```
$ npm run cite
clocked  :2686  node tools/cost.mjs
           a wall clock, so its 3 figures are not expected back; the command still prints 5
```

**The fault, named:** a figure in prose is a measurement nobody can repeat, so the round that wrote it is the last
round that knows whether it is true. Three faults this round were one fault wearing different clothes — the hand-timed
citation, the floor compared against nothing, and the count that passed while the bundle was gone — and each was a
judgement held in a head rather than in something that runs. The fix is never to judge more carefully; it is to write
the threshold down, where a tool can disagree with it.

## Run 7z — gears, and the test that could tell a mesh from a picture of one

The ask: *"make a working gears system i wanna see it and i wanna be able to make thing out of gears personally i
wanna be able to place them an make stuff no mock shit or press builds"*.

### What was there

Gears were **data and never a shape**. `parts/families.ts` made a `gear-m1-z20-b8-pla` with the right pitch circle
and the right centre-distance sentence; `parts/inventory.ts` listed a spur gear; nothing anywhere drew one. The only
code that tried said so in its own comment — `ask/outputs.ts` emitted a cylinder at the root circle with `z` little
eight-sided cylinders stuck round it, labelled *"a sketch of the involute: print it from the slicer's shape"*. A gear
drawn that way cannot mesh, cannot be checked and cannot be placed next to another one, because the thing that makes
a gear a gear is the curve.

### The curve, and the test that decides

`parts/gears.ts` is the involute: the flank sampled by pressure angle from the base circle to the tip, the ISO 53 /
DIN 867 proportions, the root as a circular fillet (labelled as the approximation it is — a hobbed root is a
trochoid, and the difference lies below the base circle where no contact happens). Drawn as a `prism`, so the
existing extruder draws it and `parts/form.ts` weighs it with no new code anywhere.

The test that matters is not a ratio assertion. **Two placed gears are turned through a whole tooth in twenty-four
steps, and every tooth polygon of one is tested against every tooth polygon of the other for overlap.** A phase
formula wrong by half a tooth passes every ratio assertion ever written and fails that one. It found four things:

- **The interference condition, before I had coded it.** A 9-tooth pinion against a 60-tooth wheel really does
  overlap: the big gear's 62.00 mm tip passes the 61.12 mm limit √(rb² + (a·sin α)²) set by the pinion, so its tip
  arrives where the pinion has no involute left and digs into the root. That is why a 20° pinion wants about 18
  teeth, and `meshing()` now refuses the pair in those words. 12 × 12 is marginal and refused too — correctly: the
  limit misses by 54 µm.
- **The tooth thickness, 0.2% fat.** Every sampled point sits exactly on the involute, but the chords between them
  do not, and measured at the pitch circle the drawn tooth came out thicker than π·m/2 — a gear fatter than the real
  one, which jams a mesh in the viewer that turns freely in steel. The pitch radius is now pinned as a sample point,
  so thickness is exact where thickness is defined.
- **The ring gear was a solid disc with teeth pointing inward**, so the pinion sat inside metal. A ring is a rim with
  a toothed BORE. It drew exactly twelve overlaps at every phase, every tooth count and every addendum — and a count
  that does not move when the geometry moves is the signature of a systematic error rather than an interference.
- **The ring's flank started at the base circle instead of the root**, spanning 56.4 → 58 mm on a gear whose pitch
  circle is at 60, so it never crossed the pitch circle at all and its tooth measured 2.32 mm where the standard says
  3.14. A wrong shape reads exactly like a wrong phase until the shape is measured.

### What is proved, and what is refused

External spur pairs and the rack are proved. An internal pair is **refused**, because it still fails the overlap test
by about 0.2 mm at the pitch circle and a phase scan over a whole tooth is symmetric about the derived value — so the
timing is right and the proportions are not. The ring's own shape passes every shape test. Saying "they mesh" would
be the mock this file was written to delete, so it says what is wrong instead. A planetary waits on that.

### Placing them

`view/gear-bench.ts` is a plate of shaft holes. **The hole pitch is half a module**, because every meshing centre
distance m(z₁+z₂)/2 is a whole multiple of that and almost nothing else is: a grid at any other pitch would look
usable and nothing would ever quite mesh. Pick a gear off the rail, carry it, let it go — it drops on the nearest
hole and the board says what it meshes with, or why it does not. It never nudges anything into mesh. Thirteen tests,
all headless.

One of them had to be rewritten because **I was wrong about what should happen**: a gear dropped a millimetre off
still meshes. That is the involute's whole point — the ratio survives a centre-distance error — and what changes is
the play: 2·Δa·tan α = 0.728 mm of backlash. The test now asserts that instead.

```
$ npm run gears -- 20@0,0 60@80,0 20@80,0 60@160,0 --key 60T-2,20T-3
4 gears on the board, 2 pairs in mesh, turned at 20T-1 (60 rpm, 1.00 N·m).
9.000 to 1 reduction at 60T-4: 6.7 rpm, 8.64 N·m, turning the same way as the driver.
20T-1 × 60T-2: 80.0 mm centres (cut for 80.0), 1.67 teeth in contact, 0.000 mm backlash.
```

```
$ npm run gears -- 20@0,0 40@55,0
20T-1 and 40T-2 do not mesh — at 55.00 mm centres the tip of one stands 4.50 mm inside the root of the other:
they are cut for 60.00 mm and would jam
```

### Three more faults, each found by a check rather than by reading

- **The 9:1 the designer produced was refused by its own clash check**, because I had put every stage in one plane
  and two 54-tooth wheels one centre distance apart are inside each other. A compound gearbox is **layered**: each
  stage runs in its own plane up the shafts. A `layer` on a placed gear now says which, and only gears in one layer
  can mesh.
- **The look page drew a pine tree for `kit=gears`.** `KITS.find(...) ?? KITS[0]` sent every ask for an unregistered
  kit to whatever was first in the list, and printed its trunk diameter with a straight face. A picture of the wrong
  thing is worse than no picture, because the numbers under it are real and belong to something else. It now refuses
  and names the kits it has.
- **The plate was sized from the gear centres and not their tips**, so a 54-tooth wheel hung 56 mm over an edge drawn
  30 mm from its shaft: a gearbox resting on a stamp.

### The room would not take it, and that was right

Wiring the bench into `view/forge.ts` pushed that file past the size its own ratchet allows. The rule is never to
raise the number, and the ratchet's own note said where to go: *"the benches and the lighting have moved out, the
rest have not."* The rest was the mounting. Each bench now owns its working height and its vocabulary
(`SolderBench.setOut`/`greeting`, `GearBench.setOut`/`greeting`/`act`), `view/benches.ts` owns setting one out, and
the robot-at-the-bench routine went to the file that owns the robot. **`forge.ts` came out 4044 lines against the
4046 it started at** — the round added a whole bench and left the room file smaller, and the ceiling is lowered to
hold it.

**The fault, named:** a mesh and a picture of a mesh differ only in a test that can tell them apart. Every real fault
this round came from a check that compared the thing against itself — a ratio against a ratio, a phase against the
formula that produced it — and every one of them was caught the moment something compared the geometry against other
geometry. Four of my own numbers were wrong on the way (1.64, then 1.5574, then 1.55666 for one contact ratio, and a
148 g gear I had bounded at 80 g), all of them from arithmetic I was sure of.

GATE: PASS (2183 of 2183) — 181.0s · TIDY: PASS (23 of 23) · 37 new tests

## Run 8a — the internal gear was one sign, and then a planetary

Run 7z refused internal pairs. Its reasoning was right as far as it went: the overlap was about 0.2 mm at the pitch
circle, and a phase scan over a whole tooth was **symmetric** about the derived phase, so the timing was right and
the proportions were not. It did not find which proportion, and said so.

### Chasing the wrong condition first

The overlap sat on the ring's tip circle, which pointed at the classical internal interference condition: the
ring's tooth tip, brought onto the line of centres, lands at pinion radius ra_ring − a, and below the pinion's base
circle there is no involute for it to roll on. Rearranged that is a tooth count:

```
  ra_ring − a ≥ rb_pinion   ⇒   z_pinion ≥ 2·ha / (1 − cos α)   =   33.16 at 20° full depth
```

A good condition, and real — but **it did not predict the measurement**. Overlap came out 0.72 mm at 20 teeth and
0.73 mm at 50, where the rule says one interferes and the other does not; and it tracked the ring's **addendum**
(1·m → 0.72, 0.6·m → 0.42, 0.5·m → 0.34), which no tooth-count rule explains. A number that does not move when the
thing it is supposed to depend on moves is measuring something else.

### What it actually was

One sign. For two external gears the line of action is the tangent to both base circles that **crosses** between
them, and both flanks are convex. For an internal pair the line of action is the tangent that touches both circles
on the **same side**, because one is inside the other — the ring's flank is concave where the pinion's is convex,
and the involute runs the other way round the tooth:

```ts
g.kind === 'ring' ? g.half - inv(g.alpha) + inv(a) : g.half + inv(g.alpha) - inv(a)
```

With it the overlap test reads **0.0000 mm** at every tooth count and every addendum tried. The ring's tooth
thickness at its pitch circle was π·m/2 before and after — which is why it took a test that compares one gear's
geometry against another's, rather than either against its own definition.

The tooth-count condition is kept as a **note** rather than a refusal: the drawn pair clears (the fillet is cut back
from the involute) but the conjugate action is lost at that tip, and a shaper-cut pair of those proportions would
foul. It names the fix — 34 teeth, a stub addendum, or a profile shift.

### A planetary, which is what an internal gear is for

`planetary()` takes a sun and a planet count and derives everything else: z_ring = z_sun + 2·z_planet, the carrier
radius, and the three Willis ratios. It refuses two things that cannot be rounded away — the planets must divide
`(z_sun + z_ring)` exactly or the last one will not drop in, and their tips must clear each other.

The assembly condition is tested the way a fitter tests it, not as the formula it is usually quoted as: **work out
each planet's angle from its mesh with the sun, then ask the ring what angle it would have to stand at for that
planet.** All n answers must be the same ring. For 24 : 16 : 56 with four planets they agree to 1e-9; for
25 : 16 : 57 they disagree by half a tooth, which is exactly why it will not go together.

```
$ npm run gears -- --planetary 5
A planetary set: 18 sun, 3 × 27 planets, 72 ring, module 2 mm.
  ring held      sun in, carrier out   5.0000 to 1, the same way round
  carrier held   sun in, ring out      4.0000 to 1, REVERSING
  sun held       ring in, carrier out  1.2500 to 1, the same way round
```

### Two more, both found by looking

- **The sun and the ring were reported as a refused pair**, at 0.00 mm centres, in the middle of a set where every
  real mesh had just been found. Two gears on one axis are concentric, not a pair.
- **The first drawing was titled "gear train, 4.000 to 1, reversing" over a 5 to 1 gearbox.** The name came from
  the fixed-axis solver walking sun → planet → ring with every axis held still — which is one of the three things a
  planetary does (the carrier held) and not the one anybody means. A true number answering a question nobody asked.

### And the file was one line from a wall

`parts/gears.ts` finished at **699 lines of the 700** the size lint allows — passing, and leaving the next round no
room at all. The kit that reads an ask and lays out the answer is a different concern from the involute, so it is
`parts/gear-kit.ts` now: 604 and 101 lines, and the next round has somewhere to put things.

GATE: PASS (2191 of 2191) — 191.4s · TIDY: PASS (23 of 23) · 8 new tests
