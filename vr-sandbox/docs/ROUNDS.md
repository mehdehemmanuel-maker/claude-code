# The round log

What each round did, in order, with the faults it found and the cause each was fixed at. This was CLAUDE.md's `Now`
section: 1,678 of its 2,166 lines, which is why nobody could read the anchor before a round. It is history and
reference, not instruction - CLAUDE.md keeps what is still *open* and the rules that hold every round. Append a round
here; keep the standing rules there.

The faults are the valuable part: almost every one has a general lesson under it, and several came back twice before
the lesson was turned into a check. Read the rounds for the thing you are about to touch before touching it.

## How to read this file

It is an index and the last few rounds, not the whole log. In Run 8g it was **3,181 lines**, and over half of that
was one section headed "Now (2026-10-09; read before resuming)" which was a week out of date. CLAUDE.md exists
because an anchor too long to read before a round is the drift it is meant to prevent; the log it points at had
become exactly that. So:

| Where | What is in it |
| --- | --- |
| this file | how to read the log, the fault families that keep coming back, and the latest rounds in full |
| `docs/rounds/archive-1.md` | everything up to 2026-10-09, kept whole |
| `docs/rounds/archive-2.md` | 2026-10-13 through Run 8a |

A round appends its notes to the bottom of this file. When this file passes about 600 lines, the oldest rounds
move to a new archive and this table gains a row. **Archives are never summarised or edited** — a round's record
is evidence, and the reason the faults below are known is that nobody rewrote the rounds that found them.

## The fault families, which is the part worth reading

Every one of these was found more than once, in different work, by different means. They are the reason to read a
round at all, and they are listed here so that reading one is not required to know them.

1. **A floor cannot catch a number wrong in the admissible direction.** A check that only asks "is it at least N"
   passes anything above N, including a wrong thing. Found in the build cache (`outputs > 0` passed with a missing
   bundle), in the mass bounds, and in the gear tooth count.
2. **A passing test is indistinguishable from a working feature when the test is the only caller.** `mobility()`
   sat fully tested and unreachable for four rounds. `node tools/unwired.mjs` is the answer and it is a command.
3. **Two owners for one concern, every time, in every layer.** Two gear libraries, two tooth-strength tables
   (three, by Run 8g), two law books, two connectedness tools — one of them written by the same session that was
   warning about the fault. The lint catches the forms that have a name; `ls` the directory first catches the rest.
4. **A number from nowhere is inherited by everything downstream.** Hence every leaf carrying its origin, and
   `lang/` refusing a leaf that is neither a number nor declared to have none.
5. **Geometry must be tested against other geometry.** A ratio checked against the formula that produced it proves
   nothing. The gear mesh test overlaps real tooth polygons, and that is what found a fat tooth, two wrong ring
   constructions and a flank sign — each of which rendered convincingly while being wrong.
6. **The default that lies.** `?? KITS[0]` drew a pine tree for an unregistered kit. A default that cannot be
   right is worse than a refusal.
7. **An absent model raises no alarm.** It raises nothing, runs clean and looks finished — which is why
   `npm run substrate -- unaccounted` exists.
## Run 8d — one shaft line, and the island the tool found

The ask: *"are all systems merged together... can user create or spawn a motor that's completely unrelated to gears
and make them work together to produce a emergent behavior... it saves compute and it saves multiple headaches in
exchange for 1 headache"*.

**The honest answer was no, and the measurement is what said so.** Three files each knew their own half of a drive:

| | knew | and took as a made-up number |
| --- | --- | --- |
| `parts/gears.ts` | the real involute, what meshes, what a train does | `train(…, torque = 1, rpm = 60)` — **default arguments** |
| `engineering/dcmotor.ts` + `motorrun.ts` | Kt, Ke, R, rotor inertia, winding heat | `runMotor(…, { load })` — a **constant**, and a gearbox as a catalogue ratio scalar |
| `parts/mate.ts` + `mechanism.ts` | shafts, bores, what seats in what | `JointKind` has had `'gear'` in it the whole time and nothing ever produced one |

