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

## Round 1b: the balance generates structure

`src/nexus/manifold.ts` generates structure from wants by the carriers' balances. Every rule is about carriers,
never about a kind of thing: a held potential exchanges its carrier with every neighbour at another potential; a
supply comes from a reservoir always above, or from a conversion of a carrier the environment offers power in, and a
conserved carrier is raised from a reservoir, never made; a delivered charge returns; delivered matter leaves when a
want bounds what a region may keep; a region held in place sends all its momentum to a region at rest; a moving
region carries its store; what is held against a varying neighbour is observed and modulated or smoothed by a
store; a path that carries a flux within a drop has a least conductance, dissipates, sheds its heat and is opened
above its limit. Every element carries the lineage of every want that needs it; every law it rests on is generated.
No element names a part (a test strips the intent's own words and scans for wall, wire, motor, wheel, pump and the
rest): recognition is the evaluator's, by strict predicates in the tests.

Inspection of the first generation separated two kinds of failure. Implementation errors (fixed in the generator,
never in a build): sinks chosen without a potential condition, so waste water drained into the water main; the
momentum rules reached after the generic ones; the car's travel rule firing for the printer's shape; PLA delivered
with nothing driving it; a moving region drawing from a fixed source; heat shed by where a rule was written rather
than where the element is; alternatives shown as requirements. Missing distinctions, by inspection: one region has
one potential at a time, so two held values are its range over time (summer air had heated the house in winter); a
capacity is not a load (the ground's bearing pressure had been read as a load); a want holds under conditions (the
crash speed was only in words). And a mechanical detector turns the unknown into the visible: every quantity the
intent states that no rule read is reported.

What emerges, with the numbers the balances give:

| Invention | Emergent element | Number |
|---|---|---|
| House | air exchange for four people's breath at 1000 ppm | at least 38.6 L/s (ASHRAE 62.2's rule gives about 36) |
| House | the charge path for 10 kW at 120 V within 6 V | at least 13.9 S, shedding 500 W, opened above it |
| House | heat: no reservoir is always above the band | a conversion from the grid's charge |
| House | cooling: the ground at 10 °C is always below it | a path to the ground, no power |
| House | the momentum path to the ground | meets it over an area the 72 kPa bearing allows |
| Car | the contact with the road | carries 6.87 m/s²; stopping at 8 m/s² is refused |
| Car | a 50 km/h crash under 40 g | a stroke of at least 0.24 m |
| Printer | the point that moves over the drawn shape | observed finer than 0.05 mm, held to the table |

Coverage of the aspects the request names, by the evaluator's checks:

| Invention | Round 0 | Round 1 | Not covered |
|---|---|---|---|
| House | 0 of 29 | 19 | framing, walls, doors, siding, roofing, drainage, mechanical systems, access, compatibility, construction |
| Car | 0 of 19 | 14 | transmission, steering, mechanical interfaces, manufacturing, maintenance |
| Printer | 0 of 16 | 11 | thermal systems, calibration, geometry, manufacturing constraints, failure modes |

The failures rank the next upgrade (`lacking`): three distinctions block all three inventions.

| Distinction | Inventions | Gaps | Unread quantities |
|---|---|---|---|
| What a region is made of | 3 | 14 | 7 |
| Geometry: sizes, areas and shapes | 3 | 4 | 7 |
| A process: how long a change takes | 3 | 5 | 0 |
| Gravity in a matter's potential | 1 (house) | 5 | 0 |
| Advection: a flow of matter carries what it holds | 1 (house) | 2 | 0 |
| Direction: momentum is a vector | 1 (car) | 1 | 0 |

One lawful refusal is not a gap: the site's estimated friction does not allow the car's stopping want.

## Round 2: shape, direction and process are one upgrade

Round 1 ranked three distinctions blocking all three inventions. Looking under them for one principle: a balance
over a region is a surface integral, what crosses each face is the flux density through it times its area, so a
region must be a domain in the frame (y opposite gravity) with faces, areas and outward normals, and a flux must
travel some way. Geometry, orientation and direction are that one primitive. A process's duration is the balance
integrated over time: a content change over the flux that makes it.

