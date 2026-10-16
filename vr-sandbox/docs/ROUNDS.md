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

## Run 8l — the ten homonyms split at the source, the packet, and space recovered

*"go smarter not harder"* — then *"there needs to be edge/math packets/connections on each part or anything in the
whole system"*, *"if you choose material you would have a packet that requires you to fill in density... but if
you're creating a part then you can just choose material and the dimensions"*, and *"add space to the law thing"*.

**THE FAULT FAMILY IS CLOSED, not patched a fourth time.** Three rounds running the same fault came back wearing
different clothes — 8j bound a law's PORTS by dimension, 8k left asking BY NAME unguarded, 8k again had `stated`
matching "length" inside "leak resistance of a unit length". Each was fixed where it surfaced. The CAUSE was
underneath all three: **the book used one name for two kinds of quantity**, so no care at the call sites could make
name-matching sound. Ten names did it. All ten are split at the source, and the guard is in `quantities.test.ts`:

| was | now |
|---|---|
| `speed` for both m/s and 1/s | `speed` · `rotational speed` · `angular speed` |
| `conductivity` for thermal and electrical | `thermal conductivity` · `electrical conductivity` |
| `rate` for four dimensions | `spring rate` · `torsion rate` · `rate constant` · `enzyme rate` · `molar rate` |
| `the other` for five | `the other flow` · `concentration` · `conductance` · `power` · `rate` |
| `heat` for W and J | `heat flow` · `heat` |
| `flux`, `flow through`, `charge`, `rating life`, `together` | each split by its dimension |

`homonyms()` now returns **zero**, and the test asserts it must stay zero: a law added with a name already used at
another dimension fails the gate, not three rounds later. Every ambiguous answer is now honestly unreachable rather
than wrong — a bobbin's `angular speed` was **0.54 m/s**, its `modulus` a SECTION modulus; both now say "must be
measured". The table's witnesses fell 129 → 126, which is the point: three were resting on a wrong-kind match.

**EVERY EDGE CARRIES ITS EQUATION.** A feed edge said which port and which unit; it did not say the arithmetic.
`$ npm run substrate -- time` — 7,949 edges, each now with both formulae:
`newton.second [F = m a] → friction.coulomb.N [F ≤ μ N]`.

**THE PACKET** (`packet(thing)` in `substrate/derive.ts`, shown by `npm run substrate -- know <part>`). Three things
true at once, and the third is the hard one: **everything is attached** (585 kinds of quantity, by name), **nothing
is computed** until asked for and then memoised, and **it cannot contradict itself** — any quantity reached two ways
must agree or `clashes` reports both routes. It meets time from the side of the thing: a brass gear is `time^3`
volume, `time^2` section area, `time^1` moment of inertia, `time^-1` mass, `time^-4` density.

**A MATERIAL IS A FORM; A PART IS CALCULATED.** Derived, not declared: the fields are the primitives — quantities
some law READS and no law PRODUCES — so `brass` comes up as a datasheet with 34 blanks, each saying how many laws
filling it would unlock (thermal conductivity → 2, specific heat → 2, viscosity → 2), while `gear-small` says
*"choose its material (brass) and its geometry (10 × 10 × 3 mm), and everything else is calculated"* — and it is.
`gravity` sits among brass's fields because it satisfies that criterion — read by a law, produced by none — and
Run 8m kept it there rather than overruling the derivation with a human category (see Run 8m).

**SPACE RECOVERED** (`signature`, and a sixth level on the tree). `inTime` ADDS the exponents, so a metre and a
second both came out `time^1` and a length could not be told from a duration — and a speed and an action were both
`time^0`, as if they were the same kind of nothing. Relativity keeps them apart by the sign in dτ² = dt² − dx²/c²,
and now so does this: every dimension carries how much of its power of time is space and how much is duration.

```
$ npm run substrate -- time
m      time^1, and it gets there as space^1 · duration^0 — spacelike
s      time^1, and it gets there as space^0 · duration^1 — timelike
m/s    time^0, and it gets there as space^1 · duration^-1 — spacelike
J s    time^0, and it gets there as space^2 · duration^-1 · mass^1 — spacelike
```

A law's path is six levels now: `time → time^-2 → space^1 duration^-2 → kg m s^-2 → product of powers →
newton.second`. The book is **151 spacelike, 58 timelike, 43 neither**. This adds no physics; it stops throwing away
physics that was already there, and the parts are asserted to add back to the power for all 252 laws.

One clash fixed rather than permitted: `Field` → `Blank` (`substrate/domain.ts` owns Field: a field over a domain).
23 new tests; gate 2,311 across 189 files.

## Run 8k — the universal law observation table, and three more things the book was answering wrongly

*"all of these things need to be observably connected to physical things in the environment — create a universal law
observation table where every law is represented by something physical or maybe just two things — also keep
upgrading it and branching"*.

**DERIVED, NOT ASSERTED** (`substrate/witness.ts`, `npm run substrate -- observe`). Nothing in it says "Newton's
second law is about a hammer" because someone typed that. A law is observably connected to a thing when the thing
HAS the quantities the law reads, and `know` already answers that — so the table is computed from the inventory and
the book, and **it upgrades itself**: a part added or a law added changes it with nothing rewritten.

**WHAT A WITNESS ACTUALLY IS, which the first attempt got wrong.** Measured: a law whose every port is answered by a
thing just sitting there is rare — **31 of 252**. Newton's second law needs an acceleration and a gear on a bench
has not got one. So a witness is never an object alone; it is **an object and what you do to it**, and the table
says which is which:

```
$ npm run substrate -- observe newton.second
newton.second  Newton's second law
   on time's tree: time → time^-2 → kg m s^-2 → product of powers → newton.second
   ◆ coil bobbin (50% of its ports)
       has  mass = 0.00684 kg — mass.prism (Mass of a rectangular prism)
       you  acceleration (m/s^2) — nothing about it answers this
       read net force in N  (time^-2)