So a motor could not be loaded by a real train and a real train could not be driven by a motor. Both halves ran on
numbers somebody typed.

**The one headache: a shaft.** `parts/drive.ts` says everything that spins sits on one, named, and three roles meet
there — a `Source` (torque at a speed), a `Gearing` (ratio, efficiency, inertia), a `Load` (torque it demands).
Deliberately not about gears: a test drives a fan with a hand crank, and nothing in the file knows what a motor is.

What is emergent, and the reason it is not plumbing: nothing computes the answer. The settling speed is where the
motor's torque curve crosses the load referred back through the geometry someone placed by hand; the spin-up time
is the gears' own inertia, taken from the same sections the viewer draws and the printer gets.

**Four faults, each found by looking rather than by a test passing:**

1. **The reciprocal.** `turn[].ratio` in gears.ts is the TORQUE multiplication — its own comment says so and its rpm
   divides by it. Read as a speed ratio, a 20T→60T pair came out a "3:1 overdrive" and the 60T wheel's inertia was
   multiplied by nine where it should have divided. Every number looked plausible alone; the drive simply took 70
   times too long to spin up.
2. **A second owner of 0.98.** gears.ts applies a mesh loss in its own walk and drive.ts had written its own. Moved
   to `MESH_EFFICIENCY` in gears.ts, beside the teeth, and imported.
3. **A fixed time step.** `spin` stepped `seconds/steps`. A hand crank on a fan, time constant a fifth of a
   millisecond, overshot to 2000 rad/s on the first 25 ms step and sat at zero for ten seconds reporting that the
   drive never span up. The sample grid is what the caller wants to SEE; the step is what the rig's own stiffness
   allows. `motorrun.ts` already knew this and paced itself by the motor's time constant.
4. **A reduction is not free** — an assertion written the wrong way round until the numbers disagreed. A deeper
   reduction refers the LOAD's inertia down by the square of the ratio, but the gears it needs are bigger and
   inertia goes as the fourth power of radius: a 90T wheel through 5:1 is harder to accelerate than a whole 30/40
   pair through 1.33:1. Which wins is a question only the real geometry answers.

**`node tools/wired.mjs`** was built because the ask had been answered by opinion three times. On its first run,
`islands` named 28 modules nothing under `src/` imports — among them **`engineering/gears.ts`**, holding the Lewis
bending equation and a mesh loss derived from the real tooth counts, both of which drive.ts was doing without. Not
a duplicate to delete: the strength half of the one owner, unreached. Wired in, 28 → 27, and a drive now reports
whether each tooth survives the stall torque that is really on it (a thin-faced pair settles at a perfectly sensible
speed and strips getting there, which no speed, current or ratio says). Its `path` command is the honest half:
`parts/gears` "reached" `engineering/dcmotor` in seven hops through `inventory` before any of this, which is not a
connection, and seeing the chain is what makes that obvious.

31 tests, written so the fault they catch is DISAGREEMENT: the output torque gears.ts works out by walking its mesh
tree is compared against the one drive.ts gets from the motor's curve and the path's efficiency — two routes to one
quantity, neither checked against the formula that produced it.

Still unjoined, named in CLAUDE.md: anything linear, more than one source on a shaft, the winding temperature
(`motorrun.ts` steps it but takes a constant load), the battery, `JointKind.gear`, and the bench in the room.

## Run 8e — the ledger of what is not modelled, and a duplicate of my own tool

