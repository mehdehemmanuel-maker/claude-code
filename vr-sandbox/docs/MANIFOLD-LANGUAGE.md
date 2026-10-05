# The engineering language of manifolds

Where the ganglia stood, what the directive asked, what was built, and what the final test says. Companion to
`docs/LAW-TREE-INTEGRITY.md` (the gate beneath everything) and `docs/FRONTIER.md` (what is still open).

## 1. The audit: where inference went straight to an object

The directive asked for the exact places the system went `AI inference → final object` without passing through a
reusable constructive representation. Read against the pipeline it asked for (law → possibility → function →
transformation → mechanism → architecture → role → component → material → geometry → parameter → realisation →
instance), the ganglia before this batch had these levels and these gaps:

| Level asked for | What existed | Where | Gap |
|---|---|---|---|
| Behaviour / function | nothing: no "store", "transfer", "convert" as things in their own right | — | a want was matched to a workflow or a template by its words |
| Quantity / flow | `Flow` (electric, rotation, translation, travel, load, signal, heat, stock, chemical, light, sound) | `src/ganglia/blocks.ts:41` | a flow is a quantity and a domain collapsed into one word; "heat" is both the loss and a thing stored |
| Transformation | `Way` (takes flows, gives flows, a law, what it pushes against) | `src/ganglia/ways.ts:21` | a way is transformation and mechanism in one; it has no reversibility, no ports, no parameters, no scaling |
| Mechanism | implicit in the way's `effect` sentence | `src/ganglia/ways.ts` | not a level: nothing can be refined *to* a mechanism |
| Architecture | `DEVELOPMENT` rules ("every motor needs a controller", "every controller a pack") | `src/ganglia/grow.ts:81` | contracts of composition stated as hard-coded rules, not as what a manifold requires and provides |
| Component | `Archetype` (ports with ratings, laws, principles, catalogue families) | `src/ganglia/blocks.ts:46` | the strongest level; but its root for storage was the component itself |
| Realisation / instance | catalogue items (datasheets); parts in the document | `src/data/*.ts`, `src/doc` | a catalogue item is a realisation, but nothing said of which manifold |
| Material | a flat table | `src/data/materials.ts` | not a manifold with roles (a conductor, a rotor, a wall) |
| Geometry | part kinds with parameters | `src/parts/registry.ts` | a kind is a geometry family, but only as a thing to place, never as something derived from a mechanism |

The exact leaps, each a place where a name or a plan stood in for a construction:

1. **"Anything that stores energy is a battery."** The archetype `power.store` (`src/ganglia/blocks.ts:74`) is named
   "energy store", answers to the words *battery, cell, pack*, takes `chemical` and gives `electric`, and its
   families are the battery catalogue. The *function* (store energy) and the *component* (an electrochemical cell)
   were one node, so every path to storage went through a battery. The workflow `battery.size`
   (`src/ganglia/workflows.ts:206`) sizes a battery because it was asked for a battery.
2. **A creature is a plan.** "Put a dog on the beach" went from words to `walkerFromWords` to `buildWalker`
   (`src/assistant/ego.ts:493`, `src/world/creature.ts`): a hand-written body plan placed through the construction
   language. Lawful since the firewall, but a sentence stored whole, not derived from a want.
3. **A design is a template.** "A table for 20 kg" went from `design()` to a Forge program
   (`src/assistant/ego.ts:447`, `src/assistant/designer.ts`): a stored recipe per named thing.
4. **A concept is a chain of flows with no numbers.** `conceive(from, to)` (`src/ganglia/ways.ts:335`) searches
   chains of ways by flow only; nothing in it sizes, bounds, or chooses by a constraint. `grow` then develops organs
   by the `DEVELOPMENT` rules and sizes some by workflows: the architecture was never a thing the search could choose.

## 2. What was built

A new package, `src/ganglia/manifold/`, between the law engine and the constructor:

