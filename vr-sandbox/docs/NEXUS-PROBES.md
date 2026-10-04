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

## Round 6: scale, and the observer inside the observation

The question changed from "what happens at a small scale" to "what becomes invisible when the observation's scale
changes". Scale is not a size. It is a relation between a distance, how fast something crosses it, and the system's own
time, and nothing that carries information crosses a distance L sooner than L / c.

**The generator** (src/nexus/scale.ts) makes mechanisms from a matter's measured quantities by their dimensions alone.
A quantity whose dimension already holds a time is a mechanism by itself: a speed, a diffusivity, an acceleration or a
rate. Two quantities that hold no time alone make one by their ratio or product. Each mechanism's time grows with the
size as a power, τ = (L^a / P)^(1/b). A combination of two mechanisms is never a third: it is where they cross. One
molecule's quantities describe a body of the molecule's size, so their mechanisms are evaluated there.

**Water** (tests/nexus/water.ts) is stated only by measured quantities at 25 °C, its site's gravity and rotation, and the
bound c. It generates twenty mechanisms, each with a meaning that nothing named:

| Kind | Generated |
|---|---|
| spread | momentum as L² over viscosity over density; heat as L² over its diffusivity; the molecules themselves |
| waves and restoring | sound, light in water, capillarity as L^(3/2), gravity as L^(1/2) |
| relaxation | stiffness over viscosity, a fraction of a picosecond: how fast the liquid forgets a strain |
| fluctuation | a body of size L wandering by its thermal energy, as L³ |
| one molecule | its thermal speed across its own size, its velocity forgotten in the viscosity, its bonds, its stretch |

What emerged from those twenty. Every value is checked against a closed form computed independently from the same
inputs:

| Found | Value | What it is |
|---|---|---|
| ratios no change of scale alters | 6.14, 388, 63 | the Prandtl, Schmidt and Lewis numbers; 6.1 is water's at 25 °C |
| where capillarity and gravity cross | 2.71 mm | the capillary length |
| where capillarity and momentum spread cross, by three pairs that agree | 11 nm | the visco-capillary length |
| where sound and momentum spread cross, by three pairs that agree | 0.60 nm | within a factor of two of the molecule's own 0.31 nm |
| where light in vacuum crosses within one O–H stretch | 2.94 µm | the band's own wavelength, where ε = 1 for the vibration |
| with a motion | | the Reynolds, Péclet, Weber, Froude and Rossby numbers are the size over a crossing length; Mach and the capillary number are scale-free |

Crossings below the molecule, or beyond the largest size the site holds, are marked as outside, because the quantities
that made them do not hold there. Light in vacuum is the fastest crossing at every size until free fall overtakes it at
c² / g, which is beyond the planet.

**Levels** are gaps in the spectrum of times. The gap is a declared judgment of two decades. At a nanometre the
molecules and the flow share one band, and at a micrometre and above they are apart. The sound crossing equals a
hydrogen bond's lifetime at 1.5 nm and is two decades slower at 150 nm. That is where the continuum separates from the
molecules, and where the averaged quantities it is written in become meaningful.

**What an observer cannot see** follows from its support, its window, how long it watches and how fast what it learns
from travels. The rigid-body kernel watching a centimetre of water averages sound away, so it sees an incompressible
liquid. It never sees momentum spread, so it sees an inviscid one. It never sees the earth turn, so its frame is
inertial. Three familiar laws are what that window makes of water. An ultrafast pulse sees the bonds and the liquid's
forgetting, and every flow is fixed for it.

**The scale coordinate was tested, not declared.** The finite chart s = λ / (1 + λ) carries the same information as
ln λ: it is its logistic, and ln λ = logit(s) exactly. But every mechanism is a straight line in ln λ, with its exponent
as its slope, whatever the reference and the range. In s none is straight, and a slope fitted there changes with the
reference and the range, so it belongs to the chart and not to the mechanism. The distance between two crossings in
ln λ does not depend on the reference; in s it does. So scale is the plane of ln L and ln τ. Mechanisms are lines in
it, crossings are where lines meet, and the causal line τ = L / c bounds what can be one state.

**The observer inside the observation.** The kernel's contract for a free hinge was measured on one bar at one release,
which is one value of its tick over the swing's period. The same free swing over six lengths and two releases found
this:

| Bar | Tick over period | Lost per period at 30° | At 10° |
|---|---|---|---|
| 0.15 m | 0.0165 | 2.7 % | gains 0.69 % |
| 1 m, the contract's bar | 0.0067 | 1.3 % | gains 0.25 % |
| 4 m | 0.0033 | 0.67 % | gains 0.12 % |

The residual has structure, and its sign depends on the amplitude. Each column is a power of the tick over the period,
and the period's error is of higher order than the energy's. Given the observer's tick and the period it watches among
the quantities, the abduction found the hidden variable itself. The simplest group that separates the swings kept
within the contract from the ones lost is the tick over the period times the release. It was promoted, and it now
refuses a short bar released wide before the kernel runs it. The contract was a law of the kernel's window, validated
in one regime. The friction relation learned in an earlier round was learned inside that regime, so it stands.

The same sweep found a missing invariant. No constraint said the bar must clear the floor, so bars longer than the
pivot height reached the kernel and crashed. The swing system now states that constraint, and a slice is realized only
where its constraints hold.

## Round 7: the tuner, and observation as a projection

The tuner is a part of the generative loop, not a reporter (src/nexus/tune.ts). A manifold is generated in a
representation the generator may choose, judged by the language and by what it realizes, and when the judgement says
the representation does not hold the phenomenon, the pathway changes and everything is generated again from it. The
first representation axis it works on is time: the step a realization integrates at.

**The kernel can be asked for time resolution.** It already divided its tick for stiff joints, bands and end stops,
from their own frequencies. A free pendulum's time never entered that, so a short bar's swing was integrated at the
full 1/90 s. The world now takes a requested largest integration step, still read once a tick
(src/physics/world.ts). It has a ceiling of eight substeps, which is a property of the realization the tuner must read.

**Self-correction found the right quantity.** The window study of round 6 had abduced "tick", but in every observation
the kernel's integration step and the observer's reading tick were the same 1/90 s. With both among the observation's
quantities, the first abduction is ambiguous between them and names exactly those two as what to vary. The study then
runs that experiment itself, the failing swings again at a half and a quarter of the step, read at the same tick. The
loss halves with the step, and the second abduction chooses the step over the period times the release. The fault was
the realization's time resolution, not the observation's.

| Integration step, 0.15 m bar at 30° | Lost per period | Readings |
|---|---|---|
| 1/90 s | 2.69 % | 303 |
| 1/180 s | 1.38 % | 303 |
| 1/360 s | 0.71 % | 303 |
| 1/720 s | 0.36 % | 303 |

**The tuner on the swing.** It generates the coarsest representation first and stops there when the language admits
it, so the contract's own bar stays at the tick. A relation that refuses and speaks of the axis is solved for it: a
short bar released wide is refused at the tick, solved to a quarter of it, regenerated and kept. A budget too small is
refused with the step the phenomenon needs. With no relation to say why, a broken contract is an experiment along the
axis: finer, and if then kept, the fault was there. Nothing of a refused representation reaches the regenerated slice,
and a slice judged under a language that has since grown is stale.

**Two faults found on the way.** The language's judge used every relation ever added, so a superseded relation still
refused constructions; only relations in force judge now, and the beam's exploration test shows it. And the swing had
no constraint that the bar clears the floor (round 6).

**Observation is a physical projection** (src/nexus/perceive.ts). An observer is a configuration of senses: a carrier,
a band, the least and most it registers, a window, a resolution and a latency. A person (sight, hearing, touch,
balance, smell, taste, and the time to act) and fourteen instruments are values of those fields (src/data/observers.ts).
Diffraction and the electron's wavelength generate the microscopes' and telescopes' resolutions. The medium between
decides how fast each carrier crosses, so location enters the computation. No observer is handed the manifold:

| Observer | Of the kernel's 1 m swing | Of water at 25 °C |
|---|---|---|
| a person at 3 m | late by 3 / c + 0.1 s, averaged over 1/60 s, blurred to a minute of arc | does not see its glow (7 × 10⁻²¹ W/m² sr) |
| a person at 10 km | cannot tell it from stillness | |
| a telescope at 10 km | resolves it | |
| a high-speed camera | refused: the manifold is read once a tick and the bar is rigid only to windows its sound crossing is short against, so it must be generated elastic and finer | |
| a thermal camera | | sees it bright (53 W/m² sr) |
| an infrared spectrometer | | sees the O–H stretch as a line, though no moment of it |