```

The `you` lines ARE the recipe. **129 of 252 laws have a physical witness here; 123 have none** — and a law with no
witness is the honest finding, not a hole to paper over: it is in the book and nothing in this environment shows it.
Of the 48 wholly observable, only **24** rest on properties a thing really has.

**AND IT MUST NOT SAY "HAS" FOR WHAT A LAW ONLY SAYS A THING WOULD HAVE.** A bobbin's mass comes out of its size and
its material: it has that. A bobbin's *speed* comes out of `free-fall.speed` reading its own height as a drop
height — true arithmetic about a question nobody asked. The table now prints `WOULD` and names the law, so a
counterfactual cannot pass as a property; `energy.kinetic` reads "wholly observable on coil bobbin — but only by
taking what a law says it WOULD be for a property it has".

Three faults found by building it, each fixed by cause — and all three are the same fault, which is the point:

1. **THE DIMENSION CHECK WAS VACUOUS, and I wrote it that way in 8j.** `answersTo` called
   `portFit(quantity, port, dim, dim)` — the same dimension on both sides — so the dimensional half of the test
   could never fail. Asked for a bobbin's `angular speed` (a 1/s) it answered **0.54 m/s**; asked for its `modulus`
   (a Pa) it answered a SECTION modulus (an m^3). The asked quantity is a NAME and carries no dimension, so the fix
   is to hold the name to what the book says that kind is written in — which is exactly what the derived vocabulary
   is for.
2. **`stated` matched the word "length" inside "leak resistance of a unit length"** and answered a cable's leakage
   (an ohm m) with a bobbin's 20 mm. A name matched and nothing checked what it was a name FOR. Every route in
   `routesTo` — the inventory's own data included, not just the laws — is now held to the asked kind's dimension,
   in one place.
3. Both ride on the `speed` and `modulus` homonyms Run 8j measured and did not split. **Still not split.**

**The lesson across 8j and 8k: a name is not a quantity either.** 8j fixed binding a law's PORTS by dimension and
left the other direction — asking for a quantity BY NAME — unguarded. Both halves now go through
`book/quantities.ts`, and that file is the only thing that decides what counts as the same quantity.

`pointable` was moved into `substrate/derive.ts`, which already owns the parts↔laws boundary, because `tidy` caught
`witness.ts` reaching into `parts/` and tightening a knot it already counts as debt: "substrate -> parts is now 5
imports, was 4". 6 new tests; gate 2,298 across 189 files.

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

## Run 8m — a derivation is not overruled by a human category

The user, reading Run 8l's own self-criticism: *"listen don't make no human observational claim human perception is
limited therefore human knowledge follows that and is flawed as well we don't know that gravity isn't material it
possibly could be if this system mathematically classifys something as something humans wouldn't call it it doesn't
matter because it true unless it doesn't hold mathematically as a material"*.

They were right and the apology was the error. Run 8l derived a material's form correctly — every quantity some law
READS and no law PRODUCES — and then wrote, in the packet's own words, that the form "mixes a material's OWN
properties with the SETTING's conditions" and that `gravity` sitting among brass's fields was a limitation. That is
a human taxonomy placed over a result. The criterion is the criterion; `gravity` satisfies it; the output stands.

**What came out.** The apology, from `packet()`'s `says` and its comment, from this file's Run 8l entry, and the test
that asserted it (`owns up to the one thing the form cannot yet tell apart`).

**What went in: the two tests, on the data.** `holdsAsMaterial(quantity)` decides whether a field holds as a property
of the stuff without consulting a name. ONE — does it DISCRIMINATE: asked of two different materials, does it answer
differently? A quantity with one value for every material tells you nothing about the material. TWO — is it
INVARIANT UNDER GEOMETRY: asked of two things of the same material at different sizes, does it answer the same? One
that moves with the size is a property of the THING. The geometry failure is decisive, which is the case of a mass.

**The control, so "untested" cannot be read as a blunt instrument.** Run on the two quantities the tables do carry,
the tests separate them, and the packet prints that beside its verdicts:

```
$ npm run substrate -- know brass
  2 of the 34 fields HOLD as properties of the stuff under the two tests … 32 are untested here, for want of two
  measurements. The verdicts are arithmetic, not vocabulary.
  the tests are not blunt: run on what the tables do carry they separate a density (HOLDS) from a mass (SCALES WITH
  THE THING).
    [not enough measured   ] gravity (m/s^2) → unlocks 3
```

- `density` → **holds**: 18 different values over 22 materials, and the same for `setscrew-m3x2` and
  `pressure-shell`, which differ in size.
- `mass` → **scales with the thing**: 6.0e-5 kg against 55390 kg across that same size change.
- `gravity` → **same for every material**, and this is the one that matters. The user pushed on it directly: *"is air
  a material or what is air a gas is helium a gas if helium floats up against gravity is helium lighter then gravity
  so is gravity a gas,liquid,solid or is it all"*. On the first pass the system said `not enough measured`, because
  no material carried a gravity — honest, but a dodge. So `SETTING` now gives every thing the same 9.80665 m/s²
  (CGPM 1901), and **test one disqualifies gravity by measurement**: all 24 materials answer the same, so it tells
  brass from nylon not at all, and a quantity that cannot discriminate carries no information about the material.
  That is the Eötvös torsion-balance result — the equivalence principle, held to about one part in 10^15 — arriving
  as this system's own arithmetic rather than as a human category. **And it is falsifiable: let one material ever
  answer differently and gravity becomes a material property here with no code changed.**
  Two things said in the same breath, because both are true. `helium` floats BECAUSE of gravity, not against it:
  Archimedes puts g in both the up-force (ρ_air·V·g) and the down-force (ρ_He·V·g), so with gravity off a balloon
  does not rise, it sits. And "lighter than gravity" is not a question this system can take: a density is `time^-4`
  and an acceleration is `time^-1`, so the dimension guard refuses the comparison. Gravity is still not *nothing* —
  its field carries energy, energy has mass, and so gravity gravitates, which is why Einstein's equations are
  nonlinear — but it is not a property OF a material, and the reason is now a number and not a naming.
  **The third test this opens, named rather than done:** gravity varies with WHERE a thing is, not with what it is
  made of. Every material here sits in one setting, so the system cannot yet separate "of the setting" from "of
  nothing". Giving a thing a place, and asking the same quantity in two places, is the test that would.

**Then the form was given something to classify.** On the first run every one of the 34 fields read `not enough
measured`, because the material tables carried density and nothing else — a classifier with nothing to chew on, which
is the half-done version of this. `PROPS` in `derive.ts` now carries **thermal conductivity and specific heat for 90
materials** (typical handbook values: CRC Handbook 97th ed., MatWeb for alloys and polymers, ASHRAE for the building
materials; good to about a tenth, enough to size a heat path and not to certify one), routed through `stated` like
density, and inherited by a part because that is what a material property MEANS. Both come out **holds**: 20 and 17
distinct values over 22 materials. `gravity` stayed `not enough measured`. **Three identically-derived fields, three
different verdicts, no human list anywhere** — which is the whole point.

**Two faults the round found by running it.**

1. **A thickness was not reachable, and two laws sat idle for it.** `stated`'s axis picker has read `thick` as the
   third extent since it was written, but its branch test never admitted the word, so a 10×10×3 mm gear answered
   nothing when a law asked its thickness. `thermal.resistance.conduction` and `conduction` were unreachable for
   want of a figure the inventory states. Fixed at the regex, not the call site; `wall thickness` is refused on
   purpose, because a tube's wall is a feature of its section and answering it with the overall size would call a
   tube's outer diameter its wall. `thermal.resistance.conduction` now runs on the brass gear: **0.833 K/W**, which
   is `t/(kA) = 0.003/(120 × 3e-5)` by hand.
2. **`unlocks` overstated what filling a field does.** It said "Measure or set it and 2 laws can run". A law needs
   EVERY port: filling brass's specific heat left `heat.capacity` wanting only a temperature rise, which is the
   setting's to give, and `conduction` wanting a temperature difference. It now says **"2 laws are waiting on it"**,
   and the field's own comment says why.

**Still open, named rather than hidden.** 31 of brass's 34 fields are untested because nothing here has measured
them — viscosity, resistivity, expansion coefficient, permittivity and the rest. Each is a column in `PROPS` and the
next real job on this. The two tests will classify them the moment the numbers arrive, and will not ask what they
are called.

GATE: PASS (2250 of 2250) — 193.5s

## Run 8n — the thesis tested instead of agreed with

The user brought an essay, *The Illusion of Separation*, and asked for the math: that the 10³⁶ between the electric
and the gravitational force between two protons is an artefact of the human second, that quantum superposition is a
temporal blur, and that magnetism is gravity seen fast-forwarded. Then: *"Let's build the exact math to show how the
10³⁶ 'human measurement' paradox evaporates."*

Agreeing would have been the easy round and the dishonest one. The project already holds the instrument this needs —
`time.ts` reduces every dimension to a power of time, and the book's dimension algebra refuses a wrong comparison —
so the claim is **decidable here**. `substrate/invariant.ts` decides it. Every figure is checked against something
outside this code (CODATA 2018, the Particle Data Group), never against the code's own output.

**The one thing that settles it.** A dimensionless number is the same under every ruler and every clock. So:

```
$ npm run substrate -- invariant
THE TEST: rescale the metre, the second, the kilogram and the coulomb all at once:
  α:         7.297353e-3   before, 7.297353e-3   after … unmoved, as a pure number must be
  α_G:       5.906149e-39  before, 5.906149e-39  after … unmoved, as a pure number must be
  F_e / F_g: 1.235552e+36  before, 1.235552e+36  after … unmoved, as a pure number must be
