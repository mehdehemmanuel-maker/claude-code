# The construction layer: audit and what now generates

4 October 2026. The directive: find every place construction rests on something fixed, trace each upward to the
generative law it should come from, and build that law, never the patch. This is the record. The laws live in
`src/construct/laws.ts` as Nex structures in the substrate (domain `construction`, each under its family, over the
book laws it rests on, cited by hash in `ganglia/dependencies.ts`); the relational assembly model and its solver in
`src/construct/assembly.ts`; relational placement in the language itself in `src/forge/forge.ts` (`on`, `under`,
`between … under | flush | height`, `across … side`, `from … to`), resolved by the host from the real parts' boxes in
`src/forge/apphost.ts`; the person the world is built for in `src/data/people.ts`.

## What was fixed, traced up, and what generates it now

| Where | What was fixed | The generative law it comes from now | State |
|---|---|---|---|
| `assistant/designer.ts` table, crate, shelf, wall, tower | positions by arithmetic (`W/2 − inset`, `y = H − t/2 + 0.0005`, running-bond offsets) | relational placement (spatial: on, between, across) resolved from real boxes: legs stand on their own ground, the top rests on them, aprons span under it; sides stand and shelves span between them, the highest flush; a crate's walls stand on its bottom; a brick rests on the one or two under it, offset from their centroid; a tower's blocks on each other | derived; every design is an assembly (`construct/assembly.ts Builder`), no coordinate but a root's spot on the ground |
| `assistant/grammar.ts` bridge, frame, stand, ramp, ladder, chair | posts, rails, caps, braces placed by hand (one bug per structure: a cap joined before it existed, rails 1 mm short, a deck 6 mm off a cap, stiles sharing space, a leg through a seat) | an assembly of members with roles and relations; the solver orders them by dependency; only roots meet the environment (`stands` on the ground under the footprint corner, `from-to`, `laid`) | derived |
| `grammar.ts` defaults (sizes, loads) | one table per kind | `scale.person`: a seat is popliteal height and a shoe, a work surface the seat and the elbow above it, a passage the shoulders and clearance, a rung pitch a step, a reach the arm (`data/people.ts`, sourced); what things carry stays an estimate and says so | derived; every default is the law's derivation (tested) |
| `grammar.ts` `isWood ? lumber : tube` | stock by material family in code | `manufacturing.stock`: the stock a material is sold in (`registry.ts stock`) and a process that works it (`processes.ts`) | derived |
| `designer.ts legFor` K = 2 | one end condition | `mechanical.end-fixity`: K from how the ends are held (free to sway 2, braced 1, fixed 0.7) | derived; braced frames use it |
| `mind/investigate.ts standLoads/standPushes` | a switch per kind: where to load, where to push, and which way (a shelf along its width, a bridge along its length) | `mechanical.load-case`: what a member is for says what loads it (a carrying surface is the carrying members at one level, each surface takes the rated load; a seat a person; a rung half way up); the push is the person's (`scale.person`) at the top of the highest handhold, in the least favourable direction by `mechanical.overturning`: across the shortest span of the footprint | derived; the switch is gone; the shelf unit now tips at the first test, as the law says, and the designer's foresight says so before the stand runs |
| `mind/investigate.ts PUSH = 300` | a constant | the person's push (`data/people.ts`, an estimate from the pushing tables, labelled) | derived |
| `ganglia/substrate/names.ts` last resort | the one plain thing whose id ends in the word, chosen even when a function or a law of another sense shares the tail | the census's own rule (`native/polysemy.ts`): a word that reaches things of more than one sense is asked, never chosen in silence; the lookup now sees the senses the census sees, and names and aliases written with dashes or dots are one word in both | derived; found by the construction laws' facets ("flow", "vibration", "coarse-graining") entering the substrate: two older silent choices (axial, electromagnetic) fell with it |
| `grow.ts STAGE` | a fixed assembly-order table | `manufacturing.assembly-order`: dependency order of the relations; energy sources last | derived for assemblies; grow.ts still reads its table (named) |
| `grow.ts sizeMembers` | "a 100 mm bracket at 50 mm", "a cross-member over the track" | interface relations (shaft ↔ bore coincidence, mount ↔ structure, torque path) → layout | named (`interface.coincidence` derived for ports with frames in `construct/build.ts`; machines are not yet assembled by the solver) |
| `world/place.ts PLACES` | slope, relief, wavelength per place | `environmental.terrain` and material laws (angle of repose, wave climate) | named; the table's numbers are sourced estimates |
| `world/creature.ts` body plans | segment sizes and offsets by arithmetic | the same assembly relations (horn frames coincide, body on legs) | named; `construct/build.ts` checks frame coincidence to 20 µm already |
| `tools/contact.ts contactBetween` | the joint at the middle of two bounding boxes' overlap | the contact is where the parts really lie against each other (sampled through the part): diagonals and crossing stiles join where they cross | derived |
| `connectors/through.ts REACH`, `tools/contact.ts TOUCH`, host `CLEAR` | three constants | `geometric.clearance`: a placed face is left 0.5 mm, inside the contact slop (5 mm), outside the physics' penetration (0) | derived; the three are one law's three faces |
| `mind/investigate.ts candidatesOf` | a fixed list of failure signatures → hypotheses | the failure goes into the subject (`Subject.failed`) and the laws that bear say what to try: `mechanical.triangulation` (racking → a diagonal or a rail set), `mechanical.member-sizing` (a fracture → size for more), `interface.joint-capacity` (a joint past its capacity → the smallest stronger one), `mechanical.overturning` (tipping with nothing broken → anchor); every hypothesis's claim cites its law by id | derived; the list is gone |
| `mind/investigate.ts signatureOf` | racking read off a part's name (`/leg\d+$/`) | a support's joint to what it holds up (carries, cap, seat, spans) worked in bending: roles, not names | derived |
| `assistant/ego.ts frontFloor(1.2)`, `1.2 + depth/2`, walkers at 1.5 m | fixed distances in front of you | `scale.person`: a thing you use stands with its near face within your forward reach; a walker is released where its first want is you (`world/mind.ts releaseDistance`: past the distance at which company outweighs a fresh mind's curiosity, by its own length), standing on the highest ground under its footprint (`environmental.terrain`, as every assembly does); released at the ground height under its centre, a foot set into a rise of the sand was thrown out and the walker over, at some spots and not others | derived |
| `assistant/designer.ts SAFETY = 3`, `SAG = 1/300` | code constants | a design code is a law of the book with provenance | named (constants kept, provenance in the comment) |
| ramp bays "every metre", frame braced when H/W > 1.5 | thresholds | span from the rail's sizing; racking from `mechanical.triangulation` with the stand's verdict | partly: the stand decides bracing; the thresholds remain estimates |
| flat floor at y = 0 | every design assumed it | `environmental.terrain`: each support reaches its own ground; tops level above the highest ground under the footprint | derived (tested on uneven ground) |

## The family, as data

`construct/laws.ts CONSTRUCTION_LAWS`: 16 families, every facet of the seed tree a law with a Nex structure and a
hash; `executable()` says which derive here (13 at this writing) and which are only named. Relevance is a predicate per
family and per law (`relevant(subject)`), never a table of combinations: a wheel in contact and moving wakes the
mechanical family and no chemistry; a battery wakes chemical, electrical and thermal; an organism the biological.

The family grows from the law book by itself: `discoverSpacing` reads every law with a length among its inputs and a
force, a power, a heat flow or a field as its output as a spacing law (the separation at which the effect is a given
fraction of its value near contact), and the substrate holds each under `construction.spatial-family`, `requires` its
law. Coulomb's law gives an inverse-square spacing (1 % at ten times the distance, tested).

## Not done, and why it is said here

- Machines (grow.ts) are sized but not assembled by the solver: the ports in `blocks.ts` need frames before
  `interface.coincidence` can place a motor against its coupling and its mount against the frame.
- Failure does not yet add a law by itself: a refusal from the gate names its law (K-5, K-8) and the Mind records the
  anomaly, but no `ConstructionLesson` is promoted into the family from it. That is the next mechanism.
- The named facets without a derivation are the measured gap, listed by `executable().named`.
- A design the overturning law says will tip free-standing is still tested free-standing, and the Mind records the
  tilt as an anomaly against a static prediction. The stand has no wall to anchor to; when it has one, an anchored
  design is a design with one more relation (`join` to the wall), not a special case.
