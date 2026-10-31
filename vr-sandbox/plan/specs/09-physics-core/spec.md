# Spec 09, the physics core: ports that carry what flows, equations without direction, folding that is exact

Accepted 2026-10-31 (the user's yes to `QUESTIONS.md` U11). From the research synthesis, findings 1, 2 and 4
(`research/00-synthesis.md`), reached independently by passes 06, 07 and 08, and round 3's finding 12 (keyed ports).

## Starts from (checked 2026-10-31)

The engine (`dataflow.ts`) runs directed wires: an output feeds an input; units ride on wires; boards fold into blocks.
Physics lives inside nodes (Jolt in `sim.ts`, laws in `lawgraph.ts`, the frame analysis in `graph.ts`). `Iface` in
`kits.ts` says what a part offers or asks (shaft, studs, drive, chain, mount) but carries no flow. Nothing checks that
a folded block computes exactly what its inside does.

## Requirements

- **PC-R1.** THE SYSTEM SHALL let a port carry a physical connection: a domain (mechanical translation and rotation,
  electrical, hydraulic, thermal, chemical), an **effort** and a **flow** (force and velocity, torque and angular
  velocity, voltage and current, pressure and volume flow, temperature and entropy flow, chemical potential and molar
  flow), whose product is power in watts, checked by the units.
- **PC-R2.** WHEN physical ports are joined, THE SYSTEM SHALL join them without direction: efforts equal, flows summing
  to zero at the junction (Kirchhoff's and Newton's laws by construction), as Modelica and bond graphs do; directed
  wires remain for signals and data.
- **PC-R3.** WHEN a board holds such connections, THE SYSTEM SHALL gather its equations and solve them together: sort
  them, find the loops that must be solved at once and say where they are, reduce the index where constraints demand
  it, and say in words where a model is ill-posed (too many or too few equations, a loop with no solution).
- **PC-R4.** WHEN a board is folded into a block, THE SYSTEM SHALL keep its behaviour exactly, and test it: the block's
  outputs equal the inside's for the same inputs, on every saved block.
- **PC-R5.** WHEN a model has a symmetry (in time, space, rotation), THE SYSTEM SHALL watch the quantity that symmetry
  conserves (energy, momentum, angular momentum, mass, charge) and report its drift; a model that breaks a symmetry on
  purpose (Particle Life) SHALL say so.
- **PC-R6.** THE SYSTEM SHALL let every law and model state where it holds, in dimensionless groups (Reynolds, Mach,
  Péclet, Biot…) and scale bands, and SHALL check it when it runs: a warning past the envelope, a refusal where the
  model cannot hold.
- **PC-R7.** THE SYSTEM SHALL key ports so a wrong connection cannot be made (spec 01's keys): dimension and unit,
  medium, domain; a conversion only through a visible converter.

## Design

- **Port kinds** (`kits.ts`, `blocks.ts`): `signal` (directed, today's wires) and `physical` (a domain, an effort, a
  flow, a key). A physical port is drawn differently and joins at a junction node (a dot where several meet).
- **The equation compiler** (`numeric.ts`, a new stage in `docs/COMPILER.md`): each physical node contributes
  equations; junctions add "efforts equal, flows sum to zero"; the system is sorted into blocks (BLT), loops torn,
  index reduced (Pantelides) where needed, then integrated (our ODE solvers; implicit where stiff). Every step says what
  it did. Small first: a mass, a spring and a damper; a resistor, capacitor and inductor; a pipe and a pump.
- **The fold test** (`dataflow.ts`, the gate): for every saved block, random inputs within its ranges, the block and
  its inside run, outputs compared within numerical tolerance.
- **Conservation watch** (a `conserve` node and a rule): energy stored against power in and out; drift per simulated
  hour reported.
- **Validity envelopes** (on every law node): ranges in π groups; checked at run time; a badge past them.

## Tasks

| Id | Task | Check | After |
| --- | --- | --- | --- |
| P1 | Physical ports with effort, flow and key; junctions | a mass–spring–damper and an RLC circuit built from ports give their analytic responses within 0.1 % | 00 |
| P2 | The equation compiler: sorting, loops reported, index reduction, ill-posed models explained | a pendulum in Cartesian coordinates (index 3) solves; an over-constrained board is refused with the equations named | P1 |
| P3 | The fold test on every saved block (constitution C26) | every saved and starter block passes; a planted fault fails | 00 |
| P4 | Validity envelopes in dimensionless groups, checked when nodes run (C22) | Stokes drag at Re = 10⁵ is refused with its envelope; a node within its envelope runs | 00 |
| P5 | Conservation watch | a pendulum's energy drift reported per simulated hour; a symplectic integrator's drift smaller than explicit Euler's, measured | P1 |
| P6 | Interfaces carry flow (spec 01): a shaft is a mechanical rotational port as well as a cylinder | a motor's shaft drives a gearbox through ports; torque and speed consistent with power | P1, 01 I8 |
| P7 | Our own structural passes (no JS implementation exists): matching, Pantelides with a numeric-singularity pre-pass, tearing, in StateSelection.jl's order; ill-posed messages that name unmatched equations and variables and check balance per block (Modelon, OpenModelica, Simscape) | the index-3 pendulum and an unbalanced block each reported as those tools would | P2 |
| P8 | Status and value as separate port types; "invalid" shown loudly, never silence; a protective action's transient checked as well as its end state (research 20) | an invalid sensor input raises a visible status, not a silent value | P1 |
| P9 | A body as a part family with ports (segments, joints, compartments; ISO 7250 names; ANSUR II, Rajagopal 2016 with their validity); body surfaces as host interfaces whose demand map makes a socket, seat or handle as its negative; `check.humanfit` person by person over a sample, never a percentile (research 28) | a seat checked over ANSUR II rows reports the share fitted and who is not | 01 |
| P10 | `refactor.pattern` (Szalinski-like, egglog in WebAssembly) and `explain.equal`: placed parts turned into a pattern with a certificate that the two are equal (research 26) | twelve placed bolts become a bolt circle; the rewrite chain shown | — |
| P11 | Ordered `disassemble` from blocking graphs on exact solids, fasteners from interfaces, tools named; `repair.score` (EU 2023/1669 and iFixit) showing the path behind its number; wear and damage as interface states (Miner, Paris, Archard per surface pair, ISO 9223), lifetimes as Weibull with their stress and evidence kind (research 35) | a phone-like assembly's battery path scored, the path shown; a pair's wear advanced over a load history | 01 |
