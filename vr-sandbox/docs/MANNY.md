# Manny

Manny is the critic of this project and a separate instance from the Claude that builds it — his own context, his own
tools, no sunk cost in Claude's decisions. He is defined in `.claude/agents/manny.md` and run with the Agent tool as
`subagent_type: "manny"`. This file is his ledger: what he found, and what was done about it.

He exists because of a measured fault. Every drift recorded in `ROUNDS.md` happened with the rule already written down
somewhere: prose is not a guarantee, because it depends on Claude reading it and choosing to comply. So Manny has two
halves that must not be confused —

- **his judgement** comes from being a separate instance, which is the only way to get a view that does not inherit
  Claude's reasoning;
- **his teeth** come from `tools/manny-gate.mjs`, a `Stop` hook. The *harness* runs it, not Claude, so it cannot be
  forgotten, skipped, or declared inapplicable this round. That is what makes it a guarantee instead of a hope.

## The contract

The gate refuses to let a turn end when either is true:

1. **An open `BLOCK` finding below.** Claude must either **fix** it (mark `[x]`, name the commit) or **answer it in
   writing** (mark `[~]`, and write underneath why it stands — already fixed, does not reproduce, out of scope
   because…, or Manny is wrong because…). Answering is a real option: Manny can be wrong, and is not owed obedience.
   What is not an option is leaving it silent.
2. **`src/` or `tests/` changed since the commit Manny last ran on.** He has not seen the current code, so he is run
   before the turn ends.

A `QUEUE` finding never blocks. That split is the user's own: *"have him be able to hard interrupt or queue depending
on importance."*

**Severity is Manny's call, and misusing it costs him the mechanism.** A `BLOCK` on a nit teaches everyone to resent
the gate; a `QUEUE` on something rotten wastes the one tool that can stop a bad round.

Off switches, deliberate and visible: `MANNY=off` in the environment, or a line `Gate: off` at the start of a line in
this file. The gate also fails **open** on anything it cannot establish — no git, no ledger, a bad parse, its own
crash — because a gate that bricks a session gets deleted, and then there is no gate.

This file is a *report*, not instruction, so it is deliberately not in `tidy.test.ts`'s `PROSE` list: a finding may
rightly name a path that does not exist yet ("there is no owner for X"), and the stale-path check would fail on it.

Last run: d6421b3

---

## Findings

## Run 1 — 2026-10-13 — commit d6421b3

Tried: the user's own named mix, cold, with nothing stubbed —

```
npm run machine -- units
npm run machine -- "a machine that prints 400x300x520 at 300mm/s with two Unitree Z1 Air arms
                    on an AI camera rail over a floor grid, making its own filament from its own scrap"
npm run machine -- "an arm that reaches 540mm and picks up 3kg with six axes, repeatable to 0.1mm"
npm run machine -- "a machine that grinds printed scrap into pellets, melts them and pulls 1.75mm
                    filament through a water bath onto a spool"
npm run machine -- "a camera that tracks a moving person along a 3000 mm rail, panning and tilting to keep them framed"
npm run machine -- "a floor grid of M8 tapped holes on 100 mm centres that every machine bolts down to, 4000 x 3000"
npm run invent  -- "turns printed scrap into 1.75 mm filament"
npm run plan    -- /tmp/mannyprobe/cell.plan works      (the whole cell as blocks and pins)
npm run pack    -- "two Unitree Z1 Air arms on a camera rail over a floor grid, feeding a D400-class
                    printer filament it makes from its own scrap" <dir> --budget 6000
npm run works ; npm run tidy ; node dist-nexus/breakdown.mjs
node tools/forge-look.mjs <viewer> <out> "arm|3d an arm that reaches 540mm …"
node tools/forge-run.mjs  <viewer> <out> "say:an arm that reaches 540mm …" "shot:arm-chat"
```
plus a scratch probe that asks the library, by name, for every part `ask/machine.ts` orders.