- **`language.ts`**: the levels of refinement (`LEVELS`), behaviours, quantities, domains, mechanisms; the
  `Manifold` (identity, level, parent, human names *as names only*, behaviour, quantity, domain, mechanism or
  transformation, abstract ports, parameters with ranges and provenance, the laws it cites, invariants, its
  temperature window, whether it refills in place, its stocked realisations, and a `member(contract, env)` scaling
  that makes a member of it for a contract); the `Contract`; the `Environment`; the `Member`.
- **`manifolds.ts`**: the storage branch populated across every lawful mechanism. From the behaviour *store* to
  the function *store energy* to the mechanisms electrochemical, electrostatic, inertial, elastic, pneumatic,
  gravitational, thermal and chemical; under them the architectures (a reversible cell, a primary cell, a solid-disc
  flywheel, a helical spring, a thin-walled vessel, a raised mass, a water reservoir, a fuel tank, a hydrogen tank)
  and components (lead-acid, NiMH, Li-ion, double-layer capacitor). *Battery* is a name over `cell.reversible`,
  four levels down. Each member is sized by its laws: a pack by its datasheet (cells enough that the power leaves
  the terminals at 80 % of open-circuit volts, and that the energy is held at that rate, by the maker's capacity
  table); a rotor by `e = K σ/ρ` (Genta) and `E = ¼ m r² ω²`, at the speed its converter allows and the radius the
  room allows, its centre stress checked (Roark); a spring by `τ²/4G` (Shigley); a vessel by hoop stress and
  `p V ln(p/p₀)`; a raised mass by `m g h` with the drop the place has; a reservoir by `m c ΔT` with Carnot bounding
  what comes back as work. Every number is from its source or labelled an estimate of what.
