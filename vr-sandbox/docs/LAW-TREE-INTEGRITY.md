# Law-tree integrity audit (batch 3)

The incident: a walker stood on the beach on "servo" joints between printed bars, with no servo part, no battery, no
controller; the solver made its commands from the world's clock; the renderer drew a servo case at every such joint;
its rubber feet were placed 6 mm inside its shanks; its name said "dog". Every layer below the law tree could
represent what the tree forbade, and the tree only found out afterwards, through the watchdog. A blind instance, told
nothing, called it "a DIY robot chassis", "not a working machine, 97%".

This audit re-opens the tree from first principles at the capability level: for every law, what state it forbids,
which constructor made that state representable, where it was enforced, and the earliest point at which the state is
now impossible. The architecture that follows is a chain of hard gates:

    TEMPLATE → GANGLIA AUTHORISATION → CONSTRUCTION → PHYSICAL BODY → CONNECTIONS → POWER → CONTROL → PHYSICS → RENDER

and its central invariant: **if the law tree says an entity cannot exist, there is no API, representation,
constructor, solver primitive, renderer primitive or cached state through which it can exist.** Invalidity is a
representation failure, not a late validation event. What is refused is not an object with a defect; it is a failed
construction, and nothing of it enters anywhere.

## A. Original illegal capabilities

| capability | how it existed |
|---|---|
| torque with no actuator body | the `servo` connector joined any two parts and gave the joint a stall torque, speed and rotor from its own parameters |
| torque with no power | no battery was wired to a servo joint; its work was booked as a source (`work.servos`) with no store (D-servo-source) |
| commands from nowhere | `driveJoints` computed `sin(2π·rhythm·this.time + phase)` from the joint's parameters: the solver manufactured commands from world time, with no controller, no latency |
| renderer geometry with no body | `view.ts` drew a servo case box and pin at every `servo` and `motor` joint |
| geometric overlap | nothing judged placement: a part could stand inside another; the walker's feet were 6 mm into its shanks, bonded there |
| a label as identity | the plan's `name` ("a dog-shaped walker") was the only thing that said what the machine was |
| declared defects as objects | a joint the connector refused (`instantFailure`) was created in the world with status `broken` and a warning |
| parameters silently replaced | `sanitizeParams` coerced an unknown or out-of-range value to a default: a wrong template became a right one unchecked |

## B. The layer where the firewall was bypassed, per law

| law | forbidden state | constructor that represented it | where it was enforced | bypassed below? | physics executed it? | render showed it? | cached state survived? | tests could make it? | a name could change legality? | earliest point it is now impossible |
|---|---|---|---|---|---|---|---|---|---|---|
| F-2.2 finite sources | work from no store | `servo` connector + `driveJoints` | the ledger declared it (a source term) | yes: the connector | yes | yes (case drawn) | yes (saved builds) | yes (`r.connect('servo', bar, bar)`) | no | the connector's `derive` refuses a horn not on a servo part (K-9); the document's gate (`DocStore#applyOne`); the world's intake (`upsertConnection`) |
| F-2.3.1 the servo is a motor, a gear, a controller | a servo with no current, no pack, commands from the clock | same | partly (loop, rotor); current and commands not at all | yes | yes | yes | yes | yes | no | a servo part exists only from its datasheet (`getServo` throws on an unpublished model, K-2); power only by a wire from a battery (C-12); commands only from a board down a lead (C-13) |
| F-6 causal information | a command with no sender | `driveJoints` from `this.time` | nowhere | yes | yes | — | yes | yes | no | `runBoards` is the only writer of commands, after the tick's physics, stamped for the next tick; `commandValid` drops any other (C-13) |
| F-6.3 (R-9) the ledger | a servo's work booked as a source | `WorkBook.servos` | declared | yes | yes | — | — | — | no | the field is gone; a servo's work is paid by the pack it is wired to (`settleDrives`) |
| M-4 impenetrable solids | two parts in one space | `addPart`, `upsertPart` | nowhere (contacts only) | yes | yes (bonded) | yes | yes | yes | no | the document's gate at the transaction's close (K-5), the world's `construct` intake |
| A-5 realisability | a joint across a gap, on nothing, on a bought part that forbids it | `upsertConnection` made a `broken` joint with a note | after the fact | yes | yes (a broken joint is a record) | yes | yes | yes | no | the gate refuses (K-6, K-7, K-8); nothing is created |
| ML-4 admissibility | an unknown kind, a parameter the template does not offer | `sanitizeParams` defaulted it | nowhere | yes | yes | yes | yes | yes | no | `paramProblems` in `makePart`/`makeConnection` and the gate (K-1, K-2) |
| O-2 presentation derived | drawn hardware with no body | `view.ts` switch | nowhere | — | — | yes | — | — | no | `hardwareOf` declares a joint's hardware per template; the renderer draws that and nothing else |