First, what is genuinely good, because it matters for where the faults are: `parts/mechanism.ts` is a real
screw-theory mobility solver with rank, redundancy and Grübler kept beside it to disagree with — that is better than
most commercial assembly solvers report. `works/can.ts` names a refusal by its *cause*. `ask/invent.ts` refused my
filament ask honestly and said why. The forge said "1.22 kg of it is drawn and 3.17 kg is bought whole and has no
drawing here" without being asked. `npm run works` reads like an engineer wrote it. The breakdown queue is at
0 "not in the table". None of that is in question below.

What is in question is the one door the user actually asks through.

- [ ] **BLOCK** #1 `npm run machine` throws most of the ask away and never says so.
      why: asked for *"a machine that grinds printed scrap into pellets, melts them and pulls 1.75mm filament
      through a water bath onto a spool"*, it printed:
      `a machine that prints, 300 × 300 × 300 mm of travel: 6 units, 10.39 kg, $413.77.` —
      a stock desktop FDM printer, three axes and a hot end, because `/filament/` matches `deposit` in
      `readMachine`. The grinder, the pellets, the barrel, the water bath, the puller and the spool are not
      mentioned once. `It will not:` was empty. Asked for a floor grid it built a 4.2 × 3.2 × 3.35 m three-axis
      gantry. Asked for *"six axes"* it built two joints (shoulder, elbow) and said nothing about the other four.
      Asked for *"repeatable to 0.1mm"*, *"two … arms"*, *"an AI camera rail"*, *"a floor grid"* — each silently
      dropped. `docs/OWNERS.md`'s row for this file promises "refused with the number that refuses it and a way
      out". `ask/route.ts`, four files away, carries a `notDone` field written for exactly this
      ("what of the ask was not done, and why, said beside what was made"). `composeMachine` has no such field.
      This is theme 9 — failures reported honestly — broken at the front door, and it is why faults #2 and #4
      survived: a machine that never says what it could not do is never asked.
      fix: give `Machine` a `notDone: string[]`. `readMachine` already tokenises; keep the words it consumed and
      report every clause it did not. Any ask naming a count ("two"), a precision ("0.1 mm"), an axis count
      ("six axes") or an unknown noun ("grinder", "water bath", "spool", "floor grid") comes back named. A silent
      drop should be impossible to write, not merely discouraged.

- [ ] **BLOCK** #2 every pulley in every composed machine is a 20-tooth, 5 mm-bore pulley, whatever the bill says.
      why: `ask/machine.ts` orders pulleys by the words `pulley GT2 <teeth> <bore>`. No family reads those words,
      so `component()` falls through to the hand-drawn design's defaults — silently. Probe, run against
      `src/nexus/parts/components.ts`:
      ```
      pulley GT2 20 5      -> GT2 pulley, 20 teeth, 5 mm bore   (5.0 g)
      pulley GT2 60 8      -> GT2 pulley, 20 teeth, 5 mm bore   (5.0 g)
      pulley GT2 100 8     -> GT2 pulley, 20 teeth, 5 mm bore   (5.0 g)
      pulley GT2 400 8     -> GT2 pulley, 20 teeth, 5 mm bore   (5.0 g)
      pulley GT2 1000 8    -> GT2 pulley, 20 teeth, 5 mm bore   (5.0 g)
      pulley HTD5 30 12    -> GT2 pulley, 20 teeth, 5 mm bore   (5.0 g)
      ```
      and the same library, asked in its *own* grammar, is honest:
      ```
      pulley 60t 8mm       -> GT2 pulley, 60 teeth, 8 mm bore   (30.7 g)
      pulley 1000t 8mm     -> REFUSED: teeth must be 12–80 .
      ```
      Every other part `machine.ts` orders resolves correctly — all 36 of them. The pulley is the only liar, and it
      is the one part whose size *is* the unit: `turnAxis(ratio)` orders `pulley GT2 ${20*ratio} 8` as the driven
      wheel, so a 50:1 shoulder is drawn as a 20-tooth pulley driven by a 20-tooth pulley — 1:1. The whole joints
      table (`the shoulder holds 19.95 N·m geared 50:1`) is arithmetic over a ratio the drawing does not have.
      `misdeclared(part)` returns **0** for the ⌀637 pulley, because `mate.ts` holds the drawing to the
      *declaration* and the declaration to nothing: the words are the third party nobody checks.
      Separately: a 50:1 GT2 reduction in one stage is a 1000-tooth pulley, pitch diameter 1000 × 2 / π =
      **636.6 mm**, on an arm whose upper link is 297 mm. `armStack`'s own refusal text already knows this —
      "put a worm or cycloidal reducer there instead of a belt (which is where a cheap arm stops being cheap)" —
      but that sentence only prints on the *failure* branch. The success branch builds the impossible pulley.
      Commit 6121c9a is titled "A size stuck to its own name is the size asked for, or refused" and its message
      says "the words asked for one size and the part came out another, which breaks the rule that this library
      never silently draws a stand-in". That rule does not hold. The round fixed the case it found; the class is
      still open, and it is open in the file that writes every bill of materials the user would buy from.
      fix: two things, and the second is the one that matters. (a) make `machine.ts` speak the families' grammar
      (`pulley 20t 5mm`), and cap `RATIOS` at what one GT2 stage can do — ~5:1 — refusing above it by naming the
      pulley diameter. (b) make a family that cannot read a word in the ask **refuse** rather than default, the way
      `filament` already does ("I do not know \"winder\"") and `bearing` already does ("Which bearing? …").
      A default is a stand-in with better manners.