Two things came out of the architecture essay: a question (*what is the smallest thing that should exist?*) and an
instruction (*the most effective path; don't be lazy, rewrite each and everything that needs rewrote*).

**What was measured first.** The essay describes a physics-native environment where gravity is a consequence rather
than a feature. That architecture **already exists here** — `lang/` (dimension, Term, Law) and 76 files of
`substrate/`, built over tasks 84–106 — and `place.ts`'s own header states the principle better than the essay:
*"rules that hold for every place, never for a kind of place… which length is a breadth and which a depth is a
consequence of the direction of the load, never a name."* It works: admitting a place generates the relations its
geometry implies, and a 100 mm steel cube comes out at 7.850 kg and 76.98 N with nobody enabling gravity — the kept
WEIGHT law's ports bound to this place's mass and the domain's gravity.

And **the layer that makes things never touches it.** `substrate/place`, `matter`, `observe`, `field`, `solid`,
`space`, `journal`: **0 importers outside `substrate/`**. `parts/` imports exactly two substrate modules, neither
of them state. Forty of 76 substrate files *are* reached — by `ask/` and the CLI doors, not by the making.

**MY OWN FAULT, FIRST.** I wrote `tools/wired.mjs` to answer "what is connected to what" and quoted it for a whole
reply. `tools/unwired.mjs` has answered that since Run 7s, documented in `docs/TOOLS.md` under a heading two screens
long. I never listed `tools/`. CLAUDE.md says, in as many words, to check that a file does not already exist; the
name-clash ratchet reads `src/` only, so nothing failed. Worse, the duplicate was the **weaker** instrument: per
file rather than per export, "imported by nothing" rather than reachable from the doors.

Merged, not discarded, because they did complement: `unwired.mjs` keeps its census and gained `path <a> <b>`, and
its walk widened from `src/nexus` to all of `src/` — the scoping that had hidden `engineering/gears.ts` from it.
`wired.mjs` is deleted. **Tidy rule 24 is the fix by cause**: every tool must be named in `docs/TOOLS.md`, so the
next duplicate cannot be written without opening the file where its twin sits. It found three undocumented tools
on its first run (`bench.mjs`, `cite.mjs`, `shot.mjs`), now written up.

A second clash followed and the ratchet caught this one: `substrate/coupling.ts` has owned the word `ledger` since
it was written (the conservation residual). Mine is `unaccounted`.

**`substrate/holes.ts` — what a world does not account for.** `Runtime.gaps()` reports evaluations that could not
finish. An absent law raises no gap: it raises nothing, runs clean and looks finished. Three findings — a **hole**
(read, nothing produces it), a **dead end** (produced, nothing reads it), an **unapplied law** (every input
bindable, nothing instances it). It needed three new accessors on `Runtime`, because what reads what was private:
every gap there is about how an evaluation went, and these say what the wiring *is*.

The dead end is the motivating case: `parts/drive.ts` works out a mesh's friction loss in watts and **drops the
number**, under a gate passing 2,225 tests. A test now builds that exact shape, watches the finding appear, wires
the watts to a temperature, and watches it go.

Its own first run on a bare steel cube, all three findings real:
- one **hole**: `block/what bears it` — a lone place in a domain with gravity has nothing holding it up, and the
  substrate knows to ask. Admitting `{kind:'held'}` closes it.
- nine **dead ends**: every place works out its section areas, second moments and section moduli and nothing reads
  them until something bends it. Not a fault to fix by deleting them — the point is that the world says which of
  its own numbers go nowhere instead of leaving it to be noticed.
- and among the unapplied laws, **Moment of inertia of a rectangular prism about its centre** — the rotational
  quantity the substrate lacks and `drive.ts` hand-codes. The instrument named the next piece of work itself.

Two tightenings came out of that run, both from reading the output rather than from a test:
- 65 unapplied → **14**. Dimension alone offered Coulomb friction with `mu ← direction of gravity x` and a radius
  as `r ← centre x`: dimensionally valid, semantically nonsense, and a census full of nonsense trains the reader to
  skim. A port must now also share a word with its address's name.
- 14 → **12**. Distinct ports must take distinct addresses: it had bound x, y and z all to one half-extent, and
  both a mass and a molar mass to the same kilogram.

What is left is honest residue and says so in the code: "specific gravity" and "the direction of gravity" share a
word and nothing else, so a lead-acid cell's voltage is still offered over a steel cube. The first two findings are
facts about the wiring; **the third is a prompt, not a verdict.**

**NOT DONE, and not to be read as done:** the drive line is not ported onto the substrate. A `Place` is a box
(`half: [Leaf,Leaf,Leaf]`, `volume = 8h₀h₁h₂`), so the essay's sphere is not representable; there are no rotational
quantities and no mesh coupling; and `parts/drive.ts` still hand-codes `power.rotary` and `inertia.disc`, which the
book already holds with sources and validity domains — the same two-owners fault one level down.

## Run 8f — one law, and 252 instruments

The user, 2026-10-15: *"there should be no laws just sensors ... one universal law that governs the environment
through the whole system ... the universal law is time, everything is time interacting with itself ... all the
'laws' you made need to be turned into math that functionally branches up to time."*

**The architectural claim is right and is implementable.** What `substrate/` does today is backwards by this
reading: a `relation` BINDS an address, so the state is *defined by* the laws. The reframe says one thing should
advance the state and everything else should only read it. That is a real inversion with a testable consequence,
and `substrate/time.ts` is its kernel.

**What was built as established physics, not as a position:**
- c is the conversion between a metre and a second, exact by definition since SI 2019. `rate(v) = √(1 − v²/c²)`.
- Proper time is the one invariant: two observers disagree on t and x and agree on τ.
- **Everything moves through spacetime at exactly c**: v² + (c·dτ/dt)² = c², a Pythagoras, tested at nine speeds
  from 0 to c and totalling 1.000000 c at every one. A thing at rest is not still — it is going through time at
  light speed, and going fast spends some of that motion on space *instead*.
- At c, proper time is exactly 0, not nearly: `rate(c) === 0`, and a photon crossing 10⁶ light-seconds ages by
  nothing. Past c there is no worldline, so `rate` throws rather than returning a number.
- The twin case comes out at the textbook figure: 100 s of the domain's clock is 80 s for a traveller at 0.6c.

**What is the user's axiom and is labelled as such in the file**: that time is the single generative thing and
space, matter and self are modes of it. Relativity makes space and time one manifold but not the same thing — the
minus sign in dτ² is why a timelike interval cannot rotate into a spacelike one, and causality rests on that sign.
The file keeps the sign and takes time as the one coordinate, which is theirs.

**"Everything branches up to time" is computable, and was computed from the book's own 252 laws.** Four constants
set to one, each a statement that two units measure the same thing — c (a metre is a second), ħ (a kilogram is an
inverse second), k_B (a kelvin is an inverse second), 4πε₀ (an ampere is an inverse second). Then
`inTime = −kg + m + s − A − K`, and:

- a metre is **time¹**, a kilogram **time⁻¹**, an energy **time⁻¹** (E = ħω: an energy IS a frequency)
- **a speed is time⁰ — dimensionless.** There is no such thing as a speed, only a fraction of c: an angle in
  spacetime. This is the user's "speed is time", and it is exact.
- **action is time⁰ too** — a count of ħ. Which is why the one law of physics is about action being *stationary*:
  a pure number being extremal, with no unit to be extremal in.
- every one of the 252 lands on an integer power between −4 and +4, and the commonest (54 laws) is time⁻¹, which
  is energy — time's own conserved quantity by Noether.

**The demotion.** `sense(law, at, tau)` turns any of the 252 into a `Reading`: the same maths and the same
citation, with no address. The decisive test is one line — every instrument in the book is run over a state and
**the state is byte-identical afterwards**. A relation binds; a reading only looks. An instrument outside its
domain reports that about *itself* ("a fact about the instrument's range, not about the world"), and one with a
missing input says it had nothing to read rather than returning zero.

One fault found by the language layer rather than by me: passing a missing input as NaN threw, correctly — a leaf
must be a number or declare itself to have none. A missing reading is an absence (`class: 'unknown'`), not a zero.

`npm run substrate -- time`. 18 tests. GATE: PASS (2250 of 2250) — 200.9s.

**NOT DONE.** This is the kernel beside the engine, not the engine rebuilt on it. `substrate/`'s relations still
bind addresses; making the time evolver the only writer across the whole substrate is the large job this opens,
and until it is done the reframe is demonstrated rather than adopted. Also absent: the action principle itself
(δS = 0 as the generator the 252 would be *derived* from, rather than reduced to powers of time), gravity (the
metric is flat here), and any coupling between a worldline's proper time and the existing `clock.ts` local clocks,
which already advance each region at its own time and are the natural place for this to land.

## Run 8j — a dimension is not a quantity, and five of the eleven engine files wired

*"how would you define quantity ain't that the same thing as density anyways figure out 1 and 2"* — the two things
Run 8i named as open and did not fix.

**No: density is A quantity, not the concept.** Metrology keeps three things apart and now so does the code — a
DIMENSION is algebra (`kg m^-3`), a KIND OF QUANTITY is a named sort (density, torque, length), and a QUANTITY is
that kind of a specific thing (this gear's density, which is what `know` returns). Torque and kinetic energy are
different kinds sharing one dimension. That distinction was the whole of fault 1.

**THE VOCABULARY IS DERIVED, NOT WRITTEN** (`book/quantities.ts`). The book already names every port of every law —
**572 distinct names**, used in anger — and that IS the vocabulary. Measured from it, the case for the fix:

| dimension | kinds sharing it |
|---|---|
| `1` (dimensionless) | **115** — friction coefficient, Froude number, shape factor, slope angle |
| `m` | **78** — wheel radius, height, distance, bend radius, deflection |
| `kg m^2 s^-2` | **27** — **torque, kinetic energy, bending moment** |

A port now takes a `portFit` in three grades instead of a yes: **exact** (the same kind), **kin** (the same sort at
the same dimension — a `wheel radius` offered for a `radius`, allowed and recorded), **stretched** (nothing but the
dimension agrees — never silent, and refused outright for a dimensionless port, where a dimensional match carries no
information at all). The cure is verified on the original fault: asked for a speed given a sprocket's pitch, it no
longer answers with a pendulum's `impact speed`; named properly it finds `chain.speed` with all three bindings
`exact`. `know` refuses a stretch entirely; `calculate` takes one only as a last resort and says so.

**AND THE BOOK CONTRADICTS ITSELF IN TEN PLACES**, which `homonyms()` now reports: `speed` is used for both a `m/s`
and a `1/s` (a linear speed and an angular one under one word), `conductivity` for both the thermal and the
electrical, `rate` for four different dimensions. Each is two or more kinds wearing one name, and any binding that
trusts the name is wrong about one of them. Reported, not yet split — named here so it is not claimed.

**FIVE OF THE ELEVEN ENGINE FILES WIRED, and two of them joined rather than merely imported.** `substrate/` had 11 of
its 78 files reachable from no door: the engine advertised as whole with pieces in the box.

- **`clock.ts` and `hold.ts` joined into the one law.** The law says nothing advances on a common clock, and that is
  true twice: RELATIVISTICALLY a worldline's own time is `dτ/dt = √(1−v²/c²)`, set by how fast it moves;
  MECHANISTICALLY a region's own time is `C/G`, set by what it is made of. Both are a time, both land at `time^1`,
  and `ownTime` is now ONE definition — `hold.ts` had a second one for spheres, which is deleted; it keeps the
  geometry (4π k r, Carslaw & Jaeger) and `ownTimeOfSphere` puts the two together. `advanceByOwnClocks` runs a fin,
  a block and a room on their own clocks (0.5 s, 188 s, 1.25e9 s), asserts the one thing a multi-rate integrator may
  not do — **content balanced exactly, nothing made or lost between the clocks** — and does it in 303 region-steps
  against 900 on one common clock.
- **`rate.ts`, `compose.ts`, `scale.ts`, `tune.ts` reached through `npm run substrate -- engine`**, each RUNNING and
  printing a number checkable by hand: `kT/h` at 300 K = 6.2510e12 /s; hydrogen at 1e20 m^-3 half ionized at 8999.5 K;
  light crossing 1 m in 3.336 ns; and the tuner searching an explicit-Euler step for the coarsest that stays within
  2% of e^-1, which it puts at 0.0625 s (by hand, `(1−h)^(1/h)`: 0.125 gives 0.3436, 6.6% off; 0.0625 gives 0.3561).

**Unreached: 28 files → 22; `substrate/` 11 → 5.** The five left are `attempt.ts` (needs an Intent),
`explore.ts` (a Space factory and preference laws), `project.ts` (a frame and its Prisms), and `study-joint.ts` /
`study-swing.ts` (a booted Jolt and their case lists). The door prints exactly that, so the gap names itself.

Three more name clashes fixed rather than permitted: `Kind`→`QuantityKind` (`kinds/` owns Kind: a trade's catalogue,
a different idea), `KINDS`→`QUANTITY_KINDS`, `grade`→`portFit`. 23 new tests; gate 2,292 across 188 files.

## Run 8i — one hierarchy: a part, its quantities, the laws that give them, and time at the root

*"merge all systems delete the others all make all sensors map to time these are not to be seperate systems"* — then
*"the law system should follow the same system as parts the sub system all system all the way down to the core and
then look they both would meet at time"* — and, correcting a design of mine mid-round: *"no don't write observe I'm
saying everything exists on the graph all possibilities exist just like a calculator all the laws are there but it
only gets calculated when typed"*.

**The user was right about `observe` and it was deleted.** I had written a sweep: a function that marches through
the book firing every law it can. Their structure is better and it is the one built: every quantity of every part is
ALREADY a node, by virtue of the laws and the inventory existing, and asking is what evaluates one. No pass, no
batch, no fill-in.

**ONE SYSTEM, and `substrate/lawgraph.ts` is deleted.** `unwired.mjs path substrate/lawgraph substrate/time` used
to answer *"Neither reaches the other. They are two islands"*. The graph half merged into `substrate/time.ts`; the
value-applying half (a different verb) went to `substrate/record.ts`; the two tables units cannot derive went to
`book/principles.ts`. Nothing of it was left beside anything.

**THE TREE, four derived levels under the root** (`npm run substrate -- time`): time → the power of time → the SI
dimension that power came from → the shape of the math → the law. 252 sensors, **9 trunks, 34 limbs, 67 twigs**, and
not one written-down category: a law added to the book places itself, and `placeOf` gives any law's path. The one
honest limit is named rather than hidden — **14 laws carry a mole**, and a mole is a count, so no constant reduces it.

**THE FEED GRAPH, derived: 7,949 edges** against the 27 that were written by hand — and `kinshipFeeds` keeps the two
relations apart, because only 11 of those 27 are feeds at all. The rest are *"this law BECOMES that law"*, which is
knowledge, not arithmetic, and stays in `book/principles.ts` by hand.

**THE HIERARCHY, ASKED** (`npm run substrate -- know gear-small`, `substrate/derive.ts`). A part decomposes into
sub-parts down to a material; a quantity decomposes into the quantities its law needs down to a measurement; they
are the same shape and they meet at time. `know(thing, quantity)` resolves on demand, memoised and cycle-guarded,
and every answer carries its place on time's tree. A brass gear, asked: **density 8500 kg/m³** from its material
through the mixing law, **volume** from its stated size, and **mass 2.55 g derived through `mass.prism`** — nothing
states that mass, and two independent routes (`mass.prism` and `mass.volume`) agree on it.

**AND A QUANTITY REACHED TWO WAYS MUST AGREE.** This is what makes it load-bearing rather than decorative, and it
immediately caught real faults in the sample data: `gear-small`'s volume is **48% apart** between its bounding box
and `volume.ellipsoid`, and its height **70% apart** between its stated 3 mm and what `extent.from-mass` infers.
`clashes()` reports both routes and both numbers rather than silently taking whichever was computed first.

Five faults found by RUNNING it, each fixed by cause rather than worked around:

1. **Density was unreachable for almost every part, and the cause was the weighting.** `densityShares` weighted a
   part's constituents BY MASS IN GRAMS — but a material has no grams, so the weights came out `NaN` and the whole
   density went null. A brass gear reported no density while brass sat in the table at 8500. Two cases need no
   masses and are now taken: one constituent (its density IS the thing's), and several of equal density (the mixing
   law returns it whatever the shares). Several materials in unknown proportions still returns unknown, because
   guessing the shares is guessing the answer.
2. **`extent y` and `extent z` both bound to the FIRST extent**, so a 10×10×3 gear was costed as 10×10×10 and its
   mass came out 8.5 g against the true 2.55 g — wrong by 3.3× and looking like a working answer.
3. **Dimension is not identity.** `calculate` bound a chain pitch to a pendulum length (both `m`) and returned an
   "impact speed" for a sprocket. Three answers, none a guess: a dimensionless port (every ratio in the book is `-`)
   binds only to something NAMED for it; a binding whose names agree is preferred; and every port filled under a
   different name is reported in `stretched`. A stretched number is not wrong, it is unverified, and the caller is
   told which binding to check.
4. **I rewrote `forcedByUnits` from memory during the merge** instead of carrying the original across, dropping its
   check of a law's actual exponents and its constants-with-units. The gate caught it. Restored verbatim.
5. **The census could not see dynamic imports.** Every CLI door loads its modules with `await import`, so each
   one's exports read as test-only and each module it alone reaches read as unreached. `tools/unwired.mjs` now
   counts them: **test-only 203 → 194.** Third round running in which the instrument itself was the fault.

Three name clashes were fixed rather than permitted (`num`→`readable`, `Held`→`Pooled`, `named`→`answersToPort`),
and the `LINKS` clash that Run 8h found on tidy's *allow-list* is gone with the rename to `KINSHIP`. 46 new tests.

Still open, named so it cannot be claimed later: **a quantity has no identity of its own** — only a dimension and a
name — so finding 3 is mitigation, not a cure; the real fix gives the book a vocabulary of named quantities that
ports bind against. `substrate/` still has 11 of its 78 files unreachable from any door.

## Run 8h — the graph joined to time, and a census that hid its own answer

*"finish connecting all the laws(sensorys) to time mathmatically then cross connect all the laws with equations or
some form of law calculator find missing laws missing branches"* — and, partway through, the fair challenge:
*"it seems like you're doing this round what you said you did last round and now I'm wondering if you did anything
this round"*.

**That challenge was right, and it is recorded because it was right.** At the moment it was asked this round held 99
uncommitted lines in one file. What follows is what the round actually closed.

**The two islands joined.** `node tools/unwired.mjs path substrate/lawgraph substrate/time` said *"Neither reaches
the other"* before this round: the graph could not reduce a law to its power of time, and `time.ts` could not see the
graph. Now `timePower` (a law's output through c, ħ, k_B and 4πε₀), `timeSpectrum` (the book laid out by that power,
every law landing at exactly one) and `routeInTime` (a chain read as a walk through the spectrum) — and the path tool
reports one hop.

**`branches()`: what the book LACKS, as four facts rather than an opinion.** A hole (a dimension read by some law and
produced by none — it can only be measured), a dead end (produced and read by nothing), an empty power of time
between two that have laws, and a law alone in the graph. Where the gap is an output nothing gives, `discover`
(Rayleigh, Buckingham π) is asked whether the book's own quantities force the missing law by units alone, and when
they do the finding carries the law instead of only naming the gap. On the real book: **26 holes, 1 dead end, no
empty power** — the spectrum is dense, which is itself a result.

Three faults found by measuring rather than by reading:

1. **The cross-connections were never derived.** `LINKS` holds **27** edges written by hand; the dimensions support
   **7,949** (A's output fills one of B's ports). Nobody has to write those.
2. **`LINKS` is two relations under one name.** Of its 27 edges, **16 are not port-feeds at all** —
   `fick.diffusion → diffusion.erf` is "Fick's law, conserved everywhere, *becomes* this law", derivational kinship,
   which units cannot derive and which is real knowledge. The feed graph is computable; the kinship is not. One name
   over two ideas, and `tidy`'s CLASHES list had it **permitted** rather than fixed. Not yet split — named here so it
   is not lost.
3. **`tools/unwired.mjs` was hiding its own answer.** It printed 12 of the 28 unreached files and closed with
   `… 16 more`. The sixteen it hid included **eleven files of `substrate/`** — the engine. A census must not shorten
   its own list quietly: 28 shown as 12 reads as a smaller problem than it is. Fixed with `--all`, documented in
   `docs/TOOLS.md`. **This is the same fault family as Run 8e's duplicate tool: the instrument itself was wrong, and
   nothing was checking the instrument.**

**The whole tree, measured and drawn** for the user to read on paper: 403 files, 95,960 lines, 58 doors, 375 files
reached and **28 not**; of 2,615 exports, 1,557 live across modules, 711 live inside one file, **201 test-only, 146
dead**. The engine is the worst of it — `substrate/` is 78 files and 14,276 lines with **11 unreachable from any
door** (`clock`, `scale`, `compose`, `rate`, `attempt`, `explore`, `hold`, `project`, `tune`, two studies). Those get
wired, not deleted.

Still open, and named so it cannot be claimed later: **the law calculator is not written.** `routes()` finds a chain
and `step()` runs one law; nothing joins them, so a chain is still found and never evaluated. And the 11 unplugged
engine files are the system's biggest untruth — the engine is described as whole and is not.

## Run 8g — the whole-tree audit, and the first four cuts

*"what needs deleted what needs redone what needs edited I mean all code every single price and also check for
context overload in any MD"* — and, at the end, *"I didn't know that all cad systems didn't use this"*.

**That last line is corrected first, because it matters for aim.** The dimensional reduction of Run 8f is standard
physics: Planck units, proposed 1899, used daily by every particle physicist. CAD systems do not use it because
CAD solves a different problem — static geometry under constraints, where SI millimetres are right and a
dimensionless speed is useless. What is unusual here is the **architecture** (one writer, everything else
read-only, the read-only property machine-tested), not the physics. The full audit is `docs/AUDIT-2026-10-15.md`.

**Measured, not surveyed**, with the instruments already built: 2,619 exports over 405 files, **152 dead, 202
test-only, 30 unreached files**; 159 prices, **52 weak**; `docs/` 49 files and 23,393 lines.

Four cuts made:

1. **`ganglia/laws.ts` + `types.ts` deleted, 1,156 lines.** Proved first: 155 laws, *all 155* already in
   `nexus/book`. But it was not dead — `book.test.ts` checked the new book's ports, symbols, units, statements
   and examples against it, law by law. **A guard must not be a second implementation.** So the guard was kept
   and its source frozen as data (`tests/nexus/kept-laws.json`), including the two things the predicate function
   was used for: whether a domain existed, and that each example sat inside its own. 187 tests still pass against
   something that can no longer drift. This is the general move for a migration guard: freeze the source, delete
   the implementation.
2. **One Lewis table, not three.** `engineering/mechanics.ts` held its own copy of Shigley Table 14-2 beside
   `engineering/gears.ts`; the third was in the deleted file. Dead exports **152 → 145**, unreached files
   **30 → 28**.
3. **ROUNDS.md: 3,181 lines → 231.** Over half was one section headed "Now (2026-10-09; read before resuming)",
   a week stale — the fault CLAUDE.md was written to cure, reappearing in the log CLAUDE.md points at. Now an
   index, the **seven fault families**, and the latest rounds; the history kept whole in `docs/rounds/archive-1.md`
   and `archive-2.md`, unedited, because a round's record is evidence.
4. **The citation rules follow the split.** Three tidy rules read ROUNDS.md for blocks of figures naming no
   command; they now read the archives too, so splitting a file cannot become a way to escape a rule.

**On the prices, the honest finding is that the fault is not age.** None of the 159 are stale: the newest sighting
is 2026-10-13 and the oldest is four days old. 41 of them rest on a **search listing rather than the seller's own
page**, which is a provenance fault and is blocked on the network — the sellers' size tables render in JavaScript
this container cannot run.

**NOT DONE**: 145 dead exports and 28 unreached files remain, each needing the same proof that killed
`ganglia/laws.ts` rather than deletion on the count. 12 of the 28 are `substrate/` and are to be **wired, not
deleted** — `clock.ts` in particular is where `substrate/time.ts` belongs. `docs/OWNERS.md` is still 61 KB over
103 lines. The drive line is still not on the substrate, a `Place` is still a box, and `JointKind.gear` still
produces nothing.

GATE: PASS (2250 of 2250) — 193.5s