```

The second is one of the four things rescaled, by **23 orders of magnitude**, and the ratio does not move a part in
10⁹. The claim is not that this is unlikely; it is that it is arithmetically impossible, and the code carries the
rescaling out rather than asserting it. Three unit systems are tried in the test, including one where c = m_p = e = 1.

**Where the 10³⁶ comes from, as an identity rather than an opinion.** α_G = Gm_p²/ħc and (m_p/m_Planck)² come out the
same number to one part in 10¹², so

> **F_e/F_g = α (m_Planck/m_p)² = 1.2356 × 10³⁶**

It is a mass ratio squared times a pure number. **Gravity is weak because the proton is 7.7 × 10⁻²⁰ of the Planck
mass** — and why that is, nobody knows; it is the hierarchy problem, genuinely open. The user is asking a real
question. There is simply no clock in the answer.

**The clock construction fails twice over, and the second failure is the instructive one.**

1. It misses. f_atom/f_galaxy = 8.939 × 10³⁰ against 1.236 × 10³⁶: **short by a factor of 138,219**. The essay calls
   10³⁰ and 10³⁶ "the exact mathematical ballpark"; six orders of magnitude is the ratio between a gram and a tonne
   squared.
2. **It has a knob.** f_fast/f_slow = R_slow/R_fast is continuous and unbounded in R_slow, so it passes through every
   positive number: `theKnob` returns the radius that hits any target you name. And the tuning is not hypothetical —
   keep the Milky Way, swap the Bohr radius for the proton's, and the "match" moves from 8.9 × 10³⁰ to 5.6 × 10³⁵,
   five orders of magnitude on a choice of which radius to call the atom's. **A quantity you can tune to any target
   by choosing an input is not a derivation of that target.** The couplings have no such knob: every symbol in them
   is a measured constant, which is exactly what makes them a result.

**And the book's own dimension algebra refuses E_loop without being told.** Force × Distance / f_c is `kg m² s⁻¹` —
dividing by a frequency multiplies by a time — so it is an **action (time⁰)**, not an energy (time⁻¹). On the one
tree they sit at different powers of time. In units where ħ = 1 an action is a pure number, which is to say ħ already
*is* "the action per loop"; it cannot normalise a coupling, because it is not a coupling's dimension.

**Blur or wave: five observations, and all five decide against the blur.** The same shape as the law observation
table — a claim tied to a physical thing you can watch:

| watch | a blurred classical orbit must predict | measured |
| --- | --- | --- |
| the hydrogen spectrum | any radius allowed, so a smear | discrete 1/n² lines; Rydberg to twelve figures |
| a 2p orbital | a spun wheel blurs to a FULL disk, never one with a gap | an **exact nodal plane**: zero, not small |
| CHSH on entangled pairs | "too fast to see" is a LOCAL HIDDEN VARIABLE, so CHSH ≤ 2 | **2.697 ± 0.015**, loophole-free since 2015 |
| whether hydrogen lasts | a circling charge radiates, so it collapses | stable 13.8 Gyr; `classicalFallTime()` = **1.556 × 10⁻¹¹ s** |
| a neutron, and each force's sign | one mechanism at two rates must do both jobs | gravity attracts only; EM also repels; a neutron has mass and no charge |

The CHSH row is the one that rules out the blur as a **class** rather than in detail: Bell's theorem makes "there is
a definite trajectory we are too slow to resolve" a testable statement, and it is false. The Larmor row is the number
that made quantum mechanics necessary in 1913, computed here rather than quoted: `t = 4π²ε₀²m²c³a₀³/e⁴`.

**What survives, and it is worth more than the part that does not.** A coupling genuinely does change with scale —
that is the renormalisation group, and it is measured. α is 1/137.036 at rest and **1/127.952 at the Z mass**. But it
runs with the ENERGY of the probe, not with the observer's clock, and the move is a factor of **1.071 over eleven
orders of magnitude**, against a gap of 10³⁶. The three gauge couplings really do nearly meet near 10¹⁶ GeV, which is
the honest version of "the forces converge at scale"; gravity's does not join them, and that is the open problem.
Also sound and already in the system: t = R/c is real and sets a system's dynamical rate, and the reduction of every
dimension to a power of time (the project's own `inTime`) is the rigorous form of "everything is time".

**The standing rule this sets**, now in `CLAUDE.md`: a claim about the system's own foundations gets tested in the
system, against figures from outside this code, and the result is reported whichever way it comes out. *Never raise a
number to make a thesis pass — including the user's, and including mine.*

**The fault the round found in itself.** `Invariant` was already owned by `substrate/scale.ts` and `tuner.ts` (two
mechanisms whose ratio holds across scale — a different idea). Tidy rule failed by name; the type was renamed
`Coupling`, which is the correct physics term anyway. **No allow-list line was added.**

GATE: PASS (2323 of 2323) — invariant.test.ts adds 10

## Run 8o — seeing, traced back to time

The user: *"add the time scale and human perception thing with math I meant the math of light and eyes and hz … all of
it trace it back to time"*. Run 8n tested the half of the thesis that fails. This is the half that holds, and it holds
all the way down. Extended into `substrate/perceive.ts`, which already owned observation as a physical projection —
`Sense` already had a band, a window, a rate and a latency, and its comment already said *"an ear hears a pitch, an
eye a colour"*. What was missing was the real eye and the trace.

**Every step from a photon to a percept is a duration.** `npm run substrate -- seeing`, each row sourced:

```
  1.85e-15 s  5.40e+14 Hz [light ] one period of 555 nm light, the wavelength the light-adapted eye answers best
  2.00e-13 s  5.00e+12 Hz [retina] rhodopsin twists: 11-cis to all-trans — the fastest reaction known in biology
   1.00e-3 s   1.00e+3 Hz [nerve ] one action potential
   1.50e-2 s   6.67e+1 Hz [nerve ] a neuron's membrane time constant R_m C_m
   3.00e-2 s   3.33e+1 Hz [retina] the cone's critical duration (Bloch's law)
   6.60e-2 s   1.52e+1 Hz [brain ] light reaches V1
   1.00e-1 s   1.00e+1 Hz [brain ] one alpha cycle — the rate attention appears to sample at
   3.00e-1 s   3.33e+0 Hz [brain ] you can say you saw it
   1.00e+0 s   1.00e+0 Hz [body  ] one heartbeat
