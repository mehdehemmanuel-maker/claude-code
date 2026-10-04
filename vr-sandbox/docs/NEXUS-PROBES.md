# Nexus: the inventions as probes

A house, a car and a 3D printer are instruments for interrogating the language, never products. Each is stated as
what people want of regions under an environment (`tests/nexus/inventions.ts`): no part, no mechanism, no
catalogue of how it works. The core never sees an invention. Every round regenerates all three from their intents
with the language as it is; nothing a round produced is kept or edited. The source of truth is the generative
system, so a failure changes the language and every invention is generated again.

The loop: manifold, generate, observe, fail, find the missing distinction, generalize, upgrade the language,
regenerate. Failures are grouped by what stopped them, so many failures that share a cause become one distinction
and one upgrade.

## Round 0: the substrate as it was

The substrate built no system from a want. The attempt (`src/nexus/attempt.ts`) added the one generic move the
language allowed: a closure over the book's 166 laws, from each wanted quantity to the laws with its dimension and
from their inputs to what the intent gives. Every outcome is classified mechanically.

| Invention | Wants | No law produces it | Produced from what nothing gives | Several chains | One chain | Across untouching regions |
|---|---|---|---|---|---|---|
| House | 13 | 4 | 1 | 7 | 1 | 0 |
| Car | 10 | 4 | 1 | 5 | 0 | 0 |
| Printer | 8 | 1 | 2 | 0 | 2 | 3 |

What closed reads as nonsense, because dimension was the only check: the time for the people to leave the house
was the pendulum period of the room height, the voltage at the outlets a lead-acid open-circuit voltage with the
number of people as its specific gravity, the sag of a floor gravitational time dilation. A held temperature is an
input of 17 laws and the output of one, whose thermal resistance nothing gives.

The 31 wants reduce to five distinctions, and the same five stop all three inventions:

1. **A balance**: what holds a state is what crosses the region's boundary and what is made inside it.
2. **A flow driven across a boundary**, and where it comes from.
3. **The kind of a quantity**: what is conserved, what drives it, what flows.
4. **A boundary**: the place where quantities of two regions meet.
5. **Structure**: regions, boundaries and paths made by the language.

None of the 64 aspects the request names (29 for the house, 19 for the car, 16 for the printer) is made, because
the closure makes nothing. A library of laws is not a generative manifold: this round is the measurement of that.

## Round 1a: the deeper primitive

The five distinctions are one. A flow is not primitive: what generates it is a quantity that is conserved, counted
over regions. Its content in a region changes only by what crosses the region's boundary and what is made inside
it. Physics names the conserved quantities from its symmetries: energy, momentum, angular momentum and charge, and
the amount of each matter that does not react. So the carrier is the primitive (`src/nexus/carrier.ts`):

- a **balance** is the carrier's content over a region;
- a **flow** is its flux across a boundary, driven by the difference of its **potential**;
- a quantity's **kind** is its role in its carrier (content, potential, flux, their densities, power), so a pressure
  of water and a pressure on a roof are no longer the same thing;
- a **boundary** is where two regions' content of a carrier meets;
- **structure** is the regions, boundaries and paths a balance needs.

One mechanism read for each carrier generates its laws: conductance, path conductance, storage, time constant,
and, where potential times flux is power (computed from the units), power, dissipation, and the energy stored in
content and in flux by the binder. One more law couples two carriers without loss. Each carrier's path conductivity
comes out as the material constant physics names for it, without being listed: thermal conductivity for energy,
electrical conductivity for charge, dynamic viscosity for momentum, diffusivity for a species. The capacitance of
momentum is mass; of angular momentum, the moment of inertia.

Twenty-two of the book's hand-written laws are instances, each reproduced on its own worked example
(`tests/nexus/carrier.test.ts`): Ohm, wire resistance, the wire pair's drop (its factor of two is the returning
current, charge conservation), conduction, a wall's thermal resistance, convection, heat capacity, the lumped and
RC time constants, electric, linear and rotary power, Joule heating, the energy in a capacitor, an inductor, a
spring, a moving and a spinning mass, Fick's diffusion, a motor's torque and back-EMF, and a gear train's torque.
The motor, the gear and the wheel are one coupling. Not instances, and named as the family's edge: turbulent pipe
friction (a conductance that depends on its own flux), hydrostatic pressure (gravity's part of a liquid's potential)
and series networks (a composition, not a law).
