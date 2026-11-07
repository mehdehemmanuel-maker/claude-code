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