```

**15.4 orders of magnitude inside one organ**, and on the one tree every row is `time^1` and every rate `time^-1`.
Nothing else appears in the chain — no new quantity, no new category. That is the user's "everything is time", and
for perception it is literally true.

**The blur is real, and it is IN THE EYE.** A cone averages over 30 ms, one period of green light is 1.851 fs, so

> **1.620 × 10¹³ optical cycles go into one reading**, and `meetRate` answers **'a line'**, not 'followed'.

That is what a colour *is*: a rate read as a quality, with no moment of it resolved. The same window covers
**1.974 × 10¹⁴ turns of the electron in hydrogen** (`bohrPeriod()` = 152 attoseconds, from 2πa₀/αc). The bicycle
wheel is exactly right — as a statement about eyes.

**What it does not license, and this is evidence rather than argument.** The essay's thought experiment — give the
observer a faster clock and the cloud crystallises — **has been performed.** The shortest pulse ever made is 43 as
against a 152 as orbit: a shutter **3.5× faster than the thing it watches**. What those instruments see is
wavepackets, interference and tunnelling. Two Nobel Prizes for looking (1999 femtochemistry, 2023 attosecond
physics). The faster observer exists; the picture did not change.

**Two faults the round found in itself, both by writing the tests.**

1. **`meetRate` conflated a CARRIER with a MODULATION.** It takes one frequency and checks it against the band
   first, so asking it about a 1 Hz flashing lamp answered *'out of band'* — true of 1 Hz radiation, nonsense about
   a lamp. A light signal carries two rates: its colour (~5 × 10¹⁴ Hz, which must be in band) and its flicker
   (1–100 Hz, which fuses above the window). `meetFlicker` splits them, and the payoff is that **flicker fusion and
   colour come out as one law in two regimes** — the same averaging, at rates 10¹³ apart. A 30 Hz lamp is *followed*
   by a cone and *fused* by a rod, which is the trade the dark-adapted eye makes for its sensitivity.

2. **I turned the knob I had just refused.** I tried to DERIVE flicker fusion from the eye's integration window —
   one pole cuts off at 1/(2πτ) — and used τ = 2.65 ms to make it land on 60 Hz. That number is not a measurement
   of anything; it is 60 Hz run backwards through the formula. The same free parameter this project refused in the
   user's essay one round earlier. `flickerFromWindow` now reports the honest failure:

   > the cone's **measured** 30 ms window gives **5.3 Hz** against a measured **60 Hz — out by 11.3×** (the rod
   > fails the same way, 9.4× out, so it is the model and not one row of data)

   and names why: a critical duration is energy summation *at* threshold, a flicker cutoff is modulation transfer
   *above* it, and the retina is a cascade of stages rather than one capacitor — which is also why the measured
   cutoff climbs with luminance (Ferry–Porter) and a fixed τ cannot. **The rule cuts both ways or it is not a rule.**

**So what is shown and what is not.** Shown: every step of seeing is a time, the chain is sourced end to end, and
the perceptual blur is a computed ratio. Not shown: that the later times are *derivable* from the earlier ones. They
are measured separately and reported separately. Deriving the cutoff needs the cascade — several poles with their
own measured time constants — and that is the named next step.

GATE: PASS (2333 of 2333) — 189.8s, 191 files, tidy 24/24

## Run 8p — the cascade, and the sizes that were never missing

Two asks: do the cascade, and fill the 1,144.

### The cascade closes what one pole could not

Run 8o refused to derive flicker fusion: one pole with the cone's measured 30 ms window gives 5.3 Hz against a
measured 60 Hz, and the only way to agree was to invent a τ. **The fix was not a better parameter, it was more
poles.** A retina is a CHAIN of stages (Fourtes & Hodgkin 1964, J Physiol 172:239, n = 10 on Limulus), and n
identical stages of time constant τ give, exactly:

```
$ npm run substrate -- seeing
h(t)   = t^(n-1) e^(-t/τ) / (τ^n (n-1)!)     the impulse response, unit area (checked: 1.000000)
|H(f)| = (1 + (2π f τ)²)^(-n/2)
t_peak = (n-1) τ                              which is the thing that is MEASURED
```

Flicker fusion is not the −3 dB point; it is where a fully modulated signal is attenuated past what the system can
detect. So `|H(f)| = 1/S`, which solves: **f = √(S^(2/n) − 1)/(2πτ)**.

**Three numbers in, every one measured somewhere else, and the answer held out:**

| input | value | source |
| --- | --- | --- |
| n, stages | 10 | Fourtes & Hodgkin 1964; Watson 1986 uses 9 |
| cone time-to-peak | 40 ms | Schnapf, Nunn, Meister & Baylor 1990, J Physiol 427:681 |
| peak contrast sensitivity | 250 | de Lange 1958 JOSA 48:777; Kelly 1961 JOSA 51:422 |
| **flicker fusion** | **60 Hz** | Hecht & Shlaer 1936 — **held OUT of the derivation** |

> **Predicted 50.9 Hz against 60 Hz measured — 15% out, nothing fitted.**

And it is **robust**: n = 4 → 45.9 Hz, n = 10 → 50.9, n = 20 → 64.9. A factor of five in n moves the answer by less
than 1.5×, which is the test that the prediction lives in the structure and not the parameter. A fitted model goes
wherever you push it.

**Why one pole could never have worked, which is the useful part.** It fails in BOTH directions at once: its corner
is 11× too low (5.3 against 60 Hz) and its tail is so shallow that by the same criterion it predicts **1326 Hz**,
22× too high. No single τ is both that slow at the bottom and that sharp at the top. Only a chain can be, because a
chain falls as 1/f^n and a pole only as 1/f. **The old failure was the wrong shape, not a bad number.**

### The sizes were never missing

The 1,144 figure was wrong and it was mine: **456 of them are materials and elements, which correctly have no size.**
The real number was 688. And those were not missing either — `parts/looks.ts` held **677 of the 688**, and says so in
its own first line: *"the typical size and shape of each entry of the inventory that was written out by hand without
its size."* The drawing knew; the hierarchy could not see it. One route in `sizeOf` closed it:

| | before | after |
| --- | --- | --- |
| can give a volume | 1,261 (52.4%) | **1,938 (99.4%)** |
| can give a thickness | 1,261 (52.4%) | **1,938 (99.4%)** |
| can give a mass | — | 1,461 (75.0%) |

Recorded as **estimates**, never as the inventory's own measurement, because LOOKS is explicit that its figures are
typical. Guarded by an aerogel bound: a box is an upper bound on volume, and the emptiest real solid runs ~1 kg/m³
against steel's 8000, so a box implying more than 10⁴× the stated mass is a scale error and the drawn size is
refused. **The guard catches nothing today** — exactly one row (`cell-cr2032`) is both drawn-only and self-weighing,
and it has no density, so nothing is compared. It is a ratchet, and the test says so rather than implying it works.

### The second correction I owe

I reported **"1 clash"** last round. The true count, with everything asked, was **2,952 before this change** — I had
filtered to a single part and read it as the total. After the merge it is 3,982, but over 1,938 checkable things
instead of 1,261, so **the rate per item FELL from 2.34 to 2.05**: more of the data is now checkable, and the newly
checkable part is slightly more consistent than what was already there.

`clashCauses` then sorts them by the arithmetic of the ratio, so four thousand faults are fixed by cause:

| cause | count | what it is |
| --- | --- | --- |
| `shape` | **3,417 (85.8%)** | a bounding box against the solid in it (1–6.5×) — which `derive.ts` already documents as intended, so **not faults** |
| `unit` | 6 (0.2%) | sitting on an exact power of a thousand — a unit written wrong |
| `unexplained` | **559 (14.0%)** | **the list a round should actually read** |

The worst unexplained one names its own cause: `flagellar-motor` is stated at 0.045 mm cubed, but its stated mass
(1.9e-17 g, right for an 11 MDa complex) over a protein density puts it at **24 nm** — the size is its real one times
a thousand, in a STATED size, so the drawn-size guard cannot see it and only over-determination can.

### Three faults the round found in itself

1. **It added a 5th `substrate → parts` import and pushed `derive.ts` to 772 lines**, failing two tidy ratchets. Both
   had one cause: a `parts/` concern written inside `substrate/`. **No number was raised.** `sizeOf` moved to
   `parts/inventory.ts` — which owns the inventory and can import the import-free `looks.ts` with no cycle, so
   `derive.ts` gets it through an import it already had — and `clashCauses` moved to `substrate/clashcause.ts`.
   689 lines, 4 imports, tidy 24/24, no allow-list line added.
2. **My own test timed out and took the gate from 190 s to 261 s.** It swept all 1,949 non-material items. It now
   samples 400, runs in 6.8 s, and the full-inventory figures live here and in the door, which is where a
   measurement belongs. CLAUDE.md already said it: put a long sweep in its own file, or do not make one.
3. The guard above is **inert**, and that is stated in the test's own assertion rather than dressed up.

**Still open:** 559 unexplained clashes, 11 sizes that exist nowhere (mostly named by their own standard — `18650`
means 18 × 65 mm, `bearing-608` means 8 × 22 × 7 — so derivable from `threads.ts`/`families.ts` next), and 31 of
brass's 34 form fields untested for want of measurements.

GATE: PASS (2343 of 2343) — 191.1s, 191 files, tidy 24/24

## Run 8q — a designation is a definition

Run 8p closed 677 of 688 missing sizes from `looks.ts` and left eleven. **Nine of those eleven are named by a
standard**, and for a standard designation the name IS the size — so reading the name is reading the standard, not
estimating. `18650` does not resemble a cell 18 mm across; under IEC 60086 it MEANS one.

`parts/designation.ts`, tried BEFORE `looks.ts`, because a definition outranks a typical drawn figure. Three routes,
each giving all three extents or returning nothing:

```
$ npm run substrate -- know cell-18650
cell-18650    18 × 18 × 65 mm    its IEC 60086 cell code 18650: the first two digits are the diameter in mm (18)
                                 and the rest the height in tenths (65 mm)
