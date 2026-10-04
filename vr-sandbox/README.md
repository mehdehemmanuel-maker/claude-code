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
  sources, 145 laws with inputs, outputs, validity and sources, and the dimension algebra. **Data**, to be re-expressed
  as terms; not the executable form.
- `docs`: every audit, autopsy, design and observation, including the failures that showed the way.
- `src/nexus`: the new core, built in the order of docs/NEXUS-RESTART.md Part XXIV, on five primitives: quantity,
  term, mode, origin, identity. Its first and only goal is the vertical slice of Part XXV, a beam on two supports under
  a load, traced perfectly from intent to the measured sag and back.

## The gate

```bash
npm ci
npm run gate      # typecheck, then every test: kernel conformance, golden, codec, and the architecture tests
```

The architecture tests (`tests/nexus`) are the gate that matters: a bare value is unconstructable, an unknown never
becomes a default, WHY is total, every coordinate is a solution, every runtime effect is a derivation record, and a
change to a law reaches exactly what rests on it.

## What must not be built yet

A dog, a motor, a table, a beach; a category, a family, a role, a kind; a construction library, a template, a default;
a natural-language front end; the headset and the tablet; a renderer that is anything but a projection of bound terms;
a second realization before the first has a measured contract. See docs/NEXUS-RESTART.md Part XXII for the full list
of red flags.