- [ ] **BLOCK** #3 four making stations have no work envelope, so the works accepts a part of any size on them.
      why: `src/nexus/works/can.ts`, in `fits()`: `const e = s.envelope; if (e) { … }` — a station with no
      `envelope` passes the size test unconditionally, and `envelope?:` is optional in `works/stations.ts`.
      `measuring`, `welder`, `spot-welder`, `soldering` and **`forge`** declare none. Result, from
      `npm run plan -- /tmp/mannyprobe/cell.plan works`, with a 710 × 630 × 1100 mm printer in the plan:
      ```
      42–84  min  a propane forge and an anvil (hand, hand): 1 × d400,
                  a CreatBot D400 HS: 400x300x520 build, 300 mm/s by forging on a propane forge and an anvil
      ```
      It also forged the 4000 × 3000 mm floor grid, the scrap grinder and the water bath, and then declared
      "5.6 h on the clock … This schedule cannot be beaten." Meanwhile a 400 × 300 × 8 mm aluminium bed was
      correctly refused — so the smaller part failed and the 1.1 m one passed, which is the tell. The forge's own
      `selfBuild.how` says it is "a 200 mm steel tube or an empty 20 lb propane tank": the size is in the prose and
      absent from the field. The spot welder's limit is its throat depth, maybe 100 mm; it will accept 6 metres.
      These are the numbers the user spends real money and real weekends against.
      fix: make `envelope` required on any station whose `does` includes a making process, and change the
      `if (e)` to treat a missing envelope as a refusal cause ("this station declares no work envelope") rather
      than a pass. Then add the real ones: forge ~200 × 200 × 600 (the tube's bore and length), spot welder by its
      throat (~100 mm reach), welder by the bench it stands on. A test that every making station declares one is
      four lines and makes the class impossible.

- [ ] **BLOCK** #4 a composed machine's stated mass includes the payload it is holding.
      why: `stack()` — `const all = frameKg + axisKg… + toolsKg + payloadKg;` returned as `kg` — and `armStack()`
      — `const kg = linkKg… + toolKg + joints… + payloadKg;`. So:
      ```
      npm run machine -- "an arm that reaches 540mm and picks up 3kg with six axes, repeatable to 0.1mm"
      an arm that picks things up, 540 mm of reach: 6 units, 4.39 kg, $128.21.
      ```
      4.39 kg is a 1.39 kg arm holding a 3 kg brick. The forge then compounds it, honestly but wrongly:
      "1.22 kg of it is drawn and 3.17 kg is bought whole and has no drawing here (an MG996R metal-gear servo,
      11 kg·cm at 6 V, its fingers and body, printed here)" — attributing 3.17 kg to a 55 g servo and some printed
      fingers. Everything downstream that reads `Machine.kg` — what the frame must carry, what the works must
      move, what it would ship at — is wrong by the payload.
      fix: `kg` is the machine. Carry the payload as its own field and print it on its own line
      ("1.39 kg, holding 3.00 kg"). The stage-by-stage `carrying` numbers are already right; only the headline
      is wrong, which is the worst place for it to be.