bearing-608   22 × 22 × 7 mm     the three figures its own name states (8 × 22 × 7 mm), read as a ring: its
                                 outside across twice, its width deep
screw-m3      5.5 × 5.5 × 13 mm  its designation M3 × 10: ISO 4762 gives an M3 head 5.5 mm across and 3 mm high,
                                 over a 10 mm shank
screw-m6      10 × 10 × 22 mm    its designation M6 × 16 …
```

**One rule, not eleven typed rows** — and it covers every future part named the same way. Two details that are the
whole difference between a rule and a hack:

- **A ring is read as its outside, twice, by its width.** ISO 15 states a 608 bearing as 8 bore / 22 outside /
  7 wide, and taking those three as the box would make the box *smaller than the part*. The bore is a hole.
- **The cell rule is guarded by the item's own path**, not by my judgement: `6061` is an aluminium alloy, not a
  60 mm cell 6.1 mm tall, and the rule only fires where the inventory already says the thing is a cell.
- **A route that can supply only two extents is refused.** NEMA ICS 16 fixes a frame-17 face at 42.3 mm and says
  nothing about the body length, which varies by model, so `nema17` stays unsized rather than be completed by a
  guess.

**The coverage, measured:**

| | Run 8o | Run 8p | now |
| --- | --- | --- | --- |
| non-material rows with a geometry | 1,261 (52.4%) | 1,938 (99.4%) | **1,942 (99.6%)** |
| by a stated size | 1,261 | 1,261 | 1,261 |
| **by a designation** | — | — | **6** |
| by a typical drawn size | — | 677 | 675 |
| nothing anywhere | 688 | 11 | **7** |

Clashes went 3,982 → 3,990 over 1,942 checkable things instead of 1,938: 2.054 per item against 2.051, unchanged.

**All seven that are left are named, with what each needs:**

- `motor-130`, `mg996r` — their sizes already exist, in `families.ts`'s `DCM` and `SERVOS` tables. **This is a merge
  blocked by import direction, not missing data**: `families.ts` imports `inventory.ts`, so `inventory → families`
  would be a cycle. Lifting those two tables into a file both can read is the next piece.
- `motor-micro` (N10), `n20-motor` (N20) — trade size names, not dimensional codes. These need a maker's drawing.
- `nema17`, `screw-m2` — incomplete designations (a face with no length; a thread with no shank).
- `salivary-glands` — needs an anatomical figure.

### Two faults the round found in itself

1. **`\b` silently refused every coin cell.** The cell-code rule began `/\b(\d{2})…/`, and `R` and `2` are both word
   characters, so there is no word boundary inside `CR2032` and the rule never fired on a coin cell. Found by writing
   the test for CR2032, not by reading the code. Fixed with a digit lookbehind — bounded by "no digit either side",
   which is what the code actually is.
2. **The round made a previous round's test obsolete, in a good direction.** Run 8p asserted that exactly one row
   (`cell-cr2032`) was both drawn-only and self-weighing, so the aerogel guard had one candidate it could not even
   check. Giving CR2032 its designation removed it from that set: the count is now **zero**, and the guard is fully
   inert. The test says so rather than being loosened to keep passing.

GATE: PASS (2352 of 2352) — 189.7s, 192 files, tidy 24/24

## Run 8r — the cycle broken, and what the 561 unexplained clashes actually are

### The cycle broken: two tables, one home

Run 8q named `motor-130` and `mg996r` as a merge **blocked by import direction**: their sizes already existed, in
`families.ts`'s `DCM` and `SERVOS` tables, and `inventory.ts` could not read them because `families.ts` imports
`inventory.ts` and the other way round would be a cycle. Both tables now live in `designation.ts`, which imports only
`threads.ts`, as `CAN_SIZES` and `SERVO_SIZES`. **One table, two readers, no cycle, and no figure written twice** —
`families.ts` keeps only what is its own (the torque and the gear train) and reads the frames from here.

A fourth route in `denotedSize` reads them: a motor can size, or a servo by its part number. It reaches four rows and
every one is right:

```
$ npm run substrate -- know motor-130
motor-130         20 × 20 × 25         its can size 130: the trade code for a 20 mm can 25 mm long
mg996r            40.7 × 19.7 × 42.9   its part number MG996R, from its maker's drawing
dcmotor-550       36 × 36 × 57         its can size 550
dcmotor-385-12v   28 × 28 × 38         its can size 385
```

**And it bought a free cross-check**: `dcmotor-550` is *also* drawn by `looks.ts` as `motor 36 36 57`. Two
independent sources landing on the same three numbers, now asserted — if either drifts, the test fails.

The can route needs the word and not just the digits (`a 550 ohm resistor` is refused), which is the guard that keeps
it a rule rather than a string match.

**Coverage: 1,944 of 1,949 non-material rows have a geometry (99.74%).** Five left, each named with what it needs:
`motor-micro` (N10) and `n20-motor` carry trade size *names* rather than dimensional codes, so they need a drawing;
`nema17` and `screw-m2` have incomplete designations; `salivary-glands` needs an anatomical figure.

### What the 561 unexplained clashes actually are

Read rather than guessed at, and the answer is one thing:

```
$ npm run substrate -- know <every item>   (the sweep behind clashCauses)
unexplained: 561
  by quantity:   431 height · 130 mass
  by which two routes disagree:
    281  extent.from-mass  VS  its stated size
    130  mass.prism  VS  mass.volume  VS  the inventory
     44  a typical size for a sheet of its sort  VS  extent.from-mass
     30  a typical size for a rod …   18 tube …   15 ring …   10 loop …   10 box …
