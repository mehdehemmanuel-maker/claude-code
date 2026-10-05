# Nexus: everything it holds, and a plan for every piece

4 October 2026. An inventory of the whole framework as it stands in the code and the documents, and then a plan that
puts every piece to work. Each piece says what it is, the mathematics it carries, where it actually runs today, and the
evidence. "Runs" means the process executes it (`npm run nexus`, `npm run nexus:round`). "Library" means real code
that executes only under the tests. "Document" means it exists only as writing.

---

## Part A. What exists

### A1. The language of claims (beneath everything)

| Piece | What it is, mathematically | Where it runs |
|---|---|---|
| **Terms** (term.ts) | A value is a leaf (a number with its origin), a variable, an operator applied to terms, or a binder (an integral over a bound coordinate, by Simpson panels whose count is a leaf). Dimensions are checked when a term is built, so dimensional nonsense cannot be a term. | runs |
| **Identity** (identity.ts, term.ts) | Content is identity: a node's identity is the hash of its operator and its children's identities, over the canonical order (commutative arguments by content, variables numbered by first appearance). Equal content, equal identity, whatever the names. FNV-1a 64 in 16-bit limbs. | runs |
| **Dimensions** (dimension.ts, ganglia/units.ts) | Exponents of mass, length, time, current and temperature; units are conventions for writing a dimension and a scale. Buckingham groups from integer null spaces. | runs |
| **Status lattice** (status.ts) | What a value rests on, from fundamental to unknown. A derivation is as weak as its weakest input. Unknown stays unknown. | runs |
| **Evaluation as derivation** (evaluate.ts) | Evaluating returns a record: term, inputs, value, status, law, domain refusal, first-order uncertainty, the binder's discretization error by halving. A predicate a known part decides is decided without the rest (three-valued and/or). | runs |
| **Laws** (law.ts, book/*) | 144 kept laws as terms over ports, each with a validity domain of predicates, a source and a worked example it must reproduce; apply and invert. | runs |
| **WHY** (why.ts) | Every value walked to its leaves and their origins, shown as the graph a derivation is; IMPACT and staleness by hash. | runs |

### A2. The state, the store and the loop (the runtime)

| Piece | What it is | Where it runs |
|---|---|---|
| **Journal** (journal.ts, sink-file.ts) | One append-only record of contributions (leaves, relations, constraints, places, holds, withdrawals) and anomalies; replayed to rebuild the state, every term checked against its identity. | runs |
| **Runtime** (runtime.ts) | The state as a fold over the journal. Structure is decided from present values first, then everything a change reaches is evaluated once, in depth order. Gaps are structured terms at addresses, and each says which constraints it bears on. | runs |
| **Text channel** (channel-text.ts, main.ts) | Lines in (give, measure, law, want, place, gravity, held, evolve, why, gaps, state), changes and gaps out. | runs |

### A3. Elements and sub-elements (what the generator makes)

The generator (manifold.ts) turns wants on regions into elements, every rule about conserved carriers, never about a
kind of thing. The element kinds and what each holds:

| Element | What it is | Sub-elements it carries |
|---|---|---|
| **region** | a place a carrier is counted in (a person's region, a moving region, a point of use, where something is collected) | its stated quantities, its extent and faces, its matter |
| **boundary** | where a carrier crosses or is stopped between regions | its conductance, its faces and their areas, what each face intercepts |
| **path** | a chain of touching regions a carrier flows along | least flux, largest drop, least conductance, within what the source gives |
| **store** | content held over time | content held by the end, content it starts with, how long it must last |
| **conversion** | one carrier becoming another, or a matter made (including a matter that makes more of itself) | power, least rate, doubling time, the heat it sheds |
| **observer** | what must be measured, finer than the tolerance it serves | resolution needed |
| **modulation** | what is changed in response: by the person, or following an observation | what it follows |
| **contact** | where regions meet and momentum crosses | area, what it bears, friction it needs |
| **bound** | a limit derived from a law: a lag bounds a size, a bit's barrier bounds its temperature | the bound and what it compares against |

Every element carries a lineage to the want that needs it and the laws it rests on. What a rule cannot do is a gap.

The runtime's own generated structure, from places (place.ts, contact.ts):
- **place:** a box with its centre, turn and extents, every number a leaf. It generates its volume, extent along
  gravity, mass, weight, and its sections' second moment and modulus where gravity crosses them.
- **contact:** any feature of one place (corner, edge, face) clipped to the separating face of another, giving
  corners, centre, normal and area.
- **load path:** shares by moments on level contacts. On sloped contacts, push and friction: one contact determined;
  two decided by Fourier–Motzkin over the one free force.
- **bending:** one rule for every force spread over its interval.
- **rest:** a derived quantity, down to what is held.

### A4. Materials: what matter is

| Piece | Mathematics | Evidence | Where |
|---|---|---|---|
| **Carriers** (carrier.ts) | Conserved quantities (energy, charge, momentum, angular momentum, light, information, matter by volume, amount or mass), each with content, potential and flux. Law families are generated per carrier: conductance, storage, power, dissipation. | the house, car and printer generated from balances | runs (in the generator) |
| **Identities** (compose.ts) | A species is counted by what a change conserves: atoms and charge in chemistry; charge, baryon and lepton number below a nucleus. Balanced reactions come from the same integer null space as dimensionless groups. | methane −802.3 kJ/mol; the neutron needs an antineutrino; lead to gold refused where atoms are kept | library |
| **Binding** (compose.ts) | Bond enthalpies predict formation enthalpies; the residual names missing binding. | benzene's 161 kJ/mol names delocalization | library |
| **Phase** (phase.ts) | Each phase has a Gibbs energy H − TS; the least wins. Vapour pressure by integrating Clausius–Clapeyron with the binder. | water boils at 373.58 K (373.12 measured); 1705 Pa at 15 °C | library |
| **Solid** (solid.ts) | Density from atoms per lattice cell; stiffness from binding energy over atomic volume. | eight metals within 0.6 %; the alkali residual names temperature | library |
| **Rates** (rate.ts) | A change over a barrier at kT/h times the Boltzmann factor (Eyring). The barrier is found from viscosity. | water rearranges in 6.5 ps (8.27 measured); the barrier falls with temperature | library |
| **Transport** (transport.ts) | Conduction into a cylinder by its Bessel series; the least heated length of a stream is Fo Q ρ c / (π k), whatever its diameter. | the printer's 0.21 m and 0.50 m | library, used by the generator |
| **Holding a temperature** (hold.ts) | A sphere's conductance, its own time, the least mass that holds a temperature. | life's smallest bodies | library |
| **Arrangement** (network.ts, frame.ts) | Whether bars carry a load is a rank question: mechanisms and self-stresses. Stiffness grows with the solid as the first power (stretching) or the cube (bending). | wood along the grain at exponent 0.93, cell wall 33 GPa (35 measured); the house's walls sway two ways | library, used by the generator |
| **Kept matters** (matter.ts, data/materials.ts) | 33 matters as properties per carrier and role, each sourced. | they lack a highest temperature (round 2's top gap) | runs (as data) |
| **Growth** (manifold.ts, since drawn round 1) | A matter made in proportion to itself doubles at least every T / log₂(Q/Q₀). | 97 of 97 grow wants answered | runs |

### A5. Coordinates, each on its own time

| Piece | Mathematics | Evidence | Where |
|---|---|---|---|
| **Domain and resolution** (domain.ts) | Coordinates as variables with dimensions and scale bands; resolutions; fields; sampling and coarse-graining. | the swing's window | library |
| **Frames and fields** (field.ts) | A frame is a declaration; every coordinate is derived from its origin leaf; gravity is a sourced leaf; the ground is a field query. | the slices | library |
| **Places in a measured domain** (place.ts) | Gravity is a measured vector. Directions are never named: "up" is against the measured gravity. | a 38 × 184 board on edge, then flat, by the kept laws | runs |
| **Time as a coordinate** (swing.ts, realize-hinge.ts) | The angle over time is a field over t with the sampling law as its scale band; the period and the energy ledger over time. | the free hinge within 0.5 % | library |
| **Local clocks** (clock.ts) | Each region advances at its own time (capacity over what conducts to it), in steps that are powers of two of the finest. The finer side computes the flux across a boundary, so nothing is made or lost between clocks. Refinement goes where halving changes the result most. | a room's air at 235 s, sensor 10 s, walls 8.1 h; energy kept to 1 part in 10¹⁴; walls refined alone | library |
| **The scale plane** (scale.ts, SCALE.md) | Scale is the plane of ln L and ln τ. Each mechanism is a line, τ = (L^a / P)^(1/b), with its exponent as its slope; crossings are where lines meet; levels are gaps in the spectrum of times; τ = L / c bounds what can be one state. The finite chart s = λ / (1 + λ) was tested and rejected: no mechanism is straight in it. | water's twenty mechanisms; capillary length 2.71 mm; Prandtl 6.14 | library |
| **The tuner** (tune.ts) | The coarsest representation the language admits. It refines one axis at a time where the result changes, and refuses a budget too short with the step needed. | the swing solved at a quarter tick | library |
| **The evolver** (evolve.ts) | The rigid kernel steps the state's places until still and returns where they came to rest, measured. | the tipped board 113 mm lower, turned 38° | runs |

### A6. x, y, z, S: the structure and its projection

From docs/LAW-GRAPH.md and src/ganglia/lawgraph.ts (library, in the older Ganglia layer):
- **S** is the full relational structure: a typed multigraph between laws, with seven edge kinds (derives-from 10,
  shares-shape 53, co-used 223, feeds 433, shares-constant 40, and others), each edge with what carries it and where
  it came from, plus a path index (every simple path within a depth). Nothing is collapsed to one number.
- **x, y, z** is a projection of S:
  - height from the derivation depth;
  - the plane from the spectral embedding of the whole weighted structure (the two smallest non-trivial eigenvectors
    of the normalized Laplacian);
  - groups as components of the derivation and shape layers.
- **Reorganization** is automatic, because the layout is a pure function of S. One parent put above five laws moves
  131 laws.
- **Zoom** keeps cross-links: cones as super-nodes with every edge between them aggregated, then opened.
- **Not yet:** S over Nexus's own structures. The same treatment is due for the runtime's dependency graph (relations,
  addresses, constraints) and for the scale plane, whose coordinates are already derived (ln L, ln τ).

### A7. The observer

| Piece | What it is | Evidence | Where |
|---|---|---|---|
| **Window** (field.ts, observe.ts) | An observer is a tick, a quiet time and a patience. What it can see follows from its support, its window, how long it watches and how fast what it learns from travels. | the kernel watching water sees it incompressible, inviscid and in an inertial frame: three familiar laws are what that window makes of it | library |
| **The observer inside the observation** | The kernel's contract was measured at one window. Abduction found its fault was the integration step, not the reading tick: the loss halves with the step at the same tick. | round 7 | library |
| **Senses and instruments** (perceive.ts, data/observers) | Observers are physical systems: a person's six senses and fourteen instruments, each receiving what physically reaches it across the medium (a series, a glow, a level, a rate met or followed). None is handed the physical state. | the eye's glow onset at 495 K (Draper 798 K: a flat band is the named lack) | library |
| **Comparison** (observe.ts) | A derivation set against a measurement within the tolerance of the contract and the window: an anomaly, or unobserved when the realization cannot see it. | the slices | runs (anomalies in the journal) |
| **Abduction** (abduce.ts) | When observations disagree, the missing distinction is searched over the dimensionless groups the failing coupling carries, discriminated, validated and promoted with provenance and supersession. | friction found as the swing's missing dissipation | library |

### A8. How rounds run (the method)

Rounds draw their own intents (draw.ts, round.ts). They draw from the manifold's carriers, region roles and want forms,
with magnitudes from what the kept laws cover, pushed beyond it by the bar. Each intent is generated from nothing; what
breaks is ranked, the general distinction is promoted, and every kept finding must reproduce. Round 1 and the start of
round 2 found the following:
- a crash, from a generated region taken for a stated one;
- contents reached by the end were unread for every carrier, and growth at biological level had nothing;
- limits went unchecked;
- unsaid sizes and unsaid sinks stopped rules that could derive bounds instead.

---

## Part B. A plan for every piece

The driver is the drawn round. Each plan item states what it uses, what it makes run, and what proves it. The order is
what the rounds rank, with the runtime as the one place everything ends up.

### B1. Make the ranking structured (uses: gaps, rounds)
- **What it does.** Every gap the generator makes carries its kind:
  - *rule*: the language has none;
  - *knowledge*: the kept data does not state it;
  - *site*: the intent offers nothing for it;
  - *refusal*: the want exceeds a limit;
  - *open*: located structure, such as what a growing matter is made of.

  An unread quantity nothing needed is not a lack.
- **How.** Replace the regex SIGNATURES. Only *rule* gaps rank the next upgrade; *knowledge* gaps rank what to
  measure.
- **Proof.** A round's ranking with no "other:" lines, and *rule* counts falling round over round.

### B2. Every element and sub-element into the runtime (uses: A3, A2)
- **What it does.** Each generator rule becomes a constraint generator in the runtime, like contacts. Elements become
  relations and constraints at addresses (path/least flux, store/content by the end, conversion/doubling time), so
  every value has WHY to its leaves and regenerates by dependency.
- **How.** Transfer rule by rule, starting with the ones rounds exercise most (hold, deliver, reach, grow, lag,
  bound), then delete manifold.ts as section 14 says.
- **Proof.** Each kept probe claim (the house's wire at 16 mm², the roof's 2x8 at 24 in, the printer's heated length,
  the hall's k T ln 2) reproduced through the runtime; drawn rounds run through the runtime instead of the generator.

### B3. Materials from what they are made of (uses: A4)
- **What it does.** A matter in the state has a constitution: identities, binding, lattice, phases. Its properties
  (density, stiffness, the highest temperature it bears, its conductivity) become derived relations wherever
  compose/phase/solid can derive them, and measured leaves elsewhere, each with its origin.
- **The top knowledge gap of round 2,** the highest temperature a matter bears, is the first target:
  - a solid's melting point from its phases where the Gibbs data exist;
  - where they do not, a sourced leaf;
  - "the hottest it may run" as the lowest change the matter undergoes (melting, glass transition, decomposition).
- **Growth.** "What a growing matter is made of" (drawn round 1's open gap) is answered by identities: the supply it
  draws on is the matter holding its atoms, and the energy is the formation enthalpy.
- **Proof.** Grow wants that close with a supply and an energy; the kept phase and solid numbers reproduced inside
  the runtime.

### B4. Every coordinate on its own time (uses: A5)
- **What it does.** The resolution field becomes real in the runtime. Each place, and each region of a generated
  structure, gets its own time from the scale generator (its mechanisms' times at its size). Local clocks advance it,
  and the tuner refines where the result changes.
- **The evolver splits:**
  - places that exchange nothing are stepped apart;
  - a region slower than the observer's deadline is held static, with statics, as today;
  - only what the deadline resolves is stepped in the kernel.
- **Proof.** The room-and-walls day reproduced inside the runtime (energy to 10⁻¹⁴, walls refined alone); the evolver
  stepping only the places not at rest.

### B5. The scale plane as a coordinate of the state (uses: A5, A6)
- **What it does.** Every place and every generated structure gets its position in the ln L, ln τ plane: its size and
  its mechanisms' times. Levels (gaps in times) decide where the continuum description holds and where the molecules
  must be counted.
- **Why it matters.** It tells a round's high-bar target where it lies, for example a tolerance below the level where
  the matter is a continuum.
- **Proof.** Drawn targets at 10⁻⁹ m tolerance flagged as below the continuum level of their matter, with the
  mechanism that takes over.

### B6. x, y, z, S over Nexus itself (uses: A6, A2)
- **What it does.** S becomes the runtime's own dependency structure:
  - addresses, relations, constraints and laws, with typed edges (reads, derives, bears on, generated from, refused
    by, superseded by);
  - the law graph's seven kinds;
  - the scale plane.

  x, y, z is its projection, derived as LAW-GRAPH.md does (height from derivation depth, plane from the spectral
  embedding), never placed by hand.
- **Why it matters.** It is what the headset draws: a person stands inside the structure of what they asked for and
  sees what rests on what, with the gaps as located holes.
- **Proof.** The board-on-blocks state projected, with every gap at a position; moving a block moves exactly what
  depends on it.

### B7. The observer as a channel (uses: A7)
- **What it does.** Observers in the runtime are configurations, each with a window:
  - the person's senses (from perceive.ts);
  - the headset's instruments (head, hands, floor, planes);
  - the kernel.

  What each can see is derived from its window and the scale plane, and every measurement enters as a leaf with its
  window. Projection channels (the display, audio, haptics) are observers' deadlines: they choose resolution through
  the tuner.
- **Proof.** The headset's floor measured as the held place, as the room scene assumes today; a want the person's eye
  cannot resolve shown as such.

### B8. Abduction on the runtime's anomalies (uses: A7, A2)
- **What it does.** The runtime journals anomalies today and nothing acts on them. The study machinery runs as
  realizations against the state: statics against the kernel, the friction coefficient that makes them agree. The
  missing distinction is abduced over the dimensionless groups, and promoted with supersession.
- **Proof.** The kernel's leaning board and statics' friction feasibility compared over drawn turns; a learned
  relation with its evidence domain marked as such.

### B9. High-bar draws that keep rising (uses: A8)
- **What it does.** The bar goes up as the language answers more:
  - more decades beyond the book;
  - finer bands;
  - longer durations;
  - growth by larger factors;
  - wants combined on one region (hold a temperature while growing while delivering momentum);
  - places drawn too, so rounds exercise contacts and the evolver;
  - information targets near kT ln 2, and lags near the size of light's crossing.
- **Proof.** Each round's *rule* gaps per intent fall while the bar rises.

### B10. Every finding kept (uses: all)
- **What it does.** Every mathematical result found so far is held in tests and checked on every round: the house's
  numbers, water's crossings, methane, boiling points, the Bessel centre, kT ln 2, the moment rule against the kept
  laws, Fourier–Motzkin staying, the growth law.
- **Proof.** The gate.

### Order

The order follows what makes everything after it cheaper. B1 first, since the ranking decides everything after it.
Then B2 and B3 together, since the rounds' top gaps are in them. Then B4 and B5, which make time and scale real in the
state. Then B6 and B7, which are what the Quest shows and measures. B8 runs alongside once the runtime holds the
studies. B9 rises every round, and B10 holds throughout.