The language already had the geometric primitive (`domain.ts`); the generator had not used it. `src/nexus/shape.ts`
gives a region with an extent its faces; a free extent is chosen in the configuration space under a declared
preference, never assumed: the inside's 120 m² plan with the least boundary is derived square (the isoperimetric
principle). The want language gains extents, what each face touches, which way a flux travels, and a want's
direction; the intents say them in the person's and the site's terms.

What emerges, regenerated from scratch:

| Invention | Emergent | Number |
|---|---|---|
| House | the plan with the least boundary | square, 10.95 m |
| House | the up-facing face: closed to rain, carrying snow | 2.5 L/s intercepted (the drain's flow), 168 kN |
| House | the sides: wind on the largest | 27.4 kN |
| House | members spanning the up, side and down faces | 10.95 m, 2.5 m, 10.95 m |
| House | where the structure meets the ground | at least 2.37 m² before its own weight |
| House | a passage across the sides the people open and close | 6.5 s to leave, 180 allowed |
| Car | momentum across the travel on the tightest curve | at most 18.5 m/s there |
| Car | what the moving region must hold, facing the travel | at least 1.4 m² |
| Car | every modulation the person makes | responds within 0.3 s |
| Printer | the point moves along x, y and z over the part's extent | 0.2 m each, each observed |
| Printer | the largest part within a day | at least 333 cm³/h: 33 times the stated rate |

Implementation errors found on inspection and fixed in the generator: values pushed twice; the advection gap
repeated on every face; the grade and the curve read as vibrations for a vertical want (a want needs a direction);
only the last axis shedding its heat.

| Invention | Round 0 | Round 1 | Round 2 | Not covered |
|---|---|---|---|---|
| House | 0 of 29 | 19 | 23 | siding, drainage, mechanical systems, access, compatibility, construction |
| Car | 0 of 19 | 14 | 15 | transmission, mechanical interfaces, manufacturing, maintenance |
| Printer | 0 of 16 | 11 | 12 | thermal systems, calibration, manufacturing constraints, failure modes |

Direction and process no longer appear in the ranking. One distinction blocks all three inventions now, with 18
gaps and 7 unread quantities: what a region is made of. The printer's missing thermal systems are in it (the
temperature PLA flows at is a property of PLA), and so are every "hottest it may run" and the structure's own weight.
Advection (siding against wind-driven rain, the machinery that moves air) and gravity in a liquid's potential
(drainage) block the house alone.

## Round 3: what a region is made of

A matter has, for each carrier, properties in roles: a conductivity, a capacity per mass, a density, a stiffness,
the most flux density and the highest potential it bears, an expansion per degree, and thresholds, the potentials of
one carrier at which its other properties change (above which it flows, below which it holds its shape). Matters
come from what the intent states of a region and from the kept material data, an availability set with sources
(`src/nexus/matter.ts`). A threshold is generative: a matter that flows only above a temperature makes the place it
must flow a region held above it. And a role the language can read that no matter states is a gap in the knowledge,
not in the language; the ranking now says which.

What emerges, regenerated from scratch, from PLA's stated properties alone:

| Emergent | From | Number |
|---|---|---|
| the place PLA must flow: a region held between 190 and 220 °C | PLA flows above 190 °C, bears up to 220 °C | held band, observed to 15 K |
| a conversion that heats it, supplied from the grid, following the observation | no reservoir is always above 190 °C | |
| the supply cut above 220 °C | a supply that can pass what the matter bears | the failure mode it guards against |
| a guard keeping the hot region's outer face below 60 °C | the person may touch nothing hotter | |
| the point follows the drawn shape scaled by the shrink | PLA sets at 60 °C and ends at 20 °C, 68 µm/m K | 0.27 %, 0.54 mm over 0.2 m |
| the observation referred to the scaled shape | uncompensated, the part misses the tolerance | 5.4 times |
| the house's charge path made of the matter that conducts charge best | the kept data | copper, least section over length 2.4e-7 m |