- **Transformation manifolds** that bridge domains: the electromagnetic machine (reversible, realised by the
  stocked motors, which cap a rotor's speed), screw or winch, spring loading, lifting, compressor and expander,
  resistance heater, heat engine and generator, electrolyser, fuel cell. Ports carry a quantity, a domain and, for
  chemistry, a species: an electrolyser's hydrogen port cannot be connected to a petrol tank.
- **`actions.ts`**: the verbs. `SELECT` a behaviour, `REFINE` to a child, `SPECIALIZE` down a lineage, `COMPOSE` a
  converter onto a chain standing in a domain (lawful only when the converter takes that domain, backwards only
  when reversible), `CONNECT_PORTS` (same quantity, same domain, same species, one giving and one taking),
  `PARAMETERIZE` (the manifold's scaling makes the member), `REALIZE` (by a datasheet), `SATISFY` (a constraint of
  the contract), `INSTANTIATE`. Each is a `Step` in the trace or an `ActionRefused` with the law that refused it.
  Nothing reaches the next level otherwise.
- **`engineer.ts`**: the omni-engineer's entry. `engineer(contract)` selects *store*, refines to *store energy*,
  and for every sizable manifold under it: tests refillability, finds the shortest chains of transformations from
  the contract's domain to the mechanism's and back, composes them, parameterises the converters (their speed and
  power caps feed the store's sizing), parameterises the store, connects the ports, tests the window and the mass,
  and ranks what survives by its mass (certain members first, then members whose family range only partly fits).
  `engineeredReport` says it: what was asked, every lawful way with its numbers and its path, every refusal with
  the step and the law.
- **`instantiate.ts`**: the last action, through the construction language and so through the gate: a pack of a
  stocked chemistry; a disc rotor driven by a stocked machine (`Motor#drive` added to the language). What no
  datasheet realises is *constructible, not placeable here*, and says which part kind it waits on.
- **Ego**: "I need a system that stores 100 kJ, releases 500 W, works between −10 and 40 °C, weighs under 5 kg and
  must be rechargeable" is read with its units (joules, kelvin and a minus sign taught to the unit reader) into a
  contract and engineered; "build it" (or "build the inertial one") places the lightest placeable candidate.
- **Law tree**: nodes M-1 to M-4 (the language, every arrow is an action, a contract is answered by its numbers,
  an instance is a sentence), each realised by a module and held by a test. Two laws added: a flywheel's specific
  energy (Genta) and the isothermal work of a compressed gas.

## 3. The final test

`tests/unit/manifold.test.ts` runs the directive's thought experiment. Asked to hold 100 kJ, give 500 W, work
from −10 to 40 °C, weigh under 5 kg and refill in place, the engineer tries all eight mechanisms:

- The hydrocarbon tank and the primary cell are refused at `SATISFY rechargeable` ("spent once"), before any sizing.
- Lithium-ion is refused at the window (it charges only between 0 and 45 °C); so is the water reservoir (1 to
  90 °C); lead-acid at the mass (5.3 kg at the least by its datasheet).
- The spring (two tonnes of music wire once its three converters are composed), the raised mass (31 t over a 2 m
  drop) and the air vessel (11.7 kg at the least, once its compressor's 30 % round trip is charged to it) are refused
  at the mass, each with the law that sized it.
- Lawful: NiMH (96 AAA cells in three packs of 8 × 4, 1.15 kg, sized by the datasheet: the AAA's lower internal
  resistance per gram beats the AA's for 500 W, and no pack asks for more strings than its template allows), the
  flywheel (a rotor in bearing steel sized to give 100 kJ through a 500 W machine at its least efficiency, 4.2 to
  6.8 kg with that machine, which is *not stocked*: lawful within its family's range, not certain, not placeable),
  the double-layer capacitor (3.7 to 9.8 kg: lawful at the light end of its family), the hydrogen tank with its
  electrolyser and fuel cell (3.0 to 15.1 kg).
- Chosen, by the numbers: the NiMH pack. **A battery emerged. It was never asked for by name**, and the report
  names it as "electrochemical, nickel-metal hydride cell (what people call a NiMH battery)".

The same want with 20 kW instead of 500 W refuses every stocked chemistry at the mass (NiMH would be 42 kg for
the power) and chooses the double-layer capacitor; from −40 to 60 °C refuses every stocked chemistry at the window
and leaves the capacitor and the rotor; without "rechargeable" the store arrives full and needs no way in, so petrol
with an engine and generator (3.1 to 11.2 kg for 10 MJ at 1 kW) is the lightest of all, ahead of a hydrogen tank
with a fuel cell; asked for heat out, the reservoir needs only a heater. The numbers choose, not the name.

## 4. What is still open, in order

1. **Populate.** Only the storage branch is in the language. The behaviours *convert*, *move*, *support*, *sense*,
   *control* must be refined the same way, and the archetypes (`blocks.ts`), ways (`ways.ts`) and `DEVELOPMENT`
   rules (`grow.ts`) folded into manifolds with ports, parameters and scalings, so that `conceive`, `grow` and the
   challenges run on the one language rather than beside it.
2. **Roles and materials as manifolds.** A member names its material by id; the language must choose a material by
   the role's required properties (a rotor wants yield over density; a wall wants yield over density and
   weldability; a conductor wants conductivity over density), from a material manifold with those roles.
3. **Geometry from the mechanism.** A rotor's disc and a vessel's cylinder are chosen here by the member function;
   the geometry manifold should be a family the mechanism refines (a disc, a rim, a constant-stress profile) with
   the shape factor as its parameter.
4. **The creatures and designs as sentences of the language.** The walker and swimmer plans and the Forge designs
   stay as stored realisations until *move* and *support* are populated; then a walker is a member of a
   locomotion manifold grown from a contract (mass, speed, terrain), not a plan.
5. **Learning.** The directive's last step (this is a recurring configuration; these belong to one manifold; this
   manifold is generated by these constraints) needs a record of constructions and their outcomes. The test stand
   (task 51) is where that record would be made.
