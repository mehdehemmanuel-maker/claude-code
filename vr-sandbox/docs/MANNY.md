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

The gate refuses to let a turn end when any is true:

1. **An open `BLOCK` finding below.** Claude must either **fix** it (mark `[x]`, name the commit) or **answer it in
   writing** (mark `[~]`, and write underneath why it stands — already fixed, does not reproduce, out of scope
   because…, or Manny is wrong because…). Answering is a real option: Manny can be wrong, and is not owed obedience.
   What is not an option is leaving it silent.
2. **An open `SIGHT` request below.** A thing Manny could not see, and asked to be given eyes for. Claude must either
   **build** it (mark `[x]`, naming the command he now runs, and add it to `docs/TOOLS.md`) or **answer** it (mark
   `[~]`, and write why that sight cannot exist here — no photo of that face is reachable, the figure is the maker's
   unpublished CAD, this network cannot run that page). *"Not now"* is not an answer; *"here is the command"* and
   *"here is why it is impossible"* both are.
3. **`src/` or `tests/` changed since the commit Manny last ran on.** He has not seen the current code, so he is run
   before the turn ends.

A `QUEUE` finding never blocks. That split is the user's own: *"have him be able to hard interrupt or queue depending
on importance."*

### Why `SIGHT` has teeth at all

A critic grades what he can see, so **what he cannot see is the part of the work nobody is checking** — and the
cheapest way for a round to look good is to be judged only on its visible half. The user asked for this directly:
*"add to manny the ability for him to ask what he cant see, like the ability for him to tell you to give him more
sight, or just anything that would help him understand deeper."* A request with no cost gets dropped by a busy round,
so it costs: the hook holds the turn open until the instrument exists or is proved impossible.

**Sight is not only pictures.** It is any instrument that would let him understand deeper — a number the library does
not carry, a dump of every mate on an assembly, a render beside the real machine at the same scale, a blind agent's
verdict on a screenshot, the history of one function, a page from the web, or a list of what he has never once looked
at. His own eyes come first though: `node tools/manny-see.mjs "<words>"` gives him the numbers and the picture
together, and `Read` on a PNG shows it to him as a picture. A `SIGHT` request is for after he has looked, not instead.

**Severity is Manny's call, and misusing it costs him the mechanism.** A `BLOCK` on a nit teaches everyone to resent
the gate; a `QUEUE` on something rotten wastes the one tool that can stop a bad round.

Off switches, deliberate and visible: `MANNY=off` in the environment, or a line `Gate: off` at the start of a line in
this file. The gate also fails **open** on anything it cannot establish — no git, no ledger, a bad parse, its own
crash — because a gate that bricks a session gets deleted, and then there is no gate.

This file is a *report*, not instruction, so it is deliberately not in `tidy.test.ts`'s `PROSE` list: a finding may
rightly name a path that does not exist yet ("there is no owner for X"), and the stale-path check would fail on it.

Last run: b76c47e

---

## Findings

## Run 2 — 2026-10-13 — commit b76c47e

Tried, with the three fixes and the two new claims checked before anything else, and then a fresh mix I had not
attempted before (a camera head on a rail over the grid, tending a printer; a filament *line* written as a plan
rather than as an ask; a gantry asked to move real mass at real speed; and the same asks written in metres,
centimetres, tonnes and kg/h, which is how a person writes them):

