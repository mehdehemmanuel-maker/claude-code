# Nexus: the restart

On 4 October 2026 the application that lived here was deleted down to its kernel and its data, on purpose and with
no sunk cost counted (the reasoning, measured, is in [docs/NEXUS-RESTART.md](docs/NEXUS-RESTART.md)). The last commit
of the whole application is `792c328`: a VR creative sandbox for the Quest 3S with an in-app engineer, a knowledge
tree, a construction grammar, creatures and places. Everything it learned survives here as documents, data and tests;
nothing of its architecture is extended again.

## What is here now

- `src/physics`, `src/engineering`, `src/connectors`, `src/parts`, `src/doc`, `src/schema`, `src/persistence`,
  `src/construct/build.ts`: the rigid-body kernel (Jolt), its numerics, its joint capacities, its document of bodies and
  the gate that admits bodies into it. This is a **realization backend** with measured error: its conformance tests
  (`tests/conformance`, `tests/golden`) are against exact results and are kept green.
- `src/data`, `src/ganglia/laws.ts`, `src/ganglia/units.ts`: materials with sources, the person's measures with
  sources, 144 laws with inputs, outputs, validity and sources, and the dimension algebra. **Data**, to be re-expressed
  as terms; not the executable form.
- `docs`: every audit, autopsy, design and observation, including the failures that showed the way.
- `src/nexus`: the new core, built in the order of docs/NEXUS-RESTART.md Part XXIV, on five primitives: quantity,
  term, mode, origin, identity. `dimension` (the algebra, Buckingham groups), `status` (the lattice, no default),
  `identity` (content hashes), `term` (leaves with origin classes, operators with identity, canonical form),
  `evaluate` (every evaluation a derivation record; unknown stays unknown; validity refused with the domain named),
  `law` and `book` (every one of the kept 144 laws as a term, SI inside and unit conventions at the ports, with its
  validity as predicate terms, every constant a sourced leaf, and the kept worked example reproduced; plus the
  slice's derived laws),
  `solve` (propagation, free variables reported, contradictions kept, search over declared options under a declared
  preference), `field` (declared frame, sourced gravity, ground as a field query, the observer's window and the rigid
  domain), `domain` (regions of x, y, z, t in a frame with the scale bands their description holds in; fields as
  laws composed over coordinates, sampled as records that cite the laws; the observer's resolution, with the window
  as the coarse-graining operator: a sample is the field's mean over the support cell, uncertain by its range
  across it, refused outside a scale band with the band named; coverage of a lattice of point samples is zero), `coupling` (rest and stand couplings: every coordinate a solution; the ledger), `realize` (the kernel as a
  morphism under a contract whose numbers are its own conformance measurements), `elastic` (a second realization:
  the elastic line integrated on a grid, for a span on two supports and for a cantilever from a fixed root,
  independent of the closed-form laws, every observable's error measured by halving the cell, stationary in time;
  it observes the sag the rigid kernel cannot, and it caught the bracket's tip-sag law treating a patch as a point), `observe` (comparison within the
  contract, unobserved as its own status, the append-only journal), `why` (WHY total, IMPACT, staleness),
  `failure` (the four representational failures as terms: anomaly, contradiction, a variable free that the intent
  did not leave free, a measurement no variable can hold), `abduce` (the missing distinction searched for over the
  dimensionless groups of the failing coupling's quantity types, found from their dimensions alone; a candidate that
  separates every observation, validated on held-out observations where it predicts and silent where it does not,
  promoted with provenance "abduced from observations h1…hn" only when it changes more than one system; a tie names
  the quantities the next observation must vary; a judgement inside the bound's uncertainty is unresolved, not
  decided), `study` (the same intent realized with one coupling's quantities varied, every run a system in the
  journal), `project` (a scene is a pure function of bound records: a box for every placed body and nothing else,
  every number naming its record; a renderer consumes it and decides nothing), `beam`: the vertical slice of
  Part XXV, and `bracket`: the second slice, an arm bolted to a post, where a joint is a coupling whose shared
  boundary variables (the root moment and shear) are read from the solution, bounded by the bolt group's capacity
  at the declared factor, and measured by the kernel under a contract its own conformance test fixes at 1 %; the
  catalogue of sections and bolt groups is searched under two preferences in order (least section, then least bolt
  steel), and a 0.6 m arm was refused honestly because a 38 mm section is not slender enough for the sag law's
  domain. A 60 kg mass across 1.2 m: the solver reports the section free, the
  catalogue under least material picks a 2×4 laid flat (the on-edge sections refused by the lateral-stability
  domain, the 4×4 by slenderness, the 2×2 by sag), every coordinate is derived from the declared frame, the kernel
  measures the bending moment at four seams, each the mean over its quiet time with the range as uncertainty, within
  1 % of the moment field resolved at those points under a quasi-static scale band, and the sag is unobserved
  by the rigid realization, which says it cannot see it, and observed by the elastic one within the error it
  measured on itself, which also confirms the derived patch-load laws independently. The environment test of Part XX runs: the same intent on a flat
  field, a slope and a field with a hole; the ground is a field over x and z, the supports are posts cut to their own
  ground, the design is identical by hash on all three, and every record that differs between the fields rests on the
  ground field or on a kernel measurement. The second growth came from the joint: the derivation bounds a bolted joint by the group's bending capacity
  only, the kernel also breaks one in shear; ten brackets with the load and the bolt group varied, the arm section
  fixed as the experiment's configuration, gave two anomalies among the nine the language predicted to hold (the
  residual rule: what it already predicts to fail is explained and does not enter the abduction); over the joint's
  quantities (root moment, root shear, bolt diameter, bolts, their strength, the lever) the unique simplest group
  separating the two from the seven is the shear over the bolts' section strength, with its bound bracketing the
  kernel's own capacity; without the small-post observation it ties with a lever group and the next observation is
  named. The first growth of the language came from the
  kernel: a tall load that the static derivation said rests never settled; eight realizations of the same intent
  with the load's footprint varied gave the observations; over the rest coupling's quantities (centre of mass above
  the base, half the contact along and across, gravity, the observer's patience, the mass) the one simplest group
  that separates rest from rocking or toppling is the centre of mass over half the contact across the beam, with the
  bound between 4.3 and 5.7 fixed by the observations; the language now refuses the column, admits the slab and
  says it cannot decide a case inside the gap. Among what did not rest in place, the drop separates rocking from
  falling by the same group further out, a second relation: a column that rocks is refused by the first and admitted
  by the second, a slab on edge by neither.

## The gate

```bash
npm ci
npm run gate      # typecheck, then every test: kernel conformance, golden, codec, and the architecture tests
```

Promoted relations enter construction: before anything is realized, a slice judges every coupling by the language
and refuses with the relation named, or says it cannot decide a case inside a bound's uncertainty; every judgement
cites the language's hash, so a promotion makes exactly the judgements stale, and regenerating them under the grown
language changes them and nothing else.

The architecture tests (`tests/nexus`) are the gate that matters: a bare value is unconstructable, an unknown never
becomes a default, WHY is total, every coordinate is a solution, every runtime effect is a derivation record, and a
change to a law reaches exactly what rests on it.

## What must not be built yet

A dog, a motor, a table, a beach; a category, a family, a role, a kind; a construction library, a template, a default;
a natural-language front end; the headset and the tablet; a renderer that is anything but a projection of bound terms;
a second realization before the first has a measured contract. See docs/NEXUS-RESTART.md Part XXII for the full list
of red flags.
