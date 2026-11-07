# The fix plan by roots (decision 0029)

Written 2026-11-06 from the faults the rough pass's builders met and listed without fixing (37 of them, in
`docs/REALITY.md`'s entry for the round), and from what the evaluations of decisions 0027 and 0028 showed. Each fault is
filed under the rule it comes from, so one fix mends every outcome of that rule. Nothing here is fixed yet: the user
reviews this plan first. Effort figures are guesses, not measurements.

## How to read it

Each root says: the rule that is wrong today, the faults it caused (numbered as the builders listed them, with the
builder's key), the one change that mends it, and what to run afterwards to see it mended. The roots are in the order
they should be fixed: the first ones are under the others.

## Root 1. The operations place and test pieces by their bounding boxes, not their solids

**The rule today.** `stack`, `onto`, `over`, `ring` and `through` in `src/nexus/room.ts` decide where a block rests,
whether two pieces meet, how much free room a line has and whether a ring's copies fit, all from each piece's
axis-aligned bound (`boundOf`, `primBox`, `reach`), never from its solid. A turned, round or slanted piece fills far
more of its bound than its body does.

**Faults it caused** (12, one found at the merge: the oleo strut's rod and tube, stacked end to end, write no face since the pair-by-pair rest; `parts/machine.ts` piece.gearstrut): a tilted roof floating above its wall (ops 1); a V block or a stepped axle resting on its
box (ops 3); a boss refused inside a ring of spokes, a rim refused over them (vehicle 27); three or more radial blades
refused in a ring though they meet nowhere (machine 28); a hub refused through a three-copy ring's axis (machine 29);
two long skids or tracks refused in a ring of two (asm-vehicles 33); a wheel refused between a fork's legs drawn as a
shell (asm-vehicles 34); two rows of studs refused as a ring (home 22); six of sixteen vehicle assemblies left in several
groups though every piece touches (asm-vehicles 36, in part); and, from the evaluations, the compound builds left in
two or three groups (the robot arm beside the conveyor, the tank on the trailer: decision 0028's entry).

**The change.** One routine, `firstContact(mover, host, axis)`: the mover's solid lowered along the axis until its
surface first touches the host's (sampled on the solids' surfaces with the `inPiece` test that exists, at any angle),
giving both the resting place and the patch touched. `stack` and `onto` rest by it; `over`, `through` and `ring` test
"would meet" by it; `ring`'s room is each copy's sweep in its own wedge, not a disc; a shell's cavity is open to it.
`seatOn` (ops rule 7) and the tilted-edge special case become cases of it and go.

**Afterwards.** `npx vitest run tests/nexus/domains.test.ts -t "rests on its first contact|things as blocks|vehicle"`;
the compound set once (`npm run eval:compose`): the "falls in N groups" failures should be the ones left.

**Effort.** A guess: two days of one builder. It is the biggest change and everything below reads simpler once it is in.

## Root 2. Faces are found on a grid of the bounds' overlap, plus special cases

**The rule today.** `planeFaces`, `planePatch`, `linePatch` and `roundFace` sample a 64 × 64 grid over the overlap of
two bounds on an axis-aligned plane, with a special case each for a round piece lying along the plane, a round piece
standing on it and (new this round) a tilted box's edge. Any contact thinner than a cell, or not on an axis-aligned
plane, writes no face; and a face is what every later rule reads (groups, joints, motion).

**Faults** (4): a sphere's or dome's point and slivers write none (ops 2); the faces of a slanted member or a housed
copy are estimates (ops 4); a tyre on a tube end, a turned piece on a flat, box on box across z with `level` write none
(asm-vehicles 36); a sleeve flush with a shaft's tip makes an end touch every joint depends on the "gives way" rule to
ignore (motion 19).

**The change.** Faces come from root 1's `firstContact` patch, not from a grid on a plane: wherever two solids are
within the fit's gap of each other, that patch is the face, at any orientation. `over` may leave a shaft's end short of
a sleeve's face (`along` past the end, a thrust face) instead of flush.

**Afterwards.** The group checks in every assembly test; `motionOf` on the robot arm, the legs and the turbine.

**Effort.** With root 1 in, a day; alone, it cannot be done well.

## Root 3. A piece's cuts are not part of its geometry for the operations

**The rule today.** A bore or a hole is only seen where it is a round solid's own `ri` or a cup's cavity (`freeRound`);
a hole cut with `minus` (a section's hole polygon, a drilled plate) is invisible to `over`, `around` and a ring's axis
slot. And `partOfBlock` draws every cut the piece's whole height, so a flange's bolt holes are weighed through the hub.

**Faults** (3): a sprocket or spur gear "has no bore to slide on with", so no toothed piece goes on a shaft by the
operation meant for it (asm-vehicles 31); a plate used as a hub cannot be bored (ops 9); the drawn mass of a car wheel,
a brake disc, a ball joint and a hitch receiver far under the nominal (vehicle 26); and from the evaluations, "the hub
has no bore to slide on with" and "the 385 motor can has no bore" on the boat and the pump.

**The change.** `freeRound` and the axis slot read the solid with its cuts (the `inPiece` test already subtracts
`minus`; `freeRound` should sample it instead of reading `ri`); a cut is clipped to the solid it meets when drawn and
weighed.

**Afterwards.** The bicycle's chainring and sprocket drawn with teeth; the masses in `vehicle.ts` against their
nominal figures.

**Effort.** Half a day.

## Root 4. Motion is inferred from gap fits alone; nothing reads what holds a piece or what it stands on

**The rule today.** `motionOf` (`src/nexus/sim.ts`) reads every gap fit on a round line as a joint, joins touching
pieces into bodies, and roots a thing at "the lowest of the driven bodies". Nothing an operation knows about holding (a
key, a set screw, an interference fit, an air gap that is not a bearing, a mount plate) reaches it; `LiveMotion` keys
joints by their moving body; the two engine set-ups (`simulate`, `LiveMotion`) have their own settings.

**Faults** (9): a keyed hub still turns in Move (ops 8); a motor's air gap reads as a joint and its rotor both turns and
slides (motion 12); a quadruped roots at one foot with its body loose (motion 13); the linear axis's carriage, motor and
coupler read as one body and its screw as another (motion 10); a body with two joints keeps only the last (motion 15);
a held servo's spring scaled with the bodies' inertia and let the arm fall (motion 16); a let-go wrist spun up with no
torque, not understood (motion 17); default game-scale contact settings on millimetre parts (motion 21); the screw joint
is velocity-level only and drifts (motion 14: an engine limit, Jolt has no screw constraint).

**The change.** The operation that makes a joint writes it: `over` with a gap fit writes "turns" (and "slides" where the
ends are free), `key` and a set screw write "held", `through` with an interference fit writes "pressed", an air gap
named as one writes nothing, a mount plate's holes or `fixed` write the root. `motionOf` reads those records and only
falls back to inference where there are none. `LiveMotion` keyed by joint; one engine set-up shared by `simulate` and
`LiveMotion`; a servo's loop stiffness from its own figure (added to `SERVOS`, labelled typical where unknown); the
screw joint kept at the velocity level and said so.

**Afterwards.** `npx vitest run tests/nexus/domains.test.ts -t "movement"`; the arm, the legs, the linear axis, the
motor each with the joints a person would name.

**Effort.** A day and a half.

## Root 5. Things on a board cannot be addressed by index, and each operation names things its own way

**The rule today.** A wire into a many-input carries no index, so one source can hold one place in a stack's order;
`into` binds an assembly's input to inner settings but not to an inner block's input port; `align` and the ring's
axis take a port name but not the i-th line of a pattern; which of several pieces offering a line is meant is decided
inside each operation (`through` takes the lowest, the bolted joint the top); a node's settings are written by hand
and lag the operation's signature.

**Faults** (7): the same block twice in a stack needs a 0° turn (ops 5, 6); an assembly's input cannot set another
assembly's input (asm-vehicles 32); `room.onto` has no `at` though `onto` has had one since decision 0028 (motion 11);
one line of a pattern cannot be named, so every stud needs its own name (home 23); two rules for "which piece offers
the line" (ops 7); `offersOf` cannot be asked for only rooms or only lines (home 25).

**The change.** A wire into a many-input carries an index (`BoardEdge.order` extended, D32); `into` binds an inner
block's input port as well as a setting; a line is named with its index everywhere (`port[i]`, as `through` already
takes `which`) and `namedIn` resolves "which of several pieces" once, by one rule every operation shares (the lowest
along the line unless `which` says); the room nodes' settings generated from the operations' signatures.

**Afterwards.** The door with two butt hinges and no 0° turn; the gantry's `travel` bound by `into`.

**Effort.** A day.

## Root 6. A fit is one constant, whatever the size

**The rule today.** `gapOf('clear')` is 2 mm for every diameter (`room.ts`); a family's recipe holds one typical
clearance for every size (`parts/motion.ts`).

**Faults** (2): a Ø100 train axle and a Ø8 scooter axle get the same 2 mm, so every clear bore in `vehicles.ts` was
widened by hand (asm-vehicles 37); the MGN7C's skirt clearance scaled by hand (motion 18).

**The change.** `gapOf(fit, d)`: the ISO 286 clearances by diameter band that `families.ts` already holds for H7/m6,
extended to clear, slide and tight; families' clearances from their rows where the standard gives them.

**Afterwards.** The vehicle assemblies' bores back to the default fit.

**Effort.** Half a day.

## Root 7. The AI is told things the operations do not mean, and the scorer reads words

**The rule today.** The cards name a motor's `can` and `motor` outputs without saying which has the shaft; the change
checker refuses a change that rewires the Show node as "breaking what held"; the compound scorer reads a kind by words
on pieces, so a chair's legs named on the operation ("chair legs") are not found; the cached cards' line-a-trade tier
had no budget (fixed this round).

**Faults** (3 + the evaluations): "the motor can has no bore" is a plan naming the wrong output (motion 20); "NOT
TAKEN: it breaks what held (show)" on most loose-join calls in the compound runs; nine of the 25 harder requests scored
wrong on words while the thing was built (decision 0028's entry).

**The change.** Show is never "held"; a card says which output carries the shaft line; the scorer reads a kind from the
operations' names and the aisles as well as the pieces'; the cards' tiers finished as the ai-scale builder has them.

**Effort.** Half a day.

## Root 8. Small tooling roots

- `scripts/by-hand.mjs` counts any object key named `at`, so a data row keyed `at` is a false count (machine 30): count
  only objects handed to a room or a part. An hour.
- `Shape0`'s doc gives sizes but not the frame each solid is drawn in (home 24): one comment. Ten minutes.

## Order, and what is not in the plan

1. Root 1, then root 2 on top of it (the geometry: everything else reads faces).
2. Root 3 and root 6 (bores and fits: small, independent of each other).
3. Root 4 (motion reads what the operations wrote).
4. Root 5 (addressing), root 7 (the AI's words), root 8.

Not in the plan, said plainly: a boat hull, a car body or a helicopter will still be boxes and tubes after every root is
fixed; the operations make no sculpted surface. That is the engineering route's cost (decision 0029, route A).

## Faults met in wave 9 (2026-11-07: root 1 minimal, the loft, the robot assemblies, the contact sheet), filed under their roots

- (2) `/home/user/claude-code/.claude/worktrees/wf_e26377c5-c9c-2`: The worktree was cut from origin/main (1aef8ac) while every file the brief names (room.ts, brep.ts, things.ts, domains.test.ts, gate:field) lives only on claude/trusting-cray-mal3o9 (390e216, 352 commits ahead, 1aef8ac its merge-base). I fast-forwarded my bran **Root:** The harness made the worktree from origin/main, not from the branch the brief was computed against
- (2) `/home/user/claude-code/.claude/worktrees/wf_e26377c5-c9c-2/src/nexus/built.ts`: `npm run gate:field -- Mechanical` reports one line, `seed.hull: not dated (UPDATE_DOCS=quick)`, and the stock-law test (`every piece built is in the built-parts library`) reports 6 pieces built and not stored (hull x5 across the builds, deck). Both are genera **Root:** Generated files I must not edit by hand; the docs pass runs once per push by the orchestrator, so these two lines stay red on this branch until it does
- (2) `/home/user/claude-code/.claude/worktrees/wf_e26377c5-c9c-2/src/nexus/room.ts`: The loft's inside test reads each station's section as its rectangle (|z| < w, lo < y < hi), while the drawing, the exact solid and the mass use the superellipse: a point near a rounded bilge is inside for the room but outside the drawn hull (a superset, exact **Root:** The brief specified the rectangle test, and a face on a flat needs a flat bottom: a superellipse section meets a plane in a line, so planePatch's sampled area would be zero and a loft on a plate would write no face
- (2) `/home/user/claude-code/.claude/worktrees/wf_e26377c5-c9c-2/src/nexus/assemblies/things.ts`: seed.hull's hull is weighed as a solid loft of al-5052 (the whole hull volume at aluminium's density, far over a real 3 mm skin's mass); said in its text **Root:** No hollow loft exists (form.ts's Loft has no wall, the room's Prim no loft with a cavity); a skin as a second inner loft taken out would need Through-like subtraction the operations do not offer for lofts
- (2) `/home/user/claude-code/.claude/worktrees/wf_e26377c5-c9c-2/src/nexus/sim.ts`: A loft is a box body in Jolt (its bound), so a lofted hull collides and rests as its box in the physics **Root:** The body-shape mapping has no convex hull for a loft; the one-line change was forced by the type check once Prim gained the kind, and the brief did not ask for physics
- (3) `vr-sandbox (worktree base)`: The worktree started on an old main commit with no src/nexus/assemblies/, so I reset it to 390e216, the base the other builders use. **Root:** The worktree was created from main, not from the decision 0029 branch base.
- (3) `src/nexus/seeds.ts`: The brief said to add the import after './assemblies/home', but that line does not exist here, so I added it after './assemblies/vehicles'. It may need a merge fix if another builder adds the home import. **Root:** The home assembly lives on a different branch from this one.
- (3) `src/nexus/assemblies/robots2.ts`: scara's link 1 had to be a bored hub with a bar on it, because room.over refuses a box sleeve that has no bore (the box version failed). **Root:** room.over needs a round bored sleeve, so a link that turns on a column takes a hub tube plus a bar.
- (3) `src/nexus/assemblies/robots2.ts`: The turntable post refused a platter bore of Ø10.4 and asked for Ø12, so I bored it at 12.4. The error text said a Ø10 shaft needs 12.00 mm. **Root:** The over operation's clearance on a Ø10 shaft is larger than the shaft plus a few tenths. I did not look at why.
- (3) `src/nexus/assemblies/robots2.ts`: The model rocket's fins (40 mm tangential) were refused in a ring of R=20, so I made the ring R=26. The fins now float about 12 mm out from the Ø25 body tube. **Root:** Ring spacing is taken from the copy's tangential width, and I did not work out which box side of a fin is the radial one.
- (4) `src/nexus/agent.ts`: The file does not exist, and neither do composeMenu, namedCards or findLines. A grep of src and tests finds none of them. No branch the worktree could see had them either (I did not finish checking all branches). **Root:** The task text assumes code that is not at this commit (1aef8ac). The brief may have been written for a different tree or an unmerged branch.
- (4) `src/nexus/view/parts.ts`: The file is a 57-line mesh drawer (materialOf and meshOfPart). It has no parts browser, no aisles, no assemblies and no tap-to-place. **Root:** The task describes a different file from the one at this path.
- (4) `tests/nexus/domains.test.ts`: The file does not exist, so the anchor 'a thing of several things: split, each part made' and the test 'the three ways to build' cannot be found. The 'Field: Software' gate cannot be run against them. **Root:** The tests the brief names are missing from this checkout, or the brief was written against a different tree.
- (4) `CLAUDE.md`: It has no owner row for agent.ts, and I found no decision 0029 or seed.* assemblies in the repo. The brief's 60+ assemblies and 556 families have no counterpart I could find. **Root:** The repository state does not match the brief's premise. To avoid inventing the whole agent layer, I stopped and wrote nothing. A node_modules symlink was needed only for the check, so I did not commit it.
- (5) `scripts/sheet.cjs`: Seven of 60 seeds show no picture: three report 'it made no block (ok)' and four are 'waiting on' inputs they were not given. **Root:** A lone-node board gives them nothing to hold or stand on; they need a starter board that feeds them. starters.ts uses seed.motor-dc, seed.boxed and others inside fuller boards.
- (5) `scripts/sheet.cjs`: The path to the scratchpad temp directory is hard-coded as the default (SHEET_TMP overrides it). **Root:** The brief named that directory; the script has no other place to build the viewer.
- (1) `src/nexus/room.ts`: solidsMeet (Over's would-meet) reads a column's material as one span from lowest to highest, so a tube lying across the line counts as full between its walls, and a feature thinner than a column that lies between columns (a diagonal spoke's tip 1 mm into a rim **Root:** inPiece is a point test; no prim gives its material intervals along a column. The proper form is an analytic interval per prim down a column (box, cylinder across, sphere, lathe), then exact span overlap.
- (1) `src/nexus/room.ts`: firstContact is sampled: a contact at a point not on any piece's middle or edge column (a box tilted about two axes resting on one corner, a sphere on a sphere) rests within a few microns of exact after refinement and is not snapped, so planeFaces' 1e-9 checks **Root:** A height-field cast on a point test; exactness comes only from columns that happen to pass through the extreme point. Same remedy as above, or a per-prim lowest-point-in-footprint routine.
- (1) `src/nexus/room.ts`: thinnest(prim) decides the column sample spacing; for a prim whose material down a column is thinner than it reports (a lathe outline with a thin lip between non-consecutive points, a sect outline's thin web between non-consecutive points) the material can sti **Root:** The thinnest step is read from consecutive outline points only; the general answer is intervals per column, not a sampling density.
- (1) `src/nexus/room.ts`: Through's cut selection, Ring, Between, Along, Key, Mesh, Rack, Belt and Branch still test 'would meet' and 'what is cut' by boundOf/primBox (lines 889, 987, 1013, 1044, 1057, 1164 and the ring), so the FIX-PLAN root 1 faults vehicle 27 (a boss inside a ring o **Root:** Bounds as supersets of solids (root 1 as the plan states it); only Stack/Onto's rest and Over's would-meet were moved to the solids in this wave.
- (merge, wave 9) `parts/fixings.ts` (eye nut, turnbuckle, rope clip): root 1's rest put the eye ring into the boss's bore edge, the eye bolts into the turnbuckle's bosses and the U-bolt legs down the saddle's holes, so each is shorter than its row's stacked height (M6 turnbuckle 147 mm, the row 184); the three bound checks are dropped, not retuned. **Root:** the rows' heights were derived for the stacked model; the physical overall length (shank engagement, ring seating) is not derived anywhere yet. Derive it with root 1's completion.