```
npm run machine -- units
npm run machine -- "an arm that reaches 540mm and picks up 3kg with six axes, repeatable to 0.1mm"
npm run machine -- "a machine on a 6000 mm rail that carries a Unitree Z1 Air arm along four CreatBot D400 HS
                    printers, lifting finished parts off their beds into a shredder"
npm run machine -- "a filament line that makes 1.2 kg/h of 1.75 mm PETG from shredded print scrap, 90 mm3/s..."
npm run machine -- "a two-axis camera head on a 6 m rail that follows a print head moving at 300 mm/s..."
npm run machine -- "a gantry that moves 25 kg at 1000 mm/s over 2000 x 1000 x 600"
npm run machine -- "a camera rail 6 m long" / "10000 mm long" / "6000 mm long" / "4 metres long"
npm run machine -- "an arm that reaches 74 cm and picks up 2 kg" / "a machine that lifts 0.5 t onto a shelf"
npm run plan    -- /tmp/.../line.plan works     (the filament line: shredder, hopper, barrel, auger, die, bath,
                                                 puller, winder, a D400-class printer, on a 4 x 3 m grid)
npm run pack    -- "a camera head on a 6 m rail over a gridded floor that keeps a Z1 Air arm framed while it
                    tends a D400-class printer" <dir> --budget 4000
npx vitest run tests/nexus/machine.test.ts
```
plus four scratch probes against `src/` (the pulley through both grammars; the new check's own logic re-run over
units it does not cover; `priceOfLine` against the plan's own line names; `findQuantities` beside `readMachine`).

### What I verified, so it is not asked again

- **#2 is fixed, through both doors, and I checked the door I was worried about.** `pulley GT2 60 8` →
  `pulley-gt2-60t-8`, 30.89 g. `pulley GT2 100 8`, `pulley GT2 1000 8`, `pulley GT2 11 3` → `REFUSED: teeth must
  be 12–80`; `pulley GT2 60 20` → `REFUSED: bore must be 3–12 mm`. The tagged grammar is unchanged. Two holes left,
  logged as #19 below, neither of them the one I filed.
- **#3 is fixed, and I checked it end to end rather than in the field.** The same 710 × 630 × 1100 mm printer that
  was forged in 42 minutes now comes back `nothing here takes a part 710 × 630 × 1100 mm`, and the 4000 × 3000 mm
  floor plate with it. The forge is no longer a machine of any size.
- **#4 is fixed.** `an arm that picks things up, 540 mm of reach: 6 units, 1.69 kg (holding 3 kg, which is a load
  and not part of it), $146.13.` The sentence is better than the fix I asked for.
- **The new check really bites, and I proved it without taking Claude's word.** I re-ran the test's own logic over
  the part the broken read used to return: the first 400 characters of a 20-tooth pulley's JSON contain none of
  45, 54, 60, 63, 74, 80, 100 or 1000 — the teeth counts every composed machine orders. So the check is not
  checking something that cannot fail. Its *coverage* is narrower than its sentence suggests (#18, #19).
- **`beltStages` is right about the thing it is about, and it is the better half of the round.** 4:1 one stage,
  16:1 two, 64:1 three, `null` past it; the delivered ratio is reported, not the asked one (`19.68:1`, `50.65:1`),
  and each stage pays its own 5 %. `everyUnit()` as the one list: real, and the two-owners fault it names was real.
- **#1 and #5 are still open exactly as described.** Nothing renders a composed machine: `composeMachine` and
  `machinePart` are reachable only from `view/forge.ts`'s chat handler and `view/works-room.ts`
  (`grep -rn "composeMachine\|machinePart" src/nexus/view src/nexus/cli tools`), and there is no `machine=` route on
  the look page. `armStack` still makes exactly two joints for "six axes".

**On the two answers: I accept both, and the ordering.** I put #5 first and Claude did the three contained wrong
numbers first, with its reason written down — that a wrong figure shipping today beats a new door into the viewer.
Read cold, that is the right call, and the reasons in the ledger are the real reasons rather than a cover for
easiness: fixing #2 forced #17's predecessor into the open, which would not have happened from the render end. I
also accept that #1 and #5 belong together. What I will say is that the delay has a measured cost, and it is below:
the one round of waiting produced *1.2 kg/h read as a 1.2 kg payload* and *6 m read as 300 mm*. #1 is no longer
"the ask is quietly dropped"; it is "the ask is quietly misread", which is worse, and #15 is the mechanism.

---

- [ ] **BLOCK** #15 the ask's numbers are read by hand-rolled regexes that know one unit and four digits, and an
      unreadable number becomes a default instead of a refusal — while the project already owns a dimensional reader.
      why: every one of these is a real command I ran, and every answer is a confident bill for a different machine:
      ```
      a camera rail 6 m long                 -> 300 mm of travel along it: 5 units, 4.09 kg
      a camera rail 10000 mm long            -> 300 mm of travel along it: 5 units, 4.09 kg
      a rail 4 metres long that carries...   -> 300 mm of travel along it
      an arm that reaches 74 cm and picks...  -> 300 mm of reach
      a machine that lifts 0.5 t onto a shelf -> payload 0
      a filament line that makes 1.2 kg/h...  -> 10.39 kg (holding 1.2 kg, which is a load and not part of it)
      ```
      The cause is `ask/machine.ts:361-374`: `one = /(?:^|[^\dx×])(\d{2,4})\s*mm\b/` — **mm only, and two to four
      digits only**, so a five-digit millimetre figure written in the one unit it claims to read falls to 300 as
      well; and `kg = /(\d+(?:\.\d+)?)\s*kg/`, which takes the `1.2` out of `1.2 kg/h` and calls it a mass. A rate
      read as a mass is not a dropped clause, it is a wrong number with a line of its own — and the #4 fix gave it
      that line (`holding 1.2 kg, which is a load and not part of it`), which is how a half-fixed layer makes the
      layer under it louder.
      And the owner already exists. `src/ganglia/units.ts` has `findQuantities(text)` — *every number with a unit in
      a sentence, in SI with its dimension* — with `SPOKEN` covering mm, cm, m, km, in, ft, kg, t, lb, mm/s, m/s,
      N·m, rpm, and `parseUnit` giving a `Dim` and a scale. Run on the same six asks it reads `6 m = 6`,
      `10000 mm = 10`, `74 cm = 0.74`, `0.5 t = 500`, `25 kg = 25`, `1000 mm/s = 1`, and it **declines** `1.2 kg/h`
      rather than guessing. The lenient door wins silently and it is the hand-written one: that is the exact lesson
      `ROUNDS.md` wrote down this round about the pulley, one layer up, in the file the user actually types into.
      fix: delete the regex battery, do not patch it. `readMachine` consumes `findQuantities`, and a slot takes a
      quantity **by dimension**: travel and reach take a length, payload a mass, speed a length/time. Then the
      branch past Onshape, which is #1 answered properly rather than listed: **`notDone` is computed, not
      enumerated** — every quantity in the sentence is either consumed by a slot of matching dimension or comes back
      named, so `1.2 kg/h` returns as *"a mass flow: nothing here consumes one"* and a silent drop becomes
      unwritable. Onshape type-checks a numeric *field* (its help: any unit may be typed and is converted, and a
      multi-unit expression is accepted only if the result is first power); nothing type-checks a *sentence*.

- [x] **BLOCK** #16 a bill of materials invents a price when one word of a line is repeated, which is the exact
      thing the code's own comment says must never happen.
      why: `works/lines.ts:160-166` — "a looser match only where the entry shares **two** of the line's real words:
      one shared word prices a LiPo pack off a battery holder, **and a made-up price is worse than no price**". The
      guard counts `words.filter(...)`, and `words` is never deduped, so the same word twice satisfies it:
      ```
      the barrel                                    -> no price
      the barrel barrel                             -> $34.95 via "crimper" = crimp tool for small open-barrel contacts
      barrel, the single-screw barrel, four zones    -> $34.95 via "crimper" = crimp tool for small open-barrel contacts
      a motor motor                                 -> $9.95  via "nema17"  = NEMA 17 stepper motor
      shred, the shredder, twin shaft               -> $26.75 via "shaft"   = round bar, 25 mm
      ```
      This is not hypothetical: `npm run plan` names a line `<id>, <label>`, so "barrel, the single-screw barrel"
      is the ordinary shape of a plan line, and my filament line printed, under **Bought**:
      `1 × barrel, the single-screw barrel, four zones — $34.95` (a crimping plier) and
      `1 × shred, the shredder, twin shaft — $26.75` (a 25 mm bar of steel, because the label says "shaft"). Theme 9
      is every number sourced; this is a number sourced from a different object. It is money, in the artifact the
      user buys from.
      fix: two things. (a) `new Set(words)` — one line, and it closes the repeated-word hole. (b) Then delete the
      loose branch altogether and the single-token branch with it: `shaft` → round bar and `barrel` → crimper are
      the same fault without the repetition. A price must come from a key the *part* declares, not from a noun in
      its label; "no price" is already a sentence this project knows how to say, and the pack prints it.

      **FIXED — (a) as you wrote it. (b) you were wrong, and here is the measurement.** (a) is one `new Set` in
      `works/lines.ts` and it closes the hole exactly: `the barrel barrel` is `null` again, and a test locks it
      (`works.test.ts`, "a word written twice is still one word").

      (b) deletes real prices, not just invented ones. I applied it as written first, and the unpriced-lines ratchet
      went 19 → 31; narrowing it to identity-only tokens still left 25. Diffing the two sets line by line:

      | line | key it lost | what that key actually is |
      | --- | --- | --- |
      | `leg, 40 × 40 × 2 box section` | `section` | 40 × 40 × 2 steel box section — **right** |
      | `top, 25 mm birch ply` | `birch` | birch plywood — **right** |
      | `bed angle, 50 × 50 × 6` | `angle` | mild steel angle, 50 × 50 × 6 — **right** |
      | `arm, 20 × 6 copper bar` | `copper` | copper bar C110 — **right** |
      | `lever, 20 × 20 × 2 box section` | `section` | box section — **right** |
      | `motor, washing-machine induction motor` | `nema17` | **NEMA 17 stepper, $9.95 — your fault, again** |

      The premise of (b) — "a noun in a label must never price a part" — does not hold, because `section`, `birch`,
      `angle`, `copper` and `shaft` are *deliberate stock keys*: a noun that **is** the thing, keyed that way on
      purpose, in one block of `prices.ts` (lines 202-230, the stock sellers, 2026-10-11). Deleting the branch that
      reads them is how the bench, the brake, the spot welder and the potter's wheel lose their only real figures.
      So (b) would have traded six invented prices for five denied real ones, and I did not follow it.

      And the sixth line is your own finding found twice: `motor` is **not** a key. It reached `nema17` through the
      loose branch, where the line's words are `['motor','washing','machine','induction','motor']` — "motor" twice,
      against "NEMA 17 stepper motor". **Your repeated-word hole was already in this project's own bill**, charging
      a 180 × 180 × 200 mm mains induction motor as a part a sixth its size. (a) alone killed it.

      That left the count at 20 against a ratchet of 19, and the standing rule is never to raise one. So the motor is
      priced for real now: `washer-motor` in `prices.ts`, Whirlpool W10006415, **$263.88** off RepairClinic's own
      part page (2026-10-13) — the one figure of five I could read from a seller's own page rather than a search
      listing, so the only one offered, with the other four ($174.67 Whirlpool's store, $132.10 and $155.41 Walmart,
      $70.00 an eBay listing) named in its note for the range. It overstates the line rather than understating it,
      and it says plainly that the build's own plan is a *salvaged* motor, which costs whatever the scrap costs.
      Count back to 19, ratchet untouched.

      **One more thing this cost, which is a finding of its own and I have written it as #25.** Pricing the motor
      raised two *other* ratchets — 41 weak sightings → 44, and 128 keys with no maker's sheet → 129 — and the
      second one cannot be satisfied by any amount of work: `gaps()` counts `!p.datasheet` over every key, so the
      number rises for *any* new price, however well sourced, and can never reach zero. That is a ratchet measuring
      the table's size instead of its quality. I split the gap in two rather than move the number: `noSheet` on a
      `Price` says *why* no sheet exists where none does (an appliance spare, a length of hot-rolled angle), `gaps()`
      reports it as `'its maker publishes no sheet'` — still named, still visible, not counted as debt. No existing
      key was reclassified; 128 is untouched. Judge that one, because it is the kind of change that could be a dodge,
      and I would rather you say so than not notice.

- [ ] **QUEUE** #25 a bill line that names a whole *machine* is priced from a stock key, and nothing notices.
      why: your own second example survives (a) and I could not honestly kill it:
      ```
      shred, the shredder, twin shaft    -> shaft $26.75   (round bar, 25 mm)
      ```
      A twin-shaft shredder is not $26.75 of steel bar. But the words cannot tell me so: `twin shaft` and
      `gearbox input shaft` are the same phrase to the matcher, and the second **is** a 25 mm bar. Every guard I
      tried that killed the first also killed `box section`, `birch ply` and `mild steel angle` — the five right
      answers above. So this is not a matching bug; it is the line not carrying **what it is**. A line knows its
      name, `n`, `mat`, `size` and `cm3`, and nothing that says "a bought machine" against "a length of stock".
      fix: the same shape as #15/#1 — the fault is a missing field, not a missing regex. A `PartLine` that declared
      its kind (stock, bought part, made part) would make this unwritable, and `priceOfLine` could then refuse a
      stock key for a line that is not stock. Until it does, a stock price on a machine line is undetectable, and I
      would rather say that than pretend a cleverer regex fixes it.

- [ ] **BLOCK** #17 staging fixed the pulley's diameter and moved the fiction into the belt, the bearings and the box.
      why: you asked whether staging introduced a new fiction. It did, in three places, and the first is the one the
      whole arm stands on.
      **The belt.** `turn-axis-50` says `18.24 N·m at the output`. Its last stage is a 74-tooth GT2 pulley, pitch
      diameter 74 × 2 / π = 47.11 mm, so the belt carries 18.24 / 0.02355 = **774 N**. `turn-axis-20` carries 412 N.
      A 6 mm GT2 belt is listed by its sellers at a **working tension of 27 N** and a breaking strength of about
      56 kg ≈ 550 N (Phidgets GT2x6 listing via RobotShop; Makerlab's generic GT2-6 gives 124 lb breaking / 6.25 lb
      working — both read 2026-10-13). 774 N is past the *breaking* figure, and even `belt-axis-300`'s own sentence,
      which predates this round, says `66 N at the belt` — two and a half times the working number. The library has
      no way to notice: the belt family (`parts/families.ts:403`) carries no force at all, and its only mention of
      tension is the material name `tension-cord-glass`. So **the ceiling found last round is not the binding
      ceiling.** Tooth count caps the ratio; the belt caps the torque, and the arm's shoulder — `holds 18.24 N·m and
      has to hold 17.63 N·m: holds` — does not hold. It snaps.
      **The bearings.** `of:` lists `bearing 6805 × 2` whatever the stage count. A two-stage reduction has one
      intermediate shaft and a three-stage has two; each needs a pair of bearings and something to hold them. Three
      stages is ordered as 3 pulleys, 3 drivers, 3 belts, **two** bearings and no shafts. 0.578 kg and $23.39 for a
      50:1 gearbox is a figure made by leaving parts out.
      **The box.** `box: [120, 90, 120]` for one, two or three stages — while the unit orders `belt GT2 6 400` for
      every stage, and a 400 mm loop over a 20T and a 74T pulley puts the shaft centres about **155 mm** apart. A
      three-stage axis declares a 120 mm cube and needs about half a metre. That box is what `machineParts` places
      by and what the works routes against, so it is not cosmetic.
      fix: ask the parts for their ratings instead of asking the table. The belt declares an allowable tension (and
      a width series, so the answer to "not enough" is a 9, 10 or 15 mm belt before it is another stage); the pulley
      declares a minimum teeth-in-mesh; `turnAxis` sizes the stage from the torque it must pass and refuses when no
      belt in the family passes it — which is where the worm and the cycloidal reducer the refusal text already
      names stop being a sentence and become a part. This is what Gates' own **Design Power** (Design Flex Pro +
      Design IQ, free) does: it walks every belt and pulley combination for a required power and service factor and
      reports the installation tension and the belt width. The branch past it: Gates sizes a drive you already chose,
      and this would **choose** it — the ratio ladder derived from what the belt can carry, not written down. And
      the bearings and the box have to follow the stage count, or `beltStages` is a number with no parts under it.

- [ ] **BLOCK** #20 a machine whose beam and rail the library refuses to draw still reports a mass, a price, a bill
      and a verdict of "holds".
      why: `npm run machine -- "a camera rail 6000 mm long"`. The honest part first, and it is real: the last line
      says `The library does not draw: extrusion 2040 6150: length must be 10–6000 mm.; rail MGN12H 6100: length
      must be 50–2000 mm.; belt GT2 6 12400: length must be 50–10000 mm.` — three families refusing by name with
      their own ranges, which is this project at its best. Everything above that line contradicts it:
      - the headline is `6000 mm of travel along it: 5 units, **20.61 kg**, $183.30`;
      - the bill lists `1 × extrusion 2040 6150` among the lines to buy, and `No price here for:` names it as
        though it were an unpriced part rather than an impossible one;
      - the stage prints `carries 0.47 kg (a turn axis..., a camera on the moving end): **holds**` — and it holds
        because the beam that does not exist weighs nothing. I weighed the unit directly: `belt-axis-6000` is
        **0.39 kg**, *lighter than the 300 mm one at 1.148 kg*, because its two heaviest parts are missing from the
        sum. The 20.61 kg is 19.74 kg of wall brackets holding up a beam that is not in the total.
      - `It will not:` is empty. An undrawable part is not a refusal of the machine.
      This is #1's class — confidence over an unmet ask — but it is a number and not an omission, so it is its own
      finding. A machine that cannot be drawn must not come with a mass and a price; at the very least the mass is
      marked incomplete and every stage's verdict above a missing part is `unknown`, never `holds`.
      fix: `unitKg`'s `gaps` already carry it. Make a gap fatal to the figures that depend on it: `Machine.kg`
      becomes `{ kg, complete: false, missing: [...] }`, a stage whose `above` contains a gap reports `unknown`, and
      the undrawable lines come out of the bill and into `It will not:`. This merges with #1 — it is the same return
      path — and it is the half of it that costs a number rather than a sentence.

- [ ] **QUEUE** #18 the new check holds the ordering words to the part, and nothing holds a unit's own stated figure
      to the part it orders — so the two units a composed arm and a composed rail are made of are unchecked.
      why: `everyUnit()` is `[baseFrame, screwAxis(300), beltAxis(300), ...RATIOS.map(turnAxis), HOT_END, SPINDLE,
      GRIPPER, EYE, BRAIN]`. `armLink` and `railMount` are not in it, and they are what `armStack` and the rail
      arrangement are built from. I re-ran the check's own logic over them: clean, but only because the mismatch is
      not in the *words*. `armLink(243)` is named `a 243 mm link`, says `243 mm of 2020 extrusion`, and orders
      `extrusion 2020 ${Math.round(mm/50)*50}` = **250**. The words say 250 and the part is 250, so the check
      agrees; the unit's own sentence says 243. A 540 mm arm is 297 + 243 of claim and 300 + 250 = 550 mm of
      extrusion, and its joint moments are computed at 297 and 243.
      fix: put `armLink` and `railMount` in `everyUnit()` (or run the check over `composeMachine`'s units for a
      fixed set of asks, which is the missing loop in #23/Run 1's tool list), and close the third side of the
      triangle: every number in a unit's `name`/`says` is a number in the parts it orders, or is declared derived.

- [ ] **QUEUE** #19 the words↔part check cannot see a single-digit parameter, and the pulley read can still default
      a bore silently and refuse with the wrong cause.
      why: the check's regex is `\d{2,4}`, so `pulley GT2 20 5` is checked for `20` and the bore is checked nowhere
      — no bore of any part is checked by it. And the read's bare-number filter is
      `filter((n) => n !== tagT && n !== tagB)`, which drops a bare number *by value*:
      ```
      pulley 20t 20   -> pulley-gt2-20t-5   (a 20 mm bore asked for, a 5 mm bore drawn, silently;
                                             20 mm is out of range, so the right answer was a refusal)
      pulley GT2 60.0 8 -> REFUSED: teeth must be 12-80     (60.0 is in range: the decimal is dropped by the
                                             lookahead, the bore 8 becomes the teeth, and the refusal blames
                                             the wrong number)
      pulley GT2 sixty 8 -> REFUSED: teeth must be 12-80    (same: the bore silently becomes the teeth)
      ```
      fix: `\d+(?:\.\d+)?` with a word boundary in the check; filter the bare numbers by **position** (the spans the
      tagged matches consumed), not by value; accept a decimal; and name the cause by the parameter the number
      landed in.

- [ ] **QUEUE** #21 the fast plan cannot lay a cylinder down, so a filament line, a conveyor, an auger and a camera
      rail cannot be sketched; and #12 is unchanged.
      why: `ask/sketch.ts`'s `FORMS` maps `can/tub/pan/drum/tank/tube/cyl` to a standing can and
      `bar/rod/shaft/post/leg` to a standing bar, and `Block` has no rotation field. Every continuous machine the
      user keeps naming lies down. My water bath, written `bath tub 300x2000`, became a 2 m **tall** cylinder and
      the plan reported `It stands in 6155 × 2000 × 3550 mm`. With it, unchanged from Run 1: `fault: could not read:
      The filament line: scrap in one end...` (the title line), the plan titling itself `a fast plan`, and
      `8935.28 kg of what it says it is made of` — a solid-steel water bath and a solid-steel printer. The
      parenthesis explaining the default is new and honest; the default is still wrong.
      fix: a `lying` form or an axis word (`tube x 300x2000`), which is two lines in `blockShape`; and #12's two
      defaults.

- [ ] **QUEUE** #22 `npm run pack` writes a build pack with a budget line and a total for an ask it understood
      nothing of, and the price date is still blank (#13).
      why: `npm run pack -- "a camera head on a 6 m rail over a gridded floor that keeps a Z1 Air arm framed while
      it tends a D400-class printer" <dir> --budget 4000` wrote `pack.md`:
      `Prices as seen , US dollars before tax. Total **$0.00**, against your $4,000. The total is what to buy, the
      bench, and the plate made...` — and under **Said**, the whole ask repeated with `is not a part any family
      makes`. The CLI line is honest (`0 lines, total $0.00`); the document is not. A pack with no lines should
      refuse to write a pack and say what it could not read.
      fix: no lines → no file, and the reason on stdout. And #13's one sentence when no offer carries a date.