| Invention | Round 0 | 1 | 2 | 3 | Not covered |
|---|---|---|---|---|---|
| House | 0 of 29 | 19 | 23 | 23 | siding, drainage, mechanical systems, access, compatibility, construction |
| Car | 0 of 19 | 14 | 15 | 15 | transmission, mechanical interfaces, manufacturing, maintenance |
| Printer | 0 of 16 | 11 | 12 | 15 | manufacturing constraints |

The ranking changed character. What blocks all three inventions now is knowledge, not language: the kept material
data states no temperature limit, no thermal conductivity and no water permeability for any matter (21 gaps). No
language distinction blocks all three. Of the language's, advection reaches two inventions now: the PLA's density
and specific heat stay unread because the flow of PLA carries energy into the hot region, which is the same
distinction as the house's air exchange carrying heat; gravity in a liquid's potential (drainage) and generating a
system from an element (sizing the house's members, and with them its own weight) block the house.

## Round 4: what a flow of matter carries

Advection and gravity in a liquid's potential are one principle: a flow of matter carries the content of every
carrier the matter holds, and a matter's potential is its mechanical energy per volume, pressure and height in
gravity together. Regions can say what matter they hold (outside air is air, the main's water is water) and how high
they are.

| Emergent | Number |
|---|---|
| one flow of air between inside and outside carries the carbon dioxide, the vapour and the heat | at least 38.6 L/s |
| the heat it carries out at the coldest, which the heat supply must also give | 1.86 kW |
| or the outgoing air's heat crosses to the incoming air (an alternative) | |
| a conversion raises the air, since inside and outside hold it at one potential, or the wind pushes it through modulated openings | |
| rain falls through air the wind pushes across: the sides are closed to it too | 4.8 L/s intercepted |
| drainage driven by height: from the roof, from the floor | 39 kPa, 14.7 kPa |
| the heat the flowing PLA takes in to reach 190 °C at the largest wanted rate | 35 W |

Coverage: 0, 44, 50, 53, now 56 of 64. The house reaches 26 of 29; what it lacks (access over fifty years,
compatibility of matters in contact, how it is built) is the same in the car and the printer: what happens to a
thing over its life and how it is made.

## Round 5: a family, not an invention

One car proves little about vehicles. The intent became a point in a want-space (tests/nexus/families.ts) whose axes
are what a person and a site vary: seven media stated only by their matter and its state (a road, rails, ice, water,
under water, air, a vacuum), five sources of power, three gravities, mass and speed swept, and scale and speed swept
together down to a picogram moving a tenth of a millimetre a second. The language generates all 147 points. The
evaluator reads what physics requires of any vehicle (nothing impossible generated, the weight carried, the motion
pushed, the power from somewhere) and names no class.

**Round 5a**, the language of round 4 unchanged: 19 of 133 points lawful. On a road, rails and ice the weight was sent
into the air; on water and in the air a rolling contact was generated on the fluid; in a vacuum nothing pushed. One
missing distinction lay under all of them: what is touched, and in what state. Being at rest had been taken for
bearing a contact. And gravity was a constant of the generator, not a quantity of the site.

**Round 5b**, the distinction generalized, and then each new reading of the evidence generalized in turn:

| Missing distinction | Generalized as | What it reaches |
|---|---|---|
| the state of what is touched | a solid or a fluid by its temperature against its matter's thresholds, or a stated friction | contact on a solid; the displaced weight, a stream pushed down or turned, in a fluid; in a vacuum, what leaves |
| gravity was the generator's | the site states its gravity; standard gravity only as a named assumption | the moon, and no gravity at all |
| air at its own pressure was offered as a store of power | power is a difference of potential; a carrier states whether it reaches its zero (temperature does not: the third law) | one rule replaces the special cases for charge and fuel |
| a contact pushed with no weight on it | a contact's push is friction times what presses it | a grip, where there is no gravity |
| hovering cost the same for a second as for the trip | what holds a region up is paid over the trip: its duration is the distance over the speed | gravity loss: on the moon a mass ratio of 9.5, on the earth 8 × 10⁵ |
| a vacuum offered nothing to push | anything that crosses a boundary carries momentum, light too: emitted, it pushes by P/c; met, by G/c per area | a photon drive and a light sail; wind and sunlight become one rule |
| the regime was computed and ignored | which law holds is a ratio of how momentum crosses | Reynolds, Mach, and the speed of a wave its own length |
| heat in a vacuum had nowhere to go | heat leaves by touch, by matter that moves, or as light | a radiating surface |
| the car's air states its density as a matter's content | one fact, either saying | the car keeps its drag |

The reaction family grew from six laws to ten. Seven come from momentum and energy conservation for what crosses a
boundary: the push and the power of a stream, the least power to hover and to turn a stream, ejection by the binder,
buoyancy, and light. Three are sourced: Stokes (1851), Newton–Laplace and Airy waves. The rocket equation and
Archimedes reproduce on the book's own examples, and the bar's wave speed is the same law with the matter's stiffness.

| Subspace | Points | Lawful | Held up | Pushed | Powered |
|---|---|---|---|---|---|
| a road, rails, ice | 21 each | 21 | 21 | 21 | 21 |
| water, air | 21 each | 21 | 21 | 21 | 21 |
| under water | 21 | 21 | 21 | 21 | 18 |
| a vacuum | 21 | 21 | 19 | 18 | 18 |

Every point that fails is a refusal of physics, with its reason. Wind is air that moves, so there is none in a vacuum
or under water. Stopping at 2 m/s² is refused on rails, where friction times gravity is 1.96 m/s², and on ice, on the
moon and with no gravity.

What emerged, with no class named anywhere:

| Region of the space | Emergent | Number |
|---|---|---|
| on a solid | rolling contact; ice is water below what it holds its shape below, so it is a contact too | |
| on water, slow | parts the water: the speed is under that of a wave its own length | 0.6 of it at 1 m/s |
| on water, fast | climbs its own wave, held up only by turning the stream down | 18 times it at 30 m/s |
| in water | floats as it is: its mean density against water's 1000 kg/m³ | 159 kg/m³, 0.4 m³ displaced |
| in air | a displaced volume of matter lighter than air, or a stream pushed down, or a stream turned while moving | 333 m³, 100 kW, 139 kW |
| in air, fast | its density changes as it moves aside | Mach 0.73 at 250 m/s |
| a vacuum, with fuel | ejection, paid over the trip against gravity | mass ratio 9.5 on the moon |
| a vacuum, with light | a sail, or light emitted | 3.3 µPa; 1 / c newtons per watt |
| a picogram in water | its momentum is conducted: no stream holds it up, and only a stroke that is not its own reverse moves it | Reynolds number 0.002, sinks at 70 µm/s |

Ranked across the family, what the language still lacks:

1. **How hard a fluid pushes back on a shape where momentum is carried.** Six of the seven media hit this. Shape to
   resistance is a field over the shape that the language cannot derive in closed form. It needs a realization of
   the fluid, or observations to abduce from, as the beam's rest relation was learned.
2. **Systems from elements.** Every subspace hits this: a member's section, a store's size, a grip's press. Each is a
   configuration of a space the element's bounds make, so it bridges the generator to space.ts.
3. **Two media paired.** Crossing a moving medium needs a push across from a second medium, such as a keel or a skate.
4. **Gravity from a centre.** A uniform gravity cannot say whether moving across fast enough falls around the mass
   that makes it.
5. **Knowledge, not language.** The hottest a matter may run, and how cold what a radiating surface sees.
6. **Found by reading, not yet in the code.** A fluid's state has two values read from temperature alone. Liquid and
   gas, and the pressure axis, are missing. Under water at 250 m/s the pressure falls by ½ρv², about 31 MPa, so the
   water boils around the payload. A balloon's lighter matter is a gas at the air's pressure.

The house, the car and the printer regenerate from the same generator with their coverage unchanged at 56 of 64.

## The next instrument

The vehicle family is the momentum carrier's want-space. The next family explores another carrier across its scales:
keeping a region at a temperature (a room, a cold store, an oven, an incubator, a cell). Before that comes the state
of matter as a region of temperature and pressure with three states, since cavitation, boiling and lifting gases all
wait on it.