- [ ] **BLOCK** #5 no tool can render an invented machine, so no invented machine has ever been looked at.
      why: `tools/forge-look.mjs` — the tool whose header says it stands a thing "in the room it will be seen in" —
      goes through the page's `see3d`, and `see3d` does not reach `machineWords`:
      ```
      node tools/forge-look.mjs /tmp/mannyprobe/view /tmp/mannyprobe/shots \
        "arm|3d an arm that reaches 540mm and picks up 3kg with six axes"
      page.evaluate: Error: Nothing in the inventory called "3d an arm that reaches 540mm and picks up 3kg
      with six axes". Families make any size: screw M3x10, nut M3, …
      ```
      `tools/look.mjs` cannot reach it either — the look page resolves library parts (`kit=part`), and
      `composeMachine` is called only from `view/forge.ts`'s chat handler and `view/works-room.ts`. The chat path
      does work: `tools/forge-run.mjs … "say:an arm that reaches 540mm …"` stood something in the room
      (`/tmp/mannyprobe/shots/arm-chat.png`) — about sixty pixels of it, off at the left edge of an otherwise empty
      floor, at no stated scale, with no framing, no named view, no cutaway, no explode. Every library part gets
      all of those from the look page. An invented machine gets none.
      So CLAUDE.md's own round checklist, step 2 — *"What does a person see first? Render it, framed so it can be
      seen whole, take a screenshot, and look at it"* — has been **impossible** for the inventor's door for as long
      as the door has existed. That is the reason #1, #2 and #4 all survived: a ⌀637 mm pulley on a 297 mm arm is
      invisible in a bill of materials and unmissable in a picture.
      fix: give the look page a `machine=<words>` route to `machinePart`, so `tools/look.mjs` renders a composed
      machine from named views with explode and cut like anything else. It is the smallest change on this page
      and it is the one that makes the other findings catchable without me.

- [ ] **QUEUE** #6 the inventor's door is cut off from the engine behind it.
      why: `src/nexus/ask/machine.ts` is 620 lines and imports four things: `components`, `mass`, `kits` types,
      `prices`. In the same tree, unused by it:
      • `parts/mechanism.ts` — mobility by the rank of the constraint rows, redundancy reported, closed loops by
        construction. Its only callers are `parts/mate.ts` and its own test
        (`grep -rn "from '.*mechanism'" src/ tests/` → two hits). So no composed machine, no invention, no sketch
        and no works plan is ever asked **how it moves**. "Six axes" has nothing to be checked against, and
        `stack()`'s strictly serial chain cannot express CoreXY, a delta, a four-bar, a scissor lift, or the
        D400 HS's own four independent Z motors with anti-tilt — every one of which is a closed loop.
      • `book/slice.ts`'s `cantilever.tip-sag` (δ from P, ℓ, E, I, with self-weight and a slenderness domain) and
        `book/structures.ts`'s cantilever law. `baseFrame` says instead: "its stiffness not worked out".
      • `parts/mate.ts` and `parts/space.ts` — "nothing is put where it does not fit". `machineParts` places by
        hand-written offsets (`up += s.unit.box[1]`) instead.
      • `ask/route.ts`'s `notDone` (see #1).
      Four owners that already do the hard part, and the file that needs all four does its own version of none of
      them. This is the user's *"merge them don't discard one … why are there two different generators"* at the
      architecture level rather than the file level.
      fix: one round, in this order — emit `Joint[]` from `composeMachine` and run `mobility()` on it (reach and
      DOF become checked, closed loops become expressible); place by `mate`/`space`; call the beam law for any
      span over ~600 mm; add `notDone`.