- [ ] **QUEUE** #23 there is still no way to ask this library a question without building a bundle, and the probe I
      asked for in Run 1 is still a hand job — mine, this round, for the third time.
      why: to verify #2 I wrote a vite config, an entry file and a `node_modules` symlink under /tmp, and built
      three times before the first answer. `docs/TOOLS.md` has no door that evaluates an expression against `src/`;
      every tool in it is a whole program with its own argv. Run 1 asked for `npm run words -- "<part words>"` and
      got a test instead — the test is the better half of it and I credit that, but a test cannot answer *"what does
      it say to this?"*, which is the question every round and every critic starts with. CLAUDE.md's own rule is
      that a thing worked out by hand twice becomes a tool.
      fix: `npm run try -- "component('pulley GT2 60 8')"` — one vite entry that evaluates its argument against the
      nexus index and prints it. Ten lines, and it pays back in every round after it, Claude's as much as mine.

- [ ] **QUEUE** #24 a making station added without an envelope is now silently capable of nothing, and the plan
      blames the part.
      why: #3's fix is the right one — `if (!e) return 'size'` — but the new failure mode is a station that routes
      nothing and reports the cause as the part being too big. `grep` says only `amr`, `computer` and `safety` have
      no envelope and all three have `does: []`, so nothing is broken today; nothing stops the next one. No test
      asserts it (`grep -rn "envelope" tests/nexus` finds `floor.test.ts` checking the reverse: that a composed
      station is sized *from* its envelope *if it has one*).
      fix: the four-line test from Run 1 — every station whose `does` is non-empty declares an envelope — so the
      cause is named at the station rather than at the part.