The ten questions, answered for the servo as the worst case: (1) it prohibited torque from nothing; (2) the connector
and the solver made it representable; (3) the ledger alone enforced it, as a declaration; (4) every lower layer
bypassed it; (5) physics executed it; (6) rendering displayed a case that physics did not contain; (7) saved builds
and the world's connection records survived; (8) tests instantiated it directly (the chain test, the momentum chains,
the rules servo tests); (9) a plan's name was its identity; (10) the earliest point is now the sentence: in the
constructor's language a horn is a method on a servo handle (L-1), and beneath it the gate refuses the data form (K-9).

## C. Why the old tree failed to prevent representation

The tree was a registry of laws with realisations and tests: it could say which code carried a law and which test
held it, and it could find a violation afterwards (the watchdog, the ledger, the frontier). It had no node for *what
may exist*. Construction was unconstrained (`CREATE → CHECK → REJECT`, with the check mostly absent), so the physics
received whatever the document held and the document held whatever any caller wrote. A law enforced only by
observation is a law that lets the forbidden state exist first.

## D. APIs and constructors removed or restricted

- `servo` connector: no `maxTorque`, `range`, `speed`, `band`, `rotor`, `rhythm`, `phase`, `wave`, `channel`, `pin`;
  only `offset`. It refuses any part A that is not a servo part, and any frame A not on that servo's shaft (±1 mm,
  about its axis). One horn per servo.
- `signal` connector (new): controller or receiver (A) to servo (B), one per servo; a program lead carries no stick,
  a receiver lead carries one.
- `wire` connector: one battery end, one load end (motor, servo, controller, receiver); one supply per load.
- `driveJoints`: no command is computed here; a servo with no valid command, no pack, or a flat pack is a free hinge.
- `WorkBook.servos`: removed.
- `sanitizeParams` as the constructor's gate: replaced by `paramProblems` (refuse) in `makePart`/`makeConnection`.
- `upsertConnection`'s `broken`-with-a-note path for gaps, bought parts and connector refusals: removed; the gate
  refuses and nothing is created.
- `view.ts`'s hardware switch, with its servo case, motor case, and default marker sphere: replaced by `hardwareOf`.
- `getServo`: no fallback to a default model.
- `DocStore`: the constructor, `replace`, `restore` judge the whole document; `applyOne` judges every create and every
  constructive update; `transact` judges overlaps when it closes and rolls back whole on refusal.
- `PhysicsWorld#apply`: `upsertPart` and `upsertConnection` return a refusal and create nothing; `construct` takes a
  construction whole.
- Builders: `buildWalker` and `buildSwimmer` are sentences in the constructor's language inside one transaction; a
  refusal leaves nothing. The kart template's steering is a servo part on a kingpin bearing with its own pack and a
  receiver.

## E. New invariant enforcement points