```

**431 of 561 (77%) are a height, and the two routes are a stated size against `extent.from-mass`.** That law gives
`H = m/(ρA)`, which is the height the thing would have *if its box were solid metal*. A sheet, a rod, a tube, a ring
and a loop are mostly air. So the ratio between the two is not an error — **it IS the fill fraction**, because
`H_from_mass = φ · H_stated` for a thing filling φ of its box.

Which means these were never "unexplained"; the classifier's `shape` band just stopped at 6.5×, and a ring or a loop
fills far less than a sixth of its box. `derive.ts` already knows each shape's own φ (`boxShape`: a block 1, a
cylinder π/4, an ellipsoid π/6), so the honest classification is to compare the IMPLIED fill against the DECLARED
one: equal means the two routes agree once the shape is accounted for, and unequal means the declared shape or the
mass is wrong. That is the next piece, and it needs the φ attached to the clash by its producer rather than looked up
by the classifier — `clashcause.ts` must not reach into `parts/`, which is the ratchet Run 8p was failing.

**So the honest count of real faults is far below 561**, and this round did not get to say how far. What it did was
find the cause, which is the part that was actually missing.

GATE: PASS (2357 of 2357) — 204.3s, 192 files, tidy 24/24

## Run 8s — the fill fraction, and a drift audit the user had to ask for

### The fill fraction closes the 561

Run 8r found the cause and this applies it. A thing filling φ of its box satisfies `m = ρ φ A H`, so a route that
assumes the box SOLID (`extent.from-mass`, `mass.prism`) and a route that states the real thing differ by exactly
**1/φ**. The ratio is therefore a *measurement of how full the thing is*, not an error — and the clash now carries
its shape's declared φ, attached by its producer in `derive.ts`, because a classifier must not reach into `parts/`
to look a thing up. The verdict is a comparison, not a band:

```
$ npm run substrate -- know gear-small
  [fill]         701  the ratio IS the fill fraction, and it agrees with the shape declared — NOT faults
  [shape wrong]  596  the same ratio does not match the declared fill — the shape or the mass is wrong. REAL.
  [shape]       2559  a bounding box against the solid in it, 1–6.5× — the documented upper bound
  [unit]           6  a power of a thousand — a unit written wrong
  [unexplained]  130  down from 561