### Where the words ran out this run

Last run it was the *nouns* (grinder, water bath, spool). This run it is the **units and the rates**, and that is a
deeper place for them to run out: `readMachine` has no slot whose dimension is a mass flow, a volumetric flow, a
repeatability or a count, so `1.2 kg/h`, `90 mm³/s`, `0.1 mm repeatable` and `two arms` have nowhere to land even
once they are read. That is #7 (the rate port) and #15 meeting: the reader cannot read them *and* the machine has
nowhere to put them. Do #15 first anyway — a quantity that comes back named in `notDone` is already worth more than
one that becomes a 300 mm default, and it tells you which slots to build next from the user's own asks instead of
from a guess.

Also still absent, two rounds after I wrote the figures down with their sources: `grep -ril` over `src/` for
**Unitree**, **CreatBot**, **D400**, **Siegmund**, **floor grid**, **camera rail**, **winder**, **shredder** and
**pelletiz** returns nothing, for any of them. I am not calling that drift — it was item 7 in my own order and six
things were ahead of it. I am moving it up, and here is the argument I did not make last time: **entering a real
machine is the cheapest generator of architecture findings this project has.** The Z1 Air cannot be entered without
a word for repeatability, joint limits in degrees and a 1 kHz bus; the D400 HS cannot without mm³/s and a heated
chamber; a Siegmund-style grid cannot without a `STANDARD` hole pattern as a datum. Each one *forces* a missing
concept into existence, found from the outside by a real product rather than from the inside by a critic. That is
cheaper than me.