A frequency inside a sense's band and faster than its window is a line, the way an ear hears a pitch and an eye a
colour. A room's carbon dioxide at a thousand parts per million reaches nothing a person has, and a sensor registers it.
The observer is in the manifold. A rangefinder's 1 mW pushes a swinging bar by nothing it would notice, but gives a
micrometre bead in water a thousand times its momentum in a millisecond. At that scale the observer is part of the
dynamics.

**A missing distinction, reported, not tuned.** The generated onset of visible glow is 495 K. Solids are seen to glow at
the Draper point, 798 K. A sense's band is flat, but the eye is nearly blind at the red end, where a glowing body first
radiates. A response across the band is missing.

## Round 8: what matter is

A matter is no longer only a name with numbers. A species is counted by the identities a transformation conserves
(src/data/species.ts). Which identities are kept depends on the energy available against how strongly each one is
bound. Chemistry has electronvolts and keeps each element's atoms and the charge. Below a nucleus's millions of
electronvolts, only charge, baryon number and lepton number are kept. A transformation is a balance, so the balanced
transformations of a set of species are the integer null space of what they count. That is the same algebra that finds
dimensionless groups, now shared (src/nexus/dimension.ts). Every balance is an assignment of the null space's free
variables, so the smallest one is found by enumerating them.

| Asked | Generated (src/nexus/compose.ts) | Measured |
|---|---|---|
| methane with oxygen | CH₄ + 2 O₂ → CO₂ + 2 H₂O, −802.3 kJ/mol | the lower heating value, −802.3 kJ/mol |
| lead to gold, keeping atoms | refused: lead and gold atoms are each kept | |
| lead to gold, keeping only nucleons, charge and leptons | Pb → Au + 3 p + 8 n + 3 e | |
| a neutron to a proton and an electron | refused by lepton number; the missing product is neutral, has no baryon number and lepton number −1, and is lighter than the 0.7823 MeV the decay releases | the antineutrino, Pauli's 1930 inference; 0.782 MeV |
| a free proton to a neutron and a positron | refused by lepton number, a neutrino missing; with it, energy forbids the decay (−1.8 MeV) | the free proton is stable |

**Binding.** A molecule's enthalpy of formation is its free atoms' enthalpies less its bonds' (mean bond enthalpies).
Small gas molecules come within 21 kJ/mol. Benzene, whose bonds alternate around a ring, is 161 kJ/mol more stable
than its bonds say: more than seven times any other residual, the delocalized bonding the bond list lacks. A liquid is
more stable than its gas by a binding no bond in the molecule holds, between molecules: exactly the enthalpy its boiling
takes in, 44.0 kJ/mol for water.

**State.** Each phase has a Gibbs energy at a temperature and pressure (src/nexus/phase.ts), and a species takes the
phase of least Gibbs energy. Where two phases' Gibbs energies meet is the vapour curve, generated from the phases'
standard enthalpy, entropy and heat capacity, none of them a boiling point:

| Derived | Generated | Measured |
|---|---|---|
| water boils at 1 atm | 373.58 K | 373.12 K |
| methanol | 338.96 K | 337.8 K |
| benzene | 357.36 K | 353.2 K |
| water's vapour pressure at 25 °C | 3166.8 Pa | 3169.9 Pa |
| at 15 °C | 1705 Pa | 1705.6 Pa |
| at 120 °C | 193.7 kPa | 198.7 kPa |
| water boils at a third of an atmosphere | 72.0 °C | about 71.8 °C |

The vapour residual grows with the distance from 298 K. That is the heat capacity held constant: the next variable,
named by the residual. Hydrogen's ionization (Saha) is a continuous fraction across a band of temperature. At half
ionization the binding over kT is the logarithm of the free electron's room over the volume per nucleus, so it happens
at a sixth to a seventeenth of the binding over k, later where it is denser.

**Round 5's gap closes.** A fluid in the vehicle family is a liquid or a gas by its matter's Gibbs energies at its
temperature and absolute pressure. Where a moving region pushes through a liquid, the cavitation number follows. Under
water it is 199 at 1 m/s (nowhere can boil), 0.22 at 30 m/s (the shape decides, a gap), and 0.003 at 250 m/s (it boils
around any shape).