| point | what it enforces |
|---|---|
| `src/construct/build.ts` (L-1) | the language: `Servo#horn`, `Pack#wire`, `Controller#lead_`, `Receiver#stick`, `Solid#fasten`; a horn on a bar or a lead from a bar is a type error, not a runtime one |
| `src/ganglia/tree/gate.ts` (K-1..K-11) | the kernel: `judgePart`, `judgeConnection`, `judgeDoc`; every refusal cites a node of the tree |
| `src/doc/store.ts` | the document admits nothing unjudged: creates, constructive updates, loads, and overlaps at a transaction's close |
| `src/doc/commands.ts` | `makePart`/`makeConnection` refuse values a template does not offer; `refuse` removes what the physics refused |
| `src/physics/world.ts` | `upsertPart`/`upsertConnection`/`construct` run the same gate against the world as it stands, live; `supplyOf`/`solveCircuits`/`settleDrives` make torque and current a pack's; `runBoards`/`commandValid` make commands a board's, one tick late |
| `src/render/hardware.ts` (O-2) | a joint's hardware is declared per template; the renderer draws that and nothing else |
| `src/app/app.ts`, `src/tools/tools.ts`, `src/assistant/ego.ts` | a refusal is shown as a failed construction and leaves the document |

## F. Adversarial tests added (`tests/conformance/firewall.test.ts`, 18)