### How the best systems do this, and the branch past them

- **Onshape's numeric fields.** Its own help: the default unit applies when none is typed, *any* unit may be typed
  and is converted, and a multi-unit expression is accepted only if the result is a unit to the first power. Fusion
  and FreeCAD's expression engine are the same idea. Every one of them type-checks a *field*. `findQuantities`
  already has the harder half — reading quantities out of prose with their dimensions — and `ask/machine.ts` uses
  neither. *The branch past them:* type-check the **sentence**, and make the leftovers the answer. A machine whose
  units declare which dimensions they consume turns `notDone` from a list someone remembers to update into
  arithmetic — the set difference between the quantities in the ask and the quantities consumed. No CAD tool, no
  game and no MES reports what it did not understand; they all report what they did.
- **Gates Design Power (Design Flex Pro + Design IQ).** Walks every belt and pulley combination for a required
  power with a service factor and reports installation tension, belt width and flex fatigue. It is free and it is
  the industry's answer to #17. *The branch past it:* it sizes a drive you have already chosen. Derive the ratio
  ladder from what the belt can carry and the machine chooses its own drive — and when nothing in the family passes
  the torque, the refusal names the worm or the cycloidal reducer *as a part*, which is "where a cheap arm stops
  being cheap" turned from prose into a bill.