**Faults found on the way.** The null space of an empty set of constraints was returned empty, when it is the whole
space. And the smallest balance was missed by combining scaled basis vectors.

## Round 9: a solid from its constituents

A crystal is atoms at the sites of a lattice (src/nexus/solid.ts). The atoms a cell holds are counted from the cell's
geometry: a corner is shared by eight cells, a face by two, a site inside by none. That gives four for a face-centred
cube and two for a body-centred one. Density is an atom's mass over the room the lattice gives it. Stiffness is a
pressure, and the only pressure an atom's binding and its room make is the cohesive energy over the volume per atom.
The crystals' lattice constants, cohesive energies and bulk moduli come from Kittel's tables (src/data/species.ts).

| Derived | Result |
|---|---|
| density, eight metals measured at room temperature | within 0.6 % of measured, the largest tungsten's 0.5 % |
| density, lithium, sodium, potassium | 1.5 to 5.3 % too dense |
| measured bulk modulus over the binding pressure | 0.94 to 4.82 across eleven metals |
| the kernel's steel, aluminium and copper, in density | iron's, aluminium's and copper's crystals within 1.5 % |

Both residuals have structure.

- **The three too-dense crystals** are exactly the ones whose lattice constant was measured cold (lithium at 78 K, sodium
  and potassium at 5 K), so the residual names temperature through thermal expansion.
- **The stiffness ratio**: every metal bound by one s electron is softer for its binding than every other metal. The
  energy and the room do not say how the binding is shaped, and the electrons' arrangement is the layer that does.

**The deeper layer checks the kept data.** The bulk modulus the kernel's own Young's modulus and Poisson's ratio imply
is 67.5 GPa for aluminium, against 72.2 GPa measured. Steel's pair implies 139 GPa against iron's 168 GPa, and copper's
101 GPa against copper's 137 GPa. Their stated pairs disagree with the metals' compressibility; the kept data is
unchanged and the finding is recorded.

## Round 10: what happens during a change

A change that must pass over a barrier is attempted at the thermal rate kT / h and succeeds with the Boltzmann factor of
the barrier's Gibbs energy (src/nexus/rate.ts, after Eyring). A liquid flows because its molecules change places over
such a barrier, so its viscosity is that rate seen from the continuum. The time of one change is then the viscosity
times one molecule's volume over kT, with Planck's constant gone. The scale generator of round 6 had already made that
time without the theory: thermal energy over viscosity, evaluated at the molecule's size. The two agree.

| Derived | Value | Measured |
|---|---|---|
| attempts at 25 °C | 6.2 × 10¹² per second | |
| water's barrier, from its viscosity | 9.16 kJ/mol | |
| one molecular change | 6.5 ps | the dielectric relaxation, 8.27 ps |
| viscosity at 0 °C, from a barrier fitted at 25 and 50 °C | 1.57 mPa s | 1.79 mPa s |
| at 100 °C | 0.247 mPa s | 0.282 mPa s |

The fitted barrier underestimates the viscosity at both ends. Across the whole series the local activation enthalpy falls
steadily, from 20.3 kJ/mol between 0 and 10 °C to 11.5 kJ/mol between 90 and 100 °C. The residual says the barrier itself
changes with temperature: the network of bonds a molecule must break to move is looser in warm water.

## Round 11: local clocks