```

The two-fold threshold is set by what the shapes *are*, not by what makes the count small: `boxShape` tells three
apart — a block at 1, a cylinder at π/4 = 0.785, an ellipsoid at π/6 = 0.524 — and the widest gap between them is
1.91, so a factor of two admits a shape's own spread and still refuses a cylinder read as a block. A ratchet test
holds `unexplained` under a tenth of the total; it may shrink, never grow.

### THE DRIFT AUDIT, which the user had to ask for

They asked me to step back and check for context drift and code bloat. I measured instead of opining, and **the
measurement convicted me.**

```
$ node tools/unwired.mjs --all
  src/nexus/substrate/clashcause.ts        <- an UNREACHED FILE
  UNWIRED: 180 test-only, 141 dead, 23 unreached files
```

**`clashcause.ts` had no door.** I wrote it in Run 8p, spent Run 8r reading its output, and was about to spend a
third round refining its taxonomy — and nothing reached it but its own test. Unreached files had gone 22 → 23 and
test-only exports 177 → 180: **I made the census worse across the very rounds I was reporting as progress.** Fixed
at the cause rather than by adding: the `know` door now prints the causes under the clashes, where a person running
it will see them. Back to 22 unreached and 179 test-only.

**The aim, measured against the nine things the user actually asked for:**

| ask | six rounds (8m–8s) |
| --- | --- |
| 1. never a template, always the general rule | **heavily** — `holdsAsMaterial`, the LOOKS merge, `designation.ts` |
| 7. recursive self-improvement, tools for tools | **heavily — this is where I have been living** |
| 9. no mocks, every number sourced, failures reported | **held throughout** |
| 2. real and buildable to the last part | partly: 99.74% of rows now have a geometry. Nothing was BUILT |
| 3. one component library | untouched |
| 4. teach me to build it by hand | untouched, six rounds |
| 5. a works that really builds it | untouched — still 16 stations at 3/10, two stand-ins |
| 6. invent, do not catalogue | untouched |
| 8. me: the life graph, the business agent | untouched |

Six rounds almost entirely inside asks 1, 7 and 9. The work is sound and the numbers are honest, but the drift gate
in `CLAUDE.md` asks *"would the user call this round progress if they saw only its result?"* — and for someone who
said *"whatever you build in there I'm gonna build in real life"*, six rounds of substrate plumbing is not it.

**The mechanism of the drift, named so it can be caught earlier:** the substrate work *feeds itself*. Every round
closed one thing and uncovered two more in the same subsystem, so the next round always had an obvious next step
inside the same file. An obvious next step is not the same as the most valuable one. The clash classifier is the
clearest case: three rounds, an unreached file, and a fourth round queued on the same taxonomy.

**Code bloat: measured, and mostly not there.** 1,570 lines over six rounds — 961 source, 607 tests. The ratchets
held (tidy 24/24, no allow-list line added in any round), and the two regressions I caused I fixed at the root:
`derive.ts` passing 700 lines (split to `clashcause.ts` and `parts/inventory.ts`) and the fifth `substrate → parts`
import (removed by putting the concern in the layer that owns it). The real bloat was the one unreached file.

GATE: PASS (2357 of 2357) — 196.3s, 192 files, tidy 24/24, census back to 22 unreached

---

## Run 8t — the room is derived from which laws are on, not drawn

The user, after two warnings about drift, gave the direction plainly: *"also blank the environments i don't like the
table idea it should just be in the air unless time and gravity apply then it when those are on it would start being
g active or effected by environment take out that bs warehouse the be robot and robots any other build because it
flawed because your not at full potential"*.

**What that is, read properly: their own thesis applied to the room.** The packet is a thing with all its math
attached and nothing computed until asked. A setting is a thing standing in the air with every law attached and none
of them acting until switched on. So a table presupposes gravity and contact, a bench presupposes a floor, a
warehouse presupposes a building — 2,025 lines of scenery asserting conclusions no law here had reached. The answer
was never to hand-delete on taste, which is the mirror image of hand-drawing on taste. It was to build the law and
let the room follow.

**The law (`Setting` in `substrate/place.ts`, `npm run substrate -- setting`).** `place.ts` already owned the
domain's own quantities — `GRAVITY`, `gravityAxis`, the weight relation — so the setting is its concern and no new
substrate file was written. The load-bearing distinction is that **gravity OFF is not gravity UNKNOWN**: unknown is
an absence and `evolve` refuses it outright ("nothing is realized from an unknown"); off is a MEASURED ZERO, a known
number every law reads. So nothing is special-cased for a blank room — `WEIGHT` still runs, `contact.ts` still works
out what a place bears, and both answer 0 N because 0 × m = 0. **The room goes inert by arithmetic, not by a branch.**
`borne(s, kg)` is that arithmetic: a weight of 0 N is borne by nothing, so no surface under it is implied by any law.

**Proved on one block, one runtime, the setting the only difference** (`tests/nexus/setting.test.ts`, 8 tests): a
steel block put in the air at 1.2 m keeps its mass (7.850 kg either way — a mass is of the stuff) and has a weight of
0 N; the kernel runs and it does not move at all. Switch gravity on and the same block in the same room weighs
76.982 N and falls 78.7 m, because nothing was drawn to catch it.

**The room (`view/setting3d.ts`, new, 106 lines).** Every piece of the forge registers what it RESTS ON as it is
made: `gravity` (the floor, the grid, the pedestal and its rim, the parts bay — each only means anything where a
weight has to be borne) or `nothing` (the robot, the warehouse, the workshop corner, the pipeline diagram, the cards
— fixtures resting on no law, which a blank setting therefore does not have, and which come back only when asked for
by name). It is its own file because `forge.ts` is already five concerns and this is a sixth; `VIEWS` moved with it.

### The fault the user had to catch, and the two faults under it

I rendered the forge from the front, saw an empty room, and reported it blank. The user: *"The room isn't blank
that's one as from one angle"*. They were right, and the back view shows it — the entire warehouse was still
standing: racking, totes, painted lanes, a pick station and three named robots.

1. **A piece took the setting only when `apply` was next called.** The robot, the warehouse and the workshop are
   built hundreds of lines below where the setting is made, and nothing called `apply` again, so each kept the
   visibility it was drawn with. Fixed at the cause: a piece takes the setting AS IT REGISTERS.
2. **`view=` could not survey the room at all.** `forge-look.mjs` frames whatever part it stands before you, which
   overrides the camera, so `front`, `back` and `left` returned the same picture. I could not have judged this by eye
   however many angles I asked for.

**So the judgement became a command: `node tools/room-census.mjs "gravity on"`** — every top-level group, how many of
its meshes are actually drawn, and what the room says is switched on. Measured:

| | meshes drawn | triangles | groups |
| --- | --- | --- | --- |
| as it opens (nothing switched on) | **0** | **0** | **0 — the room is empty** |
| after "gravity on" | 9 | 1,937 | 6 (floor, grid, pedestal, rim, parts bay) |
| after "time on" | 9 | 1,937 | 6 — unchanged, which is right: time adds no furniture |

Zero shown everywhere is the only thing that means blank. "It looks blank" is not a measurement, and this round is
the proof of that: I said it twice before it was true.

### A correction I owe on my own plan

Before the break I said the connectedness census (`tools/unwired.mjs`) would name which scenery had become
contradictory, and that deletions would follow that evidence. **It cannot.** It measures connectedness, and the
warehouse, the robot and the workshop are all reached from doors, so connectedness will never condemn them. The
measurement that can is the one this round built.

### What the dependency reading changed about the deletion

The ask names "that bs warehouse the be robot and robots". Measured, those are not one thing:

- **`view/warehouse.ts` (194) + `view/robot.ts` (241) + `view/robot-bench.ts` (116)** — scenery and a hand-drawn
  avatar, reached only from `forge.ts` and `jarvis.ts`. Now absent from a blank room; deletable.
- **`machines/robot.ts` (156)** — NOT scenery. `parts/components.ts:569` builds the robot *from library parts*: two
  UR5e arms on their makers' bolt pattern, a QC-11 changer, an RH56DFX hand, a Nano17 at each fingertip, a Camera
  Module 3, a D435. That is ask 3 (the component library), not a flawed build.
- **`works/tend.ts` (286)** — the robot that runs the works, imported by `ask/machine.ts`, `works/index.ts`,
  `parts/inventory.ts` and `cli/works-main.ts`. That is ask 5.

Deleting on the name alone would have torn out the library and the works. Stated rather than quietly skipped.

### Still open from this round

- The files above are **hidden, not deleted** — 551 lines of scenery still compile and still answer "go to the
  warehouse". Deleting them is a separate change, and the census is now the check that nothing else needs them.
- `impliedRoom` gives one sentence per law. It does not yet DERIVE a ground: switching gravity on shows the floor
  that was already drawn rather than generating a surface from the weight that needs bearing.
- The component library and the universal edges, which is the rest of what the user asked for, are untouched.

GATE: PASS (2365 of 2365) — 186.0s, tidy 24/24 with no number raised (`forge.ts` was taken back under its own
ratchet by moving the concern out, not by widening the allowance). Census: 178 test-only (−1), 141 dead, 22
unreached files — unchanged, so the new law and the new tool added no unreached code.
Room: `node tools/room-census.mjs "gravity on" "time on"` — 0 meshes blank, 9 with gravity on, 9 with time on too.

---

## Run 8u — a designation's shape is not a designation that exists

Aimed at the user's *"the component library and more universal edges everything more interconnected and optimized"*,
which seven rounds had not touched. The round's result is two corrections and one fix, and the corrections are the
larger part.

### What the library actually is, measured

A probe asked the library for every one of its 116 designs and ran `missingIn` on each: **116 made, 0 refused, 0
missing lines.** Every design draws everything its own inventory lists. The library's own house is in order.

**Correction 1, to my own first measurement.** My first run said "27 made, 88 refused — `flangebearing` is not a part
any family makes". That was my error, not the library's: `DESIGNED` is keyed by FAMILY ID, and a family id is not a
word you can ask for. `exampleOf(family)` exists for exactly this, and with each family's own example the number is
116/116. I nearly reported a broken library; the measurement was broken.

**Correction 2, to `CLAUDE.md`'s own open item**, which said *"most machines' brackets, springs, hinges and wiring
are still drawn inline by their makers — each is next to become a component, commonest first."* Measured over every
maker file: **371 inline drawing calls under 176 distinct names, and exactly 2 of them name something the library
already makes** (a spring and a spring seat). The rest are `body` (73), `lead` (55), `term` (28), `die` (11), `core`,
`film` — sub-features of parts the library already owns whole, and product shapes, neither of which is a reusable
standard component. **The stated gap is not where it was said to be**, and a round spent "moving brackets into the
library" would have been a round spent on almost nothing. The line in `CLAUDE.md` is corrected to the measurement.

### The fix the probe found by accident

The probe retried each refusal using the first size the refusal itself named. A regex bug handed it `M1` (the `.` in
`M1.6` ended the capture) — and three families **crashed** on it (a throwaway probe over `component(words)`; the
behaviour it recorded is now pinned by `npx vitest run tests/nexus/components.test.ts`, which fails if any of these
throws again):

```
nut M1:         THREW — Cannot read properties of undefined (reading 's')
washer M1:      THREW — Cannot read properties of undefined (reading 'd2')
threadedrod M1: THREW — Cannot read properties of undefined (reading 'p')
bolt M1x10:     REFUSED — Which thread? M1.6, M2, M2.5, …
```

**`M1` and `M7` are both well-formed and neither is in the coarse series.** `thread(w)` parses the SHAPE of a
designation and never checked that one exists; the bolt family happened to check and three others did not, so they
indexed their table, read `undefined` and threw. **M7 is a real ISO thread**, so `nut M7` — an ordinary part asked
for by name — returned a stack trace.

Fixed once, in `callFamily`, before any family sees the words, so a family added later cannot forget what it never
had to remember. **Two wrong versions of that guard came first, and both were caught by the suite rather than by
me:**

1. Written over the words alone, it refused the inventory's own seed `gear m1 z60 b6 pom` — **`m1` there is module 1,
   not a thread.**
2. Scoped to families that declare a `thread` parameter, it refused `wheelnut M22x1.5` — **a wheel nut really is
   M22×1.5**, a fine-pitch thread in its own table that the coarse series has never held.

The rule that survives both is the one the project already lives by: **the data declares, the engine only holds the
ask to it.** The check is made against the family's OWN declared `values` (the hex nut declares `Object.keys(METRIC)`,
the wheel nut declares `M8x1.25 … M22x1.5`), and both readings of `x` are tried, because `M8x1.25` is a pitch and
`M8x30` is a length.

Kept as three tests in `components.test.ts`, including the module-1 gear and the fine-pitch wheel nut, so neither
wrong version can come back.

### Still open

- The warehouse, the fleet and the hand-drawn robot are **hidden by Run 8t, not deleted** — 551 lines that still
  compile. `machines/robot.ts` and `works/tend.ts` are NOT scenery and are deliberately untouched (Run 8t says why).
- The universal edges (`teach/edges.ts`) are untouched: this round reached the library half of the ask only.

GATE: PASS (2368 of 2368) — 180.5s, tidy 24/24, census 178 test-only / 141 dead / 22 unreached files, unchanged.
(The first gate run FAILED, and the lint was right: the crash figures above were pasted with no command beside them,
which is the rule written after four wrong numbers survived three rounds. Named, then green.)