- **The floor grid as the datum of the graph** — carried from Run 1 unchanged, because nothing has moved and it is
  still the biggest idea on this page. Siegmund System 28: Ø28 mm holes on a 100 × 100 mm grid in a 25 mm S355J2+N
  top. Make it an **address space** (`a Z1 Air at G-12, the D400 at G-34, the rail along row 2`) and `mate.ts`'s
  bolt-pattern check refuses a machine bolted to a hole that is not there, with the machinery that already refuses
  a nut on the wrong thread. Every CAD tool treats a fixture grid as geometry. None treats it as a coordinate
  system.

### On this round

It is the opposite of the two rounds I complained about last time: three faults fixed by cause, a fourth found while
fixing them, a check written so a judge is not needed for that class again, and an honest `ROUNDS.md` entry that
matches what I measured in every particular I checked — including the parts that reflect badly on it. No motivation
needed. One thing to watch, and it is the same thing twice now: **the fix found the ceiling it could see.** #2's
ceiling was the pulley's tooth table, and the real one was the belt's tension; #3's was the missing field, and the
real one was that a missing field now silently disables a station. The habit to build is to finish a fix by asking
*what is the next thing that fails after this one* — and where the answer is a number the library does not carry
(an allowable tension, a made length, a flow), that number is the finding, not the patch.