A manifold no longer advances on one step (src/nexus/clock.ts). Each region advances at the time its own mechanisms
need: for a stored carrier conducted across its boundaries, its capacity over all that conducts to and from it (the
carrier family's time constant). The steps are powers of two of the finest, so the clocks meet. Across each boundary
the side with the finer clock computes the flux and the coarser side receives exactly the content that crossed, so
nothing is made or lost between clocks. Regions with no path between them share no clock.

The probe is a room's air, its masonry walls and a sensor in the air, heated for a day (tests/nexus/clock.test.ts).
Their own times are 10 s for the sensor, 235 s for the air and 8.1 hours for the walls.

| One day | Result |
|---|---|
| one clock at the walls' step | the air and the sensor run away |
| one clock at the sensor's step | every region stepped at the sensor's pace: 259,200 region-steps |
| local clocks | energy kept to a part in 10¹⁴ across clocks |

**Refining where it matters is not refining the fastest region.** The tuner starts every region at a coarse fraction
of its own time and halves, one at a time, the step whose halving changes the result most. It refined the walls alone
and left the sensor coarse:

| Tolerance | Error against one fine clock | Region-steps |
|---|---|---|
| 0.05 K | 0.054 K | 22,993 |
| 0.02 K | 0.027 K | 23,035 |
| 0.01 K | 0.014 K | 23,119 |

The fast regions follow their surroundings, so their step errors do not accumulate. The walls integrate over three of
their own times in a day, so theirs do. The error halves with the tolerance, at under a tenth of what one clock at the
sensor's pace takes. The realization kernel still integrates one world on one step. Its parts that exchange nothing
could be separate worlds on separate steps, which is what this round does for a carrier's regions.

## Round 12: holding a temperature across scale

A region held above its surroundings loses energy at its conductance times the difference (src/nexus/hold.ts). For a
body in a still medium the least conductance is conduction alone: 4π k r for a sphere of radius r in a medium of
conductivity k (Carslaw and Jaeger). That grows with the size, while what a body makes grows with its mass. Kleiber's
measured law for mammals is 70 kcal a day times the mass to the three quarters (src/data/life.ts). So the difference a
body holds by its own heat grows with its size, and there is a least size that holds it at all.

| Holding 37 °C in 15 °C, conduction alone, at Kleiber's rate | Least mass | Observed smallest mammal (estimates) |
|---|---|---|
| in still air | 7.8 g | about 1.8 g, the Etruscan shrew |
| in still water | 14.7 kg | from about 14 kg, the sea otter |

Water raises the least size by the ratio of the media's conductivities to the power 3 / (3b − 1). That is 2.4 for
Kleiber's three quarters: exactly 1883. The observed ratio of the smallest sea and land mammals is about 7800, within an
order of magnitude. The smallest land mammal lies below even the conduction-only size. Convection only raises the
conductance, so it must make heat faster than Kleiber's line, and the residual names where the production law departs
at small size.

A body's own time, its capacity over its conductance, grows as its size squared. A cell ten micrometres across forgets
any difference with the water around it in 0.23 ms, so on any longer window it is at its surroundings' temperature.
That is why holding a temperature is a property of bodies, not of cells.

## Round 13: systems from elements

A generated element states bounds and stops. Now the element becomes a configuration space (src/nexus/size.ts). The
quantities that would realize it are its variables, its carrier's laws are its relations, and its bounds and its
matter's limits are its constraints. What can be had is the catalogue, and a declared preference picks. The existing
search derives the configuration, with every record citing the element it came from.

The first element sized is the house's supply wire. From the element come at least 13.89 S of conductance and 500 W of
heat at that limit, which imply 83.3 A, the same as 10 kW at 120 V. From the room it serves comes a route across its
plan of 15.5 m, and its air held below 24 °C. From the matter it named comes copper's conductivity. The insulation adds
PVC's limit of 70 °C (IEC 60364-5-52), with its conductivity and thickness as estimates. The catalogue is the IEC 60228
standard sections.

| Section | At least 13.89 S | Conductor temperature | Admissible |
|---|---|---|---|
| 4 mm² | yes | 266 °C | no: hotter than its insulation allows |
| 10 mm² | yes | 97 °C | no |
| 16 mm² | yes | 63 °C | yes, the least that is |

The drop the element stated would choose 4 mm², and that wire would run hotter than its insulation allows. The bound
that binds is the conductor's heat against its insulation, which the generator did not state, and the system from the
element found it. Installation rules also derate for grouping and enclosure, which this system does not hold; no claim
is made against their tables.

## Round 14: members from the loads on the faces they span

The generator states the snow on the house's roof: 1400 Pa, 168 kN over the up face, whose members span 10.95 m. The
element becomes a system of counts (src/nexus/size.ts). The number of members across the width, the spacing, the support
lines across the span, the section, and the matter's density, stiffness and strength are its variables. Each bay takes
the load on its strip and the member's own weight, simply supported, which is conservative for a member continuous over
its supports. Its bending stress is held within the clear-wood strength over a declared factor of two, and its
deflection within its bay over 360, the strictest of IBC Table 1604.3's limits for roof members. The catalogue is the
kept lumber up to 2x8, at 12, 16 or 24 inches, with up to four support lines. The count of members is a quantity of the
option, not a label: the width over the spacing, rounded up, plus one. Two preferences are declared in order: the fewest
support lines, then the least timber.

| Support lines | Admissible | The least timber among them |
|---|---|---|
| 0 | none: the stiffest kept section deflects 10.8 times what is allowed | — |
| 1 | none | — |
| 2 | 4 | 2x8 on edge at 24 in: 19 members, 1.46 m³ |
| 3 | 10 | 1x6 at 16 in |

At the pick the deflection is 7.80 mm against the 10.14 mm allowed, and the bending stress is 6.9 MPa against the 42.5
MPa allowed. Stiffness binds, not strength. With no support line the roof cannot be framed in kept lumber at all: the
span is the distinction, and the system says how many lines the span needs before any section is chosen. Graded lumber
is given design values well below clear wood's, for its defects and the load's duration; no claim is made against those
tables.

## Round 15: the generator sizes what it generates

After round 14 the generator still said "no system is generated from an element" about the members it generated, and
it left their weight out of what reaches the ground. The language could size them, but the generator did not use it.
Now every member element is sized where it is generated (src/nexus/manifold.ts, src/nexus/size.ts), and what it weighs
is carried on:

- **The load per area each face receives.** It is recorded on that face's members as the loads arrive.
- **What rests on a face at a place not stated.** It can be anywhere, so the system carries it at the worst place,
  mid-bay, on one member. The member system gains that weight: M = w a² / 8 + P a / 4, and δ = 5 w a⁴ / (384 E I) + P a³ /
  (48 E I).
- **A wanted sag.** The house's "floors that do not sag" bounds the deflection beside the code's limit.
- **What the members are made of.** This is a configuration variable too. The options are the kept sections in every
  kept matter dressed to them: PS 20 covers softwoods, so Douglas-fir, Southern pine and Eastern white pine. The
  preferences are the fewest support lines, then the least mass. The arrangements are tried one count of lines at a
  time, fewest first, which leaves the pick unchanged and spares the rest.

| Face | What it carries | Sized |
|---|---|---|
| up | 1400 Pa of snow | Douglas-fir 2x8 on edge at 24 in, 2 support lines, 19 members, 771 kg |
| side | 1000 Pa of wind | Douglas-fir 1x6 on edge at 24 in, no support line, 76 members in four runs, 268 kg |
| down | the people, 2942 N at a place not stated | one of two alternatives: members (2x8 at 24 in, 3 support lines) or resting on the ground, at 24.5 Pa against the 72 kPa it allows |

The fir is chosen, not given: of the three woods at two support lines, it weighs least. The force down on
the ground now carries the sized members' 10.2 kN; the floor's members are an alternative and are not counted. The
gap about the structure's own weight is gone.

What is generated now shows what is missing next:

- **Support lines.** Each is a member of its own: 5.3 kN per metre along 10.95 m for the roof. They are elements with
  that load, but they are not yet sized and their weight is not counted.
- **Buckling.** The walls' members are picked by the wind alone, as 1x6s. Each carries 1.6 kN from the roof along its
  length, 0.96 of Euler's load about its thin axis, so with the declared factor of two it does not hold. Pressing a
  member along its length is not in the member system.

## Round 16: pressing along a length

Round 15 left the walls' members chosen by the wind alone. Each 1x6 carried 0.96 of its Euler load from the roof, and
the roof's support lines were elements with a load and no members. The member system now holds what bears on a
member's ends along the run. Each member is pressed along its length by that load per length over its spacing. Three
new bounds apply, each over the declared factor:

- **Between braces.** The member stays below its Euler load about its thin axis, π² E I / l², with ends free to turn.
  Rows of blocking brace that axis; there may be none, one or two.
- **In the plane it bends in.** It stays below its Euler load about the axis it bends on, over its whole bay.
- **Pressed and bent.** The fibre's stress, N / (b h) plus the bending stress, stays within the strength allowed.

Blocking is timber, and it counts toward the mass. In the generator, the roof's reaction on the top of the walls
presses the walls' members. Each line under the roof becomes a wall of its own, standing on the floor, sized the same
way.

| Element | Pressed along its length | Sized |
|---|---|---|
| the walls (wind 1000 Pa) | 1.6 kN each, from 2.67 kN per metre | Douglas-fir 1x6 at 24 in, one row of blocking; 0.48 of its least buckling load |
| each line under the roof | 2.2 kN each, from 5.33 kN per metre | Eastern white pine 1x4 at 16 in, two rows of blocking; 0.70 |

Unbraced, the 1x6 is refused by buckling alone, and the generator adds the row that makes it hold. The lines under the
roof take a different matter from the roof: white pine, lighter for what they carry than the fir would be. The matter
is chosen for each element, never for the house. With the lines' 124 kg, 12.1 kN of members now reaches the ground.

What this exposes:

- **The floor's lines.** They are not sized, because how far the floor is held above the ground is not stated.
- **The floor's members.** In the alternative where members span the floor, they were not sized for the walls that now
  stand on it. Where the floor rests on the ground, the ground bears those walls.
- **Fastening.** The sections chosen are thin (19 mm), and how members are fastened and what a sheathing does to brace
  them are not in the language. Compression parallel to the grain is bounded by the modulus of rupture over the factor
  (42.5 MPa for the fir). That stays below the fir's crushing strength, which the USDA Wood Handbook gives as about 50 MPa
  for clear coast Douglas-fir at 12 % moisture. That strength is not in the kept data.

## Round 17: how an arrangement carries a load

Rounds 14 to 16 took human models as the relations themselves: the beam formulas, Euler, the code's L/360, a lumber
standard, and Douglas-fir as a row of properties. The kept data even states one ratio of across-grain to along-grain
strength for every wood. Those are evidence with domains, not the skeleton.

This round looks for what lies under several of them at once, and finds it in linear algebra
(src/nexus/network.ts). A network of bars carries a load at its joints by stretching only if the load lies in the
span of its equilibrium matrix. What the bars cannot reach is a mechanism, and a load that meets a mechanism is
carried only by the members bending where they meet, or not at all. A plane frame of members that bend as well as
stretch (src/nexus/frame.ts) measures what the count predicts. Nothing in either names a material or a structure.

| Arrangement | Bars carry the load? | Stiffness grows as the solid's share to the power |
|---|---|---|
| triangles | yes, no mechanism | 1.00 |
| squares, loaded along their bars | yes, though it has mechanisms | 1.00 |
| squares turned 45° | no | 3.0 |
| hexagons | no | 3.0, falling to 2.7 as the walls thicken |

Having mechanisms does not decide; whether the load meets them does. The arrangement's stiffness exists only many
cells across: two cells across differ by a quarter from three, while six differ from eight by under 1 %. That is the
domain of a continuum description, which emerges from the arrangement rather than being assumed.

**Wood, as a test of the counting** (evidence: USDA Wood Handbook Table 5-1; the cell wall's density, 1500 kg/m³).
One solid, the cell wall, is arranged two ways at once.

- **Along the grain**, the walls run with the load. Across the seven kept woods, E_L goes as the solid's share to the
  power 0.93, and the wall stiffness it implies, 33 GPa, is within 15 % of the 35 GPa measured on the wall itself.
- **Across the grain**, the walls must bend. The measured exponents, 2.1 tangential and 1.8 radial, lie well above
  one but well below what uniform hexagons give at the same densities. A second level of arrangement is missing; it
  is marked, not invented. Candidates are a density that varies within the wood (bands laid down at different times)
  and cells that run across the stem.
- **So no one across-to-along ratio holds for wood.** The measured ratio spans 0.015 to 0.082, more than five times,
  and grows with the solid's share as the two exponents part. The kept single ratio hides a regime. The residual
  along the grain is ±22 % and falls roughly by botanical group: balsa, a hardwood, sits between the two groups. The
  botanical category is not the regime.

**The house's walls, as a test of the same counting at metres.** The generator now counts the network its sized
side members make, with nailed joints that hold no turning. Each side is a mechanism under the wind's force across,
with two sways, one for each tier its blocking makes. Two bars across leave no mechanism and carry the force by
stretching, the largest at 56 kN. Bending cannot stand in for them: were every joint rigid, the top would drift
0.29 m, more than a tenth of its height. The bars are not yet sized, and a sheet fastened to the members, which would
carry the force by its shear, is not in the language.

## The next instrument

Higher bars. Intents whose wants are demanding (a printer at speed and precision, a place that computes, a vessel
that grows cells) to find what the generator lacks in common: information as a carrier, time scales that compete,
throughput limited by a transport.