torque with no battery; torque with a disconnected battery; a command from inside physics (a powered servo with no
lead); a zero-latency or forged command; a manually injected solver actuator; torque with no servo body (document and
physics); a joint attached to empty space (off its part; on a part that does not exist); fake actuator metadata (a
hinge given a torque, a block named "servo"); a malformed template (an unpublished model, a horn off the shaft, a
second horn, a wire between servos, a stick on a controller's lead); overlapping bonded parts (document and physics);
an invalid object inserted after construction; physics receiving an unauthorised kind; replay of a saved file holding
an illegal actuator; a "dog-shaped" label on hinged blocks told to walk; every refusal cites a law; a physics refusal
leaves the document; a renderer-only servo; no invisible body and no bodiless picture. Each fails at the first illegal
boundary. With them: `makeable.test.ts` (no creature placed where another part is, at every heading) and the rebuilt
servo tests in `rules.test.ts`, `momentum.test.ts` and `fracture.test.ts`, all through the language.

## G. One physical source of truth

The document is what exists. It admits only what the gate judges, judging a construction whole when it closes (K-5
with the joints' bores known). The physics holds what the document admitted and nothing else: its intake runs the
same gate against the world as it stands, live, and a construction enters it whole (`construct`) or not at all; what
it refuses leaves the document (`refuse`). The controller is a board part the document holds; it keeps its own clock
only while the pack the document holds powers it through a wire the document holds; its commands exist for one tick,
down leads the document holds. Power is a pack's charge, drawn by what is wired to it and booked. The renderer draws
parts from their templates' visuals and joints from their templates' declared hardware, from the document, with live
poses from the physics. The ganglia's tree holds the laws the gate cites (K-1..K-11, L-1, C-12, C-13, O-2) with their
realisations and the tests that hold them (`tests/unit/tree.test.ts` checks the symbols exist). A saved file is a
construction judged when opened. There is no second representation of a machine anywhere.

What is still not derived from the tree: the motor's command (D-motor-channel), bores as geometry
(D-bores-as-geometry), and the servo's current as a proxy (D-servo-current-proxy); docs/FRONTIER.md carries each.

## H. Blind-test results

Before (the walker of the incident, shown to an instance told nothing): "a DIY robot chassis / quadruped platform";
"not a working machine, 97%"; a dog, 1 out of 10.

After: the rebuilt walker, the rebuilt swimmer and the kart, each constructed only through the language and the gate,
were shown to another instance told nothing but the image paths and asked what it sees, whether it looks functional,
what is missing, and a score. Its verdicts, verbatim:

- Walker (`shots4/walker.png`): "reads as a servo-leg walker sketch (blocks, sticks, wires) but the joints, power and
  control are not actually there; the legs are sticks threaded through boxes." It saw "black blocks that are the right
  shape to be servos, and red/black cables that look like power wiring", found "no battery, any controller board, any
  output horn/shaft on the blocks", said "the rods pass straight through the black blocks, so the blocks cannot be
  rotating anything", and that "cables terminate in mid-air under the board". Score 3/10.
- Swimmer (`shots4/swimmer.png`): "a floating chain of boxes with dangling wires; no propulsion, no visible joints, no
  sealed electronics." It saw "a chain of about seven dark slate-grey rectangular blocks laid end to end in a shallow
  zigzag", "smaller dark cubes acting as necks", "two white C-shaped collars", said "adjacent blocks are offset and
  their corners overlap each other and the connecting cubes", and "nothing provides thrust". Score 2/10.
- Kart (`shots4/kart-driving.png`): "a four-wheel rolling plate that could be pushed, but with no visible drivetrain,
  steering or wiring it is not a driving kart as built." It saw four wheels on axles, "a tall upright black cylinder
  standing on a square beige/wood pad", "a white cube sitting on a thin darker mounting plate", and said "no parts
  obviously pass through each other". Score 4/10.

What the verdicts say, read against the document each image was made from:

- Every object the evaluator saw is in the construction, and nothing it saw is impossible: the walker's blocks are the
  four hip and four knee servos (a knee servo is glued to the side of its thigh rod, which from that angle reads as a
  rod threaded through a bead); its cables are the eight power wires and signal leads to the pack and board, which are
  under the deck and so "terminate in mid-air" from above; the swimmer's "necks" are the servos in the gaps between
  the plates, its "collars" the glued strips the horns' arms push on, and its "overlap" is foreshortening of plates
  that the gate judged apart by their clearance; the kart's cylinder is the driver ballast on the seat, its motors,
  gearheads, axles and hangers under the chassis, out of that camera's view.
- The score did not rise because what a blind look can judge is presentation, and presentation is what did not change:
  a servo is drawn as its case with a horn disc, not with its visible shaft, lead and label; wires are catenaries
  without terminals; the camera framed each build from above; the plates of a swimmer have no fin shape because the
  plan has none. Before the firewall the picture lied about what was there (a plank with sticks and no joints, drawn
  as a walker); after it the picture is an honest drawing of a real construction that an outside eye still cannot
  read. Those are different failures, and only the second one remains.
- What the blind look proves about the firewall is narrow and real: an evaluator looking for the impossible found none
  of it in two of three images, and the one it flagged (the swimmer's overlap) is a camera artefact the document
  contradicts (the gate's record of each plate pair's separation is in the construction log).
- What it demands next is in the presentation layer, which the directive says is derived and never source: a part's
  drawing must show what the datasheet says it is (a servo with its shaft, lead and model label; a wire with its two
  terminals; a board with its leads), the camera must be placed by the construction (orbit to show the mechanism, not
  the top), and a creature's plan must include the surfaces that make it read as what it is. None of that may touch
  the construction or the physics; all of it is the next batch's work alongside the tablet.


## The constructor as a language, and what comes after templates

The directive that follows this batch is the right one: not a checker in front of an open constructor, but a language
that cannot say the invalid thing. That is what `src/construct/build.ts` begins: a placed part is a handle typed by
its kind's capabilities, and a joint that needs a capability is a method on the handle that has it. Templates (the
walker and swimmer plans, the kart) are now sentences in that language, not the language. The gate beneath it is the
immutable floor that data arriving any other way meets: a saved file, a test fixture, a tool. What the language says
is wider than any plan; the next steps toward construction from principles are: typed capabilities for every part
kind (motors, wheels, bearings, sensors), composition rules as grammar (source → conversion → transmission → actuator
→ load), and the ganglia deriving a construction from a required function rather than retrieving a stored one.