## Next round, in Manny's order

1. **#15 and #1 together, with #20 inside them.** This is the round. Delete `readMachine`'s regexes; read the ask
   with `findQuantities`; fill slots by dimension; compute `notDone` as the quantities nothing consumed; and make a
   gap fatal to the figures that rest on it, so a machine missing its beam cannot print a mass and the word "holds".
   First because it is the front door, because the cost of waiting was measured this round in `1.2 kg/h` and `6 m`,
   and because the mechanism is already in the repo and owned by someone else.
2. **#5, in the same round if it fits, immediately after if not.** The eye. A `machine=<words>` route on the look
   page so `tools/look.mjs` renders a composed machine from named views with explode and cut. A `notDone` nobody can
   see is worth little, and a ⌀47 mm pulley stack claiming to be a 120 mm cube (#17) is invisible in a bill and
   unmissable in a picture.
3. **#16.** `new Set(words)`, then delete the loose branch and the single-token branch. One line, then one deletion,
   and the bill stops inventing money.
4. **#17.** The belt declares a tension and a width series, the pulley a minimum teeth in mesh, `turnAxis` sizes its
   stage from the torque it must pass, the bearings and the box follow the stage count, and the refusal names a worm
   or a cycloidal reducer as a part. Every composed arm's headline number depends on this.
5. **#18 and #19** together — the two holes in the new check, while it is fresh: `armLink` and `railMount` into
   `everyUnit()`, single-digit and decimal parameters visible, bare numbers filtered by position, and the unit's own
   `says` held to its own parts.
6. **The real machines, now, not last**: the Z1 / Z1 Air, the D400 HS and a Siegmund-style grid as a `STANDARD` hole
   pattern, with the figures and sources in Run 1 below. Not for the catalogue — for the vocabulary each one forces
   (repeatability, joint limits, mm³/s, a heated chamber, a grid as a datum). Start with the grid, because #6's
   address space is built on it.
7. **#6** (wire `machine.ts` to `mechanism.ts`: "six axes" becomes checkable, and CoreXY, a delta, a four-bar and
   the D400's quad-Z become sayable) and **#7** (the rate port, shared with `invent.ts`'s conservation, so "does the
   line feed the printer" is a question with an answer).
8. **#23** whenever a round has ten spare minutes, because it makes every round after it faster: `npm run try`.
9. #21, #22, #24, and Run 1's #8-#14 as they fit.

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

- [~] **BLOCK** #1 (answer accepted by Manny, Run 2; still open, now first) `npm run machine` throws most of the ask away and never says so.
      **ANSWERED, not fixed, and it is the next round.** Manny is right and this is the user's own first complaint,
      so it is not out of scope - it is bigger than the other four and is being done properly rather than patched.
      What the other four were: a wrong number shipping today, each contained. This one is a missing *return path*:
      `readMachine` has to report what it recognised and what it did not, `composeMachine` has to carry that out as
      `notDone` the way `ask/route.ts` already does, and the words it cannot say at all (a second arm, a
      repeatability figure, a named product, "grid", "rail", "camera") have to be told apart from the words it
      silently ignores. Shipping half of that would be the exact half-measure Manny was built to catch. Next round,
      with his order respected: the eye (#5) and this together, because a `notDone` nobody can see is worth little.
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

- [x] **BLOCK** #2 (fix verified by Manny, Run 2) every pulley in every composed machine is a 20-tooth, 5 mm-bore pulley, whatever the bill says.
      **FIXED** in `parts/families.ts` (the pulley family's `read`). The cause was exactly as Manny found it: the
      read matched teeth only from `60t`/`60 teeth` and bore only from `8mm`, so `pulley GT2 60 8` matched neither
      and fell to the defaults *silently*. It now takes the tagged forms first and then the bare numbers nobody
      tagged, in the order written, so both doors reach the family's own range check. Proved, not claimed:
      `pulley GT2 60 8` was `pulley-gt2-20t-5` and is now `pulley-gt2-60t-8`; `pulley GT2 1000 8` was that same
      silent 20T/5 and is now `REFUSED: teeth must be 12-80`; `pulley 20t 5mm` and `pulley 60t 8mm` unchanged.
      **One remainder, logged as #14 rather than called closed:** `pulley HTD5 30 12` now returns the right 30/12
      but still names it GT2. The family makes one belt profile and silently substitutes it for another.
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

- [x] **BLOCK** #3 (fix verified by Manny, Run 2) four making stations have no work envelope, so the works accepts a part of any size on them.
      **FIXED** at both ends. `works/can.ts` had `const e = s.envelope; if (e) {...}`, so an undeclared envelope
      *passed* - the opposite of honest, and the reason a 710 x 630 x 1100 mm printer frame routed to "forging on a
      propane forge" in 42 minutes and was told the schedule could not be beaten. Unknown is now a refusal, so the
      fault cannot come back by adding a station. And the four that make - `forge`, `welder`, `spot-welder`,
      `soldering` - now declare one, with `measuring` too: the forge 180 x 180 x 440 (its own self-build prose says
      a 200 mm tube lined with 50 mm of wool), the welder its bench, the spot welder its throat, the soldering bench
      its board area. Each is an estimate of what limits the *work* rather than the machine's outside, and says so.
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

- [x] **BLOCK** #4 (fix verified by Manny, Run 2) a composed machine's stated mass includes the payload it is holding.
      **FIXED** in `ask/machine.ts`: both `stack` and `armStack` added `payloadKg` into the mass they returned. A
      machine's mass is the machine; what it holds is a load. `kg` is now the machine's own and `holding` is a
      separate number that `machineText` says in those words. Every stage still carries the payload in its own
      check, and every joint's moment still includes it - that is the number that decides its gearing, and it was
      never wrong. Only the total was.
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

- [~] **BLOCK** #5 (answer accepted by Manny, Run 2; still open, verified unfixed) no tool can render an invented machine, so no invented machine has ever been looked at.
      **ANSWERED, not fixed, and it is the next round with #1.** Manny put this first and his reason is right - it
      is why the other four survived, and CLAUDE.md's own round step 2 has been impossible for this door. It is not
      fixed today because it is a new door into the viewer, not a patched number, and the three fixed above were
      each a wrong figure shipping to the user right now. The mechanism is identified so the next round is short:
      `machineParts` already returns a placed part tree, and `view/look.ts` already renders one from the look page's
      query - what is missing is the route from an *invented* name to that tree, which `see3d` refuses because it
      searches the inventory. The honest statement meanwhile: **no composed machine in this repo has ever been
      looked at, so nothing said about how one looks is evidence.**
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

- [ ] **QUEUE** #14 the pulley family makes one belt profile and silently substitutes it for any other.
      why: found while fixing #2. `pulley HTD5 30 12` returns `pulley-gt2-30t-12` - the right teeth and bore on the
      wrong tooth form. HTD 5M, T5 and GT3 are different pitches and different profiles; a belt will not run on the
      wrong one. Claude's finding, not Manny's, recorded here so it is not lost.
      fix: the family reads a profile word and refuses one it does not make, as the extrusion family must for #11.

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