- [ ] **QUEUE** #7 `Does` cannot say feed, meter, heat, cool, wind, convey, grind, mix or pump — half of industry.
      why: `export type Does = 'slide' | 'turn' | 'grip' | 'deposit' | 'cut' | 'solder' | 'see' | 'think' | 'hold'`.
      Nine words, every one of them a *discrete motion*. There is no continuous-throughput affordance, which is
      why the filament line came out as a printer (#1) and why `npm run machine -- units` lists nine units and not
      one of them moves material through itself. The user named augers by name — *"industrial … augers … build the
      machines that build the circuit boards"* — and an auger cannot be said here. Neither can a conveyor, a pump,
      a winder, a puller, a mixer, a kiln's own belt, or the barrel that makes the filament.
      `ask/invent.ts` already owns exactly this: ports that carry a quantity, mated and sized by conservation.
      fix: give `Unit` a rate port (kg/h, mm³/s, parts/h, W) alongside its mechanical `carries`/`lifts`, and let a
      machine be a graph of units rather than only a stack. Then the user's ask — *"feeding itself filament it
      makes from its own scrap"* — becomes a question the engine can answer: does the line make filament faster
      than the printer eats it? Nothing in the world answers that for a machine invented five seconds ago.

- [ ] **QUEUE** #8 `baseFrame` claims 200 kg at any size, and its own stated reason is now false.
      why: `carries: 200, … limit: 'a 2040 cube of this size on its corner brackets, taken at 200 kg (an estimate:
      it is far stiffer than anything stacked on it here)'` — constant in w, d and h. The floor-grid ask composed
      `a 4200 × 3200 × 3350 mm frame — 21.5 m of 2040 extrusion` and claimed the same 200 kg, with the same
      sentence. Beam deflection goes as L³: the same claim over 4.2 m is ~590× the sag it is over 500 mm. "Nothing
      composed here comes near it" was true when it was written and is not true now, which is the failure mode
      CLAUDE.md's last line is about — a number that lived in someone's memory instead of in something that runs.
      fix: compute it. `book/slice.ts` has the law; the section needs I, not just kg/m. For 20 × 40 with 5 mm
      slots a supplier publishes Ix = 1.40 cm⁴ and 0.89 kg/m
      (framingtech.laravel.cloud/products/t-slot-extrusions/…/20-x-40-05, read 2026-10-13) against the library's
      0.8 kg/m and no I at all; Robotunits publish 1.530 kg/m for a 40 × 40 against the library's 1.5
      (directindustry.com, same date). Add `Ix`/`Iy` to `EXTRUSIONS` and the frame can stop guessing.

- [ ] **QUEUE** #9 the owners index names 82 files of 324, and the four directories it enumerates are missing 22.
      why: CLAUDE.md says *"Seventy-one owners"*, lists 82 filenames, and instructs every round:
      *"Before writing anything: find the owner and extend it. Two owners for one concern is the fault this index
      exists to prevent."* `find src/nexus -name '*.ts' | wc -l` → **324**. `docs/OWNERS.md` names 118 distinct
      paths. In `ask/`, `parts/`, `machines/` and `works/` alone — the four the index walks file by file — these
      are absent: `abilities.ts asked.ts outputs.ts parse.ts rules.ts spec.ts surprise.ts test-asks.ts want.ts
      words.ts cell.ts devices.ts fleet.ts kit-robot.ts profile.ts elements.ts series.ts economics.ts lines.ts
      programs.ts stations.ts text.ts`. `works/stations.ts` is the whole station catalogue and finding #3 lives in
      it; a round that follows the instruction literally will not find it. `tidy.test.ts` checks that every path
      named in prose **exists**; nothing checks that every file **is named**. The ratchet is one-directional, and
      the direction it does not look is the one that makes a second owner.
      fix: add the inverse check to `tidy.test.ts` as a fifth ratchet — every `src/nexus/**/*.ts` is named in
      CLAUDE.md or `docs/OWNERS.md`, with today's 200-odd unnamed files written down as the debt, so the list only
      shrinks. Also: CLAUDE.md says "`src/nexus/` is sixteen directories and two files"; there are seventeen, and
      its own table has seventeen rows.

- [ ] **QUEUE** #10 the clone detector finds decimal literals, not duplicate generators — and 28 part names have two.
      why: `tests/nexus/tidy.test.ts`, `fragments()`: `if (… || !/\d*\.\d/.test(frag)) continue;` — a fragment is
      only a clone if it contains a decimal point. The thirteen it declares are `std(…)` helpers, `unit('L', …)`
      table rows the comment itself concedes are a table, and one solder-ball box. Real debt, cosmetic weight.
      What it cannot see, by construction: `components.ts`'s `DESIGNS` and `families.ts`'s `HAND_FAMILIES` are two
      part generators that answer to overlapping names —
      `screw, nut, washer, bearing, spring, extrusion, resistor, stepper, pulley, leadscrew, led, fan, rail, rod,
      tube, threadedrod, sheet, insert, belt, bolt, setscrew, dowel, magnet, pipe, ibeam, heater, thermistor,
      coupling` — 28 of them, and at least one (#2) gives different answers for the same physical part depending
      on which grammar you reach it through. The user's complaint was *"why are there two different generators"*.
      The round built a detector for magic numbers. Not wrong; not the thing asked.
      fix: a second detector that works on *names*, not text: every family id that is also a DESIGN key is
      declared with which one owns the words, and a test asks both for the same part and requires the same mass.
      That test, written once, catches #2 and every future instance of it.

- [ ] **QUEUE** #11 the extrusion family knows four profiles and silently returns a 2020 for anything else.
      why: `families.ts`:
      `read(w) { const s = /\b(2020|2040|3030|4040)\b/.exec(w)?.[1] ?? '2020', …`
      ```
      extrusion 4080 1000  -> DRAWN  0.43778 kg | says: 2020 extrusion, 1000 mm
      ```
      4080 is an ordinary catalogue profile. So are 2060, 2080, 3060, 4080, 4590 and the V-slot series. The ask
      said 4080 and the answer is a 2020 that calls itself a 2020 in a bill headed 4080 — the same class as #2.
      The profile list is also written three times inside that one line (the table's keys, the match, the strip),
      where the clone detector cannot see it because it is one file.
      fix: drive the regex off `Object.keys(EXTRUSIONS)`, refuse an unknown profile by naming the ones it has,
      and widen the table.

- [ ] **QUEUE** #12 `npm run plan` cannot read its own title line, and weighs every plan as solid metal.
      why: with the documented four line kinds, my cell plan printed
      `fault: could not read: The scrap-fed cell: a D400-class printer, two Z1 Air arms…` and titled itself
      "a fast plan", then `5847 kg of what it says it is made of`. The 5.8 tonnes is a 4 m × 3 m × 12 mm block of
      solid steel plus a 710 × 630 × 1100 solid steel printer — `fill` defaults to 1, while the file's own comment
      says "a welded frame is about a twentieth of its own box". For a tool whose stated purpose is "the first ten
      minutes of an invention", a default that makes every plan absurd is the wrong default.
      fix: read the first line as the title (or document that it is not one); default `fill` by form — a `box`
      named frame/case ~0.05, a `plate` 1, a `can` ~0.1 — and say which default it used.

- [ ] **QUEUE** #13 the build pack prints its price date blank.
      why: `teach/buildpack.ts:344` — ``Prices as seen ${[…seen].join(', ')}, US dollars before tax`` renders as
      `Prices as seen , US dollars before tax` whenever no line carries a priced offer, which is what happened on
      my ask. Theme 9 is every number sourced with its date; the one line that carries the date is empty.
      fix: say "no priced offer in this pack" when the set is empty.

### What the library should know about the machines the user keeps naming, since I had to look it up

Read 2026-10-13. Nothing in `src/` matches `Unitree`, `CreatBot`, `D400`, `winder`, `camera rail` or `floor grid`
(`grep -ril` over `src/`, all empty), and `component()` refuses all six by name. These are the figures:

**Unitree Z1 / Z1 Air** (unitree.com/z1; airpuria.com and wirabot.com listings). 6 axes. Reach **740 mm**.
Mass 4.3 kg (Air) / 4.5 kg (Pro). Payload **2 kg** (Air), 3–5 kg (Pro). Repeatability **~0.1 mm**. Joint ranges
±150° and ±160°, **180°/s**. **RS-485 at 1 kHz**. Note what the library has no word for: repeatability, joint
limits in degrees, and a 1 kHz control bus.

**CreatBot D400 HS** (creatbot.com/d400-hs). Build **420 × 400 × 420 mm** single, 365 × 400 × 420 dual (my guess of
400 × 300 × 520 was wrong). Dual nozzle with an auto shutter, **420 °C** hotend, 120 °C bed, **70 °C actively
heated chamber**, **600 mm/s**, **90 mm³/s flow**, 0.05 mm layer, 1.75 mm filament, 0.6 mm nozzle (0.3–1.0),
Klipper, eddy-current bed probing at 0.001 mm, HD-camera dual-nozzle XY offset at 0.02 mm, **four independent Z
motors with real-time anti-tilt**, HEPA+carbon filter. The real limit on a printer is **mm³/s, not mm/s** — and
`HOT_END` carries no flow figure at all. The quad-Z is a closed kinematic loop (#6).

**The floor grid already exists as a standard**: Siegmund System 28 — **Ø28 mm holes on a 100 × 100 mm grid** in a
~25 mm S355J2+N top, M12 threaded holes every 200 mm down the side walls, with a whole accessory range built to
that grid (welda.be and trick-tools.com listings, read 2026-10-13). That is the thing to copy, and `mate.ts`
already has the vocabulary for it: `STANDARD` holds named hole patterns and mates a part to one.

### How the best systems do this, and the branch past them

- **OpenUSD** composes a scene from *references*, *variants* and `UsdGeomPointInstancer`: one asset, many
  instances, each at a transform, each overridable. That is the answer to "two Z1 Airs" — which `composeMachine`
  cannot say at all, because it returns one serial stack. **Satisfactory** and **Factorio** give the same idea to
  a player as a *blueprint*: a saved sub-assembly stamped down on a grid.
  *The branch past them:* make the floor grid the **datum of the graph**, not a transform. "A Z1 Air at G-12,
  the D400 at G-34, the rail along row 2" is then an **address**, and `mate.ts`'s bolt-pattern check runs against
  the grid for free — a thing bolted to a hole that is not there is refused by the same machinery that already
  refuses a nut on the wrong thread. No CAD tool treats the fixture grid as a coordinate system; they all treat
  it as geometry.
- **Factorio / Satisfactory** are, under the art, throughput solvers: items/s in versus items/s out, with the
  bottleneck named. **Kerbal** does the same for one number, ΔV, live as you build. `ask/invent.ts` already has
  conservation over ports; `machine.ts` has none. See #7.
  *The branch past them:* those games balance a fixed recipe book. Here the recipes are *derived* — a hot end's
  90 mm³/s and a grinder's kg/h come from the parts. A balance check over an invented machine, not a catalogued
  one, is something neither game nor any MES does.
- **ROS / MoveIt / URDF** describe a robot as joints with limits and answer reach, IK and collision.
  `mechanism.ts` is already most of the way there and is wired to nothing (#6).
  *The branch past them:* URDF cannot tell you an assembly will **bind**. `mechanism.ts`'s redundancy count — rows
  minus rank — is exactly that number, and the file's own comment already says so: "the number a fitter feels and
  a drawing never shows". Surface it on every composed machine and the project has something MoveIt does not.
- **Onshape** (Standard Content + FeatureScript) and **Fusion** (configurations) make every catalogue part a
  typed, *bounded* parameter set: an out-of-range configuration cannot be instanced. `families.ts` has the bounds
  already — min 12, max 80 teeth — and #2 walks straight round them.
  *The branch past them:* `mate.ts` holds the **drawing** to the **declaration**. Onshape holds the
  **configuration** to the **drawing**. Nobody holds all three to the **words that asked**. Close that triangle —
  *nothing is drawn under a name it does not answer to* — and #2, #11 and their whole family become unwritable.
- **Houdini** wedges: sweep a parameter space and keep the front. The user asked for generative design on
  2026-10-08. A composed machine is one point today; `npm run machine -- "…" --sweep` returning the cost/speed/
  payload Pareto front is a day's work on top of what exists.

### Tools that should exist, and one that was done by hand

The honest answer to *"was there a tool for what Claude just did by hand?"*: finding #2 took me a scratch probe
that asks the library, by name, for every part `machine.ts` orders and prints what comes back. There is no such
tool in `docs/TOOLS.md`, and CLAUDE.md's rule is that a thing worked out by hand twice becomes one. It would have
caught the pulley the day the file was written.

1. `npm run words -- "<part words>" …` — what the library hands back for each, with its mass and whether the name
   it returns matches the name you asked. Four lines. (#2, #11)
2. A look-page route for `composeMachine`, so `tools/look.mjs` renders an invented machine. (#5)
3. A tidy ratchet for **unnamed** files, the inverse of the stale-path check. (#9)
4. A test that every making station declares a work envelope. (#3)
5. A fixed set of invention asks — the user's own five machines — re-run every round, each with the refusal it
   must give, so a drop like #1 fails a test instead of printing confidently. There is `works -- builds` for
   things to throw at the works; there is nothing for things to throw at the inventor.

### On the last two rounds

d6421b3 cut CLAUDE.md from 2,166 lines to 376. 4a31fb6 built the clone detector. Both are inside theme 7 and both
are real work. But the drift gate in CLAUDE.md asks *"Would the user call this round progress if they saw only its
result?"* — and the result of the last two rounds is a shorter markdown file and thirteen declared duplicate
literals, while `npm run machine` was turning a filament factory into a desktop printer and drawing a ⌀637 mm
pulley on a 297 mm arm. Nobody noticed because nobody can render what that door makes (#5). Two rounds of
organising the house while the front door was blind. The three rounds before them — the fleet's ⌀54.864, the
declared-against-drawn check, the DOF rank — were the real thing, and that is the level to go back to.

## Next round, in Manny's order

1. **#5 first**, because it is the eye. A `machine=<words>` route on the look page, and `tools/look.mjs` renders a
   composed machine from named views with explode. Everything else on this page gets easier to find once a person
   can see what the inventor makes, and nothing else should be attempted blind.
2. **#2 and #11 together** — the pulley and the profile — and then the three-way check that makes the class
   impossible: words ↔ declaration ↔ geometry, with `tidy` carrying a DESIGN/FAMILY name-overlap list (#10).
   Do this second because every bill the user might order from is wrong until it is done.
3. **#1 and #4**: `notDone` on `Machine`, and the payload out of `kg`. Half a day, and it is the difference
   between a tool that is honest and one that is confident.
4. **#3**: envelopes on the four stations that have none, plus the test. The works' numbers are the ones that
   cost money.
5. **#6**: wire `machine.ts` to `mechanism.ts`. Emit joints, run `mobility()`, print DOF and redundancy. "Six
   axes" becomes checkable and CoreXY, a delta, a four-bar and the D400's quad-Z become sayable. This is the
   round that turns the composer from a stack into a mechanism.
6. **#7**: the rate port on `Unit`, shared with `invent.ts`'s conservation. Then compose the filament line for
   real, and answer whether it feeds the printer. That is the user's own sentence, finally executable.
7. Then the real machines, with the figures above: Z1 / Z1 Air, the D400 HS, a Siegmund-style grid as a `STANDARD`
   hole pattern. Start them by breaking down `joint-drive`, `joint-torque-sensor` and `slip-ring` — the three
   lines at the top of the breakdown queue's "only its materials listed", and exactly the three parts a precision
   arm is made of.
8. #8, #9, #12, #13 as they fit.
